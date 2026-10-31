export type VisionMode = 'normal' | 'nvg' | 'flir_thermal';

export type TacticalWeather = 'clear' | 'thunderstorm' | 'sandstorm' | 'night_assault';

export interface SAMMissile {
  id: string;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  speed: number;
  progress: number;
  isHostile: boolean;
}

export interface EnemyPatrol {
  id: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  rotationY: number;
  lastShotTime: number;
}

export interface BlueprintItem {
  id: string;
  name: string;
  codename: string;
  fragmentsRequired: number;
  currentFragments: number;
  crafted: boolean;
  description: string;
  icon: string;
  specialType: 'orbital_rod' | 'emp_pulse' | 'railgun_tank';
}

export interface StrikeAsset {
  id: string;
  name: string;
  code: string;
  category: 'Air Support' | 'Strategic Bomber' | 'Heavy Munition' | 'Orbital' | 'Nuclear';
  description: string;
  baseDamage: number;
  damage: number;
  radius: number; // in world units
  cooldownSeconds: number;
  currentCooldown: number;
  cost: number;
  level: number;
  maxLevel: number;
  upgradeCost: number;
  unlocked: boolean;
  unlockRequirement: string;
  iconName: string;
  aircraftModel: 'f16' | 'f35' | 'ac130' | 'b2' | 'moab' | 'orbital' | 'nuke';
  isNuclear?: boolean;
}

export type TargetCategory =
  | 'suburban_house'
  | 'colonial_house'
  | 'craftsman_bungalow'
  | 'cape_cod_house'
  | 'ranch_home'
  | 'townhouse'
  | 'villa'
  | 'modern_house'
  | 'manor_estate'
  | 'cottage'
  | 'skyscraper'
  | 'factory'
  | 'bunker'
  | 'radar'
  | 'silo'
  | 'refinery'
  | 'air_defense'
  | 'parked_car'
  | 'street_light'
  | 'picket_fence'
  | 'guard_tower'
  | 'pedestrian';

export interface DestructibleTarget {
  id: string;
  name: string;
  type: TargetCategory;
  x: number;
  z: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  hp: number;
  maxHp: number;
  isDestroyed: boolean;
  value: number; // Cash bounty
  color: string;
  roofColor?: string;
  shutterColor?: string;
  hasYard?: boolean;
  hasChimney?: boolean;
  hasGarage?: boolean;
  hasCar?: boolean;
  hasPorch?: boolean;
  hasFence?: boolean;
  hasDormers?: boolean;
  floors?: number;
  isBossTarget?: boolean;
  isPedestrian?: boolean;
  isTownProp?: boolean;
  walkDir?: number;
  walkSpeed?: number;
}

export type VehicleModelType = 
  | 'jeep' 
  | 'humvee' 
  | 'tank' 
  | 'stryker' 
  | 'helicopter' 
  | 'a10_jet' 
  | 'b2_bomber' 
  | 'ac130' 
  | 'sr72_orbital';

export interface VehicleUpgradeState {
  activeVehicleId: VehicleModelType;
  unlockedVehicles: string[];
  ramPlowLevel: number; // 0 to 5
  turretGunLevel: number; // 0 to 5
  engineLevel: number; // 1 to 5
  armorLevel: number; // 1 to 5
  nitroLevel: number; // 1 to 5
}

export interface VehicleCatalogItem {
  id: VehicleModelType;
  name: string;
  codename: string;
  category: 'Ground Recon' | 'Heavy Armor' | 'Attack Helicopter' | 'Close Air Support' | 'Strategic Bomber' | 'Gunship Platform' | 'Orbital Hypersonic';
  cost: number;
  unlocked: boolean;
  description: string;
  icon: string;
  topSpeed: number; // km/h
  ramPower: number; // kinetic destruction multiplier
  armor: number; // durability
  firepower: string;
  specialAbility: string;
  clearanceRequirement: string;
}

export interface PlayerVehicleState {
  x: number;
  z: number;
  altitude: number;
  rotationY: number;
  speed: number;
  maxSpeed: number;
  ramPower: number;
  armor: number;
  maxArmor: number;
  boostFuel: number; // 0 to 100
  isBoosting: boolean;
  steerAngle: number;
}

export interface CombatTheater {
  id: string;
  name: string;
  codename: string;
  country: string;
  region: string;
  threatLevel: 'DEFCON 4' | 'DEFCON 3' | 'DEFCON 2' | 'DEFCON 1' | 'CRITICAL';
  description: string;
  accentColor: string;
  groundColor: string;
  fogColor: string;
  skyColor: string;
  targetCount: number;
  totalCityValue: number;
  unlocked: boolean;
  unlockCashRequired: number;
}

export interface IntelDrop {
  id: string;
  x: number;
  z: number;
  value: number;
  rarity: 'standard' | 'classified' | 'top_secret' | 'presidential';
  title: string;
  collected: boolean;
  createdAt: number;
}

export interface TacticalStrikeIndicator {
  id: string;
  x: number;
  y: number;
  damage: number;
  isCrit: boolean;
  createdAt: number;
}

export interface TacticalOverlaySettings {
  targetReticle: boolean;
  targetTelemetry: boolean;
  targetHealthBars: boolean;
  lowDetailMode: boolean;
  entityHider: boolean;
  compassNorthLock: boolean;
  autoScrapRecovery: boolean;
  showFpsCounter: boolean;
  cameraFollowJeep: boolean;
}

export interface SocialAccountStatus {
  linked: boolean;
  username?: string;
  linkedAt?: string;
}

export interface GameSettings {
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  fpsTarget: 30 | 60 | 120;
  postProcessing: boolean;
  shadows: boolean;
  renderScale: number; // 0.75 to 1.25
  masterVolume: number;
  sfxVolume: number;
  presidentialVoice: boolean;
  presidentialVoiceVolume: number;
  radioChatter: boolean;
  haptics: boolean;
  overlays: TacticalOverlaySettings;
  socialAccounts: {
    gmail: SocialAccountStatus;
    apple: SocialAccountStatus;
    facebook: SocialAccountStatus;
    x: SocialAccountStatus;
    steam: SocialAccountStatus;
  };
}

export interface PresidentialDirective {
  id: string;
  title: string;
  quote: string;
  angryQuote?: string;
  targetDescription: string;
  targetType: 'any' | 'radar' | 'bunker' | 'refinery' | 'total_damage' | 'nuke' | 'jeep_ram';
  targetAmount: number;
  currentAmount: number;
  cashBonus: number;
  completed: boolean;
  claimed: boolean;
  failed?: boolean;
  timeRemaining?: number; // seconds if timed
}

export interface ActiveAirstrikeFlyer {
  id: string;
  model: 'f16' | 'f35' | 'ac130' | 'b2' | 'moab' | 'orbital' | 'nuke';
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  progress: number;
  altitude: number;
  dropProgress: number;
  dropped: boolean;
  isComplete: boolean;
}
