
import { GoogleGenAI } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage } from "../types";
import { calculateLocalBaZi } from "./geminiService"; // 借用原有的本地计算函数

// 默认配置
const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

/**
 * 获取当前的 AI 配置
 */
function getActiveConfig() {
  try {
    const saved = localStorage.getItem('dao_assets');
    if (saved) {
      const config = JSON.parse(saved);
      return {
        provider: config.apiProvider || 'GEMINI',
        model: config.apiModel,
        deepseekKey: config.customApiKey || '',
        deepseekBase: config.apiBaseUrl || 'https://api.deepseek.com'
      };
    }
  } catch (e) {}
  return { provider: 'GEMINI', model: undefined, deepseekKey: '', deepseekBase: 'https://api.deepseek.com' };
}

/**
 * 统一的生成内容接口
 */
async function callAI(prompt: string, systemInstruction?: string, isJson = false) {
  const config = getActiveConfig();

  if (config.provider === 'DEEPSEEK') {
    // DeepSeek API 调用 (OpenAI 兼容)
    const response = await fetch(`${config.deepseekBase}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.deepseekKey}`
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_DEEPSEEK_MODEL,
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt }
        ],
        response_format: isJson ? { type: 'json_object' } : undefined,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } else {
    // Gemini API 调用
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: config.model || DEFAULT_GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: isJson ? "application/json" : undefined,
      },
    });
    return response.text;
  }
}

/**
 * 核心：八字分析
 */
export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const birthY = parseInt(date.split('-')[0]);
  const currentAge = new Date().getFullYear() - birthY;

  const prompt = `缘主：${name}（${gender}），${currentAge}岁。
  排盘：${chart.year.stem}${chart.year.branch} ${chart.month.stem}${chart.month.branch} ${chart.day.stem}${chart.day.branch} ${chart.hour.stem}${chart.hour.branch}。
  请根据以上信息进行深度批命。`;

  try {
    const analysis = await callAI(prompt, "你是一个专业的八字大师。");
    return { chart, analysis: analysis || "命盘已出，分析略。" };
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return { chart, analysis: `推演受阻：${error.message}` };
  }
}

/**
 * 核心：对话交流
 */
export async function chatWithContext(messages: ChatMessage[], context: string): Promise<string> {
  const lastUserMessage = messages[messages.length - 1];
  const isProfessional = lastUserMessage?.isProfessional;
  
  const systemInstruction = `你是一位命理大师。当前背景：${context}。
  请以${isProfessional ? '专业且详尽' : '通俗易懂'}的口吻回答。`;

  try {
    const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '大师' : '缘主'}: ${m.content}`).join('\n');
    const prompt = `${historyPrompt}\n缘主: ${lastUserMessage.content}`;
    
    return await callAI(prompt, systemInstruction);
  } catch (error: any) {
    return `大师正在闭关，稍后再试。(${error.message})`;
  }
}

/**
 * 核心：六爻解卦
 */
export async function interpretLiuYao(lines: HexagramLine[], question: string, userProfile?: any): Promise<LiuYaoResponse> {
  const lineStr = lines.map(l => l.value).join(',');
  const prompt = `问题：${question}。卦象序列：${lineStr}。请以 JSON 格式输出 hexagramName, hexagramSymbol, analysis, judgment。`;

  try {
    const response = await callAI(prompt, "你是一个专业的六爻解卦师。", true);
    return JSON.parse(response);
  } catch (error) {
    return { hexagramName: "起卦成功", hexagramSymbol: "☯", analysis: "解析暂不可用，请检查 API 配置。" };
  }
}
