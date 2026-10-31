import React, { useState } from 'react';
import {
  X,
  Zap,
  Shield,
  Target,
  Clock,
  ArrowUpCircle,
  Radio,
  Check,
  Car,
  Wind,
  Flame,
  Wrench,
  Plane,
  Crosshair,
  Lock,
  ChevronRight,
  Cpu,
  FileText
} from 'lucide-react';
import { StrikeAsset, VehicleCatalogItem, VehicleModelType, VehicleUpgradeState, BlueprintItem } from '../types/game';
import { VEHICLE_CATALOG_ITEMS } from '../data/gameDefaults';
import { soundEngine } from '../audio/soundEngine';
import b2BomberImg from '../assets/images/airstrike_b2_stealth_1790988325986.jpg';

interface HangarUpgradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: StrikeAsset[];
  vehicleUpgrades: VehicleUpgradeState;
  cash: number;
  totalDestructionCash: number;
  blueprints?: BlueprintItem[];
  onCraftBlueprint?: (blueprintId: string) => void;
  onUpgradeAsset: (assetId: string) => void;
  onUnlockAsset: (assetId: string) => void;
  onSelectVehicle: (vehicleId: VehicleModelType) => void;
  onUnlockVehicle: (vehicleId: VehicleModelType, cost: number) => void;
  onUpgradeVehiclePart: (part: 'ramPlow' | 'turretGun' | 'engine' | 'armor' | 'nitro', cost: number) => void;
  calibrations?: { napalmPools: boolean; depletedUranium: boolean };
  onToggleCalibration?: (key: 'napalmPools' | 'depletedUranium', cost: number) => void;
}

type CatalogTab = 'vehicles' | 'mods' | 'airstrikes' | 'blueprints' | 'calibrations';

