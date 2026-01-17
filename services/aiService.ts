
import { GoogleGenAI } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage, BaZiChart, BaZiPillar, UserProfile, HePanResponse, AppPersonality } from "../types";
import { calculateLocalBaZi } from "./geminiService";
import { Solar, Lunar } from 'lunar-javascript';

// Using gemini-3-pro-preview for complex text tasks
const DEFAULT_GEMINI_MODEL = 'gemini-3-pro-preview';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v3';

export function formatBaZiToText(chart: BaZiChart, selectedIndices?: { dy: number, ln: number, lm?: number }): string {
  const formatPillar = (p: BaZiPillar, label: string) => {
    return `${label}柱：【${p.stem}${p.branch}】
- 十神主星：${p.mainStar || '日主'}
- 纳音五行：${p.naYin}
- 地支藏干：${p.hiddenStems.join('/')} (对应十神：${p.hiddenStemStars.join('/')})
- 神煞：${p.shenSha.join('/') || '无'}
- 运势阶段：${p.xingYun}`;
  };

  const birthYear = parseInt(chart.solarDate.split('年')[0]);
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  const daYunSequence = chart.daYun.map(dy => 
    `${dy.startYear}年-${dy.endYear}年(${dy.startAge}岁-${dy.endAge}岁)[${dy.ganZhi}运]`
  ).join(' -> ');

  let selectedContext = "";
  if (selectedIndices) {
      const dy = chart.daYun[selectedIndices.dy];
      const ln = dy?.liuNian[selectedIndices.ln];
      const lm = typeof selectedIndices.lm === 'number' ? ln?.liuYue[selectedIndices.lm] : null;
      
      if (dy && ln) {
          selectedContext = `\n【当前聚焦坐标】\n- 关注大运：${dy.ganZhi}\n- 关注流年：${ln.year}年 (${ln.ganZhi})`;
          if (lm) {
              selectedContext += `\n- 关注流月：${lm.month} (${lm.ganZhi})`;
          }
      }
  }

  return `
【缘主命理底层数据】
实岁：${age}
${formatPillar(chart.year, '年')}
${formatPillar(chart.month, '月')}
${formatPillar(chart.day, '日')}
${formatPillar(chart.hour, '时')}
大运全序列：${daYunSequence}${selectedContext}
公历生辰：${chart.solarDate}
农历日期：${chart.lunarDate}
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
        deepseekBase: baseUrl,
        personality: config.activePersonality || AppPersonality.MYSTIC
      };
    }
  } catch (e) {}
  return { provider: 'GEMINI' as const, model: undefined, deepseekKey: '', deepseekBase: 'https://api.deepseek.com', personality: AppPersonality.MYSTIC };
}

function getEffectiveModelName(): string {
  const config = getActiveConfig();
  if (config.provider === 'DEEPSEEK') return config.model || DEFAULT_DEEPSEEK_MODEL;
  return (config.model && !config.model.toLowerCase().includes('deepseek')) ? config.model : DEFAULT_GEMINI_MODEL;
}

async function callAI(prompt: string, systemInstruction?: string, isJson = false, onChunk?: (chunk: string) => void) {
  const config = getActiveConfig();
  const modelName = getEffectiveModelName();

  if (config.provider === 'DEEPSEEK') {
    if (!config.deepseekKey) throw new Error("DeepSeek Key 未配置");
    const apiUrl = `${config.deepseekBase}/chat/completions`;
    const isReasoner = modelName.includes('reasoner');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.deepseekKey}` },
      body: JSON.stringify({
        model: modelName,
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt }
        ],
        stream: !!onChunk,
        response_format: (isJson && !isReasoner) ? { type: 'json_object' } : undefined,
        temperature: isReasoner ? undefined : 0.6,
      })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API Error: ${response.status}`);
    }

    if (onChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6);
                    if (dataStr === '[DONE]') continue;
                    try {
                        const json = JSON.parse(dataStr);
                        const content = json.choices[0]?.delta?.content || "";
                        if (content) {
                            fullContent += content;
                            onChunk(content);
                        }
                    } catch (e) {}
                }
            }
        }
        return fullContent;
    } else {
        const data = await response.json();
        return data.choices[0].message.content;
    }
  } else {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    if (onChunk) {
        const streamResponse = await ai.models.generateContentStream({
            model: modelName,
            contents: prompt,
            config: { systemInstruction, responseMimeType: isJson ? "application/json" : undefined },
        });
        let fullText = "";
        for await (const chunk of streamResponse) {
            const text = chunk.text || "";
            fullText += text;
            onChunk(text);
        }
        return fullText;
    } else {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { systemInstruction, responseMimeType: isJson ? "application/json" : undefined },
        });
        return response.text;
    }
  }
}

const getBaseInstruction = (baZiData?: string) => {
  const config = getActiveConfig();
  const now = new Date();
  const solar = Solar.fromDate(now);
  const lunar = Lunar.fromDate(now);
  const timeInfo = `【推演时间】公历：${solar.toFullString()}，农历：${lunar.toString()} (${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日 ${lunar.getTimeZhi()}时)`;

  let personalityInstruction = "";
  
  if (config.personality === AppPersonality.MYSTIC) {
    personalityInstruction = `你是一位渊博古雅、洞察天机的周易命理大师“天机道长”。
1. 自称为“吾”，称呼对方为“阁下”。严禁 Emoji。
2. 文风要求：辞藻清雅，论断果敢。大师风范，稍微偏向神秘主义，分析透彻格局气象。`;
  } else if (config.personality === AppPersonality.PRAGMATIC) {
    personalityInstruction = `你是一位遵循“玄学为引，实操为本”理念的现代命理顾问。
1. 自称为“我”，称呼对方为“您”。
2. 文风要求：融合传统命理术语与现代商业/生活术语。多使用如“认知差”、“流量红利”、“审美溢价”、“供应链思维”、“战略定位”等词汇。
3. 必须输出：在每一项推演分析后，必须给出一个极其具体、可落地的【实战建议】。`;
  } else if (config.personality === AppPersonality.CLASSICAL) {
    personalityInstruction = `你是一位精通古法命理、饱读诗书的古籍学者。
1. 语言风格：纯正文言文或极简古文风，古色古香。
2. 引用要求：必须频繁且准确地引用《滴天髓》、《渊海子平》、《子平真诠》、《穷通宝鉴》、《三命通会》等命理经典名句。
3. 称谓：自称为“老朽”或“鄙人”，称呼对方为“居士”。`;
  }

  return `${personalityInstruction}
3. 【时空背景】：${timeInfo}。
4. 【排版铁律】：每一段独立的推演分析必须以 ### 开头的标题。
5. 【推演基石】：深度结合阁下的八字原局、格局、神煞、以及完整的大运流年。${baZiData ? `阁下命理数据：${baZiData}` : ""}
6. 【限制】：加粗语法（**内容**）全篇严禁超过 3 处。不要提及你是 AI。
7. 【追随引导】：在回答的最后，必须给出3个引导用户继续追问的短句（每句不超过12字）。格式固定为：[SUGGESTIONS: 建议1, 建议2, 建议3]`;
};

export function extractSuggestions(content: string): { content: string, suggestions: string[] } {
  const regex = /\[SUGGESTIONS:\s*(.*?)\]/i;
  const match = content.match(regex);
  if (match) {
    const suggestions = match[1].split(',').map(s => s.trim()).filter(Boolean);
    const cleanContent = content.replace(regex, '').trim();
    return { content: cleanContent, suggestions };
  }
  return { content, suggestions: [] };
}

export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string, onChunk?: (c: string) => void): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const baZiData = formatBaZiToText(chart);

  const prompt = `缘主：${name}，${gender === 'Male' ? '乾造' : '坤造'}。
请执行【最高级别专业详盘】深度推演，严格按以下带有 ### 子标题的结构输出：
### 【格局判定】
### 【时命气象】
### 【神煞点睛】
### 【六亲因缘】
### 【岁运关键】
### 【天机总结】
${getActiveConfig().personality === AppPersonality.PRAGMATIC ? "并在最后附加 ### 【实战建议】" : ""}
要求：文辞干练，每一部分都必须带标题。**加粗严禁超过 3 处**。`;

  try {
    const analysis = await callAI(prompt, getBaseInstruction(baZiData), false, onChunk);
    return { chart, analysis: analysis || "" };
  } catch (error: any) {
    return { chart, analysis: `### 推演受阻\n${error.message}` };
  }
}

