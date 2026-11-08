import React from 'react';

interface AnimatedBackgroundProps {
  subtle?: boolean;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ subtle = false }) => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#090d16]">
      {/* Top-Left Ambient FunTouch Orange Glow */}
      <div
        className="absolute -top-36 -left-36 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(255, 122, 0, ${subtle ? 0.06 : 0.14}) 0%, rgba(255, 122, 0, 0.03) 50%, transparent 70%)`,
        }}
      />

      {/* Top-Right Ambient FunTouch Blue Glow */}
      <div
        className="absolute -top-36 -right-36 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(0, 136, 255, ${subtle ? 0.06 : 0.14}) 0%, rgba(0, 136, 255, 0.03) 50%, transparent 70%)`,
        }}
      />

      {/* Center Subtle Top Spotlight Blend */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255, 122, 0, ${subtle ? 0.04 : 0.09}), rgba(0, 136, 255, ${subtle ? 0.04 : 0.08}), transparent 75%)`,
        }}
      />

      {/* Modern Refined Geometric Micro-Grid with Radial Falloff */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.045] pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 80%)',
        }}
      >
        <defs>
          <pattern id="pro-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pro-grid)" />
      </svg>
    </div>
  );
};
