
// Fix: Added React import to resolve 'Cannot find namespace React' when using React.FC
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BaZiResponse, Gender, ChatMessage, UserProfile, BaZiChart, CalendarType } from '../types';
import { analyzeBaZi, chatWithContext, formatBaZiToText, extractSuggestions } from '../services/aiService';
import { calculateLocalBaZi } from '../services/geminiService';
import { Lunar } from 'lunar-javascript';

interface BaZiContextType {
  name: string;
  setName: (n: string) => void;
  gender: Gender;
  setGender: (g: Gender) => void;
  birthDate: string;
  setBirthDate: (d: string) => void;
  birthTime: string;
  setBirthTime: (t: string) => void;
  calendarType: CalendarType;
  setCalendarType: (c: CalendarType) => void;
  isLeapMonth: boolean;
  setIsLeapMonth: (l: boolean) => void;
  viewMode: 'EDIT' | 'VIEW';
  setViewMode: (v: 'EDIT' | 'VIEW') => void;
  chartDisplayMode: 'COLLAPSED' | 'EXPANDED';
  setChartDisplayMode: (v: 'COLLAPSED' | 'EXPANDED') => void;
  showFullDetails: boolean;
  setShowFullDetails: (v: boolean) => void;
  selectedDaYunIndex: number;
  setSelectedDaYunIndex: (i: number) => void;
  selectedLiuNianIndex: number;
  setSelectedLiuNianIndex: (i: number) => void;
  selectedLiuYueIndex: number;
  setSelectedLiuYueIndex: (i: number) => void;
  chartData: BaZiResponse | null;
  messages: ChatMessage[];
  loading: boolean;
  chatLoading: boolean;
  handleStart: (withAnalysis: boolean) => Promise<void>;
  handleSendMessage: (msg?: string, isPro?: boolean, isDirect?: boolean) => Promise<void>;
  inputMessage: string;
  setInputMessage: (m: string) => void;
  triggerDefaultQuestion: (q: string) => Promise<void>;
}

const BaZiContext = createContext<BaZiContextType | undefined>(undefined);

