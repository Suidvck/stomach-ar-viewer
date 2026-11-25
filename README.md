# Digestive System Bio-Hologram 3D WebAR Studio

Interactive **3D Image Tracking WebAR + 3D Holo-Lab Learning Platform** for the Human Digestive System built with **MindAR**, **Three.js (Custom GLSL Shaders)**, and **Tailwind CSS** — zero build step, ready for static hosting on Vercel or GitHub Pages.

## Supported AR Target Cards & 3D Organs
1. **กระเพาะอาหาร (Stomach)** — `assets/target-0.jpg` + `assets/stomach.glb` (Draco compressed)
   - Enzyms: Pepsinogen, Pepsin (+ HCl, Rennin, Gastrin)
2. **ตับอ่อน (Pancreas)** — `assets/target-1.jpg` + `assets/pancreas.glb` (3 sub-meshes: `pancreatic-head`, `pancreatic-body-and-tail`, `pancreatic-duct`)
   - Enzymes: Trypsinogen, Chymotrypsinogen, Procarboxypeptidase, Amylase, DNase, RNase, Nucleotidase, Nucleosidase (+ Lipase, NaHCO₃, Insulin/Glucagon)
3. **ลำไส้เล็ก (Small Intestine)** — `assets/target-2.jpg` + `assets/small-intestine.glb` (3 sub-meshes: `duodenum`, `jejunum`, `ileum`)
   - Enzymes: Carb group (Maltase, Sucrase, Lactase), Protein group (Aminopeptidase, Dipeptidase), Lipid group (Lipase) + Enterokinase, Secretin/CCK

## Key Features
- **Dual-Mode Engine:** Auto-starts **Live AR Camera** (`maxTrack: 1` with exclusive visibility + IndexedDB `.mind` cache) and offers instant 1-tap switching to **3D Holo-Lab Mode** (`OrbitControls` 360° interactive studio without needing a physical card).
- **Clean Medical 3D Stage & Procedural Animations:**
  - Custom **GLSL Fresnel + Moving Scanline Hologram Shader** & **Medical X-Ray Shader**
  - **Exploded View** separating anatomical sub-meshes smoothly
  - **Exact Geodesic Mesh-Centerline Food & Enzyme Flow** (`js/tube-path.js`) stitching all 56 coils of the Small Intestine (Duodenum → Jejunum → Ileum), main Pancreatic Duct, and Stomach J-lumen, paired with auto semi-translucent walls and travelling peristalsis contraction rings
  - Clean clutter-free 3D presentation with subtle organic breathing and 3D-to-2D SVG leader callouts
  - **Cinematic Guided Auto-Tour (`ทัวร์นำชม`)** with automatic hotspot stepping, shader showcase, and Thai voice narration
- **9-Category Educational Learning Hub:**
  1. **กายวิภาค (Anatomy & Histology)** — Live pH scale meter, KPI stats, 3D clickable hotspots, microscopic tissue layers, Thai TTS narration
  2. **เอนไซม์ (Enzymes & Biochemistry)** — Complete filterable reaction equations (`Substrate ──▶ Product`) with AR-card badges
  3. **จำลองย่อย (Interactive Food Digestion Simulator)** — Choose 4 meals to run step-by-step molecular breakdown synced with 3D flow particles
  4. **เส้นทางอาหาร (6-Stage Digestive Journey)** — Full timeline from Mouth to Large Intestine with 3D jump links
  5. **เทียบ 3 อวัยวะ (Comparison Matrix & Exam Cheat-Sheet)** — Side-by-side summary table + 6 high-yield biology exam traps
  6. **โรค & เกร็ดน่ารู้ (Clinical Health & Fun Facts)** — Diseases (GERD, Ulcer, Diabetes, Pancreatitis, Lactose Intolerance, Celiac) + fun facts
  7. **แฟลชการ์ด (3D Flip Flashcards)** — 14 interactive CSS 3D flip cards with mastery progress
  8. **เกมจับคู่ (Enzyme Speed-Match Game)** — Timed enzyme-reaction matching mini-game with best-time tracking
  9. **ควิซ & เหรียญ (15-Question Quiz + Mastery Badges)** — Combo streaks, detailed explanations, canvas confetti, and 5 unlockable badges saved in `localStorage`
- **Procedural Web Audio SFX + Thai Voice Narration** (`speechSynthesis`).

## Local Usage
Serve the folder over `http://localhost` or HTTPS (required by WebAR camera APIs and ES modules):

```bash
npx serve .
# or
python -m http.server 8080
```
Open `http://localhost:8080` (or `http://localhost:8080?mode=3d` to jump straight into 3D Holo-Lab).
