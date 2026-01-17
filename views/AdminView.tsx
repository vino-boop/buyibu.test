
import React, { useState } from 'react';
import { useAssets, AppAssets, isImageUrl } from '../contexts/AssetContext';
import { Article } from '../types';

// Exclude activePersonality and other non-string/complex types from labels
// This fix addresses the TypeScript error where 'activePersonality' was expected in ASSET_LABELS
const ASSET_LABELS: Record<Exclude<keyof AppAssets, 'articles' | 'customApiKey' | 'apiProvider' | 'apiBaseUrl' | 'apiModel' | 'activePersonality'>, string> = {
  logo: '首页 Logo',
  appName: '应用名称 (英文)',
  appSubtitle: '应用副标题 (中文)',
  sage_avatar: '大师头像',
  home_banner: '首页横幅背景',
  icon_marriage: '图标: 婚嫁',
  icon_career: '图标: 仕途',
  icon_health: '图标: 健康',
  icon_exam: '图标: 考试',
  background_texture: '全局纹理背景',
  nav_icon_liuyao: '底部导航: 起卦',
  nav_icon_home: '底部导航: 探索 (中间)',
  nav_icon_bazi: '底部导航: 八字'
};

export const AdminView: React.FC = () => {
  const { assets, updateAsset, resetAssets } = useAssets();
  const [activeTab, setActiveTab] = useState<'BRANDING' | 'IMAGES' | 'ICONS' | 'ARTICLES' | 'API'>('BRANDING');

  const handleFileChange = (key: keyof AppAssets, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateAsset(key, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderInputRow = (key: Exclude<keyof AppAssets, 'articles' | 'customApiKey' | 'apiProvider' | 'apiBaseUrl' | 'apiModel' | 'activePersonality'>) => {
    const value = assets[key];
    const isImageKey = key !== 'appName' && key !== 'appSubtitle';
    
    // Type guard for value rendering
    const displayValue = typeof value === 'string' ? value : '';

    return (
      <div key={key} className="bg-mystic-paper p-4 rounded-xl border border-white/5 space-y-3">
        <div className="flex justify-between items-center">
            <label className="text-mystic-gold text-sm font-medium">{ASSET_LABELS[key]}</label>
            <button 
                onClick={() => updateAsset(key, null)} 
                className="text-xs text-gray-500 hover:text-white"
            >
                重置
            </button>
        </div>
        
        <div className="flex gap-4 items-start">
            {/* Preview Area (Only for images) */}
            {isImageKey && (
                <div className="w-16 h-16 shrink-0 bg-black/40 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden relative">
                    {key === 'logo' && !value ? (
                        <span className="text-[10px] text-gray-500">默认 SVG</span>
                    ) : isImageUrl(displayValue) ? (
                        <img src={displayValue} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl">{displayValue}</span>
                    )}
                </div>
            )}

            <div className="flex-1 space-y-2">
                {/* Text Input */}
                <input 
                    type="text" 
                    value={displayValue || ''}
                    onChange={(e) => updateAsset(key, e.target.value)}
                    placeholder={isImageKey ? "粘贴图片链接 或 输入 Emoji..." : "输入文本..."}
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-mystic-gold outline-none"
                />
                
                {/* File Upload (Only for images) */}
                {isImageKey && (
                    <div className="relative">
                        <label className="inline-block bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] px-3 py-1 rounded cursor-pointer transition-colors">
                            上传图片
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleFileChange(key, e)}
                            />
                        </label>
                        <span className="ml-2 text-[10px] text-gray-600">建议小于 2MB</span>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  };

  const renderArticleEditor = () => {
     const updateArticle = (id: string, field: keyof Article, value: string) => {
         const updatedArticles = assets.articles.map(art => 
             art.id === id ? { ...art, [field]: value } : art
         );
         updateAsset('articles', updatedArticles);
     };

     return (
         <div className="space-y-6">
             {assets.articles.map((article, index) => (
                 <div key={article.id} className="bg-mystic-paper p-4 rounded-xl border border-white/5 space-y-4">
                     <div className="flex items-center justify-between border-b border-white/5 pb-2">
                         <span className="text-mystic-gold font-bold">文章 #{index + 1}</span>
                         <span className="text-xs text-gray-500">ID: {article.id}</span>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs text-gray-400 mb-1">标题</label>
                             <input 
                                 type="text"
                                 value={article.title}
                                 onChange={(e) => updateArticle(article.id, 'title', e.target.value)}
                                 className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
                             />
                         </div>
                         <div>
                             <label className="block text-xs text-gray-400 mb-1">副标题</label>
                             <input 
                                 type="text"
                                 value={article.subtitle}
                                 onChange={(e) => updateArticle(article.id, 'subtitle', e.target.value)}
                                 className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
                             />
                         </div>
                         <div>
                             <label className="block text-xs text-gray-400 mb-1">分类</label>
                             <input 
                                 type="text"
                                 value={article.category}
                                 onChange={(e) => updateArticle(article.id, 'category', e.target.value)}
                                 className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
                             />
                         </div>
                         <div>
                             <label className="block text-xs text-gray-400 mb-1">阅读时间</label>
                             <input 
                                 type="text"
                                 value={article.readTime}
                                 onChange={(e) => updateArticle(article.id, 'readTime', e.target.value)}
                                 className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
                             />
                         </div>
                     </div>

                     <div>
                         <label className="block text-xs text-gray-400 mb-1">正文内容 (支持换行)</label>
                         <textarea 
                             rows={8}
                             value={article.content}
                             onChange={(e) => updateArticle(article.id, 'content', e.target.value)}
                             className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-xs text-white leading-relaxed resize-y scrollbar-hide whitespace-pre-wrap focus:border-mystic-gold outline-none"
                         />
                     </div>
                 </div>
             ))}
         </div>
     );
  };

  const renderAPIEditor = () => {
    return (
        <div className="bg-mystic-paper p-6 rounded-xl border border-white/5 space-y-6">
            <div className="space-y-4">
                <label className="text-mystic-gold font-medium block">API 提供商 (Provider)</label>
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            updateAsset('apiProvider', 'GEMINI');
                            // Reset model for Gemini
                            updateAsset('apiModel', 'gemini-3-pro-preview');
                        }}
                        className={`flex-1 py-3 px-4 rounded-lg border text-sm transition-all ${assets.apiProvider !== 'DEEPSEEK' ? 'bg-mystic-gold text-black border-mystic-gold font-bold' : 'bg-black/20 border-white/10 text-gray-400'}`}
                    >
                        Google Gemini
                    </button>
                    <button 
                        onClick={() => {
                            updateAsset('apiProvider', 'DEEPSEEK');
                            // Set defaults for DeepSeek
                            updateAsset('apiBaseUrl', 'https://api.deepseek.com');
                            updateAsset('apiModel', 'deepseek-chat');
                        }}
                        className={`flex-1 py-3 px-4 rounded-lg border text-sm transition-all ${assets.apiProvider === 'DEEPSEEK' ? 'bg-mystic-gold text-black border-mystic-gold font-bold' : 'bg-black/20 border-white/10 text-gray-400'}`}
                    >
                        DeepSeek
                    </button>
                </div>
            </div>

            {/* Config Fields */}
            <div className="space-y-4 pt-2">
                
                {/* Base URL (Only for DeepSeek or Custom) */}
                {assets.apiProvider === 'DEEPSEEK' && (
                     <div className="space-y-2">
                        <label className="text-gray-400 text-xs block">API Base URL</label>
                        <input 
                            type="text"
                            value={assets.apiBaseUrl || 'https://api.deepseek.com'}
                            onChange={(e) => updateAsset('apiBaseUrl', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded px-4 py-3 text-sm text-white focus:border-mystic-gold outline-none font-mono"
                        />
                     </div>
                )}

                {/* Model Name */}
                <div className="space-y-2">
                    <label className="text-gray-400 text-xs block">Model Name</label>
                    <input 
                        type="text"
                        value={assets.apiModel || (assets.apiProvider === 'DEEPSEEK' ? 'deepseek-chat' : 'gemini-3-pro-preview')}
                        onChange={(e) => updateAsset('apiModel', e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded px-4 py-3 text-sm text-white focus:border-mystic-gold outline-none font-mono"
                    />
                    <p className="text-[10px] text-gray-500">
                        {assets.apiProvider === 'DEEPSEEK' ? '推荐: deepseek-chat 或 deepseek-reasoner' : '推荐: gemini-3-pro-preview'}
                    </p>
                </div>

                {/* API Key (Only for DeepSeek as per Gemini guidelines) */}
                {assets.apiProvider === 'DEEPSEEK' && (
                    <div className="space-y-2 border-t border-white/5 pt-4">
                        <label className="text-mystic-gold font-medium block">API Key</label>
                        <input 
                            type="password"
                            value={assets.customApiKey || ''}
                            onChange={(e) => updateAsset('customApiKey', e.target.value)}
                            placeholder="输入 DeepSeek API Key"
                            className="w-full bg-black/20 border border-white/10 rounded px-4 py-3 text-sm text-white focus:border-mystic-gold outline-none font-mono"
                        />
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                            DeepSeek Key 格式通常为 'sk-...'。
                        </p>
                    </div>
                )}
            </div>
            
             <div className="flex items-center gap-2 pt-2">
                <div className={`w-2 h-2 rounded-full ${assets.apiProvider === 'GEMINI' || assets.customApiKey ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <span className="text-xs text-gray-400">
                    状态: {assets.apiProvider === 'GEMINI' ? '已配置 Google API Key (ENV)' : (assets.customApiKey ? '已配置 DeepSeek Key' : '未配置 Key')}
                </span>
            </div>
        </div>
    );
  };

  const brandingKeys: (keyof AppAssets)[] = ['logo', 'appName', 'appSubtitle'];
  const imageKeys: (keyof AppAssets)[] = ['sage_avatar', 'home_banner', 'background_texture'];
  const iconKeys: (keyof AppAssets)[] = ['icon_marriage', 'icon_career', 'icon_health', 'icon_exam', 'nav_icon_liuyao', 'nav_icon_home', 'nav_icon_bazi'];

  return (
    <div className="w-full h-full flex flex-col bg-mystic-dark animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-mystic-paper/50 backdrop-blur-md sticky top-0 z-10">
            <h2 className="text-xl font-serif text-white">后台管理</h2>
            <p className="text-xs text-gray-400">资源配置 & 内容管理</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
            
            {/* Warning */}
            <div className="bg-amber-900/20 border border-amber-500/20 p-3 rounded-lg flex gap-3">
                <span className="text-amber-500 text-xl">⚠</span>
                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                    所有修改将保存在浏览器的本地缓存中。清除缓存将重置这些设置。
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <button 
                    onClick={() => setActiveTab('BRANDING')}
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'BRANDING' ? 'bg-mystic-gold text-black' : 'bg-white/5 text-gray-400'}`}
                >
                    品牌
                </button>
                <button 
                    onClick={() => setActiveTab('IMAGES')}
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'IMAGES' ? 'bg-mystic-gold text-black' : 'bg-white/5 text-gray-400'}`}
                >
                    图片
                </button>
                <button 
                    onClick={() => setActiveTab('ICONS')}
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'ICONS' ? 'bg-mystic-gold text-black' : 'bg-white/5 text-gray-400'}`}
                >
                    图标
                </button>
                <button 
                    onClick={() => setActiveTab('ARTICLES')}
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'ARTICLES' ? 'bg-mystic-gold text-black' : 'bg-white/5 text-gray-400'}`}
                >
                    文章
                </button>
                 <button 
                    onClick={() => setActiveTab('API')}
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'API' ? 'bg-mystic-gold text-black' : 'bg-white/5 text-gray-400'}`}
                >
                    API
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {activeTab === 'BRANDING' && brandingKeys.map(k => renderInputRow(k as any))}
                {activeTab === 'IMAGES' && imageKeys.map(k => renderInputRow(k as any))}
                {activeTab === 'ICONS' && iconKeys.map(k => renderInputRow(k as any))}
                {activeTab === 'ARTICLES' && renderArticleEditor()}
                {activeTab === 'API' && renderAPIEditor()}
            </div>

            {/* Reset */}
            <div className="pt-8 border-t border-white/5">
                <button 
                    onClick={() => {
                        if(window.confirm('确定要重置所有资源为默认状态吗？')) resetAssets();
                    }}
                    className="w-full py-3 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-900/20 transition-colors text-sm"
                >
                    恢复出厂设置
                </button>
            </div>
        </div>
    </div>
  );
};
