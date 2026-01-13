
import { GoogleGenAI } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage, BaZiChart, BaZiPillar } from "../types";
import { calculateLocalBaZi } from "./geminiService";

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-reasoner';

/**
 * 将命盘数据转化为 AI 可读的“命理全维度报告”
 * 包含：年龄、干支、十神、藏干、神煞、纳音、运势阶段
 */
export function formatBaZiToText(chart: BaZiChart, selectedIndices?: { dy: number, ln: number }): string {
  const formatPillar = (p: BaZiPillar, label: string) => {
    return `${label}柱：【${p.stem}${p.branch}】
- 十神：${p.mainStar || '日主'}
- 纳音：${p.naYin}
- 藏干：${p.hiddenStems.join('/')} (${p.hiddenStemStars.join('/')})
- 神煞：${p.shenSha.join('/') || '无'}
- 运势：${p.xingYun}`;
  };

  const birthYear = parseInt(chart.solarDate.split('年')[0]);
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  let selectedContext = "";
  if (selectedIndices) {
      const dy = chart.daYun[selectedIndices.dy];
      const ln = dy?.liuNian[selectedIndices.ln];
      if (dy && ln) {
          selectedContext = `\n【当前关注时空】\n- 关注大运：${dy.ganZhi} (${dy.startAge}岁-${dy.endAge}岁)\n- 关注流年：${ln.year}年 (${ln.ganZhi})`;
      }
  }

  return `
【缘主天机密报 - 绝对推演依据】
缘主当前：${age}岁
${formatPillar(chart.year, '年')}
${formatPillar(chart.month, '月')}
${formatPillar(chart.day, '日')}
${formatPillar(chart.hour, '时')}
初始大运：${chart.daYun[0]?.ganZhi || '未起'} (${chart.daYun[0]?.startAge}岁起)${selectedContext}
历法：公历 ${chart.solarDate} / 农历 ${chart.lunarDate}
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

const getBaseInstruction = (baZiData?: string) => `你是一位渊博古雅、不亢不卑的命理学者。
1. 自称为“吾”，称呼对方为“阁下”。严禁 Emoji。
2. 【严格控制标黄】：全篇加粗语法（**内容**）严禁超过 3 处。
3. 【数据绝对化】：你必须深度读取并核对提供的每一个干支、十神、神煞和年龄。${baZiData ? `以下是阁下的命盘天机，不得造假：${baZiData}` : ""}
4. 【内容禁忌】：严禁提到你是 AI 或任何现代科技。`;

export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const baZiData = formatBaZiToText(chart);

  const prompt = `阁下：${name}，${gender === 'Male' ? '乾造' : '坤造'}。
请执行【专业详盘】深度分析：
1. **五行格局**：判定月令气象与全局意向（如：建禄格、食神生财等）。
2. **六亲十神**：推演命局中父母、配偶、子女之缘分交互。
3. **神煞意向**：解析命盘中最突出的 1-2 个神煞之功过。
4. **诗性总结**：以一句古雅的七言或五言律诗总结阁下命底。
5. **天机追问**：针对阁下命理特征，提出一个深刻的引导性问题。
要求：文辞干练，结论先行。**加粗严禁超过3处**。`;

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
    ? "【专业模式】：深入五行格局与神煞细节。必须包含：命局推演、六亲缘分、诗性总结及一个引导追问。" 
    : "【直白模式】：全面涵盖（事业、财运、情感、健康）四个维度，用最直接、干练、无术语的话语回复。";

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
  请以纯 JSON 格式输出：
  {
    "hexagramName": "卦名",
    "hexagramSymbol": "符号",
    "judgment": "极简断语（限12字内，严禁加粗）",
    "analysis": "深度推演（详细解析卦义爻辞，结合缘主背景。包含诗性总结。全篇加粗严禁超过 3 处。）"
  }
  要求：自称为“吾”，直面吉凶。`;

  try {
    const response = await callAI(prompt, getBaseInstruction(baZiData) + "\n必须返回纯 JSON。", true);
    return JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e: any) {
    return { hexagramName: "起卦成功", hexagramSymbol: "☯", judgment: "推演受阻。", analysis: `### 推演中断\n${e.message}` };
  }
}
