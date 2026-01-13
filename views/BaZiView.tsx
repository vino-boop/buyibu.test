
import React, { useEffect, useRef } from 'react';
import { Gender, ChatMessage } from '../types';
import { useAssets } from '../contexts/AssetContext';
import { useBaZi } from '../contexts/BaZiContext';
import { IconMagic, IconScroll, IconChat } from '../components/MysticIcons';

interface BaZiViewProps {
  defaultQuestion?: string;
  isDayMode?: boolean;
}

const getElementColor = (text: string, isDay: boolean) => {
  const wood = ['甲', '乙', '寅', '卯', 'Wood'];
  const fire = ['丙', '丁', '巳', '午', 'Fire'];
  const earth = ['戊', '己', '辰', '戌', '丑', '未', 'Earth'];
  const metal = ['庚', '辛', '申', '酉', 'Metal'];
  const water = ['壬', '癸', '亥', '子', 'Water'];
  if (wood.some(c => text.includes(c))) return isDay ? 'text-emerald-700' : 'text-emerald-400';
  if (fire.some(c => text.includes(c))) return isDay ? 'text-red-700' : 'text-red-400';
  if (earth.some(c => text.includes(c))) return isDay ? 'text-amber-900' : 'text-amber-600';
  if (metal.some(c => text.includes(c))) return isDay ? 'text-yellow-700' : 'text-yellow-200';
  if (water.some(c => text.includes(c))) return isDay ? 'text-blue-800' : 'text-blue-400';
  return isDay ? 'text-gray-900' : 'text-gray-200';
};

/**
 * 优化后的自定义周期滑轨组件：金弦灵珠
 */
