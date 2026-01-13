
import { GoogleGenAI, Type } from "@google/genai";
import { BaZiResponse, HexagramLine, LiuYaoResponse, ChatMessage, BaZiPillar, DaYun, LiuNian, LiuYue } from "../types";
import { Solar, Lunar, EightChar } from 'lunar-javascript';

// 模型默认定义
const DEFAULT_TEXT_MODEL = 'gemini-3-flash-preview';

/**
 * 获取本地存储的配置
 */
function getApiConfig() {
  try {
    const saved = localStorage.getItem('dao_assets');
    if (saved) {
      const config = JSON.parse(saved);
      return {
        provider: config.apiProvider || 'GEMINI',
        model: config.apiModel || DEFAULT_TEXT_MODEL,
        apiKey: config.customApiKey || '',
        baseUrl: config.apiBaseUrl || 'https://api.deepseek.com'
      };
    }
  } catch (e) {}
  return { provider: 'GEMINI', model: DEFAULT_TEXT_MODEL, apiKey: '', baseUrl: '' };
}

/**
 * 通用 AI 生成函数
 */
async function generateContentWithProvider(prompt: string, systemInstruction?: string, isJson = false) {
  const config = getApiConfig();

  if (config.provider === 'DEEPSEEK' && config.apiKey) {
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt }
        ],
        response_format: isJson ? { type: 'json_object' } : undefined
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } else {
    // 默认使用 Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: config.model || DEFAULT_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: isJson ? "application/json" : undefined
      },
    });
    return response.text;
  }
}

/**
 * 核心算法：全面神煞计算器 (涵盖55+神煞逻辑)
 */
