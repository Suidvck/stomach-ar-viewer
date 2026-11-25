import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Compiler } from 'mindar-image';
import { MindARThree } from 'mindar-image-three';

import { ORGANS } from './organ-data.js';
import { ICONS } from './icons.js';
import { normalizeModel, createOrganVFXRig } from './vfx-engine.js';
import { soundEngine } from './sound-engine.js';
import { createLearningUI } from './learning-ui.js';

/**
 * Digestive System Bio-Hologram AR & 3D Studio Orchestrator
 * Seamless dual-mode architecture:
 *  - Live AR Mode (MindAR multi-target auto-detection, maxTrack=1, exclusive visibility)
 *  - 3D Holo-Lab Mode (Interactive 360° OrbitControls studio with starfield & 3-point lighting)
 */

// DOM References
const arContainer = document.getElementById('ar-container');
const labContainer = document.getElementById('lab-container');
const scannerOverlay = document.getElementById('ar-scanner-overlay');
const labOrganBar = document.getElementById('lab-organ-bar');

const organTitleEl = document.getElementById('organ-title');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const arErrorCard = document.getElementById('ar-error-card');
const arErrorDetail = document.getElementById('ar-error-detail');
const cardGuideModal = document.getElementById('card-guide-modal');

const calloutSvg = document.getElementById('callout-svg');
const calloutLabels = document.getElementById('callout-labels');

const infoCard = document.getElementById('info-card');
const infoBadge = document.getElementById('info-badge');
const infoTitle = document.getElementById('info-title');
const infoDesc = document.getElementById('info-desc');
const infoFact = document.getElementById('info-fact');
const btnCloseInfo = document.getElementById('btn-close-info');
const btnSpeakInfo = document.getElementById('btn-speak-info');
const btnDeepDiveInfo = document.getElementById('btn-deep-dive-info');

const toastEl = document.getElementById('holo-toast');
const btnModeAR = document.getElementById('btn-mode-ar');
const btnModeLab = document.getElementById('btn-mode-lab');
const btnMute = document.getElementById('btn-mute');
const btnCardGuide = document.getElementById('btn-card-guide');
const btnCloseCardGuide = document.getElementById('btn-close-card-guide');

const btnPopReplay = document.getElementById('btn-pop-replay');
const btnGuidedTour = document.getElementById('btn-guided-tour');
const btnToggleDigestion = document.getElementById('btn-toggle-digestion');
const btnToggleSpin = document.getElementById('btn-toggle-spin');
const btnToggleLabels = document.getElementById('btn-toggle-labels');
const btnOpenLearning = document.getElementById('btn-open-learning');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const btnRetryAr = document.getElementById('btn-retry-ar');
const btnEnterLabFromError = document.getElementById('btn-enter-lab-error');
const visualModeBtns = document.querySelectorAll('[data-vmode]');

// App State (Defaults: Guided Tour ON, Digestion Flow ON, Auto-Spin ON, Labels ON)
let appMode = 'ar'; // 'ar' | 'lab'
let activeOrganIndex = 0;
let visualMode = 'realistic'; // 'realistic' | 'hologram' | 'xray' | 'explode'
let autoSpin = true;
let showLabels = true;
let digestionActive = true;
let selectedAnnotation = null;

let compiledMindBlobUrl = null;
let mindarThree = null;
let arStarted = false;

let labRenderer = null;
let labScene = null;
let labCamera = null;
let labControls = null;
let labRimLight = null;
let labStarfield = null;
let labAnimId = null;

// Toast Helper
let toastTimeout = null;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden', 'toast-pop');
  void toastEl.offsetWidth;
  toastEl.classList.add('toast-pop');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3200);
}

// Dynamic CSS Theme Synchronization
function applyOrganTheme(organ) {
  const root = document.documentElement.style;
  root.setProperty('--accent', organ.accentColor);
  root.setProperty('--accent-rgb', organ.accentRgb);
  root.setProperty('--accent-glow', `rgba(${organ.accentRgb}, 0.45)`);
  if (labRimLight) {
    labRimLight.color.set(organ.accentColor);
  }
}

function setStatus(organLabel, text, colorClass = 'bg-emerald-400') {
  organTitleEl.innerHTML = organLabel;
  statusText.textContent = text;
  statusDot.className = `w-2 h-2 rounded-full shrink-0 ${colorClass}`;
}

