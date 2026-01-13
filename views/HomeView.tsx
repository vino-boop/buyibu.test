
import React, { useState } from 'react';
import { AppMode, Article } from '../types';
import { useAssets, isImageUrl } from '../contexts/AssetContext';
import { IconMarriage, IconCareer, IconHealth, IconExam, IconFortune, IconBookmark, IconShare } from '../components/MysticIcons';

interface HomeViewProps {
  onNavigate: (mode: AppMode, question?: string) => void;
  isDayMode?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, isDayMode = false }) => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const { assets } = useAssets();

  const categories = [
    { name: '婚嫁', icon: <IconMarriage />, question: '请帮我分析一下我的姻缘和婚姻运势。' },
    { name: '仕途', icon: <IconCareer />, question: '请帮我分析一下我的事业发展和官运。' },
    { name: '健康', icon: <IconHealth />, question: '请帮我分析一下我的身体健康状况和注意事项。' },
    { name: '考试', icon: <IconExam />, question: '请帮我分析一下我的学业运势和考试运。' },
  ];

  const renderArticleCard = (article: Article) => {
      const cardBg = isDayMode ? 'bg-white shadow-md border-gray-100' : 'bg-[#1e2023] shadow-lg border-white/5';
      const titleColor = isDayMode ? 'text-gray-800' : 'text-white';
      const subtitleColor = isDayMode ? 'text-gray-500' : 'text-gray-400';

      if (article.layout === 'vertical_split') {
          return (
              <div 
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className={`rounded-3xl p-5 active:scale-[0.98] transition-all cursor-pointer border relative overflow-hidden group ${cardBg}`}
              >
                  <div className="mb-4">
                      <h3 className={`text-xl font-light tracking-wide ${titleColor}`}>{article.title}</h3>
                  </div>
                  
                  <div className="flex gap-4 h-24">
                      <div className="flex gap-2 w-1/2">
                         {(article.images || []).map((img, idx) => (
                             <div key={idx} className="flex-1 h-full rounded bg-black/40 overflow-hidden relative border border-white/5">
                                 <img src={img} className="w-full h-full object-cover opacity-80 mix-blend-luminosity" alt="" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-mystic-gold/20 to-transparent"></div>
                             </div>
                         ))}
                      </div>

                      <div className="flex-1 flex flex-col justify-center items-end text-right">
                          <span className={`text-[10px] mb-1 ${subtitleColor}`}>{article.subtitle}</span>
                          <span className={`text-2xl font-serif leading-none ${titleColor}`}>{article.readTime}</span>
                          <div className={`w-8 h-[1px] mt-2 ${isDayMode ? 'bg-gray-200' : 'bg-white/20'}`}></div>
                      </div>
                  </div>
              </div>
          );
      }

      if (article.layout === 'wide') {
          return (
              <div 
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="bg-black rounded-3xl h-40 shadow-lg active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group"
              >
                  {article.images && article.images[0] && (
                      <img src={article.images[0]} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                  <div className="absolute inset-0 p-6 flex flex-col justify-center items-end">
                       <h3 className="text-2xl font-serif text-white tracking-widest drop-shadow-md text-right w-2/3 leading-snug">
                           {article.title}
                       </h3>
                  </div>
              </div>
          );
      }

      if (article.layout === 'quote') {
           return (
              <div 
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className={`rounded-3xl p-6 active:scale-[0.98] transition-all cursor-pointer border relative overflow-hidden flex gap-4 items-center ${cardBg}`}
              >
                  <div className={`absolute -left-10 -bottom-10 w-40 h-40 rounded-full blur-3xl opacity-10 ${isDayMode ? 'bg-mystic-gold' : 'bg-white'}`}></div>
                  <div className="shrink-0">
                      <div className={`text-4xl opacity-80 ${isDayMode ? 'text-gray-300' : 'text-gray-400'}`}>☰</div> 
                  </div>
                  <div className="flex-1">
                      <h3 className={`text-lg font-serif tracking-widest mb-2 ${titleColor}`}>{article.title}</h3>
                      <div className={`text-[10px] leading-relaxed line-clamp-4 font-serif opacity-80 ${subtitleColor}`}>
                          {article.content}
                      </div>
                  </div>
              </div>
           );
      }

      return (
          <div 
             key={article.id}
             onClick={() => setSelectedArticle(article)}
             className={`rounded-2xl p-4 border active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden ${isDayMode ? 'bg-white border-gray-100 shadow-sm' : 'bg-mystic-paper border-white/5 shadow-lg'}`}
          >
             <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${article.gradient} opacity-20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity`}></div>
             <div className="flex gap-4">
                <div className="flex-1 flex flex-col justify-between">
                   <div>
                      <div className="flex items-center gap-2 mb-2">
                         <span className={`text-[10px] px-2 py-0.5 rounded border ${isDayMode ? 'text-gray-500 bg-gray-50 border-gray-100' : 'text-gray-400 bg-black/20 border-white/10'}`}>
                            {article.category}
                         </span>
                      </div>
                      <h4 className={`text-base font-medium leading-snug mb-2 group-hover:text-mystic-gold transition-colors line-clamp-2 ${titleColor}`}>
                         {article.title}
                      </h4>
                      <p className={`text-xs line-clamp-2 leading-relaxed ${subtitleColor}`}>
                         {article.subtitle}
                      </p>
                   </div>
                </div>
                <div className={`w-20 h-24 rounded-lg shrink-0 bg-gradient-to-br ${article.gradient} relative overflow-hidden border border-white/5 shadow-inner`}>
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${assets.background_texture})` }}></div>
                </div>
             </div>
          </div>
      );
  };

  if (selectedArticle) {
    return (
       <div className={`w-full h-full flex flex-col animate-fade-in-up overflow-hidden relative transition-colors duration-300 ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-mystic-dark'}`}>
          <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/80 to-transparent">
             <button 
                onClick={() => setSelectedArticle(null)}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-gray-200 hover:text-white transition-colors"
             >
                ✕
             </button>
             <div className="flex gap-3">
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-gray-200 hover:text-white transition-colors p-2.5">
                   <IconBookmark />
                </button>
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-gray-200 hover:text-white transition-colors p-2.5">
                   <IconShare />
                </button>
             </div>
          </div>

          <div className={`w-full h-64 shrink-0 relative bg-gradient-to-br ${selectedArticle.gradient}`}>
             {selectedArticle.images && selectedArticle.images[0] && (
                 <img src={selectedArticle.images[0]} className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" alt="" />
             )}
             <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${assets.background_texture})` }}></div>
             
             <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-mystic-dark to-transparent pt-20">
                <div className="text-mystic-gold text-xs font-bold tracking-widest mb-2 border border-mystic-gold/30 rounded-full px-2 py-0.5 w-fit uppercase">
                   {selectedArticle.category}
                </div>
                <h1 className="text-3xl font-serif text-white font-bold leading-tight mb-2 text-shadow-sm">
                   {selectedArticle.title}
                </h1>
                <p className="text-gray-300 text-sm">
                   {selectedArticle.subtitle}
                </p>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 scrollbar-hide">
             <div className={`leading-relaxed whitespace-pre-wrap font-light ${isDayMode ? 'text-gray-700' : 'text-gray-300'}`}>
                {selectedArticle.content}
             </div>
             <div className="mt-12 pt-8 border-t border-white/5 text-center">
                <p className="text-gray-600 text-xs">内容仅供民俗文化参考</p>
             </div>
          </div>
       </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col space-y-6 pb-6 overflow-y-auto scrollbar-hide transition-colors duration-300 ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-[#0f1110]'}`}>
      <div 
        onClick={() => onNavigate(AppMode.BAZI, '请结合我的命盘，分析今日运势。重点包括：\n1. 今日五行与我命盘的生克关系\n2. 今日穿衣旺运颜色\n3. 今日宜做什么、忌做什么')}
        className={`relative w-full h-48 shrink-0 rounded-b-[2rem] overflow-hidden shadow-2xl group cursor-pointer mb-2 active:scale-[0.99] transition-transform border-b ${isDayMode ? 'border-mystic-gold/5' : 'border-mystic-gold/10'}`}
      >
        {assets.home_banner ? (
            <img src={assets.home_banner} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
        ) : (
            <div className={`absolute inset-0 ${isDayMode ? 'bg-gradient-to-br from-white via-gray-50 to-gray-100' : 'bg-gradient-to-br from-[#1a1c20] via-[#0f1110] to-black'}`}></div>
        )}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        <div className="absolute inset-0 p-8 flex flex-col justify-center items-center text-center">
          <div className={`w-14 h-14 mb-2 rounded-2xl border flex items-center justify-center backdrop-blur-md shadow-inner transition-colors ${isDayMode ? 'bg-white/60 border-mystic-gold/20' : 'bg-black/40 border-mystic-gold/30'}`}>
              <IconFortune className="w-8 h-8" />
          </div>
          <h3 className={`text-2xl font-serif font-light tracking-[0.2em] drop-shadow-lg ${isDayMode ? 'text-gray-800' : 'text-white'}`}>今日运势</h3>
          <p className="text-mystic-gold text-xs mt-2 tracking-widest font-serif opacity-80">乙巳年 · 宜谋划 · 忌远行</p>
        </div>
      </div>

      <div className="px-4 space-y-8 pb-8">
        <div className="grid grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button 
              key={cat.name}
              onClick={() => onNavigate(AppMode.BAZI, cat.question)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-lg group-hover:-translate-y-1 transition-all duration-300 relative overflow-hidden p-3.5 ${isDayMode ? 'bg-white border-gray-100' : 'bg-[#1a1b1e] border-white/5'}`}>
                 <div className="absolute inset-0 bg-gradient-to-br from-mystic-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 {typeof cat.icon === 'string' && isImageUrl(cat.icon) ? (
                     <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                 ) : (
                     cat.icon
                 )}
              </div>
              <span className={`text-xs transition-colors tracking-wide ${isDayMode ? 'text-gray-500 group-hover:text-gray-800' : 'text-gray-500 group-hover:text-mystic-gold'}`}>{cat.name}</span>
            </button>
          ))}
        </div>

        <div>
          <div className="flex justify-between items-end mb-4 px-1">
             <h3 className={`text-lg font-serif font-medium tracking-wide ${isDayMode ? 'text-gray-800' : 'text-gray-200'}`}>精选推荐</h3>
             <span className="text-xs text-gray-500">更多</span>
          </div>
          <div className="flex flex-col gap-4">
             {assets.articles.map((article) => renderArticleCard(article))}
          </div>
          <div className="w-full py-8 text-center opacity-30">
             <div className="inline-block w-1 h-1 bg-gray-500 rounded-full mx-1"></div>
             <div className="inline-block w-1 h-1 bg-gray-500 rounded-full mx-1"></div>
             <div className="inline-block w-1 h-1 bg-gray-500 rounded-full mx-1"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