export const HangarUpgradesModal: React.FC<HangarUpgradesModalProps> = ({
  isOpen,
  onClose,
  assets,
  vehicleUpgrades,
  cash,
  totalDestructionCash,
  blueprints,
  onCraftBlueprint,
  onUpgradeAsset,
  onUnlockAsset,
  onSelectVehicle,
  onUnlockVehicle,
  onUpgradeVehiclePart,
  calibrations = { napalmPools: false, depletedUranium: false },
  onToggleCalibration
}) => {
  const [activeTab, setActiveTab] = useState<CatalogTab>('vehicles');

  if (!isOpen) return null;

  // Modification costs and descriptions
  const MOD_DEFINITIONS = [
    {
      id: 'ramPlow' as const,
      name: 'Reinforced Steel Ramming Plow',
      icon: Shield,
      currentLevel: vehicleUpgrades.ramPlowLevel,
      maxLevel: 5,
      costs: [12000, 35000, 85000, 190000, 450000],
      levels: [
        'None (Standard Bumper)',
        'Heavy Steel Push Bar (+50% Ram DMG)',
        'V-Wedge Bulldozer Plow (+120% Ram DMG, Smashes Fences)',
        'Reinforced Highway Interceptor Ram (+200% Ram DMG)',
        'Heavy Concrete Breaker Ram (+320% Ram DMG, Crushes Cars)',
        'Titanium Kinetic Obliterator Blade (+500% Ram DMG, Demolishes Houses)'
      ],
      desc: 'Heavy frontal steel wedge designed to smash directly into residential houses, fences, and parked cars without slowing down.'
    },
    {
      id: 'turretGun' as const,
      name: 'Roof-Mounted Auto-Turret Gun',
      icon: Crosshair,
      currentLevel: vehicleUpgrades.turretGunLevel,
      maxLevel: 5,
      costs: [15000, 45000, 110000, 260000, 600000],
      levels: [
        'None (Unarmed Chassis)',
        '.50 Caliber Browning M2 (Single Heavy Barrel)',
        'Twin .50 Caliber Dual Mount (High Rate of Fire)',
        '20mm M61 Vulcan Rotary Cannon (Rapid Shredder)',
        '30mm Bushmaster Autocannon (Explosive Rounds)',
        'Dual High-Energy Laser Autocannon (Instant Vaporization)'
      ],
      desc: 'Heavy mounted turret that targets nearby hostile outposts, structures, and sentinels while you drive.'
    },
    {
      id: 'engine' as const,
      name: 'Twin-Turbo Supercharged Powertrain',
      icon: Zap,
      currentLevel: vehicleUpgrades.engineLevel,
      maxLevel: 5,
      costs: [10000, 28000, 70000, 160000, 380000],
      levels: [
        'Stock Military Diesel (55 km/h)',
        'Twin-Turbo V8 Upgrade (68 km/h)',
        'High-Output Supercharger (82 km/h)',
        'Gas Turbine Hybrid Core (98 km/h)',
        'Experimental Drag Turbine (115 km/h)'
      ],
      desc: 'Maximizes acceleration and top velocity to deliver colossal kinetic energy on impact with structures.'
    },
    {
      id: 'armor' as const,
      name: 'Chobham Heavy Armored Plating',
      icon: Shield,
      currentLevel: vehicleUpgrades.armorLevel,
      maxLevel: 5,
      costs: [14000, 38000, 95000, 220000, 520000],
      levels: [
        'Standard Steel Roll Cage',
        'Kevlar Composite Blast Panels (+35% Durability)',
        'Chobham Armor Steel Skirts (+80% Durability)',
        'Explosive Reactive Armor Tiles (+150% Durability)',
        'Depleted Uranium Nano-Matrix (+250% Durability)'
      ],
      desc: 'Reinforces vehicle hull to absorb extreme crashes and increase overall kinetic crushing mass.'
    },
    {
      id: 'nitro' as const,
      name: 'Rocket Thruster Nitrous Injector',
      icon: Flame,
      currentLevel: vehicleUpgrades.nitroLevel,
      maxLevel: 5,
      costs: [18000, 48000, 120000, 280000, 650000],
      levels: [
        'Standard Nitrous Canister (1.6x Boost)',
        'High-Flow Twin Nozzles (1.9x Boost)',
        'Cryogenic Nitrous Injection (2.3x Boost)',
        'Solid-Fuel Rocket Assist (2.8x Boost)',
        'Supersonic Ion Afterburner (3.5x Boost)'
      ],
      desc: 'Hit Space to burn high-thrust rocket fuel for supersonic ramming charges that launch vehicles and shatter walls.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Secret Classified Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950 border border-red-600/50 text-red-400 uppercase tracking-widest">
                  TOP SECRET // TS-SCI
                </span>
                <span className="text-[10px] font-mono text-slate-400">PENTAGON BLACK BUDGET CATALOG</span>
              </div>
              <h2 className="text-base sm:text-lg font-display font-black uppercase tracking-wider text-slate-100">
                Black-Ops Vehicles & Strategic Armory
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-400">War Chest Budget</div>
              <div className="text-lg font-mono font-bold text-emerald-400">${cash.toLocaleString()}</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-2.5 border-b border-slate-800 bg-slate-950/60 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              soundEngine.playRadioClick();
              setActiveTab('vehicles');
            }}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'vehicles'
                ? 'border-amber-400 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Car className="w-4 h-4" /> 1. Combat Vehicles (Jeep, Tank, Helicopter, Jet)
          </button>
          <button
            onClick={() => {
              soundEngine.playRadioClick();
              setActiveTab('mods');
            }}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'mods'
                ? 'border-amber-400 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" /> 2. Vehicle Modifications (Plow, Guns, Armor)
          </button>
          <button
            onClick={() => {
              soundEngine.playRadioClick();
              setActiveTab('airstrikes');
            }}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'airstrikes'
                ? 'border-amber-400 text-amber-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plane className="w-4 h-4" /> 3. USAF Aerial & Strategic Bombers
          </button>
          <button
            onClick={() => {
              soundEngine.playRadioClick();
              setActiveTab('blueprints');
            }}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'blueprints'
                ? 'border-sky-400 text-sky-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" /> 4. Pentagon Blueprint Crafting Lab
          </button>
          <button
            onClick={() => {
              soundEngine.playRadioClick();
              setActiveTab('calibrations');
            }}
            className={`px-4 py-2.5 text-xs font-tactical font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'calibrations'
                ? 'border-red-500 text-red-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-4 h-4" /> 5. Experimental Armory Calibration Bench
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: COMBAT VEHICLES */}
          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VEHICLE_CATALOG_ITEMS.map((veh) => {
                  const isUnlocked = vehicleUpgrades.unlockedVehicles.includes(veh.id);
                  const isCurrent = vehicleUpgrades.activeVehicleId === veh.id;
                  const canAfford = cash >= veh.cost;

                  return (
                    <div
                      key={veh.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'bg-amber-950/20 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : isUnlocked
                          ? 'bg-slate-900/70 border-slate-700/80'
                          : 'bg-slate-950/80 border-slate-800/80 opacity-90'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                                {veh.category}
                              </span>
                              <span className="text-xs font-mono text-amber-400">{veh.codename}</span>
                            </div>
                            <h3 className="text-base font-display font-black text-white mt-1">
                              {veh.name}
                            </h3>
                          </div>
                          {isCurrent ? (
                            <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> ACTIVE
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              IN HANGAR
                            </span>
                          ) : (
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              ${veh.cost.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mb-3">{veh.description}</p>

                        {/* Specs Matrix */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-center text-xs font-mono mb-3">
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Top Speed</div>
                            <div className="font-bold text-slate-200">{veh.topSpeed} km/h</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Ramming Force</div>
                            <div className="font-bold text-amber-400">{veh.ramPower} J</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Armor Plate</div>
                            <div className="font-bold text-emerald-400">{veh.armor} HP</div>
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 space-y-1 mb-3">
                          <div><b className="text-slate-300">Armament:</b> {veh.firepower}</div>
                          <div><b className="text-amber-400">Special Capability:</b> {veh.specialAbility}</div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        {isCurrent ? (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-tactical font-bold text-xs"
                          >
                            CURRENTLY PILOTING IN THEATER
                          </button>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => {
                              soundEngine.playRadioClick();
                              onSelectVehicle(veh.id);
                            }}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-tactical font-bold text-xs cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                          >
                            DEPLOY THIS VEHICLE TO COMBAT
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                soundEngine.playCashEarned();
                                onUnlockVehicle(veh.id, veh.cost);
                              }
                            }}
                            disabled={!canAfford}
                            className={`w-full py-2.5 rounded-xl font-tactical font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            {canAfford
                              ? `ACQUIRE WITH WAR CHEST ($${veh.cost.toLocaleString()})`
                              : `INSUFFICIENT FUNDS ($${veh.cost.toLocaleString()})`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLE MODIFICATIONS */}
          {activeTab === 'mods' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Wrench className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-xs font-tactical font-bold uppercase tracking-wide text-amber-300">
                      Vehicle Hardware Upgrades & Weapon Systems
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Equip heavy steel ram plows, .50 Cal machine guns, nitro boosters, and reinforced frames to your active vehicle.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MOD_DEFINITIONS.map((mod) => {
                  const isMax = mod.currentLevel >= mod.maxLevel;
                  const nextCost = !isMax ? mod.costs[mod.currentLevel] : 0;
                  const canAfford = cash >= nextCost;
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.id}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-slate-800 text-amber-400">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-display font-bold text-slate-100">{mod.name}</h4>
                              <div className="text-[11px] font-mono text-amber-400">
                                Level {mod.currentLevel} / {mod.maxLevel}
                              </div>
                            </div>
                          </div>
                          {!isMax && (
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              ${nextCost.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mb-2">{mod.desc}</p>

                        <div className="p-2 rounded bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-slate-300 mb-3">
                          <div className="text-[10px] text-slate-500 uppercase">Current Tier:</div>
                          <div className="font-bold text-slate-100">{mod.levels[mod.currentLevel]}</div>
                          {!isMax && (
                            <div className="mt-1 text-emerald-400">
                              Next: {mod.levels[mod.currentLevel + 1]}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        {isMax ? (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono font-bold"
                          >
                            MAXIMUM LEVEL ACHIEVED
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                soundEngine.playCashEarned();
                                onUpgradeVehiclePart(mod.id, nextCost);
                              }
                            }}
                            disabled={!canAfford}
                            className={`w-full py-2.5 rounded-xl font-tactical font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                              canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                            {canAfford
                              ? `UPGRADE TO LEVEL ${mod.currentLevel + 1} ($${nextCost.toLocaleString()})`
                              : `NEED $${nextCost.toLocaleString()}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AIRSTRIKES */}
          {activeTab === 'airstrikes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assets.map((asset) => {
                  const canAffordUpgrade = cash >= asset.upgradeCost;
                  const canAffordUnlock = cash >= asset.cost;
                  const isMaxLevel = asset.level >= asset.maxLevel;
                  const isNuke = !!asset.isNuclear;

                  return (
                    <div
                      key={asset.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isNuke
                          ? 'bg-red-950/20 border-red-800/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                          : asset.unlocked
                          ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/80 border-slate-900 opacity-80'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-400">{asset.code}</span>
                              <span
                                className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                                  isNuke
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {asset.category}
                              </span>
                            </div>
                            <h3 className="text-base font-display font-black text-white mt-1">
                              {asset.name}
                            </h3>
                          </div>
                          <div className="text-right font-mono">
                            {asset.unlocked ? (
                              <span className="text-xs font-bold text-amber-400">
                                LVL {asset.level} / {asset.maxLevel}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-emerald-400">
                                ${asset.cost.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 mb-3">{asset.description}</p>

                        <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center text-xs font-mono mb-3">
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Damage</div>
                            <div className="font-bold text-amber-400">{asset.damage.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Blast Radius</div>
                            <div className="font-bold text-slate-200">{asset.radius}m</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Cooldown</div>
                            <div className="font-bold text-sky-400">{asset.cooldownSeconds}s</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        {asset.unlocked ? (
                          isMaxLevel ? (
                            <button
                              disabled
                              className="w-full py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono font-bold"
                            >
                              MAXIMUM LEVEL
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpgradeAsset(asset.id)}
                              disabled={!canAffordUpgrade}
                              className={`w-full py-2.5 rounded-xl font-tactical font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                                canAffordUpgrade
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              }`}
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                              UPGRADE LEVEL {asset.level + 1} (${asset.upgradeCost.toLocaleString()})
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => onUnlockAsset(asset.id)}
                            disabled={!canAffordUnlock}
                            className={`w-full py-2.5 rounded-xl font-tactical font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                              canAffordUnlock
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            {canAffordUnlock
                              ? `AUTHORIZE WEAPON ($${asset.cost.toLocaleString()})`
                              : `LOCKED (${asset.unlockRequirement})`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PENTAGON BLUEPRINT CRAFTING LAB */}
          {activeTab === 'blueprints' && (
            <div className="space-y-4">
              <div className="bg-sky-950/40 border border-sky-500/30 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-mono text-sky-200 uppercase">
                      Classified Intel Blueprint Assembly
                    </h3>
                    <p className="text-xs text-slate-400">
                      Destroy target structures and collect glowing Intel Crates on the battlefield to gather prototype fragments.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(blueprints || []).map((bp) => {
                  const canCraft = bp.currentFragments >= bp.fragmentsRequired && !bp.crafted;

                  return (
                    <div
                      key={bp.id}
                      className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                        bp.crafted
                          ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                          : canCraft
                          ? 'border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)] animate-pulse'
                          : 'border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold uppercase">
                            {bp.codename}
                          </span>
                          {bp.crafted ? (
                            <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> CRAFTED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-amber-400">
                              FRAGMENTS: {bp.currentFragments}/{bp.fragmentsRequired}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-tactical font-black text-slate-100 uppercase mb-1">
                          {bp.name}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          {bp.description}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              bp.crafted ? 'bg-emerald-500' : 'bg-sky-400'
                            }`}
                            style={{
                              width: `${Math.min(100, (bp.currentFragments / bp.fragmentsRequired) * 100)}%`
                            }}
                          />
                        </div>

                        {bp.crafted ? (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 font-mono text-xs font-bold"
                          >
                            PROTOTYPE DEPLOYED TO ARSENAL
                          </button>
                        ) : (
                          <button
                            onClick={() => onCraftBlueprint && onCraftBlueprint(bp.id)}
                            disabled={!canCraft}
                            className={`w-full py-2.5 rounded-xl font-tactical font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                              canCraft
                                ? 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)]'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <Cpu className="w-4 h-4" />
                            {canCraft ? 'CRAFT EXPERIMENTAL PROTOTYPE' : 'MORE FRAGMENTS NEEDED'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: ARMORY CALIBRATION BENCH */}
          {activeTab === 'calibrations' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-red-950/40 border border-red-500/30 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-400">
                    <Crosshair className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-mono text-red-200 uppercase">
                      Experimental Armory Calibration Bench
                    </h3>
                    <p className="text-xs text-slate-400">
                      Toggle active military calibrations to modify weapon yields, shell composites, and explosive residuals.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Calibration 1 */}
                <div className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  calibrations.napalmPools 
                    ? 'border-red-500 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
                    : 'border-slate-800'
                }`}>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold uppercase">
                        INCENDIARY YIELD MOD
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">CAL-01</span>
                    </div>
                    <h4 className="text-sm font-tactical font-black text-slate-100 uppercase mb-2">
                      Napalm Combustive Core (Residual Fire Pools)
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6 font-sans">
                      Equips your GBU-43/B, MOAB, and kinetic strikes with high-density napalm cores. Detonations leave glowing, residual fire pools on the battlefield for 8 seconds, melting and incinerating any armored convoy or SAM site caught in the area!
                    </p>
                  </div>
                  
                  <button
                    onClick={() => onToggleCalibration && onToggleCalibration('napalmPools', calibrations.napalmPools ? 0 : 35000)}
                    className={`w-full py-2.5 rounded-xl font-tactical font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      calibrations.napalmPools
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                        : cash >= 35000
                        ? 'bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/30'
                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    {calibrations.napalmPools ? 'ACTIVE CALIBRATION' : 'CALIBRATE WEAPONS // $35,000'}
                  </button>
                </div>

                {/* Calibration 2 */}
                <div className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  calibrations.depletedUranium 
                    ? 'border-cyan-500 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                    : 'border-slate-800'
                }`}>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold uppercase">
                        AMMUNITION MOD
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">CAL-02</span>
                    </div>
                    <h4 className="text-sm font-tactical font-black text-slate-100 uppercase mb-2">
                      Depleted Uranium Armor-Piercing Rounds
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6 font-sans">
                      Modifies your .50 Caliber Browning, Vulcan Cannon, and Heavy Autocannon shells with depleted uranium composites. Increases armor penetration by 3x, dealing devastating instant puncture damage to bunkers, refineries, and tanks.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => onToggleCalibration && onToggleCalibration('depletedUranium', calibrations.depletedUranium ? 0 : 45000)}
                    className={`w-full py-2.5 rounded-xl font-tactical font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      calibrations.depletedUranium
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : cash >= 45000
                        ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30'
                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    {calibrations.depletedUranium ? 'ACTIVE CALIBRATION' : 'CALIBRATE AMMUNITION // $45,000'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>CLASSIFICATION: TOP SECRET // DARPA STRATEGIC DEVELOPMENT</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-tactical font-bold cursor-pointer"
          >
            Return to War Room
          </button>
        </div>
      </div>
    </div>
  );
};
