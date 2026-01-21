
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BaZiResponse, Gender, ChatMessage, UserProfile, BaZiChart, CalendarType, HePanResponse } from '../types';
import { analyzeBaZi, chatWithContext, formatBaZiToText, extractSuggestions, analyzeHePan } from '../services/aiService';
import { calculateLocalBaZi } from '../services/geminiService';
import { Lunar, Solar } from 'lunar-javascript';

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
  viewMode: 'EDIT' | 'VIEW' | 'HEPAN';
  setViewMode: (v: 'EDIT' | 'VIEW' | 'HEPAN') => void;
  editTab: 'BASIC' | 'ROSTER';
  setEditTab: (t: 'BASIC' | 'ROSTER') => void;
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
  hePanData: HePanResponse | null;
  messages: ChatMessage[];
  loading: boolean;
  chatLoading: boolean;
  handleStart: (withAnalysis: boolean) => Promise<void>;
  handleSendMessage: (msg?: string, isPro?: boolean, isDirect?: boolean) => Promise<void>;
  inputMessage: string;
  setInputMessage: (m: string) => void;
  triggerDefaultQuestion: (q: string) => Promise<void>;
  roster: UserProfile[];
  saveToRoster: (profile: UserProfile) => void;
  deleteFromRoster: (id: string) => void;
  performHePan: (p1: UserProfile, p2: UserProfile, withAnalysis?: boolean) => Promise<void>;
}

const BaZiContext = createContext<BaZiContextType | undefined>(undefined);