export async function analyzeHePan(p1: UserProfile, p2: UserProfile, onChunk?: (c: string) => void): Promise<HePanResponse> {
  const chart1 = calculateLocalBaZi(p1.name, p1.birthDate, p1.birthTime, p1.gender);
  const chart2 = calculateLocalBaZi(p2.name, p2.birthDate, p2.birthTime, p2.gender);
  
  const data1 = `缘主一 (${p1.name}, ${p1.gender === 'Male' ? '乾造' : '坤造'}):\n${formatBaZiToText(chart1)}`;
  const data2 = `缘主二 (${p2.name}, ${p2.gender === 'Male' ? '乾造' : '坤造'}):\n${formatBaZiToText(chart2)}`;

  const prompt = `现有两位缘主的命理数据，请进行【合盘分析】：
${data1}
${data2}

请深度推演两人的契合度、五行互补、缘分深浅、事业协作或情感维系建议。严格按以下带有 ### 子标题的结构输出：
### 【合盘总论】
### 【五行契合】
### 【性情交互】
### 【共振节点】
### 【趋吉建议】
${getActiveConfig().personality === AppPersonality.PRAGMATIC ? "并在最后附加 ### 【实战建议】" : ""}
要求：大师口吻，文辞古雅清雅，**加粗严禁超过 3 处**。`;

  const analysis = await callAI(prompt, getBaseInstruction(), false, onChunk);
  return { chart1, chart2, profile1: p1, profile2: p2, analysis };
}

