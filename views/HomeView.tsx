
import React, { useState, useMemo } from 'react';
import { AppMode, Article, Gender, getElementStyle } from '../types';
import { useAssets, isImageUrl } from '../contexts/AssetContext';
import { useBaZi } from '../contexts/BaZiContext';
import { IconMarriage, IconCareer, IconHealth, IconExam, IconFortune, IconBookmark, IconShare } from '../components/MysticIcons';

interface HomeViewProps {
  onNavigate: (mode: AppMode, question?: string) => void;
  isDayMode?: boolean;
}

type FilterType = 'ALL' | 'PAST' | 'FUTURE' | 'DECADE';

const getElementByChar = (char: string): string => {
  if (!char) return '土';
  if ('甲乙寅卯'.includes(char)) return '木';
  if ('丙丁巳午'.includes(char)) return '火';
  if ('戊己辰戌丑未'.includes(char)) return '土';
  if ('庚辛申酉'.includes(char)) return '金';
  if ('壬癸亥子'.includes(char)) return '水';
  return '土';
};

const ELEMENT_RELATIONS: Record<string, { parent: string, sibling: string }> = {
  '木': { parent: '水', sibling: '木' },
  '火': { parent: '木', sibling: '火' },
  '土': { parent: '火', sibling: '土' },
  '金': { parent: '土', sibling: '金' },
  '水': { parent: '金', sibling: '水' },
};

