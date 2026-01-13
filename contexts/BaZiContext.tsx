
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BaZiResponse, Gender, ChatMessage, UserProfile } from '../types';
import { analyzeBaZi, chatWithContext } from '../services/aiService';
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
  handleStart: (isInitial: boolean) => Promise<void>;
  handleSendMessage: (msg?: string, isPro?: boolean, isDirect?: boolean) => Promise<void>;
  inputMessage: string;
  setInputMessage: (m: string) => void;
  triggerDefaultQuestion: (q: string) => Promise<void>;
}

const BaZiContext = createContext<BaZiContextType | undefined>(undefined);

// BaZiProvider manages the state and logic for BaZi calculation and AI analysis
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

  // handleStart triggers the initial or re-calculation of the BaZi chart and its AI analysis
  const handleStart = async (isInitial: boolean) => {
    setLoading(true);
    try {
      const res = await analyzeBaZi(name, birthDate, birthTime, gender, '北京');
      setChartData(res);
      setMessages([{ id: Date.now().toString(), role: 'assistant', content: res.analysis }]);
      if (!isInitial) setViewMode('VIEW');
    } catch (e) {
      console.error("BaZi Start Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // handleSendMessage handles user chat interactions with the AI master
  const handleSendMessage = async (msg?: string, isPro = false, isDirect = false) => {
    const text = msg || inputMessage;
    if (!text.trim() || !chartData) return;

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: text, 
      isProfessional: isPro 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const res = await chatWithContext([...messages, userMsg], chartData.analysis);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: res, 
        isProfessional: isPro 
      }]);
    } catch (e) {
      console.error("BaZi Chat Error:", e);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "大师推演受阻，请稍后再试。" 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // triggerDefaultQuestion handles pre-defined questions from the UI
  const triggerDefaultQuestion = async (q: string) => {
      let currentChart = chartData;
      if (!currentChart) {
          setLoading(true);
          try {
              currentChart = await analyzeBaZi(name, birthDate, birthTime, gender, '北京');
              setChartData(currentChart);
              setMessages([{ id: Date.now().toString(), role: 'assistant', content: currentChart.analysis }]);
          } catch (e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      }
      if (currentChart) {
          handleSendMessage(q);
      }
  };

  useEffect(() => {
    if (!chartData) {
      handleStart(true);
    }
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

// useBaZi is the hook for components to access BaZi state
export const useBaZi = () => {
  const context = useContext(BaZiContext);
  if (!context) {
    throw new Error('useBaZi must be used within a BaZiProvider');
  }
  return context;
};