// Learning Hub Initialization
const learningUI = createLearningUI({
  onSelectOrgan: (idx) => {
    selectOrgan(idx, { switchToLabIfHidden: appMode === 'ar' && !organStates[idx].found });
  },
  onFocusAnnotation: (organIdx, ann) => {
    if (activeOrganIndex !== organIdx) {
      selectOrgan(organIdx, { switchToLabIfHidden: appMode === 'ar' && !organStates[organIdx].found });
    }
    openInfoCard(ann, ORGANS[organIdx]);
    if (window.innerWidth < 1024) {
      learningUI.close();
    }
  },
  onToggleDigestionSim: (forceState) => {
    setDigestionMode(typeof forceState === 'boolean' ? forceState : !digestionActive);
  },
  onToast: showToast,
});

// Hotspot Info Card
function openInfoCard(item, organ) {
  selectedAnnotation = item;
  learningUI.markAnnotationRead(item.id);

  infoBadge.textContent = item.badge;
  infoBadge.style.backgroundColor = `rgba(${organ.accentRgb}, 0.2)`;
  infoBadge.style.borderColor = `rgba(${organ.accentRgb}, 0.45)`;
  infoBadge.style.color = organ.accentColor;

  infoTitle.textContent = `${item.title} (${item.subtitle})`;
  infoDesc.textContent = item.desc;
  if (item.fact) {
    infoFact.textContent = `💡 ${item.fact}`;
    infoFact.classList.remove('hidden');
  } else {
    infoFact.classList.add('hidden');
  }
  infoCard.classList.remove('hidden');

  // Highlight active callout pill & 3D reticle + sub-mesh, and softly dim non-active callouts so detail card never competes visually
  organStates.forEach((st) => {
    const isTargetOrgan = st.organ.index === organ.index;
    st.arRig.highlightHotspot(isTargetOrgan ? item : null);
    st.labRig.highlightHotspot(isTargetOrgan ? item : null);
    st.callouts.forEach((c) => {
      const isMe = isTargetOrgan && c.item.id === item.id;
      c.pill.classList.toggle('is-active', isMe);
      c.pill.style.opacity = isMe ? '1' : '0.32';
      c.line.style.opacity = isMe ? '1' : '0.28';
      c.dot.style.opacity = isMe ? '1' : '0.35';
    });
  });
}

function closeInfoCard() {
  selectedAnnotation = null;
  infoCard.classList.add('hidden');
  soundEngine.stopSpeech();
  organStates.forEach((st) => {
    st.arRig.highlightHotspot(null);
    st.labRig.highlightHotspot(null);
    st.callouts.forEach((c) => {
      c.pill.classList.remove('is-active');
      c.pill.style.opacity = '1';
      c.line.style.opacity = '1';
      c.dot.style.opacity = '1';
    });
  });
}

btnCloseInfo.addEventListener('click', () => {
  soundEngine.playClick();
  closeInfoCard();
});

btnSpeakInfo.addEventListener('click', () => {
  if (!selectedAnnotation) return;
  if (soundEngine.speaking) {
    soundEngine.stopSpeech();
  } else {
    soundEngine.speakThai(`${selectedAnnotation.title}. ${selectedAnnotation.desc}`);
  }
});

btnDeepDiveInfo.addEventListener('click', () => {
  soundEngine.playTab();
  learningUI.open('enzymes');
});

