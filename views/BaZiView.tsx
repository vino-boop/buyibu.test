
import React, { useRef, useEffect } from 'react';
import { useBaZi } from '../contexts/BaZiContext';
import { IconMagic, IconScroll, IconChat } from '../components/MysticIcons';
import { useAssets } from '../contexts/AssetContext';

/**
 * BaZiView Component
 * Displays the BaZi chart and provides a chat interface for analytical interaction.
 */

interface BaZiViewProps {
  isDayMode: boolean;
  defaultQuestion?: string;
}

// Helper function to render formatted message content with support for markdown-like bolding and headers
const renderMessageContent = (content: string) => {
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

export const BaZiView: React.FC<BaZiViewProps> = ({ isDayMode, defaultQuestion }) => {
  const {
    chartData,
    messages,
    chatLoading,
    handleSendMessage,
    inputMessage,
    setInputMessage,
    triggerDefaultQuestion,
    loading
  } = useBaZi();

  const { assets } = useAssets();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Handle default question if navigated from home screen with a specific topic
  useEffect(() => {
    if (defaultQuestion && !messages.length && !loading && chartData) {
      triggerDefaultQuestion(defaultQuestion);
    }
  }, [defaultQuestion, triggerDefaultQuestion, messages.length, loading, chartData]);

  // Maintain auto-scroll for the conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, chatLoading]);

  // Visual styles for non-primary action buttons
  const secondaryBtnStyle = isDayMode 
    ? 'bg-mystic-gold/10 text-mystic-gold border border-mystic-gold/40 hover:bg-mystic-gold/20' 
    : 'bg-mystic-gold/10 text-mystic-gold border border-mystic-gold/40 hover:bg-mystic-gold/20';

  return (
    <div className={`w-full h-full flex flex-col relative transition-colors duration-300 ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-mystic-dark'}`}>
      {/* Upper Section: BaZi Chart Visualization */}
      <div className="shrink-0 p-4 pb-0 z-10">
        <div className={`rounded-xl p-4 shadow-xl relative overflow-hidden flex flex-col gap-3 border transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'bg-[#2a2b2e] border-white/5'}`}>
          {chartData ? (
            <>
              <div className="flex justify-between items-center">
                <h2 className={`text-lg font-serif font-bold ${isDayMode ? 'text-gray-900' : 'text-[#e2e8f0]'}`}>八字命盘</h2>
                <span className="text-xs text-mystic-gold font-mono">{chartData.chart.solarDate.split(' ')[0]}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: '年', pillar: chartData.chart.year },
                  { label: '月', pillar: chartData.chart.month },
                  { label: '日', pillar: chartData.chart.day },
                  { label: '时', pillar: chartData.chart.hour }
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500">{item.label}柱</span>
                    <div className={`py-2 rounded-lg border transition-all ${isDayMode ? 'bg-gray-50 border-gray-100' : 'bg-black/20 border-white/5'}`}>
                      <div className="text-base font-bold text-mystic-gold">{item.pillar.stem}</div>
                      <div className="text-base font-bold text-mystic-gold">{item.pillar.branch}</div>
                      <div className="text-[8px] text-gray-500 mt-1 opacity-60">{item.pillar.mainStar || '日主'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-500 animate-pulse flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-mystic-gold border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs tracking-widest">排盘推演中...</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle Section: Conversational Analysis History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide pb-40">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            {msg.role === 'assistant' && (
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center mr-2 shrink-0 overflow-hidden ${isDayMode ? 'bg-white border-gray-100 shadow-sm' : 'bg-mystic-dark border-mystic-gold/30'}`}>
                <img src={assets.sage_avatar} alt="Sage" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm border ${msg.role === 'user' ? 'bg-mystic-gold/10 text-mystic-gold rounded-br-sm border-mystic-gold/10' : 'bg-mystic-paper/80 text-gray-300 rounded-bl-sm border-white/10'}`}>
              {renderMessageContent(msg.content)}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start animate-fade-in-up">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center mr-2 ${isDayMode ? 'bg-white border-gray-100 shadow-sm' : 'bg-mystic-dark border-mystic-gold/30'}`}>
              <span className="animate-spin text-mystic-gold">☯</span>
            </div>
            <div className={`px-4 py-3 rounded-2xl rounded-bl-sm border text-sm bg-mystic-paper/80 border-white/10 text-gray-400`}>推演中...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Lower Section: Action Buttons and Text Input */}
      <div className={`absolute bottom-0 left-0 w-full px-4 pt-4 pb-4 z-20 border-t shadow-[0_-10px_20px_rgba(0,0,0,0.03)] ${isDayMode ? 'bg-white border-gray-100' : 'bg-mystic-dark border-white/5'}`}>
        {!chatLoading && (
          <div className="flex gap-2 mb-3 animate-fade-in-up">
            {(messages.length <= 1) ? (
              <button 
                onClick={() => handleSendMessage("请为我进行【最高级别专业详盘】分析。内容须涵盖：格局判定、六亲缘分深度推演、十神意向剖析，并详细指出大运中关键的年份与转折点。最后以诗总结并向我提问。", true, true)} 
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${isDayMode ? 'bg-mystic-gold text-white border border-mystic-gold' : 'bg-gradient-to-r from-[#c5b078] to-[#a08d55] text-black'}`}
              >
                <IconMagic className={`w-4 h-4 ${isDayMode ? 'brightness-200' : ''}`} />
                <span>专业详盘</span>
              </button>
            ) : (
              <>
                <button 
                  onClick={() => handleSendMessage("请在保持专业度的基础上，再深入一步。分析我命盘中隐藏的五行制化细节，以及未来大运中的流年具体利弊。", true, true)} 
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${secondaryBtnStyle}`}
                >
                  <IconScroll className="w-4 h-4" />
                  <span className="text-xs">专业一点</span>
                </button>
                <button 
                  onClick={() => handleSendMessage("请直白一点，彻底去掉所有术语。请详细地把之前的内容用大白话讲给我听，不要简略，保持相同的信息量。", true, false)} 
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${secondaryBtnStyle}`}
                >
                  <IconChat className="w-4 h-4" />
                  <span className="text-xs">直白一点</span>
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
            placeholder="阁下请直言" 
            className={`w-full pl-4 pr-12 py-3 rounded-2xl border outline-none shadow-sm transition-all ${isDayMode ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-mystic-gold/50' : 'bg-[#1a1b1e] text-gray-200 border-white/10 focus:border-mystic-gold/50'}`} 
          />
          <button 
            onClick={() => handleSendMessage()} 
            disabled={chatLoading} 
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-mystic-gold/20 text-mystic-gold hover:bg-mystic-gold hover:text-white transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};