function getPillarShenSha(eightChar: EightChar, pillarIdx: number): string[] {
  const dayGan = eightChar.getDayGan();
  const dayZhi = eightChar.getDayZhi();
  const yearGan = eightChar.getYearGan();
  const yearZhi = eightChar.getYearZhi();
  const monthZhi = eightChar.getMonthZhi();
  
  const targetGan = [eightChar.getYearGan(), eightChar.getMonthGan(), eightChar.getDayGan(), eightChar.getTimeGan()][pillarIdx];
  const targetZhi = [eightChar.getYearZhi(), eightChar.getMonthZhi(), eightChar.getDayZhi(), eightChar.getTimeZhi()][pillarIdx];
  const pillarGanZhi = targetGan + targetZhi;

  const results: string[] = [];

  // --- 1. 基于日干查支 (贵人、学堂等) ---
  const tianYiMap: Record<string, string[]> = { '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'], '乙': ['子', '申'], '己': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'], '壬': ['卯', '巳'], '癸': ['卯', '巳'], '辛': ['午', '寅'] };
  if (tianYiMap[dayGan]?.includes(targetZhi)) results.push('天乙贵人');

  const wenChangMap: Record<string, string> = { '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申', '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯' };
  if (wenChangMap[dayGan] === targetZhi) results.push('文昌贵人');

  const luShenMap: Record<string, string> = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' };
  if (luShenMap[dayGan] === targetZhi) results.push('禄神');

  const yangRenMap: Record<string, string> = { '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子' };
  if (yangRenMap[dayGan] === targetZhi) results.push('羊刃');

  const taiJiMap: Record<string, string[]> = { '甲': ['子', '午'], '乙': ['子', '午'], '丙': ['卯', '酉'], '丁': ['卯', '酉'], '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'], '庚': ['寅', '亥'], '辛': ['寅', '亥'], '壬': ['巳', '申'], '癸': ['巳', '申'] };
  if (taiJiMap[dayGan]?.includes(targetZhi)) results.push('太极贵人');

  const fuXingMap: Record<string, string[]> = { '甲': ['寅', '子'], '乙': ['亥', '丑'], '丙': ['子', '寅'], '丁': ['亥', '酉'], '戊': ['申'], '己': ['未'], '庚': ['午'], '辛': ['巳'], '壬': ['辰'], '癸': ['卯'] };
  if (fuXingMap[dayGan]?.includes(targetZhi)) results.push('福星贵人');

  const guoYinMap: Record<string, string> = { '甲': '戌', '乙': '亥', '丙': '丑', '丁': '寅', '戊': '丑', '己': '寅', '庚': '辰', '辛': '巳', '壬': '未', '癸': '申' };
  if (guoYinMap[dayGan] === targetZhi) results.push('国印贵人');

  const jinYuMap: Record<string, string> = { '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未', '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅' };
  if (jinYuMap[dayGan] === targetZhi) results.push('金舆');

  const hongYanMap: Record<string, string> = { '甲': '午', '乙': '申', '丙': '寅', '丁': '未', '戊': '辰', '己': '辰', '庚': '戌', '辛': '酉', '壬': '子', '癸': '申' };
  if (hongYanMap[dayGan] === targetZhi) results.push('红艳煞');

  const liuXiaMap: Record<string, string> = { '甲': '酉', '乙': '戌', '丙': '未', '丁': '巳', '戊': '午', '己': '未', '庚': '辰', '辛': '卯', '壬': '亥', '癸': '寅' };
  if (liuXiaMap[dayGan] === targetZhi) results.push('流霞');

  const yiMaMap: Record<string, string> = { '申': '寅', '子': '寅', '辰': '寅', '寅': '申', '午': '申', '戌': '申', '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳' };
  if (yiMaMap[dayZhi] === targetZhi || yiMaMap[yearZhi] === targetZhi) results.push('驿马');

  const taoHuaMap: Record<string, string> = { '申': '酉', '子': '酉', '辰': '酉', '寅': '卯', '午': '卯', '戌': '卯', '巳': '午', '酉': '午', '丑': '午', '亥': '子', '卯': '子', '未': '子' };
  if (taoHuaMap[dayZhi] === targetZhi || taoHuaMap[yearZhi] === targetZhi) results.push('咸池桃花');

  const huaGaiMap: Record<string, string> = { '申': '辰', '子': '辰', '辰': '辰', '寅': '戌', '午': '戌', '戌': '戌', '巳': '丑', '酉': '丑', '丑': '丑', '亥': '未', '卯': '未', '未': '未' };
  if (huaGaiMap[dayZhi] === targetZhi || huaGaiMap[yearZhi] === targetZhi) results.push('华盖');

  const jiangXingMap: Record<string, string> = { '申': '子', '子': '子', '辰': '子', '寅': '午', '午': '午', '戌': '午', '巳': '酉', '酉': '酉', '丑': '酉', '亥': '卯', '卯': '卯', '未': '卯' };
  if (jiangXingMap[dayZhi] === targetZhi || jiangXingMap[yearZhi] === targetZhi) results.push('将星');

  const wangShenMap: Record<string, string> = { '申': '亥', '子': '亥', '辰': '亥', '寅': '巳', '午': '巳', '戌': '巳', '巳': '申', '酉': '申', '丑': '申', '亥': '寅', '卯': '寅', '未': '寅' };
  if (wangShenMap[dayZhi] === targetZhi || wangShenMap[yearZhi] === targetZhi) results.push('亡神');

  const jieShaMap: Record<string, string> = { '申': '巳', '子': '巳', '辰': '巳', '寅': '亥', '午': '亥', '戌': '亥', '巳': '寅', '酉': '寅', '丑': '寅', '亥': '申', '卯': '申', '未': '申' };
  if (jieShaMap[dayZhi] === targetZhi || jieShaMap[yearZhi] === targetZhi) results.push('劫煞');

  const guGuaMap: Record<string, {gu: string, gua: string}> = { '寅': {gu: '巳', gua: '丑'}, '卯': {gu: '巳', gua: '丑'}, '辰': {gu: '巳', gua: '丑'}, '巳': {gu: '申', gua: '辰'}, '午': {gu: '申', gua: '辰'}, '未': {gu: '申', gua: '辰'}, '申': {gu: '亥', gua: '未'}, '酉': {gu: '亥', gua: '未'}, '戌': {gu: '亥', gua: '未'}, '亥': {gu: '寅', gua: '戌'}, '子': {gu: '寅', gua: '戌'}, '丑': {gu: '寅', gua: '戌'} };
  if (guGuaMap[yearZhi]?.gu === targetZhi) results.push('孤辰');
  if (guGuaMap[yearZhi]?.gua === targetZhi) results.push('寡宿');

  const yuanChenMap: Record<string, string> = { '子': '未', '丑': '申', '寅': '酉', '卯': '戌', '辰': '亥', '巳': '子', '午': '丑', '未': '寅', '申': '卯', '酉': '辰', '戌': '巳', '亥': '午' };
  if (yuanChenMap[yearZhi] === targetZhi) results.push('元辰');

  const tianDeMap: Record<string, string> = { '子': '巳', '丑': '庚', '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲', '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙' };
  if (tianDeMap[monthZhi] === targetZhi || tianDeMap[monthZhi] === targetGan) results.push('天德贵人');

  const yueDeMap: Record<string, string> = { '寅': '丙', '午': '丙', '戌': '丙', '亥': '甲', '卯': '甲', '未': '甲', '巳': '庚', '酉': '庚', '丑': '庚', '申': '壬', '子': '壬', '辰': '壬' };
  if (yueDeMap[monthZhi] === targetGan) results.push('月德贵人');

  const tianYiPhysician: Record<string, string> = { '子': '亥', '丑': '子', '寅': '丑', '卯': '寅', '辰': '卯', '巳': '辰', '午': '巳', '未': '午', '申': '未', '酉': '申', '戌': '酉', '亥': '戌' };
  if (tianYiPhysician[monthZhi] === targetZhi) results.push('天医');

  if (['戊戌', '庚戌', '庚辰', '壬辰'].includes(pillarGanZhi)) results.push('魁罡');
  if (['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'].includes(pillarGanZhi)) results.push('阴差阳错');
  if (['甲辰', '乙巳', '丙申', '丁亥', '戊戌', '己丑', '庚辰', '辛巳', '壬申', '癸亥'].includes(pillarGanZhi)) results.push('十恶大败');
  
  const guLuan = ['乙巳', '丁巳', '辛亥', '甲寅', '戊申', '壬子', '己巳'];
  if (guLuan.includes(pillarGanZhi)) results.push('孤鸾煞');

  const dayXunKong = eightChar.getDayXunKong();
  if (dayXunKong.includes(targetZhi)) results.push('空亡');
  
  if (pillarIdx === 3 && ['癸酉', '己巳', '乙丑'].includes(pillarGanZhi)) results.push('金神');
  
  try {
      const lunar = eightChar.getLunar();
      const baseShenSha = pillarIdx === 0 ? lunar.getYearShenSha() : 
                         pillarIdx === 2 ? lunar.getDayShenSha() : [];
      baseShenSha.forEach(s => {
          if(!results.includes(s)) results.push(s);
      });
  } catch(e) {}

  return Array.from(new Set(results));
}

