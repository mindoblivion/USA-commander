import React from 'react';
import { X, Award, Shield, Trophy, CheckCircle, Lock, Calendar, Star } from 'lucide-react';
import { CommanderAchievement } from '../firebase/firestoreService';

interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  medalIcon: string;
  requirementDescription: string;
  category: string;
}

export const ACHIEVEMENTS_LIST: AchievementDefinition[] = [
  {
    id: 'destruction_100',
    title: '100% Destruction',
    description: 'Demolish every single target structure and building in any combat theater.',
    medalIcon: '🏆',
    requirementDescription: 'Perform 100% target destruction in an active zone',
    category: 'TACTICAL COMBAT'
  },
  {
    id: 'precision_striker',
    title: 'Precision Striker',
    description: 'Neutralize 5 targets consecutively without calling a strike on empty ground.',
    medalIcon: '🎯',
    requirementDescription: 'Achieve 5 target hits consecutively with no waste',
    category: 'WEAPON SYSTEMS'
  },
  {
    id: 'nuclear_pioneer',
    title: 'Nuclear Pioneer',
    description: 'Successfully construct and detonate a GBU-43/B MOAB or Trident Nuclear ICBM.',
    medalIcon: '☢️',
    requirementDescription: 'Detonate a heavy thermonuclear asset',
    category: 'SPECIAL OPERATIONS'
  },
  {
    id: 'road_warrior',
    title: 'Road Warrior',
    description: 'Demolish 15 targets by ramming them with your tactical armored vehicle.',
    medalIcon: '🎖️',
    requirementDescription: 'Destroy 15 targets via vehicle collisions',
    category: 'HANGAR ASSAULT'
  },
  {
    id: 'intel_collector',
    title: 'Classified Collector',
    description: 'Successfully retrieve 10 Classified Intel fragments from the combat zone.',
    medalIcon: '📁',
    requirementDescription: 'Recover 10 blueprint or scrap boxes',
    category: 'INTELLIGENCE'
  },
  {
    id: 'capitalist_overlord',
    title: 'Capitalist Overlord',
    description: 'Accumulate more than $1,000,000 in total campaign destruction bounties.',
    medalIcon: '💰',
    requirementDescription: 'Earn $1,000,000 in total War Chest cash',
    category: 'FINANCIAL WARFARE'
  }
];

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedMedals: CommanderAchievement[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  unlockedMedals = []
}) => {
  if (!isOpen) return null;

  // Determine military rank based on achievements unlocked
  const unlockedCount = unlockedMedals.length;
  let militaryRank = 'Second Lieutenant';
  let rankColor = 'text-slate-400 border-slate-700 bg-slate-900/30';
  if (unlockedCount >= 6) {
    militaryRank = 'General of the Air Force (5-Star)';
    rankColor = 'text-red-400 border-red-500/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse';
  } else if (unlockedCount >= 4) {
    militaryRank = 'Colonel (Classified Ops)';
    rankColor = 'text-amber-400 border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
  } else if (unlockedCount >= 2) {
    militaryRank = 'Major (Strategic Command)';
    rankColor = 'text-sky-400 border-sky-500/40 bg-sky-950/20';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-tactical font-bold uppercase tracking-wider text-slate-100">
                Commander Achievements & Honors
              </h2>
              <p className="text-xs text-slate-400">
                Joint Chiefs of Staff · Official Military Medal Record
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Rank Card banner */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-2xl">
              🇺🇸
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest leading-none">Security clearance level</div>
              <div className="text-sm font-mono font-bold text-white mt-1">TS // SCI OPERATIONAL COMMANDER</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-amber-400 font-mono">Rank:</span>
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${rankColor}`}>
                  {militaryRank}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto justify-end">
            <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-xs font-mono text-slate-400 leading-none">MEDALS LOCKED</div>
              <div className="text-xl font-mono font-bold text-slate-400 mt-1">{6 - unlockedCount} / 6</div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center min-w-[120px]">
              <div className="text-xs font-mono text-amber-400 leading-none">MEDALS UNLOCKED</div>
              <div className="text-xl font-mono font-bold text-amber-400 mt-1 flex items-center justify-center gap-1.5">
                <Star className="w-4 h-4 fill-current animate-pulse" />
                {unlockedCount} / 6
              </div>
            </div>
          </div>
        </div>

        {/* Medals Grid list */}
        <div className="p-6 overflow-y-auto max-h-[55vh] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ACHIEVEMENTS_LIST.map((ach) => {
              const matchedMedal = unlockedMedals.find((m) => m.id === ach.id);
              const isUnlocked = !!matchedMedal;

              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-xl border flex gap-4 transition-all relative overflow-hidden ${
                    isUnlocked
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                      : 'bg-slate-950/50 border-slate-800/80'
                  }`}
                >
                  {/* Decorative glowing background mesh for unlocked */}
                  {isUnlocked && (
                    <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />
                  )}

                  {/* Medal Icon Column */}
                  <div className="flex flex-col items-center justify-start shrink-0 mt-1">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border transition-all ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-amber-400/20 to-yellow-600/15 border-amber-400/50 shadow-lg scale-105'
                          : 'bg-slate-900/60 border-slate-800 opacity-40 grayscale'
                      }`}
                    >
                      {isUnlocked ? ach.medalIcon : '🔒'}
                    </div>
                    {isUnlocked ? (
                      <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/30 uppercase mt-2 select-none shrink-0 tracking-wider">
                        UNLOCKED
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold text-slate-500 bg-slate-900/80 px-1 py-0.5 rounded border border-slate-800 uppercase mt-2 select-none shrink-0 tracking-wider">
                        CLASSIFIED
                      </span>
                    )}
                  </div>

                  {/* Content details Column */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                          {ach.category}
                        </span>
                        {isUnlocked && (
                          <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <h4
                        className={`text-sm font-tactical font-black uppercase mt-0.5 tracking-wide ${
                          isUnlocked ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {ach.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {ach.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-850 flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Shield className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{ach.requirementDescription}</span>
                      </div>
                      
                      {isUnlocked ? (
                        <div className="flex items-center gap-1 text-slate-400 text-[9px] shrink-0 font-bold bg-slate-900/80 px-1.5 py-0.5 rounded">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{new Date(matchedMedal.unlockedAt).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic shrink-0">PENDING ACTION</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="text-[10px] font-mono text-slate-400">
            Medal record is securely encrypted and backed up to Firebase cloud server.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-tactical text-xs font-semibold cursor-pointer transition-colors"
          >
            DISMISS
          </button>
        </div>

      </div>
    </div>
  );
};
