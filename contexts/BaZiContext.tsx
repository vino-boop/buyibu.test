import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BaZiResponse, Gender, ChatMessage, UserProfile } from '../types';
import { analyzeBaZi, chatWithContext, formatBaZiToText } from '../services/aiService';
import { calculateLocalBaZi } from '../services/geminiService';

interface BaZiContextType {
  name: string;
  setName: (n: string) => void;
  gender: Gender;
  setGender: (g: Gender) => void;
  birthDate: string;
  setBirthDate: (d: string) => void;
  birthTime: string;
  setBirthTime: (t: string) => void;
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

// Fix: Import React to resolve "Cannot find namespace 'React'" when using React.FC
export const BaZiProvider: React.FC<{ userProfile: UserProfile; children: ReactNode }> = ({ userProfile, children }) => {
  const [name, setName] = useState(userProfile.name);
  const [gender, setGender] = useState(userProfile.gender);
  const [birthDate, setBirthDate] = useState(userProfile.birthDate);
  const [birthTime, setBirthTime] = useState(userProfile.birthTime);
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

  const handleStart = async (withAnalysis: boolean) => {
    if (withAnalysis) {
      setChatLoading(true);
    } else {
      setLoading(true);
    }

    try {
      const chart = calculateLocalBaZi(name, birthDate, birthTime, gender);
      if (withAnalysis) {
        const res = await analyzeBaZi(name, birthDate, birthTime, gender, '北京');
        setChartData(res);
        setMessages([{ id: Date.now().toString(), role: 'assistant', content: res.analysis }]);
        setViewMode('VIEW');
      } else {
        setChartData({ chart, analysis: "" });
        setMessages([{ 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: `命盘已现。阁下若需窥探乾坤造化，请点选下方 **“专业详盘”**。` 
        }]);
      }
    } catch (e) {
      console.error("BaZi Start Error:", e);
    } finally {
      setLoading(false);
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (msg?: string, isPro = false, isDirect = false) => {
    const text = msg || inputMessage;
    if (!text.trim() || !chartData) return;

    if (messages.length <= 1 && isPro) {
      await handleStart(true);
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, isProfessional: isPro };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setChatLoading(true);

    try {
      // 核心修改：在对话时注入当前选中的大运和流年
      const baZiData = formatBaZiToText(chartData.chart, { 
          dy: selectedDaYunIndex, 
          ln: selectedLiuNianIndex 
      });
      const context = messages.length > 0 ? messages[0].content : chartData.analysis;
      const res = await chatWithContext([...messages, userMsg], context, baZiData);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: res, isProfessional: isPro }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "推演受阻，机缘未至。" }]);
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