// Shared GLTF + Draco Loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Build Dual-Rig Organ States + SVG/HTML 3D Callouts
const svgNS = 'http://www.w3.org/2000/svg';
const organStates = ORGANS.map((organ) => {
  // Rig for AR (Z-up out of card plane)
  const arRig = createOrganVFXRig(organ);
  arRig.root.position.set(0, 0, 0.34);
  arRig.root.visible = false;

  // Rig for 3D Holo-Lab (Y-up studio world -> rotate root -90° around X so Z-up maps to Y-up!)
  const labRig = createOrganVFXRig(organ);
  labRig.root.rotation.x = -Math.PI / 2;
  labRig.root.position.set(0, 0.06, 0);
  labRig.root.visible = false;

  const callouts = organ.annotations.map((item) => {
    const line = document.createElementNS(svgNS, 'polyline');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', organ.accentColor);
    line.setAttribute('stroke-opacity', '0.9');
    line.setAttribute('stroke-width', '1.8');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    line.style.display = 'none';
    calloutSvg.appendChild(line);

    const haloDot = document.createElementNS(svgNS, 'circle');
    haloDot.setAttribute('r', '7.5');
    haloDot.setAttribute('fill', organ.accentColor);
    haloDot.setAttribute('fill-opacity', '0.28');
    haloDot.classList.add('svg-dot-pulse');
    haloDot.style.display = 'none';
    calloutSvg.appendChild(haloDot);

    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('r', '4');
    dot.setAttribute('fill', organ.accentColor);
    dot.setAttribute('stroke', '#ffffff');
    dot.setAttribute('stroke-width', '1.6');
    dot.style.display = 'none';
    calloutSvg.appendChild(dot);

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className =
      'callout-pill pointer-events-auto absolute px-2.5 py-1 rounded-full bg-slate-950/80 border border-white/20 backdrop-blur-md text-left flex items-center gap-1.5';
    pill.style.display = 'none';
    pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:${organ.accentColor}; box-shadow:0 0 8px ${organ.accentColor}"></span><span class="text-[11px] font-medium text-white whitespace-nowrap">${item.title}</span>`;
    let lastTriggerTs = 0;
    const handleSelectPill = (e) => {
      e.stopPropagation();
      const now = performance.now();
      if (now - lastTriggerTs < 240) return;
      lastTriggerTs = now;
      soundEngine.playClick();
      openInfoCard(item, organ);
    };
    pill.addEventListener('pointerdown', handleSelectPill);
    pill.addEventListener('click', handleSelectPill);
    calloutLabels.appendChild(pill);

    const arAnchorObj = new THREE.Object3D();
    arAnchorObj.position.copy(item.localPos);

    const labAnchorObj = new THREE.Object3D();
    labAnchorObj.position.copy(item.localPos);

    return {
      item,
      line,
      haloDot,
      dot,
      pill,
      arAnchorObj,
      labAnchorObj,
      smoothLx: null,
      smoothLy: null,
    };
  });

  const state = {
    organ,
    arRig,
    labRig,
    callouts,
    found: false,
    loaded: false,
    popProgress: 0,
  };

  gltfLoader.load(
    organ.glbUrl,
    (gltf) => {
      const arNorm = normalizeModel(gltf.scene, organ.modelRotation);
      arRig.attachNormalizedModel(arNorm.wrapper, arNorm.scale);
      callouts.forEach((c) => arNorm.wrapper.add(c.arAnchorObj));

      const labNorm = normalizeModel(gltf.scene, organ.modelRotation);
      labRig.attachNormalizedModel(labNorm.wrapper, labNorm.scale);
      callouts.forEach((c) => labNorm.wrapper.add(c.labAnchorObj));

      state.loaded = true;
      state.popProgress = 0;

      // Apply current global modes to freshly loaded organ
      arRig.applyVisualMode(visualMode);
      labRig.applyVisualMode(visualMode);
      arRig.setDigestionActive(digestionActive);
      labRig.setDigestionActive(digestionActive);

      if (appMode === 'lab' && organ.index === activeOrganIndex) {
        labRig.root.visible = true;
        labRig.triggerScanBurst();
      }
    },
    undefined,
    (err) => console.error(`GLB Load error (${organ.name}):`, err)
  );

  return state;
});

// Unified 3D-to-2D Callout Projector (works for both AR camera and 3D Lab camera!)
const tempVec = new THREE.Vector3();
function updateCallouts(camera, width, height, mode) {
  if (!camera || !width || !height) return;
  const isCompact = width < 480;
  const scaleFactor = isCompact ? 0.8 : 1.05;

  organStates.forEach((st) => {
    const isVisible =
      showLabels &&
      st.loaded &&
      (mode === 'ar' ? st.found : st.organ.index === activeOrganIndex);

    st.callouts.forEach((c) => {
      const { item, line, haloDot, dot, pill, arAnchorObj, labAnchorObj } = c;
      if (!isVisible) {
        line.style.display = 'none';
        haloDot.style.display = 'none';
        dot.style.display = 'none';
        pill.style.display = 'none';
        c.smoothLx = null;
        c.smoothLy = null;
        return;
      }

      const anchorObj = mode === 'ar' ? arAnchorObj : labAnchorObj;
      anchorObj.updateWorldMatrix(true, false);
      tempVec.setFromMatrixPosition(anchorObj.matrixWorld);
      tempVec.project(camera);

      if (tempVec.z > 1 || tempVec.z < -1) {
        line.style.display = 'none';
        haloDot.style.display = 'none';
        dot.style.display = 'none';
        pill.style.display = 'none';
        return;
      }

      const sx = (tempVec.x * 0.5 + 0.5) * width;
      const sy = (-tempVec.y * 0.5 + 0.5) * height;
      const ox = item.offset.x * scaleFactor;
      const oy = item.offset.y * scaleFactor;
      const targetLx = Math.max(76, Math.min(width - 76, sx + ox));
      const targetLy = Math.max(78, Math.min(height - 120, sy + oy));

      // Smooth low-pass damping so pills stay rock-steady to tap while floating
      if (c.smoothLx === null) {
        c.smoothLx = targetLx;
        c.smoothLy = targetLy;
      } else {
        c.smoothLx += (targetLx - c.smoothLx) * 0.28;
        c.smoothLy += (targetLy - c.smoothLy) * 0.28;
      }
      const lx = c.smoothLx;
      const ly = c.smoothLy;
      const elbowX = sx + (lx - sx) * 0.52;

      line.style.display = '';
      haloDot.style.display = '';
      dot.style.display = '';
      pill.style.display = '';

      haloDot.setAttribute('cx', sx.toFixed(1));
      haloDot.setAttribute('cy', sy.toFixed(1));
      dot.setAttribute('cx', sx.toFixed(1));
      dot.setAttribute('cy', sy.toFixed(1));
      line.setAttribute(
        'points',
        `${sx.toFixed(1)},${sy.toFixed(1)} ${elbowX.toFixed(1)},${ly.toFixed(1)} ${lx.toFixed(1)},${ly.toFixed(1)}`
      );

      pill.style.left = `${lx.toFixed(1)}px`;
      pill.style.top = `${ly.toFixed(1)}px`;
      pill.style.transform = 'translate(-50%, -50%)';
    });
  });
}

