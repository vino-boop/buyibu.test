
import React, { useState, useMemo, useEffect } from 'react';
import { AppMode, UserProfile, getElementStyle } from './types';
import { BaZiView } from './views/BaZiView';
import { LiuYaoView } from './views/LiuYaoView';
import { HomeView } from './views/HomeView';
import { RegistrationView } from './views/RegistrationView';
import { AdminView } from './views/AdminView';
import { ProfileView } from './views/ProfileView';
import { AssetProvider, useAssets } from './contexts/AssetContext';
import { BaZiProvider } from './contexts/BaZiContext';
import { LiuYaoProvider } from './contexts/LiuYaoContext';
import { Solar } from 'lunar-javascript';

// Icons
const IconHexagram = ({ active, className }: { active: boolean; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 17H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconCompass = ({ active, className }: { active: boolean; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 7L14.5 12L12 17L9.5 12L12 7Z" fill={active ? "currentColor" : "transparent"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const IconMap = ({ active, className }: { active: boolean; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const AppContent: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [baZiQuestion, setBaZiQuestion] = useState<string>('');
  const [lastMode, setLastMode] = useState<AppMode>(AppMode.HOME);
  const [isDayMode, setIsDayMode] = useState(false);
  const [headerInput, setHeaderInput] = useState('');
  
  const { assets } = useAssets();

  useEffect(() => {
    if (isDayMode) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isDayMode]);

  const handleRegistrationComplete = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const handleNavigate = (targetMode: AppMode, question?: string) => {
    if (question) setBaZiQuestion(question);
    setMode(targetMode);
  };
  
  const handleHeaderAsk = () => {
      if (!headerInput.trim()) return;
      handleNavigate(AppMode.BAZI, headerInput);
      setHeaderInput('');
  };

  const handleLogout = () => {
      if (window.confirm("确定要退出登录吗？")) {
          setUserProfile(null);
          setMode(AppMode.HOME);
          setIsDayMode(false);
      }
  };

  const dayMasterVisuals = useMemo(() => {
     if (!userProfile) return { char: '命', color: 'from-red-800 to-black' };
     try {
        const [y, m, d] = userProfile.birthDate.split('-').map(Number);
        const [h, min] = userProfile.birthTime.split(':').map(Number);
        const solar = Solar.fromYmdHms(y, m, d, h, min, 0);
        const dayGan = solar.getLunar().getEightChar().getDayGan();
        return getElementStyle(dayGan);
     } catch {
        return { char: '命', color: 'from-red-800 to-black' };
     }
  }, [userProfile]);

  const renderCurrentView = () => {
    switch(mode) {
      case AppMode.HOME: return <HomeView isDayMode={isDayMode} onNavigate={handleNavigate} />;
      case AppMode.BAZI: return <BaZiView isDayMode={isDayMode} defaultQuestion={baZiQuestion} />;
      case AppMode.LIUYAO: return <LiuYaoView isDayMode={isDayMode} />;
      case AppMode.PROFILE: return (
        <ProfileView 
            userProfile={userProfile!} 
            isDayMode={isDayMode}
            onThemeToggle={() => setIsDayMode(!isDayMode)}
            onBack={() => setMode(lastMode)} 
            onLogout={handleLogout}
        />
      );
      case AppMode.ADMIN: return <AdminView />;
      default: return <HomeView isDayMode={isDayMode} onNavigate={handleNavigate} />;
    }
  };

  // 注册页面：PC端全屏美化，移动端原生感
  if (!userProfile && mode !== AppMode.ADMIN) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-black flex items-center justify-center">
        <RegistrationView 
            onComplete={handleRegistrationComplete} 
            onEnterAdmin={() => setMode(AppMode.ADMIN)} 
        />
      </div>
    );
  }

  const NavItems = [
    { mode: AppMode.LIUYAO, label: '起卦', icon: <IconHexagram active={mode === AppMode.LIUYAO} className="w-6 h-6" /> },
    { mode: AppMode.HOME, label: '探索', icon: <IconCompass active={mode === AppMode.HOME} className="w-6 h-6" /> },
    { mode: AppMode.BAZI, label: '八字', icon: <IconMap active={mode === AppMode.BAZI} className="w-6 h-6" /> },
  ];

  return (
    <BaZiProvider userProfile={userProfile!}>
      <LiuYaoProvider userProfile={userProfile!}>
        <div className={`fixed inset-0 flex flex-col sm:flex-row transition-colors duration-500 overflow-hidden ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-mystic-dark'}`}>
          
          {/* Desktop Sidebar - 只在PC显示 */}
          <aside className={`hidden sm:flex flex-col w-64 border-r shrink-0 z-50 transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'bg-mystic-paper border-white/5'}`}>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-10">
                 <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${dayMasterVisuals.color} flex items-center justify-center text-white text-xl font-serif shadow-xl border ${isDayMode ? 'border-gray-200' : 'border-white/10'}`}>
                    {dayMasterVisuals.char}
                 </div>
                 <div className="flex flex-col">
                   <span className={`text-sm font-bold tracking-widest ${isDayMode ? 'text-gray-800' : 'text-mystic-gold'}`}>{assets.appName}</span>
                   <span className="text-[10px] text-gray-500 tracking-tighter uppercase">{assets.appSubtitle}</span>
                 </div>
              </div>

              <nav className="space-y-2">
                {NavItems.map(item => (
                  <button 
                    key={item.mode}
                    onClick={() => setMode(item.mode)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${mode === item.mode 
                      ? 'bg-mystic-gold text-black font-bold shadow-lg' 
                      : (isDayMode ? 'text-gray-400 hover:bg-gray-50' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300')}`}
                  >
                    {item.icon}
                    <span className="text-sm tracking-widest">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-auto p-6 space-y-4">
               <button 
                 onClick={() => { setLastMode(mode); setMode(AppMode.PROFILE); }}
                 className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${isDayMode ? 'bg-gray-50 border-gray-100 hover:bg-gray-100' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'}`}
               >
                 <img src={assets.sage_avatar} className="w-8 h-8 rounded-full bg-black/20" alt="" />
                 <span className="text-xs font-medium truncate flex-1 text-left">{userProfile?.name}</span>
               </button>
               <button 
                onClick={() => setMode(AppMode.ADMIN)}
                className="w-full text-[10px] text-gray-500 hover:text-mystic-gold text-center uppercase tracking-widest transition-colors py-2"
               >
                 Admin Portal
               </button>
            </div>
          </aside>

          {/* Content Wrapper */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
            
            {/* Top Header */}
            <header className={`px-6 py-4 flex items-center justify-between shrink-0 z-40 border-b transition-colors backdrop-blur-sm ${isDayMode ? 'bg-white/80 border-gray-100' : 'bg-mystic-dark/90 border-white/5'}`}>
              <div className="flex items-center gap-3 sm:hidden">
                 <button 
                   onClick={() => { setLastMode(mode); setMode(AppMode.PROFILE); }}
                   className={`w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden hover:scale-105 transition-all shadow-lg ${isDayMode ? 'border-gray-200' : 'border-mystic-gold/40'}`}
                 >
                   <div className={`w-full h-full bg-gradient-to-br ${dayMasterVisuals.color} flex items-center justify-center text-white text-lg font-serif`}>
                       {dayMasterVisuals.char}
                   </div>
                 </button>
              </div>

              <div className="flex-1 mx-4 flex items-center justify-center">
                 <div className="w-full max-w-lg flex items-center gap-2">
                    <input 
                       type="text" 
                       value={headerInput}
                       onChange={(e) => setHeaderInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleHeaderAsk()}
                       placeholder="为您解惑..." 
                       className={`flex-1 rounded-full py-2 px-4 text-sm outline-none transition-all ${isDayMode ? 'bg-gray-100 border-gray-200 text-gray-800 focus:bg-white' : 'bg-mystic-paper/50 border-white/10 text-white focus:border-mystic-gold/50'} border`}
                    />
                    <button 
                       onClick={handleHeaderAsk}
                       className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95 ${isDayMode ? 'bg-mystic-gold/10 text-mystic-gold border-mystic-gold/20' : 'bg-mystic-gold/20 text-mystic-gold border border-mystic-gold/30'}`}
                    >
                       <span className="text-sm">➤</span>
                    </button>
                 </div>
              </div>

              <div className="hidden sm:block">
                <button onClick={() => setIsDayMode(!isDayMode)} className={`p-2 rounded-full transition-colors ${isDayMode ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
                  {isDayMode ? '🌙' : '☀️'}
                </button>
              </div>
              <div className="w-10 sm:hidden"></div>
            </header>

            {/* Main View Area */}
            <main className="flex-1 relative overflow-hidden w-full flex justify-center">
               <div className={`w-full h-full ${mode === AppMode.HOME ? 'max-w-6xl' : 'max-w-5xl'}`}>
                  {renderCurrentView()}
               </div>
            </main>

            {/* Mobile Bottom Navigation - 关键修复：确保在移动端总是可见 */}
            <nav className={`flex sm:hidden shrink-0 w-full border-t pb-safe z-50 transition-colors h-[64px] ${isDayMode ? 'bg-white border-gray-100' : 'bg-[#121212] border-white/5'}`}>
              <div className="flex justify-around items-center w-full px-2">
                 {NavItems.map(item => (
                    <button 
                      key={item.mode}
                      onClick={() => setMode(item.mode)} 
                      className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${mode === item.mode ? 'text-mystic-gold scale-105 font-bold' : (isDayMode ? 'text-gray-400' : 'text-gray-500')}`}
                    >
                      <div className="mb-0.5">{item.icon}</div>
                      <span className="text-[10px] tracking-widest uppercase">{item.label}</span>
                    </button>
                 ))}
              </div>
            </nav>
          </div>
        </div>
      </LiuYaoProvider>
    </BaZiProvider>
  );
};

const App: React.FC = () => (
  <AssetProvider>
    <AppContent />
  </AssetProvider>
);

export default App;
