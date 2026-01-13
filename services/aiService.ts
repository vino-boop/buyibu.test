
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
 * 辅助函数：获取当前实际生效的模型名称
 */
function getEffectiveModelName(): string {
  const config = getActiveConfig();
  if (config.provider === 'DEEPSEEK') {
    return config.model || DEFAULT_DEEPSEEK_MODEL;
  } else {
    return (config.model && !config.model.includes('deepseek')) ? config.model : DEFAULT_GEMINI_MODEL;
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

  console.log(`[AI-Service] Target Provider: ${config.provider}, Model: ${modelName}`);

  if (config.provider === 'DEEPSEEK') {
    if (!config.deepseekKey) {
      throw new Error("DeepSeek API Key 未配置。请进入开发者模式填入 Key。");
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
        const errorText = await response.text();
        throw new Error(`API 响应错误 (${response.status})`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (fetchError: any) {
      throw new Error(`无法连接到 DeepSeek 节点: ${fetchError.message}`);
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

/**
 * 核心：八字分析
 */
export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const birthY = parseInt(date.split('-')[0]);
  const currentAge = new Date().getFullYear() - birthY;
  const modelName = getEffectiveModelName();

  const prompt = `缘主：${name}（${gender}），${currentAge}岁。
  排盘：${chart.year.stem}${chart.year.branch} ${chart.month.stem}${chart.month.branch} ${chart.day.stem}${chart.day.branch} ${chart.hour.stem}${chart.hour.branch}。
  请根据以上信息进行深度批命。请直接给出分析，使用 Markdown 格式。最后附带一句启发性追问。`;

  try {
    let analysis = await callAI(prompt, "你是一个专业的八字大师。请以神秘且专业的口吻为缘主解盘。");
    // 测试用：添加模型标注
    analysis += `\n\n---\n*本次推演由 ${modelName} 驱动*`;
    return { chart, analysis: analysis || "命盘已出，推演略。" };
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
  const modelName = getEffectiveModelName();
  
  const systemInstruction = `你是一位渊博的命理大师。当前背景：${context}。
  请以${isProfessional ? '专业且详尽' : '通俗易懂'}的口吻回答。最后必须附带一个引导性的追问。`;

  try {
    const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '大师' : '缘主'}: ${m.content}`).join('\n');
    const prompt = `${historyPrompt}\n缘主: ${lastUserMessage.content}`;
    
    let res = await callAI(prompt, systemInstruction);
    // 测试用：添加模型标注
    res += `\n\n> *[${modelName}]*`;
    return res;
  } catch (error: any) {
    return `大师正在闭关（${error.message}）。`;
  }
}

/**
 * 核心：六爻解卦
 */
export async function interpretLiuYao(lines: HexagramLine[], question: string, userProfile?: any): Promise<LiuYaoResponse> {
  const lineStr = lines.map(l => l.value).join(',');
  const modelName = getEffectiveModelName();
  const prompt = `问题：${question}。卦象序列：${lineStr}。
  请严格以纯 JSON 格式输出如下字段：hexagramName, hexagramSymbol, analysis, judgment。
  注意：禁止输出 Markdown 代码块标签（如 \`\`\`json），禁止输出任何解释性文字或思考过程。`;

  try {
    const response = await callAI(prompt, "你是一个专业的六爻解卦师。只返回 JSON 数据。", true);
    const cleanJson = extractJson(response);
    
    try {
      const resObj = JSON.parse(cleanJson);
      // 测试用：在 analysis 字段末尾添加模型标注
      if (resObj.analysis) {
        resObj.analysis += `\n\n---\n*本次解卦由 ${modelName} 驱动*`;
      }
      return resObj;
    } catch (parseError) {
      throw new Error("模型返回数据格式有误，无法解析 JSON。");
    }
  } catch (error: any) {
    return { 
      hexagramName: "起卦成功", 
      hexagramSymbol: "☯", 
      analysis: `### 推演受阻\n${error.message}\n\n*请确保 API 配置正确。当前模型: ${modelName}*` 
    };
  }
}
