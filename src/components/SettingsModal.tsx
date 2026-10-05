import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Volume2,
  Tv,
  Crosshair,
  Share2,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  Cloud,
  CloudUpload,
  Trophy,
  LogIn,
  LogOut,
  User as UserIcon,
  Car
} from 'lucide-react';
import { GameSettings, TacticalOverlaySettings } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { auth } from '../firebase/config';
import {
  signInWithGoogle,
  logOutUser,
  fetchGlobalLeaderboard,
  LeaderboardItem
} from '../firebase/firestoreService';
import { onAuthStateChanged, User } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResetProgress: () => void;
  onManualCloudSync?: () => Promise<boolean>;
  isSyncing?: boolean;
}

type TabType = 'video' | 'audio' | 'overlays' | 'social' | 'leaderboard' | 'compliance';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetProgress,
  onManualCloudSync,
  isSyncing = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('video');
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      setLoadingLeaderboard(true);
      fetchGlobalLeaderboard()
        .then((items) => {
          setLeaderboardList(items);
        })
        .finally(() => setLoadingLeaderboard(false));
    }
  }, [activeTab]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const updateOverlay = (key: keyof TacticalOverlaySettings, value: boolean) => {
    soundEngine.playRadioClick();
    onUpdateSettings({
      overlays: {
        ...settings.overlays,
        [key]: value
      }
    });
  };

  const handleGoogleAuth = async () => {
    if (currentUser) {
      await logOutUser();
      showNotification('Signed out from Google Firebase.');
    } else {
      const user = await signInWithGoogle();
      if (user) {
        showNotification(`Welcome, Commander ${user.displayName || 'Authorized User'}!`);
      } else {
        showNotification('Google Sign-In canceled or running in offline mode.');
      }
    }
  };

  const handleCloudSync = async () => {
    if (!onManualCloudSync) return;
    const ok = await onManualCloudSync();
    if (ok) {
      showNotification('Tactical campaign successfully backed up to Firestore!');
    } else {
      showNotification('Cloud sync complete (local fallback active).');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-black text-slate-100 uppercase tracking-wide">
                Tactical Command Settings
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure graphics, military telemetry, audio, Firebase Cloud Sync, and leaderboards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notificationMsg && (
          <div className="mx-6 mt-3 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'video'
                ? 'border-amber-400 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-4 h-4" /> Video Quality
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'audio'
                ? 'border-amber-400 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" /> Audio & Radio
          </button>
          <button
            onClick={() => setActiveTab('overlays')}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'overlays'
                ? 'border-amber-400 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-4 h-4" /> Tactical HUD & Sensors
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'border-amber-400 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4" /> Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'social'
                ? 'border-amber-400 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" /> Firebase Cloud Sync
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'compliance'
                ? 'border-amber-400 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Compliance & Legal
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: VIDEO QUALITY */}
          {activeTab === 'video' && (
            <div className="space-y-5">
              {/* Presets */}
              <div>
                <label className="block text-xs font-tactical font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Graphics Preset Quality
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'ultra'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => onUpdateSettings({ graphicsQuality: level })}
                      className={`py-2 px-3 rounded-xl border text-xs font-tactical font-bold capitalize transition-all cursor-pointer ${
                        settings.graphicsQuality === level
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target FPS */}
              <div>
                <label className="block text-xs font-tactical font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Target FPS Frame Rate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([30, 60, 120] as const).map((rate) => (
                    <button
                      key={rate}
                      onClick={() => onUpdateSettings({ fpsTarget: rate })}
                      className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                        settings.fpsTarget === rate
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {rate} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Dynamic Shadows</div>
                    <div className="text-[10px] text-slate-400">Directional shadow maps on 3D buildings</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.shadows}
                    onChange={(e) => onUpdateSettings({ shadows: e.target.checked })}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Post-Processing Bloom</div>
                    <div className="text-[10px] text-slate-400">Explosion glow and nuclear flash bloom</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.postProcessing}
                    onChange={(e) => onUpdateSettings({ postProcessing: e.target.checked })}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO */}
          {activeTab === 'audio' && (
            <div className="space-y-5">
              {/* Master Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-tactical font-bold text-slate-300 uppercase tracking-wider">
                    Master Volume
                  </label>
                  <span className="text-xs font-mono text-amber-400">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* SFX Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-tactical font-bold text-slate-300 uppercase tracking-wider">
                    Sound Effects & Explosions
                  </label>
                  <span className="text-xs font-mono text-amber-400">
                    {Math.round(settings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Presidential Voiceover Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-tactical font-bold text-slate-300 uppercase tracking-wider">
                    Presidential Directives Voiceover
                  </label>
                  <span className="text-xs font-mono text-amber-400">
                    {Math.round(settings.presidentialVoiceVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.presidentialVoiceVolume}
                  onChange={(e) =>
                    onUpdateSettings({ presidentialVoiceVolume: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Audio Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Presidential Audio Voice</div>
                    <div className="text-[10px] text-slate-400">Synthesize verbal orders from Trump</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.presidentialVoice}
                    onChange={(e) => onUpdateSettings({ presidentialVoice: e.target.checked })}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Tactical Radio Chatter</div>
                    <div className="text-[10px] text-slate-400">USAF pilot confirmations & radio clicks</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.radioChatter}
                    onChange={(e) => onUpdateSettings({ radioChatter: e.target.checked })}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TACTICAL HUD & SENSORS */}
          {activeTab === 'overlays' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-tactical font-bold text-sky-200 uppercase tracking-wide flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-sky-400" /> MIL-SPEC TACTICAL SENSOR SUITE
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Real-time Pentagon telemetry, damage tracking, and target diagnostics
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Camera Follow Jeep */}
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-amber-300 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5" /> Follow-Cam Lock to Military Jeep
                    </div>
                    <div className="text-[10px] text-slate-400">Camera tracks behind the player vehicle</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.overlays.cameraFollowJeep}
                    onChange={(e) => updateOverlay('cameraFollowJeep', e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {/* Target Reticle */}
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Target Reticle & Blast Ring</div>
                    <div className="text-[10px] text-slate-400">Airstrike laser designator and tactical radius zone</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.overlays.targetReticle}
                    onChange={(e) => updateOverlay('targetReticle', e.target.checked)}
                    className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                  />
                </div>

                {/* Combat Damage Readouts */}
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Combat Damage Readouts</div>
                    <div className="text-[10px] text-slate-400">Live military strike hit numbers & kinetic damage</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.overlays.targetTelemetry}
                    onChange={(e) => updateOverlay('targetTelemetry', e.target.checked)}
                    className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                  />
                </div>

                {/* Target Structural Integrity */}
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Target Structural Integrity Bars</div>
                    <div className="text-[10px] text-slate-400">Live HP bars over hovered buildings & targets</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.overlays.targetHealthBars}
                    onChange={(e) => updateOverlay('targetHealthBars', e.target.checked)}
                    className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                  />
                </div>

                {/* Auto Salvage Drone */}
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Automated Salvage Drone</div>
                    <div className="text-[10px] text-slate-400">Instantly recovers scrap and intel for war chest cash</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.overlays.autoScrapRecovery}
                    onChange={(e) => updateOverlay('autoScrapRecovery', e.target.checked)}
                    className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                  />
                </div>

                {/* Low Detail Mode */}
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Low Detail Optimization</div>
                    <div className="text-[10px] text-slate-400">Reduces particle counts for peak mobile performance</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.overlays.lowDetailMode}
                    onChange={(e) => updateOverlay('lowDetailMode', e.target.checked)}
                    className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                  />
                </div>

                {/* Entity Hider */}
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">Suppress Debris Physics</div>
                    <div className="text-[10px] text-slate-400">Hides falling debris physics for maximum frame rate</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.overlays.entityHider}
                    onChange={(e) => updateOverlay('entityHider', e.target.checked)}
                    className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                  />
                </div>

                {/* FPS Counter */}
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical font-bold text-slate-200">NORAD FPS Monitor</div>
                    <div className="text-[10px] text-slate-400">Display live frame rate counter in corner</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.overlays.showFpsCounter}
                    onChange={(e) => updateOverlay('showFpsCounter', e.target.checked)}
                    className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-display font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" /> Top Commanders Worldwide
                  </h4>
                  <p className="text-xs text-slate-400">
                    Highest global total destruction cash recorded in Firebase Firestore
                  </p>
                </div>
                <button
                  onClick={() => {
                    setLoadingLeaderboard(true);
                    fetchGlobalLeaderboard()
                      .then((items) => setLeaderboardList(items))
                      .finally(() => setLoadingLeaderboard(false));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {loadingLeaderboard ? (
                <div className="py-12 text-center text-xs font-mono text-slate-400 animate-pulse">
                  Querying Firebase Firestore global records...
                </div>
              ) : leaderboardList.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-slate-400">
                  No public leaderboard entries yet. Be the first commander to sync your score!
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboardList.map((entry, idx) => (
                    <div
                      key={entry.userId || idx}
                      className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 text-center font-bold ${
                            idx === 0
                              ? 'text-amber-400'
                              : idx === 1
                              ? 'text-slate-300'
                              : idx === 2
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-200">
                            {entry.commanderName || 'Anonymous Commander'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {entry.highestTheater || 'metropolis_alpha'} · {entry.nuclearStrikes ? '☢️ Nuclear Certified' : 'Conventional'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-amber-400">
                          ${(entry.devastationScore || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">Total Devastation</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FIREBASE CLOUD SYNC */}
          {activeTab === 'social' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-200">
                      {currentUser ? currentUser.displayName || 'Authorized User' : 'Guest Commander'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {currentUser ? currentUser.email : 'Local device storage active (Sign in to sync)'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleGoogleAuth}
                    className={`py-2 px-4 rounded-xl text-xs font-tactical font-bold flex items-center gap-2 cursor-pointer transition-all ${
                      currentUser
                        ? 'bg-rose-950/60 hover:bg-rose-900/60 border border-rose-600/50 text-rose-300'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    {currentUser ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                    {currentUser ? 'Sign Out' : 'Sign in with Google'}
                  </button>

                  <button
                    onClick={handleCloudSync}
                    disabled={isSyncing}
                    className="py-2 px-4 rounded-xl text-xs font-tactical font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Cloud Save'}
                  </button>
                </div>
              </div>

              {/* Reset Game Section */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-tactical font-bold text-rose-300">
                    Reset War Campaign Progress
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Clear local cash, weapon upgrades, and reset back to initial Defcon state
                  </div>
                </div>
                {resetConfirmOpen ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setResetConfirmOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onResetProgress();
                        setResetConfirmOpen(false);
                        showNotification('Campaign state reset to initial.');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-mono font-bold cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setResetConfirmOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-tactical font-bold cursor-pointer transition-colors"
                  >
                    Reset Data
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: COMPLIANCE & LEGAL */}
          {activeTab === 'compliance' && (
            <div className="space-y-4 text-xs text-slate-400 font-mono">
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="font-bold text-slate-200 mb-1">USA Commander: Tactical Strike 3D</div>
                <div>Military tactical simulation built with Three.js WebGL and Firebase Authentication.</div>
                <div className="mt-2 text-[10px] text-slate-500">
                  Fully portable for GitHub repository export and Base44 web imports.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
          <span>USA Commander: Tactical Strike 3D</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-tactical font-bold cursor-pointer transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
