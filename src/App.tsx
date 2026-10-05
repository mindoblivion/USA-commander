/**
 * USA Commander: Tactical Strike 3D
 * Undercover Special Access Program // Black-Ops Vehicle Garage & Nuclear Command
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  CombatTheater,
  DestructibleTarget,
  GameSettings,
  IntelDrop,
  PresidentialDirective,
  StrikeAsset,
  TacticalStrikeIndicator,
  VehicleModelType,
  VehicleUpgradeState,
  VisionMode,
  TacticalWeather,
  BlueprintItem
} from './types/game';
import {
  COMBAT_THEATERS,
  DEFAULT_GAME_SETTINGS,
  DEFAULT_VEHICLE_UPGRADES,
  INITIAL_PRESIDENTIAL_DIRECTIVES,
  INITIAL_STRIKE_ASSETS
} from './data/gameDefaults';
import { generateTheaterTargets } from './utils/theaterGenerator';
import { soundEngine } from './audio/soundEngine';
import { BootSplashScreen } from './components/BootSplashScreen';
import { TacticalTopBar } from './components/TacticalTopBar';
import { Tactical3DScene } from './components/Tactical3DScene';
import { PresidentialBriefing } from './components/PresidentialBriefing';
import { VirtualJoystick, JoystickVector } from './components/VirtualJoystick';
import { HangarUpgradesModal } from './components/HangarUpgradesModal';
import { TheaterSelectorModal } from './components/TheaterSelectorModal';
import { SettingsModal } from './components/SettingsModal';
import { TacticalCombatOverlays } from './components/TacticalCombatOverlays';
import { testConnection, auth, db } from './firebase/config';
import { setDoc, doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { saveCampaignToCloud, loadCampaignFromCloud, CommanderAchievement } from './firebase/firestoreService';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AchievementsModal } from './components/AchievementsModal';
import { Radio } from 'lucide-react';

const STORAGE_KEY = 'usa_commander_save_v2';

export default function App() {
  // Game States
  const [inGame, setInGame] = useState<boolean>(false);
  const [cash, setCash] = useState<number>(150000);
  const [totalDevastationCash, setTotalDevastationCash] = useState<number>(0);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [strikeAssets, setStrikeAssets] = useState<StrikeAsset[]>(INITIAL_STRIKE_ASSETS);
  const [vehicleUpgrades, setVehicleUpgrades] = useState<VehicleUpgradeState>(DEFAULT_VEHICLE_UPGRADES);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('f16_strafe');
  const [theaters, setTheaters] = useState<CombatTheater[]>(COMBAT_THEATERS);
  const [activeTheaterId, setActiveTheaterId] = useState<string>('metropolis_alpha');
  const [targets, setTargets] = useState<DestructibleTarget[]>([]);
  const [directives, setDirectives] = useState<PresidentialDirective[]>(INITIAL_PRESIDENTIAL_DIRECTIVES);
  const [activeDirectiveIndex, setActiveDirectiveIndex] = useState<number>(0);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [unlockedMedals, setUnlockedMedals] = useState<CommanderAchievement[]>([]);
  const [achievementsOpen, setAchievementsOpen] = useState<boolean>(false);
  const [reticlePos, setReticlePos] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [coopMessages, setCoopMessages] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [calibrations, setCalibrations] = useState<{ napalmPools: boolean; depletedUranium: boolean }>({
    napalmPools: false,
    depletedUranium: false
  });
  const consecutiveHitsRef = useRef<number>(0);

  // Real-time Chat Sync Effect
  useEffect(() => {
    const q = query(
      collection(db, 'coop_chat'),
      orderBy('createdAt', 'desc'),
      limit(40)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: any[] = [];
      snap.forEach((doc) => {
        msgs.push(doc.data());
      });
      setCoopMessages(msgs.reverse());
    }, (err) => {
      console.warn("Chat subscription note:", err);
    });
    return () => unsub();
  }, [activeTheaterId]);
  const ramKillsRef = useRef<number>(0);
  const intelCollectedCountRef = useRef<number>(0);

  // Tactical Telemetry Overlays State
  const [intelDrops, setIntelDrops] = useState<IntelDrop[]>([]);
  const [strikeIndicators, setStrikeIndicators] = useState<TacticalStrikeIndicator[]>([]);
  const [compassAngle, setCompassAngle] = useState<number>(45);
  const [nukeFlashActive, setNukeFlashActive] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [combatLogs, setCombatLogs] = useState<{ id: string; text: string; time: string }[]>([]);
  const [joystickVector, setJoystickVector] = useState<JoystickVector>({ x: 0, y: 0, isBoosting: false });

  // Tactical Vision, Flight & Blueprint Systems
  const [visionMode, setVisionMode] = useState<VisionMode>('normal');
  const [weather, setWeather] = useState<TacticalWeather>('clear');
  const [isFlightMode, setIsFlightMode] = useState<boolean>(false);
  const [flaresCount, setFlaresCount] = useState<number>(5);
  const [flaresActive, setFlaresActive] = useState<boolean>(false);

  const [blueprints, setBlueprints] = useState<BlueprintItem[]>([
    {
      id: 'kinetic_rod',
      name: 'Orbital Kinetic Rod (Thor\'s Hammer)',
      codename: 'PROJECT THOR',
      fragmentsRequired: 3,
      currentFragments: 1,
      crafted: false,
      description: 'Hypersonic tungsten pole dropped from low orbit creating massive seismic shockwaves.',
      icon: 'zap',
      specialType: 'orbital_rod'
    },
    {
      id: 'emp_pulse_truck',
      name: 'Mobile EMP Generator Vehicle',
      codename: 'PROJECT ZEUS',
      fragmentsRequired: 2,
      currentFragments: 1,
      crafted: false,
      description: 'Electromagnetic blast truck that permanently disables hostile defenses and patrol convoys.',
      icon: 'shield',
      specialType: 'emp_pulse'
    },
    {
      id: 'railgun_tank',
      name: 'Hypersonic Railgun Super-Tank',
      codename: 'PROJECT ODIN',
      fragmentsRequired: 4,
      currentFragments: 2,
      crafted: false,
      description: 'Electromagnetic plasma tank firing 120mm solid Sabot rounds through all concrete megastructures.',
      icon: 'crosshair',
      specialType: 'railgun_tank'
    }
  ]);

  // Modals
  const [hangarOpen, setHangarOpen] = useState<boolean>(false);
  const [theaterModalOpen, setTheaterModalOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Add Combat Log Helper
  const addCombatLog = useCallback((text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setCombatLogs((prev) => [...prev.slice(-15), { id: Math.random().toString(), text, time }]);
  }, []);

  // Firebase auth state monitoring & optional connection test
  useEffect(() => {
    testConnection().then((ok) => {
      if (ok) {
        addCombatLog('NORAD Uplink: Firebase Firestore online.');
      } else {
        addCombatLog('NORAD Uplink: Local storage mode active.');
      }
    });

    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        addCombatLog(`Authenticated as Commander ${user.displayName || user.email}`);
        const cloudData = await loadCampaignFromCloud(user.uid);
        if (cloudData) {
          if (cloudData.cash !== undefined) setCash(cloudData.cash);
          if (cloudData.totalDevastationCash !== undefined)
            setTotalDevastationCash(cloudData.totalDevastationCash);
          if (cloudData.activeTheaterId) setActiveTheaterId(cloudData.activeTheaterId);
          if (cloudData.achievements) setUnlockedMedals(cloudData.achievements);
          addCombatLog('Restored campaign progress and medals from Firebase Cloud Save.');
        }
      }
    });

    return () => unsub();
  }, [addCombatLog]);

  // Load local save on startup with robust deep-merge fallback
  useEffect(() => {
    try {
      const saved = localStorage.getItem('usa_commander_save_v2') || localStorage.getItem('usa_commander_save_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cash !== undefined) setCash(parsed.cash);
        if (parsed.totalDevastationCash !== undefined)
          setTotalDevastationCash(parsed.totalDevastationCash);
        if (parsed.strikeAssets) setStrikeAssets(parsed.strikeAssets);
        if (parsed.theaters) setTheaters(parsed.theaters);
        if (parsed.activeTheaterId) setActiveTheaterId(parsed.activeTheaterId);
        if (parsed.unlockedMedals) setUnlockedMedals(parsed.unlockedMedals);

        // Safe merge settings so overlays is NEVER undefined
        const mergedSettings: GameSettings = {
          ...DEFAULT_GAME_SETTINGS,
          ...(parsed.settings || {}),
          overlays: {
            ...DEFAULT_GAME_SETTINGS.overlays,
            ...(parsed.settings?.overlays || {})
          }
        };
        setSettings(mergedSettings);

        // Safe merge vehicle upgrades
        if (parsed.vehicleUpgrades) {
          setVehicleUpgrades({
            ...DEFAULT_VEHICLE_UPGRADES,
            ...parsed.vehicleUpgrades
          });
        }
      }
    } catch {
      // Local fallback
    }
  }, []);

  // Save state on key changes
  const saveStateLocally = useCallback(() => {
    try {
      const payload = {
        cash,
        totalDevastationCash,
        strikeAssets,
        vehicleUpgrades,
        theaters,
        settings,
        activeTheaterId,
        unlockedMedals
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage quota fallback
    }
  }, [cash, totalDevastationCash, strikeAssets, vehicleUpgrades, theaters, settings, activeTheaterId, unlockedMedals]);

  useEffect(() => {
    saveStateLocally();
  }, [saveStateLocally]);

  // Sync to Cloud Save Helper
  const syncCurrentSaveToCloud = async (): Promise<boolean> => {
    if (!authUser) return false;
    setIsCloudSyncing(true);
    try {
      const ok = await saveCampaignToCloud({
        userId: authUser.uid,
        callsign: authUser.displayName || undefined,
        cash,
        totalDevastationCash,
        activeTheaterId,
        unlockedWeapons: strikeAssets.filter((a) => a.unlocked).map((a) => a.id),
        achievements: unlockedMedals,
        updatedAt: new Date().toISOString()
      });
      if (ok) addCombatLog('Tactical campaign state and medals synced to Firestore cloud.');
      return ok;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const triggerUnlockMedal = useCallback((medalId: string, title: string, medalIcon: string) => {
    setUnlockedMedals((prev) => {
      if (prev.some((m) => m.id === medalId)) return prev;

      const newMedal: CommanderAchievement = {
        id: medalId,
        title,
        description: '',
        medalIcon,
        unlockedAt: new Date().toISOString()
      };
      const updated = [...prev, newMedal];

      addCombatLog(`🎖️ MEDAL AWARDED: [${title}] successfully registered in Commander Profile!`);
      soundEngine.playRadioClick();
      confetti({ particleCount: 150, spread: 80, colors: ['#f59e0b', '#fbbf24', '#f59e0b'] });

      // Auto save updated save profile to Firebase
      if (auth.currentUser) {
        saveCampaignToCloud({
          userId: auth.currentUser.uid,
          cash,
          totalDevastationCash,
          selectedAssetId,
          activeTheaterId,
          unlockedWeapons: strikeAssets.filter((a) => a.unlocked).map((a) => a.id),
          achievements: updated,
          updatedAt: new Date().toISOString()
        });
      }
      return updated;
    });
  }, [addCombatLog, cash, totalDevastationCash, selectedAssetId, activeTheaterId, strikeAssets]);

  // Switch Theater and regenerate procedural targets
  const activeTheater = theaters.find((t) => t.id === activeTheaterId) || theaters[0];

  useEffect(() => {
    const newTargets = generateTheaterTargets(activeTheater);
    setTargets(newTargets);
    setIntelDrops([]);
    setStrikeIndicators([]);
    addCombatLog(`Entered theater: ${activeTheater.name} (${activeTheater.threatLevel})`);
  }, [activeTheaterId, activeTheater, addCombatLog]);

  // Active weapon asset
  const activeAsset = strikeAssets.find((a) => a.id === selectedAssetId) || strikeAssets[0];

  // Current presidential directive
  const currentDirective = directives[activeDirectiveIndex] || directives[0];

  // Destruction percentage calculation
  const totalHp = targets.reduce((sum, t) => sum + t.maxHp, 0);
  const currentHp = targets.reduce((sum, t) => sum + (t.isDestroyed ? 0 : t.hp), 0);
  const destructionPct = totalHp > 0 ? Math.round(((totalHp - currentHp) / totalHp) * 100) : 0;

  // FPS monitor loop
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Cooldown timer loop
  useEffect(() => {
    const interval = setInterval(() => {
      setStrikeAssets((prevAssets) =>
        prevAssets.map((asset) => {
          if (asset.currentCooldown > 0) {
            return {
              ...asset,
              currentCooldown: Math.max(0, asset.currentCooldown - 0.25)
            };
          }
          return asset;
        })
      );
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // JEEP & VEHICLE RAMMING DAMAGE HANDLER
  const handleTargetRamDamage = useCallback(
    (targetId: string, damage: number, isKill: boolean) => {
      setTargets((prevTargets) => {
        let bountyEarned = 0;
        const nextTargets = prevTargets.map((target) => {
          if (target.id === targetId && !target.isDestroyed) {
            const newHp = Math.max(0, target.hp - damage);
            const killed = newHp === 0 || isKill;

            if (killed) {
              bountyEarned = target.value;
              ramKillsRef.current += 1;
              if (ramKillsRef.current >= 15) {
                setTimeout(() => triggerUnlockMedal('road_warrior', 'Road Warrior', '🎖️'), 600);
              }

              // Check Presidential Directive progress
              setDirectives((prevDir) =>
                prevDir.map((dir, idx) => {
                  if (idx !== activeDirectiveIndex || dir.completed) return dir;
                  let match = false;
                  if (dir.targetType === 'any' || dir.targetType === 'jeep_ram') match = true;
                  if (dir.targetType === 'radar' && target.type === 'radar') match = true;
                  if (dir.targetType === 'bunker' && target.type === 'bunker') match = true;
                  if (dir.targetType === 'refinery' && target.type === 'refinery') match = true;

                  if (match) {
                    const newAmount = dir.currentAmount + 1;
                    const completed = newAmount >= dir.targetAmount;
                    if (completed && !dir.completed) {
                      soundEngine.speakPresidentialOrder(
                        "Outstanding driving, General! Direct order completed. Claim your bounty!",
                        settings.presidentialVoice,
                        settings.presidentialVoiceVolume
                      );
                    }
                    return { ...dir, currentAmount: newAmount, completed };
                  }
                  return dir;
                })
              );
            }

            return {
              ...target,
              hp: newHp,
              isDestroyed: killed
            };
          }
          return target;
        });

        if (bountyEarned > 0) {
          setCash((prev) => prev + bountyEarned);
          setTotalDevastationCash((prev) => prev + bountyEarned);
          soundEngine.playCashEarned();
        }

        return nextTargets;
      });

      // Add floating damage telemetry indicator
      if (settings.overlays?.targetTelemetry ?? true) {
        setStrikeIndicators((prev) => [
          ...prev.slice(-8),
          {
            id: Math.random().toString(),
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 60,
            y: window.innerHeight / 2 + (Math.random() - 0.5) * 60,
            damage,
            isCrit: isKill,
            createdAt: Date.now()
          }
        ]);

        setTimeout(() => setStrikeIndicators([]), 800);
      }

      // Check if theater 100% neutralized
      if (destructionPct >= 99) {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
        addCombatLog(`THEATER FULLY PACIFIED. Complete military victory in ${activeTheater.name}!`);
      }
    },
    [activeDirectiveIndex, activeTheater.name, destructionPct, settings.overlays?.targetTelemetry, settings.presidentialVoice, settings.presidentialVoiceVolume, addCombatLog]
  );

  // LAUNCH AIRSTRIKE / BOMB DROP
  const handleLaunchStrike = useCallback(
    (worldX: number, worldZ: number) => {
      if (activeAsset.currentCooldown > 0) {
        soundEngine.playRadioClick();
        return;
      }

      setStrikeAssets((prev) =>
        prev.map((a) => (a.id === activeAsset.id ? { ...a, currentCooldown: a.cooldownSeconds } : a))
      );

      soundEngine.playJetFlyby();
      if (activeAsset.isNuclear) {
        soundEngine.playNuclearAlarm();
        setNukeFlashActive(true);
        setTimeout(() => setNukeFlashActive(false), 3500);
      }

      setTimeout(() => {
        soundEngine.playExplosion(activeAsset.isNuclear ? 2.5 : activeAsset.radius > 8 ? 1.5 : 1.0);

        let damageDealtTotal = 0;
        let bountyEarned = 0;

        setTargets((prevTargets) => {
          return prevTargets.map((target) => {
            if (target.isDestroyed) return target;

            const dist = Math.hypot(target.x - worldX, target.z - worldZ);
            if (dist <= activeAsset.radius + Math.max(target.width, target.depth) / 2) {
              const falloff = 1 - (dist / (activeAsset.radius * 1.5)) * 0.4;
              const dmg = Math.round(activeAsset.damage * Math.max(0.6, falloff));
              const newHp = Math.max(0, target.hp - dmg);
              const isKilled = newHp === 0;

              damageDealtTotal += Math.min(target.hp, dmg);

              if (settings.overlays?.targetTelemetry ?? true) {
                setStrikeIndicators((prev) => [
                  ...prev.slice(-10),
                  {
                    id: Math.random().toString(),
                    x: window.innerWidth / 2 + (target.x - worldX) * 12 + (Math.random() - 0.5) * 40,
                    y: window.innerHeight / 2 + (target.z - worldZ) * 8 + (Math.random() - 0.5) * 40,
                    damage: dmg,
                    isCrit: dmg > activeAsset.damage * 0.9,
                    createdAt: Date.now()
                  }
                ]);
              }

              if (isKilled) {
                bountyEarned += target.value;

                const rarity: 'standard' | 'classified' | 'top_secret' | 'presidential' =
                  target.isBossTarget
                    ? 'presidential'
                    : target.value > 150000
                    ? 'top_secret'
                    : target.value > 50000
                    ? 'classified'
                    : 'standard';

                const newIntel: IntelDrop = {
                  id: Math.random().toString(),
                  x: target.x,
                  z: target.z,
                  value: Math.round(target.value * 0.2),
                  rarity,
                  title: `${target.name} Salvage`,
                  collected: settings.overlays?.autoScrapRecovery ?? true,
                  createdAt: Date.now()
                };

                setIntelDrops((prev) => [...prev, newIntel]);

                if (settings.overlays?.autoScrapRecovery ?? true) {
                  setCash((c) => c + newIntel.value);
                  soundEngine.playLootChime(
                    rarity === 'presidential'
                      ? 'mythic'
                      : rarity === 'top_secret'
                      ? 'legendary'
                      : rarity === 'classified'
                      ? 'rare'
                      : 'common'
                  );
                }

                setDirectives((prevDir) =>
                  prevDir.map((dir, idx) => {
                    if (idx !== activeDirectiveIndex || dir.completed) return dir;
                    let match = false;
                    if (dir.targetType === 'any') match = true;
                    if (dir.targetType === 'radar' && (target.type === 'radar' || target.type === 'air_defense')) match = true;
                    if (dir.targetType === 'bunker' && target.type === 'bunker') match = true;
                    if (dir.targetType === 'refinery' && (target.type === 'refinery' || target.type === 'factory')) match = true;
                    if (dir.targetType === 'nuke' && activeAsset.isNuclear) match = true;

                    if (match) {
                      const newAmount = dir.currentAmount + 1;
                      const completed = newAmount >= dir.targetAmount;
                      if (completed && !dir.completed) {
                        soundEngine.speakPresidentialOrder(
                          "Tremendous work, General! Direct order completed. Claim your White House bounty!",
                          settings.presidentialVoice,
                          settings.presidentialVoiceVolume
                        );
                      }
                      return { ...dir, currentAmount: newAmount, completed };
                    }
                    return dir;
                  })
                );
              }

              return {
                ...target,
                hp: newHp,
                isDestroyed: isKilled
              };
            }
            return target;
          });
        });

        if (damageDealtTotal > 0) {
          const cashReward = Math.round(damageDealtTotal * 12 + bountyEarned);
          setCash((prev) => prev + cashReward);
          setTotalDevastationCash((prev) => {
            const nextVal = prev + cashReward;
            if (nextVal >= 1000000) {
              // Defer so state updates safely
              setTimeout(() => triggerUnlockMedal('capitalist_overlord', 'Capitalist Overlord', '💰'), 100);
            }
            return nextVal;
          });
          soundEngine.playCashEarned();

          // Increment consecutive hits
          consecutiveHitsRef.current += 1;
          if (consecutiveHitsRef.current >= 5) {
            setTimeout(() => triggerUnlockMedal('precision_striker', 'Precision Striker', '🎯'), 200);
          }

          addCombatLog(
            `${activeAsset.name} strike hit for ${damageDealtTotal.toLocaleString()} DMG (+$${cashReward.toLocaleString()})`
          );
        } else {
          // Miss resets consecutive hits
          consecutiveHitsRef.current = 0;
        }

        if (activeAsset.id === 'tactical_nuke' || activeAsset.id === 'moab_bomb') {
          setTimeout(() => triggerUnlockMedal('nuclear_pioneer', 'Nuclear Pioneer', '☢️'), 300);
        }

        setTimeout(() => {
          setStrikeIndicators([]);
        }, 1100);

        if (destructionPct >= 99) {
          confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
          addCombatLog(`THEATER FULLY PACIFIED. Total military victory in ${activeTheater.name}!`);
          setTimeout(() => triggerUnlockMedal('destruction_100', '100% Destruction', '🏆'), 400);
        }
      }, 550);
    },
    [
      activeAsset,
      activeDirectiveIndex,
      activeTheater.name,
      destructionPct,
      settings.overlays?.autoScrapRecovery,
      settings.overlays?.targetTelemetry,
      settings.presidentialVoice,
      settings.presidentialVoiceVolume,
      addCombatLog
    ]
  );

  // Collect Intel Salvage & Blueprint Fragment Gathering
  const handleCollectIntel = (intelId: string) => {
    setIntelDrops((prev) =>
      prev.map((item) => {
        if (item.id === intelId && !item.collected) {
          const reward = Math.round(item.value * 1.5);
          setCash((c) => c + reward);
          soundEngine.playCashEarned();
          addCombatLog(`Recovered ${item.title} for +$${reward.toLocaleString()} War Chest bounty.`);

          intelCollectedCountRef.current += 1;
          if (intelCollectedCountRef.current >= 10) {
            setTimeout(() => triggerUnlockMedal('intel_collector', 'Classified Collector', '📁'), 500);
          }

          // Add Blueprint Fragment
          setBlueprints((prevBp) => {
            const uncrafted = prevBp.filter((b) => !b.crafted && b.currentFragments < b.fragmentsRequired);
            if (uncrafted.length === 0) return prevBp;
            const targetBp = uncrafted[Math.floor(Math.random() * uncrafted.length)];
            addCombatLog(`📁 RECOVERED BLUEPRINT FRAGMENT for ${targetBp.codename}!`);
            return prevBp.map((b) =>
              b.id === targetBp.id ? { ...b, currentFragments: b.currentFragments + 1 } : b
            );
          });

          return { ...item, collected: true };
        }
        return item;
      })
    );
  };

  // Vision, Weather, Flares & Blueprint Crafting Handlers
  const handleToggleVisionMode = () => {
    soundEngine.playRadioClick();
    setVisionMode((prev) => (prev === 'normal' ? 'nvg' : prev === 'nvg' ? 'flir_thermal' : 'normal'));
  };

  const handleCycleWeather = () => {
    soundEngine.playRadioClick();
    setWeather((prev) => {
      const modes: TacticalWeather[] = ['clear', 'thunderstorm', 'sandstorm', 'night_assault'];
      const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
      return modes[nextIdx];
    });
  };

  const handleDeployFlares = () => {
    if (flaresCount <= 0) return;
    setFlaresCount((c) => c - 1);
    setFlaresActive(true);
    soundEngine.playExplosion(1.0);
    addCombatLog('COUNTERMEASURE FLARES DEPLOYED! Jamming hostile SAM locks!');
    setTimeout(() => setFlaresActive(false), 2000);
  };

  const handleCraftBlueprint = (blueprintId: string) => {
    const bp = blueprints.find((b) => b.id === blueprintId);
    if (!bp || bp.currentFragments < bp.fragmentsRequired || bp.crafted) return;

    soundEngine.playCashEarned();
    confetti({ particleCount: 100, spread: 70 });

    setBlueprints((prev) =>
      prev.map((b) => (b.id === blueprintId ? { ...b, crafted: true } : b))
    );

    if (bp.specialType === 'orbital_rod') {
      setStrikeAssets((prev) => [
        ...prev,
        {
          id: 'thor_kinetic_rod',
          name: 'Orbital Rod (Thor)',
          code: 'PROJECT THOR',
          category: 'Orbital',
          description: 'Hypersonic tungsten kinetic rod launched from low orbit.',
          baseDamage: 2500,
          damage: 2500,
          radius: 12,
          cooldownSeconds: 20,
          currentCooldown: 0,
          cost: 0,
          level: 1,
          maxLevel: 5,
          upgradeCost: 250000,
          unlocked: true,
          unlockRequirement: 'Crafted in Blueprint Lab',
          iconName: 'zap',
          aircraftModel: 'orbital'
        }
      ]);
      addCombatLog('CRAFTED EXPERIMENTAL WEAPON: Orbital Kinetic Rod (Thor\'s Hammer) ready in Arsenal!');
    } else if (bp.specialType === 'railgun_tank') {
      setVehicleUpgrades((prev) => ({
        ...prev,
        unlockedVehicles: [...prev.unlockedVehicles, 'sr72_orbital'],
        activeVehicleId: 'sr72_orbital'
      }));
      addCombatLog('CRAFTED EXPERIMENTAL VEHICLE: Hypersonic Railgun Super-Tank deployed to Hangar!');
    } else if (bp.specialType === 'emp_pulse') {
      setVehicleUpgrades((prev) => ({
        ...prev,
        unlockedVehicles: [...prev.unlockedVehicles, 'stryker'],
        activeVehicleId: 'stryker'
      }));
      addCombatLog('CRAFTED EXPERIMENTAL VEHICLE: EMP Pulse Generator Truck ready!');
    }
  };

  // Claim Presidential Directive Bonus
  const handleClaimDirectiveBonus = (directiveId: string) => {
    const dir = directives.find((d) => d.id === directiveId);
    if (!dir || !dir.completed || dir.claimed) return;

    setCash((prev) => prev + dir.cashBonus);
    setTotalDevastationCash((prev) => prev + dir.cashBonus);
    soundEngine.playCashEarned();
    confetti({ particleCount: 80, spread: 60 });
    addCombatLog(`CLAIMED White House bounty +$${dir.cashBonus.toLocaleString()} from President Trump!`);

    setDirectives((prev) =>
      prev.map((d) => (d.id === directiveId ? { ...d, claimed: true } : d))
    );

    setTimeout(() => {
      setActiveDirectiveIndex((prev) => (prev + 1) % directives.length);
    }, 1200);
  };

  // Broadcast Tactical Chat message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const user = auth.currentUser;
    if (!user) {
      addCombatLog("⚠️ CHAT REJECTED: Sign in to broadcast secure encrypted messages.");
      return;
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const msgRef = doc(db, 'coop_chat', messageId);

    try {
      await setDoc(msgRef, {
        id: messageId,
        userId: user.uid,
        commanderName: user.displayName || user.email?.split('@')[0] || 'US Commander',
        activeTheaterId,
        text: chatInput.trim(),
        createdAt: new Date().toISOString()
      });
      setChatInput('');
      soundEngine.playRadioClick();
    } catch (err) {
      console.error("Chat send failed:", err);
      addCombatLog("⚠️ TRANS-COMM FAILURE: Security validation failed.");
    }
  };

  // Toggle Armory Calibration Bench mods
  const handleToggleCalibration = (key: 'napalmPools' | 'depletedUranium', cost: number) => {
    if (calibrations[key]) {
      setCalibrations((prev) => ({ ...prev, [key]: false }));
      addCombatLog(`Deactivated armory calibration: ${key === 'napalmPools' ? 'NAPALM CORE' : 'DEPLETED URANIUM'}`);
    } else {
      if (cash < cost) return;
      setCash((c) => c - cost);
      setCalibrations((prev) => ({ ...prev, [key]: true }));
      soundEngine.playRadioClick();
      addCombatLog(`ACTIVATED ARMORY CALIBRATION: ${key === 'napalmPools' ? 'NAPALM COMBUSTIVE CORES' : 'DEPLETED URANIUM AP ROUNDS'}`);
    }
  };

  // Upgrade Weapon Asset
  const handleUpgradeAsset = (assetId: string) => {
    const asset = strikeAssets.find((a) => a.id === assetId);
    if (!asset || asset.level >= asset.maxLevel || cash < asset.upgradeCost) return;

    setCash((prev) => prev - asset.upgradeCost);
    soundEngine.playRadioClick();

    setStrikeAssets((prev) =>
      prev.map((a) => {
        if (a.id === assetId) {
          const nextLevel = a.level + 1;
          const nextDmg = Math.round(a.damage * 1.35);
          const nextCost = Math.round(a.upgradeCost * 1.8);
          return {
            ...a,
            level: nextLevel,
            damage: nextDmg,
            upgradeCost: nextCost
          };
        }
        return a;
      })
    );

    addCombatLog(`UPGRADED ${asset.name} to Level ${asset.level + 1}!`);
  };

  // Unlock Weapon Asset
  const handleUnlockAsset = (assetId: string) => {
    const asset = strikeAssets.find((a) => a.id === assetId);
    if (!asset || asset.unlocked || cash < asset.cost) return;

    setCash((prev) => prev - asset.cost);
    soundEngine.playRadioClick();

    setStrikeAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, unlocked: true } : a))
    );

    confetti({ particleCount: 60, spread: 50 });
    addCombatLog(`UNLOCKED USAF Strategic Asset: ${asset.name} (${asset.code})!`);
  };

  // Vehicle Switch & Purchase Handlers
  const handleSelectVehicle = (vehicleId: VehicleModelType) => {
    setVehicleUpgrades((prev) => ({ ...prev, activeVehicleId: vehicleId }));
    addCombatLog(`Active combat vehicle switched to ${vehicleId.toUpperCase()}`);
  };

  const handleUnlockVehicle = (vehicleId: VehicleModelType, cost: number) => {
    if (cash < cost) return;
    setCash((c) => c - cost);
    setVehicleUpgrades((prev) => ({
      ...prev,
      unlockedVehicles: [...prev.unlockedVehicles, vehicleId],
      activeVehicleId: vehicleId
    }));
    confetti({ particleCount: 75, spread: 65 });
    addCombatLog(`Acquired new combat vehicle: ${vehicleId.toUpperCase()}!`);
  };

  const handleUpgradeVehiclePart = (
    part: 'ramPlow' | 'turretGun' | 'engine' | 'armor' | 'nitro',
    cost: number
  ) => {
    if (cash < cost) return;
    setCash((c) => c - cost);
    setVehicleUpgrades((prev) => {
      const key = `${part}Level` as keyof VehicleUpgradeState;
      const curr = (prev[key] as number) || 0;
      return { ...prev, [key]: curr + 1 };
    });
    addCombatLog(`Upgraded vehicle ${part} to Tier ${((vehicleUpgrades[`${part}Level` as keyof VehicleUpgradeState] as number) || 0) + 1}!`);
  };

  // Reset Progress
  const handleResetProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('usa_commander_save_v1');
    setCash(150000);
    setTotalDevastationCash(0);
    setStrikeAssets(INITIAL_STRIKE_ASSETS);
    setVehicleUpgrades(DEFAULT_VEHICLE_UPGRADES);
    setTheaters(COMBAT_THEATERS);
    setDirectives(INITIAL_PRESIDENTIAL_DIRECTIVES);
    setActiveTheaterId('metropolis_alpha');
    setTargets(generateTheaterTargets(COMBAT_THEATERS[0]));
    addCombatLog('War campaign progress has been reset to defaults.');
  };

  // Startup AAA Title Screen
  if (!inGame) {
    return (
      <>
        <BootSplashScreen
          onStartGame={() => {
            soundEngine.playRadioClick();
            setInGame(true);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHangar={() => setHangarOpen(true)}
          onOpenTheaters={() => setTheaterModalOpen(true)}
          cash={cash}
          activeTheater={activeTheater}
          activeVehicleId={vehicleUpgrades.activeVehicleId}
          settings={settings}
        />

        {/* Modals Accessible from Title Screen */}
        <HangarUpgradesModal
          isOpen={hangarOpen}
          onClose={() => setHangarOpen(false)}
          assets={strikeAssets}
          vehicleUpgrades={vehicleUpgrades}
          cash={cash}
          totalDestructionCash={totalDevastationCash}
          blueprints={blueprints}
          onCraftBlueprint={handleCraftBlueprint}
          onUpgradeAsset={handleUpgradeAsset}
          onUnlockAsset={handleUnlockAsset}
          onSelectVehicle={handleSelectVehicle}
          onUnlockVehicle={handleUnlockVehicle}
          onUpgradeVehiclePart={handleUpgradeVehiclePart}
          calibrations={calibrations}
          onToggleCalibration={handleToggleCalibration}
        />

        <TheaterSelectorModal
          isOpen={theaterModalOpen}
          onClose={() => setTheaterModalOpen(false)}
          theaters={theaters}
          activeTheaterId={activeTheaterId}
          onSelectTheater={(id) => {
            setActiveTheaterId(id);
            soundEngine.playRadioClick();
          }}
          cash={cash}
        />

        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
          onResetProgress={handleResetProgress}
          onManualCloudSync={syncCurrentSaveToCloud}
          isSyncing={isCloudSyncing}
        />

        <AchievementsModal
          isOpen={achievementsOpen}
          onClose={() => setAchievementsOpen(false)}
          unlockedMedals={unlockedMedals}
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden flex flex-col bg-[#060911] text-slate-100 font-sans select-none">
      {/* FIXED TOP HUD BAR */}
      <TacticalTopBar
        cash={cash}
        theater={activeTheater}
        destructionPct={destructionPct}
        compassAngle={compassAngle}
        onResetCompass={() => setCompassAngle(0)}
        onOpenTheaters={() => setTheaterModalOpen(true)}
        onOpenHangar={() => setHangarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAchievements={() => setAchievementsOpen(true)}
        isMuted={isMuted}
        onToggleMute={() => {
          const next = !isMuted;
          setIsMuted(next);
          soundEngine.setMute(next);
        }}
        fps={fps}
        showFps={settings.overlays?.showFpsCounter ?? true}
        visionMode={visionMode}
        onToggleVisionMode={handleToggleVisionMode}
        weather={weather}
        onCycleWeather={handleCycleWeather}
        isFlightMode={isFlightMode}
        onToggleFlightMode={() => setIsFlightMode((prev) => !prev)}
        isAerialVehicle={['helicopter', 'a10_jet', 'b2_bomber', 'ac130', 'sr72_orbital'].includes(vehicleUpgrades.activeVehicleId)}
      />

      {/* FULLSCREEN 3D VIEWPORT */}
      <main className="absolute inset-0 w-full h-full overflow-hidden">
        <Tactical3DScene
          theater={activeTheater}
          targets={targets}
          activeStrikeRadius={activeAsset.radius}
          strikeWeaponId={activeAsset.id}
          isNuclearStrikeActive={!!activeAsset.isNuclear}
          settings={settings}
          vehicleUpgrades={vehicleUpgrades}
          joystickVector={joystickVector}
          onTargetClick={handleLaunchStrike}
          onTargetRamDamage={handleTargetRamDamage}
          onIntelCollect={handleCollectIntel}
          intelDrops={intelDrops}
          compassAngle={compassAngle}
          setCompassAngle={setCompassAngle}
          onAddCombatLog={addCombatLog}
          visionMode={visionMode}
          weather={weather}
          isFlightMode={isFlightMode}
          flaresActive={flaresActive}
          onReticleMove={(x, z) => setReticlePos({ x, z })}
        />

        {/* FIXED FLOATING PRESIDENTIAL BRIEFING DRAWER */}
        <div className="fixed top-14 left-3 sm:left-4 z-30 max-w-[290px] sm:max-w-sm w-full pointer-events-auto">
          <PresidentialBriefing
            directive={currentDirective}
            onClaimBonus={handleClaimDirectiveBonus}
            onPlaySpeech={(text) =>
              soundEngine.speakPresidentialOrder(
                text,
                settings.presidentialVoice,
                settings.presidentialVoiceVolume
              )
            }
            voiceEnabled={settings.presidentialVoice}
            onToggleVoice={() =>
              setSettings((s) => ({ ...s, presidentialVoice: !s.presidentialVoice }))
            }
          />
        </div>

        {/* TACTICAL COMBAT DAMAGE OVERLAYS & LOG */}
        <TacticalCombatOverlays
          strikeIndicators={strikeIndicators}
          showStrikeIndicators={settings.overlays?.targetTelemetry ?? true}
          nukeFlashActive={nukeFlashActive}
          combatLogs={combatLogs}
        />

        {/* NATO CHAT TOGGLE BUTTON */}
        <button
          onClick={() => {
            setChatOpen((prev) => !prev);
            soundEngine.playRadioClick();
          }}
          className="fixed left-3 sm:left-4 top-[240px] z-30 w-11 h-11 sm:w-12 sm:h-11 rounded-xl bg-slate-950/80 border border-cyan-500/40 hover:border-cyan-400 text-cyan-400 hover:bg-slate-900/90 shadow-[0_0_15px_rgba(6,182,212,0.15)] backdrop-blur-md flex items-center justify-center cursor-pointer transition-all active:scale-95 pointer-events-auto"
          title="Open NATO Tactical Trans-Comms Chat"
        >
          <div className="relative">
            <Radio className="w-5.5 h-5.5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
        </button>

        {/* NATO CHAT SLIDING PANEL */}
        {chatOpen && (
          <div className="fixed left-3 sm:left-4 top-[305px] z-30 max-w-[290px] sm:max-w-sm w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col overflow-hidden max-h-[360px] animate-fade-in pointer-events-auto">
            {/* Header */}
            <div className="bg-slate-900/90 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Radio className="w-4.5 h-4.5 text-cyan-400 animate-pulse" />
                <span className="text-[11px] font-black tracking-widest text-cyan-300 font-mono uppercase">
                  NATO JOINT-OPS TRANS-COMMS
                </span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-[10px] font-bold font-mono text-slate-500 hover:text-slate-300 uppercase cursor-pointer"
              >
                [HIDE]
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 max-h-[240px] font-mono text-[10px]">
              {coopMessages.length === 0 ? (
                <div className="text-center text-slate-600 py-6 italic">
                  No active comms. Awaiting coordinates transmission...
                </div>
              ) : (
                coopMessages.map((msg, idx) => (
                  <div key={msg.id || idx} className="bg-slate-900/40 p-2 rounded border border-slate-800/60">
                    <div className="flex justify-between items-center text-[9px] text-cyan-500 font-bold mb-1">
                      <span>CDR: {msg.commanderName}</span>
                      <span className="text-slate-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[10px]">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} className="p-2.5 bg-slate-900/80 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={140}
                placeholder={auth.currentUser ? "Transmit coordinates..." : "Sign in to broadcast..."}
                disabled={!auth.currentUser}
                className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/70 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!auth.currentUser || !chatInput.trim()}
                className="px-3.5 py-1.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-bold font-mono text-[10px] hover:bg-cyan-900/60 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                TX
              </button>
            </form>
          </div>
        )}

        {/* ON-SCREEN VIRTUAL JOYSTICK (BOTTOM-LEFT) & ACTION BUTTONS (BOTTOM-RIGHT) */}
        <VirtualJoystick
          onMove={setJoystickVector}
          onBoostToggle={(isBoosting) =>
            setJoystickVector((prev) => ({ ...prev, isBoosting }))
          }
          flaresCount={flaresCount}
          onDeployFlares={handleDeployFlares}
          onFireCannon={() => handleLaunchStrike(reticlePos.x, reticlePos.z)}
          isFlightMode={isFlightMode}
        />
      </main>

      {/* MODALS */}
      <HangarUpgradesModal
        isOpen={hangarOpen}
        onClose={() => setHangarOpen(false)}
        assets={strikeAssets}
        vehicleUpgrades={vehicleUpgrades}
        cash={cash}
        totalDestructionCash={totalDevastationCash}
        onUpgradeAsset={handleUpgradeAsset}
        onUnlockAsset={handleUnlockAsset}
        onSelectVehicle={handleSelectVehicle}
        onUnlockVehicle={handleUnlockVehicle}
        onUpgradeVehiclePart={handleUpgradeVehiclePart}
        calibrations={calibrations}
        onToggleCalibration={handleToggleCalibration}
      />

      <TheaterSelectorModal
        isOpen={theaterModalOpen}
        onClose={() => setTheaterModalOpen(false)}
        theaters={theaters}
        activeTheaterId={activeTheaterId}
        onSelectTheater={(id) => {
          setActiveTheaterId(id);
          soundEngine.playRadioClick();
        }}
        cash={cash}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
        onResetProgress={handleResetProgress}
        onManualCloudSync={syncCurrentSaveToCloud}
        isSyncing={isCloudSyncing}
      />

      <AchievementsModal
        isOpen={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
        unlockedMedals={unlockedMedals}
      />
    </div>
  );
}
