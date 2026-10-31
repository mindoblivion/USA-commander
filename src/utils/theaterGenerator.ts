import { CombatTheater, DestructibleTarget, TargetCategory } from '../types/game';

// Realistic architectural exterior color palettes for houses
const HOUSE_WALL_COLORS = [
  '#f8fafc', // Classic White Siding
  '#475569', // Modern Slate Gray
  '#dc2626', // Warm Heritage Red Brick
  '#ca8a04', // Nordic Golden Ochre
  '#0284c7', // Coastal Harbor Blue
  '#65a30d', // Sage Olive Clapboard
  '#854d0e', // Timber Cedar Brown
  '#ea580c', // Terracotta Stucco
  '#059669', // Pine Green Weatherboard
  '#3b82f6', // Colonial Cornflower Blue
  '#4f46e5'  // Indigo Blue Manor
];

const HOUSE_ROOF_COLORS = [
  '#1e293b', // Dark Charcoal Slate Shingles
  '#b91c1c', // Terracotta Clay Barrel Tiles
  '#78350f', // Weathered Cedar Shake
  '#14532d', // Forest Green Metal Seam
  '#334155', // Slate Blue Architectural Shingles
  '#881337'  // Deep Burgundy Tile
];

const HOUSE_SHUTTER_COLORS = [
  '#0f172a', // Midnight Black
  '#ffffff', // Clean White Trim
  '#1e3a8a', // Nautical Navy Blue
  '#14532d', // Forest Green
  '#881337'  // Cabernet Red
];

