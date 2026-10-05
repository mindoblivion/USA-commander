import React from 'react';
import { X, Globe, Shield, AlertTriangle, ArrowRight, Lock } from 'lucide-react';
import { CombatTheater } from '../types/game';
import satelliteReconImg from '../assets/images/tactical_satellite_recon_1790988336309.jpg';

interface TheaterSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  theaters: CombatTheater[];
  activeTheaterId: string;
  onSelectTheater: (theaterId: string) => void;
  cash: number;
}

export const TheaterSelectorModal: React.FC<TheaterSelectorModalProps> = ({
  isOpen,
  onClose,
  theaters,
  activeTheaterId,
  onSelectTheater,
  cash
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-tactical font-bold uppercase tracking-wider text-slate-100">
                Global Combat Theaters & Strategic Targets
              </h2>
              <p className="text-xs text-slate-400">
                NORAD satellite network · Select an active operational strike zone
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recon Satellite Banner */}
        <div className="relative h-28 w-full overflow-hidden border-b border-slate-800 shrink-0">
          <img
            src={satelliteReconImg}
            alt="Tactical Satellite Reconnaissance"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
          <div className="absolute inset-0 p-5 flex flex-col justify-center">
            <div className="text-[10px] font-mono text-sky-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>KEYHOLE-11 Reconnaissance Feed Active</span>
            </div>
            <h3 className="text-lg font-display font-black text-white tracking-wide mt-0.5">
              THEATER DEPLOYMENT CONSOLE
            </h3>
            <p className="text-xs text-slate-300 max-w-md">
              Each theater features unique procedural industrial infrastructure, SAM network defenses, and high-value cash bounties.
            </p>
          </div>
        </div>

        {/* Theaters Grid */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {theaters.map((th) => {
              const isActive = th.id === activeTheaterId;
              const isLocked = !th.unlocked && cash < th.unlockCashRequired;

              return (
                <div
                  key={th.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isActive
                      ? 'bg-sky-950/40 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                      : th.unlocked
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/50 border-slate-800/60 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: th.accentColor }}
                        />
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
                          {th.codename}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          th.threatLevel === 'CRITICAL'
                            ? 'text-red-400 bg-red-950/60 border-red-500/40'
                            : th.threatLevel === 'DEFCON 1'
                            ? 'text-amber-400 bg-amber-950/60 border-amber-500/40'
                            : 'text-sky-400 bg-sky-950/60 border-sky-500/40'
                        }`}
                      >
                        {th.threatLevel}
                      </span>
                    </div>

                    <h4 className="font-tactical font-bold text-slate-100 text-base mb-1">
                      {th.name}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                      <span>{th.region}</span>
                      <span>·</span>
                      <span>{th.targetCount} Strategic Targets</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      {th.description}
                    </p>

                    <div className="py-2 px-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs mb-3">
                      <span className="text-slate-400">Estimated Target Bounty</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ${th.totalCityValue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  <div>
                    {isActive ? (
                      <div className="w-full py-2 bg-sky-500/20 text-sky-300 text-xs font-mono font-bold text-center rounded-lg border border-sky-500/40 flex items-center justify-center gap-1.5">
                        <Shield className="w-4 h-4 text-sky-400" /> ACTIVE THEATER COMMAND
                      </div>
                    ) : th.unlocked ? (
                      <button
                        onClick={() => {
                          onSelectTheater(th.id);
                          onClose();
                        }}
                        className="w-full py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white font-tactical font-bold text-xs rounded-lg shadow flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                      >
                        DEPLOY FLEET HERE <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : isLocked ? (
                      <div className="w-full py-2 bg-slate-800/40 text-slate-500 text-xs font-mono text-center rounded-lg flex items-center justify-center gap-1.5">
                        <Lock className="w-4 h-4" /> REQUIRES ${th.unlockCashRequired.toLocaleString()} DESTRUCTION
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectTheater(th.id);
                          onClose();
                        }}
                        className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-tactical font-bold text-xs rounded-lg shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        UNLOCK & DEPLOY (${th.unlockCashRequired.toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