function hideAllCallouts() {
  organStates.forEach((st) => {
    st.callouts.forEach(({ line, haloDot, dot, pill }) => {
      line.style.display = 'none';
      haloDot.style.display = 'none';
      dot.style.display = 'none';
      pill.style.display = 'none';
    });
  });
}

function refreshStatusBanner() {
  if (appMode === 'lab') {
    const organ = ORGANS[activeOrganIndex];
    setStatus(`${organ.icon} ${organ.name}`, 'โหมด 3D แล็บ • ลากหมุน 360° / แตะป้ายชี้', 'bg-emerald-400');
    scannerOverlay.classList.add('hidden');
    return;
  }

  const activeStates = organStates.filter((s) => s.found);
  if (activeStates.length > 0) {
    const current = activeStates[0].organ;
    setStatus(`${current.icon} ${current.name}`, 'ล็อกเป้า AR สำเร็จ • แตะป้ายชี้หรือเปิดคลังความรู้', 'bg-emerald-400');
    scannerOverlay.classList.add('hidden');
  } else {
    setStatus('ระบบย่อยอาหาร AR', 'ส่องกล้องไปที่การ์ด (ปาก / กระเพาะ / ตับ / ตับอ่อน / ลำไส้เล็ก)', 'bg-sky-400 animate-pulse');
    if (arStarted) scannerOverlay.classList.remove('hidden');
  }
}

/* ==================== 3D HOLO-LAB STUDIO MODE ==================== */
function ensureLabInitialized() {
  if (labRenderer) return;

  labScene = new THREE.Scene();

  const w = labContainer.clientWidth || window.innerWidth;
  const h = labContainer.clientHeight || window.innerHeight;
  labCamera = new THREE.PerspectiveCamera(42, w / h, 0.05, 50);
  labCamera.position.set(0, 0.25, 1.85);

  labRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  labRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  labRenderer.setSize(w, h);
  labRenderer.outputColorSpace = THREE.SRGBColorSpace;
  labRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  labRenderer.toneMappingExposure = 1.12;
  labContainer.appendChild(labRenderer.domElement);

  // Studio 3-Point Sci-Fi Lighting
  labScene.add(new THREE.HemisphereLight(0xe2e8f0, 0x0f172a, 1.35));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(2.2, 3.2, 2.8);
  labScene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
  fillLight.position.set(-2.5, 1.0, 1.8);
  labScene.add(fillLight);

  labRimLight = new THREE.PointLight(ORGANS[activeOrganIndex].accentColor, 2.2, 8);
  labRimLight.position.set(0, -0.8, -1.6);
  labScene.add(labRimLight);

  // OrbitControls for silky 360° touch/mouse exploration
  labControls = new OrbitControls(labCamera, labRenderer.domElement);
  labControls.enableDamping = true;
  labControls.dampingFactor = 0.06;
  labControls.enablePan = false;
  labControls.minDistance = 0.95;
  labControls.maxDistance = 3.2;
  labControls.target.set(0, 0.05, 0);

  // Attach all 5 lab rigs
  organStates.forEach((st) => {
    labScene.add(st.labRig.root);
  });

  window.addEventListener('resize', () => {
    if (!labRenderer || !labCamera) return;
    const nw = labContainer.clientWidth || window.innerWidth;
    const nh = labContainer.clientHeight || window.innerHeight;
    labCamera.aspect = nw / nh;
    labCamera.updateProjectionMatrix();
    labRenderer.setSize(nw, nh);
  });
}