export function generateTheaterTargets(theater: CombatTheater): DestructibleTarget[] {
  const targets: DestructibleTarget[] = [];

  const isDesert = theater.id === 'desert_shield';
  const isAirDefense = theater.id === 'pyongyang_network';
  const isNaval = theater.id === 'baltic_naval';
  const isCyber = theater.id === 'cyber_island';
  const isArctic = theater.id === 'arctic_silo';

  // 1. Structured City Grid Layout
  // City blocks arranged across 4 avenues (X: -42, -14, 14, 42) and 4 cross streets (Z: -42, -14, 14, 42)
  // Each lot is generously spaced (28 units apart) giving ample road space for high-speed driving and ramming.
  const cityPlots: { x: number; z: number; zone: 'residential' | 'commercial' | 'industrial' | 'government' }[] = [
    // Block 1 (North-West Sector - Residential)
    { x: -42, z: -42, zone: 'residential' },
    { x: -14, z: -42, zone: 'residential' },
    { x: 14, z: -42, zone: 'residential' },
    { x: 42, z: -42, zone: 'residential' },

    // Block 2 (West-Central Sector - Suburban & Commercial)
    { x: -42, z: -14, zone: 'residential' },
    { x: -14, z: -14, zone: 'commercial' },
    { x: 14, z: -14, zone: 'commercial' },
    { x: 42, z: -14, zone: 'residential' },

    // Block 3 (East-Central Sector - Industrial & Municipal)
    { x: -42, z: 14, zone: 'residential' },
    { x: -14, z: 14, zone: 'industrial' },
    { x: 14, z: 14, zone: 'industrial' },
    { x: 42, z: 14, zone: 'government' },

    // Block 4 (South Sector - High-Value Estates & Compounds)
    { x: -42, z: 42, zone: 'residential' },
    { x: -14, z: 42, zone: 'residential' },
    { x: 14, z: 42, zone: 'government' },
    { x: 42, z: 42, zone: 'government' }
  ];

  cityPlots.forEach((plot, i) => {
    let wallColor = HOUSE_WALL_COLORS[i % HOUSE_WALL_COLORS.length];
    const roofColor = HOUSE_ROOF_COLORS[(i * 3 + 1) % HOUSE_ROOF_COLORS.length];
    const shutterColor = HOUSE_SHUTTER_COLORS[(i * 2) % HOUSE_SHUTTER_COLORS.length];

    let type: TargetCategory = 'suburban_house';
    let name = 'Two-Story Suburban House';
    let width = 5.2;
    let height = 4.4;
    let depth = 5.0;
    // Balanced HP: 800 - 1000 HP takes exactly 6-9 hits with starting basic Jeep (~115 dmg/hit)
    let hp = 900;
    let value = 75000;
    let isBoss = false;
    let hasYard = true;
    let hasChimney = true;
    let hasGarage = true;
    let hasCar = true;
    let hasPorch = true;
    let hasFence = true;
    let hasDormers = true;
    let floors = 2;

    if (isDesert) {
      wallColor = ['#d4b895', '#c2a27d', '#b89768', '#dfc29f', '#e6ccb2'][i % 5];
      if (plot.zone === 'industrial') {
        type = 'refinery';
        name = 'Cracking Refiner Unit';
        width = 5.6;
        height = 6.8;
        depth = 5.6;
        hp = 1800;
        value = 350000;
        hasYard = false;
      } else if (plot.zone === 'government') {
        type = 'bunker';
        name = 'Fortified Command Bunker';
        width = 6.2;
        height = 3.6;
        depth = 6.2;
        hp = 2600;
        value = 650000;
        hasYard = false;
      } else {
        type = 'villa';
        name = 'Middle Eastern Adobe Courtyard Compound';
        width = 6.2;
        height = 3.6;
        depth = 5.8;
        hp = 950;
        value = 120000;
        hasYard = true;
        hasChimney = false;
        hasGarage = false;
        hasCar = true;
        hasPorch = true;
        hasFence = true;
        hasDormers = false;
        floors = 1;
      }
    } else if (isAirDefense) {
      if (plot.zone === 'industrial' || plot.zone === 'government') {
        type = 'radar';
        name = 'Long-Range Phased Array Radar';
        width = 4.4;
        height = 7.8;
        depth = 4.4;
        hp = 1600;
        value = 450000;
        hasYard = false;
      } else {
        type = 'townhouse';
        name = 'Three-Story Officer Townhouse';
        width = 4.8;
        height = 5.6;
        depth = 4.8;
        hp = 1100;
        value = 140000;
        hasYard = true;
        hasChimney = true;
        hasGarage = false;
        hasCar = true;
        hasPorch = true;
        hasFence = true;
        hasDormers = true;
        floors = 3;
      }
    } else if (isNaval) {
      if (plot.zone === 'industrial' || plot.zone === 'government') {
        type = 'factory';
        name = 'Submarine Drydock Facility';
        width = 6.0;
        height = 8.5;
        depth = 6.5;
        hp = 2200;
        value = 600000;
        hasYard = false;
      } else {
        type = 'cape_cod_house';
        name = 'Coastal Harbor Residence';
        width = 4.8;
        height = 4.0;
        depth = 4.8;
        hp = 850;
        value = 95000;
        hasYard = true;
        hasChimney = true;
        hasGarage = true;
        hasCar = true;
        hasPorch = true;
        hasFence = true;
        hasDormers = true;
        floors = 2;
      }
    } else if (isCyber) {
      if (plot.zone === 'industrial' || plot.zone === 'government') {
        type = 'factory';
        name = 'Orbital Defense Laser Uplink';
        width = 5.0;
        height = 9.8;
        depth = 5.0;
        hp = 2800;
        value = 850000;
        hasYard = false;
      } else {
        type = 'modern_house';
        name = 'Contemporary Glass Smart Villa';
        width = 6.2;
        height = 4.6;
        depth = 5.8;
        hp = 1200;
        value = 220000;
        hasYard = true;
        hasGarage = true;
        hasCar = true;
        hasPorch = true;
        hasFence = true;
        hasDormers = false;
        floors = 2;
      }
    } else if (isArctic) {
      if (i === cityPlots.length - 1) {
        type = 'silo';
        name = 'PRIMARY ICBM LAUNCH SILO APEX';
        width = 8.8;
        height = 7.0;
        depth = 8.8;
        hp = 6500;
        value = 3500000;
        isBoss = true;
        hasYard = false;
      } else {
        type = 'cottage';
        name = 'Insulated Polar Outpost Chalet';
        width = 4.8;
        height = 4.0;
        depth = 4.8;
        hp = 950;
        value = 160000;
        hasYard = true;
        hasChimney = true;
        hasGarage = true;
        hasCar = true;
        hasPorch = true;
        hasFence = true;
        hasDormers = true;
        floors = 2;
      }
    } else {
      // Primary Theater: Metropolis Alpha City & Suburban District
      if (i === 15) {
        // High-Value Command Mansion Estate (Boss Building)
        type = 'manor_estate';
        name = 'Governor High-Command Estate';
        width = 8.5;
        height = 6.8;
        depth = 8.0;
        hp = 3200;
        value = 750000;
        isBoss = true;
        hasYard = true;
        hasChimney = true;
        hasGarage = true;
        hasCar = true;
        hasPorch = true;
        hasFence = true;
        hasDormers = true;
        floors = 3;
      } else if (plot.zone === 'commercial') {
        type = 'townhouse';
        name = 'Commercial Plaza & Gas Depot';
        width = 5.8;
        height = 5.2;
        depth = 5.4;
        hp = 1100;
        value = 180000;
        hasYard = true;
        hasChimney = false;
        hasGarage = true;
        hasCar = true;
        hasPorch = true;
        hasFence = false;
        hasDormers = false;
        floors = 2;
      } else if (plot.zone === 'industrial') {
        type = 'refinery';
        name = 'Municipal Utility Fuel Terminal';
        width = 5.4;
        height = 6.4;
        depth = 5.4;
        hp = 1600;
        value = 320000;
        hasYard = false;
      } else if (i % 3 === 0) {
        type = 'colonial_house';
        name = 'Classic Brick Colonial Home';
        width = 5.6;
        height = 4.8;
        depth = 5.2;
        hp = 1000; // ~8 hits with starter jeep
        value = 90000;
        hasYard = true;
        hasChimney = true;
        hasGarage = true;
        hasCar = true;
        hasPorch = true;
        hasFence = true;
        hasDormers = true;
        floors = 2;
      } else if (i % 2 === 0) {
        type = 'craftsman_bungalow';
        name = 'Craftsman Family Bungalow';
        width = 5.0;
        height = 3.8;
        depth = 4.8;
        hp = 750; // ~6 hits with starter jeep
        value = 65000;
        hasYard = true;
        hasChimney = true;
        hasGarage = true;
        hasCar = true;
        hasPorch = true;
        hasFence = true;
        hasDormers = false;
        floors = 1;
      } else {
        type = 'suburban_house';
        name = 'Two-Story Suburban House';
        width = 5.2;
        height = 4.4;
        depth = 5.0;
        hp = 900; // ~7-8 hits with starter jeep
        value = 75000;
        hasYard = true;
        hasChimney = true;
        hasGarage = true;
        hasCar = true;
        hasPorch = true;
        hasFence = true;
        hasDormers = true;
        floors = 2;
      }
    }

    targets.push({
      id: `${theater.id}_target_${i}`,
      name,
      type,
      x: plot.x,
      z: plot.z,
      y: 0,
      width,
      height,
      depth,
      hp,
      maxHp: hp,
      isDestroyed: false,
      value,
      color: wallColor,
      roofColor,
      shutterColor,
      hasYard,
      hasChimney,
      hasGarage,
      hasCar,
      hasPorch,
      hasFence,
      hasDormers,
      floors,
      isBossTarget: isBoss
    });
  });

  // 2. Add Sidewalk Pedestrians along City Streets
  const pedestrianNames = [
    'Suburban Pedestrian',
    'Enemy Insurgent Guard',
    'City Commuter',
    'Armed Sentinel',
    'Town Civilian',
    'Street Officer'
  ];

  // Placed on road sidewalks (X = -28, 0, 28; Z = -28, 0, 28)
  for (let p = 0; p < 14; p++) {
    const angle = (p / 14) * Math.PI * 2;
    const dist = 12 + (p % 3) * 14;
    const px = Math.cos(angle) * dist;
    const pz = Math.sin(angle) * dist;

    targets.push({
      id: `${theater.id}_pedestrian_${p}`,
      name: pedestrianNames[p % pedestrianNames.length],
      type: 'pedestrian',
      x: px,
      z: pz,
      y: 0,
      width: 0.8,
      height: 1.8,
      depth: 0.8,
      hp: 100,
      maxHp: 100,
      isDestroyed: false,
      value: 12000,
      color: p % 2 === 0 ? '#38bdf8' : '#ef4444',
      isPedestrian: true,
      walkDir: Math.random() * Math.PI * 2,
      walkSpeed: 0.8 + Math.random() * 0.8
    });
  }

  // 3. Add Curbside Parked Civilian Vehicles
  const carColors = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#475569', '#f8fafc', '#0f172a'];
  for (let c = 0; c < 8; c++) {
    const angle = (c / 8) * Math.PI * 2 + 0.4;
    const dist = 16 + (c % 2) * 16;
    targets.push({
      id: `${theater.id}_car_${c}`,
      name: 'Curbside Sedan / SUV',
      type: 'parked_car',
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      y: 0,
      width: 2.2,
      height: 1.4,
      depth: 4.4,
      hp: 350,
      maxHp: 350,
      isDestroyed: false,
      value: 25000,
      color: carColors[c % carColors.length],
      isTownProp: true
    });
  }

  // 4. Add Municipal Streetlight Poles at City Intersections
  for (let l = 0; l < 8; l++) {
    const angle = (l / 8) * Math.PI * 2 + 0.2;
    const dist = 22 + (l % 2) * 12;
    targets.push({
      id: `${theater.id}_light_${l}`,
      name: 'Municipal Streetlight',
      type: 'street_light',
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      y: 0,
      width: 0.6,
      height: 5.0,
      depth: 0.6,
      hp: 150,
      maxHp: 150,
      isDestroyed: false,
      value: 10000,
      color: '#64748b',
      isTownProp: true
    });
  }

  return targets;
}
