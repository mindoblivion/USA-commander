import React from 'react';
import {
  Compass,
  Globe,
  Settings,
  Zap,
  Volume2,
  VolumeX,
  Flame,
  Car,
  Eye,
  CloudRain,
  Plane,
  Crosshair,
  Trophy
} from 'lucide-react';
import { CombatTheater, VisionMode, TacticalWeather } from '../types/game';

interface TacticalTopBarProps {
  cash: number;
  theater: CombatTheater;
  destructionPct: number;
  compassAngle: number;
  onResetCompass: () => void;
  onOpenTheaters: () => void;
  onOpenHangar: () => void;
  onOpenSettings: () => void;
  onOpenAchievements: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  fps: number;
  showFps: boolean;
  visionMode: VisionMode;
  onToggleVisionMode: () => void;
  weather: TacticalWeather;
  onCycleWeather: () => void;
  isFlightMode: boolean;
  onToggleFlightMode: () => void;
  isAerialVehicle: boolean;
}

export const TacticalTopBar: React.FC<TacticalTopBarProps> = ({
  cash,
  theater,
  destructionPct,
  compassAngle,
  onResetCompass,
  onOpenTheaters,
  onOpenHangar,
  onOpenSettings,
  onOpenAchievements,
  isMuted,
  onToggleMute,
  fps,
  showFps,
  visionMode,
  onToggleVisionMode,
  weather,
  onCycleWeather,
  isFlightMode,
  onToggleFlightMode,
  isAerialVehicle
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/90 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-2xl pointer-events-auto select-none">
      {/* Zone 1: Wordmark & Classified Clearance */}
      <div className="flex items-center gap-2 sm:gap-3">
        <a
          href="#home"
          onClick={(e) => { e.preventDefault(); }}
          className="text-sm sm:text-base font-display font-black tracking-tight text-white flex items-center gap-1.5 shrink-0"
        >
          <span className="text-red-500 font-black">USA</span>
          <span>COMMANDER</span>
        </a>

        {/* Classified Clearance Tag */}
        <span className="hidden md:inline-flex text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950/90 border border-red-600/60 text-red-400 uppercase tracking-widest shrink-0">
          TS // SCI
        </span>

        {/* Current Active Theater Button */}
        <button
          onClick={onOpenTheaters}
          className="hidden sm:flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-tactical font-semibold transition-colors cursor-pointer shrink-0"
          title="Switch Combat Theater"
        >
          <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate max-w-[130px]">{theater.codename}</span>
        </button>

        {/* Tactical Weather Toggle */}
        <button
          onClick={onCycleWeather}
          className="hidden lg:flex items-center gap-1.5 py-1 px-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-amber-300 text-xs font-mono transition-colors cursor-pointer"
          title="Cycle Tactical Weather Conditions"
        >
          <CloudRain className="w-3.5 h-3.5 text-sky-400" />
          <span className="uppercase text-[10px] font-bold">{weather.replace('_', ' ')}</span>
        </button>
      </div>

      {/* Zone 2: Destruction Meter & War Chest */}
      <div className="flex items-center gap-2 sm:gap-5 shrink-0">
        {/* City Destruction Metric */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-[8px] uppercase font-mono text-slate-400 flex items-center justify-end gap-1">
              <Flame className="w-2.5 h-2.5 text-amber-500" /> Devastation
            </div>
            <div className="text-xs font-mono font-bold text-amber-400 leading-none">
              {destructionPct.toFixed(1)}%
            </div>
          </div>

          <div className="w-14 sm:w-24 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shrink-0">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-300"
              style={{ width: `${Math.min(100, destructionPct)}%` }}
            />
          </div>
        </div>

        {/* War Chest Cash */}
        <div className="flex items-center gap-2 bg-slate-900 border border-emerald-500/40 px-2.5 sm:px-3 py-1 rounded-xl shadow-inner shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div>
            <div className="text-[7px] sm:text-[8px] font-mono uppercase text-slate-400 leading-none">War Chest</div>
            <div className="text-xs sm:text-sm font-mono font-bold text-emerald-400 leading-tight">
              ${cash.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Zone 3: Vision Modes, Flight Pilot & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* NVG / FLIR Vision Mode Switch */}
        <button
          onClick={onToggleVisionMode}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
            visionMode === 'nvg'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : visionMode === 'flir_thermal'
              ? 'bg-sky-950 border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.4)]'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Toggle NVG (Night Vision) / FLIR Thermal Camera"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden md:inline uppercase text-[10px]">
            {visionMode === 'normal' ? 'OPTICAL' : visionMode === 'nvg' ? 'NVG GREEN' : 'FLIR THERMAL'}
          </span>
        </button>

        {/* Pilot Flight Mode Button (If Aerial Craft Active) */}
        {isAerialVehicle && (
          <button
            onClick={onToggleFlightMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
              isFlightMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
                : 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900/80'
            }`}
            title="Toggle Direct Pilot / Gunner Controls"
          >
            <Plane className="w-3.5 h-3.5" />
            <span className="uppercase text-[10px]">{isFlightMode ? 'PILOT ACTIVE' : 'TAKEOFF'}</span>
          </button>
        )}

        {/* Vehicle Arsenal & Upgrades Store Catalog Button */}
        <button
          onClick={onOpenHangar}
          className="flex items-center gap-1.5 py-1 px-2 sm:px-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/60 text-red-300 text-xs font-tactical font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.25)]"
          title="Vehicle Garage & Blueprint Crafting Lab"
        >
          <Car className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">HANGAR & UPGRADES</span>
        </button>

        {/* NATO Tactical Compass */}
        <button
          onClick={onResetCompass}
          title="Reset Camera Azimuth (Face North)"
          className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-400 flex items-center justify-center transition-all cursor-pointer group shadow"
        >
          <div
            className="transition-transform duration-150"
            style={{ transform: `rotate(${-compassAngle}deg)` }}
          >
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-amber-400" />
          </div>
          <span className="absolute -top-1 font-mono text-[7px] font-bold text-red-500">N</span>
        </button>

        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </button>

        {/* Settings Cog Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Video Quality & System Settings"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 hover:rotate-45 transition-transform" />
        </button>
      </div>
    </header>
  );
};
