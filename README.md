# Digestive System Bio-Hologram 3D WebAR Studio

Interactive **3D Image Tracking WebAR + 3D Holo-Lab Learning Platform** for all **5 Digestive System AR Cards** built with **MindAR**, **Three.js (Custom GLSL Shaders)**, and **Tailwind CSS** — zero build step, ready for static hosting on Vercel or GitHub Pages.

## Supported AR Target Cards & 3D Organs (Anatomical Order)
1. **ปาก (Mouth / Oral Cavity)** — `assets/target-0.jpg` + `assets/mouth.glb` (Draco compressed, 8 anatomical sub-meshes: `teeth`, `tongue`, `tongue-papillae`, `salivary-glands`, `soft-palate-pharynx`, `upper-gingiva-palate`, `lower-gingiva-floor`, `mandible`)
   - Card focus: Salivary Amylase (อะไมเลส — ย่อยแป้ง → มอลโทส, pH 6.5–7.0) + Mucin, Lysozyme
2. **กระเพาะอาหาร (Stomach)** — `assets/target-1.jpg` + `assets/stomach.glb` (Draco compressed)
   - Card focus: Pepsinogen, Pepsin (+ HCl, Rennin, Gastrin, pH 1.5–2.5)
3. **ตับ (Liver & Gallbladder)** — `assets/target-2.jpg` + `assets/liver.glb` (Draco compressed, 7 anatomical sub-meshes: `liver`, `gallbladder`, `biliary`, `cystic`, `portal`, `hepatic-veins`, `artery`)
   - Card focus: น้ำดี / Bile Salts — ผลิตที่ตับ เก็บไว้ที่ถุงน้ำดี (ไม่ใช่เอนไซม์! ช่วยตีไขมันแบบ Emulsification, pH 7.6–8.6) + Glycogenesis, Detoxification & Urea Cycle
4. **ตับอ่อน (Pancreas)** — `assets/target-3.jpg` + `assets/pancreas.glb` (3 sub-meshes: `pancreatic-head`, `pancreatic-body-and-tail`, `pancreatic-duct`)
   - Card focus: Trypsinogen, Chymotrypsinogen, Procarboxypeptidase, Amylase, DNase, RNase, Nucleotidase, Nucleosidase (+ Lipase, NaHCO₃, Insulin/Glucagon)
5. **ลำไส้เล็ก (Small Intestine)** — `assets/target-4.jpg` + `assets/small-intestine.glb` (3 sub-meshes: `duodenum`, `jejunum`, `ileum`)
   - Card focus: Carb group (Maltase, Sucrase, Lactase), Protein group (Aminopeptidase, Dipeptidase), Lipid group (Lipase) + Enterokinase, Secretin/CCK

## Key Features
- **Dual-Mode Engine:** Auto-starts **Live AR Camera** (`maxTrack: 1` with exclusive visibility + IndexedDB `.mind` cache `digestive_mind_v5`) and offers instant 1-tap switching to **3D Holo-Lab Mode** (`OrbitControls` 360° interactive studio without needing a physical card).
- **Clean Medical 3D Stage & Procedural Animations:**
  - Custom **GLSL Fresnel + Moving Scanline Hologram Shader** & **Medical X-Ray Shader**
  - **Multi-Mesh Exploded View** smoothly separating anatomical sub-meshes on Mouth (8 meshes), Liver (7 meshes), Pancreas (3 meshes), and Small Intestine (3 meshes)
  - **Exact 3D Food Bolus, Bile & Enzyme Flow** (`js/tube-path.js` & `js/vfx-engine.js`) — Mouth swallowing bolus & salivary Amylase flow, Stomach J-lumen geodesic flow, Liver emerald-gold Bile flow (Lobes → Gallbladder → Common Bile Duct) with selective cutaway transparency, Pancreatic Duct enzyme flow, and Small Intestine 56-coil geodesic stitcher (Duodenum → Jejunum → Ileum)
  - Clean clutter-free 3D presentation with subtle organic breathing and 3D-to-2D SVG leader callouts
  - **Cinematic Guided Auto-Tour (`ทัวร์นำชม`)** with automatic hotspot stepping, shader showcase, and Thai voice narration
- **9-Category Visual-First Learning Hub:**
  1. **กายวิภาค (Anatomy & Histology)** — Live pH scale meter, KPI stats, 3D clickable hotspots, microscopic tissue layers, Thai TTS narration
  2. **เอนไซม์ (Enzymes & Biochemistry)** — Complete filterable reaction equations (`Substrate ──▶ Product`) with AR-card badges across all 5 organs
  3. **จำลองย่อย (Interactive Food Digestion Simulator)** — Choose 4 meals to run step-by-step molecular breakdown across all 5 organs synced with 3D flow particles
  4. **เส้นทางอาหาร (7-Stage Digestive Journey)** — Full timeline from Mouth to Large Intestine with direct `3D →` jump buttons for all 5 AR organs
  5. **สรุปเทียบ (5-Organ Comparison Matrix & Myth Busters)** — Scannable 5-organ summary table + high-yield biology exam myth-busters
  6. **โรค & เกร็ดน่ารู้ (Clinical Health & Fun Facts)** — Organ-specific clinical conditions & story-style fun facts
  7. **แฟลชการ์ด (3D Flip Flashcards)** — 21 interactive CSS 3D flip cards covering all 5 organs with mastery progress
  8. **เกมจับคู่ (Enzyme Speed-Match Game)** — Timed matching mini-game (17 pairs across all 5 organs) with best-time tracking
  9. **ควิซ & เหรียญ (22-Question Quiz + Mastery Badges)** — Combo streaks, detailed explanations, canvas confetti, and 5 unlockable badges (`0/5` → `5/5` organ discovery) saved in `localStorage`
- **Procedural Web Audio SFX + Thai Voice Narration** (`speechSynthesis`).

## 3D Model Credits & Licenses
- **Mouth (`assets/mouth.glb`)**: Derived from **HuBMAP Human Reference Atlas — Visible Human Male Mouth (`mouth-male v1.0` / NIH 3D `3DPX-022831`)**, © HuBMAP / National Library of Medicine Visible Human Project, licensed under **CC BY 4.0** (`https://creativecommons.org/licenses/by/4.0/`). Source: `https://lod.humanatlas.io/ref-organ/mouth-male/v1.0`
- **Liver & Gallbladder (`assets/liver.glb`)**: Derived from **OrganUI Liver** (`https://github.com/organui/liver-3d`), based on **BodyParts3D 4.0** (© The Database Center for Life Science — DBCLS), licensed under **CC BY 4.0** (`https://creativecommons.org/licenses/by/4.0/`).
- **Stomach, Pancreas, Small Intestine (`assets/stomach.glb`, `assets/pancreas.glb`, `assets/small-intestine.glb`)**: Open-license anatomical models Draco-compressed for WebAR.

## Local Usage
Serve the folder over `http://localhost` or HTTPS (required by WebAR camera APIs and ES modules):

```bash
npx serve .
# or
python -m http.server 8080
```
Open `http://localhost:8080` (or `http://localhost:8080?mode=3d` to jump straight into 3D Holo-Lab).
