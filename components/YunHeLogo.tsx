
import React from 'react';
import { useAssets, isImageUrl } from '../contexts/AssetContext';

export const YunHeLogo: React.FC<{ size?: number }> = ({ size = 120 }) => {
  const { assets } = useAssets();

  const renderImage = () => {
    // 如果用户上传了自定义 Logo 图片或链接
    if (assets.logo && isImageUrl(assets.logo)) {
      return (
        <img 
          src={assets.logo} 
          alt="App Logo" 
          style={{ width: size, height: size, objectFit: 'contain' }}
          className="rounded-xl drop-shadow-[0_0_20px_rgba(197,176,120,0.4)] transition-all duration-700"
        />
      );
    }

    // 使用用户提供的自定义 SVG Logo
    return (
      <div className="relative" style={{ width: size, height: size }}>
          <svg width="100%" height="100%" viewBox="0 0 3066 3117" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_25px_rgba(197,176,120,0.4)] animate-fade-in">
            <path d="M1411.2 69.0339C1486.76 26.2115 1579.24 26.2114 1654.8 69.0338L2199.85 377.973L2739.93 695.539C2814.79 739.557 2861.04 819.655 2861.73 906.495L2866.71 1533L2861.73 2159.5C2861.04 2246.35 2814.79 2326.44 2739.93 2370.46L2199.85 2688.03L1654.8 2996.97C1579.24 3039.79 1486.76 3039.79 1411.2 2996.97L866.145 2688.03L326.066 2370.46C251.205 2326.44 204.961 2246.35 204.27 2159.5L199.29 1533L204.27 906.495C204.961 819.655 251.205 739.557 326.066 695.539L866.145 377.973L1411.2 69.0339Z" fill="#c5b078"/>
            <mask id="mask_custom_logo" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="191" y="301" width="2348" height="2659">
              <path d="M1118.55 1995.99C1118.45 2128.21 436.488 2240.45 192.553 2282.7C192.553 2282.7 896.043 2801.75 1254.07 2959.3C974.626 2670.37 1636.04 2519.08 1828.51 2272.38C1963.64 2047 1479.44 1896.32 1548.21 1755.1C1629.84 1545.61 2503.7 1579.17 2537.7 1360.02C2496.98 1081.67 1408.33 917.414 1501.69 788.223C1576.8 708.443 2002.81 763.954 2345.05 730.905C2415.21 717.145 2479.3 723.019 2487.66 669.153C2499.56 592.413 1881.91 447.024 1931.94 392.518C2048.12 350.091 2153.27 364.137 2223.09 337.943C2208.29 321.385 2197.51 314.207 2178.73 302.346C2069.32 335.245 1852.13 317.419 1824.95 390.277C1807.78 500.96 2844.36 698.799 1912.56 678.167C928.282 642.139 1316.08 873.78 1393.53 910.481C1697 1054.28 2090.54 1138.76 2235.86 1283.72C2281.28 1424.51 1889.53 1391.81 1344.2 1501.3C658.442 1638.98 1138.58 1866.86 1118.55 1995.99Z" fill="black" stroke="black"/>
            </mask>
            <g mask="url(#mask_custom_logo)">
              <path d="M1411.19 69.0339C1486.74 26.2115 1579.23 26.2114 1654.78 69.0338L2199.84 377.973L2739.92 695.539C2814.78 739.557 2861.02 819.655 2861.71 906.495L2866.69 1533L2861.71 2159.5C2861.02 2246.35 2814.78 2326.44 2739.92 2370.46L2199.84 2688.03L1654.78 2996.97C1579.23 3039.79 1486.74 3039.79 1411.19 2996.97L866.126 2688.03L326.047 2370.46C251.187 2326.44 204.942 2246.35 204.252 2159.5L199.271 1533L204.252 906.495C204.942 819.655 251.187 739.557 326.047 695.539L866.126 377.973L1411.19 69.0339Z" fill="#0f1110"/>
            </g>
          </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      {renderImage()}
      <div className="mt-8 text-center animate-fade-in">
          <h1 className="text-3xl font-serif font-light tracking-[0.3em] text-mystic-gold uppercase">{assets.appName}</h1>
          <div className="flex items-center justify-center gap-4 mt-3">
              <span className="w-6 h-[1px] bg-mystic-gold/30"></span>
              <span className="text-mystic-gold/80 text-sm tracking-[0.5em] font-light">{assets.appSubtitle}</span>
              <span className="w-6 h-[1px] bg-mystic-gold/30"></span>
          </div>
      </div>
    </div>
  );
};
