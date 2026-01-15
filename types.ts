
export enum AppMode {
  HOME = 'HOME',
  BAZI = 'BAZI',
  LIUYAO = 'LIUYAO',
  ADMIN = 'ADMIN',
  PROFILE = 'PROFILE'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female'
}

export interface UserProfile {
  name: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  birthPlace: string;
  phoneNumber?: string;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  gradient: string;
  content: string;
  layout?: 'standard' | 'wide' | 'vertical_split' | 'quote';
  images?: string[];
}

export interface BaZiPillar {
  stem: string;
  branch: string;
  element: string;
  mainStar: string;
  hiddenStems: string[];
  hiddenStemStars: string[];
  naYin: string;
  shenSha: string[];
  empty: string;
  xingYun: string;
  ziZuo: string;
}

export interface LiuYue {
  month: string;
  ganZhi: string;
}

export interface LiuNian {
  year: number;
  ganZhi: string;
  age: number;
  liuYue: LiuYue[];
}

export interface DaYun {
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  ganZhi: string;
  liuNian: LiuNian[];
}

export interface BaZiChart {
  year: BaZiPillar;
  month: BaZiPillar;
  day: BaZiPillar;
  hour: BaZiPillar;
  lunarDate: string;
  solarDate: string;
  daYun: DaYun[];
}

export interface BaZiResponse {
  chart: BaZiChart;
  analysis: string;
}

export type InputMode = 'MANUAL' | 'SHAKE' | 'TIME' | 'NUMBER';

export enum CoinSide {
  HEAD = 3,
  TAIL = 2
}

export enum YaoType {
  OLD_YIN = 6,
  YOUNG_YANG = 7,
  YOUNG_YIN = 8,
  OLD_YANG = 9
}

export interface HexagramLine {
  value: number;
  position: number;
}

export interface LiuYaoResponse {
  hexagramName: string;
  hexagramSymbol: string;
  analysis: string;
  judgment?: string;
}

export interface LiuYaoHistoryRecord {
  id: string;
  question: string;
  timestamp: number;
  dateStr: string;
  result: LiuYaoResponse;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'bazi_result' | 'liuyao_result';
  data?: any;
  isProfessional?: boolean; // Flag to indicate if the content was generated in professional mode
  suggestions?: string[]; // AI-generated follow-up questions
}

/**
 * Shared helper to get visual properties based on Heavenly Stem (Element)
 */
export const getElementStyle = (stem: string) => {
  if (['甲', '乙'].includes(stem)) return { char: '木', color: 'from-emerald-800 to-emerald-950', border: 'border-emerald-500/20', shadow: 'shadow-emerald-500/20' };
  if (['丙', '丁'].includes(stem)) return { char: '火', color: 'from-red-800 to-red-950', border: 'border-red-500/20', shadow: 'shadow-red-500/30' };
  if (['戊', '己'].includes(stem)) return { char: '土', color: 'from-amber-800 to-amber-950', border: 'border-amber-500/20', shadow: 'shadow-amber-500/20' };
  if (['庚', '辛'].includes(stem)) return { char: '金', color: 'from-[#c5b078] to-[#8a7a53]', border: 'border-[#c5b078]/30', shadow: 'shadow-[#c5b078]/20' };
  if (['壬', '癸'].includes(stem)) return { char: '水', color: 'from-blue-800 to-blue-950', border: 'border-blue-500/20', shadow: 'shadow-blue-500/20' };
  return { char: '命', color: 'from-gray-800 to-black', border: 'border-white/10', shadow: 'shadow-none' };
};
