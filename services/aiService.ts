
import { GoogleGenAI } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage, BaZiChart } from "../types";
import { calculateLocalBaZi } from "./geminiService";

// 默认配置
const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-reasoner';

/**
 * 将命盘数据转化为 AI 可读的高度结构化文本描述
 */
function formatBaZiToText(chart: BaZiChart): string {
  const p = chart;
  return `
【核心命盘数据 - 必须以此为准】
年柱：${p.year.stem}${p.year.branch} (纳音：${p.year.naYin})
月柱：${p.month.stem}${p.month.branch} (纳音：${p.month.naYin})
日柱：${p.day.stem}${p.day.branch} (此为阁下日主，纳音：${p.day.naYin})
时柱：${p.hour.stem}${p.hour.branch} (纳音：${p.hour.naYin})
当前大运：${p.daYun[0]?.ganZhi || '起步'} 运
五行神煞：${[p.year, p.month, p.day, p.hour].map(pillar => pillar.shenSha.join('/')).filter(Boolean).join(', ')}
农历：${p.lunarDate}
`;
}

/**
 * 获取当前的 AI 配置并进行净化
 */
function getActiveConfig() {
  try {
    const saved = localStorage.getItem('dao_assets');
    if (saved) {
      const config = JSON.parse(saved);
      
      let baseUrl = config.apiBaseUrl || 'https://api.deepseek.com';
      baseUrl = baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '');

      const rawProvider = (config.apiProvider || 'GEMINI').toUpperCase();

      return {
        provider: rawProvider as 'GEMINI' | 'DEEPSEEK',
        model: config.apiModel,
        deepseekKey: config.customApiKey || '',
        deepseekBase: baseUrl
      };
    }
  } catch (e) {}
  
  return { 
    provider: 'GEMINI' as const, 
    model: undefined, 
    deepseekKey: '', 
    deepseekBase: 'https://api.deepseek.com' 
  };
}

/**
 * 辅助函数：获取当前实际生效的模型名称
 */
function getEffectiveModelName(): string {
  const config = getActiveConfig();
  if (config.provider === 'DEEPSEEK') {
    return config.model || DEFAULT_DEEPSEEK_MODEL;
  } else {
    return (config.model && !config.model.toLowerCase().includes('deepseek')) 
      ? config.model 
      : DEFAULT_GEMINI_MODEL;
  }
}

/**
 * 辅助函数：从杂乱的字符串中提取纯净且合法的 JSON
 */
function extractJson(text: string): string {
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    cleaned = match[0];
  }
  return cleaned.trim();
}

/**
 * 统一的生成内容接口
 */
async function callAI(prompt: string, systemInstruction?: string, isJson = false) {
  const config = getActiveConfig();
  const modelName = getEffectiveModelName();

  if (config.provider === 'DEEPSEEK') {
    if (!config.deepseekKey) {
      throw new Error("DeepSeek API Key 未配置。请进入开发者模式填入 Key 并保存。");
    }

    const apiUrl = `${config.deepseekBase}/chat/completions`;
    const isReasoner = modelName.includes('reasoner');
    const responseFormat = (isJson && !isReasoner) ? { type: 'json_object' } : undefined;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.deepseekKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
          ],
          response_format: responseFormat,
          temperature: isReasoner ? undefined : 0.6,
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API 响应异常 (${response.status})`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (fetchError: any) {
      throw new Error(`无法连接至 DeepSeek 节点: ${fetchError.message}`);
    }
  } else {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: isJson ? "application/json" : undefined,
        },
      });
      return response.text;
    } catch (geminiError: any) {
      throw new Error(`Gemini 推演受阻: ${geminiError.message}`);
    }
  }
}

// 统一的系统人设指令
const SHARED_SYSTEM_INSTRUCTION = `你是一位渊博古雅、不亢不卑的命理学者。
1. 自称为“吾”，称呼对方为“阁下”。禁止使用任何 Emoji。
2. 【克制高亮】：严格限制 **加粗语法** 的使用，每篇回复中【仅允许 1-3 处】最核心的结论加粗，严禁大面积标黄。
3. 【直白推演】：严禁虚华比喻，直接论述五行气象与结论。结论必须先行。
4. 【内容禁忌】：禁止提及 AI 模型出处。`;

/**
 * 核心：八字分析
 */
export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const birthY = parseInt(date.split('-')[0]);
  const currentAge = new Date().getFullYear() - birthY;
  const baZiText = formatBaZiToText(chart);

  const prompt = `
${baZiText}
阁下${name && name !== '用户' ? name : ''}，${currentAge}岁，${gender === 'Male' ? '乾造' : '坤造'}。
- 要求：请以此命盘给出【简介直观】的分析。
- 高亮限制：全篇仅针对【最关键的一个断语】加粗。
- 结尾：附带一句启发性的追问。`;

  try {
    const analysis = await callAI(prompt, SHARED_SYSTEM_INSTRUCTION);
    return { chart, analysis: analysis || "机缘未至，推演略。" };
  } catch (error: any) {
    return { chart, analysis: `### 推演受阻\n${error.message}` };
  }
}

/**
 * 核心：对话交流
 */
export async function chatWithContext(messages: ChatMessage[], context: string): Promise<string> {
  const lastUserMessage = messages[messages.length - 1];
  const isProfessional = lastUserMessage?.isProfessional;
  
  const modeInstruction = isProfessional 
    ? "当前为专业模式：请使用严谨的命理术语，逻辑深奥。全篇仅允许 2 处核心加粗。" 
    : "当前为直白模式：严禁比喻，直接回复结论。全篇仅允许 1 处核心加粗。";

  const systemInstruction = `${SHARED_SYSTEM_INSTRUCTION}\n当前背景：${context}。\n${modeInstruction}`;

  try {
    const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '吾' : '阁下'}: ${m.content}`).join('\n');
    const prompt = `${historyPrompt}\n阁下: ${lastUserMessage.content}`;
    
    const res = await callAI(prompt, systemInstruction);
    return res;
  } catch (error: any) {
    return `吾正在闭关，机缘未至。`;
  }
}

/**
 * 核心：六爻解卦
 */
export async function interpretLiuYao(lines: HexagramLine[], question: string, userProfile?: any): Promise<LiuYaoResponse> {
  const lineStr = lines.map(l => l.value).join(',');
  
  let ageStr = "";
  if (userProfile?.birthDate) {
      const birthY = parseInt(userProfile.birthDate.split('-')[0]);
      const currentAge = new Date().getFullYear() - birthY;
      ageStr = `阁下当前${currentAge}岁。`;
  }

  const prompt = `问题：${question}。${ageStr}卦象序列（由初爻至上爻）：${lineStr}。
  请严格以纯 JSON 格式输出：
  {
    "hexagramName": "卦名",
    "hexagramSymbol": "符号",
    "judgment": "一句话极简断语（限20字内，作为顶部卡片结论）",
    "analysis": "详细推演内容（作为对话主体的深度解析，仅允许核心处 1-2 次加粗）"
  }
  要求：自称为“吾”，严禁比喻。`;

  try {
    const response = await callAI(prompt, SHARED_SYSTEM_INSTRUCTION + "\n必须返回 JSON。", true);
    const cleanJson = extractJson(response);
    
    try {
      const resObj = JSON.parse(cleanJson);
      return resObj;
    } catch (parseError) {
      throw new Error("推演数据解析失败。");
    }
  } catch (error: any) {
    return { 
      hexagramName: "起卦成功", 
      hexagramSymbol: "☯", 
      judgment: "机缘受阻。",
      analysis: `### 机缘受阻\n${error.message}` 
    };
  }
}
