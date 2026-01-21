
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppMode, Article, Gender, getElementStyle } from '../types';
import { useAssets, isImageUrl } from '../contexts/AssetContext';
import { useBaZi } from '../contexts/BaZiContext';
import { IconMarriage, IconCareer, IconHealth, IconExam, IconFortune, IconBookmark, IconShare } from '../components/MysticIcons';

interface HomeViewProps {
  onNavigate: (mode: AppMode, question?: string) => void;
  isDayMode?: boolean;
}

type FilterType = 'ALL' | 'FORTUNE' | 'ROMANCE' | 'HEALTH';

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

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, isDayMode = false }) => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [chartFilter, setChartFilter] = useState<FilterType>('ALL');
  const { assets } = useAssets();
  const { chartData, setViewMode, setEditTab } = useBaZi();
  
  const chartScrollRef = useRef<HTMLDivElement>(null);

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

  const strengthPercentage = useMemo(() => {
    if (!chartData?.chart) return 50;
    const { year, month, day, hour } = chartData.chart;
    const selfElement = getElementByChar(day.stem);
    const { parent, sibling } = ELEMENT_RELATIONS[selfElement];
    
    // 提升提纲（月令）的权重
    const positions = [
      { char: year.stem, weight: 8 }, { char: year.branch, weight: 8 },
      { char: month.stem, weight: 12 }, { char: month.branch, weight: 40 }, // 月令40%
      { char: day.stem, weight: 0 }, { char: day.branch, weight: 12 },
      { char: hour.stem, weight: 10 }, { char: hour.branch, weight: 10 }
    ];
    
    let totalSupport = 0;
    positions.forEach(p => {
      const e = getElementByChar(p.char);
      if (e === parent || e === sibling) totalSupport += p.weight;
    });
    
    // 基础偏移量，避免因为没有同党就显示极低分，或者全是同党就100%
    const baseVal = 25; 
    const scaledVal = (totalSupport / 100) * 75;
    
    return Math.min(98, Math.max(2, baseVal + scaledVal));
  }, [chartData]);

  const luckKLineData = useMemo(() => {
    if (!chartData?.chart) return [];
    
    if (chartFilter === 'ALL') {
      const raw = chartData.chart.daYun.map((dy, i) => {
        const base = 35 + (Math.sin(i * 0.9) * 35);
        const noise = (seededRandom(i + 100) - 0.5) * 20;
        const close = Math.max(15, Math.min(95, base + noise));
        const high = Math.min(100, close + seededRandom(i + 200) * 15);
        const low = Math.max(0, close - seededRandom(i + 300) * 15);
        return { label: dy.ganZhi, open: 0, close, high, low, age: dy.startAge, year: dy.startYear, isYearly: false };
      });
      for (let i = 0; i < raw.length; i++) { raw[i].open = i === 0 ? 30 : raw[i-1].close; }
      return raw;
    } else {
      const allYears = chartData.chart.daYun.flatMap(dy => dy.liuNian);
      const filtered = allYears.filter(ln => Math.abs(ln.year - currentYear) <= 15);
      const categorySeed = chartFilter === 'FORTUNE' ? 1000 : chartFilter === 'ROMANCE' ? 2000 : 3000;

      const raw = filtered.map((ln, i) => {
        const base = 40 + (Math.sin((ln.year % 12) * 0.8) * 30);
        const noise = (seededRandom(ln.year + categorySeed) - 0.5) * 25;
        const close = Math.max(10, Math.min(95, base + noise));
        const high = Math.min(100, close + seededRandom(ln.year + categorySeed + 50) * 12);
        const low = Math.max(0, close - seededRandom(ln.year + categorySeed + 100) * 12);
        return { label: ln.ganZhi, open: 0, close, high, low, age: ln.age, year: ln.year, isYearly: true };
      });
      for (let i = 0; i < raw.length; i++) { raw[i].open = i === 0 ? 35 : raw[i-1].close; }
      return raw;
    }
  }, [chartData, chartFilter, currentYear]);

  useEffect(() => {
    if (chartScrollRef.current && luckKLineData.length > 0) {
      const container = chartScrollRef.current;
      const points = luckKLineData;
      let currentIndex = -1;

      if (chartFilter === 'ALL') {
        currentIndex = points.findIndex((d, idx) => 
          d.age <= currentAge && (idx === points.length - 1 || points[idx+1].age > currentAge)
        );
      } else {
        currentIndex = points.findIndex(d => d.year === currentYear);
      }

      if (currentIndex !== -1) {
        const pointWidth = 42; 
        const scrollOffset = (currentIndex * pointWidth) + 32 - (container.offsetWidth / 2) + (pointWidth / 2);
        container.scrollTo({
          left: scrollOffset,
          behavior: 'smooth'
        });
      }
    }
  }, [luckKLineData, chartFilter, currentYear, currentAge]);

  const categories = [
    { name: '婚嫁', icon: <IconMarriage />, question: '请帮我从合盘的角度分析一下我的姻缘和婚姻运势。' },
    { name: '仕途', icon: <IconCareer />, question: '请帮我分析一下我的事业发展和官运。' },
    { name: '健康', icon: <IconHealth />, question: '请帮我分析一下我的身体健康状况和注意事项。' },
    { name: '考试', icon: <IconExam />, question: '请帮我分析一下我的学业运势和考试运。' },
  ];

  const handleCategoryClick = (cat: any) => {
      if (cat.name === '婚嫁') {
          setViewMode('EDIT');
          setEditTab('ROSTER');
      }
      onNavigate(AppMode.BAZI, cat.question);
  };

  const handleKLinePointClick = (d: any) => {
      let topic = "整体";
      if (chartFilter === 'FORTUNE') topic = "财运与事业";
      if (chartFilter === 'ROMANCE') topic = "感情与姻缘";
      if (chartFilter === 'HEALTH') topic = "健康与体质";

      const q = d.isYearly 
          ? `请重点分析我 ${d.year} [${d.label}] 年的${topic}运势，以及需要注意的避坑指南。`
          : `请分析我从 ${d.age} 岁到 ${d.age + 9} 岁这一段 [${d.label}] 大运的${topic}走势及核心建议。`;
      onNavigate(AppMode.BAZI, q);
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
                <div className="flex justify-between items-center mb-10 flex-row gap-4">
                   <div className="flex items-center gap-3">
                      <div>
                         <h4 className={`text-base font-serif font-bold ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>人生K线图</h4>
                         <p className="text-[10px] text-gray-500 font-serif">
                            {chartFilter === 'ALL' ? '大运周期可视化' : '流年趋势波动图'}
                         </p>
                      </div>
                   </div>
                   <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 overflow-x-auto scrollbar-hide">
                       {([['大运','ALL'],['财运','FORTUNE'],['感情','ROMANCE'],['健康','HEALTH']] as const).map(([label, val]) => (
                           <button key={val} onClick={() => setChartFilter(val)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${chartFilter === val ? 'bg-mystic-gold text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{label}</button>
                       ))}
                   </div>
                </div>

                <div 
                    ref={chartScrollRef}
                    className="relative overflow-x-auto scroll-smooth scrollbar-hide -mx-2 touch-pan-x"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    <div 
                      className="h-56 flex items-end justify-between gap-1 relative pt-10 pb-12 px-8" 
                      style={{ minWidth: luckKLineData.length > 0 ? `${luckKLineData.length * 42 + 64}px` : '100%' }}
                    >
                        {/* Y-axis labels - Fixed left */}
                        <div className="sticky left-0 inset-y-0 flex flex-col justify-between pointer-events-none pb-12 pt-10 z-30">
                            <span className="text-[9px] text-gray-700 bg-mystic-dark/80 px-1 rounded">100</span>
                            <span className="text-[9px] text-gray-700 bg-mystic-dark/80 px-1 rounded">0</span>
                        </div>

                        {/* Background Lines */}
                        <div className="absolute inset-x-0 top-10 h-[1px] bg-white/5 pointer-events-none"></div>
                        <div className="absolute inset-x-0 bottom-12 h-[1px] bg-white/5 pointer-events-none"></div>

                        {luckKLineData.map((d, idx) => {
                            const isUp = d.close >= d.open;
                            const color = isUp ? '#10b981' : '#ef4444';
                            const isCurrent = d.isYearly ? (d.year === currentYear) : (d.age <= currentAge && (idx === luckKLineData.length - 1 || luckKLineData[idx+1].age > currentAge));
                            return (
                                <div key={idx} onClick={() => handleKLinePointClick(d)} className="flex-1 h-full flex flex-col items-center group/kline relative cursor-pointer active:scale-95 transition-transform">
                                    <div className="w-full h-full relative flex items-center justify-center">
                                        <div className="absolute w-[1px] bg-gray-700/50" style={{ height: `${d.high - d.low}%`, bottom: `${d.low}%` }}></div>
                                        <div className={`absolute w-full max-w-[16px] rounded-sm shadow-lg transition-all duration-700 group-hover/kline:brightness-125`} style={{ height: `${Math.max(2, Math.abs(d.close - d.open))}%`, bottom: `${Math.min(d.open, d.close)}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}20` }}></div>
                                        
                                        {isCurrent && (
                                            <div className="absolute inset-0 flex flex-col items-center pointer-events-none z-20">
                                                <div className="absolute h-[115%] w-[1.5px] border-l border-dashed border-mystic-gold/60 -top-8"></div>
                                                <div className="absolute -top-7 bg-mystic-gold text-black text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-xl scale-90">当前</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-10 flex flex-col items-center">
                                        <span className={`text-[9px] text-gray-500 whitespace-nowrap transition-colors ${isCurrent ? 'text-mystic-gold font-bold' : ''}`}>
                                            {d.isYearly ? d.year : `${d.age}岁`}
                                        </span>
                                        {!d.isYearly && <span className="text-[8px] text-gray-700">{d.label}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-center gap-6 mt-8 border-t border-white/5 pt-4">
                   {[
                       { label: '运势上升', color: '#10b981' },
                       { label: '运势下降', color: '#ef4444' }
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
                    <h4 className={`text-sm font-bold mb-6 ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>五行能量分布</h4>
                    <div className="flex items-center gap-6">
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
                             <span className="text-[10px] text-gray-500">主元</span>
                             <span className="text-sm font-serif font-bold text-mystic-gold">{chartData.chart.day.stem}{getElementByChar(chartData.chart.day.stem)}</span>
                          </div>
                       </div>
                       <div className="flex-1 flex flex-col justify-center">
                          {elementBalance && Object.entries(elementBalance).map(([el, count]) => (
                             <div key={el} className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ELEMENT_COLORS[el] }}></div>
                                <span className="text-[10px] text-gray-500 w-4">{el}</span>
                                <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${((count as number)/8)*100}%`, backgroundColor: ELEMENT_COLORS[el] }}></div></div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className={`p-6 rounded-3xl border shadow-xl flex flex-col relative overflow-hidden group cursor-pointer active:scale-95 transition-all ${isDayMode ? 'bg-white border-gray-100' : 'bg-mystic-paper border-white/5'}`} onClick={() => onNavigate(AppMode.BAZI, `请分析一下我的命盘气象，是身强还是身弱？这种格局对我未来几年的事业发展有什么影响？`)}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-mystic-gold/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h4 className={`text-sm font-bold ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>命格能量指数</h4>
                        <span className="text-[10px] text-mystic-gold border border-mystic-gold/20 px-2 py-0.5 rounded-full uppercase tracking-widest">能量测算</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-3">
                            <div className="flex flex-col">
                                <span className={`text-3xl font-serif font-bold ${isDayMode ? 'text-gray-800' : 'text-white'}`}>{Math.floor(strengthPercentage)}%</span>
                                <span className="text-[10px] text-gray-500">相对平衡度</span>
                            </div>
                            <div className="text-right">
                                <span className={`text-lg font-serif font-bold ${strengthPercentage > 50 ? 'text-mystic-gold' : 'text-gray-400'}`}>{strengthPercentage > 50 ? '身强' : '身弱'}</span>
                                <p className="text-[9px] text-gray-600">{chartData.chart.qiYun}</p>
                            </div>
                        </div>

                        <div className="relative h-2 w-full bg-gray-500/10 rounded-full overflow-hidden mb-4">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-mystic-gold/10 to-transparent"></div>
                            <div 
                              className="absolute top-0 left-0 h-full bg-mystic-gold rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(197,176,120,0.5)]" 
                              style={{ width: `${strengthPercentage}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                         <span className="text-[9px] text-gray-600 uppercase tracking-widest">点击查看深度解析</span>
                         <span className="text-mystic-gold text-lg">→</span>
                    </div>
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
