
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Article, AppPersonality } from '../types';

export interface AppAssets {
  logo: string | null; // 可以是 Base64 字符串、URL 或 null（使用默认 SVG）
  appName: string;
  appSubtitle: string;
  sage_avatar: string;
  home_banner: string; 
  icon_marriage: string;
  icon_career: string;
  icon_health: string;
  icon_exam: string;
  background_texture: string;
  articles: Article[];
  
  // Navigation Icons
  nav_icon_liuyao: string;
  nav_icon_home: string;
  nav_icon_bazi: string;
  
  // Personality Configuration
  activePersonality: AppPersonality;

  // API Configuration
  customApiKey?: string; 
  apiProvider?: 'GEMINI' | 'DEEPSEEK';
  apiBaseUrl?: string;
  apiModel?: string;
}

const DEFAULT_ARTICLES: Article[] = [
  {
    id: '1',
    title: '明天合作是否顺利',
    subtitle: '泰卦九三爻',
    category: '六爻案例',
    readTime: '拔茅前以其汇',
    gradient: 'from-zinc-900 to-black',
    content: `案例解析：\n用户问明天谈合作是否顺利。起卦得地天泰，变卦为地泽临。\n泰卦，小往大来，吉亨。九三爻辞：无平不陂，无往不复，艰贞无咎。勿恤其孚，于食有福。\n\n断语：\n合作初期可能会有一些波折（无平不陂），但这属于正常现象。只要坚持正道，诚信待人（勿恤其孚），最终会有好的结果（于食有福）。变卦临，意味着君子亲临，总体趋势向好。`,
    layout: 'vertical_split',
    images: [
       'https://api.dicebear.com/9.x/notionists/svg?seed=Hex1&backgroundColor=transparent', 
       'https://api.dicebear.com/9.x/notionists/svg?seed=Hex2&backgroundColor=transparent', 
       'https://api.dicebear.com/9.x/notionists/svg?seed=Hex3&backgroundColor=transparent'
    ]
  },
  {
    id: '2',
    title: '我的事业上升期',
    subtitle: '把握流年大运，职场进阶指南',
    category: '仕途',
    readTime: '3分钟',
    gradient: 'from-amber-900 via-yellow-900 to-slate-900',
    content: `分析八字中的事业上升期，需结合命盘格局、五行生克、大运流年等综合判断。以下是核心步骤及要素：\n\n二、核心观察点\n1. 官杀星（事业官）\n正官/七杀为事业星：旺而有制（印星化杀、食伤制杀）主事业突破。`,
    layout: 'wide',
    images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop']
  }
];

const DEFAULT_ASSETS: AppAssets = {
  logo: null, 
  appName: '运何',
  appSubtitle: '天机推演',
  sage_avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Sage&backgroundColor=1e293b',
  home_banner: '', 
  icon_marriage: '🎎',
  icon_career: '📜',
  icon_health: '🍵',
  icon_exam: '🎓',
  background_texture: 'https://www.transparenttextures.com/patterns/black-scales.png',
  articles: DEFAULT_ARTICLES,
  
  nav_icon_liuyao: '☳',
  nav_icon_home: '☯️',
  nav_icon_bazi: '📅',

  activePersonality: AppPersonality.MYSTIC,
  
  customApiKey: '', 
  apiProvider: 'GEMINI',
  apiBaseUrl: '',
  apiModel: 'gemini-3-pro-preview'
};

interface AssetContextType {
  assets: AppAssets;
  updateAsset: (key: keyof AppAssets, value: any) => void;
  resetAssets: () => void;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export const AssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<AppAssets>(DEFAULT_ASSETS);

  useEffect(() => {
    const saved = localStorage.getItem('dao_assets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAssets(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse assets", e);
      }
    }
  }, []);

  const updateAsset = (key: keyof AppAssets, value: any) => {
    setAssets(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('dao_assets', JSON.stringify(next));
      return next;
    });
  };

  const resetAssets = () => {
    setAssets(DEFAULT_ASSETS);
    localStorage.removeItem('dao_assets');
  };

  return (
    <AssetContext.Provider value={{ assets, updateAsset, resetAssets }}>
      {children}
    </AssetContext.Provider>
  );
};

export const useAssets = () => {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
};

export const isImageUrl = (str: string | null) => {
  if (!str) return false;
  return str.startsWith('http') || str.startsWith('data:image') || str.startsWith('/');
};