/**
 * 核心算法：本地八字排盘
 */
export function calculateLocalBaZi(name: string, date: string, time: string, gender: string) {
  const [y, m, d] = (date || '1990-01-01').split('-').map(Number);
  const [h, min] = (time || '12:00').split(':').map(Number);
  const solar = Solar.fromYmdHms(y, m, d, h, min, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  
  const createPillar = (type: 'Year' | 'Month' | 'Day' | 'Hour', idx: number): BaZiPillar => {
    let stem = '', branch = '', naYin = '', xingYun = '', hiddenStems: string[] = [], hiddenStemStars: string[] = [];
    
    switch(type) {
      case 'Year': 
        stem = eightChar.getYearGan(); branch = eightChar.getYearZhi(); naYin = eightChar.getYearNaYin(); 
        hiddenStems = eightChar.getYearHideGan(); hiddenStemStars = eightChar.getYearShiShenZhi(); 
        xingYun = eightChar.getYearDiShi(); 
        break;
      case 'Month': 
        stem = eightChar.getMonthGan(); branch = eightChar.getMonthZhi(); naYin = eightChar.getMonthNaYin(); 
        hiddenStems = eightChar.getMonthHideGan(); hiddenStemStars = eightChar.getMonthShiShenZhi(); 
        xingYun = eightChar.getMonthDiShi(); 
        break;
      case 'Day': 
        stem = eightChar.getDayGan(); branch = eightChar.getDayZhi(); naYin = eightChar.getDayNaYin(); 
        hiddenStems = eightChar.getDayHideGan(); hiddenStemStars = eightChar.getDayShiShenZhi(); 
        xingYun = eightChar.getDayDiShi(); 
        break;
      case 'Hour': 
        stem = eightChar.getTimeGan(); branch = eightChar.getTimeZhi(); naYin = eightChar.getTimeNaYin(); 
        hiddenStems = eightChar.getTimeHideGan(); hiddenStemStars = eightChar.getTimeShiShenZhi(); 
        xingYun = eightChar.getTimeDiShi(); 
        break;
    }
    
    const methodPrefix = type === 'Hour' ? 'Time' : type;
    const mainStar = type === 'Day' ? '日主' : (eightChar as any)[`get${methodPrefix}ShiShenGan`] ? (eightChar as any)[`get${methodPrefix}ShiShenGan`]() : '';
    
    return {
      stem, branch, element: '', mainStar: mainStar || '', hiddenStems, hiddenStemStars, naYin,
      shenSha: getPillarShenSha(eightChar, idx),
      empty: type === 'Day' ? eightChar.getDayXunKong() : '', xingYun, ziZuo: ''
    };
  };

  const chart = {
    solarDate: solar.toFullString(), lunarDate: lunar.toString(),
    year: createPillar('Year', 0), month: createPillar('Month', 1), day: createPillar('Day', 2), hour: createPillar('Hour', 3),
    daYun: [] as DaYun[]
  };

  const yun = eightChar.getYun(gender === 'Male' ? 1 : 0);
  chart.daYun = yun.getDaYun().map(d => {
    const startYear = d.getStartYear();
    const startAge = d.getStartAge();
    return {
      startYear, endYear: startYear + 9, startAge, endAge: startAge + 9, ganZhi: d.getGanZhi(),
      liuNian: d.getLiuNian().map(ln => ({
        year: ln.getYear(), ganZhi: ln.getGanZhi(), age: ln.getAge(),
        liuYue: ln.getLiuYue().map(ly => ({ month: ly.getMonthInChinese() + '月', ganZhi: ly.getGanZhi() }))
      }))
    };
  });
  return chart;
}

/**
 * 核心解盘分析
 */
export async function analyzeBaZi(name: string, date: string, time: string, gender: string, place: string): Promise<BaZiResponse> {
  const chart = calculateLocalBaZi(name, date, time, gender);
  const birthY = parseInt(date.split('-')[0]);
  const currentAge = new Date().getFullYear() - birthY;

  const systemInstruction = "你是一个专业的八字分析师。";
  const prompt = `缘主：${name}（${gender}），今年 ${currentAge} 岁。
  排盘：${chart.year.stem}${chart.year.branch} ${chart.month.stem}${chart.month.branch} ${chart.day.stem}${chart.day.branch} ${chart.hour.stem}${chart.hour.branch}。
  
  回答核心要求：
  1. **开头定位**：必须首先对缘主当前的年龄阶段进行直白的判断（如“阁下正值而立，重在事业开疆”、“缘主已近花甲，宜享晚年之福”），语气亲切但要精准。
  2. **内容干练**：使用 ### 作为分段标题。核心断语加粗，必须直击重点，不要使用过长的形容词。
  3. **收尾自然**：结尾的诗意寄语严禁带有任何标题或标签，直接在分析结束后换行呈现。
  4. **追问启发**：最后必须附带一句启发性的追问，例如“关于贵人的确切方向，阁下可愿一探？”或“姻缘之变是否尚有疑虑？”。
  5. 控制在600字内。`;

  try {
    const text = await generateContentWithProvider(prompt, systemInstruction);
    return { chart, analysis: text || "命盘已出。" };
  } catch (error) {
    return { chart, analysis: "天机阻塞。" };
  }
}

/**
 * 对话交流 (引入历史记忆)
 */
export async function chatWithContext(messages: ChatMessage[], context: string): Promise<string> {
  try {
    const lastUserMessage = messages[messages.length - 1];
    const isProfessional = lastUserMessage?.isProfessional;
    
    const contextString = `当前缘主背景信息：${context}。`;
    const systemInstruction = `你是一位渊博的命理大师。
      ${contextString}
      
      对话规则：
      1. 始终精准对应缘主的年龄段特点进行回复。
      2. 标题使用 "###" 开头。
      3. 结尾的诗意结语不需要任何标题，直接书写。
      4. 在回复的最末尾，强制附带一个引导性的追问，启发缘主探索命理的下一个维度。
      
      ${isProfessional ? 
        '模式：详剖。深度运用用神、忌神等专业逻辑。' : 
        '模式：通俗。简洁明了，**禁止使用隐晦的比喻**，用白话直接点破核心，像老友对话一般干练有力。'}
      
      言简意赅。`;

    // 简单拼接对话历史
    const historyPrompt = messages.map(m => `${m.role === 'assistant' ? '大师' : '缘主'}: ${m.content}`).join('\n');
    const prompt = `${historyPrompt}\n缘主: ${lastUserMessage.content}`;

    const text = await generateContentWithProvider(prompt, systemInstruction);
    return text || "天机不可泄。";
  } catch (error) {
    console.error("Chat Error:", error);
    return "大师闭关中，请稍后再试。";
  }
}

/**
 * 六爻起卦解卦
 */
export async function interpretLiuYao(lines: HexagramLine[], question: string, userProfile?: any): Promise<LiuYaoResponse> {
  const sortedLines = [...lines].sort((a, b) => a.position - b.position);
  const lineStr = sortedLines.map(l => l.value).join(',');
  
  const birthYear = userProfile ? parseInt(userProfile.birthDate.split('-')[0]) : null;
  const currentAge = birthYear ? new Date().getFullYear() - birthYear : '未知';
  const ageTag = birthYear ? `缘主今年 ${currentAge} 岁。` : '';

  const prompt = `阁下问：${question}。
  ${ageTag}
  卦象序列（初爻到上爻）：${lineStr}。
  
  要求输出 JSON，包含：
  - hexagramName: 卦名
  - hexagramSymbol: 符号
  - judgment: 简短卦辞
  - analysis: 内容需以 ### 标题分段。
    * 开头必须结合年龄画像（如“少年求学路漫漫”、“壮年图谋事业艰”）展开论述。
    * 论述应通俗易懂，减少多余的比喻。
    * 结尾直接给出无标题的诗意寄语。
    * 寄语后附带一句启发性的追问引导。`;

  try {
    const text = await generateContentWithProvider(prompt, "你是一个专业的六爻解卦师。", true);
    return JSON.parse(text || "{}");
  } catch (error) {
    return { hexagramName: "起卦成功", hexagramSymbol: "☯", judgment: "天机暂闭", analysis: "### 卦象已成\n稍后再来。" };
  }
}
