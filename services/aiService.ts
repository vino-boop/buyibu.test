
import { GoogleGenAI } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage } from "../types";
import { calculateLocalBaZi } from "./geminiService";

// 默认配置
const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-reasoner';

/**
 * 获取当前的 AI 配置并进行净化
 */
function getActiveConfig() {
  try {
    const saved = localStorage.getItem('dao_assets');
    if (saved) {
      const config = JSON.parse(saved);
      
      // 净化 Base URL：确保不以 /v1 结尾，方便后续拼接
      let baseUrl = config.apiBaseUrl || 'https://api.deepseek.com';
      baseUrl = baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '');

      return {
        provider: config.apiProvider || 'GEMINI',
        model: config.apiModel,
        deepseekKey: config.customApiKey || '',
        deepseekBase: baseUrl
      };
    }
  } catch (e) {}
  return { 
    provider: 'GEMINI', 
    model: undefined, 
    deepseekKey: '', 
    deepseekBase: 'https://api.deepseek.com' 
  };
}

/**
 * 统一的生成内容接口
 */
async function callAI(prompt: string, systemInstruction?: string, isJson = false) {
  const config = getActiveConfig();

  // 增加调试日志
  console.log(`[AI-Service] Calling ${config.provider} with model: ${config.model || 'default'}`);

  if (config.provider === 'DEEPSEEK') {
    if (!config.deepseekKey) {
      throw new Error("DeepSeek API Key 未配置，请在注册页开发者模式中设置。");
    }

    const modelName = config.model || DEFAULT_DEEPSEEK_MODEL;
    // 确保 URL 拼接正确 (DeepSeek 官方是 /chat/completions)
    const apiUrl = `${config.deepseekBase}/chat/completions`;

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
          response_format: isJson ? { type: 'json_object' } : undefined,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DeepSeek-Error] Status: ${response.status}`, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error?.message || `API 返回错误: ${response.status}`);
        } catch (e) {
          throw new Error(`网络请求失败 (${response.status}): ${errorText.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (fetchError: any) {
      console.error("[DeepSeek-Fetch-Failed]", fetchError);
      throw new Error(`连接 DeepSeek 失败: ${fetchError.message}`);
    }
  } else {
    // Gemini API 调用
    const geminiModel = (config.model && config.model.includes('deepseek')) 
      ? DEFAULT_GEMINI_MODEL 
      : (config.model || DEFAULT_GEMINI_MODEL);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: isJson ? "application/json" : undefined,
        },
      });
      return response.text;
    } catch (geminiError: any) {
      console.error("[Gemini-Error]", geminiError);
      throw new Error(`Gemini 推演受阻: ${geminiError.message}`);
    }
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
  请根据以上信息进行深度批命。请直接给出分析，使用 Markdown 格式。`;

  try {
    const analysis = await callAI(prompt, "你是一个专业的八字大师。请以神秘且专业的口吻为缘主解盘。");
    return { chart, analysis: analysis || "命盘已出，推演略。" };
  } catch (error: any) {
    return { chart, analysis: `### 推演受阻\n${error.message}\n\n*请检查 API 配置或网络连接。*` };
  }
}

/**
 * 核心：对话交流
 */
export async function chatWithContext(messages: ChatMessage[], context: string): Promise<string> {
  const lastUserMessage = messages[messages.length - 1];
  const isProfessional = lastUserMessage?.isProfessional;
  
  const systemInstruction = `你是一位渊博的命理大师。当前背景：${context}。
  请以${isProfessional ? '专业且详尽，包含用神忌神分析' : '通俗易懂，直白干练'}的口吻回答。
  必须对应缘主的年龄特点。最后附带一个引导性的追问。`;

  try {
    const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '大师' : '缘主'}: ${m.content}`).join('\n');
    const prompt = `${historyPrompt}\n缘主: ${lastUserMessage.content}`;
    
    return await callAI(prompt, systemInstruction);
  } catch (error: any) {
    return `大师正在闭关（${error.message}）。`;
  }
}

/**
 * 核心：六爻解卦
 */
export async function interpretLiuYao(lines: HexagramLine[], question: string, userProfile?: any): Promise<LiuYaoResponse> {
  const lineStr = lines.map(l => l.value).join(',');
  const prompt = `问题：${question}。卦象序列：${lineStr}。请以 JSON 格式输出，包含 hexagramName, hexagramSymbol, analysis, judgment 四个字段。`;

  try {
    const response = await callAI(prompt, "你是一个专业的六爻解卦师。请严格返回 JSON 对象。", true);
    // 兼容某些模型可能返回的 Markdown 代码块
    const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    return { 
      hexagramName: "起卦成功", 
      hexagramSymbol: "☯", 
      analysis: `### 解析受阻\n${error.message}\n请检查开发者模式下的 API 配置。` 
    };
  }
}
