
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HexagramLine, CoinSide, LiuYaoResponse, ChatMessage, LiuYaoHistoryRecord, YaoType, InputMode, UserProfile } from '../types';
import { interpretLiuYao, chatWithContext } from '../services/aiService';
import { Lunar } from 'lunar-javascript';

interface LiuYaoContextType {
  mode: InputMode;
  setMode: (m: InputMode) => void;
  question: string;
  setQuestion: (q: string) => void;
  shakeError: boolean;
  setShakeError: (b: boolean) => void;
  shakeLines: HexagramLine[];
  setShakeLines: React.Dispatch<React.SetStateAction<HexagramLine[]>>;
  shakeStep: number;
  setShakeStep: (s: number) => void;
  coins: CoinSide[];
  isFlipping: boolean;
  manualLines: HexagramLine[];
  numberStep: number;
  setNumberStep: React.Dispatch<React.SetStateAction<number>>;
  numberResults: number[];
  setNumberResults: (r: number[]) => void;
  isSplitting: boolean;
  setIsSplitting: (s: boolean) => void;
  messages: ChatMessage[];
  result: LiuYaoResponse | null;
  showChat: boolean;
  isAnalyzing: boolean;
  inputMessage: string;
  setInputMessage: (m: string) => void;
  history: LiuYaoHistoryRecord[];
  showHistoryModal: boolean;
  setShowHistoryModal: (b: boolean) => void;
  handleToss: () => void;
  handleTimeStart: () => void;
  handleAnalyze: () => Promise<void>;
  handleSendMessage: (msg?: string) => Promise<void>;
  reset: () => void;
  updateManualLine: (pos: number, val: number) => void;
  restoreRecord: (r: LiuYaoHistoryRecord) => void;
  clearHistory: () => void;
}

const LiuYaoContext = createContext<LiuYaoContextType | undefined>(undefined);

const INITIAL_MANUAL_LINES: HexagramLine[] = [
  { position: 1, value: 8 },
  { position: 2, value: 8 },
  { position: 3, value: 8 },
  { position: 4, value: 8 },
  { position: 5, value: 8 },
  { position: 6, value: 8 },
];

// LiuYaoProvider manages the state and logic for various divination methods (coins, time, stalks)
export const LiuYaoProvider: React.FC<{ userProfile: UserProfile; children: ReactNode }> = ({ userProfile, children }) => {
  const [mode, setMode] = useState<InputMode>('SHAKE');
  const [question, setQuestion] = useState('');
  const [shakeError, setShakeError] = useState(false);
  const [shakeLines, setShakeLines] = useState<HexagramLine[]>([]);
  const [shakeStep, setShakeStep] = useState(0);
  const [coins, setCoins] = useState<CoinSide[]>([CoinSide.HEAD, CoinSide.HEAD, CoinSide.HEAD]);
  const [isFlipping, setIsFlipping] = useState(false);
  const [manualLines, setManualLines] = useState<HexagramLine[]>(INITIAL_MANUAL_LINES);
  
  const [numberStep, setNumberStep] = useState(0);
  const [numberResults, setNumberResults] = useState<number[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [result, setResult] = useState<LiuYaoResponse | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [history, setHistory] = useState<LiuYaoHistoryRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('liuyao_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load LiuYao history", e);
      }
    }
  }, []);

  // handleToss simulates coin tossing for SHAKE mode
  const handleToss = () => {
    if (shakeStep >= 6 || isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      const newCoins = [0, 0, 0].map(() => Math.random() > 0.5 ? CoinSide.HEAD : CoinSide.TAIL);
      setCoins(newCoins);
      const sum = newCoins.reduce((a, b) => a + b, 0);
      let value: number;
      if (sum === 6) value = 6; // 3 tails: Old Yin
      else if (sum === 7) value = 7; // 2 tails, 1 head: Young Yang
      else if (sum === 8) value = 8; // 1 tail, 2 heads: Young Yin
      else value = 9; // 3 heads: Old Yang

      setShakeLines(prev => [...prev, { position: shakeStep + 1, value }]);
      setShakeStep(prev => prev + 1);
      setIsFlipping(false);
    }, 600);
  };

  // handleTimeStart generates a hexagram based on current time
  const handleTimeStart = () => {
    const lines: HexagramLine[] = [1, 2, 3, 4, 5, 6].map(pos => ({
        position: pos,
        value: Math.random() > 0.5 ? 7 : 8
    }));
    setShakeLines(lines);
    setShakeStep(6);
  };

  // handleAnalyze sends the generated hexagram to the AI for interpretation
  const handleAnalyze = async () => {
    if (!question.trim()) { 
      setShakeError(true); 
      return; 
    }
    setIsAnalyzing(true);
    setShowChat(true);
    try {
      const currentLines = mode === 'MANUAL' ? manualLines : shakeLines;
      const res = await interpretLiuYao(currentLines, question, userProfile);
      setResult(res);
      setMessages([{ id: Date.now().toString(), role: 'assistant', content: res.analysis }]);
      
      const record: LiuYaoHistoryRecord = {
        id: Date.now().toString(),
        question,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('zh-CN'),
        result: res
      };
      const newHistory = [record, ...history];
      setHistory(newHistory);
      localStorage.setItem('liuyao_history', JSON.stringify(newHistory));
    } catch (e) {
      console.error("LiuYao Analysis Error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // handleSendMessage handles user chat interactions for LiuYao results
  const handleSendMessage = async (msg?: string) => {
    const text = msg || inputMessage;
    if (!text.trim() || !result) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsAnalyzing(true);

    try {
      const res = await chatWithContext([...messages, userMsg], result.analysis);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: res }]);
    } catch (e) {
      console.error("LiuYao Chat Error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setShakeLines([]);
    setShakeStep(0);
    setNumberStep(0);
    setNumberResults([]);
    setResult(null);
    setMessages([]);
    setShowChat(false);
    setManualLines(INITIAL_MANUAL_LINES);
  };

  const updateManualLine = (pos: number, val: number) => {
    setManualLines(prev => prev.map((l, i) => i === pos ? { ...l, value: val } : l));
  };

  const restoreRecord = (record: LiuYaoHistoryRecord) => {
    setResult(record.result);
    setQuestion(record.question);
    setMessages([{ id: Date.now().toString(), role: 'assistant', content: record.result.analysis }]);
    setShowChat(true);
    setShowHistoryModal(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('liuyao_history');
  };

  return (
    <LiuYaoContext.Provider value={{
      mode, setMode, question, setQuestion, shakeError, setShakeError,
      shakeLines, setShakeLines, shakeStep, setShakeStep, coins, isFlipping,
      manualLines, numberStep, setNumberStep, numberResults, setNumberResults,
      isSplitting, setIsSplitting, messages, result, showChat, isAnalyzing,
      inputMessage, setInputMessage, history, showHistoryModal, setShowHistoryModal,
      handleToss, handleTimeStart, handleAnalyze, handleSendMessage, reset,
      updateManualLine, restoreRecord, clearHistory
    }}>
      {children}
    </LiuYaoContext.Provider>
  );
};

// useLiuYao is the hook for components to access LiuYao state
export const useLiuYao = () => {
  const context = useContext(LiuYaoContext);
  if (!context) {
    throw new Error('useLiuYao must be used within a LiuYaoProvider');
  }
  return context;
};
