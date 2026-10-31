import React, { useState } from 'react';
import { Volume2, VolumeX, Award, ChevronUp, ChevronDown, CheckCircle2, AlertOctagon, Flame } from 'lucide-react';
import { PresidentialDirective } from '../types/game';
import trumpTalkIcon from '../assets/images/trump_talk_icon_1790990898845.jpg';
import trumpFailIcon from '../assets/images/trump_fail_icon_1790990913452.jpg';

interface PresidentialBriefingProps {
  directive: PresidentialDirective;
  onClaimBonus: (directiveId: string) => void;
  onPlaySpeech: (text: string) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  isUnderperforming?: boolean;
}

export const PresidentialBriefing: React.FC<PresidentialBriefingProps> = ({
  directive,
  onClaimBonus,
  onPlaySpeech,
  voiceEnabled,
  onToggleVoice,
  isUnderperforming = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [forcedAngry, setForcedAngry] = useState<boolean>(false);

  const isAngry = isUnderperforming || forcedAngry || !!directive.failed;

  const currentSpeech = isAngry
    ? (directive.angryQuote || "Total disaster! What are you doing?! You're under-performing, folks! Step on the gas, crush those houses, or you are FIRED!")
    : directive.quote;

  const activeAvatar = isAngry ? trumpFailIcon : trumpTalkIcon;

  return (
    <div className={`relative backdrop-blur-md rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
      isAngry
        ? 'bg-red-950/90 border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
        : 'bg-slate-950/85 border border-amber-500/30'
    }`}>
      {/* Top Trim Header */}
      <div className={`h-1.5 ${
        isAngry
          ? 'bg-gradient-to-r from-red-600 via-rose-400 to-red-600 animate-pulse'
          : 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600'
      }`} />

      {/* Header bar */}
      <div className={`px-3 py-2 flex items-center justify-between border-b ${
        isAngry
          ? 'border-red-500/30 bg-red-950/40'
          : 'border-amber-500/20 bg-amber-950/20'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full animate-ping ${
            isAngry ? 'bg-red-500' : 'bg-emerald-400'
          }`} />
          <span className={`text-[11px] font-tactical font-bold uppercase tracking-wider ${
            isAngry ? 'text-red-300 flex items-center gap-1' : 'text-amber-300'
          }`}>
            {isAngry && <Flame className="w-3 h-3 text-red-400" />}
            {isAngry ? 'POTUS ENRAGED · MISSION REPRIMAND' : 'White House Situation Room · Direct Dispatch'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPlaySpeech(currentSpeech)}
            title="Listen to Commander-in-Chief order"
            className={`p-1 rounded transition-colors cursor-pointer ${
              isAngry ? 'hover:bg-red-500/20 text-red-300' : 'hover:bg-amber-500/20 text-amber-300'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleVoice}
            title={voiceEnabled ? 'Mute presidential voiceover' : 'Enable presidential voiceover'}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded transition-colors cursor-pointer"
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded transition-colors ml-1 cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isExpanded && (
        <div className="p-3 flex items-start gap-3">
          {/* Dynamic Presidential Big Bobblehead Avatar */}
          <div className="relative shrink-0 group">
            <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-2xl bg-slate-900 transition-all animate-bobble ${
              isAngry
                ? 'border-4 border-red-500 ring-4 ring-red-500/60 shadow-[0_0_35px_rgba(239,68,68,0.8)]'
                : 'border-4 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.6)]'
            }`}>
              <img
                src={activeAvatar}
                alt={isAngry ? "Enraged Commander-in-Chief" : "Commander-in-Chief Donald J. Trump"}
                className="w-full h-full object-cover object-top scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className={`absolute -bottom-1 -right-1 font-bold text-[8px] font-mono px-1 rounded shadow ${
              isAngry ? 'bg-red-600 text-white animate-bounce' : 'bg-amber-500 text-slate-950'
            }`}>
              {isAngry ? 'ENRAGED' : 'POTUS'}
            </div>

            {/* Quick Toggle for testing angry state */}
            <button
              onClick={() => {
                const next = !forcedAngry;
                setForcedAngry(next);
                if (next) {
                  onPlaySpeech("Total disaster! What are you doing?! You're under-performing, folks! Step on the gas, crush those houses, or you are FIRED!");
                }
              }}
              className="absolute -top-1.5 -left-1.5 p-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-red-400 text-[8px] opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              title="Toggle Trump Angry / Normal Reaction"
            >
              <AlertOctagon className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Speech Bubble & Directive Objective */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold mb-1 flex items-center justify-between">
              <span className={isAngry ? 'text-red-200 font-bold' : 'text-amber-200'}>
                {isAngry ? '🔴 UNDER-PERFORMANCE WARNING' : directive.title}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                +${directive.cashBonus.toLocaleString()}
              </span>
            </div>

            <p className={`text-[12px] italic leading-snug line-clamp-3 mb-2 font-serif transition-colors ${
              isAngry ? 'text-red-100 font-bold' : 'text-slate-200'
            }`}>
              "{currentSpeech}"
            </p>

            {/* Objective Bar */}
            <div className={`p-2 rounded-lg border ${
              isAngry ? 'bg-black/60 border-red-500/40' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-300 text-[10px] truncate max-w-[170px]">{directive.targetDescription}</span>
                <span className={`font-mono text-[10px] font-bold ${isAngry ? 'text-red-400' : 'text-amber-400'}`}>
                  {directive.currentAmount} / {directive.targetAmount}
                </span>
              </div>

              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isAngry
                      ? 'bg-gradient-to-r from-red-600 to-rose-400'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  }`}
                  style={{
                    width: `${Math.min(100, (directive.currentAmount / directive.targetAmount) * 100)}%`
                  }}
                />
              </div>

              {/* Claim Bounty CTA */}
              {directive.completed && !directive.claimed && (
                <button
                  onClick={() => onClaimBonus(directive.id)}
                  className="mt-2 w-full py-1.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  Claim ${directive.cashBonus.toLocaleString()} Presidential Bounty
                </button>
              )}

              {directive.claimed && (
                <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> DIRECTIVE FULFILLED & REWARDED
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