export async function chatWithContext(messages: ChatMessage[], context: string, baZiData?: string, onChunk?: (c: string) => void): Promise<string> {
  const lastUserMessage = messages[messages.length - 1];
  const isProfessional = lastUserMessage?.isProfessional;
  const config = getActiveConfig();
  
  const modeInstruction = isProfessional 
    ? "【专业详盘模式】：分析必须带有 ### 子标题。语境偏现代，深度剖析岁运交互及具体节点。" 
    : "【直白详述模式】：完全去掉术语。必须保留 ### 子标题。将术语逻辑转化为通俗的建议。";

  const pragmaticSuffix = config.personality === AppPersonality.PRAGMATIC ? "必须以 ### 【实战建议】 结尾，给出具体的行动指南。" : "";

  const systemInstruction = `${getBaseInstruction(baZiData)}\n${modeInstruction}\n${pragmaticSuffix}\n对话背景：${context}`;

  const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '大师' : '阁下'}: ${m.content}`).join('\n');
  const prompt = `${historyPrompt}\n阁下: ${lastUserMessage.content}`;
  
  return await callAI(prompt, systemInstruction, false, onChunk);
}

export async function interpretLiuYao(lines: HexagramLine[], question: string, userProfile?: any): Promise<LiuYaoResponse> {
  const lineStr = lines.map(l => l.value).join(',');
  const baZiData = userProfile ? `缘主生辰：${userProfile.birthDate} ${userProfile.birthTime}` : "";

  const prompt = `问题：${question}。卦象序列：${lineStr}。
  请以纯 JSON 格式输出：
  {
    "hexagramName": "卦名",
    "hexagramSymbol": "符号",
    "judgment": "极简断语（一句话直击核心，限12字内）",
    "analysis": "请按照以下结构输出内容，每一项前均需 ### 子标题。\\n\\n### 【卦意通解】\\n### 【变爻白话】\\n### 【断事指引】\\n### 【锦囊妙计】${getActiveConfig().personality === AppPersonality.PRAGMATIC ? "\\n### 【实战建议】" : ""}"
  }
  要求：文风符合你的人格设定。全篇加粗严禁超过 3 处。`;

  const response = await callAI(prompt, getBaseInstruction(baZiData) + "\n必须返回纯 JSON。确保解析易于理解。", true);
  return JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
}