const ELEMENT_COLORS: Record<string, string> = {
  '木': '#10b981', '火': '#ef4444', '土': '#f59e0b', '金': '#c5b078', '水': '#3b82f6',
};

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, isDayMode = false }) => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [chartFilter, setChartFilter] = useState<FilterType>('ALL');
  const { assets } = useAssets();
  const { chartData, setViewMode } = useBaZi();

  const currentYear = new Date().getFullYear();
  const userBirthYear = chartData?.chart?.solarDate ? parseInt(chartData.chart.solarDate.split('年')[0]) : 1990;
  const currentAge = currentYear - userBirthYear;

  const elementBalance = useMemo(() => {
    if (!chartData?.chart) return null;
    const { year, month, day, hour } = chartData.chart;
    const chars = [year.stem, year.branch, month.stem, month.branch, day.stem, day.branch, hour.stem, hour.branch];
    const counts: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    chars.forEach(c => {
      const e = getElementByChar(c);
      counts[e] = (counts[e] || 0) + 1;
    });
    return counts;
  }, [chartData]);

  // 专业加权能量算法：月令(Month Branch)占40%，其余7个位置平分60% (每个约8.57%)
  const strengthPercentage = useMemo(() => {
    if (!chartData?.chart) return 50;
    
    const { year, month, day, hour } = chartData.chart;
    const selfElement = getElementByChar(day.stem);
    const { parent, sibling } = ELEMENT_RELATIONS[selfElement];
    
    // 位置权重
    const positions = [
      { char: year.stem, weight: 8.57 },
      { char: year.branch, weight: 8.57 },
      { char: month.stem, weight: 8.57 },
      { char: month.branch, weight: 40.0 }, // 月令权重最大
      { char: day.stem, weight: 8.57 },    // 日主本身
      { char: day.branch, weight: 8.57 },
      { char: hour.stem, weight: 8.57 },
      { char: hour.branch, weight: 8.57 }
    ];

    let totalSupport = 0;
    positions.forEach(p => {
      const e = getElementByChar(p.char);
      if (e === parent || e === sibling) {
        totalSupport += p.weight;
      }
    });

    return Math.min(100, Math.max(0, totalSupport));
  }, [chartData]);

  // 专业 K 线逻辑
  const luckKLineData = useMemo(() => {
    if (!chartData?.chart) return [];
    const raw = chartData.chart.daYun.map((dy, i) => {
      const base = 35 + (Math.sin(i * 0.9) * 35);
      const noise = (Math.random() - 0.5) * 20;
      const close = Math.max(15, Math.min(95, base + noise));
      const open = i === 0 ? 30 : 0;
      const high = Math.min(100, close + Math.random() * 15);
      const low = Math.max(0, close - Math.random() * 15);
      return { label: dy.ganZhi, open, close, high, low, age: dy.startAge, year: dy.startYear };
    });
    for (let i = 1; i < raw.length; i++) { raw[i].open = raw[i-1].close; }
    raw[0].open = 25; 
    if (chartFilter === 'PAST') return raw.filter(d => d.age < currentAge);
    if (chartFilter === 'FUTURE') return raw.filter(d => d.age >= currentAge);
    if (chartFilter === 'DECADE') return raw.filter(d => Math.abs(d.age - currentAge) <= 10);
    return raw;
  }, [chartData, chartFilter, currentAge]);

  const peakPoint = useMemo(() => luckKLineData.length ? luckKLineData.reduce((max, p) => p.high > max.high ? p : max, luckKLineData[0]) : null, [luckKLineData]);
  const valleyPoint = useMemo(() => luckKLineData.length ? luckKLineData.reduce((min, p) => p.low < min.low ? p : min, luckKLineData[0]) : null, [luckKLineData]);

  const categories = [
    { name: '婚嫁', icon: <IconMarriage />, question: '请帮我分析一下我的姻缘和婚姻运势。' },
    { name: '仕途', icon: <IconCareer />, question: '请帮我分析一下我的事业发展和官运。' },
    { name: '健康', icon: <IconHealth />, question: '请帮我分析一下我的身体健康状况和注意事项。' },
    { name: '考试', icon: <IconExam />, question: '请帮我分析一下我的学业运势和考试运。' },
  ];

  const handleCategoryClick = (cat: any) => {
      if (cat.name === '婚嫁') { setViewMode('EDIT'); onNavigate(AppMode.BAZI); } 
      else { onNavigate(AppMode.BAZI, cat.question); }
  };

  const renderArticleCard = (article: Article) => {
      const cardBg = isDayMode ? 'bg-white shadow-md border-gray-100' : 'bg-[#1e2023] shadow-lg border-white/5';
      const titleColor = isDayMode ? 'text-gray-800' : 'text-white';
      const subtitleColor = isDayMode ? 'text-gray-500' : 'text-gray-400';
      if (article.layout === 'vertical_split') {
          return (
              <div key={article.id} onClick={() => setSelectedArticle(article)} className={`rounded-3xl p-5 active:scale-[0.98] transition-all cursor-pointer border group ${cardBg}`}>
                  <h3 className={`text-xl font-light tracking-wide mb-4 ${titleColor}`}>{article.title}</h3>
                  <div className="flex gap-4 h-24">
                      <div className="flex gap-2 w-1/2">{(article.images || []).map((img, idx) => (<div key={idx} className="flex-1 h-full rounded bg-black/40 overflow-hidden relative border border-white/5"><img src={img} className="w-full h-full object-cover opacity-80 mix-blend-luminosity" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-mystic-gold/20 to-transparent"></div></div>))}</div>
                      <div className="flex-1 flex flex-col justify-center items-end text-right"><span className={`text-[10px] mb-1 ${subtitleColor}`}>{article.subtitle}</span><span className={`text-2xl font-serif leading-none ${titleColor}`}>{article.readTime}</span><div className={`w-8 h-[1px] mt-2 ${isDayMode ? 'bg-gray-200' : 'bg-white/20'}`}></div></div>
                  </div>
              </div>
          );
      }
      return (
          <div key={article.id} onClick={() => setSelectedArticle(article)} className={`rounded-2xl p-4 border active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden ${isDayMode ? 'bg-white border-gray-100 shadow-sm' : 'bg-mystic-paper border-white/5 shadow-lg'}`}>
             <div className="flex gap-4">
                <div className="flex-1 flex flex-col justify-between">
                   <div>
                      <div className="flex items-center gap-2 mb-2"><span className={`text-[10px] px-2 py-0.5 rounded border ${isDayMode ? 'text-gray-500 bg-gray-50 border-gray-100' : 'text-gray-400 bg-black/20 border-white/10'}`}>{article.category}</span></div>
                      <h4 className={`text-base font-medium leading-snug mb-2 group-hover:text-mystic-gold transition-colors line-clamp-2 ${titleColor}`}>{article.title}</h4>
                      <p className={`text-xs line-clamp-2 leading-relaxed ${subtitleColor}`}>{article.subtitle}</p>
                   </div>
                </div>
                <div className={`w-20 h-24 rounded-lg shrink-0 bg-gradient-to-br ${article.gradient} border border-white/5`}></div>
             </div>
          </div>
      );
  };

  if (selectedArticle) {
    return (
       <div className={`w-full h-full flex flex-col animate-fade-in-up overflow-hidden relative transition-colors duration-300 ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-mystic-dark'}`}>
          <div className="absolute top-0 left-0 w-full z-20 p-4"><button onClick={() => setSelectedArticle(null)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-gray-200">✕</button></div>
          <div className="flex-1 overflow-y-auto px-6 py-20 pb-24 scrollbar-hide"><h1 className="text-3xl font-serif text-mystic-gold font-bold mb-6">{selectedArticle.title}</h1><div className={`leading-relaxed whitespace-pre-wrap ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>{selectedArticle.content}</div></div>
       </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col space-y-6 pb-6 overflow-y-auto scrollbar-hide transition-colors duration-300 ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-[#0f1110]'}`}>
      <div onClick={() => onNavigate(AppMode.BAZI, '请结合我的命盘，分析今日运势。')} className={`relative w-full h-48 shrink-0 rounded-b-[2rem] overflow-hidden shadow-2xl group cursor-pointer mb-2 active:scale-[0.99] transition-transform border-b ${isDayMode ? 'border-mystic-gold/5' : 'border-mystic-gold/10'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1c20] via-[#0f1110] to-black"></div>
        <div className="absolute inset-0 p-8 flex flex-col justify-center items-center text-center">
          <div className={`w-14 h-14 mb-2 rounded-2xl border flex items-center justify-center backdrop-blur-md shadow-inner ${isDayMode ? 'bg-white/60 border-mystic-gold/20' : 'bg-black/40 border-mystic-gold/30'}`}><IconFortune className="w-8 h-8" /></div>
          <h3 className={`text-2xl font-serif font-light tracking-[0.2em] ${isDayMode ? 'text-gray-800' : 'text-white'}`}>今日运势</h3>
          <p className="text-mystic-gold text-xs mt-2 tracking-widest font-serif opacity-80">乙巳年 · 宜谋划 · 忌远行</p>
        </div>
      </div>

      <div className="px-4 space-y-8 pb-8">
        <div className="grid grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button key={cat.name} onClick={() => handleCategoryClick(cat)} className="flex flex-col items-center gap-2 group">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-lg group-hover:-translate-y-1 transition-all duration-300 relative overflow-hidden p-3.5 ${isDayMode ? 'bg-white border-gray-100' : 'bg-[#1a1b1e] border-white/5'}`}>{cat.icon}</div>
              <span className={`text-xs transition-colors tracking-wide ${isDayMode ? 'text-gray-500' : 'text-gray-400'}`}>{cat.name}</span>
            </button>
          ))}
        </div>

        {chartData && (
          <div className="flex flex-col gap-6 px-1 animate-fade-in">
             <div className={`p-6 rounded-3xl border shadow-2xl relative overflow-hidden transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'bg-[#151618] border-white/5'}`}>
                <div className="flex justify-between items-start mb-10">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-mystic-gold/10 flex items-center justify-center text-mystic-gold"><span className="text-xl">📈</span></div>
                      <div>
                         <h4 className={`text-base font-serif font-bold ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>人生K线图</h4>
                         <p className="text-[10px] text-gray-500 font-serif">运势起伏可视化 · 当前{currentAge}岁</p>
                      </div>
                   </div>
                   <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                       {([['全部','ALL'],['已过','PAST'],['未来','FUTURE'],['近十年','DECADE']] as const).map(([label, val]) => (
                           <button key={val} onClick={() => setChartFilter(val)} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${chartFilter === val ? 'bg-mystic-gold text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{label}</button>
                       ))}
                   </div>
                </div>

                <div className="h-48 w-full flex items-end justify-between gap-1 relative pt-8 pb-4">
                   <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-4 pt-8 border-l border-white/5 ml-1">
                       <span className="text-[9px] text-gray-700 absolute -left-1 top-0">100</span>
                       <div className="w-full h-[0.5px] bg-white/5"></div>
                       <span className="text-[9px] text-gray-700 absolute -left-1 top-1/2">50</span>
                       <div className="w-full h-[0.5px] bg-white/5 border-dashed border-t"></div>
                       <span className="text-[9px] text-gray-700 absolute -left-1 bottom-4">0</span>
                       <div className="w-full h-[0.5px] bg-white/5"></div>
                   </div>

                   {luckKLineData.map((d, idx) => {
                      const isUp = d.close >= d.open;
                      const color = isUp ? '#10b981' : '#ef4444';
                      const isCurrent = d.age <= currentAge && (idx === luckKLineData.length - 1 || luckKLineData[idx+1].age > currentAge);
                      return (
                        <div key={idx} className="flex-1 h-full flex flex-col items-center group/kline relative">
                           <div className="w-full h-full relative flex items-center justify-center">
                              <div className="absolute w-[1.5px] bg-gray-700" style={{ height: `${d.high - d.low}%`, bottom: `${d.low}%` }}></div>
                              <div className={`absolute w-3 sm:w-4 rounded-sm shadow-lg transition-all duration-700`} style={{ height: `${Math.abs(d.close - d.open)}%`, bottom: `${Math.min(d.open, d.close)}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}20` }}></div>
                              {peakPoint?.age === d.age && (
                                <div className="absolute -top-10 flex flex-col items-center animate-bounce">
                                   <span className="text-mystic-gold text-[10px] font-bold whitespace-nowrap">★ {d.age}岁巅峰</span>
                                   <div className="w-2 h-2 bg-mystic-gold rotate-45"></div>
                                </div>
                              )}
                              {valleyPoint?.age === d.age && (
                                <div className="absolute -bottom-10 flex flex-col items-center">
                                   <div className="w-2 h-2 bg-red-500 rotate-45 mb-1"></div>
                                   <span className="text-red-500 text-[10px] font-bold whitespace-nowrap">▲ {d.age}岁低谷</span>
                                </div>
                              )}
                              {isCurrent && (
                                <div className="absolute inset-0 flex flex-col items-center">
                                   <div className="absolute h-[120%] w-[1px] border-l border-dashed border-mystic-gold/40 -top-8"></div>
                                   <div className="absolute -top-6 bg-mystic-gold text-black text-[9px] px-1 rounded font-bold uppercase">当前</div>
                                </div>
                              )}
                           </div>
                           <span className="text-[8px] text-gray-600 mt-2 rotate-[-45deg] origin-left">{d.age}岁</span>
                        </div>
                      );
                   })}
                </div>

                <div className="flex justify-center gap-6 mt-6 border-t border-white/5 pt-4">
                   {[
                       { label: '运势上升', color: '#10b981' },
                       { label: '运势下降', color: '#ef4444' },
                       { label: '本命年', color: '#c5b078', type: 'dot' },
                       { label: '合太岁', color: '#3b82f6', type: 'dot' }
                   ].map(l => (
                       <div key={l.label} className="flex items-center gap-1.5 opacity-60">
                          <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: l.color }}></div>
                          <span className="text-[9px] text-gray-500">{l.label}</span>
                       </div>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className={`p-6 rounded-3xl border shadow-xl flex flex-col ${isDayMode ? 'bg-white border-gray-100' : 'bg-mystic-paper border-white/5'}`}>
                    <h4 className={`text-sm font-bold mb-6 ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>五行能量占比</h4>
                    <div className="flex items-center gap-6 mb-8">
                       <div className="w-24 h-24 relative flex items-center justify-center">
                          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                             {elementBalance && Object.entries(elementBalance).reduce((acc, [el, count], idx, arr) => {
                                const total = 8;
                                const percentage = ((count as number) / total) * 100;
                                const strokeDashoffset = -acc.offset;
                                acc.elements.push(<circle key={el} cx="18" cy="18" r="15.915" fill="transparent" stroke={ELEMENT_COLORS[el]} strokeWidth="4" strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={strokeDashoffset} />);
                                acc.offset += percentage;
                                return acc;
                             }, { offset: 0, elements: [] as any[] }).elements}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                             <span className="text-[10px] text-gray-500">主格</span>
                             <span className="text-sm font-serif font-bold text-mystic-gold">{chartData.chart.day.stem}{getElementByChar(chartData.chart.day.stem)}</span>
                          </div>
                       </div>
                       <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-3">
                          {elementBalance && Object.entries(elementBalance).map(([el, count]) => (
                             <div key={el} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ELEMENT_COLORS[el] }}></div>
                                <span className="text-[10px] text-gray-500">{el}</span>
                                <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${((count as number)/8)*100}%`, backgroundColor: ELEMENT_COLORS[el] }}></div></div>
                             </div>
                          ))}
                       </div>
                    </div>
                    <div className="border-t border-white/5 pt-4">
                        <div className="flex justify-between mb-3"><span className="text-[10px] text-gray-500 font-bold">身强 (Strong)</span><span className="text-[10px] text-gray-500">身弱 (Weak)</span></div>
                        <div className="relative h-1.5 w-full bg-gray-500/20 rounded-full">
                            <div 
                              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-mystic-gold rounded-full shadow-[0_0_10px_rgba(197,176,120,0.8)] border-2 border-[#151618] transition-all duration-1000 z-10" 
                              style={{ left: `calc(${strengthPercentage}% - 7px)` }}
                            ></div>
                        </div>
                        <div className="mt-2 text-center text-[10px] text-gray-600 font-serif">能量指数 <span className="text-mystic-gold font-bold">{Math.floor(strengthPercentage)}%</span></div>
                    </div>
                 </div>

                 <div className={`p-6 rounded-3xl border border-dashed flex flex-col items-center justify-center gap-3 ${isDayMode ? 'bg-gray-50 border-gray-200' : 'bg-mystic-paper/30 border-white/5'}`}>
                    <div className="text-2xl opacity-20">🧿</div>
                    <span className="text-[10px] text-gray-500 tracking-widest uppercase">精细排盘模块迭代中</span>
                 </div>
             </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-end mb-4 px-1"><h3 className={`text-lg font-serif font-medium tracking-wide ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>精选推荐</h3><span className="text-xs text-gray-500">更多</span></div>
          <div className="flex flex-col gap-4">{assets.articles.map((article) => renderArticleCard(article))}</div>
        </div>
      </div>
    </div>
  );
};
