
import React, { useState, useMemo } from 'react';
import { YunHeLogo } from '../components/YunHeLogo';
import { Gender, UserProfile, getElementStyle, CalendarType, AppPersonality } from '../types';
import { Solar, Lunar } from 'lunar-javascript';
import { useAssets } from '../contexts/AssetContext';
import { IconPersonalityMystic, IconPersonalityPragmatic, IconPersonalityClassical } from '../components/MysticIcons';

interface RegistrationViewProps {
  onComplete: (profile: UserProfile) => void;
  onEnterAdmin: () => void;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({ onComplete, onEnterAdmin }) => {
  const [step, setStep] = useState(0); 
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [calendarType, setCalendarType] = useState<CalendarType>(CalendarType.SOLAR);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<AppPersonality>(AppPersonality.MYSTIC);

  const { assets, updateAsset } = useAssets();

  const elementInfo = useMemo(() => {
    if (!birthDate) return { char: '命', color: 'from-gray-800 to-black', border: 'border-white/10', shadow: 'shadow-none' };
    try {
        const [y, m, d] = birthDate.split('-').map(Number);
        const [h, min] = birthTime ? birthTime.split(':').map(Number) : [12, 0];
        
        let lunar: Lunar;
        if (calendarType === CalendarType.LUNAR) {
            lunar = Lunar.fromYmdHms(y, isLeapMonth ? -m : m, d, h, min, 0);
        } else {
            const solar = Solar.fromYmdHms(y, m, d, h, min, 0);
            lunar = solar.getLunar();
        }
        
        const dayGan = lunar.getEightChar().getDayGan();
        return getElementStyle(dayGan);
    } catch (e) {
        return { char: '?', color: 'from-gray-800 to-black', border: 'border-white/10', shadow: 'shadow-none' };
    }
  }, [birthDate, birthTime, calendarType, isLeapMonth]);

  const BrandingPanel = () => (
    <div className={`hidden sm:flex flex-col items-center justify-center relative overflow-hidden transition-all duration-1000 w-[45%] bg-gradient-to-br ${step >= 1 ? elementInfo.color : 'from-[#0f1110] to-[#1a1b1e]'}`}>
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
       <div className="relative z-10 animate-fade-in text-center flex flex-col items-center">
          {step === 0 ? (
            <div className="scale-110 mb-12">
               <YunHeLogo size={220} />
            </div>
          ) : (
            <div className="mb-12">
               <div className={`w-52 h-52 rounded-[3.5rem] bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl transition-transform duration-700 hover:scale-105`}>
                  <span className="text-9xl text-white font-serif">{elementInfo.char}</span>
               </div>
               <div className="mt-10">
                  <h3 className="text-mystic-gold text-sm tracking-[0.6em] uppercase font-serif">本命日主 · 天机已现</h3>
               </div>
            </div>
          )}
          <div className="max-w-xs text-white/30 text-[10px] font-serif leading-loose tracking-widest mt-6 uppercase">
             {step === 0 ? "万物有序，皆有其时。窥探命运之轮，从这里开始。" : "乾坤造化，阴阳互根。阁下之命盘正在推演中。"}
          </div>
       </div>
       <div className="absolute bottom-12 left-12 opacity-20 flex flex-col gap-1">
          <span className="text-[10px] text-white tracking-widest font-bold">DAO AI ENGINE</span>
          <span className="text-[8px] text-white/50 tracking-widest uppercase">Ancient Wisdom meets AI</span>
       </div>
    </div>
  );

  const personalities = [
    { 
        type: AppPersonality.MYSTIC, 
        name: '天机道长', 
        desc: '辞藻清雅，洞察格局。', 
        icon: <IconPersonalityMystic />,
        tags: ['古雅', '深邃', '超脱']
    },
    { 
        type: AppPersonality.PRAGMATIC, 
        name: '实战顾问', 
        desc: '玄学为引，实操为本。', 
        icon: <IconPersonalityPragmatic />,
        tags: ['商业', '落地', '认知']
    },
    { 
        type: AppPersonality.CLASSICAL, 
        name: '古籍学者', 
        desc: '文言引经，饱读诗书。', 
        icon: <IconPersonalityClassical />,
        tags: ['考据', '博学', '儒雅']
    }
  ];

  const DevModePanel = () => (
    <div className="fixed inset-0 sm:absolute sm:right-0 sm:left-auto sm:w-[400px] bg-mystic-paper/98 backdrop-blur-3xl z-[999] border-l border-white/10 shadow-2xl animate-fade-in-right flex flex-col">
       <div className="p-8 space-y-8 flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
             <div className="flex flex-col">
                <h3 className="text-mystic-gold text-lg font-bold tracking-widest uppercase">引擎配置</h3>
                <span className="text-[10px] text-gray-500 uppercase tracking-tighter">API Service Options</span>
             </div>
             <button onClick={() => setShowDevMode(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">✕</button>
          </div>
          <div className="space-y-8">
             <div className="space-y-4">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">服务商 (Provider)</label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-black/40 rounded-xl border border-white/5">
                   <button onClick={() => updateAsset('apiProvider', 'GEMINI')} className={`py-3 text-xs rounded-lg transition-all ${assets.apiProvider !== 'DEEPSEEK' ? 'bg-mystic-gold text-black font-bold' : 'text-gray-500'}`}>Google</button>
                   <button onClick={() => updateAsset('apiProvider', 'DEEPSEEK')} className={`py-3 text-xs rounded-lg transition-all ${assets.apiProvider === 'DEEPSEEK' ? 'bg-mystic-gold text-black font-bold' : 'text-gray-500'}`}>DeepSeek</button>
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">模型 (Model ID)</label>
                <input type="text" value={assets.apiModel || ''} onChange={(e) => updateAsset('apiModel', e.target.value)} placeholder={assets.apiProvider === 'DEEPSEEK' ? 'deepseek-v3' : 'gemini-3-pro-preview'} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white font-mono focus:border-mystic-gold/50 outline-none" />
             </div>
          </div>
       </div>
       <div className="p-8 border-t border-white/5 bg-black/20">
          <button onClick={() => setShowDevMode(false)} className="w-full py-5 rounded-2xl bg-mystic-gold text-black font-bold shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm">保存并应用</button>
       </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-[#0f1110] flex overflow-hidden">
      <BrandingPanel />

      <div className="flex-1 h-full flex flex-col items-center justify-center p-6 sm:p-16 relative overflow-y-auto scrollbar-hide bg-[#0f1110]">
        
        {step === 0 && (
          <div className="w-full max-w-md flex flex-col items-center animate-fade-in">
             <div className="sm:hidden mb-12">
                <YunHeLogo size={120} />
             </div>
             <div className="w-full space-y-10">
                <div className="space-y-4 pt-4">
                   <button onClick={() => setStep(1)} className="w-full bg-mystic-gold text-black font-bold text-lg py-5 rounded-2xl hover:scale-[1.02] transition-all shadow-[0_10px_30px_rgba(197,176,120,0.1)] active:scale-95">立刻登录</button>
                   <div className="flex items-center gap-4 py-2">
                      <div className="flex-1 h-[0.5px] bg-white/5"></div>
                      <span className="text-[9px] text-gray-700 uppercase tracking-[0.3em]">Or Entry via</span>
                      <div className="flex-1 h-[0.5px] bg-white/5"></div>
                   </div>
                   <button className="w-full bg-white/5 border border-white/5 text-gray-400 font-medium py-4 rounded-2xl hover:bg-white/10 transition-all">已有命书 · 登录</button>
                </div>
                <div className="pt-8 flex justify-center sm:justify-start gap-8">
                   <button onClick={() => setShowDevMode(true)} className="text-[9px] text-gray-700 hover:text-mystic-gold transition-colors tracking-widest uppercase font-serif">引擎配置</button>
                   <button onClick={onEnterAdmin} className="text-[9px] text-gray-700 hover:text-white transition-colors tracking-widest uppercase font-serif">后台管理</button>
                </div>
             </div>
          </div>
        )}

        {step === 1 && (
          <div className="w-full max-w-xl animate-fade-in-up">
             <button onClick={() => setStep(0)} className="text-gray-600 text-sm w-fit mb-12 hover:text-white transition-colors flex items-center gap-2">
                <span className="text-xl">❮</span> 返回
             </button>
             <div className="mb-12">
                <h2 className="text-3xl text-white font-serif font-light tracking-widest mb-2">录入生辰</h2>
                <p className="text-gray-500 text-sm">精确的时间有助于 AI 更准确地分析您的五行格局。</p>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
                <div className="space-y-2 group">
                   <label className="text-[10px] text-gray-600 uppercase tracking-widest font-bold ml-1 group-focus-within:text-mystic-gold transition-colors">姓名 (Name)</label>
                   <input type="text" placeholder="如何称呼阁下" className="w-full bg-transparent border-b border-gray-800 focus:border-mystic-gold outline-none py-3 text-lg text-white transition-all" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] text-gray-600 uppercase tracking-widest font-bold ml-1">性别 (Gender)</label>
                   <div className="flex h-12 bg-white/5 rounded-xl p-1 mt-1">
                      <button onClick={() => setGender(Gender.MALE)} className={`flex-1 rounded-lg text-sm transition-all ${gender === Gender.MALE ? 'bg-mystic-gold text-black font-bold' : 'text-gray-500'}`}>乾造 (男)</button>
                      <button onClick={() => setGender(Gender.FEMALE)} className={`flex-1 rounded-lg text-sm transition-all ${gender === Gender.FEMALE ? 'bg-mystic-gold text-black font-bold' : 'text-gray-500'}`}>坤造 (女)</button>
                   </div>
                </div>
                <div className="space-y-2 group">
                   <label className={`text-[10px] uppercase tracking-widest font-bold ml-1 transition-colors ${showError && !birthDate ? 'text-red-500' : 'text-gray-600 group-focus-within:text-mystic-gold'}`}>出生日期 *</label>
                   <input type="date" className={`w-full bg-transparent border-b outline-none py-3 text-lg text-white transition-all ${showError && !birthDate ? 'border-red-500/50' : 'border-gray-800 focus:border-mystic-gold'}`} value={birthDate} onChange={(e) => { setBirthDate(e.target.value); setShowError(false); }} />
                </div>
                <div className="space-y-2 group">
                   <label className="text-[10px] text-gray-600 uppercase tracking-widest font-bold ml-1 group-focus-within:text-mystic-gold transition-colors">出生时间</label>
                   <input type="time" className="w-full bg-transparent border-b border-gray-800 focus:border-mystic-gold outline-none py-3 text-lg text-white transition-all" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
                </div>
             </div>
             <div className="mt-20">
                <button onClick={() => { if (!birthDate) { setShowError(true); return; } setStep(2); }} className="w-full bg-mystic-gold text-black font-bold text-lg py-5 rounded-2xl hover:brightness-110 shadow-xl active:scale-95 transition-all">下一步</button>
             </div>
          </div>
        )}

        {step === 2 && (
            <div className="w-full max-w-2xl animate-fade-in-up">
                <button onClick={() => setStep(1)} className="text-gray-600 text-sm w-fit mb-12 hover:text-white transition-colors flex items-center gap-2">
                    <span className="text-xl">❮</span> 返回
                </button>
                <div className="mb-10 text-center">
                    <h2 className="text-3xl text-white font-serif font-light tracking-widest mb-4">请择一推演人格</h2>
                    <p className="text-gray-500 text-sm">不同的人格将以截然不同的视角与文风为您解惑。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
                    {personalities.map((p) => (
                        <div 
                            key={p.type}
                            onClick={() => setSelectedPersonality(p.type)}
                            className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col items-center text-center ${selectedPersonality === p.type ? 'bg-mystic-gold/10 border-mystic-gold shadow-[0_0_20px_rgba(197,176,120,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                        >
                            <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                {p.icon}
                            </div>
                            <h3 className={`text-lg font-bold mb-2 ${selectedPersonality === p.type ? 'text-mystic-gold' : 'text-gray-200'}`}>{p.name}</h3>
                            <p className="text-xs text-gray-500 mb-4 h-8 flex items-center">{p.desc}</p>
                            <div className="flex flex-wrap gap-1 justify-center">
                                {p.tags.map(tag => <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/40 text-gray-500">{tag}</span>)}
                            </div>
                            {selectedPersonality === p.type && (
                                <div className="absolute top-3 right-3 text-mystic-gold text-xs font-bold bg-mystic-gold/10 px-1.5 py-0.5 rounded-full">✓</div>
                            )}
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => {
                        updateAsset('activePersonality', selectedPersonality);
                        onComplete({ name: name || '缘主', gender, birthDate, birthTime: birthTime || '12:00', birthPlace: '北京', calendarType, isLeapMonth, personality: selectedPersonality });
                    }} 
                    className="w-full bg-mystic-gold text-black font-bold text-lg py-5 rounded-2xl hover:brightness-110 shadow-xl active:scale-95 transition-all"
                >
                    开启命盘推演
                </button>
            </div>
        )}

        {showDevMode && <DevModePanel />}
      </div>
    </div>
  );
};
