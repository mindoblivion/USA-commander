import React from 'react';
import { TacticalStrikeIndicator } from '../types/game';

interface TacticalCombatOverlaysProps {
  strikeIndicators: TacticalStrikeIndicator[];
  showStrikeIndicators: boolean;
  nukeFlashActive: boolean;
  combatLogs: { id: string; text: string; time: string }[];
}

export const TacticalCombatOverlays: React.FC<TacticalCombatOverlaysProps> = ({
  strikeIndicators,
  showStrikeIndicators,
  nukeFlashActive,
  combatLogs
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {/* Nuclear Flash Overlay */}
      {nukeFlashActive && (
        <div className="absolute inset-0 bg-white animate-nuke-flash pointer-events-none" />
      )}

      {/* Tactical Strike Impact Indicators */}
      {showStrikeIndicators && (
        <div className="absolute inset-0 pointer-events-none">
          {strikeIndicators.map((item) => (
            <div
              key={item.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 animate-damage-float pointer-events-none"
              style={{ left: `${item.x}px`, top: `${item.y}px` }}
            >
              <div
                className={`flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded shadow-lg border ${
                  item.isCrit
                    ? 'bg-amber-950/90 text-amber-300 border-amber-500 scale-110'
                    : 'bg-slate-950/90 text-red-400 border-red-500/60'
                }`}
              >
                <span className="text-[10px] text-slate-400">⚡</span>
                <span>-{item.damage.toLocaleString()} DMG</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NORAD Tactical Telemetry Live Log */}
      <div className="absolute bottom-24 right-4 max-w-xs w-full hidden md:flex flex-col gap-1 bg-slate-950/80 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 shadow-xl">
        <div className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-800/80 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>NORAD Strike Telemetry</span>
          </div>
          <span className="text-emerald-400 font-bold">SECURE CHANNEL</span>
        </div>
        <div className="space-y-0.5 max-h-20 overflow-hidden flex flex-col justify-end">
          {combatLogs.slice(-4).map((log) => (
            <div key={log.id} className="truncate">
              <span className="text-slate-500">[{log.time}]</span>{' '}
              <span className="text-slate-200">{log.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
