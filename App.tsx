
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

const IconHexagram = ({ className }: { active: boolean; className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 17H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconCompass = ({ active, className }: { active: boolean; className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 7L14.5 12L12 17L9.5 12L12 7Z" fill={active ? "currentColor" : "transparent"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const IconMap = ({ className }: { active: boolean; className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
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

  const renderContent = () => {
    if (mode === AppMode.ADMIN) return <AdminView />;

    if (!userProfile) {
      return (
        <RegistrationView 
            onComplete={handleRegistrationComplete} 
            onEnterAdmin={() => setMode(AppMode.ADMIN)} 
        />
      );
    }

    if (mode === AppMode.PROFILE) {
        return (
            <ProfileView 
                userProfile={userProfile} 
                isDayMode={isDayMode}
                onThemeToggle={() => setIsDayMode(!isDayMode)}
                onBack={() => setMode(lastMode)} 
                onLogout={handleLogout}
            />
        );
    }

    return (
      <BaZiProvider userProfile={userProfile}>
        <LiuYaoProvider userProfile={userProfile}>
          <div className={`flex flex-col h-full relative overflow-hidden transition-colors duration-300 ${isDayMode ? 'bg-[#fcfcfc]' : 'bg-mystic-dark'}`}>
            <header className={`px-6 py-4 flex items-center justify-between shrink-0 z-10 border-b transition-colors ${isDayMode ? 'bg-white/80 border-gray-100' : 'bg-mystic-dark/90 border-white/5'} backdrop-blur-sm`}>
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => { setLastMode(mode); setMode(AppMode.PROFILE); }}
                   className={`w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden hover:scale-105 transition-all cursor-pointer shadow-lg ${isDayMode ? 'border-gray-200' : 'border-mystic-gold/40'}`}
                 >
                   <div className={`w-full h-full bg-gradient-to-br ${dayMasterVisuals.color} flex items-center justify-center text-white text-lg font-serif`}>
                       {dayMasterVisuals.char}
                   </div>
                 </button>
              </div>
              
              {mode !== AppMode.LIUYAO ? (
                  <div className="flex-1 mx-4 flex items-center gap-2 max-w-sm">
                     <input 
                        type="text" 
                        value={headerInput}
                        onChange={(e) => setHeaderInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleHeaderAsk()}
                        placeholder="为您解惑" 
                        className={`flex-1 rounded-full py-2 px-4 text-sm outline-none transition-all ${isDayMode ? 'bg-gray-100 border-gray-200 text-gray-800 focus:bg-white' : 'bg-mystic-paper/50 border-white/10 text-white focus:border-mystic-gold/50'} border`}
                     />
                     <button 
                        onClick={handleHeaderAsk}
                        className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95 ${isDayMode ? 'bg-mystic-gold/10 text-mystic-gold border-mystic-gold/20' : 'bg-mystic-gold/20 text-mystic-gold border border-mystic-gold/30'}`}
                     >
                        <span className="text-sm">➤</span>
                     </button>
                  </div>
              ) : <div className="flex-1"></div>}
              
              {mode === AppMode.LIUYAO && <div className="w-8"></div>}
            </header>

            <main className="flex-1 relative overflow-hidden w-full">
                {mode === AppMode.HOME && <HomeView isDayMode={isDayMode} onNavigate={handleNavigate} />}
                {mode === AppMode.BAZI && <BaZiView isDayMode={isDayMode} defaultQuestion={baZiQuestion} />}
                {mode === AppMode.LIUYAO && <LiuYaoView isDayMode={isDayMode} />}
            </main>

            <nav className={`shrink-0 w-full border-t pb-6 pt-2 z-50 transition-colors ${isDayMode ? 'bg-white border-gray-100' : 'bg-[#1A1A1A] border-white/5'}`}>
              <div className="flex justify-around items-center h-16 w-full px-2">
                 <button onClick={() => setMode(AppMode.LIUYAO)} className={`flex flex-col items-center justify-center w-full h-full gap-1.5 transition-all ${mode === AppMode.LIUYAO ? 'text-mystic-gold scale-110' : (isDayMode ? 'text-gray-400' : 'text-[#64748b]')}`}>
                   <IconHexagram active={mode === AppMode.LIUYAO} className="w-6 h-6" />
                   <span className="text-[10px] tracking-widest font-medium">起卦</span>
                 </button>

                 <button onClick={() => setMode(AppMode.HOME)} className={`flex flex-col items-center justify-center w-full h-full gap-1.5 transition-all ${mode === AppMode.HOME ? 'text-mystic-gold scale-110' : (isDayMode ? 'text-gray-400' : 'text-[#64748b]')}`}>
                   <IconCompass active={mode === AppMode.HOME} className="w-6 h-6" />
                   <span className="text-[10px] tracking-widest font-medium">探索</span>
                 </button>

                 <button onClick={() => setMode(AppMode.BAZI)} className={`flex flex-col items-center justify-center w-full h-full gap-1.5 transition-all ${mode === AppMode.BAZI ? 'text-mystic-gold scale-110' : (isDayMode ? 'text-gray-400' : 'text-[#64748b]')}`}>
                   <IconMap active={mode === AppMode.BAZI} className="w-6 h-6" />
                   <span className="text-[10px] tracking-widest font-medium">八字</span>
                 </button>
              </div>
            </nav>
          </div>
        </LiuYaoProvider>
      </BaZiProvider>
    );
  };

  return (
    <div className={`fixed inset-0 sm:flex sm:items-center sm:justify-center font-sans overflow-hidden transition-colors duration-500 ${isDayMode ? 'bg-gray-200' : 'bg-black sm:bg-slate-900'}`}>
      <div className={`w-full h-full sm:max-w-[420px] sm:h-[850px] sm:max-h-[95vh] sm:rounded-[3rem] sm:border-[8px] sm:shadow-2xl relative overflow-hidden ring-1 transition-all ${isDayMode ? 'bg-[#fcfcfc] border-white ring-gray-200' : 'bg-mystic-dark border-gray-800 ring-white/10'}`}>
         {renderContent()}
      </div>
      <div className={`hidden sm:block absolute bottom-8 text-sm font-serif tracking-widest opacity-50 transition-colors ${isDayMode ? 'text-gray-500' : 'text-slate-500'}`}>
         YUN HE · AI DIVINATION
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <AssetProvider>
    <AppContent />
  </AssetProvider>
);

export default App;