const CycleSlider: React.FC<{
  current: number;
  total: number;
  onChange: (index: number) => void;
  isDay: boolean;
}> = ({ current, total, onChange, isDay }) => {
  if (total <= 1) return null;
  const progress = (current / (total - 1)) * 100;

  return (
    <div className="px-5 mt-1 mb-4 relative h-6 flex items-center group">
      {/* 轨道背景：极细弦线 */}
      <div className={`absolute left-5 right-5 h-[0.5px] transition-colors ${isDay ? 'bg-gray-200' : 'bg-white/10'}`}></div>
      
      {/* 已选进度：发光金弦 */}
      <div 
        className="absolute left-5 h-[1px] bg-gradient-to-r from-mystic-gold/40 to-mystic-gold shadow-[0_0_8px_rgba(197,176,120,0.5)] transition-all duration-300"
        style={{ width: `calc(${progress}% - ${progress === 100 ? '0px' : '0px'})` }}
      ></div>

      <input
        type="range"
        min="0"
        max={total - 1}
        step="1"
        value={current}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="absolute left-5 right-5 w-[calc(100%-40px)] appearance-none bg-transparent outline-none cursor-pointer z-10"
      />

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: #c5b078;
          border: 2px solid ${isDay ? '#fff' : '#1a1b1e'};
          box-shadow: 0 0 15px rgba(197, 176, 120, 0.6), 0 2px 4px rgba(0,0,0,0.3);
          cursor: grab;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        input[type='range']::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.4);
          box-shadow: 0 0 20px rgba(197, 176, 120, 0.8), 0 4px 8px rgba(0,0,0,0.4);
        }
        /* 兼容火狐 */
        input[type='range']::-moz-range-thumb {
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: #c5b078;
          border: 2px solid ${isDay ? '#fff' : '#1a1b1e'};
          box-shadow: 0 0 15px rgba(197, 176, 120, 0.6);
          cursor: pointer;
        }
      `}</style>
      
      {/* 刻度微点：仅在非滑动状态下隐约可见 */}
      <div className="absolute left-5 right-5 flex justify-between pointer-events-none px-[6px]">
        {Array.from({ length: total }).map((_, i) => (
          <div 
            key={i} 
            className={`w-0.5 h-0.5 rounded-full transition-opacity duration-500 ${current === i ? 'opacity-0' : 'opacity-20'} ${isDay ? 'bg-gray-400' : 'bg-mystic-gold'}`}
          ></div>
        ))}
      </div>
    </div>
  );
};

const renderMessageContent = (msg: ChatMessage, isDay: boolean) => {
  const content = msg.content;
  const isProfessional = msg.isProfessional;
  
  if (!content) return null;
  const lines = content.split('\n');
  
  return lines.map((line, lineIdx) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return <div key={lineIdx} className="h-2" />;

    if (trimmedLine.startsWith('###')) {
      const headerText = trimmedLine.replace(/^###\s*/, '');
      return (
        <h3 key={lineIdx} className={`font-bold block mt-6 mb-2 text-base border-l-[3px] border-mystic-gold pl-3 text-mystic-gold`}>
          {headerText}
        </h3>
      );
    }

    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={lineIdx} className="mb-2 last:mb-0">
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const text = part.slice(2, -2);
            const isHeader = /^([一二三四五六七八九十]|第).*?$/.test(text);
            if (isHeader) {
               return (
                  <strong key={partIdx} className="text-mystic-gold font-bold block mt-4 mb-2 text-base border-l-2 border-mystic-gold/50 pl-2 py-0.5">
                      {text}
                  </strong>
               );
            }
            
            const useGold = isProfessional;
            
            return (
              <strong key={partIdx} className={`font-bold ${useGold ? 'underline underline-offset-4 decoration-1 text-mystic-gold decoration-mystic-gold/40' : (isDay ? 'text-gray-950' : 'text-white')}`}>
                  {text}
              </strong>
            );
          }
          return <span key={partIdx} className={isDay ? 'text-gray-800' : 'text-gray-300'}>{part}</span>;
        })}
      </div>
    );
  });
};

export const BaZiView: React.FC<BaZiViewProps> = ({ defaultQuestion, isDayMode = false }) => {
  const {
      name, setName, gender, setGender, birthDate, setBirthDate, birthTime, setBirthTime,
      viewMode, setViewMode, chartDisplayMode, setChartDisplayMode, showFullDetails, setShowFullDetails,
      selectedDaYunIndex, setSelectedDaYunIndex, selectedLiuNianIndex, setSelectedLiuNianIndex, selectedLiuYueIndex, setSelectedLiuYueIndex,
      chartData, messages, loading, chatLoading, handleStart, handleSendMessage, inputMessage, setInputMessage, triggerDefaultQuestion
  } = useBaZi();
  
  const { assets } = useAssets();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const daYunListRef = useRef<HTMLDivElement>(null);
  const liuNianListRef = useRef<HTMLDivElement>(null);
  const liuYueListRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (defaultQuestion) triggerDefaultQuestion(defaultQuestion); }, [defaultQuestion]);
  useEffect(() => { if (messages.length > 0 && scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight; }, [messages.length]); 

  // 当选择改变时自动滚动列表
  useEffect(() => {
    const activeBtn = daYunListRef.current?.children[selectedDaYunIndex] as HTMLElement;
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedDaYunIndex]);

  useEffect(() => {
    const activeBtn = liuNianListRef.current?.children[selectedLiuNianIndex] as HTMLElement;
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedLiuNianIndex]);

  useEffect(() => {
    const activeBtn = liuYueListRef.current?.children[selectedLiuYueIndex] as HTMLElement;
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedLiuYueIndex]);

  const currentAge = birthDate ? new Date().getFullYear() - parseInt(birthDate.split('-')[0]) : 0;

  if (loading || (viewMode === 'VIEW' && !chartData)) {
     return (
        <div className={`w-full h-full flex flex-col items-center justify-center pb-24 space-y-4 ${isDayMode ? 'bg-gray-50' : 'bg-mystic-dark'}`}>
             <div className="w-16 h-16 border-4 border-mystic-gold/30 border-t-mystic-gold rounded-full animate-spin"></div>
             <div className="text-mystic-gold text-sm tracking-widest">排盘推演中...</div>
        </div>
     );
  }

  if (viewMode === 'EDIT') {
    return (
      <div className={`w-full h-full flex flex-col items-center pb-24 px-4 pt-4 animate-fade-in-up overflow-y-auto scrollbar-hide ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-mystic-dark'}`}>
        <div className={`w-full rounded-3xl p-6 shadow-2xl border space-y-6 shrink-0 transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'bg-mystic-paper border-white/5'}`}>
           <div className={`border-b py-2 flex items-center justify-between transition-colors ${isDayMode ? 'border-gray-100' : 'border-white/10'}`}>
              <span className={isDayMode ? 'text-gray-500' : 'text-gray-200'}>姓名</span>
              <input type="text" className={`bg-transparent text-right outline-none w-1/2 ${isDayMode ? 'text-gray-800' : 'text-gray-400'}`} value={name} onChange={e => setName(e.target.value)} />
           </div>
           <div className={`flex rounded-full p-1 w-32 ml-auto transition-colors ${isDayMode ? 'bg-gray-100' : 'bg-black/30'}`}>
              <button onClick={() => setGender(Gender.MALE)} className={`flex-1 py-1 rounded-full text-xs transition-all ${gender === Gender.MALE ? 'bg-mystic-gold text-black font-bold shadow-sm' : 'text-gray-500'}`}>男</button>
              <button onClick={() => setGender(Gender.FEMALE)} className={`flex-1 py-1 rounded-full text-xs transition-all ${gender === Gender.FEMALE ? 'bg-mystic-gold text-black font-bold shadow-sm' : 'text-gray-500'}`}>女</button>
           </div>
           <div className={`border-b py-2 flex items-center justify-between transition-colors ${isDayMode ? 'border-gray-100' : 'border-white/10'}`}>
              <span className={isDayMode ? 'text-gray-500' : 'text-gray-200'}>出生日期</span>
              <input type="date" className={`bg-transparent text-right outline-none ${isDayMode ? 'text-gray-800' : 'text-gray-400'}`} value={birthDate} onChange={e => setBirthDate(e.target.value)} />
           </div>
           <div className={`border-b py-2 flex items-center justify-between transition-colors ${isDayMode ? 'border-gray-100' : 'border-white/10'}`}>
              <span className={isDayMode ? 'text-gray-500' : 'text-gray-200'}>出生时间</span>
              <input type="time" className={`bg-transparent text-right outline-none ${isDayMode ? 'text-gray-800' : 'text-gray-400'}`} value={birthTime} onChange={e => setBirthTime(e.target.value)} />
           </div>
           <button onClick={() => handleStart(false)} className={`w-full font-bold py-4 rounded-full mt-4 shadow-lg transition-all active:scale-95 ${isDayMode ? 'bg-mystic-gold text-white' : 'bg-[#e8c688] text-black'}`}>重新排盘</button>
           <button onClick={() => setViewMode('VIEW')} className="w-full text-gray-500 text-sm mt-2">取消修改</button>
        </div>
      </div>
    );
  }

  if (!chartData) return null;
  const { chart } = chartData;
  const pillars = [{ label: '年柱', data: chart.year }, { label: '月柱', data: chart.month }, { label: '日柱', data: chart.day }, { label: '时柱', data: chart.hour }];
  const selectedDaYun = chart.daYun[selectedDaYunIndex];
  const selectedLiuNian = selectedDaYun?.liuNian[selectedLiuNianIndex];

  const secondaryBtnStyle = isDayMode 
    ? "bg-mystic-gold/10 text-mystic-gold border border-mystic-gold/30 hover:bg-mystic-gold/20" 
    : "bg-mystic-gold/10 text-mystic-gold border border-mystic-gold/40 hover:bg-mystic-gold/20";

  return (
    <div className={`w-full h-full flex flex-col relative transition-colors duration-300 ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-mystic-dark'}`}>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-hide pb-32">
          <div className={`border-b shadow-lg rounded-b-3xl mb-4 transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'bg-mystic-paper/90 border-white/5'}`}>
             {chartDisplayMode === 'COLLAPSED' && (
                <div className="px-4 py-3 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">日主</span>
                         <span className={`text-lg font-bold font-serif ${getElementColor(chart.day.stem, isDayMode)}`}>{chart.day.stem}</span>
                      </div>
                      <div className={`flex flex-col border-l pl-4 transition-colors ${isDayMode ? 'border-gray-100' : 'border-white/10'}`}>
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">大运</span>
                         <span className={`text-sm font-serif ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>{selectedDaYun?.ganZhi || '-'}</span>
                      </div>
                   </div>
                   <div className="flex gap-2">
                       <button onClick={() => setChartDisplayMode('EXPANDED')} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${isDayMode ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>命盘 ▼</button>
                   </div>
                </div>
             )}
             {chartDisplayMode === 'EXPANDED' && (
                <div className={`mx-2 my-2 rounded-2xl overflow-hidden animate-fade-in-down pb-4 transition-colors ${isDayMode ? 'bg-gray-50' : 'bg-black/20'}`}>
                   <div className="px-4 pt-3 flex justify-between items-start mb-2">
                       <div className="text-xs text-gray-400">
                          <div className="flex items-center gap-2 mb-1">
                              <span className={`font-bold ${isDayMode ? 'text-gray-800' : 'text-mystic-gold'}`}>{name} ({gender === Gender.MALE ? '乾造' : '坤造'}) <span className="text-gray-500 ml-1 font-normal">{currentAge}岁</span></span>
                              <button onClick={() => setViewMode('EDIT')} className={`text-[10px] rounded px-1.5 py-0.5 ml-1 transition-colors ${isDayMode ? 'text-mystic-gold border border-mystic-gold/40 hover:bg-mystic-gold/5' : 'text-mystic-gold/60 border border-mystic-gold/30 hover:bg-mystic-gold/10'}`}>修改信息</button>
                          </div>
                          <span className={isDayMode ? 'text-gray-500' : 'text-gray-400'}>{chart.solarDate} | {chart.lunarDate}</span>
                       </div>
                       <button onClick={() => setChartDisplayMode('COLLAPSED')} className={`text-[10px] px-2 py-1 rounded transition-colors ${isDayMode ? 'bg-white text-gray-500 border border-gray-100 shadow-sm' : 'bg-white/5 text-gray-400'}`}>收起 ▲</button>
                   </div>
                   {!showFullDetails && (
                       <div className={`grid grid-cols-5 text-center text-xs py-2 gap-y-2 mb-4 mx-2 rounded-xl border transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'bg-white/5 border-white/5'}`}>
                            <div className="text-gray-500 font-bold">天干</div>
                            {pillars.map((p, i) => <div key={i} className={`text-xl font-bold font-serif ${getElementColor(p.data.stem, isDayMode)}`}>{p.data.stem}</div>)}
                            <div className="text-gray-500 font-bold">地支</div>
                            {pillars.map((p, i) => <div key={i} className={`text-xl font-bold font-serif ${getElementColor(p.data.branch, isDayMode)}`}>{p.data.branch}</div>)}
                       </div>
                   )}
                   <div className="px-2">
                       <button onClick={() => setShowFullDetails(!showFullDetails)} className={`w-full py-2 rounded-lg text-xs text-mystic-gold border transition-all ${isDayMode ? 'bg-white border-mystic-gold/20 hover:bg-gray-50 shadow-sm' : 'bg-white/5 border-white/5'}`}>
                           {showFullDetails ? '收起详情 ▲' : '查看完整命盘 ▼'}
                       </button>
                   </div>
                   {showFullDetails && (
                       <div className="mt-4 animate-fade-in">
                          <div className={`mx-2 rounded-xl border overflow-hidden mb-6 transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'bg-white/5 border-white/5'}`}>
                              <div className={`grid grid-cols-5 text-center text-xs divide-y transition-colors min-w-0 ${isDayMode ? 'divide-gray-100' : 'divide-white/5'}`}>
                                  <div className={`py-2 text-gray-500 font-bold ${isDayMode ? 'bg-gray-50/50' : 'bg-white/5'}`}>位置</div>
                                  {pillars.map((p, i) => <div key={i} className={`py-2 ${isDayMode ? 'text-gray-400 bg-gray-50/50' : 'text-gray-400 bg-white/5'}`}>{p.label}</div>)}
                                  <div className="py-3 text-gray-500 font-bold flex items-center justify-center">主星</div>
                                  {pillars.map((p, i) => <div key={i} className={`py-3 font-medium ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>{p.data.mainStar || '-'}</div>)}
                                  <div className={`py-4 text-gray-500 font-bold flex items-center justify-center ${isDayMode ? 'bg-gray-50/50' : 'bg-white/5'}`}>天干</div>
                                  {pillars.map((p, i) => <div key={i} className={`py-4 text-2xl font-bold font-serif ${isDayMode ? 'bg-gray-50/50' : 'bg-white/5'} ${getElementColor(p.data.stem, isDayMode)}`}>{p.data.stem}</div>)}
                                  <div className={`py-4 text-gray-500 font-bold flex items-center justify-center ${isDayMode ? 'bg-gray-50/50' : 'bg-white/5'}`}>地支</div>
                                  {pillars.map((p, i) => <div key={i} className={`py-4 text-2xl font-bold font-serif ${isDayMode ? 'bg-gray-50/50' : 'bg-white/5'} ${getElementColor(p.data.branch, isDayMode)}`}>{p.data.branch}</div>)}
                                  <div className="py-3 text-gray-500 font-bold flex items-center justify-center">藏干</div>
                                  {pillars.map((p, i) => (<div key={i} className="py-3 flex flex-col items-center gap-0.5">{p.data.hiddenStems.map((hs, idx) => <span key={idx} className={`text-[10px] ${getElementColor(hs, isDayMode)}`}>{hs}</span>)}</div>))}
                                  <div className={`py-3 text-gray-500 font-bold flex items-center justify-center ${isDayMode ? 'bg-gray-50/50' : 'bg-white/5'}`}>副星</div>
                                  {pillars.map((p, i) => (<div key={i} className={`py-3 flex flex-col items-center gap-0.5 ${isDayMode ? 'bg-gray-50/50' : 'bg-white/5'}`}>{p.data.hiddenStemStars.map((hss, idx) => <span key={idx} className={`text-[9px] scale-90 ${isDayMode ? 'text-gray-400' : 'text-gray-500'}`}>{hss}</span>)}</div>))}
                                  <div className="py-3 text-gray-500 font-bold flex items-center justify-center">纳音</div>
                                  {pillars.map((p, i) => (<div key={i} className={`py-3 text-[9px] scale-90 leading-tight ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>{p.data.naYin}</div>))}
                                  <div className={`py-3 text-gray-500 font-bold flex items-center justify-center ${isDayMode ? 'bg-gray-50/50' : 'bg-white/5'}`}>运势</div>
                                  {pillars.map((p, i) => (<div key={i} className={`py-3 text-xs bg-gray-50/50 ${isDayMode ? 'text-mystic-gold font-medium' : 'text-mystic-gold/80'}`}>{p.data.xingYun || '-'}</div>))}
                                  <div className="py-3 text-gray-500 font-bold flex items-center justify-center shrink-0">神煞</div>
                                  {pillars.map((p, i) => (
                                      <div key={i} className="py-3 px-1 flex flex-wrap justify-center gap-1 min-w-0">
                                          {p.data.shenSha.map((ss, idx) => (
                                              <span key={idx} className={`text-[8px] border px-1 py-0.5 rounded-sm whitespace-nowrap leading-none transition-colors ${isDayMode ? 'text-mystic-gold border-mystic-gold/30 bg-mystic-gold/5' : 'text-mystic-gold/70 border-mystic-gold/20'}`}>
                                                {ss}
                                              </span>
                                          ))}
                                      </div>
                                  ))}
                              </div>
                          </div>
                          <div className="space-y-4 px-2 pb-4">
                             {/* 大运栏 */}
                             <div>
                               <div className="flex items-center">
                                   <div className={`w-8 text-xs font-serif font-bold border-r mr-2 flex flex-col items-center shrink-0 transition-colors ${isDayMode ? 'text-gray-400 border-gray-100' : 'text-gray-500 border-white/10'}`}><span>大</span><span>运</span></div>
                                   <div ref={daYunListRef} className="flex-1 flex overflow-x-auto gap-2 py-2 min-w-0 scrollbar-hide flex-nowrap touch-pan-x">
                                       {chart.daYun.map((yun, i) => (
                                           <button key={i} onClick={() => { setSelectedDaYunIndex(i); setSelectedLiuNianIndex(0); setSelectedLiuYueIndex(0); }} className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-14 rounded border transition-all ${selectedDaYunIndex === i ? 'bg-mystic-gold text-white border-mystic-gold shadow-md' : (isDayMode ? 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50' : 'bg-white/5 border-white/5 text-gray-500')}`}>
                                               <span className="text-sm font-serif">{yun.ganZhi}</span>
                                               <span className="text-[9px] opacity-70">{yun.startAge}岁</span>
                                           </button>
                                       ))}
                                   </div>
                               </div>
                               <CycleSlider 
                                 current={selectedDaYunIndex} 
                                 total={chart.daYun.length} 
                                 onChange={(idx) => { setSelectedDaYunIndex(idx); setSelectedLiuNianIndex(0); setSelectedLiuYueIndex(0); }} 
                                 isDay={isDayMode} 
                               />
                             </div>

                             {/* 流年栏 */}
                             <div>
                               <div className="flex items-center">
                                   <div className={`w-8 text-xs font-serif font-bold border-r mr-2 flex flex-col items-center shrink-0 transition-colors ${isDayMode ? 'text-gray-400 border-gray-100' : 'text-gray-500 border-white/10'}`}><span>流</span><span>年</span></div>
                                   <div ref={liuNianListRef} className="flex-1 flex overflow-x-auto gap-2 py-2 min-w-0 scrollbar-hide flex-nowrap touch-pan-x">
                                       {selectedDaYun?.liuNian.map((ln, i) => (
                                           <button key={i} onClick={() => { setSelectedLiuNianIndex(i); setSelectedLiuYueIndex(0); }} className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-14 rounded border transition-all ${selectedLiuNianIndex === i ? 'bg-mystic-gold text-white border-mystic-gold shadow-md' : (isDayMode ? 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50' : 'bg-white/5 border-white/5 text-gray-500')}`}>
                                               <span className="text-sm font-serif">{ln.ganZhi}</span>
                                               <span className="text-[9px] opacity-70">{ln.year}</span>
                                           </button>
                                       ))}
                                   </div>
                               </div>
                               <CycleSlider 
                                 current={selectedLiuNianIndex} 
                                 total={selectedDaYun?.liuNian.length || 0} 
                                 onChange={(idx) => { setSelectedLiuNianIndex(idx); setSelectedLiuYueIndex(0); }} 
                                 isDay={isDayMode} 
                               />
                             </div>

                             {/* 流月栏 */}
                             {selectedLiuNian && (
                                <div>
                                  <div className="flex items-center">
                                      <div className={`w-8 text-xs font-serif font-bold border-r mr-2 flex flex-col items-center shrink-0 transition-colors ${isDayMode ? 'text-gray-400 border-gray-100' : 'text-gray-500 border-white/10'}`}><span>流</span><span>月</span></div>
                                      <div ref={liuYueListRef} className="flex-1 flex overflow-x-auto gap-2 py-2 min-w-0 scrollbar-hide flex-nowrap touch-pan-x">
                                          {selectedLiuNian.liuYue.map((m, i) => (
                                              <button key={i} onClick={() => setSelectedLiuYueIndex(i)} className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-14 rounded border transition-all ${selectedLiuYueIndex === i ? 'bg-mystic-gold text-white border-mystic-gold shadow-md' : (isDayMode ? 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50' : 'bg-white/5 border-white/5 text-gray-500')}`}>
                                                  <span className={`text-sm font-serif ${selectedLiuYueIndex === i ? '' : getElementColor(m.ganZhi, isDayMode)}`}>{m.ganZhi}</span>
                                                  <span className="text-[9px] opacity-70">{m.month}</span>
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                                  <CycleSlider 
                                    current={selectedLiuYueIndex} 
                                    total={selectedLiuNian.liuYue.length} 
                                    onChange={setSelectedLiuYueIndex} 
                                    isDay={isDayMode} 
                                  />
                                </div>
                             )}
                          </div>
                       </div>
                   )}
                </div>
             )}
          </div>
          <div className="px-4 space-y-4">
             {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                   {msg.role === 'assistant' && (
                     <div className={`w-8 h-8 rounded-full border mr-2 shrink-0 overflow-hidden transition-colors ${isDayMode ? 'bg-white border-gray-100 shadow-sm' : 'border-mystic-gold/30'}`}>
                        <img src={assets.sage_avatar} className="w-full h-full object-cover" alt="Sage" />
                     </div>
                   )}
                   <div className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed border transition-colors shadow-sm ${
                      msg.role === 'user' 
                        ? (isDayMode ? 'bg-mystic-gold/10 text-mystic-gold rounded-br-sm border-mystic-gold/10' : 'bg-mystic-gold/10 text-mystic-gold rounded-br-sm border-mystic-gold/20')
                        : (isDayMode ? 'bg-white text-gray-800 rounded-bl-sm border-gray-100' : 'bg-mystic-paper/80 text-gray-300 rounded-bl-sm border-white/10')
                    }`}>
                      {renderMessageContent(msg, isDayMode)}
                   </div>
                </div>
             ))}
             {chatLoading && (
               <div className="flex justify-start">
                 <div className={`w-8 h-8 rounded-full border mr-2 flex items-center justify-center transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'border-mystic-gold/30'}`}>
                    <span className="animate-spin text-mystic-gold text-xs">☯</span>
                 </div>
                 <div className={`px-4 py-3 rounded-2xl text-sm border transition-colors ${isDayMode ? 'bg-white border-gray-100 text-gray-400' : 'bg-mystic-paper/80 border-white/10 text-gray-400'}`}>推演中</div>
               </div>
             )}
          </div>
      </div>
      <div className={`shrink-0 w-full px-4 pt-4 pb-4 z-20 border-t shadow-[0_-10px_20px_rgba(0,0,0,0.03)] transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'bg-mystic-dark border-white/5'}`}>
            {messages.length >= 1 && !chatLoading && (
                <div className="flex gap-2 mb-3 animate-fade-in-up">
                    {messages.length === 1 ? (
                        <button 
                          onClick={() => handleSendMessage("请为我进行专业详盘分析，包含大局综述、神煞深度分析、六亲关系推演及诗意结尾。", true, true)} 
                          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${isDayMode ? 'bg-mystic-gold text-white border border-mystic-gold' : 'bg-gradient-to-r from-[#c5b078] to-[#a08d55] text-black'}`}
                        >
                          <IconMagic className={`w-4 h-4 ${isDayMode ? 'brightness-200' : ''}`} />
                          <span>专业详盘</span>
                        </button>
                    ) : (
                        <>
                          <button 
                            onClick={() => handleSendMessage("请专业一点，用专业命理术语深入剖析上一个回答。", true, true)} 
                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${secondaryBtnStyle}`}
                          >
                            <IconScroll className="w-4 h-4" />
                            <span>专业一点</span>
                          </button>
                          <button 
                            onClick={() => handleSendMessage("请直白一点，彻底去掉术语，用最通俗干练的话重述。", true, false)} 
                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${secondaryBtnStyle}`}
                          >
                            <IconChat className="w-4 h-4" />
                            <span>直白一点</span>
                          </button>
                        </>
                    )}
                </div>
            )}
            <div className="relative">
               <input 
                 type="text" 
                 value={inputMessage} 
                 onChange={e => setInputMessage(e.target.value)} 
                 onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                 placeholder="阁下请直言..." 
                 className={`w-full pl-4 pr-12 py-3 rounded-2xl border outline-none shadow-sm transition-all ${isDayMode ? 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-mystic-gold/50' : 'bg-[#1a1b1e] text-gray-200 border-white/10 focus:border-mystic-gold'}`} 
               />
               <button 
                 onClick={() => handleSendMessage()} 
                 disabled={chatLoading} 
                 className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-mystic-gold/20 text-mystic-gold hover:bg-mystic-gold hover:text-white transition-all"
               >
                 ➤
               </button>
            </div>
      </div>
    </div>
  );
};