let labLastTime = performance.now();
function startLabLoop() {
  if (labAnimId) return;
  labLastTime = performance.now();
  const loop = () => {
    labAnimId = requestAnimationFrame(loop);
    if (appMode !== 'lab') return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - labLastTime) / 1000);
    const elapsed = now / 1000;
    labLastTime = now;

    if (labStarfield) {
      labStarfield.rotation.y = elapsed * 0.03;
    }

    organStates.forEach((st) => {
      const isCur = st.organ.index === activeOrganIndex;
      st.labRig.root.visible = isCur && st.loaded;
      if (isCur && st.loaded) {
        if (st.popProgress < 1) {
          st.popProgress = Math.min(1, st.popProgress + dt * 2.2);
        }
        st.labRig.update(dt, elapsed, {
          isVisible: true,
          autoSpin,
          popProgress: st.popProgress,
          camera: labCamera,
        });
      }
    });

    labControls.update();
    labRenderer.render(labScene, labCamera);
    updateCallouts(labCamera, labContainer.clientWidth, labContainer.clientHeight, 'lab');
  };
  loop();
}

function renderLabOrganBar() {
  labOrganBar.innerHTML = ORGANS.map((o) => {
    const active = o.index === activeOrganIndex;
    return `
      <button
        type="button"
        data-lab-organ="${o.index}"
        class="px-3 py-1.5 rounded-full text-xs font-semibold transition border flex items-center gap-1.5 whitespace-nowrap ${
          active
            ? 'text-white border-white/40 shadow-lg'
            : 'bg-slate-900/75 border-white/15 text-slate-300 hover:bg-slate-800/90 hover:text-white'
        }"
        style="${
          active
            ? `background:linear-gradient(135deg, ${o.accentColor}, rgba(${o.accentRgb},0.65)); box-shadow:0 0 18px ${o.accentColor}66;`
            : ''
        }"
      >
        <span>${o.icon}</span>
        <span>${o.name}</span>
      </button>
    `;
  }).join('');

  labOrganBar.querySelectorAll('[data-lab-organ]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectOrgan(Number(btn.dataset.labOrgan));
    });
  });
}

function selectOrgan(idx, { switchToLabIfHidden = false } = {}) {
  if (switchToLabIfHidden && appMode !== 'lab') {
    switchMode('lab');
  }
  activeOrganIndex = idx;
  const organ = ORGANS[idx];
  applyOrganTheme(organ);
  closeInfoCard();

  const st = organStates[idx];
  st.popProgress = 0;
  st.labRig.triggerScanBurst();
  st.arRig.triggerScanBurst();
  if (labControls) {
    labCamera.position.set(0, 0.22, 1.85);
    labControls.target.set(0, 0.05, 0);
    labControls.update();
  }

  soundEngine.playLockOn();
  learningUI.setOrgan(idx, { silent: true });
  renderLabOrganBar();
  refreshStatusBanner();
  if (tourRunning) scheduleTourForActiveOrgan(900);
}

function switchMode(targetMode) {
  if (appMode === targetMode && (targetMode === 'lab' ? labRenderer : arStarted)) return;
  appMode = targetMode;
  soundEngine.playModeSwitch();
  pauseTourTimer();
  closeInfoCard();
  hideAllCallouts();

  btnModeAR.classList.toggle('dock-btn-active', targetMode === 'ar');
  btnModeLab.classList.toggle('dock-btn-active', targetMode === 'lab');

  if (targetMode === 'lab') {
    arErrorCard.classList.add('hidden');
    arContainer.classList.add('opacity-0', 'pointer-events-none');
    labContainer.classList.remove('hidden');
    labOrganBar.classList.remove('hidden');
    scannerOverlay.classList.add('hidden');

    ensureLabInitialized();
    startLabLoop();
    renderLabOrganBar();
    applyOrganTheme(ORGANS[activeOrganIndex]);
    learningUI.setOrgan(activeOrganIndex, { silent: true });

    const st = organStates[activeOrganIndex];
    st.popProgress = 0;
    st.labRig.triggerScanBurst();
    refreshStatusBanner();
    showToast('เข้าสู่โหมดห้องแล็บ 3D — ลากหมุนและซูมสำรวจได้อิสระ!');
    if (tourRunning) scheduleTourForActiveOrgan(1100);
  } else {
    labContainer.classList.add('hidden');
    labOrganBar.classList.add('hidden');
    arContainer.classList.remove('opacity-0', 'pointer-events-none');
    startARMode();
  }
}

