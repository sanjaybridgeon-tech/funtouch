import React from 'react';
import { RemoteCursorEvent, ClickRipple } from '../types/interaction';

interface RemoteCursorOverlayProps {
  cursors: Map<string, RemoteCursorEvent>;
  ripples: ClickRipple[];
}

// Distinct high-contrast colors for guest cursors
const CURSOR_COLORS = [
  '#FF7A00', // FunTouch Orange
  '#00C2FF', // Cyan
  '#10B981', // Emerald
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#EAB308', // Amber
];

export const getGuestColor = (guestId: string): string => {
  let hash = 0;
  for (let i = 0; i < guestId.length; i++) {
    hash = guestId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
};

export const RemoteCursorOverlay: React.FC<RemoteCursorOverlayProps> = ({
  cursors,
  ripples,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {/* Click Ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          style={{
            left: `${ripple.x * 100}%`,
            top: `${ripple.y * 100}%`,
            borderColor: ripple.color,
          }}
          className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 animate-ping opacity-75 pointer-events-none"
        />
      ))}

      {/* Guest Cursors */}
      {Array.from(cursors.values()).map((cursor) => {
        const color = cursor.color || getGuestColor(cursor.guestId);
        return (
          <div
            key={cursor.guestId}
            style={{
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
              transition: 'left 0.05s linear, top 0.05s linear',
            }}
            className="absolute transform -translate-x-1 -translate-y-1 flex flex-col items-start pointer-events-none select-none z-40"
          >
            {/* SVG Cursor Pointer */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={color}
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
            </svg>

            {/* Name Badge */}
            <div
              style={{ backgroundColor: color }}
              className="px-2 py-0.5 rounded-full text-[11px] font-bold text-slate-950 shadow-md ml-3 -mt-1 whitespace-nowrap flex items-center space-x-1"
            >
              <span>{cursor.guestName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

