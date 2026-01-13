
import { GoogleGenAI } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage, BaZiChart, BaZiPillar } from "../types";
import { calculateLocalBaZi } from "./geminiService";

// 默认配置
const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-reasoner';

/**
 * 将命盘数据转化为 AI 可读的“命理全维度报告”
 */
function formatBaZiToText(chart: BaZiChart): string {
  const formatPillar = (p: BaZiPillar, label: string) => {
    return `${label}：【${p.stem}${p.branch}】 十神：${p.mainStar || '日主'}，纳音：${p.naYin}，藏干：[${p.hiddenStems.join('/')}]，神煞：[${p.shenSha.join('/') || '无'}]`;
  };

  return `
【缘主实测命盘 - 关键推演依据】
${formatPillar(chart.year, '年柱')}
${formatPillar(chart.month, '月柱')}
${formatPillar(chart.day, '日柱（阁下）')}
${formatPillar(chart.hour, '时柱')}
当前大运：${chart.daYun[0]?.ganZhi || '未步大运'}（${chart.daYun[0]?.startAge}岁起）
农历生辰：${chart.lunarDate}
`;
}

/**
 * 获取当前的 AI 配置
 */
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
      if (!response.ok) throw new Error(`API Error ${response.status}`);
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e: any) { throw new Error(`DeepSeek 节点故障: ${e.message}`); }
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

const SHARED_SYSTEM_INSTRUCTION = `你是一位渊博古雅、不亢不卑的命理学者。
1. 自称为“吾”，称呼对方为“阁下”。严禁 Emoji。
2. 【克制高亮】：全篇加粗语法（**内容**）严禁超过 3 处。
3. 【数据优先】：必须深度读取并核对提供的干支、十神、神煞数据。
4. 【内容禁忌】：严禁提及 AI。`;

/**
 * 核心：八字深度分析
 */
export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const baZiText = formatBaZiToText(chart);

  const prompt = `
${baZiText}
阁下：${name}，${gender === 'Male' ? '乾造' : '坤造'}。
请以此命盘为据进行【专业详盘】推演：
1. **五行格局**：分析月令气象，定出阁下的格局（如伤官佩印、食神生财等）。
2. **十神与六亲**：分析干支生克，推演父母、配偶或子女之缘分深浅。
3. **神煞意向**：点睛之笔说明命盘中最关键的 1-2 个神煞之功过。
4. **诗性总结**：以一句古风诗词总结阁下的命理底色。
5. **引导追问**：针对阁下可能关心的事业或姻缘提出一个深刻的问题。
要求：文辞古雅干练，杜绝虚华比喻。`;

  try {
    const analysis = await callAI(prompt, SHARED_SYSTEM_INSTRUCTION);
    return { chart, analysis: analysis || "机缘未至。" };
  } catch (error: any) {
    return { chart, analysis: `### 推演中断\n${error.message}` };
  }
}

/**
 * 核心：对话交流
 */
export async function chatWithContext(messages: ChatMessage[], context: string): Promise<string> {
  const lastUserMessage = messages[messages.length - 1];
  const isProfessional = lastUserMessage?.isProfessional;
  
  const modeInstruction = isProfessional 
    ? "【专业模式】：深挖五行生克、十神互动。必须给出一段诗性总结断语。" 
    : "【直白模式】：内容要全面（涵盖事、财、情、身），用最通俗干练的结论回复，全篇仅 1 处高亮。";

  const systemInstruction = `${SHARED_SYSTEM_INSTRUCTION}\n背景背景：${context}。\n${modeInstruction}`;

  try {
    const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '吾' : '阁下'}: ${m.content}`).join('\n');
    const prompt = `${historyPrompt}\n阁下: ${lastUserMessage.content}`;
    const res = await callAI(prompt, systemInstruction);
    return res;
  } catch (e) { return "吾正在闭关。"; }
}

/**
 * 核心：六爻解卦
 */
export async function interpretLiuYao(lines: HexagramLine[], question: string, userProfile?: any): Promise<LiuYaoResponse> {
  const lineStr = lines.map(l => l.value).join(',');
  const prompt = `问题：${question}。卦象（初至上）：${lineStr}。
  请严格以纯 JSON 格式输出：
  {
    "hexagramName": "卦名",
    "hexagramSymbol": "符号",
    "judgment": "20字内极简断语",
    "analysis": "全面深度解析（专业分析卦辞爻辞，结合阁下背景，仅1-2处加粗，最后附诗性总结）"
  }
  要求：自称为“吾”，严禁比喻，干练直观。`;

  try {
    const response = await callAI(prompt, SHARED_SYSTEM_INSTRUCTION + "\n必须返回纯 JSON。", true);
    return JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e: any) {
    return { hexagramName: "起卦成功", hexagramSymbol: "☯", judgment: "推演受阻。", analysis: `### 故障\n${e.message}` };
  }
}