export const BaZiProvider: React.FC<{ userProfile: UserProfile; children: ReactNode }> = ({ userProfile, children }) => {
  const [name, setName] = useState(userProfile.name);
  const [gender, setGender] = useState(userProfile.gender);
  const [birthDate, setBirthDate] = useState(userProfile.birthDate);
  const [birthTime, setBirthTime] = useState(userProfile.birthTime);
  const [calendarType, setCalendarType] = useState<CalendarType>(userProfile.calendarType || CalendarType.SOLAR);
  const [isLeapMonth, setIsLeapMonth] = useState<boolean>(userProfile.isLeapMonth || false);
  const [viewMode, setViewMode] = useState<'EDIT' | 'VIEW'>('VIEW');
  const [chartDisplayMode, setChartDisplayMode] = useState<'COLLAPSED' | 'EXPANDED'>('EXPANDED');
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  const [selectedDaYunIndex, setSelectedDaYunIndex] = useState(0);
  const [selectedLiuNianIndex, setSelectedLiuNianIndex] = useState(0);
  const [selectedLiuYueIndex, setSelectedLiuYueIndex] = useState(0);

  const [chartData, setChartData] = useState<BaZiResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState('');

  // 辅助函数：根据当前日期寻找最匹配的索引
  const autoLocateIndices = (chart: BaZiChart) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentLunar = Lunar.fromDate(now);
    const currentLunarMonth = currentLunar.getMonth(); // 1-12，闰月为负

    let dyIdx = 0;
    let lnIdx = 0;
    let lyIdx = 0;

    // 1. 寻找大运
    const foundDyIdx = chart.daYun.findIndex(dy => currentYear >= dy.startYear && currentYear <= dy.endYear);
    if (foundDyIdx !== -1) {
      dyIdx = foundDyIdx;
      
      // 2. 寻找流年
      const foundLnIdx = chart.daYun[foundDyIdx].liuNian.findIndex(ln => ln.year === currentYear);
      if (foundLnIdx !== -1) {
        lnIdx = foundLnIdx;
        
        // 3. 寻找流月
        const currentMonthName = (currentLunarMonth < 0 ? "闰" : "") + Math.abs(currentLunarMonth) + "月";
        const foundLyIdx = chart.daYun[foundDyIdx].liuNian[foundLnIdx].liuYue.findIndex(ly => ly.month === currentMonthName);
        if (foundLyIdx !== -1) {
          lyIdx = foundLyIdx;
        } else {
            lyIdx = Math.min(Math.abs(currentLunarMonth) - 1, chart.daYun[foundDyIdx].liuNian[foundLnIdx].liuYue.length - 1);
        }
      }
    }

    setSelectedDaYunIndex(dyIdx);
    setSelectedLiuNianIndex(lnIdx);
    setSelectedLiuYueIndex(lyIdx);
  };

  const handleStart = async (withAnalysis: boolean) => {
    if (withAnalysis) setChatLoading(true);
    else setLoading(true);

    try {
      const chart = calculateLocalBaZi(name, birthDate, birthTime, gender, calendarType, isLeapMonth);
      
      // 自动定位至当前时间
      autoLocateIndices(chart);

      if (withAnalysis) {
        const assistantMsgId = Date.now().toString();
        setMessages([{ id: assistantMsgId, role: 'assistant', content: "" }]);
        
        const rawAnalysis = await analyzeBaZi(name, birthDate, birthTime, gender, '北京', (chunk) => {
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.id === assistantMsgId) {
                    return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
                }
                return prev;
            });
            setChatLoading(false); 
        });

        // After stream ends, extract suggestions
        setMessages(prev => {
           const last = prev[prev.length - 1];
           if (last && last.id === assistantMsgId) {
               const { content, suggestions } = extractSuggestions(last.content);
               return [...prev.slice(0, -1), { ...last, content, suggestions }];
           }
           return prev;
        });

        setChartData({ ...rawAnalysis, chart });
      } else {
        setChartData({ chart, analysis: "" });
        setMessages([{ 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: `命盘已按最新生辰信息重绘。阁下若需窥探乾坤造化，请点选下方 **“专业详盘”**。`,
          suggestions: ["请为我进行专业详盘分析"]
        }]);
      }
      // 关键修复：无论是否进行 AI 分析，计算完排盘后都切换回视图模式
      setViewMode('VIEW');
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `### 推演受阻\n${e.message}` }]);
    } finally {
      setLoading(false);
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (msg?: string, isPro = false, isDirect = false) => {
    const text = msg || inputMessage;
    if (!text.trim() || !chartData) return;

    if (messages.length <= 1 && isPro && text.includes("专业详盘")) {
      await handleStart(true);
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, isProfessional: isPro };
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, userMsg, { id: assistantMsgId, role: 'assistant', content: "", isProfessional: isPro }]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const baZiData = formatBaZiToText(chartData.chart, { dy: selectedDaYunIndex, ln: selectedLiuNianIndex });
      const context = messages.length > 0 ? messages[0].content : chartData.analysis;
      
      await chatWithContext([...messages, userMsg], context, baZiData, (chunk) => {
          setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.id === assistantMsgId) {
                  return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
              }
              return prev;
          });
          setChatLoading(false);
      });

      // After stream ends, extract suggestions
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.id === assistantMsgId) {
            const { content, suggestions } = extractSuggestions(last.content);
            return [...prev.slice(0, -1), { ...last, content, suggestions }];
        }
        return prev;
      });

    } catch (e) {
      setMessages(prev => [...prev.slice(0, -1), { id: assistantMsgId, role: 'assistant', content: "吾正在闭关，请稍后再试。" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const triggerDefaultQuestion = async (q: string) => {
      if (!chartData) await handleStart(false);
      handleSendMessage(q);
  };

  useEffect(() => {
    if (!chartData) handleStart(false);
  }, []);

  return (
    <BaZiContext.Provider value={{
      name, setName, gender, setGender, birthDate, setBirthDate, birthTime, setBirthTime,
      calendarType, setCalendarType, isLeapMonth, setIsLeapMonth,
      viewMode, setViewMode, chartDisplayMode, setChartDisplayMode, showFullDetails, setShowFullDetails,
      selectedDaYunIndex, setSelectedDaYunIndex, selectedLiuNianIndex, setSelectedLiuNianIndex, selectedLiuYueIndex, setSelectedLiuYueIndex,
      chartData, messages, loading, chatLoading, handleStart, handleSendMessage, inputMessage, setInputMessage, triggerDefaultQuestion
    }}>
      {children}
    </BaZiContext.Provider>
  );
};

export const useBaZi = () => {
  const context = useContext(BaZiContext);
  if (!context) throw new Error('useBaZi error');
  return context;
};
