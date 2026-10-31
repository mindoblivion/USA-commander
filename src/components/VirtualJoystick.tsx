import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Flame, Shield, Crosshair } from 'lucide-react';

export interface JoystickVector {
  x: number; // -1 to 1 (left/right)
  y: number; // -1 to 1 (up/forward is -1, down/reverse is 1)
  isBoosting?: boolean;
}

interface VirtualJoystickProps {
  onMove: (vector: JoystickVector) => void;
  onBoostToggle?: (isBoosting: boolean) => void;
  boostFuel?: number;
  flaresCount?: number;
  onDeployFlares?: () => void;
  onFireCannon?: () => void;
  isFlightMode?: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onBoostToggle,
  boostFuel = 100,
  flaresCount = 3,
  onDeployFlares,
  onFireCannon,
  isFlightMode = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBoosting, setIsBoosting] = useState<boolean>(false);

  const maxRadius = 45; // max pixel distance from center

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;

    const distance = Math.hypot(deltaX, deltaY);
    const clampedDistance = Math.min(maxRadius, distance);
    const angle = Math.atan2(deltaY, deltaX);

    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;

    setKnobPos({ x: knobX, y: knobY });

    // Normalized outputs: -1 to 1
    const normX = clampedDistance > 5 ? knobX / maxRadius : 0;
    const normY = clampedDistance > 5 ? knobY / maxRadius : 0;

    onMove({ x: normX, y: normY, isBoosting });
  }, [isDragging, isBoosting, onMove]);

  const handlePointerUp = useCallback((e?: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0, isBoosting });
    if (e && 'currentTarget' in e && e.currentTarget) {
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture((e as React.PointerEvent).pointerId);
      } catch {
        // ignore
      }
    }
  }, [isBoosting, onMove]);

  // Global window pointer tracking while dragging
  useEffect(() => {
    if (!isDragging) return;

    const onGlobalPointerMove = (e: PointerEvent) => {
      handlePointerMove(e);
    };

    const onGlobalPointerUp = (e: PointerEvent) => {
      handlePointerUp(e);
    };

    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', onGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleBoostStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsBoosting(true);
    if (onBoostToggle) onBoostToggle(true);
  };

  const handleBoostEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsBoosting(false);
    if (onBoostToggle) onBoostToggle(false);
  };

  return (
    <>
      {/* 1. ANALOG VIRTUAL JOYSTICK (BOTTOM-LEFT) */}
      <div className="fixed bottom-6 left-6 z-40 select-none touch-none pointer-events-auto">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-32 h-32 rounded-full bg-slate-950/80 border-2 border-slate-700/80 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.85)] flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors group hover:border-red-500/60"
        >
          {/* Outer Compass & Crosshair Ticks */}
          <div className="absolute inset-2 rounded-full border border-slate-800/80 pointer-events-none" />
          
          {/* Directional Stencil Labels */}
          <span className="absolute top-1 text-[9px] font-mono font-black text-slate-500 group-hover:text-red-400">
            FWD
          </span>
          <span className="absolute bottom-1 text-[9px] font-mono font-black text-slate-500 group-hover:text-red-400">
            REV
          </span>
          <span className="absolute left-1.5 text-[9px] font-mono font-black text-slate-500 group-hover:text-red-400">
            L
          </span>
          <span className="absolute right-1.5 text-[9px] font-mono font-black text-slate-500 group-hover:text-red-400">
            R
          </span>

          {/* Center Crosshair Lines */}
          <div className="absolute w-full h-[1px] bg-slate-800 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-slate-800 pointer-events-none" />

          {/* Central Active Thumb Knob */}
          <div
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-transform duration-75 shadow-xl ${
              isDragging
                ? 'bg-gradient-to-b from-red-700 to-red-900 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.7)] scale-105'
                : 'bg-gradient-to-b from-slate-700 to-slate-900 border-slate-500 shadow-[0_0_10px_rgba(0,0,0,0.8)]'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`
            }}
          >
            {/* Knob Grip Knurling & Red Target Reticle */}
            <div className="w-5 h-5 rounded-full border border-slate-400/60 flex items-center justify-center">
              <div className={`w-2 h-2 rounded-full ${isDragging ? 'bg-white animate-ping' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>

        <div className="text-center mt-1">
          <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
            STEER & DRIVE
          </span>
        </div>
      </div>

      {/* 2. ACTION CONTROLS & NITRO BOOST BUTTON (BOTTOM-RIGHT) */}
      <div className="fixed bottom-6 right-6 z-40 select-none touch-none pointer-events-auto flex items-end gap-3">
        {/* Anti-SAM Countermeasure Flares */}
        {onDeployFlares && (
          <button
            onClick={onDeployFlares}
            disabled={flaresCount <= 0}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-90 shadow-xl cursor-pointer ${
              flaresCount > 0
                ? 'bg-amber-950/90 border-amber-500 text-amber-300 hover:bg-amber-900 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-slate-950/50 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
            }`}
            title="Deploy Anti-SAM Countermeasure Flares"
          >
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="text-[9px] font-mono font-black text-amber-200 uppercase mt-0.5">
              FLARES ({flaresCount})
            </span>
          </button>
        )}

        {/* Primary Vehicle / Aircraft Autocannon Fire */}
        {onFireCannon && (
          <button
            onClick={onFireCannon}
            className="w-16 h-16 rounded-2xl bg-red-950/90 border-2 border-red-500 text-red-300 hover:bg-red-900/90 active:scale-90 shadow-[0_0_20px_rgba(239,68,68,0.5)] flex flex-col items-center justify-center cursor-pointer"
            title="Fire Heavy Autocannon Strafe"
          >
            <Crosshair className="w-6 h-6 text-red-400 animate-spin-slow" />
            <span className="text-[9px] font-mono font-black uppercase text-red-200 mt-0.5">
              FIRE
            </span>
          </button>
        )}

        {/* Nitro Boost Button */}
        <div className="flex flex-col items-center">
          <button
            onPointerDown={handleBoostStart}
            onPointerUp={handleBoostEnd}
            onPointerLeave={handleBoostEnd}
            onPointerCancel={handleBoostEnd}
            disabled={boostFuel <= 0}
            className={`relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95 shadow-2xl cursor-pointer ${
              isBoosting
                ? 'bg-gradient-to-t from-red-700 via-rose-600 to-red-500 border-red-300 shadow-[0_0_30px_rgba(239,68,68,0.8)] scale-105 text-white'
                : boostFuel > 0
                ? 'bg-slate-950/85 border-red-600/70 hover:border-red-500 text-red-400 shadow-[0_0_15px_rgba(220,38,38,0.3)] backdrop-blur-md'
                : 'bg-slate-950/50 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
            }`}
            title="Hold for Nitrous Ramming Charge"
          >
            <Flame className={`w-7 h-7 ${isBoosting ? 'animate-bounce text-yellow-200' : ''}`} />
            <span className="text-[10px] font-heavy font-black tracking-wider uppercase">
              NITRO
            </span>

            {/* Boost Fuel Ring Bar */}
            <div className="absolute -bottom-1.5 w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-100 ${
                  boostFuel > 30 ? 'bg-red-500' : 'bg-amber-400'
                }`}
                style={{ width: `${boostFuel}%` }}
              />
            </div>
          </button>

          <span className="text-[8px] font-mono text-slate-400 mt-2 bg-slate-950/70 px-1.5 py-0.5 rounded border border-slate-800">
            [SPACE / HOLD]
          </span>
        </div>
      </div>
    </>
  );
};
