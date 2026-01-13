
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
          temperature: isReasoner ? undefined : 0.7,
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
1. 自称为“吾”，绝对禁止自称为“大师”、“我”或“AI”。
2. 称呼对方为“缘主”，绝对禁止使用“用户”、“你”等现代称谓。
3. 严禁频繁使用 Emoji，保持古朴禅意。
4. 严禁在回答中机械重复天干地支（如“年柱为甲子”），直接论述格局、五行气象。
5. 必须结合缘主当前的岁数阶段（如弱冠、而立、不惑、知天命等）给出针对性的趋避建议。
6. 【显示规范】：请在每一段回答中，针对核心断语、关键时间点或核心趋避建议使用 **加粗语法**（如 **重点内容**），这是缘主关注的重点。
7. 【内容禁忌】：严禁在回答开头或结尾提及你是由什么 AI 模型驱动的。`;

/**
 * 核心：八字分析
 */
export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const birthY = parseInt(date.split('-')[0]);
  const currentAge = new Date().getFullYear() - birthY;

  const prompt = `缘主${name && name !== '用户' ? name : ''}，${currentAge}岁，${gender === 'Male' ? '乾造' : '坤造'}。
  命盘信息已在图中给出。请以此为据，深究其气象格局：
  - 核心要求：针对缘主${currentAge}岁所属的人生阶段给出深度推演与行事告诫。
  - 文辞要求：言简意赅，古雅凝练，禁忌冗长。
  - 结尾：附带一句启发性的因果追问。`;

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
  
  const systemInstruction = `${SHARED_SYSTEM_INSTRUCTION}\n当前背景：${context}。
  请以${isProfessional ? '博学严谨' : '简洁直白'}的口吻回应缘主。`;

  try {
    const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '吾' : '缘主'}: ${m.content}`).join('\n');
    const prompt = `${historyPrompt}\n缘主: ${lastUserMessage.content}`;
    
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
      ageStr = `缘主当前${currentAge}岁。`;
  }

  const prompt = `问题：${question}。${ageStr}卦象序列：${lineStr}。
  请严格以纯 JSON 格式输出：hexagramName, hexagramSymbol, analysis, judgment。
  要求：分析中自称为“吾”，对核心重点断语加粗，结合缘主岁数论述该阶段的趋避建议，禁止 Emoji。`;

  try {
    const response = await callAI(prompt, SHARED_SYSTEM_INSTRUCTION + "\n请只返回 JSON 数据。", true);
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
      analysis: `### 机缘受阻\n${error.message}` 
    };
  }
}
