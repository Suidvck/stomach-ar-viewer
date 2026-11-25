import {
  ORGANS,
  FOOD_PRESETS,
  DIGESTIVE_JOURNEY,
  FLASHCARDS,
  QUIZ_QUESTIONS,
  MATCH_GAME_PAIRS,
} from './organ-data.js';
import { ICONS } from './icons.js';
import { soundEngine } from './sound-engine.js';

/**
 * Visual-First 9-Category Learning Hub (Low-Text, High-Clarity Bento & Infographic Edition)
 * Designed for 1-second scanning: crisp diagrams, equation chips, tap-to-expand details,
 * interactive story cards, myth-buster strips, flashcards, speed-match game, and quiz.
 */

const STORAGE_KEY = 'digestive_holo_progress_v2';

const TABS = [
  { id: 'anatomy', label: 'กายวิภาค', icon: ICONS.anatomy },
  { id: 'enzymes', label: 'เอนไซม์', icon: ICONS.enzymes },
  { id: 'simulator', label: 'จำลองย่อย', icon: ICONS.simulator },
  { id: 'journey', label: 'เส้นทาง', icon: ICONS.journey },
  { id: 'compare', label: 'สรุปเทียบ', icon: ICONS.compare },
  { id: 'clinical', label: 'โรค & เกร็ด', icon: ICONS.clinical },
  { id: 'flashcards', label: 'แฟลชการ์ด', icon: ICONS.flashcards },
  { id: 'match', label: 'เกมจับคู่', icon: ICONS.match },
  { id: 'quiz', label: 'ควิซ', icon: ICONS.quiz },
];

const ENZYME_FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'onCard', label: '⭐ บนการ์ด' },
  { id: 'protein', label: 'โปรตีน' },
  { id: 'carb', label: 'คาร์บฯ' },
  { id: 'lipid', label: 'ไขมัน' },
  { id: 'nucleic', label: 'DNA/RNA' },
  { id: 'activator', label: 'สารเสริม/ฮอร์โมน' },
];

/* Crisp scannable 1-line comparison rows covering all 5 organs (zero wall-of-text!) */
const QUICK_COMPARE = [
  {
    label: 'ค่า pH',
    mouth: '6.5–7.0 (กลาง)',
    stomach: '1.5–2.5 (กรด)',
    liver: '7.6–8.6 (น้ำดี)',
    pancreas: '7.5–8.5 (ด่าง)',
    intestine: '7.0–8.0 (กลาง)',
  },
  {
    label: 'อาหารผ่าน?',
    mouth: '✅ ผ่านตรง',
    stomach: '✅ ผ่านตรง',
    liver: '❌ ส่งแค่น้ำดี',
    pancreas: '❌ ส่งแค่น้ำย่อย',
    intestine: '✅ ผ่านตรง',
  },
  {
    label: 'หน้าที่เด่น',
    mouth: 'เคี้ยว + ย่อยแป้ง',
    stomach: 'ย่อยโปรตีน',
    liver: 'สร้างน้ำดีตีไขมัน',
    pancreas: 'ย่อยครบ 4 หมู่',
    intestine: 'ย่อยจบ 3 หมู่',
  },
  {
    label: 'คีย์บนการ์ด',
    mouth: 'อะไมเลส',
    stomach: 'เพปซิโนเจน/เพปซิน',
    liver: 'น้ำดี → ถุงน้ำดี',
    pancreas: 'เอนไซม์ 8 ชนิด',
    intestine: '6 เอนไซม์ 3 กลุ่ม',
  },
  {
    label: 'ดูดซึม',
    mouth: 'แทบไม่มี',
    stomach: 'น้อยมาก',
    liver: 'รับเลือดคัดกรอง',
    pancreas: 'ไม่มี',
    intestine: '⭐ หลัก >90%',
  },
  {
    label: 'ตัวควบคุม',
    mouth: 'ประสาทอัตโนมัติ',
    stomach: 'Gastrin / HCl',
    liver: 'CCK บีบถุงน้ำดี',
    pancreas: 'Secretin / CCK',
    intestine: 'Enterokinase',
  },
];

/* Bite-sized ❌ Myth vs ✅ Truth cards for exam prep */
const QUICK_MYTHS = [
  { wrong: 'น้ำดีสร้างจากถุงน้ำดีและเป็นเอนไซม์', right: 'ตับสร้างน้ำดี (ถุงน้ำดีแค่เก็บ) และไม่ใช่เอนไซม์! แค่ตีไขมันเป็นหยดเล็ก' },
  { wrong: 'ในปากย่อยเคมีได้ทั้งแป้งและโปรตีน', right: 'ในปากย่อยเคมีเฉพาะ "แป้ง → มอลโทส" ด้วยอะไมเลส! โปรตีนเริ่มที่กระเพาะ' },
  { wrong: 'อาหารไหลเข้าไปในตับและตับอ่อน', right: 'อาหารไม่เคยเข้าตับ/ตับอ่อน! ทั้งคู่ส่งน้ำดีและน้ำย่อยผ่านท่อลงลำไส้เล็ก' },
  { wrong: 'เพปซินย่อยโปรตีนได้กรดอะมิโน', right: 'เพปซินย่อยได้แค่สายสั้น ต้องรอ Dipeptidase ในลำไส้เล็กปิดจ๊อบ' },
  { wrong: 'ไขมันดูดซึมเข้าเส้นเลือดฝอย', right: 'ไขมัน + วิตามิน A,D,E,K เข้า "หลอดน้ำเหลือง (Lacteal)" ในวิลไล' },
  { wrong: 'จำ 3 น้ำตาลสลับกันประจำ', right: 'มอลโทส=กลู+กลู | ซูโครส=กลู+ฟรัก | แล็กโทส=กลู+กาแล็ก' },
];

/* Ultra-short 1-line journey headlines (7 stages, 5 linked to 3D AR cards) */
const JOURNEY_SHORT = [
  'เคี้ยว + Amylase เริ่มย่อยแป้ง → มอลโทส',
  'บีบคลื่น Peristalsis ส่งลงกระเพาะ',
  'กรด HCl + Pepsin ย่อยโปรตีน',
  'ตับสร้างน้ำดี เก็บที่ถุงน้ำดี ช่วยตีไขมัน',
  'ส่ง NaHCO₃ + เอนไซม์ 8 ชนิดครบ 4 หมู่',
  'ย่อยขั้นท้าย + ดูดซึม >90% ผ่านวิลไล',
  'ดูดน้ำกลับ + แบคทีเรียสร้างวิตามิน K',
];

const BADGE_DEFS = [
  { id: 'explorer', icon: '🔭', title: 'ครบ 5 อวัยวะ', desc: 'สำรวจครบทั้ง 5 อวัยวะ', check: (p) => p.discoveredOrgans.length >= ORGANS.length },
  { id: 'anatomist', icon: '📍', title: 'เจาะ 5 จุดชี้', desc: 'แตะดูป้ายชี้ 5 จุด', check: (p) => p.readAnnotations.length >= 5 },
  { id: 'memory', icon: '🧠', title: 'เซียนแฟลชการ์ด', desc: 'จำได้ 6+ ใบ', check: (p) => p.masteredFlashcards.length >= 6 },
  { id: 'matcher', icon: '⚡', title: 'แชมป์จับคู่', desc: 'เคลียร์เกม 6 คู่', check: (p) => Boolean(p.matchCleared) },
  { id: 'champion', icon: '🏆', title: 'ท็อปควิซ 80%+', desc: 'ทำควิซ ≥ 80%', check: (p) => p.bestQuizPct >= 80 },
];

