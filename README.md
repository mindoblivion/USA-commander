# USA Commander: Tactical Strike 3D

A real-time 3D tactical warfare simulator built with React, Three.js WebGL, Tailwind CSS, and Firebase.

Take direct orders from Commander-in-Chief Donald Trump, patrol combat theaters in a heavily armored military-grade Jeep, smash through destructible towns, and call in devastating tactical air support to unlock strategic nuclear capabilities.

---

## 🌟 Key Features

### 1. Military Grade Tactical Jeep (Player Vehicle)
- **Drive & Ramming Physics**: Drive an olive drab tactical 4x4 military Jeep with off-road suspension, steerable knobby tires, bull-bar ram bumper, and roof-mounted .50 caliber turret.
- **Destructible Town Collision**: Smash directly into houses, picket fences, parked civilian vehicles, light poles, and enemy sentinels/civilians for kinetic impact damage and destruction cash bounties.
- **Nitro Turbo Boost**: Hit `Space` (or on-screen Nitro button) to burn booster fuel for high-speed ramming charges.
- **Dual Camera Modes**: Seamlessly toggle between third-person Jeep Follow-Cam and Free Tactical Strategic Orbit View.
- **Controls**:
  - `W` / `Arrow Up`: Accelerate forward
  - `S` / `Arrow Down`: Brake / Reverse
  - `A` / `Arrow Left`: Steer Left
  - `D` / `Arrow Right`: Steer Right
  - `Space`: Nitro Turbo Boost
  - On-Screen Virtual Controls for touch & mobile devices

### 2. Realistic 3D Architecture & Towns
- **Detailed Colorful Houses**: Multi-story residences, Craftsman bungalows, Cape Cod cottages, Mediterranean villas, and Governor manor estates.
- **Procedural Canvas Textures**: Realistic horizontal clapboard siding planks, architectural roof shingles, and running bond brick chimneys.
- **Authentic Details**: Louvered window shutters in contrasting colors, covered front porches with columns, white picket fences, manicured lawns, asphalt driveways with parked civilian cars, and garden shade trees.
- **Physics Debris**: Collapsing buildings shatter into realistic timber siding, roof tile fragments, and dust smoke plumes.

### 3. Direct Presidential Orders & Bounties
- Real-time Commander-in-Chief situation room directives with direct orders and speech synthesis.
- Complete targeted objectives (ramming specific targets, eliminating bunkers, crushing fuel grids) to claim cash bounties.

### 4. USAF Strategic Strike Arsenal
- **Air Support**: F-16 Falcon Strafe, F-35 Lightning Precision JDAM.
- **Heavy Bombers**: AC-130 Spooky Gunship, B-2 Spirit Stealth Carpet Bomb.
- **Strategic Ordnance**: GBU-43/B MOAB ("Mother of All Bombs"), "Rods from God" Kinetic Orbital Bombardment.
- **Nuclear Capability**: Trident Thermonuclear ICBM with blinding atomic flash, shockwave, and total grid annihilation.

### 5. Tactical NORAD Telemetry
- Military strike damage readouts (`-1,200 HP DMG`).
- Real-time target structural health diagnostics.
- Azimuth NATO compass orientation.
- Automated salvage drone recovery for debris scrap and intel blueprints.

### 6. Firebase Cloud Sync & Offline Portability
- Google Authentication for cloud profile and global leaderboards.
- Seamless automatic fallback to browser `localStorage` when offline or unconfigured.

---

## 🚀 Running the App Locally / Base44 GitHub Import

This project is built using standard Vite + React + TypeScript and is 100% web portable.

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm run preview
```

### 4. Base44 / GitHub Import
To import this project into **Base44**:
1. Push this repository to GitHub.
2. In Base44, click **Import from GitHub** and select this repository.
3. Base44 will automatically detect the Vite build configuration and run `npm install` & `npm run dev`.
4. (Optional) Provide Firebase credentials via Base44 environment variables as shown in `.env.example`. If omitted, the game automatically runs in local storage mode without any errors!
