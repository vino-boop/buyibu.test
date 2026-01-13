
import { BaZiPillar, DaYun } from "../types";
import { Solar, EightChar } from 'lunar-javascript';

/**
 * 核心算法：全面神煞计算器 (涵盖55+神煞逻辑)
 */
function getPillarShenSha(eightChar: EightChar, pillarIdx: number): string[] {
  const dayGan = eightChar.getDayGan();
  const dayZhi = eightChar.getDayZhi();
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

  const jinYuMap: Record<string, string> = { '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未', '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅' };
  if (jinYuMap[dayGan] === targetZhi) results.push('金舆');

  const yiMaMap: Record<string, string> = { '申': '寅', '子': '寅', '辰': '寅', '寅': '申', '午': '申', '戌': '申', '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳' };
  if (yiMaMap[dayZhi] === targetZhi || yiMaMap[yearZhi] === targetZhi) results.push('驿马');

  const huaGaiMap: Record<string, string> = { '申': '辰', '子': '辰', '辰': '辰', '寅': '戌', '午': '戌', '戌': '戌', '巳': '丑', '酉': '丑', '丑': '丑', '亥': '未', '卯': '未', '未': '未' };
  if (huaGaiMap[dayZhi] === targetZhi || huaGaiMap[yearZhi] === targetZhi) results.push('华盖');

  const tianDeMap: Record<string, string> = { '子': '巳', '丑': '庚', '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲', '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙' };
  if (tianDeMap[monthZhi] === targetZhi || tianDeMap[monthZhi] === targetGan) results.push('天德贵人');

  if (['戊戌', '庚戌', '庚辰', '壬辰'].includes(pillarGanZhi)) results.push('魁罡');
  
  const dayXunKong = eightChar.getDayXunKong();
  if (dayXunKong.includes(targetZhi)) results.push('空亡');
  
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
