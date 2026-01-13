
import React, { useState, useMemo } from 'react';
import { YunHeLogo } from '../components/YunHeLogo';
import { Gender, UserProfile, getElementStyle } from '../types';
import { Solar } from 'lunar-javascript';
import { useAssets } from '../contexts/AssetContext';

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
  const [showError, setShowError] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);

  const { assets, updateAsset } = useAssets();

  const elementInfo = useMemo(() => {
    if (!birthDate) return { char: '命', color: 'from-gray-800 to-black', border: 'border-white/10', shadow: 'shadow-none' };
    try {
        const [y, m, d] = birthDate.split('-').map(Number);
        const [h, min] = birthTime ? birthTime.split(':').map(Number) : [12, 0];
        const solar = Solar.fromYmdHms(y, m, d, h, min, 0);
        const dayGan = solar.getLunar().getEightChar().getDayGan();
        return getElementStyle(dayGan);
    } catch (e) {
        return { char: '?', color: 'from-gray-800 to-black', border: 'border-white/10', shadow: 'shadow-none' };
    }
  }, [birthDate, birthTime]);

  if (step === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-between py-24 px-8 bg-[#0f1110] relative">
         <div className="flex-1 flex flex-col justify-center transform -translate-y-10">
            <YunHeLogo size={140} />
         </div>

         {showDevMode ? (
            <div className="w-full bg-mystic-paper p-6 rounded-3xl border border-mystic-gold/20 space-y-5 mb-12 animate-fade-in-up shadow-2xl">
               <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-mystic-gold text-xs font-bold tracking-widest uppercase">模型竞技场</h3>
                  <button onClick={() => setShowDevMode(false)} className="text-gray-500 text-xs hover:text-white">关闭</button>
               </div>
               
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] text-gray-500 ml-1">选择引擎</label>
                     <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                        <button 
                           onClick={() => {
                              updateAsset('apiProvider', 'GEMINI');
                              updateAsset('apiModel', 'gemini-3-flash-preview');
                           }}
                           className={`flex-1 py-2 text-[10px] rounded-lg transition-all ${assets.apiProvider !== 'DEEPSEEK' ? 'bg-mystic-gold text-black font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                        >Gemini</button>
                        <button 
                           onClick={() => {
                              updateAsset('apiProvider', 'DEEPSEEK');
                              updateAsset('apiModel', 'deepseek-chat');
                           }}
                           className={`flex-1 py-2 text-[10px] rounded-lg transition-all ${assets.apiProvider === 'DEEPSEEK' ? 'bg-mystic-gold text-black font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                        >DeepSeek</button>
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[10px] text-gray-500 ml-1">模型名称</label>
                     <input 
                        type="text" 
                        value={assets.apiModel || ''} 
                        onChange={(e) => updateAsset('apiModel', e.target.value)}
                        placeholder={assets.apiProvider === 'DEEPSEEK' ? 'deepseek-chat' : 'gemini-3-flash-preview'}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-mystic-gold/50 outline-none font-mono"
                     />
                  </div>

                  {assets.apiProvider === 'DEEPSEEK' && (
                     <div className="space-y-3 animate-fade-in">
                        <div className="space-y-1">
                           <label className="text-[10px] text-gray-500 ml-1">DeepSeek API Key</label>
                           <input 
                              type="password" 
                              value={assets.customApiKey || ''} 
                              onChange={(e) => updateAsset('customApiKey', e.target.value)}
                              placeholder="sk-..."
                              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-mystic-gold/50 outline-none font-mono"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] text-gray-500 ml-1">API Endpoint</label>
                           <input 
                              type="text" 
                              value={assets.apiBaseUrl || ''} 
                              onChange={(e) => updateAsset('apiBaseUrl', e.target.value)}
                              placeholder="https://api.deepseek.com"
                              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-mystic-gold/50 outline-none font-mono text-[10px]"
                           />
                        </div>
                     </div>
                  )}
               </div>
            </div>
         ) : (
            <div className="w-full space-y-5 mb-12">
               <button onClick={() => setStep(1)} className="w-full bg-[#e8cfa1] text-black font-medium text-lg py-4 rounded-lg hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(232,207,161,0.2)]">注册</button>
               <div className="text-center pt-2">
                  <span className="text-gray-500 text-sm">已经有账号了？</span>
                  <button className="text-[#e8cfa1] text-sm ml-2 font-medium">登录</button>
               </div>
               <button 
                  onClick={() => setShowDevMode(true)} 
                  className="w-full text-[10px] text-gray-700 hover:text-gray-400 transition-colors tracking-[0.3em] uppercase mt-4 font-serif"
               >
                  Developer Mode · {assets.apiProvider || 'GEMINI'}
               </button>
            </div>
         )}
         
         <div className="absolute top-8 right-8 text-gray-500 border border-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs cursor-pointer">?</div>
         <button onClick={onEnterAdmin} className="absolute bottom-6 text-[10px] text-gray-800 hover:text-gray-600 transition-colors uppercase tracking-widest">后台管理</button>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="w-full h-full flex flex-col px-8 pt-12 pb-12 bg-[#0f1110] overflow-y-auto">
         <button onClick={() => setStep(0)} className="text-gray-400 text-2xl w-fit mb-8 hover:text-white transition-colors">❮</button>
         <div className="flex justify-center mb-10">
            <span className="flex gap-3">
               <div className="w-2 h-2 rounded-full bg-gray-700"></div>
               <div className="w-2 h-2 rounded-full bg-[#e8cfa1] shadow-[0_0_8px_rgba(232,207,161,0.5)]"></div>
               <div className="w-2 h-2 rounded-full bg-gray-700"></div>
            </span>
         </div>
         <h2 className="text-3xl text-white text-center mb-12 font-medium tracking-widest font-serif">个人信息</h2>
         <div className="flex justify-center mb-16">
            <div className={`w-28 h-28 bg-gradient-to-br ${elementInfo.color} rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.3)] ${elementInfo.shadow} border ${elementInfo.border} transition-all duration-700`}>
               <span className="text-5xl text-white/90 font-serif animate-fade-in">{elementInfo.char}</span>
            </div>
            {birthDate && <div className="absolute mt-32 text-xs text-gray-500 tracking-widest uppercase font-serif">本命日主</div>}
         </div>
         <div className="space-y-10 px-2 flex-1">
            <div className="border-b border-gray-800 pb-2 flex justify-between items-center group focus-within:border-[#e8cfa1] transition-colors">
               <span className="text-gray-800 select-none text-lg">Name</span>
               <input type="text" placeholder="请输入姓名" className="bg-transparent outline-none text-white text-right placeholder-gray-600 w-full text-lg font-light tracking-wide" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={`border-b pb-2 flex justify-between items-center relative group focus-within:border-[#e8cfa1] transition-colors ${showError && !birthDate ? 'border-red-500/50' : 'border-gray-800'}`}>
               <span className="text-gray-800 text-sm font-bold absolute left-0 bottom-5 pointer-events-none opacity-20">Date</span>
               <input type="date" className="bg-transparent outline-none text-white text-right w-full placeholder-transparent text-lg font-light tracking-wide z-10" value={birthDate} onChange={(e) => { setBirthDate(e.target.value); setShowError(false); }} />
               {!birthDate && <span className="absolute right-0 text-gray-600 pointer-events-none text-lg font-light">出生日期 <span className="text-[#e8cfa1]">*</span></span>}
            </div>
            <div className={`border-b pb-2 flex justify-between items-center relative group focus-within:border-[#e8cfa1] transition-colors border-gray-800`}>
               <span className="text-gray-800 text-sm font-bold absolute left-0 bottom-5 pointer-events-none opacity-20">Time</span>
               <input type="time" className="bg-transparent outline-none text-white text-right w-full placeholder-transparent text-lg font-light tracking-wide z-10" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
               {!birthTime && <span className="absolute right-0 text-gray-600 pointer-events-none text-lg font-light">出生时间</span>}
            </div>
            <div className="border-b border-gray-800 pb-2 flex justify-between items-center relative">
               <span className="text-gray-800 text-sm font-bold absolute left-0 bottom-5 pointer-events-none opacity-20">Gender</span>
               <div className="flex gap-10 w-full justify-end">
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                     <span className={`text-lg transition-colors ${gender === Gender.MALE ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>男</span>
                     <div onClick={() => setGender(Gender.MALE)} className={`w-6 h-6 rounded border transition-all duration-300 flex items-center justify-center ${gender === Gender.MALE ? 'bg-[#e8cfa1] border-[#e8cfa1] scale-110' : 'border-gray-600'}`}>
                        {gender === Gender.MALE && <span className="text-black text-xs font-bold">✓</span>}
                     </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                     <span className={`text-lg transition-colors ${gender === Gender.FEMALE ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>女</span>
                     <div onClick={() => setGender(Gender.FEMALE)} className={`w-6 h-6 rounded border transition-all duration-300 flex items-center justify-center ${gender === Gender.FEMALE ? 'bg-[#e8cfa1] border-[#e8cfa1] scale-110' : 'border-gray-600'}`}>
                         {gender === Gender.FEMALE && <span className="text-black text-xs font-bold">✓</span>}
                     </div>
                  </label>
               </div>
            </div>
         </div>
         <p className="text-gray-600/60 text-xs mt-8 mb-6 px-2 text-center tracking-wider">你的信息将不会公开显示</p>
         <div className="mt-auto mb-4">
            <button onClick={() => { if (!birthDate) { setShowError(true); return; } onComplete({ name: name || '用户', gender, birthDate, birthTime: birthTime || '12:00', birthPlace: '北京' }); }} className={`w-full bg-[#e8cfa1] text-black font-medium text-lg py-4 rounded-xl hover:bg-[#d6bc8b] transition-all shadow-lg active:scale-[0.98] ${!birthDate ? 'opacity-90' : ''}`}>进入运何</button>
         </div>
      </div>
    );
  }
  return null;
};
