
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { CoinSide, InputMode, HexagramLine } from '../types';
import { HexagramVisual } from '../components/HexagramVisual';
import { useAssets } from '../contexts/AssetContext';
import { Lunar } from 'lunar-javascript';
import { useLiuYao } from '../contexts/LiuYaoContext';
import { IconHistory, IconEdit, IconScroll, IconChat } from '../components/MysticIcons';

const HEXAGRAM_DATA: Record<string, { name: string; symbol: string; judgment: string }> = {
  "111111": { name: "乾为天", symbol: "䷀", judgment: "元亨，利贞。" },
  "000000": { name: "坤为地", symbol: "䷁", judgment: "元亨，利牝马之贞。" },
  "100010": { name: "水雷屯", symbol: "䷂", judgment: "元亨，利贞。勿用有攸往，利建侯。" },
  "010001": { name: "山水蒙", symbol: "䷃", judgment: "亨。匪我求童蒙，蒙求我。" },
  "111010": { name: "水天需", symbol: "䷄", judgment: "有孚，光亨，贞吉. 利涉大川。" },
  "010111": { name: "天水讼", symbol: "䷅", judgment: "有孚，窒惕，中吉。终凶。利见大人，不利涉大川。" },
  "010000": { name: "地水师", symbol: "䷆", judgment: "贞，丈人，吉，无咎。" },
  "000010": { name: "水地比", symbol: "䷇", judgment: "吉。原筮，元永贞，无咎. 不宁方来，后夫凶。" },
  "111011": { name: "风天小畜", symbol: "䷈", judgment: "亨。密云不雨，自我西郊。" },
  "110111": { name: "天泽履", symbol: "䷉", judgment: "履虎尾，不咥人，亨。" },
  "111000": { name: "地天泰", symbol: "䷊", judgment: "小往大来，吉亨。" },
  "000111": { name: "天地否", symbol: "䷋", judgment: "否之匪人，不利君子贞，大往小来。" },
  "101111": { name: "天火同人", symbol: "䷌", judgment: "同人于野，亨。利涉大川，利君子贞。" },
  "111101": { name: "火天大有", symbol: "䷍", judgment: "元亨。" },
  "001000": { name: "地山谦", symbol: "䷎", judgment: "亨，君子有终。" },
  "000100": { name: "雷地豫", symbol: "䷏", judgment: "利建侯行师。" },
  "100110": { name: "泽雷随", symbol: "䷐", judgment: "元亨，利贞，无咎。" },
  "011001": { name: "山风蛊", symbol: "䷑", judgment: "元亨，利涉大川。先甲三日，后甲三日。" },
  "110000": { name: "地泽临", symbol: "䷒", judgment: "元亨，利贞。至于八月有凶。" },
  "000011": { name: "风地观", symbol: "䷓", judgment: "盥而不荐，有孚颙若。" },
  "100101": { name: "火雷噬嗑", symbol: "䷔", judgment: "亨。利用狱。" },
  "101001": { name: "山火贲", symbol: "䷕", judgment: "亨。小利有攸往。" },
  "000001": { name: "山地剥", symbol: "䷖", judgment: "不利有攸往。" },
  "100000": { name: "地雷复", symbol: "䷗", judgment: "亨. 出入无疾，朋来无咎。" },
  "100111": { name: "天雷无妄", symbol: "䷘", judgment: "元亨，利贞。其匪正有，不利有攸往。" },
  "111001": { name: "山天大畜", symbol: "䷙", judgment: "利贞. 不家食，吉. 利涉大川。" },
  "100001": { name: "山雷颐", symbol: "䷚", judgment: "贞吉。观颐，自求口实。" },
  "011110": { name: "泽风大过", symbol: "䷛", judgment: "栋桡，利有攸往，亨。" },
  "010010": { name: "坎为水", symbol: "䷜", judgment: "习坎，有孚，维心亨，行有尚。" },
  "101101": { name: "离为火", symbol: "䷝", judgment: "利贞，亨。畜牝牛，吉。" },
  "001110": { name: "泽山咸", symbol: "䷞", judgment: "亨，利贞，取女吉。" },
  "011100": { name: "雷风恒", symbol: "䷟", judgment: "亨，无咎，利贞. 利有攸往。" },
  "001111": { name: "天山遁", symbol: "䷠", judgment: "亨，小利贞。" },
  "111100": { name: "雷天大壮", symbol: "䷡", judgment: "利贞。" },
  "000101": { name: "火地晋", symbol: "䷢", judgment: "康侯用锡马蕃庶，昼日三接。" },
  "101000": { name: "地火明夷", symbol: "䷣", judgment: "利艰贞。" },
  "101011": { name: "风火家人", symbol: "䷤", judgment: "利女贞。" },
  "110101": { name: "火泽睽", symbol: "䷥", judgment: "小事吉。" },
  "001010": { name: "水山蹇", symbol: "䷦", judgment: "利西南，不利东北；利见大人，贞吉。" },
  "010100": { name: "雷水解", symbol: "䷧", judgment: "利西南. 无所往，其来复吉。有攸往，夙吉。" },
  "110001": { name: "山泽损", symbol: "䷨", judgment: "有孚，元吉，无咎，可贞，利有攸往。" },
  "100011": { name: "风雷益", symbol: "䷩", judgment: "利有攸往，利涉大川。" },
  "111110": { name: "泽天夬", symbol: "䷪", judgment: "扬于王庭，孚号，有厉.告自邑，不利即戎. 利有攸往。" },
  "011111": { name: "天风姤", symbol: "䷫", judgment: "女壮，勿用取女。" },
  "000110": { name: "泽地萃", symbol: "䷬", judgment: "亨. 王假有庙，利见大人，亨，利贞。" },
  "011000": { name: "地风升", symbol: "䷭", judgment: "元亨，用见大人，勿恤，南征吉。" },
  "010110": { name: "泽水困", symbol: "䷮", judgment: "亨，贞，大人吉，无咎. 有言不信。" },
  "011010": { name: "水风井", symbol: "䷯", judgment: "改邑不改井，无丧无得. 往来井井。" },
  "101110": { name: "泽火革", symbol: "䷰", judgment: "巳日乃孚，元亨利贞，悔亡。" },
  "011101": { name: "火风鼎", symbol: "䷱", judgment: "元吉，亨。" },
  "100100": { name: "震为雷", symbol: "䷲", judgment: "亨. 震来虩虩，笑言哑哑. 震惊百里，不丧匕鬯。" },
  "001001": { name: "艮为山", symbol: "䷳", judgment: "艮其背，不获其身，行其庭，不建其人，无咎。" },
  "001011": { name: "风山渐", symbol: "䷴", judgment: "女归吉，利贞。" },
  "110100": { name: "雷泽归妹", symbol: "䷵", judgment: "征凶，无攸利。" },
  "101100": { name: "雷火丰", symbol: "䷶", judgment: "亨，王假之，勿忧，宜日中。" },
  "001101": { name: "火山旅", symbol: "䷷", judgment: "小亨，旅贞吉。" },
  "011011": { name: "巽为风", symbol: "䷸", judgment: "小亨，利攸往，利见大人。" },
  "110110": { name: "兑为泽", symbol: "䷹", judgment: "亨，利贞。" },
  "010011": { name: "风水涣", symbol: "䷺", judgment: "亨. 王假有庙，利涉大川，利贞。" },
  "110010": { name: "水泽节", symbol: "䷻", judgment: "亨. 苦节，不可贞。" },
  "110011": { name: "风泽中孚", symbol: "䷼", judgment: "豚鱼吉，利涉大川，利贞。" },
  "001100": { name: "雷山小过", symbol: "䷽", judgment: "亨，利贞. 可小事，不可大事。" },
  "101010": { name: "水火既济", symbol: "䷾", judgment: "亨，小利贞，初吉终乱。" },
  "010101": { name: "火水未济", symbol: "䷿", judgment: "亨，小狐汔济，濡其尾，无攸利。" },
};

