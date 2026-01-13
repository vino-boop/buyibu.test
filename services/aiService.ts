
import { GoogleGenAI } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage, BaZiChart, BaZiPillar } from "../types";
import { calculateLocalBaZi } from "./geminiService";

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-reasoner';

/**
 * 将命盘数据转化为 AI 可读的“命理全维度报告”
 */
export function formatBaZiToText(chart: BaZiChart, selectedIndices?: { dy: number, ln: number }): string {
  const formatPillar = (p: BaZiPillar, label: string) => {
    return `${label}柱：【${p.stem}${p.branch}】
- 十神主星：${p.mainStar || '日主'}
- 纳音五行：${p.naYin}
- 地支藏干：${p.hiddenStems.join('/')} (对应十神：${p.hiddenStemStars.join('/')})
- 神煞：${p.shenSha.join('/') || '无'}`;
  };

  const birthYear = parseInt(chart.solarDate.split('年')[0]);
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  // 提取全大运干支供 AI 进行长线流年扫描
  const daYunSequence = chart.daYun.map(dy => `${dy.startYear}年-${dy.endYear}年(${dy.startAge}岁-${dy.endAge}岁)[${dy.ganZhi}运]`).join(' -> ');

  let selectedContext = "";
  if (selectedIndices) {
      const dy = chart.daYun[selectedIndices.dy];
      const ln = dy?.liuNian[selectedIndices.ln];
      if (dy && ln) {
          selectedContext = `\n【当前关注坐标】\n- 关注大运：${dy.ganZhi}\n- 关注流年：${ln.year}年 (${ln.ganZhi})`;
      }
  }

  return `
【缘主命理核心数据】
缘主当前：${age}岁
${formatPillar(chart.year, '年')}
${formatPillar(chart.month, '月')}
${formatPillar(chart.day, '日')}
${formatPillar(chart.hour, '时')}
大运序列：${daYunSequence}${selectedContext}
公历生辰：${chart.solarDate}
`;
}

function getActiveConfig() {
  try {
    const saved = localStorage.getItem('dao_assets');
    if (saved) {
      const config = JSON.parse(saved);
      let baseUrl = config.apiBaseUrl || 'https://api.deepseek.com';
      baseUrl = baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '');
      return {
        provider: (config.apiProvider || 'GEMINI').toUpperCase() as 'GEMINI' | 'DEEPSEEK',
        model: config.apiModel,
        deepseekKey: config.customApiKey || '',
        deepseekBase: baseUrl
      };
    }
  } catch (e) {}
  return { provider: 'GEMINI' as const, model: undefined, deepseekKey: '', deepseekBase: 'https://api.deepseek.com' };
}

function getEffectiveModelName(): string {
  const config = getActiveConfig();
  if (config.provider === 'DEEPSEEK') return config.model || DEFAULT_DEEPSEEK_MODEL;
  return (config.model && !config.model.toLowerCase().includes('deepseek')) ? config.model : DEFAULT_GEMINI_MODEL;
}