export const BaZiProvider: React.FC<{ userProfile: UserProfile; children: ReactNode }> = ({ userProfile, children }) => {
  const [name, setName] = useState(userProfile.name);
  const [gender, setGender] = useState(userProfile.gender);
  const [birthDate, setBirthDate] = useState(userProfile.birthDate);
  const [birthTime, setBirthTime] = useState(userProfile.birthTime);
  const [calendarType, setCalendarType] = useState<CalendarType>(userProfile.calendarType || CalendarType.SOLAR);
  const [isLeapMonth, setIsLeapMonth] = useState<boolean>(userProfile.isLeapMonth || false);
  const [viewMode, setViewMode] = useState<'EDIT' | 'VIEW' | 'HEPAN'>('VIEW');
  const [editTab, setEditTab] = useState<'BASIC' | 'ROSTER'>('BASIC');
  const [chartDisplayMode, setChartDisplayMode] = useState<'COLLAPSED' | 'EXPANDED'>('EXPANDED');
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  const [selectedDaYunIndex, setSelectedDaYunIndex] = useState(0);
  const [selectedLiuNianIndex, setSelectedLiuNianIndex] = useState(0);
  const [selectedLiuYueIndex, setSelectedLiuYueIndex] = useState(0);

  const [chartData, setChartData] = useState<BaZiResponse | null>(null);
  const [hePanData, setHePanData] = useState<HePanResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState('');

  const [roster, setRoster] = useState<UserProfile[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('bazi_roster');
    if (saved) {
      try { setRoster(JSON.parse(saved)); } catch (e) {}
    } else {
        const initial = { ...userProfile, id: Date.now().toString() };
        setRoster([initial]);
        localStorage.setItem('bazi_roster', JSON.stringify([initial]));
    }
  }, []);

  const saveToRoster = (profile: UserProfile) => {
    setRoster(prev => {
      const exists = prev.find(p => p.name === profile.name && p.birthDate === profile.birthDate);
      if (exists) return prev;
      const newList = [{ ...profile, id: profile.id || Date.now().toString() }, ...prev];
      localStorage.setItem('bazi_roster', JSON.stringify(newList));
      return newList;
    });
  };

  const deleteFromRoster = (id: string) => {
      setRoster(prev => {
          const newList = prev.filter(p => p.id !== id);
          localStorage.setItem('bazi_roster', JSON.stringify(newList));
          return newList;
      });
  };

  const autoLocateIndices = (chart: BaZiChart) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentLunar = Lunar.fromDate(now);
    // Correctly get the year's GanZhi reflecting the Solar Terms (Li Chun)
    const currentYearGanZhi = currentLunar.getYearInGanZhi();
    const currentLunarMonth = currentLunar.getMonth(); 

    let dyIdx = 0;
    let lnIdx = 0;
    let lyIdx = 0;

    const foundDyIdx = chart.daYun.findIndex(dy => currentYear >= dy.startYear && currentYear <= dy.endYear);
    if (foundDyIdx !== -1) {
      dyIdx = foundDyIdx;
      // Precision matching using GanZhi instead of Gregorian year number
      const foundLnIdx = chart.daYun[foundDyIdx].liuNian.findIndex(ln => ln.ganZhi === currentYearGanZhi);
      if (foundLnIdx !== -1) {
        lnIdx = foundLnIdx;
        const currentMonthName = (currentLunarMonth < 0 ? "闰" : "") + Math.abs(currentLunarMonth) + "月";
        const foundLyIdx = chart.daYun[foundDyIdx].liuNian[foundLnIdx].liuYue.findIndex(ly => ly.month === currentMonthName);
        if (foundLyIdx !== -1) {
          lyIdx = foundLyIdx;
        } else {
            lyIdx = Math.min(Math.abs(currentLunarMonth) - 1, chart.daYun[foundDyIdx].liuNian[foundLnIdx].liuYue.length - 1);
        }
      } else {
          // Fallback to year matching if GanZhi lookup fails for some reason
          const fallbackLnIdx = chart.daYun[foundDyIdx].liuNian.findIndex(ln => ln.year === currentYear);
          if (fallbackLnIdx !== -1) lnIdx = fallbackLnIdx;
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
      autoLocateIndices(chart);
      
      const profile: UserProfile = { name, gender, birthDate, birthTime, calendarType, isLeapMonth, birthPlace: '北京' };
      saveToRoster(profile);

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
        setHePanData(null);
        setMessages([{ 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: `命盘已依照阁下生辰之数起就。若需深入剖析格局气象、推演岁运吉凶，请点击下方「专业详盘分析」。`,
          suggestions: ["开始专业详盘分析"]
        }]);
      }
      setViewMode('VIEW');
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `### 推演受阻\n${e.message}` }]);
    } finally {
      setLoading(false);
      setChatLoading(false);
    }
  };

  const performHePan = async (p1: UserProfile, p2: UserProfile, withAnalysis: boolean = false) => {
      if (withAnalysis) setChatLoading(true);
      else setLoading(true);
      
      try {
          const chart1 = calculateLocalBaZi(p1.name, p1.birthDate, p1.birthTime, p1.gender, p1.calendarType, p1.isLeapMonth);
          const chart2 = calculateLocalBaZi(p2.name, p2.birthDate, p2.birthTime, p2.gender, p2.calendarType, p2.isLeapMonth);

          if (withAnalysis) {
              const assistantMsgId = Date.now().toString();
              setMessages([{ id: assistantMsgId, role: 'assistant', content: "" }]);
              const res = await analyzeHePan(p1, p2, (chunk) => {
                  setMessages(prev => {
                      const last = prev[prev.length - 1];
                      if (last && last.id === assistantMsgId) {
                          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
                      }
                      return prev;
                  });
                  setChatLoading(false);
              });
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.id === assistantMsgId) {
                    const { content, suggestions } = extractSuggestions(last.content);
                    return [...prev.slice(0, -1), { ...last, content, suggestions }];
                }
                return prev;
              });
              setHePanData(res);
          } else {
              setChartData(null);
              setHePanData({ chart1, chart2, profile1: p1, profile2: p2, analysis: "" });
              setMessages([{ 
                id: Date.now().toString(), 
                role: 'assistant', 
                content: `合盘已毕，两位缘主之气数已然交感。若需深度推演宿世因缘、磁场契合及岁运共振，请开启「专业合盘分析」。`,
                suggestions: ["开始专业合盘分析"]
              }]);
          }
          setViewMode('VIEW');
      } catch (e: any) {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `### 合盘受阻\n${e.message}` }]);
      } finally {
          setLoading(false);
          setChatLoading(false);
      }
  };

  const handleSendMessage = async (msg?: string, isPro = false, isDirect = false) => {
    const text = msg || inputMessage;
    if (!text.trim() || (!chartData && !hePanData)) return;

    // Handle initial professional trigger messages
    if (messages.length === 1 && isPro) {
      if (text.includes("专业详盘") || text.includes("详盘分析")) {
        await handleStart(true);
        return;
      }
      if (text.includes("专业合盘") && hePanData) {
        await performHePan(hePanData.profile1, hePanData.profile2, true);
        return;
      }
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, isProfessional: isPro };
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, userMsg, { id: assistantMsgId, role: 'assistant', content: "", isProfessional: isPro }]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const baZiData = hePanData 
          ? `合盘推演：缘主一(${hePanData.profile1.name}) 缘主二(${hePanData.profile2.name})`
          : formatBaZiToText(chartData!.chart, gender, { dy: selectedDaYunIndex, ln: selectedLiuNianIndex, lm: selectedLiuYueIndex });
      
      const context = messages.length > 0 ? messages[0].content : (hePanData ? hePanData.analysis : chartData!.analysis);
      
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
      if (!chartData && !hePanData) await handleStart(false);
      setInputMessage(q);
  };

  useEffect(() => {
    if (!chartData && !hePanData) handleStart(false);
  }, []);

  return (
    <BaZiContext.Provider value={{
      name, setName, gender, setGender, birthDate, setBirthDate, birthTime, setBirthTime,
      calendarType, setCalendarType, isLeapMonth, setIsLeapMonth,
      viewMode, setViewMode, editTab, setEditTab, chartDisplayMode, setChartDisplayMode, showFullDetails, setShowFullDetails,
      selectedDaYunIndex, setSelectedDaYunIndex, selectedLiuNianIndex, setSelectedLiuNianIndex, selectedLiuYueIndex, setSelectedLiuYueIndex,
      chartData, hePanData, messages, loading, chatLoading, handleStart, handleSendMessage, inputMessage, setInputMessage, triggerDefaultQuestion,
      roster, saveToRoster, deleteFromRoster, performHePan
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
