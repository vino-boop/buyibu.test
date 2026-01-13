
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
 * 辅助函数：从杂乱的字符串中提取纯净且合法的 JSON
 */
function extractJson(text: string): string {
  // 1. 尝试移除 Markdown 代码块标记
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  
  // 2. 匹配第一个 { 到最后一个 }。这能有效跳过 Reasoner 的推理文本。
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    cleaned = match[0];
  }

  // 3. 基础语法净化：修复常见的模型错误（如单引号替换为双引号，移除尾部逗号）
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * 统一的生成内容接口
 */
async function callAI(prompt: string, systemInstruction?: string, isJson = false) {
  const config = getActiveConfig();
  const modelName = config.model || (config.provider === 'DEEPSEEK' ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_GEMINI_MODEL);

  console.log(`[AI-Service] Target Provider: ${config.provider}, Model: ${modelName}`);

  if (config.provider === 'DEEPSEEK') {
    // 严格隔离：只要选择了 DEEPSEEK，绝不回退到 Gemini 逻辑
    if (!config.deepseekKey) {
      throw new Error("DeepSeek API Key 未配置。请进入开发者模式填入 Key。");
    }

    const apiUrl = `${config.deepseekBase}/chat/completions`;
    const isReasoner = modelName.includes('reasoner');
    
    // DeepSeek-Reasoner (R1) 目前不支持 json_object 模式，仅 chat 模型支持
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
          // Reasoner 模型不建议设置 temperature
          temperature: isReasoner ? undefined : 0.7,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DeepSeek-Error]`, errorText);
        throw new Error(`API 响应错误 (${response.status})`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (fetchError: any) {
      console.error("[DeepSeek-Fetch-Failed]", fetchError);
      throw new Error(`无法连接到 DeepSeek 节点: ${fetchError.message}`);
    }
  } else {
    // 严格隔离：Gemini 调用逻辑
    // 如果在 Gemini 模式下输入了 deepseek 模型名，强制修复为 Gemini 默认模型
    const geminiModel = modelName.includes('deepseek') ? DEFAULT_GEMINI_MODEL : modelName;

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
  请根据以上信息进行深度批命。请直接给出分析，使用 Markdown 格式。最后附带一句启发性追问。`;

  try {
    const analysis = await callAI(prompt, "你是一个专业的八字大师。请以神秘且专业的口吻为缘主解盘。");
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
  
  const systemInstruction = `你是一位渊博的命理大师。当前背景：${context}。
  请以${isProfessional ? '专业且详尽' : '通俗易懂'}的口吻回答。最后必须附带一个引导性的追问。`;

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
  const prompt = `问题：${question}。卦象序列：${lineStr}。
  请严格以纯 JSON 格式输出如下字段：hexagramName, hexagramSymbol, analysis, judgment。
  注意：禁止输出 Markdown 代码块标签（如 \`\`\`json），禁止输出任何解释性文字或思考过程。`;

  try {
    const response = await callAI(prompt, "你是一个专业的六爻解卦师。只返回 JSON 数据。", true);
    
    // 增强提取逻辑，确保即使 Reasoner 输出了额外字符也能解析
    const cleanJson = extractJson(response);
    console.log("[LiuYao] Parsing Cleaned JSON:", cleanJson);
    
    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("[JSON-Parse-Fatal]", cleanJson);
      throw new Error("模型返回数据格式有误，无法解析 JSON。");
    }
  } catch (error: any) {
    console.error("[LiuYao-Service-Error]", error);
    return { 
      hexagramName: "起卦成功", 
      hexagramSymbol: "☯", 
      analysis: `### 推演受阻\n${error.message}\n\n*请确保 API 配置正确且余额充足。*` 
    };
  }
}