const YAO_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
const TRIGRAMS: Record<number, number[]> = {
  1: [1, 1, 1], // 乾
  2: [1, 1, 0], // 兑
  3: [1, 0, 1], // 离
  4: [1, 0, 0], // 震
  5: [0, 1, 1], // 巽
  6: [0, 1, 0], // 坎
  7: [0, 0, 1], // 艮
  8: [0, 0, 0]  // 坤
};

const renderMessageContent = (content: string, isDay: boolean) => {
  if (!content) return null;
  const lines = content.split('\n');
  return lines.map((line, lineIdx) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return <div key={lineIdx} className="h-2" />;
    if (trimmedLine.startsWith('###')) {
      const headerText = trimmedLine.replace(/^###\s*/, '');
      return <h3 key={lineIdx} className="font-bold block mt-6 mb-2 text-base border-l-[3px] border-mystic-gold pl-3 text-mystic-gold">{headerText}</h3>;
    }
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={lineIdx} className="mb-1.5">
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={partIdx} className="text-mystic-gold font-bold underline underline-offset-4 decoration-mystic-gold/30">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </div>
    );
  });
};

const InteractiveStalksFan: React.FC<{ 
    splitIndex: number; 
    setSplitIndex: (i: number) => void;
    isSplitting: boolean;
    isDay: boolean;
    onConfirm: () => void;
    step: number;
}> = ({ splitIndex, setSplitIndex, isSplitting, isDay, onConfirm, step }) => {
    const total = 49;
    const radius = 280;
    const [startX, setStartX] = useState<number | null>(null);
    const [initialIndex, setInitialIndex] = useState(splitIndex);

    const handleStart = (clientX: number) => {
        setStartX(clientX);
        setInitialIndex(splitIndex);
    };

    const handleMove = (clientX: number) => {
        if (startX === null || isSplitting) return;
        const deltaX = clientX - startX;
        const sensitivity = 22; 
        const indexChange = Math.floor(deltaX / sensitivity);
        const nextIndex = Math.max(1, Math.min(total - 1, initialIndex + indexChange));
        if (nextIndex !== splitIndex) {
            setSplitIndex(nextIndex);
        }
    };

    const handleEnd = () => {
        setStartX(null);
    };

    const visibleRange = 4; 
    const startIndex = Math.max(0, splitIndex - visibleRange);
    const endIndex = Math.min(total - 1, splitIndex + visibleRange);

    return (
        <div className="relative w-full h-[380px] flex flex-col items-center justify-start mt-2 select-none touch-none overflow-hidden">
            <div 
                className="relative w-full h-[260px] flex items-center justify-center cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleStart(e.clientX)}
                onMouseMove={(e) => handleMove(e.clientX)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={(e) => handleStart(e.touches[0].clientX)}
                onTouchMove={(e) => handleMove(e.touches[0].clientX)}
                onTouchEnd={handleEnd}
            >
                <div className="absolute w-[360px] h-[360px] border border-mystic-gold/5 rounded-full bottom-[-180px] pointer-events-none opacity-10"></div>
                {Array.from({ length: total }).map((_, i) => {
                    const isVisible = i >= startIndex && i <= endIndex;
                    if (!isVisible) return null;
                    const relativePos = i - splitIndex; 
                    const baseAngle = relativePos * 4.5; 
                    let splitOffset = isSplitting ? (relativePos < 0 ? -15 : 15) : 0;
                    const angle = baseAngle + splitOffset;
                    const rad = (angle * Math.PI) / 180;
                    const x = Math.sin(rad) * radius;
                    const y = radius - Math.cos(rad) * radius;
                    const isCenterGap = relativePos === 0 || relativePos === -1;
                    const opacity = 1 - Math.abs(relativePos) * 0.18;
                    const scale = 1 - Math.abs(relativePos) * 0.04;
                    return (
                        <div 
                            key={i}
                            className={`absolute w-[2.2px] h-48 origin-bottom transition-all duration-500 ease-out pointer-events-none ${isCenterGap ? 'bg-mystic-gold shadow-[0_0_12px_rgba(197,176,120,0.4)]' : 'bg-mystic-gold/30'}`}
                            style={{
                                transform: `translateX(${x}px) translateY(${y}px) rotate(${angle}deg) scaleY(${scale})`,
                                opacity: opacity,
                                zIndex: 10 - Math.abs(relativePos)
                            }}
                        >
                            <div className="w-full h-1/6 bg-white/15 absolute top-8"></div>
                        </div>
                    );
                })}
                <div className="absolute bottom-6 w-[1px] h-60 bg-gradient-to-t from-transparent via-mystic-gold/25 to-transparent pointer-events-none"></div>
                {!isSplitting && step < 3 && (
                    <div className="absolute bottom-20 text-[10px] text-mystic-gold/20 tracking-[0.5em] animate-pulse uppercase font-serif">
                        拨草觅机
                    </div>
                )}
            </div>
            <div className="w-full max-w-[260px] mt-8 flex flex-col items-center">
                {!isSplitting && step < 3 && (
                    <button 
                        onClick={onConfirm}
                        className="w-full py-4 rounded-2xl bg-gradient-to-b from-mystic-gold to-[#a08d55] text-black font-bold text-xs tracking-[0.4em] shadow-[0_8px_20px_rgba(0,0,0,0.3)] active:scale-95 transition-all animate-fade-in"
                    >
                        {step === 0 ? '定 · 上卦' : step === 1 ? '定 · 下卦' : '定 · 动爻'}
                    </button>
                )}
            </div>
        </div>
    );
};

export const LiuYaoView: React.FC<{ isDayMode?: boolean }> = ({ isDayMode = false }) => {
  const {
      mode, setMode, question, setQuestion, shakeError, setShakeError, shakeLines, setShakeLines, shakeStep, setShakeStep, coins, isFlipping, manualLines, numberStep, setNumberStep, numberResults, setNumberResults, isSplitting, setIsSplitting, messages, result, showChat, isAnalyzing, inputMessage, setInputMessage, history, showHistoryModal, setShowHistoryModal, handleToss, handleTimeStart, handleAnalyze, handleSendMessage, reset: baseReset, updateManualLine, restoreRecord, clearHistory
  } = useLiuYao();
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const { assets } = useAssets();
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [lunarInfo, setLunarInfo] = useState({ year: '', month: '', day: '', time: '' });
  const [isNumberRitualStarted, setIsNumberRitualStarted] = useState(false);
  const [tempSplitIndex, setTempSplitIndex] = useState(24);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  
  useEffect(() => {
      if (mode === 'TIME') {
          const updateTime = () => {
              const now = new Date();
              setCurrentTimeStr(now.toLocaleString('zh-CN'));
              const d = Lunar.fromDate(now);
              setLunarInfo({ year: d.getYearInGanZhi() + '年', month: d.getMonthInGanZhi() + '月', day: d.getDayInGanZhi() + '日', time: d.getTimeZhi() + '时' });
          };
          updateTime();
          const timer = setInterval(updateTime, 1000);
          return () => clearInterval(timer);
      }
  }, [mode]);

  const handleScroll = () => {
    if (!isScrolling) setIsScrolling(true);
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 800);
  };

  const currentHexagramInfo = useMemo(() => {
     const lines = mode === 'MANUAL' ? manualLines : shakeLines;
     if (lines.length < 6) return null;
     let binaryStr = '';
     for (let i = 6; i >= 1; i--) {
        const line = lines.find(l => l.position === i);
        if (!line) return null;
        binaryStr += (line.value === 7 || line.value === 9) ? '1' : '0';
     }
     const info = HEXAGRAM_DATA[binaryStr];
     return info ? { ...info, binaryStr } : { name: '未知卦', symbol: '?', judgment: '', binaryStr };
  }, [shakeLines, manualLines, mode]);

  const reset = () => { 
    setIsNumberRitualStarted(false); 
    setTempSplitIndex(24); 
    baseReset(); 
  };

  const confirmNumberSplit = () => {
      if (isSplitting || numberStep >= 3) return;
      setIsSplitting(true);
      const currentPos = tempSplitIndex;
      setTimeout(() => {
          const stepValue = (numberStep < 2) ? (currentPos % 8 || 8) : (currentPos % 6 || 6);
          const newResults = [...numberResults, stepValue];
          setNumberResults(newResults);
          setShakeLines(prev => {
              const nextLines = [...prev];
              if (numberStep === 0) { TRIGRAMS[stepValue].forEach((val, i) => nextLines.push({ value: val === 1 ? 7 : 8, position: i + 4 })); } 
              else if (numberStep === 1) { TRIGRAMS[stepValue].forEach((val, i) => nextLines.push({ value: val === 1 ? 7 : 8, position: i + 1 })); } 
              else if (numberStep === 2) { const targetLine = nextLines.find(l => l.position === stepValue); if (targetLine) targetLine.value = targetLine.value === 7 ? 9 : 6; }
              return nextLines;
          });
          setTempSplitIndex(24); setNumberStep(prev => prev + 1); setIsSplitting(false);
          if (newResults.length === 3) setShakeStep(6);
      }, 1200);
  };

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
  const suggestions = lastAssistantMessage?.suggestions || [];

  const isRitualActive = (mode === 'SHAKE' && (shakeStep > 0 || isFlipping)) || (mode === 'TIME' && shakeLines.length > 0) || (mode === 'NUMBER' && isNumberRitualStarted) || (mode === 'MANUAL' && manualLines.some(l => l.value !== 8));

  const validateAndStartAnalyze = () => {
    if (!question.trim()) {
        setShakeError(true);
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    handleAnalyze();
  };

  if (showChat) {
    const currentLines = mode === 'MANUAL' ? manualLines : shakeLines;
    const activeHexagram = result || (currentHexagramInfo ? { hexagramName: currentHexagramInfo.name, hexagramSymbol: currentHexagramInfo.symbol, analysis: '', judgment: currentHexagramInfo.judgment } : null);
    return (
      <div className={`w-full h-full relative transition-colors duration-300 overflow-hidden ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-mystic-dark'}`}>
        <div className="absolute top-0 left-0 w-full p-4 z-40">
           <div className={`rounded-xl p-4 shadow-xl relative overflow-hidden flex items-center gap-5 border transition-colors backdrop-blur-md ${isDayMode ? 'bg-white/80 border-gray-100' : 'bg-[#2a2b2e]/90 border-white/5'}`}>
              {activeHexagram ? (
                <>
                  <div className={`shrink-0 w-14 flex justify-center py-1 rounded-lg border transition-colors ${isDayMode ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                      <HexagramVisual lines={currentLines} activeStep={6} variant="compact" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <div className="flex items-center gap-2 mb-1">
                         <h2 className={`text-xl font-serif font-bold leading-none ${isDayMode ? 'text-gray-900' : 'text-[#e2e8f0]'}`}>{activeHexagram.hexagramName}</h2>
                         <span className={`text-xs px-1.5 py-0.5 rounded border ${isDayMode ? 'text-gray-400 bg-gray-50 border-gray-200' : 'text-gray-500 bg-white/5 border-white/5'}`}>{activeHexagram.hexagramSymbol}</span>
                     </div>
                     <div className={`text-sm leading-snug line-clamp-1 ${isDayMode ? 'text-gray-500' : 'text-[#94a3b8]'}`}>{isAnalyzing && !result ? <span className="animate-pulse text-[#e8cfa1]">{activeHexagram.judgment || "正在推演..."}</span> : (activeHexagram.judgment || "卦象解盘中...")}</div>
                  </div>
                  <button onClick={reset} className={`p-2 transition-colors ${isDayMode ? 'text-gray-400 hover:text-gray-800' : 'text-gray-600 hover:text-gray-300'}`}><span className="text-lg">↺</span></button>
                </>
              ) : <div className="w-full flex items-center justify-center text-gray-500 animate-pulse py-2">卦象生成中...</div>}
           </div>
        </div>
        <div 
          onScroll={handleScroll}
          className="h-full w-full overflow-y-auto p-4 space-y-4 scrollbar-hide pb-40 pt-28"
        >
           {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                 {msg.role === 'assistant' && <div className={`w-8 h-8 rounded-full border flex items-center justify-center mr-2 shrink-0 overflow-hidden ${isDayMode ? 'bg-white border-gray-100 shadow-sm' : 'bg-mystic-dark border-mystic-gold/30'}`}><img src={assets.sage_avatar} alt="Sage" className="w-full h-full object-cover" /></div>}
                 <div className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm border ${msg.role === 'user' ? 'bg-mystic-gold/10 text-mystic-gold rounded-br-sm border-mystic-gold/10' : 'bg-mystic-paper/80 text-gray-300 rounded-bl-sm border-white/10'}`}>{renderMessageContent(msg.content, isDayMode)}</div>
              </div>
           ))}
           {isAnalyzing && <div className="flex justify-start animate-fade-in-up"><div className={`w-8 h-8 rounded-full border flex items-center justify-center mr-2 ${isDayMode ? 'bg-white border-gray-100 shadow-sm' : 'bg-mystic-dark border-mystic-gold/30'}`}><span className="animate-spin text-mystic-gold">☯</span></div><div className={`px-4 py-3 rounded-2xl rounded-bl-sm border text-sm bg-mystic-paper/80 border-white/10 text-gray-400`}>推演中</div></div>}
           <div ref={chatEndRef} />
        </div>
        <div className={`absolute bottom-0 left-0 w-full px-4 pt-4 pb-4 z-20 border-t shadow-[0_-10px_20px_rgba(0,0,0,0.08)] transition-all duration-500 ease-in-out ${isScrolling ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'} ${isDayMode ? 'bg-white border-gray-100' : 'bg-mystic-dark border-white/5'}`}>
            {!isAnalyzing && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 animate-fade-in-up">
                  {suggestions.map((s, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleSendMessage(s)} 
                      className={`py-1.5 px-3 rounded-full text-xs transition-all shadow-sm active:scale-95 border ${isDayMode ? 'bg-mystic-gold/5 text-mystic-gold border-mystic-gold/20 hover:bg-mystic-gold/10' : 'bg-white/5 text-mystic-gold border-white/10 hover:bg-white/10'}`}
                    >
                      💬 {s}
                    </button>
                  ))}
              </div>
            )}
            <div className="relative">
              <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="阁下请直言" className={`w-full pl-4 pr-12 py-3 rounded-2xl border outline-none shadow-sm transition-all ${isDayMode ? 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white' : 'bg-[#1a1b1e] text-gray-200 border-white/10 focus:border-mystic-gold/50'}`} />
              <button onClick={() => handleSendMessage()} disabled={isAnalyzing} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-mystic-gold/20 text-mystic-gold hover:bg-mystic-gold hover:text-white transition-colors">➤</button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col items-center pb-20 px-2 overflow-y-auto relative transition-colors duration-300 ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-mystic-dark'}`}>
      
      {/* Ritual Header (Back and Question) */}
      <div className={`w-full px-4 pt-4 flex items-center justify-between sticky top-0 z-40 transition-all ${isRitualActive ? 'animate-fade-in' : 'opacity-0 pointer-events-none'}`}>
        <button 
            onClick={reset} 
            className={`w-10 h-10 flex items-center justify-center rounded-full border shadow-lg transition-all active:scale-90 ${isDayMode ? 'bg-white border-gray-200 text-gray-600' : 'bg-mystic-paper border-white/10 text-gray-400'}`}
        >
            ❮
        </button>
        <div className="flex-1 px-4 text-center">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-serif block mb-0.5">当前卜问</span>
            <div className="text-xs text-mystic-gold truncate font-serif italic opacity-80">“{question || '未命题'}”</div>
        </div>
        <div className="w-10"></div>
      </div>

      {!isRitualActive && <button onClick={() => setShowHistoryModal(true)} className={`absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full border transition-colors shadow-lg p-2.5 ${isDayMode ? 'bg-white border-gray-200 text-mystic-gold' : 'bg-mystic-paper border-white/10 text-mystic-gold'}`}><IconHistory className="w-full h-full" /></button>}
      
      {showHistoryModal && (
          <div className={`absolute inset-0 z-50 backdrop-blur-sm animate-fade-in flex flex-col ${isDayMode ? 'bg-white/95' : 'bg-black/95'}`}>
              <div className={`px-4 py-4 border-b flex justify-between items-center ${isDayMode ? 'border-gray-100' : 'border-white/10'}`}><h3 className="text-lg text-mystic-gold font-serif">历史卦象</h3><button onClick={() => setShowHistoryModal(false)} className="text-gray-400 p-2">✕</button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">{history.length === 0 ? <div className="text-center text-gray-600 mt-20">暂无历史记录</div> : history.map((record) => <div key={record.id} onClick={() => restoreRecord(record)} className={`p-4 rounded-xl border transition-colors cursor-pointer bg-mystic-paper/50 border-white/5 active:bg-white/5`}><div className="flex justify-between items-start mb-2"><span className="text-mystic-gold font-serif text-lg">{record.result.hexagramName}</span><span className="text-xs text-gray-500">{record.dateStr}</span></div><p className={`text-sm line-clamp-2 text-gray-300`}>{record.question}</p></div>)}</div>
          </div>
      )}
      {!isRitualActive && (
        <div className="contents animate-fade-in-down">
          <div className="mt-6 mb-6 flex flex-col items-center shrink-0"><div className="w-20 h-20 rounded-2xl bg-cover bg-center shadow-lg border border-mystic-gold/30 mb-4" style={{ backgroundImage: `url(${assets.sage_avatar})` }}></div><h2 className={`text-xl font-serif tracking-widest ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>敢问欲询何事？</h2></div>
          <div className="w-full max-w-sm mb-6 flex flex-col gap-2 px-4 shrink-0">{['阁下辞职可顺？', '近期财运如何？', '这段感情有结果吗？'].map((q) => <button key={q} onClick={() => {setQuestion(q); setShakeError(false);}} className={`w-full border rounded-lg py-3 px-4 text-sm transition-all text-left bg-mystic-paper/50 border border-white/5 text-gray-400 hover:text-white`}>{q}</button>)}</div>
          <div className="w-full max-w-sm px-4 mb-8 relative shrink-0"><input ref={inputRef} type="text" value={question} onChange={(e) => {setQuestion(e.target.value); setShakeError(false);}} placeholder="为您解惑 (输入具体问题)" className={`w-full border rounded-xl py-3 pl-4 pr-12 outline-none shadow-sm transition-all duration-300 ${shakeError ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse' : 'bg-mystic-paper border-mystic-gold/20 text-white focus:border-mystic-gold'}`} /><div className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-40"><IconEdit className="w-full h-full" /></div></div>
          <div className="w-full max-w-sm px-4 mb-6 shrink-0"><div className={`w-full rounded-full p-1 flex border transition-colors bg-mystic-paper border-white/5`}>{(['MANUAL', 'SHAKE', 'TIME', 'NUMBER'] as InputMode[]).map((m) => <button key={m} onClick={() => {setMode(m); setShakeLines([]); setShakeStep(0); setNumberStep(0); setNumberResults([]); setIsNumberRitualStarted(false);}} className={`flex-1 py-2 rounded-full text-[10px] font-medium transition-all ${mode === m ? 'bg-mystic-gold text-black shadow-lg font-bold' : 'text-gray-500 hover:text-gray-300'}`}>{m === 'MANUAL' ? '手动' : m === 'SHAKE' ? '摇卦' : m === 'TIME' ? '时间' : '数字'}</button>)}</div></div>
        </div>
      )}
      <div className="w-full max-w-sm px-4 flex-1 flex flex-col pb-8">
         {mode === 'SHAKE' && (
            <div className="flex-1 flex flex-col items-center animate-fade-in-up mt-20">
                {shakeLines.length > 0 && <div className="mb-8 w-40 animate-fade-in"><HexagramVisual lines={shakeLines} activeStep={shakeStep} variant="default" /></div>}
                <div className={`flex gap-3 mb-10 items-center h-20`}>{coins.map((side, idx) => <div key={idx} className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-xs font-bold shadow-xl transition-all ${isFlipping ? 'animate-[spin_0.6s_ease-in-out_infinite]' : ''} ${side === CoinSide.HEAD ? 'bg-[#c5b078] border-[#a08d55] text-black' : 'bg-slate-300 border-slate-400 text-slate-700'}`}><div className="w-6 h-6 border-2 border-current opacity-40 transform rotate-45"></div></div>)}</div>
                <button onClick={handleToss} disabled={isFlipping || shakeStep >= 6} className={`w-full font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all ${shakeStep >= 6 ? 'bg-white/10 text-gray-500 cursor-default' : 'bg-gradient-to-r from-[#c5b078] to-[#a08d55] text-black'}`}>{shakeStep >= 6 ? '卦象已成' : isFlipping ? '摇卦中...' : (shakeStep > 0 ? '继续摇卦' : '开始摇卦')}</button>
                {shakeStep >= 6 && <button onClick={validateAndStartAnalyze} className="mt-4 w-full border-2 border-mystic-gold text-mystic-gold py-4 rounded-xl font-bold hover:bg-mystic-gold/10 active:scale-95 transition-all animate-fade-in">开始解卦</button>}
            </div>
         )}
         {mode === 'NUMBER' && (
            <div className="flex-1 flex flex-col items-center animate-fade-in-up h-full">
               {isNumberRitualStarted ? (
                  <div className="w-full flex flex-col items-center flex-1">
                    <div className="text-gray-500 text-[10px] mb-6 tracking-widest opacity-60 uppercase font-serif">第 {numberStep + 1} 阶段推演</div>
                    <InteractiveStalksFan splitIndex={tempSplitIndex} setSplitIndex={setTempSplitIndex} isSplitting={isSplitting} isDay={isDayMode} onConfirm={confirmNumberSplit} step={numberStep} />
                    {shakeLines.length > 0 && (
                        <div className="mt-2 animate-fade-in-up flex flex-col items-center">
                            <div className="w-20 mb-2"><HexagramVisual lines={shakeLines} activeStep={6} variant="compact" /></div>
                            <div className="text-[9px] text-mystic-gold/50 font-serif tracking-[0.2em]">{numberStep < 3 ? '已成卦象' : '卦象已全 (含动爻)'}</div>
                        </div>
                    )}
                    {numberStep >= 3 && (
                        <div className="mt-auto w-full pt-4">
                            <button onClick={validateAndStartAnalyze} className="w-full font-bold py-4 rounded-xl shadow-xl transition-all active:scale-95 bg-gradient-to-r from-mystic-gold to-amber-600 text-black">开始解卦</button>
                            <button onClick={() => reset()} className="w-full text-[10px] py-3 text-gray-500 tracking-widest hover:text-gray-300">重新起卦</button>
                        </div>
                    )}
                  </div>
               ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 animate-fade-in w-full h-full">
                     <p className="text-sm font-serif italic text-gray-500 tracking-widest text-center px-8 leading-loose opacity-60">大衍之数五十，其用四十有九。<br/>分而为二以象两，挂一以象三。</p>
                     <button onClick={() => { if (!question.trim()) { setShakeError(true); return; } setIsNumberRitualStarted(true); }} className="w-full mt-12 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 bg-gradient-to-r from-[#c5b078] to-[#a08d55] text-black">开始分蓍</button>
                  </div>
               )}
            </div>
         )}
         {mode === 'MANUAL' && (
            <div className="flex-1 flex flex-col animate-fade-in-up space-y-3">
               <div className="rounded-xl p-4 border space-y-3 bg-mystic-paper/50 border-white/5">{[...manualLines].reverse().map((line, reverseIndex) => { const realIndex = 5 - reverseIndex; return <div key={line.position} className="flex items-center justify-between"><span className="text-gray-400 text-sm font-serif w-12">{YAO_LABELS[realIndex]}</span><div className="flex-1 flex rounded-lg p-1 ml-4 overflow-hidden bg-black/40">{[{ label: '--', value: 8 }, { label: '—', value: 7 }, { label: 'X', value: 6 }, { label: 'O', value: 9 }].map((opt) => <button key={opt.value} onClick={() => updateManualLine(realIndex, opt.value)} className={`flex-1 py-1.5 text-[10px] rounded transition-all ${line.value === opt.value ? 'bg-mystic-gold text-black font-bold' : 'text-gray-500'}`}>{opt.label}</button>)}</div></div>; })}</div>
               <button onClick={validateAndStartAnalyze} className="w-full font-bold py-4 rounded-xl shadow-lg mt-4 mb-10 transition-all bg-gradient-to-r from-mystic-gold to-amber-600 text-black">开始解卦</button>
            </div>
         )}
         {mode === 'TIME' && (
            <div className="flex-1 flex flex-col items-center animate-fade-in-up space-y-6">
               <div className="w-full p-6 rounded-xl border text-center space-y-4 bg-mystic-paper border-white/10"><div><p className="text-gray-400 text-xs mb-1">公历时间</p><div className="text-xl font-mono tracking-wide text-gray-200">{currentTimeStr}</div></div><div className="border-t pt-4 border-white/5"><p className="text-gray-400 text-xs mb-2">农历时辰</p><div className="flex justify-center gap-4 text-mystic-gold font-serif text-lg"><span>{lunarInfo.year}</span><span>{lunarInfo.month}</span><span>{lunarInfo.day}</span><span>{lunarInfo.time}</span></div></div></div>
               {shakeLines.length > 0 && <div className="mb-4 w-40 animate-fade-in"><HexagramVisual lines={shakeLines} activeStep={6} variant="default" /></div>}
               <button onClick={() => { if(!question.trim()) { setShakeError(true); inputRef.current?.focus(); return; } handleTimeStart(); }} className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all ${shakeLines.length > 0 ? 'hidden' : 'bg-gradient-to-r from-mystic-gold to-amber-600 text-black'}`}>立即起卦</button>
               {shakeLines.length > 0 && <div className="w-full space-y-3"><button onClick={validateAndStartAnalyze} className="w-full border-2 border-mystic-gold text-mystic-gold py-4 rounded-xl font-bold hover:bg-mystic-gold/10 active:scale-95 transition-all">开始解卦</button><button onClick={() => { setShakeLines([]); setShakeStep(0); }} className="w-full text-xs text-gray-500 py-2">重新起卦</button></div>}
            </div>
         )}
      </div>
    </div>
  );
};
