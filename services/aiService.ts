
import { GoogleGenAI } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage, BaZiChart, BaZiPillar } from "../types";
import { calculateLocalBaZi } from "./geminiService";

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
// 调整为 deepseek-chat，它是 DeepSeek V3 模型，速度极快且支持 JSON 模式
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

/**
 * 将命盘数据转化为 AI 可读的“全生命周期数据流”
 */
export function formatBaZiToText(chart: BaZiChart, selectedIndices?: { dy: number, ln: number }): string {
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
      if (dy && ln) {
          selectedContext = `\n【当前聚焦坐标】\n- 关注大运：${dy.ganZhi}\n- 关注流年：${ln.year}年 (${ln.ganZhi})`;
      }
  }

  return `
【缘主命理底层数据】
缘主当前实岁：${age}
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
    // 判断是否为 R1 模型（reasoner），R1 目前不支持 json_object 格式
    const isReasoner = modelName.includes('reasoner');
    
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
          // 仅非 R1 模型支持 JSON 模式
          response_format: (isJson && !isReasoner) ? { type: 'json_object' } : undefined,
          temperature: isReasoner ? undefined : 0.6,
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API 异常: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e: any) { 
      throw new Error(`DeepSeek 推演中断: ${e.message}`); 
    }
  } else {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { systemInstruction, responseMimeType: isJson ? "application/json" : undefined },
      });
      return response.text;
    } catch (e: any) { 
      throw new Error(`Gemini 推演受阻: ${e.message}`); 
    }
  }
}

const getBaseInstruction = (baZiData?: string) => `你是一位渊博古雅、洞察天机的周易命理大师。
1. 自称为“吾”，称呼对方为“阁下”。严禁 Emoji。
2. 【排版铁律】：每一段独立的推演分析必须以 ### 开头的古风标题。
3. 【文风要求】：辞藻清雅，论断果敢。在保持大师风范的同时，对现代职业（互联网、金融、创业等）和情感诉求有敏锐的洞察，用语稍微偏向现代语境，不要过于晦涩。
4. 【推演基石】：深度结合阁下的八字原局、格局、神煞、以及完整的大运流年。${baZiData ? `阁下命盘数据：${baZiData}` : ""}
5. 【限制】：加粗语法（**内容**）全篇严禁超过 3 处。不要提及你是 AI。`;

export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const baZiData = formatBaZiToText(chart);

  const prompt = `阁下：${name}，${gender === 'Male' ? '乾造' : '坤造'}。
请执行【最高级别专业详盘】深度推演，严格按以下带有 ### 子标题的结构输出：

### 【格局判定】
判定格神（如建禄格、从儿格等），并结合现代语境定下命局的能量层级与气质基调。

### 【时命气象】
针对阁下当前年龄段（如：而立之年的拼搏期、不惑之年的转型期等）的整体心理状态、精力分配及社会坐标进行深度白话解析。

### 【神煞点睛】
点出命局中最关键的 2-3 个神煞（如天乙贵人、驿马、魁罡等），解释它们如何影响阁下的性格特质和突发机缘。

### 【六亲因缘】
推演印比食伤财官在原局的状态，映射父母、同辈、伴侣及子女在现代生活中的助力深度与互动模式。

### 【岁运关键】
扫描提供的大运序列，指出 2-3 个流年节点。必须包含**事业财富增减**与**情感婚恋机会**。

### 【天机总结】
结尾必须包含一句古雅的诗总结和引导性追问（诗与追问不设标题）。

要求：严禁简写。**加粗严禁超过 3 处**。`;

  try {
    const analysis = await callAI(prompt, getBaseInstruction(baZiData));
    return { chart, analysis: analysis || "天机深邃，暂无所获。" };
  } catch (error: any) {
    return { chart, analysis: `### 推演受阻\n${error.message}` };
  }
}

export async function chatWithContext(messages: ChatMessage[], context: string, baZiData?: string): Promise<string> {
  const lastUserMessage = messages[messages.length - 1];
  const isProfessional = lastUserMessage?.isProfessional;
  
  const modeInstruction = isProfessional 
    ? "【专业详盘模式】：分析必须带有 ### 子标题。语境偏现代，深度剖析岁运交互及具体节点。" 
    : "【直白详述模式】：完全去掉术语。必须保留 ### 子标题。信息密度必须与专业模式持平，将术语逻辑转化为通俗的职业与情感建议。";

  const systemInstruction = `${getBaseInstruction(baZiData)}\n${modeInstruction}\n对话背景：${context}`;

  try {
    const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '吾' : '阁下'}: ${m.content}`).join('\n');
    const prompt = `${historyPrompt}\n阁下: ${lastUserMessage.content}`;
    const res = await callAI(prompt, systemInstruction);
    return res;
  } catch (e) { return "吾正在闭关参悟天机。"; }
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
    "analysis": "请严格按照以下结构输出内容，每一项前均需 ### 子标题：\\n\\n### 【卦辞解析】\\n解析核心大义。\\n\\n### 【动变机锋】\\n解析变动及趋势。\\n\\n### 【事态指引】\\n针对问题的现代生活建议。\\n\\n### 【诗以咏志】\\n包含诗句及结尾引导追问（不设标题）。"
  }
  要求：语境稍微偏向现代。全篇加粗严禁超过 3 处。`;

  try {
    const response = await callAI(prompt, getBaseInstruction(baZiData) + "\n必须返回纯 JSON。", true);
    return JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e: any) {
    return { hexagramName: "起卦成功", hexagramSymbol: "☯", judgment: "推演受阻。", analysis: `### 推演中断\n${e.message}` };
  }
}
