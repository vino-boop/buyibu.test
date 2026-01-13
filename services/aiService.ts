
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
- 坐下神煞：${p.shenSha.join('/') || '无'}
- 地势运势：${p.xingYun}`;
  };

  const birthYear = parseInt(chart.solarDate.split('年')[0]);
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  // 提取全大运干支供 AI 分析
  const daYunSequence = chart.daYun.map(dy => `${dy.startAge}岁-${dy.endAge}岁[${dy.ganZhi}]`).join(' -> ');

  let selectedContext = "";
  if (selectedIndices) {
      const dy = chart.daYun[selectedIndices.dy];
      const ln = dy?.liuNian[selectedIndices.ln];
      if (dy && ln) {
          selectedContext = `\n【当前时空坐标】\n- 关注大运：${dy.ganZhi} (${dy.startAge}岁-${dy.endAge}岁)\n- 关注流年：${ln.year}年 (${ln.ganZhi})`;
      }
  }

  return `
【缘主命理核心数据 - 绝对不可偏离】
缘主当前：${age}岁
${formatPillar(chart.year, '年')}
${formatPillar(chart.month, '月')}
${formatPillar(chart.day, '日')}
${formatPillar(chart.hour, '时')}
起运顺序：${daYunSequence}${selectedContext}
历法摘要：公历 ${chart.solarDate} / 农历 ${chart.lunarDate}
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

const getBaseInstruction = (baZiData?: string) => `你是一位渊博古雅、洞察天机的命理学者。
1. 自称为“吾”，称呼对方为“阁下”。严禁任何 Emoji。
2. 【数据至上】：你必须深度解析提供的干支生克、格局、神煞。${baZiData ? `阁下命盘：${baZiData}` : ""}
3. 【文风】：辞藻古雅，不落俗套。全篇加粗严禁超过 3 处。`;

export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const baZiData = formatBaZiToText(chart);

  const prompt = `阁下：${name}，${gender === 'Male' ? '乾造' : '坤造'}。
请执行【最高级别详盘】深度分析：
1. **格局定象**：判定月令气象（如：月令建禄、伤官佩印等格），分析阁下命局之高低宽窄。
2. **六亲缘分**：推演命盘中印比食伤财官所对应的（父母、配偶、子女、手足）之缘分厚薄及助力。
3. **十神意向**：剖析阁下潜意识里的追求与生命底色。
4. **大运玄机**：扫描提供的运势序列，挑出 2-3 个关键大运或年份，预判其重大契机或波折。
5. **诗总结**：以一句古风七言诗或五言诗收尾。
6. **因果引导**：最后向阁下提出一个针对其命理软肋或强项的深刻引导性问题。
要求：文辞干练且专业。**全篇加粗严禁超过3处**。`;

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
    ? "【专业深化】：深入格局细节与神煞制化。必须包含：命局核心推演、关键流年点睛、一句诗总结及引导性追问。" 
    : "【直白详述】：请将上一个回复中晦涩的术语全部转化为阁下能听懂的平白话。要求：解释必须详尽，不得偷懒简短，信息量必须保持一致，但严禁使用命理专业术语。";

  const systemInstruction = `${getBaseInstruction(baZiData)}\n${modeInstruction}\n历史推演背景：${context}`;

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
    "analysis": "深度推演（详细解析卦义爻辞，包含诗总结。全篇加粗严禁超过 3 处。）"
  }
  要求：自称为“吾”，严禁胡乱猜测。`;

  try {
    const response = await callAI(prompt, getBaseInstruction(baZiData) + "\n必须返回纯 JSON。", true);
    return JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e: any) {
    return { hexagramName: "起卦成功", hexagramSymbol: "☯", judgment: "推演受阻。", analysis: `### 推演中断\n${e.message}` };
  }
}