/* ==================== MINDAR COMPILER + LIVE AR ENGINE ==================== */
function idbGet(key) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('stomach_ar_cache', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => {
        const tx = req.result.transaction('kv', 'readonly');
        const g = tx.objectStore('kv').get(key);
        g.onsuccess = () => resolve(g.result || null);
        g.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbSet(key, val) {
  try {
    const req = indexedDB.open('stomach_ar_cache', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const tx = req.result.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(val, key);
    };
  } catch {}
}

async function ensureCompiledMind() {
  if (compiledMindBlobUrl) return compiledMindBlobUrl;
  setStatus('ระบบย่อยอาหาร AR', 'กำลังเตรียมฐานข้อมูลการ์ด 5 ใบ...', 'bg-amber-400 animate-pulse');

  const cached = await idbGet('digestive_mind_v5');
  if (cached) {
    const blob = new Blob([cached], { type: 'application/octet-stream' });
    compiledMindBlobUrl = URL.createObjectURL(blob);
    return compiledMindBlobUrl;
  }

  const imgs = await Promise.all(
    ORGANS.map((o) => {
      const el = document.getElementById(o.imgId);
      if (el.complete && el.naturalWidth > 0) return Promise.resolve(el);
      return new Promise((resolve, reject) => {
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error(`โหลดรูปการ์ด ${o.name} ไม่สำเร็จ`));
      });
    })
  );

  const compiler = new Compiler();
  await compiler.compileImageTargets(imgs, (progress) => {
    const pct = Math.round(progress);
    setStatus('ระบบย่อยอาหาร AR', `ประมวลผลลายนิ้วมือการ์ด 5 ใบ ${pct}%`, 'bg-amber-400 animate-pulse');
  });

  const buf = await compiler.exportData();
  idbSet('digestive_mind_v5', buf);
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  compiledMindBlobUrl = URL.createObjectURL(blob);
  return compiledMindBlobUrl;
}

let arLastTime = performance.now();
async function startARMode() {
  arErrorCard.classList.add('hidden');
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('ต้องเปิดผ่าน HTTPS หรือ localhost เพื่อเข้าถึงกล้อง');
    }
    const mindUrl = await ensureCompiledMind();

    if (!mindarThree) {
      mindarThree = new MindARThree({
        container: arContainer,
        imageTargetSrc: mindUrl,
        maxTrack: 1,
        filterMinCF: 0.005,
        filterBeta: 0.05,
        warmupTolerance: 1,
        missTolerance: 3,
        uiLoading: 'no',
        uiScanning: 'no',
      });

      const { renderer, scene, camera } = mindarThree;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.5));
      const arDir = new THREE.DirectionalLight(0xffffff, 1.65);
      arDir.position.set(1.2, 2.2, 2.4);
      scene.add(arDir);
      const arRim = new THREE.DirectionalLight(0x38bdf8, 0.75);
      arRim.position.set(-1.5, -1, 1);
      scene.add(arRim);

      organStates.forEach((st) => {
        const anchor = mindarThree.addAnchor(st.organ.index);
        anchor.group.add(st.arRig.root);

        anchor.onTargetFound = () => {
          organStates.forEach((other) => {
            if (other !== st) {
              other.found = false;
              other.arRig.root.visible = false;
            }
          });
          st.found = true;
          st.arRig.root.visible = true;
          st.popProgress = 0;
          st.arRig.triggerScanBurst();

          activeOrganIndex = st.organ.index;
          applyOrganTheme(st.organ);
          closeInfoCard();
          soundEngine.playLockOn();
          learningUI.setOrgan(st.organ.index, { silent: true });
          refreshStatusBanner();
          showToast(`✨ ตรวจพบการ์ด: ${st.organ.name} (${st.organ.nameEn})`);
          if (tourRunning) scheduleTourForActiveOrgan(900);
        };

        anchor.onTargetLost = () => {
          st.found = false;
          st.arRig.root.visible = false;
          pauseTourTimer();
          closeInfoCard();
          refreshStatusBanner();
        };
      });

      setStatus('ระบบย่อยอาหาร AR', 'กำลังเปิดกล้องสแกน...', 'bg-amber-400 animate-pulse');
      await mindarThree.start();
      arStarted = true;
      refreshStatusBanner();

      renderer.setAnimationLoop(() => {
        if (appMode !== 'ar') return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - arLastTime) / 1000);
        const elapsed = now / 1000;
        arLastTime = now;

        organStates.forEach((st) => {
          if (st.found && st.loaded) {
            if (st.popProgress < 1) {
              st.popProgress = Math.min(1, st.popProgress + dt * 2.2);
            }
            st.arRig.update(dt, elapsed, {
              isVisible: true,
              autoSpin,
              popProgress: st.popProgress,
              camera,
            });
          }
        });

        renderer.render(scene, camera);
        updateCallouts(camera, arContainer.clientWidth, arContainer.clientHeight, 'ar');
      });
    } else if (!arStarted) {
      await mindarThree.start();
      arStarted = true;
      refreshStatusBanner();
    } else {
      refreshStatusBanner();
    }
  } catch (err) {
    if (appMode !== 'ar') return;
    setStatus('ระบบย่อยอาหาร AR', 'ไม่พบกล้อง หรือรอการอนุญาต', 'bg-rose-500');
    scannerOverlay.classList.add('hidden');
    arErrorDetail.textContent =
      'คุณสามารถกดอนุญาตเปิดกล้องเพื่อสแกนการ์ดจริง หรือเข้าสู่ "โหมดห้องแล็บ 3D" เพื่อสำรวจอวัยวะและสื่อการเรียนทั้งหมดได้ทันที (' +
      (err?.message || 'Camera unavailable') +
      ')';
    arErrorCard.classList.remove('hidden');
  }
}

