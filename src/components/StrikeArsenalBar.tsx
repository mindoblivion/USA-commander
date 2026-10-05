import React from 'react';
import { Crosshair, Target, Zap, ShieldAlert, Flame, Radio, Globe, Lock } from 'lucide-react';
import { StrikeAsset } from '../types/game';

interface StrikeArsenalBarProps {
  assets: StrikeAsset[];
  selectedAssetId: string;
  onSelectAsset: (assetId: string) => void;
  onOpenHangar: () => void;
}

export const StrikeArsenalBar: React.FC<StrikeArsenalBarProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  onOpenHangar
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'crosshair': return <Crosshair className="w-5 h-5" />;
      case 'target': return <Target className="w-5 h-5" />;
      case 'zap': return <Zap className="w-5 h-5" />;
      case 'shield-alert': return <ShieldAlert className="w-5 h-5" />;
      case 'flame': return <Flame className="w-5 h-5" />;
      case 'satellite': return <Globe className="w-5 h-5" />;
      case 'radioactive': return <Radio className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-2 sm:px-4 py-2 sm:py-3 shadow-2xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {assets.map((asset, index) => {
            const isSelected = selectedAssetId === asset.id;
            const isOnCooldown = asset.currentCooldown > 0;
            const isNuke = !!asset.isNuclear;

            return (
              <button
                key={asset.id}
                onClick={() => {
                  if (asset.unlocked) {
                    onSelectAsset(asset.id);
                  } else {
                    onOpenHangar();
                  }
                }}
                disabled={isOnCooldown && asset.unlocked}
                className={`relative group flex flex-col items-center p-2 rounded-xl border transition-all duration-200 min-w-[76px] sm:min-w-[94px] cursor-pointer ${
                  !asset.unlocked
                    ? 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-90'
                    : isNuke
                    ? isSelected
                      ? 'bg-red-950/80 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-105'
                      : 'bg-red-950/30 border-red-800/60 hover:border-red-500/60'
                    : isSelected
                    ? 'bg-sky-950/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.35)] scale-105'
                    : 'bg-slate-900/80 border-slate-700 hover:border-slate-500'
                } ${isOnCooldown ? 'cursor-not-allowed opacity-75' : ''}`}
              >
                {/* Hotkey Badge (1-7) */}
                <div className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-slate-400 group-hover:text-white">
                  [{index + 1}]
                </div>

                {/* Level / Lock Badge */}
                <div className="absolute top-1 right-1.5">
                  {asset.unlocked ? (
                    <span className="text-[9px] font-mono text-amber-400 font-semibold">
                      L{asset.level}
                    </span>
                  ) : (
                    <Lock className="w-3 h-3 text-slate-500" />
                  )}
                </div>

                {/* Icon with glowing aura */}
                <div className={`mt-2 mb-1 p-1.5 rounded-lg transition-transform ${
                  isNuke
                    ? 'text-red-400 group-hover:scale-110'
                    : isSelected
                    ? 'text-sky-300 scale-110'
                    : 'text-slate-300'
                }`}>
                  {getIcon(asset.iconName)}
                </div>

                {/* Asset Name */}
                <span className="text-[11px] font-tactical font-bold tracking-tight text-center truncate max-w-[80px] text-slate-200">
                  {asset.name}
                </span>

                {/* Damage & Radius Subtext */}
                <span className="text-[9px] font-mono text-slate-400 truncate">
                  {asset.unlocked ? `${asset.damage.toLocaleString()} DMG` : 'LOCKED'}
                </span>

                {/* Cooldown Radial / Bar Overlay */}
                {isOnCooldown && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-1">
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {asset.currentCooldown.toFixed(1)}s
                    </span>
                    <div className="w-4/5 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-amber-400 transition-all duration-100"
                        style={{
                          width: `${(asset.currentCooldown / asset.cooldownSeconds) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Hangar Upgrades CTA Button */}
        <button
          onClick={onOpenHangar}
          className="shrink-0 px-3 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-tactical font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          <span>HANGAR & ARSENAL</span>
        </button>
      </div>
    </div>
  );
};
