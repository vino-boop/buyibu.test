
import { GoogleGenAI } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage, BaZiChart, BaZiPillar } from "../types";
import { calculateLocalBaZi } from "./geminiService";

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-reasoner';

/**
 * 将命盘数据转化为 AI 可读的“天机全数据模型”
 */
export function formatBaZiToText(chart: BaZiChart): string {
  const formatPillar = (p: BaZiPillar, label: string) => {
    return `${label}柱：【${p.stem}${p.branch}】
- 十神：${p.mainStar || '日主'}
- 纳音：${p.naYin}
- 藏干：${p.hiddenStems.join('.')} (${p.hiddenStemStars.join('.')})
- 神煞：${p.shenSha.join('.') || '暂无'}
- 运势：${p.xingYun}`;
  };

  const birthYear = parseInt(chart.solarDate.split('年')[0]);
  const age = new Date().getFullYear() - birthYear;

  return `
【缘主生辰推演报告】
当前岁数：${age}岁
${formatPillar(chart.year, '年')}
${formatPillar(chart.month, '月')}
${formatPillar(chart.day, '日')}
${formatPillar(chart.hour, '时')}
当前大运：${chart.daYun[0]?.ganZhi || '未起运'} (${chart.daYun[0]?.startAge}岁起)
历法详情：公历 ${chart.solarDate} / 农历 ${chart.lunarDate}
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
    } catch (e: any) { throw new Error(`DeepSeek 通信失败: ${e.message}`); }
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
2. 【严格控制标黄】：全篇回复内容中，加粗语法（**重点内容**）严禁超过 3 处。
3. 【数据敏感】：${baZiData ? `必须严格基于以下命盘数据进行推演，不得胡乱编造：${baZiData}` : "请深度读取命理数据。"}
4. 【文风】：文辞古雅干练。`;

export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const baZiData = formatBaZiToText(chart);

  const prompt = `缘主：${name}，${gender === 'Male' ? '乾造' : '坤造'}。
请执行【专业详盘】深度分析：
1. **五行格局**：根据月令气象判定阁下的命局（如：正官格、伤官见官等）。
2. **六亲十神**：分析命盘中父母、伴侣、子女的缘分深浅。
3. **神煞意向**：解析命盘中最突出的神煞及其影响。
4. **古风诗总结**：以一句七言诗总结阁下命底。
5. **天机引导**：针对阁下现状提出一个深刻的引导性问题。
要求：结论先行。**加粗不得超过3处**。`;

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
    ? "【专业模式】：深入五行格局、十神生克、六亲关系。必须给出诗性总结和引导性追问。" 
    : "【直白模式】：全面分析事、财、情、身四个维度，结论干练直接。全篇加粗严禁超过3处。";

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

  const prompt = `问题：${question}。卦象序列（初爻至上爻）：${lineStr}。
  请严格以纯 JSON 格式输出：
  {
    "hexagramName": "卦名",
    "hexagramSymbol": "符号",
    "judgment": "极简结论（限12字内，严禁加粗）",
    "analysis": "全面深度推演（包含专业卦理、爻辞分析、诗性总结。全篇回复中加粗严禁超过 3 处。）"
  }
  要求：自称为“吾”，直面结果。`;

  try {
    const response = await callAI(prompt, getBaseInstruction(baZiData) + "\n必须返回纯 JSON。", true);
    return JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e: any) {
    return { hexagramName: "起卦成功", hexagramSymbol: "☯", judgment: "推演受阻。", analysis: `### 推演故障\n${e.message}` };
  }
}