/* ==================== GLOBAL CONTROLS & EVENT WIRING ==================== */
function setVisualMode(mode) {
  visualMode = mode;
  soundEngine.playModeSwitch();

  organStates.forEach((st) => {
    st.arRig.applyVisualMode(mode);
    st.labRig.applyVisualMode(mode);
  });

  visualModeBtns.forEach((btn) => {
    btn.classList.toggle('vmode-active', btn.dataset.vmode === mode);
  });

  const labels = {
    realistic: 'โหมดปกติ (สมจริง)',
    hologram: 'โหมดโฮโลแกรม Sci-Fi ✨',
    xray: 'โหมดเอกซเรย์โปร่งแสง',
    explode: 'โหมดแยกส่วนกายวิภาค',
  };
  showToast(labels[mode] || mode);
}

function setDigestionMode(active) {
  digestionActive = active;
  organStates.forEach((st) => {
    st.arRig.setDigestionActive(active);
    st.labRig.setDigestionActive(active);
  });
  btnToggleDigestion.classList.toggle('dock-btn-active', active);
  btnToggleDigestion.innerHTML = `${ICONS.wave}<span class="hidden sm:inline">${active ? 'ย่อย: เปิด' : 'จำลองย่อย'}</span>`;
  if (active) {
    soundEngine.playDigestStep();
    showToast('อาหาร น้ำดี และเอนไซม์กำลังไหลตามแนว 3D! (ผนังปรับโปร่งแสงอัตโนมัติ)');
  }
}

visualModeBtns.forEach((btn) => {
  btn.addEventListener('click', () => setVisualMode(btn.dataset.vmode));
});

btnPopReplay.addEventListener('click', () => {
  soundEngine.playPop();
  organStates.forEach((st) => {
    st.popProgress = 0;
    st.arRig.triggerScanBurst();
    st.labRig.triggerScanBurst();
  });
  showToast('⚡ สแกนโฮโลแกรม + เล่นแอนิเมชันใหม่!');
});

/* ==================== CINEMATIC GUIDED 3D AUTO-TOUR (ON BY DEFAULT) ==================== */
let tourRunning = true;
let tourTimer = null;
let tourStepIdx = 0;

function pauseTourTimer() {
  if (tourTimer) {
    clearTimeout(tourTimer);
    tourTimer = null;
  }
  soundEngine.stopSpeech();
}

function stopGuidedTour({ silent = false } = {}) {
  tourRunning = false;
  pauseTourTimer();
  btnGuidedTour.classList.remove('dock-btn-active');
  btnGuidedTour.innerHTML = `${ICONS.play}<span class="hidden sm:inline">ทัวร์นำชม</span>`;
  setVisualMode('realistic');
  closeInfoCard();
  if (!silent) showToast('หยุดโหมดทัวร์นำชมแล้ว');
}

function scheduleTourForActiveOrgan(delayMs = 900) {
  pauseTourTimer();
  if (!tourRunning) return;
  tourStepIdx = 0;

  const showcaseModes = ['realistic', 'realistic', 'hologram', 'xray'];

  const runStep = () => {
    if (!tourRunning) return;
    // Only step when an organ is actively visible (3D Lab or AR target currently tracked)
    const isOrganVisible = appMode === 'lab' || organStates[activeOrganIndex]?.found;
    if (!isOrganVisible) return;

    // Pause stepping unobtrusively while user is reading inside the Learning Hub Drawer
    if (learningUI.isOpen()) {
      tourTimer = setTimeout(runStep, 2500);
      return;
    }

    const currentOrgan = ORGANS[activeOrganIndex];
    const anns = currentOrgan.annotations;

    if (tourStepIdx < anns.length) {
      const ann = anns[tourStepIdx];
      const nextMode = showcaseModes[tourStepIdx % showcaseModes.length];
      if (visualMode !== nextMode) {
        setVisualMode(nextMode);
      }
      openInfoCard(ann, currentOrgan);
      soundEngine.speakThai(`${ann.title}. ${ann.desc}`);
      showToast(`ทัวร์นำชม (${tourStepIdx + 1}/${anns.length}): ${ann.title}`);
      tourStepIdx++;
      tourTimer = setTimeout(runStep, 5200);
    } else {
      // Brief clean showcase in realistic mode showing food flowing through the tube, then loop
      if (visualMode !== 'realistic') setVisualMode('realistic');
      closeInfoCard();
      tourStepIdx = 0;
      tourTimer = setTimeout(runStep, 3600);
    }
  };

  tourTimer = setTimeout(runStep, delayMs);
}

