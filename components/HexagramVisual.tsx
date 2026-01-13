import React from 'react';
import { HexagramLine, YaoType } from '../types';

interface HexagramVisualProps {
  lines: HexagramLine[];
  activeStep?: number; // 0 to 6
  variant?: 'default' | 'compact';
}

const YaoLine: React.FC<{ type: YaoType; animate: boolean; variant: 'default' | 'compact' }> = ({ type, animate, variant }) => {
  const isYang = type === YaoType.YOUNG_YANG || type === YaoType.OLD_YANG;
  const isMoving = type === YaoType.OLD_YIN || type === YaoType.OLD_YANG;
  
  // Style Configuration based on variant
  const isCompact = variant === 'compact';
  
  // Height: Compact = 6px (h-1.5), Default = 16px (h-4)
  const heightClass = isCompact ? 'h-1.5' : 'h-4 sm:h-5';
  
  // Color: Use gold for visibility
  const colorClass = 'bg-mystic-gold';
  const glowClass = !isCompact && isMoving ? 'shadow-[0_0_8px_rgba(212,175,55,0.5)]' : '';

  // Animation state
  const animClass = animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4';

  return (
    <div className={`w-full flex justify-center items-center relative ${heightClass} ${animClass} transition-all duration-500`}>
      {isYang ? (
        // Yang Line (Solid)
        <div className={`w-full h-full rounded-[1px] ${colorClass} ${glowClass}`}></div>
      ) : (
        // Yin Line (Broken)
        <div className="w-full h-full flex justify-between">
          <div className={`w-[42%] h-full rounded-[1px] ${colorClass} ${glowClass}`}></div>
          <div className={`w-[42%] h-full rounded-[1px] ${colorClass} ${glowClass}`}></div>
        </div>
      )}
      
      {/* Moving Line Indicator (Only show in default mode to keep header clean) */}
      {!isCompact && isMoving && (
        <span className="absolute -right-4 top-1/2 -translate-y-1/2 text-[10px] text-mystic-accent font-bold opacity-70">
          {type === YaoType.OLD_YANG ? 'O' : 'X'}
        </span>
      )}
    </div>
  );
};

export const HexagramVisual: React.FC<HexagramVisualProps> = ({ lines, activeStep = 6, variant = 'default' }) => {
  // Render from top (Line 6) to bottom (Line 1)
  const slots = [6, 5, 4, 3, 2, 1];
  
  // Spacing: Compact = gap-1 (4px), Default = gap-3 (12px)
  const gapClass = variant === 'compact' ? 'gap-1' : 'gap-3';

  return (
    <div className={`flex flex-col w-full ${gapClass} transition-all duration-300`}>
      {slots.map((position) => {
        const line = lines.find((l) => l.position === position);
        const hasLine = !!line;
        
        return (
          <div key={position} className="w-full flex items-center justify-center">
             {hasLine ? (
               <YaoLine type={line.value} animate={true} variant={variant} />
             ) : (
               // Placeholder
               <div className={`w-full ${variant === 'compact' ? 'h-1.5' : 'h-4 sm:h-5'} flex justify-between opacity-5`}>
                   <div className="w-full h-full bg-white/50 rounded-[1px]"></div>
               </div>
             )}
          </div>
        );
      })}
    </div>
  );
};