/* Lightweight Canvas Confetti Engine */
function createConfettiEngine() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return { burst: () => {} };
  const ctx = canvas.getContext('2d');
  let particles = [];
  let running = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function frame() {
    if (!particles.length) {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 0.28;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      p.life -= 0.015;
      if (p.life <= 0 || p.y > canvas.height + 24) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }

  function burst(count = 55) {
    const colors = ['#f97316', '#fb7185', '#22c55e', '#fbbf24', '#f472b6', '#38bdf8', '#a78bfa', '#ffffff'];
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.42;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 8.5;
      particles.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.25,
        color: colors[i % colors.length],
        life: 1,
      });
    }
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }
  return { burst };
}

export function createLearningUI({
  onSelectOrgan,
  onFocusAnnotation,
  onToggleDigestionSim,
  onToast,
}) {
  const drawerEl = document.getElementById('learning-drawer');
  const tabBarEl = document.getElementById('learning-tabs');
  const contentEl = document.getElementById('learning-content');
  const discoveryPillEl = document.getElementById('discovery-count');
  const drawerOrganSwitcherEl = document.getElementById('drawer-organ-switcher');

  const confetti = createConfettiEngine();

  let progress = loadProgress();
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          discoveredOrgans: p.discoveredOrgans || [],
          readAnnotations: p.readAnnotations || [],
          masteredFlashcards: p.masteredFlashcards || [],
          bestQuizPct: p.bestQuizPct || 0,
          matchCleared: Boolean(p.matchCleared),
          bestMatchSeconds: p.bestMatchSeconds || null,
          unlockedBadges: p.unlockedBadges || [],
        };
      }
    } catch {}
    return {
      discoveredOrgans: [],
      readAnnotations: [],
      masteredFlashcards: [],
      bestQuizPct: 0,
      matchCleared: false,
      bestMatchSeconds: null,
      unlockedBadges: [],
    };
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {}
    if (discoveryPillEl) {
      discoveryPillEl.textContent = `${progress.discoveredOrgans.length}/${ORGANS.length}`;
    }
    checkBadges();
  }

  function checkBadges() {
    let newlyUnlocked = null;
    BADGE_DEFS.forEach((b) => {
      if (!progress.unlockedBadges.includes(b.id) && b.check(progress)) {
        progress.unlockedBadges.push(b.id);
        newlyUnlocked = b;
      }
    });
    if (newlyUnlocked) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch {}
      soundEngine.playAchievement();
      confetti.burst(70);
      onToast?.(`ปลดล็อกเหรียญตรา: ${newlyUnlocked.title}!`);
    }
  }

  // Interactive UI State
  let isOpen = false;
  let activeOrganIndex = 0;
  let activeTab = 'anatomy';
  let expandedAnnId = null;
  let enzymeFilter = 'all';
  let expandedEnzymeIdx = null;
  let expandedJourneyStep = null;
  let funFactIndex = 0;
  let expandedDiseaseIdx = null;

  // Simulator State
  let selectedFoodId = FOOD_PRESETS[0].id;
  let simRunning = false;
  let simRevealedSteps = 0;
  let simTimer = null;

  // Flashcard State
  let fcScope = 'all';
  let fcIndex = 0;
  let fcFlipped = false;

  // Match Game State
  let matchRoundPairs = [];
  let matchRightOrder = [];
  let matchSelectedLeft = null;
  let matchMatchedIds = new Set();
  let matchWrongFlash = null;
  let matchCombo = 0;
  let matchStartTime = 0;
  let matchElapsedSec = 0;
  let matchTimerInterval = null;
  let matchDone = false;

  // Quiz State
  let quizScope = 'all';
  let quizList = [];
  let quizIndex = 0;
  let quizScore = 0;
  let quizStreak = 0;
  let quizSelectedOption = null;
  let quizFinished = false;

  function getOrgan() {
    return ORGANS[activeOrganIndex] || ORGANS[0];
  }

  function markOrganDiscovered(organId) {
    if (!progress.discoveredOrgans.includes(organId)) {
      progress.discoveredOrgans.push(organId);
      saveProgress();
    } else if (discoveryPillEl) {
      discoveryPillEl.textContent = `${progress.discoveredOrgans.length}/${ORGANS.length}`;
    }
  }

  function markAnnotationRead(annotationId) {
    if (!progress.readAnnotations.includes(annotationId)) {
      progress.readAnnotations.push(annotationId);
      saveProgress();
    }
  }

  function setOrgan(index, { silent = false } = {}) {
    activeOrganIndex = index;
    expandedAnnId = null;
    expandedEnzymeIdx = null;
    expandedDiseaseIdx = null;
    funFactIndex = 0;
    const organ = getOrgan();
    markOrganDiscovered(organ.id);
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
    simRunning = false;
    simRevealedSteps = 0;
    if (fcScope === 'organ') {
      fcIndex = 0;
      fcFlipped = false;
    }
    if (quizScope === 'organ') {
      startNewQuiz('organ');
    }
    updateDrawerHeader();
    if (isOpen) renderActiveTab();
    if (!silent) soundEngine.playTab();
  }

  function open(tabId = null) {
    if (tabId) activeTab = tabId;
    isOpen = true;
    drawerEl.classList.remove('drawer-closed');
    drawerEl.classList.add('drawer-open');
    markOrganDiscovered(getOrgan().id);
    updateDrawerHeader();
    renderTabs();
    renderActiveTab();
  }

  function close() {
    isOpen = false;
    drawerEl.classList.remove('drawer-open');
    drawerEl.classList.add('drawer-closed');
    soundEngine.stopSpeech();
  }

  function toggle(tabId = null) {
    if (isOpen && (!tabId || tabId === activeTab)) {
      close();
    } else {
      open(tabId);
    }
  }

  function updateDrawerHeader() {
    if (!drawerOrganSwitcherEl) return;
    drawerOrganSwitcherEl.innerHTML = ORGANS.map((o) => {
      const active = o.index === activeOrganIndex;
      const foundMark = progress.discoveredOrgans.includes(o.id);
      return `
        <button
          type="button"
          data-switch-organ="${o.index}"
          class="px-3 py-1.5 rounded-full text-xs font-semibold transition border flex items-center gap-1.5 whitespace-nowrap ${
            active
              ? 'bg-white/15 border-white/40 text-white shadow'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          }"
          style="${active ? `border-color:${o.accentColor}; box-shadow: 0 0 12px ${o.accentColor}45;` : ''}"
        >
          <span>${o.icon}</span>
          <span>${o.name}</span>
          ${foundMark ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>` : ''}
        </button>
      `;
    }).join('');

    drawerOrganSwitcherEl.querySelectorAll('[data-switch-organ]').forEach((btn) => {
      btn.addEventListener('click', () => {
        onSelectOrgan?.(Number(btn.dataset.switchOrgan));
      });
    });
  }

  function renderTabs() {
    tabBarEl.innerHTML = TABS.map((t) => {
      const active = t.id === activeTab;
      return `
        <button
          type="button"
          data-tab="${t.id}"
          class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
            active
              ? 'text-white border-white/30'
              : 'bg-white/[0.04] border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
          }"
          style="${active ? 'background: rgba(var(--accent-rgb), 0.28); border-color: rgba(var(--accent-rgb), 0.75);' : ''}"
        >
          <span>${t.icon}</span>
          <span>${t.label}</span>
        </button>
      `;
    }).join('');

    tabBarEl.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        soundEngine.playTab();
        renderTabs();
        renderActiveTab();
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    });
  }

  function renderActiveTab() {
    contentEl.scrollTop = 0;
    switch (activeTab) {
      case 'anatomy':
        renderAnatomyTab();
        break;
      case 'enzymes':
        renderEnzymesTab();
        break;
      case 'simulator':
        renderSimulatorTab();
        break;
      case 'journey':
        renderJourneyTab();
        break;
      case 'compare':
        renderCompareTab();
        break;
      case 'clinical':
        renderClinicalTab();
        break;
      case 'flashcards':
        renderFlashcardsTab();
        break;
      case 'match':
        renderMatchGameTab();
        break;
      case 'quiz':
        renderQuizTab();
        break;
    }
  }

  /* ==================== TAB 1: ANATOMY (CLEAN BENTO + TAP TO PEEK) ==================== */
  function renderAnatomyTab() {
    const organ = getOrgan();
    const phPct = Math.max(5, Math.min(95, (organ.stats.phValue / 14) * 100));

    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <!-- Hero Banner + Listen Instead of Reading! -->
        <div class="stagger-item rounded-2xl p-4 border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-[11px] font-semibold uppercase tracking-wider" style="color:${organ.accentColor}">${organ.nameEn}</div>
            <h3 class="text-base font-bold text-white leading-snug mt-0.5">${organ.tagline}</h3>
          </div>
          <button id="btn-narrate-organ" type="button" class="shrink-0 px-3.5 py-2 rounded-2xl border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition hover:scale-[1.03]" style="background:rgba(${organ.accentRgb},0.28); border-color:rgba(${organ.accentRgb},0.6)">
            ${ICONS.speaker}
            <span id="narrate-label">${soundEngine.speaking ? 'หยุดฟัง' : 'ฟังสรุป'}</span>
          </button>
        </div>

        <!-- 3 Big Scannable KPI Bento Tiles -->
        <div class="stagger-item grid grid-cols-3 gap-2" style="animation-delay:0.04s">
          <div class="rounded-2xl p-3 bg-white/[0.05] border border-white/10 text-center">
            <div class="text-[10px] text-slate-400">ค่า pH</div>
            <div class="text-base font-extrabold text-white mt-0.5">${organ.stats.phValue}</div>
            <div class="text-[10px] truncate" style="color:${organ.accentColor}">${organ.stats.phDesc}</div>
          </div>
          <div class="rounded-2xl p-3 bg-white/[0.05] border border-white/10 text-center">
            <div class="text-[10px] text-slate-400">ขนาด</div>
            <div class="text-sm font-extrabold text-white mt-1 truncate">${organ.stats.capacity}</div>
            <div class="text-[10px] text-sky-300 truncate">${organ.stats.transitTime}</div>
          </div>
          <div class="rounded-2xl p-3 bg-white/[0.05] border border-white/10 text-center">
            <div class="text-[10px] text-slate-400">จุดเด่น</div>
            <div class="text-xs font-bold text-emerald-300 mt-1.5 leading-tight">${organ.stats.mainDigest}</div>
          </div>
        </div>

        <!-- Clean Visual pH Bar -->
        <div class="stagger-item rounded-2xl px-3.5 py-3 bg-white/[0.04] border border-white/10" style="animation-delay:0.07s">
          <div class="flex justify-between text-[11px] mb-2">
            <span class="text-slate-300 font-medium">สภาวะกรด – ด่าง</span>
            <span class="font-bold text-white">${organ.stats.phLabel}</span>
          </div>
          <div class="relative h-2.5 rounded-full ph-gradient">
            <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-950 shadow-lg" style="left:${phPct}%"></div>
          </div>
          <div class="flex justify-between text-[10px] text-slate-400 mt-1.5">
            <span>กรดแก่ (0)</span><span>กลาง (7)</span><span>ด่าง (14)</span>
          </div>
        </div>

        <!-- Interactive Anatomical Points (Compact Tap-to-Expand & Point 3D!) -->
        <div class="stagger-item space-y-2" style="animation-delay:0.1s">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-white">จุดสำคัญบนตัวอวัยวะ <span class="font-normal text-slate-400">(แตะเพื่อชี้ 3D)</span></h4>
            <span class="text-[10px] text-slate-400">${organ.annotations.length} จุด</span>
          </div>
          <div class="space-y-2">
            ${organ.annotations
              .map((a, idx) => {
                const open = expandedAnnId === a.id;
                const seen = progress.readAnnotations.includes(a.id);
                return `
                  <div class="rounded-2xl border transition overflow-hidden ${
                    open ? 'bg-white/[0.09] border-white/25' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
                  }">
                    <button type="button" data-toggle-ann="${a.id}" class="w-full p-3 flex items-center justify-between gap-2 text-left">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="w-6 h-6 shrink-0 rounded-full text-xs font-bold flex items-center justify-center text-slate-950" style="background:${organ.accentColor}">${idx + 1}</span>
                        <div class="min-w-0">
                          <div class="text-[13px] font-semibold text-white truncate">${a.title}</div>
                          <div class="text-[11px] text-slate-400 truncate">${a.badge}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        ${seen ? `<span class="w-2 h-2 rounded-full bg-emerald-400"></span>` : ''}
                        <span class="text-xs text-slate-400">${open ? '▴' : '▾'}</span>
                      </div>
                    </button>
                    ${
                      open
                        ? `
                        <div class="px-3.5 pb-3.5 pt-0.5 space-y-2 border-t border-white/10">
                          <p class="text-xs text-slate-200 leading-relaxed pt-2">${a.desc}</p>
                          ${a.fact ? `<div class="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/20 rounded-xl px-2.5 py-1.5">💡 ${a.fact}</div>` : ''}
                          <button type="button" data-pin3d="${a.id}" class="px-3 py-1 rounded-full text-[11px] font-semibold text-white" style="background:${organ.accentColor}">ชี้ตำแหน่งบนโมเดล 3D →</button>
                        </div>
                      `
                        : ''
                    }
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Collapsible Histology (Hidden by default so zero text clutter!) -->
        <details class="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden group">
          <summary class="px-3.5 py-3 text-xs font-semibold text-slate-200 cursor-pointer flex items-center justify-between list-none">
            <span>🔬 ดูโครงสร้างระดับเซลล์ / เนื้อเยื่อ (${organ.histology.length} ชั้น)</span>
            <span class="text-slate-400 group-open:rotate-180 transition">▾</span>
          </summary>
          <div class="px-3.5 pb-3.5 space-y-2 border-t border-white/10 pt-2.5">
            ${organ.histology
              .map(
                (h) => `
                <div class="rounded-xl p-2.5 bg-slate-950/60 border border-white/5">
                  <div class="text-xs font-bold" style="color:${organ.accentColor}">${h.layer}</div>
                  <p class="mt-1 text-[11px] text-slate-300 leading-relaxed">${h.detail}</p>
                </div>
              `
              )
              .join('')}
          </div>
        </details>
      </div>
    `;

    document.getElementById('btn-narrate-organ')?.addEventListener('click', () => {
      if (soundEngine.speaking) {
        soundEngine.stopSpeech();
      } else {
        soundEngine.speakThai(organ.narration);
      }
      const lbl = document.getElementById('narrate-label');
      if (lbl) lbl.textContent = soundEngine.speaking ? 'หยุดฟัง' : 'ฟังสรุป';
    });

    contentEl.querySelectorAll('[data-toggle-ann]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleAnn;
        soundEngine.playClick();
        expandedAnnId = expandedAnnId === id ? null : id;
        if (expandedAnnId) {
          markAnnotationRead(id);
          const ann = organ.annotations.find((x) => x.id === id);
          if (ann && window.innerWidth >= 1024) onFocusAnnotation?.(organ.index, ann);
        }
        renderAnatomyTab();
      });
    });

    contentEl.querySelectorAll('[data-pin3d]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ann = organ.annotations.find((x) => x.id === btn.dataset.pin3d);
        if (ann) {
          soundEngine.playClick();
          markAnnotationRead(ann.id);
          onFocusAnnotation?.(organ.index, ann);
        }
      });
    });
  }

  /* ==================== TAB 2: ENZYMES (VISUAL EQUATION CHIPS — 1 SEC SCAN!) ==================== */
  function renderEnzymesTab() {
    const organ = getOrgan();
    const filtered = organ.enzymes.filter((e) => {
      if (enzymeFilter === 'all') return true;
      if (enzymeFilter === 'onCard') return e.onCard;
      if (enzymeFilter === 'activator') return e.category === 'activator' || e.category === 'hormone';
      return e.category === enzymeFilter;
    });

    const catAccent = {
      protein: '#fb7185',
      carb: '#38bdf8',
      lipid: '#fbbf24',
      nucleic: '#34d399',
      activator: '#a78bfa',
      hormone: '#e879f9',
    };

    contentEl.innerHTML = `
      <div class="space-y-3.5 pb-6">
        <!-- Quick Filter Chips -->
        <div class="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          ${ENZYME_FILTERS.map((f) => {
            const active = f.id === enzymeFilter;
            return `
              <button type="button" data-efilter="${f.id}" class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                active ? 'bg-white/20 border-white/40 text-white' : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
              }">${f.label}</button>
            `;
          }).join('')}
        </div>

        <!-- Visual Equation Cards (Tap any card to peek note!) -->
        ${
          filtered.length === 0
            ? `<div class="rounded-2xl p-6 text-center bg-white/[0.03] border border-white/10 text-xs text-slate-400">ไม่มีเอนไซม์กลุ่มนี้ใน${organ.name} — ลองแตะอวัยวะอื่นด้านบนได้เลย</div>`
            : `<div class="space-y-2.5">
                ${filtered
                  .map((e, i) => {
                    const col = catAccent[e.category] || organ.accentColor;
                    const isOpenCard = expandedEnzymeIdx === i;
                    return `
                      <button type="button" data-toggle-ez="${i}" class="stagger-item w-full text-left rounded-2xl p-3.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 transition space-y-2.5" style="animation-delay:${i * 0.03}s; border-left:3px solid ${col}">
                        <!-- Title Row -->
                        <div class="flex items-center justify-between gap-2">
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="text-sm font-bold text-white truncate">${e.nameTh}</span>
                            ${e.onCard ? `<span class="shrink-0 px-1.5 py-0.5 rounded-md bg-amber-400/20 text-[10px] font-bold text-amber-200">⭐ การ์ด</span>` : ''}
                          </div>
                          <span class="shrink-0 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-sky-200">pH ${e.ph}</span>
                        </div>

                        <!-- 1-Second Visual Arrow Formula -->
                        <div class="flex items-center gap-2 flex-wrap text-xs">
                          <span class="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-white/10 text-slate-200 font-medium">${e.substrate}</span>
                          <span class="font-extrabold text-sm" style="color:${col}">→</span>
                          <span class="px-2.5 py-1 rounded-xl font-bold text-white" style="background:${col}33; border:1px solid ${col}80">${e.product}</span>
                        </div>

                        <!-- Expandable Short Tip (Hidden by default!) -->
                        ${
                          isOpenCard
                            ? `
                            <div class="pt-2 border-t border-white/10 space-y-1 text-[11px] text-slate-300">
                              <div><b class="text-white">อังกฤษ:</b> ${e.nameEn} • <b class="text-white">แหล่ง:</b> ${e.source}</div>
                              <div><b class="text-white">ตัวกระตุ้น:</b> ${e.catalyst}</div>
                              <div class="text-amber-200/90 pt-0.5">💡 ${e.note}</div>
                            </div>
                          `
                            : `<div class="flex items-center justify-between text-[10px] text-slate-400">
                                <span>${e.nameEn}</span>
                                <span>แตะดูเพิ่ม ▾</span>
                              </div>`
                        }
                      </button>
                    `;
                  })
                  .join('')}
              </div>`
        }
      </div>
    `;

    contentEl.querySelectorAll('[data-efilter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        enzymeFilter = btn.dataset.efilter;
        expandedEnzymeIdx = null;
        soundEngine.playClick();
        renderEnzymesTab();
      });
    });

    contentEl.querySelectorAll('[data-toggle-ez]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.toggleEz);
        expandedEnzymeIdx = expandedEnzymeIdx === idx ? null : idx;
        soundEngine.playClick();
        renderEnzymesTab();
      });
    });
  }

  /* ==================== TAB 3: INTERACTIVE FOOD SIMULATOR (COMPACT VISUAL LAB) ==================== */
  function renderSimulatorTab() {
    const organ = getOrgan();
    const food = FOOD_PRESETS.find((f) => f.id === selectedFoodId) || FOOD_PRESETS[0];
    const simData = food.perOrgan[organ.id];

    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <!-- 4-Meal Quick Visual Picker -->
        <div class="grid grid-cols-4 gap-2">
          ${FOOD_PRESETS.map((f) => {
            const active = f.id === selectedFoodId;
            return `
              <button type="button" data-food="${f.id}" class="rounded-2xl p-2.5 border text-center transition ${
                active ? 'bg-white/15 border-white/40 scale-[1.03]' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
              }" style="${active ? `border-color:${organ.accentColor}; box-shadow:0 0 14px ${organ.accentColor}40;` : ''}">
                <div class="text-2xl leading-none">${f.emoji}</div>
                <div class="text-[11px] font-semibold text-white mt-1.5 truncate">${f.name.split(' ')[0]}</div>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Macro Bar + Organ Digestion Score -->
        <div class="rounded-2xl p-3.5 bg-white/[0.05] border border-white/10 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white">${food.emoji} ${food.name}</span>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/35 text-xs font-extrabold text-emerald-300">ย่อย ${simData.efficiency}%</span>
          </div>
          <div class="h-3 rounded-full overflow-hidden flex bg-slate-900">
            <div style="width:${food.macros.protein}%" class="bg-rose-400"></div>
            <div style="width:${food.macros.carb}%" class="bg-sky-400"></div>
            <div style="width:${food.macros.lipid}%" class="bg-amber-400"></div>
            <div style="width:${food.macros.nucleic}%" class="bg-emerald-400"></div>
          </div>
          <div class="flex justify-between text-[10px] text-slate-300">
            <span><b class="text-rose-300">โปรตีน</b> ${food.macros.protein}%</span>
            <span><b class="text-sky-300">คาร์บ</b> ${food.macros.carb}%</span>
            <span><b class="text-amber-300">ไขมัน</b> ${food.macros.lipid}%</span>
            <span><b class="text-emerald-300">DNA</b> ${food.macros.nucleic}%</span>
          </div>
        </div>

        <!-- Big Play Button -->
        <button id="btn-run-sim" type="button" class="w-full py-3 px-4 rounded-2xl font-bold text-xs text-white transition flex items-center justify-center gap-2 accent-glow" style="background:linear-gradient(120deg, ${organ.accentColor}, ${organ.secondaryColor})">
          ${ICONS.play}
          <span>${simRunning ? 'กำลังจำลองการย่อยบนโมเดล 3D...' : `จำลองการย่อยใน${organ.name}`}</span>
        </button>

        <!-- Visual Breakdown Arrow Strips -->
        <div class="space-y-2">
          ${simData.steps
            .map((step, idx) => {
              const shown = simRevealedSteps === 0 || idx < simRevealedSteps;
              return `
                <div class="rounded-2xl p-3 border transition-all duration-500 space-y-2 ${
                  shown ? 'bg-white/[0.05] border-white/15 opacity-100' : 'bg-slate-950/40 border-white/5 opacity-25'
                }">
                  <div class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-sky-200">${step.enzyme}</div>
                  <div class="flex items-center gap-2 flex-wrap text-xs">
                    <span class="px-2.5 py-1 rounded-xl bg-slate-950/80 text-slate-200">${step.from}</span>
                    <span class="font-extrabold" style="color:${step.color}">→</span>
                    <span class="${shown ? 'mol-product' : ''} px-2.5 py-1 rounded-xl font-bold text-white" style="background:${step.color}33; border:1px solid ${step.color}88">${step.to}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    contentEl.querySelectorAll('[data-food]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedFoodId = btn.dataset.food;
        simRunning = false;
        simRevealedSteps = 0;
        if (simTimer) clearInterval(simTimer);
        soundEngine.playClick();
        renderSimulatorTab();
      });
    });

    document.getElementById('btn-run-sim')?.addEventListener('click', () => {
      if (simTimer) clearInterval(simTimer);
      simRunning = true;
      simRevealedSteps = 1;
      onToggleDigestionSim?.(true);
      soundEngine.playDigestStep();
      renderSimulatorTab();

      const totalSteps = simData.steps.length;
      simTimer = setInterval(() => {
        simRevealedSteps++;
        soundEngine.playDigestStep();
        if (simRevealedSteps >= totalSteps) {
          clearInterval(simTimer);
          simTimer = null;
          simRunning = false;
          onToast?.(`จำลองการย่อย ${food.name} เสร็จสมบูรณ์!`);
        }
        renderSimulatorTab();
      }, 850);
    });
  }

  /* ==================== TAB 4: DIGESTIVE JOURNEY (COMPACT METRO STEPPER) ==================== */
  function renderJourneyTab() {
    const organ = getOrgan();
    contentEl.innerHTML = `
      <div class="space-y-3 pb-6">
        <div class="relative pl-6 space-y-2.5 before:content-[''] before:absolute before:left-[10px] before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-sky-400 before:via-rose-400 before:to-violet-400">
          ${DIGESTIVE_JOURNEY.map((j, i) => {
            const isCurrent = j.organIndex === organ.index;
            const has3D = j.organIndex !== null;
            const isExpanded = expandedJourneyStep === j.step;
            return `
              <div class="stagger-item relative rounded-2xl border transition overflow-hidden ${
                isCurrent ? 'bg-white/[0.11] border-white/35' : 'bg-white/[0.04] border-white/10'
              }" style="animation-delay:${i * 0.04}s; ${isCurrent ? `border-color:${organ.accentColor};` : ''}">
                <span class="absolute -left-[22px] top-3.5 w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center text-[9px] font-bold text-slate-950" style="background:${isCurrent ? organ.accentColor : has3D ? '#38bdf8' : '#64748b'}">${j.step}</span>

                <button type="button" data-jstep="${j.step}" class="w-full p-3 text-left flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-[13px] font-bold text-white truncate">${j.title.split(' (')[0]}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-sky-300 shrink-0">${j.ph}</span>
                    </div>
                    <div class="text-xs text-slate-300 mt-0.5 truncate">${JOURNEY_SHORT[i] || j.summary}</div>
                  </div>
                  ${
                    has3D && !isCurrent
                      ? `<span data-jump-organ="${j.organIndex}" class="shrink-0 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white">3D →</span>`
                      : `<span class="text-xs text-slate-400 shrink-0">${isExpanded ? '▴' : '▾'}</span>`
                  }
                </button>
                ${
                  isExpanded
                    ? `<div class="px-3 pb-3 pt-1 border-t border-white/10 text-xs text-slate-300 leading-relaxed">${j.summary}</div>`
                    : ''
                }
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    contentEl.querySelectorAll('[data-jump-organ]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectOrgan?.(Number(el.dataset.jumpOrgan));
      });
    });

    contentEl.querySelectorAll('[data-jstep]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = Number(btn.dataset.jstep);
        expandedJourneyStep = expandedJourneyStep === s ? null : s;
        soundEngine.playClick();
        renderJourneyTab();
      });
    });
  }

  /* ==================== TAB 5: COMPARISON MATRIX & ❌ vs ✅ MYTH BUSTERS ==================== */
  function renderCompareTab() {
    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <!-- Crisp Scannable 5-Organ Comparison Grid (Horizontal scroll w/ sticky row labels) -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-bold text-white">ตารางเทียบทั้ง 5 อวัยวะ</span>
            <span class="text-slate-400">เลื่อนซ้าย-ขวาได้ ↔</span>
          </div>
          <div class="rounded-2xl border border-white/15 overflow-x-auto custom-scroll bg-slate-950/70">
            <table class="w-full min-w-[500px] text-left border-collapse text-xs">
              <thead>
                <tr class="bg-white/[0.07] border-b border-white/10 text-[11px]">
                  <th class="sticky left-0 z-10 bg-slate-900/95 p-2.5 text-slate-400 font-medium border-r border-white/10 whitespace-nowrap">หัวข้อ</th>
                  <th class="p-2.5 text-orange-300 font-bold whitespace-nowrap">ปาก</th>
                  <th class="p-2.5 text-rose-300 font-bold whitespace-nowrap">กระเพาะ</th>
                  <th class="p-2.5 text-emerald-300 font-bold whitespace-nowrap">ตับ</th>
                  <th class="p-2.5 text-amber-300 font-bold whitespace-nowrap">ตับอ่อน</th>
                  <th class="p-2.5 text-pink-300 font-bold whitespace-nowrap">ลำไส้เล็ก</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/10 text-[11px]">
                ${QUICK_COMPARE.map(
                  (r) => `
                  <tr>
                    <td class="sticky left-0 z-10 bg-slate-950/95 p-2.5 font-semibold text-white whitespace-nowrap border-r border-white/10">${r.label}</td>
                    <td class="p-2.5 text-slate-200">${r.mouth}</td>
                    <td class="p-2.5 text-slate-200">${r.stomach}</td>
                    <td class="p-2.5 text-slate-200">${r.liver}</td>
                    <td class="p-2.5 text-slate-200">${r.pancreas}</td>
                    <td class="p-2.5 text-slate-200">${r.intestine}</td>
                  </tr>
                `
                ).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Instant-Read ❌ vs ✅ Exam Myth-Busters -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-amber-300">⚡ จุดหลอกข้อสอบ (อ่าน 5 วิจำได้เลย!)</h4>
          ${QUICK_MYTHS.map(
            (m, i) => `
            <div class="stagger-item rounded-2xl p-3 bg-white/[0.04] border border-white/10 space-y-1.5" style="animation-delay:${i * 0.04}s">
              <div class="text-xs text-rose-300 line-through opacity-80">✕ ${m.wrong}</div>
              <div class="text-xs font-semibold text-emerald-300">✓ ${m.right}</div>
            </div>
          `
          ).join('')}
        </div>
      </div>
    `;
  }

  /* ==================== TAB 6: HEALTH & STORY-STYLE FUN FACTS ==================== */
  function renderClinicalTab() {
    const organ = getOrgan();
    const facts = organ.funFacts;
    if (funFactIndex >= facts.length) funFactIndex = 0;

    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <!-- Story-Style Fun Fact Carousel (1 Punchy Fact at a Time!) -->
        <div class="rounded-2xl p-4 border space-y-3" style="background:linear-gradient(145deg, rgba(${organ.accentRgb},0.22), rgba(15,23,42,0.92)); border-color:rgba(${organ.accentRgb},0.45)">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-white">💡 รู้หรือไม่? (${funFactIndex + 1}/${facts.length})</span>
            <div class="flex items-center gap-1.5">
              <button id="fact-prev" type="button" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white flex items-center justify-center">←</button>
              <button id="fact-next" type="button" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white flex items-center justify-center">→</button>
            </div>
          </div>
          <p class="text-sm font-medium text-white leading-relaxed min-h-[60px]">${facts[funFactIndex]}</p>
          <div class="flex justify-center gap-1.5">
            ${facts
              .map(
                (_, idx) =>
                  `<span class="h-1.5 rounded-full transition-all ${idx === funFactIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}"></span>`
              )
              .join('')}
          </div>
        </div>

        <!-- Compact Tap-to-Expand Disease Cards -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-white">🩺 โรคใกล้ตัว (${organ.name}) <span class="font-normal text-slate-400">— แตะเพื่อดูอาการและวิธีดูแล</span></h4>
          ${organ.diseases
            .map((d, i) => {
              const open = expandedDiseaseIdx === i;
              return `
                <div class="rounded-2xl border overflow-hidden transition ${
                  open ? 'bg-white/[0.08] border-white/25' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
                }">
                  <button type="button" data-dis="${i}" class="w-full p-3.5 flex items-center justify-between gap-2 text-left">
                    <div class="min-w-0">
                      <div class="text-[13px] font-bold text-white truncate">${d.name}</div>
                      <span class="inline-block mt-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-[10px] font-medium text-rose-200">${d.severity}</span>
                    </div>
                    <span class="text-xs text-slate-400 shrink-0">${open ? '▴' : '▾'}</span>
                  </button>
                  ${
                    open
                      ? `
                      <div class="px-3.5 pb-3.5 pt-2 border-t border-white/10 space-y-2 text-xs">
                        <div class="text-slate-300"><b class="text-white">สาเหตุ:</b> ${d.cause}</div>
                        <div class="text-amber-200"><b class="text-amber-300">อาการ:</b> ${d.symptoms}</div>
                        <div class="rounded-xl p-2.5 bg-emerald-500/15 border border-emerald-400/25 text-emerald-200"><b>วิธีดูแล:</b> ${d.care}</div>
                      </div>
                    `
                      : ''
                  }
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    document.getElementById('fact-prev')?.addEventListener('click', () => {
      funFactIndex = (funFactIndex - 1 + facts.length) % facts.length;
      soundEngine.playClick();
      renderClinicalTab();
    });
    document.getElementById('fact-next')?.addEventListener('click', () => {
      funFactIndex = (funFactIndex + 1) % facts.length;
      soundEngine.playClick();
      renderClinicalTab();
    });
    contentEl.querySelectorAll('[data-dis]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.dis);
        expandedDiseaseIdx = expandedDiseaseIdx === idx ? null : idx;
        soundEngine.playClick();
        renderClinicalTab();
      });
    });
  }

  /* ==================== TAB 7: 3D FLIP FLASHCARDS ==================== */
  function renderFlashcardsTab() {
    const organ = getOrgan();
    const deck =
      fcScope === 'organ'
        ? FLASHCARDS.map((c, globalIdx) => ({ ...c, globalIdx })).filter((c) => c.organId === organ.id)
        : FLASHCARDS.map((c, globalIdx) => ({ ...c, globalIdx }));

    if (fcIndex >= deck.length) fcIndex = 0;
    const card = deck[fcIndex];
    const isMastered = progress.masteredFlashcards.includes(card.globalIdx);
    const masteredCount = deck.filter((c) => progress.masteredFlashcards.includes(c.globalIdx)).length;
    const pct = Math.round((masteredCount / Math.max(1, deck.length)) * 100);

    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs font-semibold text-slate-300">ใบที่ <b class="text-white">${fcIndex + 1}/${deck.length}</b> • จำได้ <b class="text-emerald-300">${pct}%</b></div>
          <div class="inline-flex rounded-full p-0.5 bg-white/5 border border-white/10 text-[11px]">
            <button type="button" data-fc-scope="all" class="px-2.5 py-1 rounded-full transition ${fcScope === 'all' ? 'bg-white/20 text-white' : 'text-slate-400'}">ทั้งหมด</button>
            <button type="button" data-fc-scope="organ" class="px-2.5 py-1 rounded-full transition ${fcScope === 'organ' ? 'bg-white/20 text-white' : 'text-slate-400'}">${organ.name}</button>
          </div>
        </div>

        <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500" style="width:${pct}%"></div>
        </div>

        <div class="flashcard-scene">
          <div id="fc-card-inner" class="flashcard-inner cursor-pointer ${fcFlipped ? 'is-flipped' : ''}">
            <div class="flashcard-face p-5 flex flex-col justify-between bg-gradient-to-br from-slate-800/95 to-slate-950/95 border border-white/20 shadow-2xl">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white">${card.tag}</span>
                <span class="text-[11px] ${isMastered ? 'text-emerald-300 font-semibold' : 'text-slate-400'}">${isMastered ? '✓ จำได้แล้ว' : 'แตะพลิก ↻'}</span>
              </div>
              <div class="text-center my-4">
                <div class="text-xl font-extrabold text-white leading-snug">${card.frontTitle}</div>
                <p class="mt-2 text-xs text-slate-300">${card.frontHint}</p>
              </div>
              <div class="text-center text-[11px] text-slate-400">แตะการ์ดเพื่อดูเฉลย</div>
            </div>

            <div class="flashcard-face flashcard-back p-5 flex flex-col justify-between border shadow-2xl" style="background:linear-gradient(155deg, rgba(${organ.accentRgb},0.28), rgba(15,23,42,0.96)); border-color:rgba(${organ.accentRgb},0.65)">
              <div class="rounded-xl px-3 py-2.5 bg-slate-950/85 border border-white/15 text-center text-xs font-bold text-amber-300">
                ${card.backFormula}
              </div>
              <p class="text-[13px] text-white leading-relaxed my-3 text-center">${card.backAnswer}</p>
              <div class="text-center text-[10px] text-white/60">${card.tag}</div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2">
          <button id="fc-prev" type="button" class="py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-slate-200">←</button>
          <button id="fc-review" type="button" class="py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-xs text-amber-200 font-semibold">ทวน ↻</button>
          <button id="fc-master" type="button" class="py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-xs text-emerald-200 font-bold">จำได้ ✓</button>
          <button id="fc-next" type="button" class="py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-slate-200">→</button>
        </div>
      </div>
    `;

    contentEl.querySelectorAll('[data-fc-scope]').forEach((b) => {
      b.addEventListener('click', () => {
        fcScope = b.dataset.fcScope;
        fcIndex = 0;
        fcFlipped = false;
        soundEngine.playClick();
        renderFlashcardsTab();
      });
    });
    document.getElementById('fc-card-inner')?.addEventListener('click', () => {
      fcFlipped = !fcFlipped;
      soundEngine.playFlip();
      document.getElementById('fc-card-inner')?.classList.toggle('is-flipped', fcFlipped);
    });
    document.getElementById('fc-prev')?.addEventListener('click', () => {
      fcIndex = (fcIndex - 1 + deck.length) % deck.length;
      fcFlipped = false;
      soundEngine.playClick();
      renderFlashcardsTab();
    });
    document.getElementById('fc-next')?.addEventListener('click', () => {
      fcIndex = (fcIndex + 1) % deck.length;
      fcFlipped = false;
      soundEngine.playClick();
      renderFlashcardsTab();
    });
    document.getElementById('fc-review')?.addEventListener('click', () => {
      progress.masteredFlashcards = progress.masteredFlashcards.filter((x) => x !== card.globalIdx);
      saveProgress();
      fcIndex = (fcIndex + 1) % deck.length;
      fcFlipped = false;
      soundEngine.playClick();
      renderFlashcardsTab();
    });
    document.getElementById('fc-master')?.addEventListener('click', () => {
      if (!progress.masteredFlashcards.includes(card.globalIdx)) {
        progress.masteredFlashcards.push(card.globalIdx);
        saveProgress();
      }
      soundEngine.playCorrect();
      fcIndex = (fcIndex + 1) % deck.length;
      fcFlipped = false;
      renderFlashcardsTab();
    });
  }

  /* ==================== TAB 8: ENZYME SPEED-MATCH GAME ==================== */
  function startNewMatchRound() {
    if (matchTimerInterval) clearInterval(matchTimerInterval);
    const shuffled = [...MATCH_GAME_PAIRS].sort(() => Math.random() - 0.5).slice(0, 6);
    matchRoundPairs = shuffled;
    matchRightOrder = [...shuffled].sort(() => Math.random() - 0.5);
    matchSelectedLeft = null;
    matchMatchedIds = new Set();
    matchWrongFlash = null;
    matchCombo = 0;
    matchDone = false;
    matchStartTime = performance.now();
    matchElapsedSec = 0;

    matchTimerInterval = setInterval(() => {
      if (!matchDone && isOpen && activeTab === 'match') {
        matchElapsedSec = ((performance.now() - matchStartTime) / 1000).toFixed(1);
        const timerEl = document.getElementById('match-timer');
        if (timerEl) timerEl.textContent = `${matchElapsedSec}s`;
      }
    }, 100);
  }

  function renderMatchGameTab() {
    if (!matchRoundPairs.length) startNewMatchRound();
    const organ = getOrgan();

    contentEl.innerHTML = `
      <div class="space-y-3.5 pb-6">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-2xl p-2.5 bg-white/[0.05] border border-white/10">
            <div class="text-[10px] text-slate-400">จับคู่แล้ว</div>
            <div class="text-base font-extrabold text-emerald-300">${matchMatchedIds.size}/6</div>
          </div>
          <div class="rounded-2xl p-2.5 bg-white/[0.05] border border-white/10">
            <div class="text-[10px] text-slate-400">เวลา</div>
            <div id="match-timer" class="text-base font-extrabold text-sky-300">${matchElapsedSec}s</div>
          </div>
          <button id="btn-match-reset" type="button" class="rounded-2xl p-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition">
            สุ่มใหม่ ↻
          </button>
        </div>

        ${
          matchDone
            ? `
            <div class="stagger-item rounded-2xl p-6 text-center bg-gradient-to-b from-emerald-500/20 to-slate-950/90 border border-emerald-400/40 space-y-3">
              <div class="text-4xl">🎉</div>
              <div class="text-lg font-extrabold text-white">ชนะใน ${matchElapsedSec} วินาที!</div>
              <div class="text-xs text-emerald-200">สถิติเร็วสุด: ${progress.bestMatchSeconds || matchElapsedSec}s</div>
              <button id="btn-match-play-again" type="button" class="px-5 py-2.5 rounded-full text-xs font-bold text-white accent-glow" style="background:${organ.accentColor}">เล่นรอบต่อไป ⚡</button>
            </div>
          `
            : `
            <div class="grid grid-cols-2 gap-2.5">
              <div class="space-y-2">
                ${matchRoundPairs
                  .map((p) => {
                    const matched = matchMatchedIds.has(p.id);
                    const selected = matchSelectedLeft === p.id;
                    return `
                      <button type="button" data-mleft="${p.id}" ${matched ? 'disabled' : ''} class="w-full text-left rounded-2xl p-3 border text-xs font-bold transition ${
                        matched
                          ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300 opacity-45 line-through'
                          : selected
                          ? 'bg-white/20 border-white text-white scale-[1.02]'
                          : 'bg-white/[0.05] border-white/10 text-white hover:bg-white/10'
                      }" style="${selected ? `border-color:${organ.accentColor}; box-shadow:0 0 14px ${organ.accentColor}55;` : ''}">
                        <span class="block text-[10px] text-slate-400 font-normal">${p.organ}</span>
                        ${p.left}
                      </button>
                    `;
                  })
                  .join('')}
              </div>

              <div class="space-y-2">
                ${matchRightOrder
                  .map((p) => {
                    const matched = matchMatchedIds.has(p.id);
                    const wrong = matchWrongFlash === p.id;
                    return `
                      <button type="button" data-mright="${p.id}" ${matched ? 'disabled' : ''} class="w-full text-left rounded-2xl p-3 border text-xs leading-snug transition ${
                        matched
                          ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300 opacity-45'
                          : wrong
                          ? 'bg-rose-500/30 border-rose-400 text-white'
                          : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/10'
                      }">
                        ${matched ? '✓ ' : ''}${p.right}
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          `
        }
      </div>
    `;

    document.getElementById('btn-match-reset')?.addEventListener('click', () => {
      soundEngine.playClick();
      startNewMatchRound();
      renderMatchGameTab();
    });
    document.getElementById('btn-match-play-again')?.addEventListener('click', () => {
      soundEngine.playClick();
      startNewMatchRound();
      renderMatchGameTab();
    });
    contentEl.querySelectorAll('[data-mleft]').forEach((btn) => {
      btn.addEventListener('click', () => {
        matchSelectedLeft = btn.dataset.mleft;
        matchWrongFlash = null;
        soundEngine.playClick();
        renderMatchGameTab();
      });
    });
    contentEl.querySelectorAll('[data-mright]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!matchSelectedLeft) {
          onToast?.('เลือกเอนไซม์ฝั่งซ้ายก่อนครับ');
          return;
        }
        const rightId = btn.dataset.mright;
        if (rightId === matchSelectedLeft) {
          matchMatchedIds.add(rightId);
          matchSelectedLeft = null;
          matchWrongFlash = null;
          matchCombo++;
          soundEngine.playCorrect();
          if (matchMatchedIds.size === matchRoundPairs.length) {
            matchDone = true;
            if (matchTimerInterval) clearInterval(matchTimerInterval);
            matchElapsedSec = Number(((performance.now() - matchStartTime) / 1000).toFixed(1));
            progress.matchCleared = true;
            if (!progress.bestMatchSeconds || matchElapsedSec < progress.bestMatchSeconds) {
              progress.bestMatchSeconds = matchElapsedSec;
            }
            saveProgress();
            soundEngine.playAchievement();
            confetti.burst(80);
          }
        } else {
          matchCombo = 0;
          matchWrongFlash = rightId;
          soundEngine.playWrong();
        }
        renderMatchGameTab();
      });
    });
  }

  /* ==================== TAB 9: QUIZ & BADGE SHELF ==================== */
  function startNewQuiz(scope = quizScope) {
    quizScope = scope;
    const organ = getOrgan();
    const pool =
      scope === 'organ'
        ? QUIZ_QUESTIONS.filter((q) => q.organId === organ.id || q.organId === 'all')
        : [...QUIZ_QUESTIONS];
    quizList = pool.sort(() => Math.random() - 0.5);
    quizIndex = 0;
    quizScore = 0;
    quizStreak = 0;
    quizSelectedOption = null;
    quizFinished = false;
  }

  function renderQuizTab() {
    if (!quizList.length) startNewQuiz(quizScope);
    const organ = getOrgan();

    const badgesHtml = `
      <div class="pt-3 border-t border-white/10 space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-white">🏅 เหรียญตรา (${progress.unlockedBadges.length}/${BADGE_DEFS.length})</span>
          <span class="text-[11px] text-slate-400">สูงสุด ${progress.bestQuizPct}%</span>
        </div>
        <div class="grid grid-cols-5 gap-1.5">
          ${BADGE_DEFS.map((b) => {
            const unlocked = progress.unlockedBadges.includes(b.id);
            return `
              <div title="${b.title}: ${b.desc}" class="rounded-xl p-2 border text-center transition ${
                unlocked ? 'bg-amber-500/15 border-amber-400/50' : 'bg-white/[0.03] border-white/10 opacity-45'
              }">
                <div class="text-lg ${unlocked ? '' : 'grayscale'}">${b.icon}</div>
                <div class="text-[9px] font-semibold text-white mt-0.5 leading-tight truncate">${b.title}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    if (quizFinished) {
      const pct = Math.round((quizScore / Math.max(1, quizList.length)) * 100);
      contentEl.innerHTML = `
        <div class="space-y-4 pb-6">
          <div class="stagger-item rounded-2xl p-6 text-center border border-white/20 bg-gradient-to-b from-white/10 to-slate-950/90 space-y-3">
            <div class="text-4xl">${pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '📚'}</div>
            <div class="text-3xl font-extrabold text-white">${quizScore} / ${quizList.length} <span class="text-base text-slate-300">(${pct}%)</span></div>
            <div class="flex justify-center gap-2 pt-1">
              <button id="btn-quiz-retry" type="button" class="px-5 py-2 rounded-full text-xs font-bold text-white accent-glow" style="background:${organ.accentColor}">เล่นใหม่ ↻</button>
              <button id="btn-quiz-goto-fc" type="button" class="px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white">ทวนแฟลชการ์ด</button>
            </div>
          </div>
          ${badgesHtml}
        </div>
      `;
      document.getElementById('btn-quiz-retry')?.addEventListener('click', () => {
        soundEngine.playClick();
        startNewQuiz(quizScope);
        renderQuizTab();
      });
      document.getElementById('btn-quiz-goto-fc')?.addEventListener('click', () => {
        activeTab = 'flashcards';
        soundEngine.playTab();
        renderTabs();
        renderActiveTab();
      });
      return;
    }

    const q = quizList[quizIndex];
    const answered = quizSelectedOption !== null;
    const progressPct = Math.round(((quizIndex + (answered ? 1 : 0)) / quizList.length) * 100);

    contentEl.innerHTML = `
      <div class="space-y-3.5 pb-6">
        <div class="flex items-center justify-between gap-2">
          <div class="inline-flex rounded-full p-0.5 bg-white/5 border border-white/10 text-[11px]">
            <button type="button" data-qscope="all" class="px-2.5 py-1 rounded-full transition ${quizScope === 'all' ? 'bg-white/20 text-white' : 'text-slate-400'}">รวมทั้งหมด</button>
            <button type="button" data-qscope="organ" class="px-2.5 py-1 rounded-full transition ${quizScope === 'organ' ? 'bg-white/20 text-white' : 'text-slate-400'}">${organ.name}</button>
          </div>
          <div class="flex items-center gap-2 text-xs">
            ${quizStreak >= 2 ? `<span class="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold">🔥x${quizStreak}</span>` : ''}
            <span class="font-bold text-emerald-300">${quizScore} คะแนน</span>
          </div>
        </div>

        <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-300" style="width:${progressPct}%; background:${organ.accentColor}"></div>
        </div>

        <div class="rounded-2xl p-4 bg-white/[0.06] border border-white/15">
          <div class="text-[10px] text-slate-400 mb-1">ข้อ ${quizIndex + 1}/${quizList.length} • ${q.difficulty}</div>
          <p class="text-[14px] font-bold text-white leading-snug">${q.question}</p>
        </div>

        <div class="space-y-2">
          ${q.options
            .map((opt, idx) => {
              let cls = 'bg-white/[0.04] border-white/10 text-slate-100 hover:bg-white/[0.1]';
              if (answered) {
                if (idx === q.answer) cls = 'bg-emerald-500/25 border-emerald-400 text-white';
                else if (idx === quizSelectedOption) cls = 'bg-rose-500/25 border-rose-400 text-rose-100';
                else cls = 'bg-white/[0.02] border-white/5 text-slate-400 opacity-50';
              }
              return `
                <button type="button" data-qopt="${idx}" ${answered ? 'disabled' : ''} class="w-full text-left rounded-2xl px-3.5 py-3 border text-[13px] transition flex items-center gap-2.5 ${cls}">
                  <span class="w-6 h-6 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">${String.fromCharCode(65 + idx)}</span>
                  <span class="leading-snug">${opt}</span>
                </button>
              `;
            })
            .join('')}
        </div>

        ${
          answered
            ? `
            <div class="stagger-item rounded-2xl p-3.5 border ${
              quizSelectedOption === q.answer
                ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-100'
                : 'bg-rose-500/15 border-rose-400/35 text-rose-100'
            } text-xs space-y-2.5">
              <div class="font-bold text-[13px]">${quizSelectedOption === q.answer ? '✅ ถูกต้อง!' : '❌ ยังไม่ถูก'}</div>
              <p class="leading-relaxed">${q.explanation}</p>
              <button id="btn-quiz-next" type="button" class="w-full py-2.5 rounded-xl font-bold text-white" style="background:${organ.accentColor}">
                ${quizIndex + 1 < quizList.length ? 'ข้อถัดไป →' : 'ดูคะแนนรวม 🏆'}
              </button>
            </div>
          `
            : ''
        }

        ${badgesHtml}
      </div>
    `;

    contentEl.querySelectorAll('[data-qscope]').forEach((b) => {
      b.addEventListener('click', () => {
        soundEngine.playClick();
        startNewQuiz(b.dataset.qscope);
        renderQuizTab();
      });
    });

    contentEl.querySelectorAll('[data-qopt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (quizSelectedOption !== null) return;
        const chosen = Number(btn.dataset.qopt);
        quizSelectedOption = chosen;
        if (chosen === q.answer) {
          quizScore++;
          quizStreak++;
          soundEngine.playCorrect();
          if (quizStreak >= 3) confetti.burst(35);
        } else {
          quizStreak = 0;
          soundEngine.playWrong();
        }
        renderQuizTab();
      });
    });

    document.getElementById('btn-quiz-next')?.addEventListener('click', () => {
      soundEngine.playClick();
      if (quizIndex + 1 < quizList.length) {
        quizIndex++;
        quizSelectedOption = null;
      } else {
        quizFinished = true;
        const pct = Math.round((quizScore / Math.max(1, quizList.length)) * 100);
        if (pct > progress.bestQuizPct) progress.bestQuizPct = pct;
        saveProgress();
        if (pct >= 70) {
          soundEngine.playAchievement();
          confetti.burst(80);
        }
      }
      renderQuizTab();
    });
  }

  if (discoveryPillEl) {
    discoveryPillEl.textContent = `${progress.discoveredOrgans.length}/${ORGANS.length}`;
  }

  return {
    open,
    close,
    toggle,
    setOrgan,
    markOrganDiscovered,
    markAnnotationRead,
    burstConfetti: () => confetti.burst(60),
    isOpen: () => isOpen,
  };
}
