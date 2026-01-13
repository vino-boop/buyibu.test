
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { useAssets } from '../contexts/AssetContext';

interface ProfileViewProps {
  userProfile: UserProfile;
  isDayMode: boolean;
  onThemeToggle: () => void;
  onBack: () => void;
  onLogout: () => void;
}

const MenuItem: React.FC<{ label: string; rightElement?: React.ReactNode; onClick?: () => void; isDay?: boolean }> = ({ label, rightElement, onClick, isDay }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between py-4 border-b transition-colors px-2 ${isDay ? 'border-gray-100 text-gray-700 hover:bg-gray-50' : 'border-white/5 text-gray-300 hover:text-white hover:bg-white/5'}`}
  >
    <span className="text-sm font-medium">{label}</span>
    {rightElement || <span className="text-gray-400 text-lg">›</span>}
  </button>
);

const SubPage: React.FC<{ title: string; onClose: () => void; isDay: boolean; children: React.ReactNode }> = ({ title, onClose, isDay, children }) => {
    return (
        <div className={`absolute inset-0 z-[60] animate-fade-in-up flex flex-col ${isDay ? 'bg-white' : 'bg-[#0f1110]'}`}>
            <div className={`px-4 py-4 flex items-center justify-between border-b ${isDay ? 'bg-white border-gray-100' : 'bg-[#0f1110] border-white/5'}`}>
                <button onClick={onClose} className={`text-xl p-2 transition-colors ${isDay ? 'text-gray-600 hover:text-black' : 'text-gray-400 hover:text-white'}`}>
                    ❮ 返回
                </button>
                <h2 className={`text-lg font-medium ${isDay ? 'text-gray-800' : 'text-white'}`}>{title}</h2>
                <div className="w-16"></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {children}
            </div>
        </div>
    );
};

export const ProfileView: React.FC<ProfileViewProps> = ({ userProfile, isDayMode, onThemeToggle, onBack, onLogout }) => {
  const { assets } = useAssets();
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);

  const renderSubPageContent = () => {
      const cardClass = isDayMode ? 'bg-gray-50 border-gray-100' : 'bg-mystic-paper border-white/5';
      const labelClass = isDayMode ? 'text-gray-400' : 'text-gray-500';
      const textClass = isDayMode ? 'text-gray-800' : 'text-white';

      switch(activeSubPage) {
          case 'Account':
              return (
                  <div className="space-y-6">
                      <div className={`${cardClass} p-4 rounded-xl border`}>
                          <label className={`text-xs ${labelClass} block mb-1`}>用户名</label>
                          <div className={textClass}>{userProfile.name}</div>
                      </div>
                      <div className={`${cardClass} p-4 rounded-xl border`}>
                          <label className={`text-xs ${labelClass} block mb-1`}>出生信息</label>
                          <div className={textClass}>{userProfile.birthDate} {userProfile.birthTime}</div>
                      </div>
                  </div>
              );
          default:
               return (
                   <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                       <div className="text-4xl">🚧</div>
                       <p>更多功能开发中...</p>
                   </div>
               );
      }
  };

  return (
    <div className={`w-full h-full flex flex-col animate-fade-in relative z-50 transition-colors duration-300 ${isDayMode ? 'bg-[#f8f9fa]' : 'bg-[#0f1110]'}`}>
      
      {activeSubPage && (
          <SubPage title={activeSubPage === 'Account' ? '账号管理' : activeSubPage} onClose={() => setActiveSubPage(null)} isDay={isDayMode}>
              {renderSubPageContent()}
          </SubPage>
      )}

      <div className="px-4 py-4 flex items-center justify-between bg-transparent relative z-10 shrink-0">
         <button onClick={onBack} className={`${isDayMode ? 'text-gray-600' : 'text-gray-400'} hover:text-mystic-gold text-xl p-2`}>❮</button>
         <h2 className="text-lg text-mystic-gold font-serif font-medium tracking-wide">个人主页</h2>
         <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 scrollbar-hide">
        <div className="w-full h-48 rounded-2xl relative overflow-hidden mb-8 shadow-2xl border border-white/5 group">
           <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black"></div>
           <div className="absolute inset-0 opacity-80 mix-blend-overlay bg-[url('https://api.dicebear.com/9.x/notionists/svg?seed=Mountain&backgroundColor=transparent')] bg-cover bg-center filter sepia brightness-50"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37] opacity-20 blur-[60px] rounded-full"></div>

           <div className="absolute inset-0 p-6 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border border-[#d4af37]/50 overflow-hidden bg-black/50 backdrop-blur-sm shadow-xl">
                        <img src={assets.sage_avatar} alt="Avatar" className="w-full h-full object-cover opacity-90" />
                    </div>
                    <div>
                        <div className="text-white font-bold text-lg">{userProfile.name}</div>
                        <div className="text-[#d4af37] text-[10px] border border-[#d4af37]/30 px-2 py-0.5 rounded-full w-fit bg-black/30 mt-1 uppercase tracking-wider">
                            {userProfile.gender === 'Male' ? '乾造' : '坤造'} · 普通用户
                        </div>
                    </div>
                 </div>
              </div>
              <div className="flex items-end justify-between">
                  <div className="text-gray-400 text-[10px]">VIP 有效期至 2025-12-31</div>
                  <div className="text-right">
                     <div className="flex items-baseline gap-1 text-white font-bold drop-shadow-md">
                        <span className="text-2xl">20元</span>
                        <span className="text-sm font-light">/月</span>
                     </div>
                     <div className="text-[#d4af37] text-[10px] tracking-widest font-bold">解锁全能版</div>
                  </div>
              </div>
           </div>
        </div>

        <div className={`rounded-2xl px-4 py-1 mb-4 border transition-colors shadow-sm ${isDayMode ? 'bg-white border-gray-100' : 'bg-[#1a1b1e] border-white/5'}`}>
           <MenuItem isDay={isDayMode} label="账号管理" onClick={() => setActiveSubPage('Account')} />
           <MenuItem 
              isDay={isDayMode} 
              label="白天模式" 
              rightElement={
                <div onClick={(e) => { e.stopPropagation(); onThemeToggle(); }} className={`w-11 h-6 rounded-full relative transition-all duration-300 cursor-pointer ${isDayMode ? 'bg-mystic-gold' : 'bg-gray-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md ${isDayMode ? 'left-6' : 'left-1'}`}></div>
                </div>
              } 
           />
           <MenuItem isDay={isDayMode} label="通知设置" onClick={() => setActiveSubPage('通知设置')} />
           <MenuItem isDay={isDayMode} label="帮助与反馈" onClick={() => setActiveSubPage('帮助与反馈')} />
        </div>

        <div className={`rounded-2xl px-4 py-1 mb-8 border transition-colors shadow-sm ${isDayMode ? 'bg-white border-gray-100' : 'bg-[#1a1b1e] border-white/5'}`}>
           <MenuItem isDay={isDayMode} label="关于我们" onClick={() => setActiveSubPage('关于我们')} />
        </div>

        <button 
           onClick={onLogout}
           className={`w-full font-medium py-4 rounded-full transition-all active:scale-[0.98] mb-8 shadow-sm ${isDayMode ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-[#2a2b2e] text-gray-400 hover:text-gray-200 hover:bg-[#3a3b3e]'}`}
        >
           退出登录
        </button>
      </div>
    </div>
  );
};