async function callAI(prompt: string, systemInstruction?: string, isJson = false) {
  const config = getActiveConfig();
  const modelName = getEffectiveModelName();

  if (config.provider === 'DEEPSEEK') {
    if (!config.deepseekKey) throw new Error("DeepSeek Key 未配置");
    const apiUrl = `${config.deepseekBase}/chat/completions`;
    const isReasoner = modelName.includes('reasoner');
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.deepseekKey}` },
        body: JSON.stringify({
          model: modelName,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
          ],
          response_format: (isJson && !isReasoner) ? { type: 'json_object' } : undefined,
          temperature: isReasoner ? undefined : 0.6,
        })
      });
      if (!response.ok) throw new Error(`API 异常: ${response.status}`);
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e: any) { throw new Error(`DeepSeek 节点通信受阻: ${e.message}`); }
  } else {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { systemInstruction, responseMimeType: isJson ? "application/json" : undefined },
      });
      return response.text;
    } catch (e: any) { throw new Error(`Gemini 推演受阻: ${e.message}`); }
  }
}

const getBaseInstruction = (baZiData?: string) => `你是一位渊博古雅、洞察天机的周易命理学者。
1. 自称为“吾”，称呼对方为“阁下”。严禁任何 Emoji。
2. 【数据至上】：你必须结合阁下的干支生克、格局、大运进行详尽分析。${baZiData ? `阁下命盘：${baZiData}` : ""}
3. 【文风】：辞藻古雅，不落俗套。全篇加粗严禁超过 3 处。
4. 【禁忌】：不要提及你是 AI 或现代模型，保持神秘感。`;

export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const baZiData = formatBaZiToText(chart);

  const prompt = `阁下：${name}，${gender === 'Male' ? '乾造' : '坤造'}。
请执行【最高级别详盘】分析，要求如下：
1. **格局定象**：判定阁下的月令气象（如：月令建禄、伤官格等），分析命局高低宽窄。
2. **六亲全析**：深入推演印比食伤财官在局中对应的（父母、伴侣、子女）状态与助力。
3. **大运玄机（核心要求）**：扫描提供的大运序列，挑出 2-3 个关键大运或具体年份。
   - 必须涵盖**财运（财富转折点）**与**感情（正缘或变动期）**的精准判断。
   - 详述其在这些节点的重大契机或坎坷。
4. **闭环收尾（严格格式控制）**：
   - 先给出一句古风诗意总结（七言或五言）。
   - 紧接着发起一个深刻的引导性追问。
   - **绝对禁止**在诗歌与追问前使用任何标题（如“总结”、“诗曰”、“追问”等）。
要求：文辞干练专业。**加粗严禁超过3处**。`;

  try {
    const analysis = await callAI(prompt, getBaseInstruction(baZiData));
    return { chart, analysis: analysis || "机缘未至。" };
  } catch (error: any) {
    return { chart, analysis: `### 推演受阻\n${error.message}` };
  }
}

export async function chatWithContext(messages: ChatMessage[], context: string, baZiData?: string): Promise<string> {
  const lastUserMessage = messages[messages.length - 1];
  const isProfessional = lastUserMessage?.isProfessional;
  
  const modeInstruction = isProfessional 
    ? "【专业模式】：深入格局细节与神煞制化。分析大运流年中的具体利弊，最后以无标题的诗总结和引导提问结尾。" 
    : "【直白详述】：请将上一个回复中晦涩的术语全部转化为阁下能听懂的平白话。要求：解释必须极其详尽，保留所有年份、财运、感情的推演节点，信息量必须保持一致，不得偷懒简短。";

  const systemInstruction = `${getBaseInstruction(baZiData)}\n${modeInstruction}\n对话背景：${context}`;

  try {
    const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '吾' : '阁下'}: ${m.content}`).join('\n');
    const prompt = `${historyPrompt}\n阁下: ${lastUserMessage.content}`;
    const res = await callAI(prompt, systemInstruction);
    return res;
  } catch (e) { return "吾正在闭关。"; }
}

export async function interpretLiuYao(lines: HexagramLine[], question: string, userProfile?: any): Promise<LiuYaoResponse> {
  const lineStr = lines.map(l => l.value).join(',');
  const baZiData = userProfile ? `缘主生辰：${userProfile.birthDate} ${userProfile.birthTime}` : "";

  const prompt = `问题：${question}。卦象序列：${lineStr}。
  请以 JSON 格式输出：
  {
    "hexagramName": "卦名",
    "hexagramSymbol": "符号",
    "judgment": "极简断语（限12字内，严禁加粗）",
    "analysis": "深度推演（详细解析卦义爻辞，包含无标题的诗总结。全篇加粗严禁超过 3 处。）"
  }
  要求：自称为“吾”。`;

  try {
    const response = await callAI(prompt, getBaseInstruction(baZiData) + "\n必须返回纯 JSON。", true);
    return JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e: any) {
    return { hexagramName: "起卦成功", hexagramSymbol: "☯", judgment: "推演受阻。", analysis: `### 推演中断\n${e.message}` };
  }
}