function toggleGuidedTour() {
  if (tourRunning) {
    stopGuidedTour();
    return;
  }
  // If user manually turns tour ON while AR has no card tracked yet, enter 3D Lab so they see it immediately
  if (appMode === 'ar' && !organStates.some((s) => s.found)) {
    switchMode('lab');
  }

  tourRunning = true;
  btnGuidedTour.classList.add('dock-btn-active');
  btnGuidedTour.innerHTML = `${ICONS.stop}<span class="hidden sm:inline">หยุดทัวร์</span>`;

  if (!autoSpin) {
    autoSpin = true;
    btnToggleSpin.classList.add('dock-btn-active');
    btnToggleSpin.innerHTML = `${ICONS.spin}<span class="hidden sm:inline">หมุน: เปิด</span>`;
  }
  if (!showLabels) {
    showLabels = true;
    btnToggleLabels.classList.add('dock-btn-active');
    btnToggleLabels.innerHTML = `${ICONS.pin}<span class="hidden sm:inline">ป้ายชี้</span>`;
  }
  if (!digestionActive) setDigestionMode(true);

  scheduleTourForActiveOrgan(200);
}

btnGuidedTour.addEventListener('click', toggleGuidedTour);

btnToggleDigestion.addEventListener('click', () => {
  setDigestionMode(!digestionActive);
});

btnToggleSpin.addEventListener('click', () => {
  autoSpin = !autoSpin;
  soundEngine.playClick();
  btnToggleSpin.classList.toggle('dock-btn-active', autoSpin);
  btnToggleSpin.innerHTML = `${ICONS.spin}<span class="hidden sm:inline">${autoSpin ? 'หมุน: เปิด' : 'หมุน'}</span>`;
});

btnToggleLabels.addEventListener('click', () => {
  showLabels = !showLabels;
  soundEngine.playClick();
  btnToggleLabels.classList.toggle('dock-btn-active', showLabels);
  btnToggleLabels.innerHTML = `${ICONS.pin}<span class="hidden sm:inline">${showLabels ? 'ป้ายชี้' : 'ซ่อนป้าย'}</span>`;
  if (!showLabels) {
    closeInfoCard();
    hideAllCallouts();
  }
});

btnOpenLearning.addEventListener('click', () => {
  soundEngine.playTab();
  learningUI.toggle();
});

btnCloseDrawer.addEventListener('click', () => {
  soundEngine.playClick();
  learningUI.close();
});

btnModeAR.addEventListener('click', () => switchMode('ar'));
btnModeLab.addEventListener('click', () => switchMode('lab'));

btnMute.addEventListener('click', () => {
  const on = soundEngine.toggleMute();
  btnMute.innerHTML = on ? ICONS.speaker : ICONS.mute;
  btnMute.title = on ? 'เสียงเอฟเฟกต์: เปิด' : 'เสียงเอฟเฟกต์: ปิด';
  if (on) soundEngine.playClick();
});

btnCardGuide.addEventListener('click', () => {
  soundEngine.playClick();
  cardGuideModal.classList.remove('hidden');
});

btnCloseCardGuide.addEventListener('click', () => {
  soundEngine.playClick();
  cardGuideModal.classList.add('hidden');
});

cardGuideModal.addEventListener('click', (e) => {
  if (e.target === cardGuideModal) cardGuideModal.classList.add('hidden');
});

document.querySelectorAll('[data-guide-open-lab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const idx = Number(btn.dataset.guideOpenLab);
    cardGuideModal.classList.add('hidden');
    switchMode('lab');
    selectOrgan(idx);
  });
});

btnRetryAr.addEventListener('click', () => {
  soundEngine.playClick();
  startARMode();
});

btnEnterLabFromError.addEventListener('click', () => {
  switchMode('lab');
});

// Boot Sequence: Check ?mode=3d override, otherwise auto-start AR!
window.addEventListener('load', () => {
  applyOrganTheme(ORGANS[0]);
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === '3d') {
    switchMode('lab');
  } else {
    startARMode();
  }
});
