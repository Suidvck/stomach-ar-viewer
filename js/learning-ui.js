import {
  ORGANS,
  FOOD_PRESETS,
  DIGESTIVE_JOURNEY,
  FLASHCARDS,
  QUIZ_QUESTIONS,
  COMPARISON_ROWS,
  EXAM_TRAPS,
  MATCH_GAME_PAIRS,
} from './organ-data.js';
import { ICONS } from './icons.js';
import { soundEngine } from './sound-engine.js';

/**
 * 9-Category Interactive Learning Hub + Speed-Match Game + Progress Badges + Confetti Engine
 */

const STORAGE_KEY = 'digestive_holo_progress_v1';

const TABS = [
  { id: 'anatomy', label: 'กายวิภาค', icon: ICONS.anatomy },
  { id: 'enzymes', label: 'เอนไซม์', icon: ICONS.enzymes },
  { id: 'simulator', label: 'จำลองย่อย', icon: ICONS.simulator },
  { id: 'journey', label: 'เส้นทางอาหาร', icon: ICONS.journey },
  { id: 'compare', label: 'เทียบ 3 อวัยวะ', icon: ICONS.compare },
  { id: 'clinical', label: 'โรค & เกร็ดน่ารู้', icon: ICONS.clinical },
  { id: 'flashcards', label: 'แฟลชการ์ด', icon: ICONS.flashcards },
  { id: 'match', label: 'เกมจับคู่', icon: ICONS.match },
  { id: 'quiz', label: 'ควิซ & เหรียญ', icon: ICONS.quiz },
];

const ENZYME_FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'onCard', label: '⭐ บนการ์ด' },
  { id: 'protein', label: 'โปรตีน' },
  { id: 'carb', label: 'คาร์บฯ' },
  { id: 'lipid', label: 'ไขมัน' },
  { id: 'nucleic', label: 'กรดนิวคลีอิก' },
  { id: 'activator', label: 'ตัวกระตุ้น/ฮอร์โมน' },
];

const BADGE_DEFS = [
  {
    id: 'explorer',
    icon: '🔭',
    title: 'นักสำรวจครบ 3 อวัยวะ',
    desc: 'ส่องหรือสำรวจครบทั้งกระเพาะ ตับอ่อน และลำไส้เล็ก',
    check: (p) => p.discoveredOrgans.length >= 3,
  },
  {
    id: 'anatomist',
    icon: '📍',
    title: 'ผู้เชี่ยวชาญจุดกายวิภาค',
    desc: 'แตะศึกษาป้ายชี้กายวิภาคอย่างน้อย 5 จุด',
    check: (p) => p.readAnnotations.length >= 5,
  },
  {
    id: 'memory',
    icon: '🧠',
    title: 'เจ้าแห่งเอนไซม์ (Flashcard)',
    desc: 'กด "จำได้แล้ว" ในแฟลชการ์ดอย่างน้อย 6 ใบ',
    check: (p) => p.masteredFlashcards.length >= 6,
  },
  {
    id: 'champion',
    icon: '🏆',
    title: 'เซียนระบบย่อยอาหาร',
    desc: 'ทำคะแนนควิซได้ตั้งแต่ 80% ขึ้นไป',
    check: (p) => p.bestQuizPct >= 80,
  },
  {
    id: 'matcher',
    icon: '🎮',
    title: 'แชมป์จับคู่เอนไซม์',
    desc: 'เคลียร์มินิเกมจับคู่เอนไซม์ครบ 6 คู่ในรอบเดียว',
    check: (p) => Boolean(p.matchCleared),
  },
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
      p.life -= 0.014;
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
    const colors = ['#fb7185', '#fbbf24', '#f472b6', '#38bdf8', '#34d399', '#a78bfa', '#ffffff'];
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
  const organBadgeEl = document.getElementById('drawer-organ-pill');
  const discoveryPillEl = document.getElementById('discovery-count');
  const drawerOrganSwitcherEl = document.getElementById('drawer-organ-switcher');

  const confetti = createConfettiEngine();

  // Persistent Progress State
  let progress = loadProgress();
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          discoveredOrgans: parsed.discoveredOrgans || [],
          readAnnotations: parsed.readAnnotations || [],
          masteredFlashcards: parsed.masteredFlashcards || [],
          bestQuizPct: parsed.bestQuizPct || 0,
          matchCleared: Boolean(parsed.matchCleared),
          bestMatchSeconds: parsed.bestMatchSeconds || null,
          unlockedBadges: parsed.unlockedBadges || [],
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
      discoveryPillEl.textContent = `${progress.discoveredOrgans.length}/3`;
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
      confetti.burst(75);
      onToast?.(`🏅 ปลดล็อกเหรียญตรา: ${newlyUnlocked.title}!`);
    }
  }

  // UI Local State
  let isOpen = false;
  let activeOrganIndex = 0;
  let activeTab = 'anatomy';
  let enzymeFilter = 'all';

  // Digestion Simulator State
  let selectedFoodId = FOOD_PRESETS[0].id;
  let simRunning = false;
  let simRevealedSteps = 0;
  let simTimer = null;

  // Flashcard State
  let fcScope = 'all'; // 'all' | 'organ'
  let fcIndex = 0;
  let fcFlipped = false;

  // Quiz State
  let quizScope = 'all'; // 'all' | 'organ'
  let quizList = [];
  let quizIndex = 0;
  let quizScore = 0;
  let quizStreak = 0;
  let quizSelectedOption = null;
  let quizFinished = false;

  // Enzyme Speed-Match Game State
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

  function getOrgan() {
    return ORGANS[activeOrganIndex] || ORGANS[0];
  }

  function markOrganDiscovered(organId) {
    if (!progress.discoveredOrgans.includes(organId)) {
      progress.discoveredOrgans.push(organId);
      saveProgress();
    } else if (discoveryPillEl) {
      discoveryPillEl.textContent = `${progress.discoveredOrgans.length}/3`;
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
    const organ = getOrgan();
    if (organBadgeEl) {
      organBadgeEl.innerHTML = `<span class="text-base">${organ.icon}</span><span>${organ.name}</span><span class="text-[11px] font-normal text-slate-300/80">${organ.nameEn}</span>`;
    }
    if (drawerOrganSwitcherEl) {
      drawerOrganSwitcherEl.innerHTML = ORGANS.map((o) => {
        const active = o.index === activeOrganIndex;
        const foundMark = progress.discoveredOrgans.includes(o.id) ? '✓' : '';
        return `
          <button
            type="button"
            data-switch-organ="${o.index}"
            class="px-2.5 py-1 rounded-full text-[11px] font-medium transition border flex items-center gap-1 whitespace-nowrap ${
              active
                ? 'bg-white/15 border-white/40 text-white shadow'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }"
            style="${active ? `border-color:${o.accentColor}; box-shadow: 0 0 12px ${o.accentColor}55;` : ''}"
          >
            <span>${o.icon}</span>
            <span>${o.name}</span>
            ${foundMark ? `<span class="text-[9px] text-emerald-300">${foundMark}</span>` : ''}
          </button>
        `;
      }).join('');

      drawerOrganSwitcherEl.querySelectorAll('[data-switch-organ]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.switchOrgan);
          onSelectOrgan?.(idx);
        });
      });
    }
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
              ? 'text-white border-white/30 accent-glow'
              : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
          }"
          style="${active ? 'background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.38), rgba(var(--accent-rgb), 0.16)); border-color: rgba(var(--accent-rgb), 0.7);' : ''}"
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

  /* ==================== TAB 1: ANATOMY & HISTOLOGY ==================== */
  function renderAnatomyTab() {
    const organ = getOrgan();
    const phPct = Math.max(4, Math.min(96, (organ.stats.phValue / 14) * 100));

    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <!-- Hero Overview + Audio Narrator -->
        <div class="stagger-item rounded-2xl p-4 border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02]">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-[11px] font-medium uppercase tracking-wider" style="color:${organ.accentColor}">${organ.nameEn} • Bio-Profile</div>
              <h3 class="text-base font-bold text-white mt-0.5">${organ.tagline}</h3>
            </div>
            <button id="btn-narrate-organ" type="button" class="shrink-0 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-medium text-white flex items-center gap-1.5 transition">
              <span id="narrate-icon">🔊</span>
              <span id="narrate-label">${soundEngine.speaking ? 'หยุดฟัง' : 'ฟังบรรยาย'}</span>
            </button>
          </div>
          <p class="mt-2.5 text-xs text-slate-300 leading-relaxed">${organ.overview}</p>
        </div>

        <!-- 4 Key Physiological Stats -->
        <div class="stagger-item grid grid-cols-2 gap-2.5" style="animation-delay:0.05s">
          <div class="rounded-xl p-3 bg-white/[0.04] border border-white/10">
            <div class="text-[10px] text-slate-400">สภาวะความเป็นกรด-ด่าง</div>
            <div class="text-sm font-bold text-white mt-0.5">${organ.stats.phLabel}</div>
            <div class="text-[10px] mt-0.5" style="color:${organ.accentColor}">${organ.stats.phDesc}</div>
          </div>
          <div class="rounded-xl p-3 bg-white/[0.04] border border-white/10">
            <div class="text-[10px] text-slate-400">ระยะเวลา / ปริมาณ</div>
            <div class="text-sm font-bold text-white mt-0.5">${organ.stats.transitTime}</div>
            <div class="text-[10px] text-sky-300 mt-0.5">ขนาด: ${organ.stats.capacity}</div>
          </div>
          <div class="col-span-2 rounded-xl p-3 bg-white/[0.04] border border-white/10">
            <div class="flex items-center justify-between text-[10px] text-slate-300 mb-1.5">
              <span>มาตรวัดค่า pH (กรด 0 — เป็นกลาง 7 — ด่าง 14)</span>
              <span class="font-semibold text-white">pH ~${organ.stats.phValue}</span>
            </div>
            <div class="relative h-3 rounded-full ph-gradient shadow-inner">
              <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-950 shadow-lg transition-all duration-700" style="left:${phPct}%"></div>
            </div>
            <div class="flex justify-between text-[9px] text-slate-400 mt-1">
              <span>0 กรดแก่</span>
              <span>7 เป็นกลาง</span>
              <span>14 ด่างแก่</span>
            </div>
          </div>
        </div>

        <!-- Interactive Anatomical Parts (Syncs with 3D Model!) -->
        <div class="stagger-item space-y-2" style="animation-delay:0.1s">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>📍</span> โครงสร้างกายวิภาค (แตะเพื่อชี้จุดบนโมเดล 3D)
            </h4>
            <span class="text-[10px] text-slate-400">${organ.annotations.length} จุด</span>
          </div>
          ${organ.annotations
            .map((a, idx) => {
              const seen = progress.readAnnotations.includes(a.id);
              return `
                <button type="button" data-focus-ann="${a.id}" class="w-full text-left rounded-xl p-3 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/25 transition group">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-slate-950" style="background:${organ.accentColor}">${idx + 1}</span>
                      <div>
                        <div class="text-xs font-semibold text-white group-hover:text-rose-200 transition">${a.title}</div>
                        <div class="text-[10px] text-slate-400">${a.subtitle}</div>
                      </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] border ${
                      seen
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }">${seen ? '✓ อ่านแล้ว' : a.badge}</span>
                  </div>
                  <p class="mt-2 text-[11px] text-slate-300 leading-relaxed">${a.desc}</p>
                  ${a.fact ? `<div class="mt-1.5 text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-400/20 rounded-lg px-2.5 py-1">💡 ${a.fact}</div>` : ''}
                </button>
              `;
            })
            .join('')}
        </div>

        <!-- Microscopic Histology Layers -->
        <div class="stagger-item space-y-2" style="animation-delay:0.15s">
          <h4 class="text-xs font-semibold text-white flex items-center gap-1.5">
            <span>🧬</span> โครงสร้างเนื้อเยื่อระดับจุลภาค (Histology)
          </h4>
          ${organ.histology
            .map(
              (h) => `
              <div class="rounded-xl p-3 bg-slate-900/60 border border-white/10">
                <div class="text-xs font-semibold" style="color:${organ.accentColor}">${h.layer}</div>
                <p class="mt-1 text-[11px] text-slate-300 leading-relaxed">${h.detail}</p>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `;

    // Bind narration button
    const btnNarrate = document.getElementById('btn-narrate-organ');
    btnNarrate?.addEventListener('click', () => {
      if (soundEngine.speaking) {
        soundEngine.stopSpeech();
      } else {
        soundEngine.speakThai(organ.narration);
      }
      const lbl = document.getElementById('narrate-label');
      if (lbl) lbl.textContent = soundEngine.speaking ? 'หยุดฟัง' : 'ฟังบรรยาย';
    });

    // Bind 3D focus clicks
    contentEl.querySelectorAll('[data-focus-ann]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ann = organ.annotations.find((x) => x.id === btn.dataset.focusAnn);
        if (ann) {
          soundEngine.playClick();
          markAnnotationRead(ann.id);
          onFocusAnnotation?.(organ.index, ann);
          renderAnatomyTab();
        }
      });
    });
  }

  /* ==================== TAB 2: ENZYMES & BIOCHEMISTRY ==================== */
  function renderEnzymesTab() {
    const organ = getOrgan();
    const filtered = organ.enzymes.filter((e) => {
      if (enzymeFilter === 'all') return true;
      if (enzymeFilter === 'onCard') return e.onCard;
      if (enzymeFilter === 'activator') return e.category === 'activator' || e.category === 'hormone';
      return e.category === enzymeFilter;
    });

    const catColor = {
      protein: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
      carb: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
      lipid: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      nucleic: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      activator: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
      hormone: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30',
    };

    contentEl.innerHTML = `
      <div class="space-y-3.5 pb-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-white">คลังเอนไซม์และปฏิกิริยาเคมี</h3>
            <p class="text-[11px] text-slate-400">ครบทุกเอนไซม์บนการ์ด ${organ.name} + ข้อมูลเสริมหลักสูตร ม.ปลาย</p>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white">${filtered.length} รายการ</span>
        </div>

        <!-- Filter Chips -->
        <div class="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          ${ENZYME_FILTERS.map((f) => {
            const active = f.id === enzymeFilter;
            return `
              <button type="button" data-efilter="${f.id}" class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                active
                  ? 'bg-white/20 border-white/40 text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }">${f.label}</button>
            `;
          }).join('')}
        </div>

        <!-- Enzyme Reaction Cards -->
        ${
          filtered.length === 0
            ? `<div class="rounded-2xl p-6 text-center bg-white/[0.03] border border-white/10 text-xs text-slate-400">ไม่พบเอนไซม์หมวดนี้ใน${organ.name} ลองเลือก "ทั้งหมด" หรือสลับไปดูอวัยวะอื่นด้านบน</div>`
            : filtered
                .map(
                  (e, i) => `
                  <div class="stagger-item rounded-2xl p-3.5 bg-white/[0.04] border border-white/10 space-y-2.5" style="animation-delay:${i * 0.04}s">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="text-sm font-bold text-white">${e.nameTh}</span>
                          ${
                            e.onCard
                              ? `<span class="px-1.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/40 text-[9px] font-semibold text-amber-200">⭐ บนการ์ด AR</span>`
                              : ''
                          }
                        </div>
                        <div class="text-[11px] text-slate-400">${e.nameEn} • ${e.source}</div>
                      </div>
                      <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] border ${catColor[e.category] || 'bg-white/10 text-slate-200 border-white/15'}">${e.categoryLabel}</span>
                    </div>

                    <!-- Reaction Equation Box -->
                    <div class="rounded-xl p-2.5 bg-slate-950/80 border border-white/10 space-y-1.5">
                      <div class="flex items-center gap-2 text-[11px] flex-wrap">
                        <span class="px-2 py-0.5 rounded-lg bg-white/10 text-slate-100 font-medium">${e.substrate}</span>
                        <span class="text-slate-400 font-bold">━━▶</span>
                        <span class="px-2 py-0.5 rounded-lg font-semibold text-white" style="background:rgba(${organ.accentRgb},0.28); border:1px solid rgba(${organ.accentRgb},0.5)">${e.product}</span>
                      </div>
                      <div class="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>ตัวเร่ง: <span class="text-slate-200">${e.catalyst}</span></span>
                        <span class="px-1.5 py-0.5 rounded bg-white/5 text-sky-300">pH ${e.ph}</span>
                      </div>
                    </div>

                    <p class="text-[11px] text-slate-300 leading-relaxed">📌 ${e.note}</p>
                  </div>
                `
                )
                .join('')
        }
      </div>
    `;

    contentEl.querySelectorAll('[data-efilter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        enzymeFilter = btn.dataset.efilter;
        soundEngine.playClick();
        renderEnzymesTab();
      });
    });
  }

  /* ==================== TAB 3: INTERACTIVE FOOD DIGESTION SIMULATOR ==================== */
  function renderSimulatorTab() {
    const organ = getOrgan();
    const food = FOOD_PRESETS.find((f) => f.id === selectedFoodId) || FOOD_PRESETS[0];
    const simData = food.perOrgan[organ.id];

    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <div>
          <h3 class="text-sm font-bold text-white">ห้องทดลองจำลองการย่อยอาหารแบบอินเทอร์แอกทีฟ</h3>
          <p class="text-[11px] text-slate-400">เลือกเมนูอาหารแล้วกดจำลอง เพื่อดูการแตกตัวของโมเลกุลพร้อมแอนิเมชัน 3D บนตัว${organ.name}!</p>
        </div>

        <!-- Food Menu Picker -->
        <div class="grid grid-cols-2 gap-2">
          ${FOOD_PRESETS.map((f) => {
            const active = f.id === selectedFoodId;
            return `
              <button type="button" data-food="${f.id}" class="text-left rounded-xl p-2.5 border transition ${
                active
                  ? 'bg-white/15 border-white/40 shadow-lg'
                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
              }" style="${active ? `border-color:${organ.accentColor}; box-shadow:0 0 15px ${organ.accentColor}40;` : ''}">
                <div class="text-xl">${f.emoji}</div>
                <div class="text-xs font-semibold text-white mt-1">${f.name}</div>
                <div class="text-[10px] text-slate-400 line-clamp-1">${f.summary}</div>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Macro Nutrient Composition Bar -->
        <div class="rounded-xl p-3 bg-white/[0.04] border border-white/10 space-y-2">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-medium text-white">สัดส่วนสารอาหารใน ${food.emoji} ${food.name}</span>
            <span class="text-slate-400">ประสิทธิภาพการย่อยที่${organ.name}: <b class="text-emerald-300">${simData.efficiency}%</b></span>
          </div>
          <div class="h-2.5 rounded-full overflow-hidden flex bg-slate-900">
            <div style="width:${food.macros.protein}%" class="bg-rose-400" title="โปรตีน"></div>
            <div style="width:${food.macros.carb}%" class="bg-sky-400" title="คาร์โบไฮเดรต"></div>
            <div style="width:${food.macros.lipid}%" class="bg-amber-400" title="ไขมัน"></div>
            <div style="width:${food.macros.nucleic}%" class="bg-emerald-400" title="กรดนิวคลีอิก"></div>
          </div>
          <div class="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300">
            <span><i class="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1"></i>โปรตีน ${food.macros.protein}%</span>
            <span><i class="inline-block w-2 h-2 rounded-full bg-sky-400 mr-1"></i>คาร์บฯ ${food.macros.carb}%</span>
            <span><i class="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></i>ไขมัน ${food.macros.lipid}%</span>
            <span><i class="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1"></i>DNA/RNA ${food.macros.nucleic}%</span>
          </div>
        </div>

        <!-- Run Simulation Action Button -->
        <button id="btn-run-sim" type="button" class="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white transition flex items-center justify-center gap-2 accent-glow shimmer-btn" style="background-image:linear-gradient(120deg, ${organ.accentColor}, ${organ.secondaryColor}, ${organ.accentColor})">
          <span>${simRunning ? '⚡ กำลังจำลองปฏิกิริยาและปล่อยอนุภาค 3D...' : '▶ เริ่มจำลองการย่อย + เปิดอนุภาคไหลบนโมเดล 3D'}</span>
        </button>

        <!-- Enzymes Deployed Pills -->
        <div class="space-y-1.5">
          <div class="text-[11px] font-medium text-slate-300">เอนไซม์ / สารที่ถูกปล่อยออกมาทำงาน:</div>
          <div class="flex flex-wrap gap-1.5">
            ${simData.enzymesUsed
              .map(
                (ez) =>
                  `<span class="mol-pill px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 border border-white/15 text-white">${ez}</span>`
              )
              .join('')}
          </div>
        </div>

        <!-- Step-by-Step Molecular Breakdown Display -->
        <div class="space-y-2.5">
          ${simData.steps
            .map((step, idx) => {
              const shown = simRevealedSteps === 0 || idx < simRevealedSteps;
              return `
                <div class="rounded-xl p-3 border transition-all duration-500 ${
                  shown
                    ? 'bg-slate-900/80 border-white/15 opacity-100 translate-y-0'
                    : 'bg-slate-950/40 border-white/5 opacity-30 translate-y-2'
                }">
                  <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <span>ปฏิกิริยาขั้นที่ ${idx + 1}</span>
                    <span class="font-medium text-white px-2 py-0.5 rounded-full bg-white/10">${step.enzyme}</span>
                  </div>
                  <div class="flex items-center gap-2 flex-wrap text-xs">
                    <span class="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200">${step.from}</span>
                    <span class="font-bold" style="color:${step.color}">━━▶</span>
                    <span class="${shown ? 'mol-product' : ''} px-2.5 py-1 rounded-lg font-semibold text-white" style="background:${step.color}33; border:1px solid ${step.color}88">${step.to}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        <div class="rounded-xl p-3 bg-emerald-500/10 border border-emerald-400/25 text-xs text-emerald-100 leading-relaxed">
          🧪 <b>สรุปผลการทดลอง:</b> ${simData.explanation}
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
          onToast?.(`⚗️ จำลองการย่อย ${food.name} ใน${organ.name} เสร็จสมบูรณ์!`);
        }
        renderSimulatorTab();
      }, 900);
    });
  }

  /* ==================== TAB 4: DIGESTIVE JOURNEY TIMELINE ==================== */
  function renderJourneyTab() {
    const organ = getOrgan();
    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <div>
          <h3 class="text-sm font-bold text-white">แผนที่เส้นทางระบบย่อยอาหาร (6 สถานี)</h3>
          <p class="text-[11px] text-slate-400">ติดตามการเดินทางของอาหารตั้งแต่วินาทีแรกที่เคี้ยวจนถึงการดูดซึมและขับถ่าย</p>
        </div>

        <div class="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-sky-400 before:via-rose-400 before:to-violet-400">
          ${DIGESTIVE_JOURNEY.map((j, i) => {
            const isCurrent = j.organIndex === organ.index;
            const has3D = j.organIndex !== null;
            return `
              <div class="stagger-item relative rounded-2xl p-3.5 border transition ${
                isCurrent
                  ? 'bg-white/[0.11] border-white/40 shadow-lg'
                  : 'bg-white/[0.03] border-white/10'
              }" style="animation-delay:${i * 0.05}s; ${isCurrent ? `border-color:${organ.accentColor}; box-shadow:0 0 18px ${organ.accentColor}38;` : ''}">
                <span class="absolute -left-[22px] top-4 w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold text-slate-950 ${
                  isCurrent ? 'scale-125' : ''
                }" style="background:${isCurrent ? organ.accentColor : has3D ? '#38bdf8' : '#64748b'}">${j.step}</span>

                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="text-xs font-bold text-white">${j.title}</div>
                    <div class="text-[10px] text-sky-300 mt-0.5">${j.ph}</div>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : has3D
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                      : 'bg-white/5 text-slate-400'
                  }">${isCurrent ? '★ กำลังดูอยู่' : j.badge}</span>
                </div>

                <p class="mt-2 text-[11px] text-slate-300 leading-relaxed">${j.summary}</p>

                ${
                  has3D && !isCurrent
                    ? `<button type="button" data-jump-organ="${j.organIndex}" class="mt-2.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white transition">ดูโมเดล 3D สถานีนี้ →</button>`
                    : ''
                }
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    contentEl.querySelectorAll('[data-jump-organ]').forEach((btn) => {
      btn.addEventListener('click', () => {
        onSelectOrgan?.(Number(btn.dataset.jumpOrgan));
      });
    });
  }

  /* ==================== TAB 5 (NEW): COMPARISON MATRIX & EXAM CHEAT-SHEET ==================== */
  function renderCompareTab() {
    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <div>
          <h3 class="text-sm font-bold text-white">📊 ตารางเปรียบเทียบ 3 อวัยวะหลัก (สรุปจบหน้าเดียว)</h3>
          <p class="text-[11px] text-slate-400">เทียบค่า pH เอนไซม์ การดูดซึม และฮอร์โมนของกระเพาะ ตับอ่อน และลำไส้เล็ก</p>
        </div>

        <div class="rounded-2xl border border-white/15 overflow-hidden bg-slate-950/75">
          <div class="overflow-x-auto custom-scroll">
            <table class="w-full text-left border-collapse text-[11px] min-w-[410px]">
              <thead>
                <tr class="bg-white/[0.07] border-b border-white/10">
                  <th class="p-2.5 text-slate-300 font-semibold w-24">ประเด็น</th>
                  <th class="p-2.5 text-rose-300 font-bold"><span class="inline-flex items-center gap-1">${ICONS.stomach} กระเพาะ</span></th>
                  <th class="p-2.5 text-amber-300 font-bold"><span class="inline-flex items-center gap-1">${ICONS.pancreas} ตับอ่อน</span></th>
                  <th class="p-2.5 text-pink-300 font-bold"><span class="inline-flex items-center gap-1">${ICONS.intestine} ลำไส้เล็ก</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/10">
                ${COMPARISON_ROWS.map(
                  (row) => `
                  <tr class="hover:bg-white/[0.03] transition">
                    <td class="p-2.5 font-semibold text-white align-top">${row.aspect}</td>
                    <td class="p-2.5 text-slate-300 align-top leading-relaxed">${row.stomach}</td>
                    <td class="p-2.5 text-slate-300 align-top leading-relaxed">${row.pancreas}</td>
                    <td class="p-2.5 text-slate-300 align-top leading-relaxed">${row.intestine}</td>
                  </tr>
                `
                ).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Exam Turbo Cheat-Sheet / Traps -->
        <div class="space-y-2 pt-1">
          <h4 class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>⚠️</span> 6 จุดหลอกที่ข้อสอบชีววิทยาชอบออก! (Exam Cheat-Sheet)
          </h4>
          ${EXAM_TRAPS.map(
            (trap, i) => `
            <div class="stagger-item rounded-xl p-3 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-400/20 space-y-1" style="animation-delay:${i * 0.04}s">
              <div class="text-xs font-bold text-amber-200">${i + 1}. ${trap.title}</div>
              <p class="text-[11px] text-slate-300 leading-relaxed">${trap.detail}</p>
            </div>
          `
          ).join('')}
        </div>
      </div>
    `;
  }

  /* ==================== TAB 8 (NEW): ENZYME SPEED-MATCH MINI-GAME ==================== */
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
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold text-white">🎮 เกมจับคู่เอนไซม์จับเวลา (Speed-Match)</h3>
            <p class="text-[11px] text-slate-400">แตะเลือกเอนไซม์ฝั่งซ้าย แล้วจับคู่กับปฏิกิริยาฝั่งขวาให้ครบ 6 คู่!</p>
          </div>
          <button id="btn-match-reset" type="button" class="shrink-0 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white transition">สุ่มชุดใหม่ ↻</button>
        </div>

        <!-- Scoreboard -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-xl p-2 bg-white/[0.04] border border-white/10">
            <div class="text-[10px] text-slate-400">จับคู่แล้ว</div>
            <div class="text-sm font-bold text-emerald-300">${matchMatchedIds.size} / ${matchRoundPairs.length}</div>
          </div>
          <div class="rounded-xl p-2 bg-white/[0.04] border border-white/10">
            <div class="text-[10px] text-slate-400">เวลา</div>
            <div id="match-timer" class="text-sm font-bold text-sky-300">${matchElapsedSec}s</div>
          </div>
          <div class="rounded-xl p-2 bg-white/[0.04] border border-white/10">
            <div class="text-[10px] text-slate-400">สถิติเร็วสุด</div>
            <div class="text-sm font-bold text-amber-300">${progress.bestMatchSeconds ? progress.bestMatchSeconds + 's' : '—'}</div>
          </div>
        </div>

        ${
          matchDone
            ? `
            <div class="stagger-item rounded-2xl p-5 text-center bg-gradient-to-b from-emerald-500/20 to-slate-950/90 border border-emerald-400/40 space-y-2.5">
              <div class="text-3xl">🎉</div>
              <div class="text-base font-bold text-white">เคลียร์กระดานสำเร็จใน ${matchElapsedSec} วินาที!</div>
              <p class="text-xs text-emerald-200">คอมโบต่อเนื่องสูงสุด x${matchCombo} — แม่นเอนไซม์ครบทุกอวัยวะ!</p>
              <button id="btn-match-play-again" type="button" class="px-5 py-2 rounded-full text-xs font-bold text-white accent-glow" style="background:${organ.accentColor}">เล่นรอบถัดไป (สุ่มคู่ใหม่) ⚡</button>
            </div>
          `
            : `
            <div class="grid grid-cols-2 gap-2.5">
              <!-- Left Column: Enzymes -->
              <div class="space-y-2">
                <div class="text-[10px] font-semibold text-slate-400 uppercase text-center">เอนไซม์ / สาร</div>
                ${matchRoundPairs
                  .map((p) => {
                    const matched = matchMatchedIds.has(p.id);
                    const selected = matchSelectedLeft === p.id;
                    return `
                      <button type="button" data-mleft="${p.id}" ${matched ? 'disabled' : ''} class="w-full text-left rounded-xl p-2.5 border text-[11px] font-semibold transition ${
                        matched
                          ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300 opacity-55 line-through'
                          : selected
                          ? 'bg-white/20 border-white text-white shadow-lg scale-[1.02]'
                          : 'bg-white/[0.05] border-white/10 text-slate-100 hover:bg-white/10'
                      }" style="${selected ? `border-color:${organ.accentColor}; box-shadow:0 0 14px ${organ.accentColor}66;` : ''}">
                        <span class="block text-[9px] text-slate-400 font-normal">${p.organ}</span>
                        ${p.left}
                      </button>
                    `;
                  })
                  .join('')}
              </div>

              <!-- Right Column: Reactions -->
              <div class="space-y-2">
                <div class="text-[10px] font-semibold text-slate-400 uppercase text-center">ปฏิกิริยา / หน้าที่</div>
                ${matchRightOrder
                  .map((p) => {
                    const matched = matchMatchedIds.has(p.id);
                    const wrong = matchWrongFlash === p.id;
                    return `
                      <button type="button" data-mright="${p.id}" ${matched ? 'disabled' : ''} class="w-full text-left rounded-xl p-2.5 border text-[11px] leading-snug transition ${
                        matched
                          ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300 opacity-55'
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
          onToast?.('👆 กรุณาเลือกเอนไซม์ฝั่งซ้ายก่อนครับ');
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

  /* ==================== TAB 5: CLINICAL HEALTH & FUN FACTS ==================== */
  function renderClinicalTab() {
    const organ = getOrgan();
    contentEl.innerHTML = `
      <div class="space-y-4 pb-6">
        <!-- Clinical Diseases -->
        <div class="space-y-2.5">
          <div>
            <h3 class="text-sm font-bold text-white">🩺 โรคและภาวะผิดปกติเกี่ยวกับ${organ.name}</h3>
            <p class="text-[11px] text-slate-400">เชื่อมโยงความรู้ชีววิทยาสู่การดูแลสุขภาพจริงในชีวิตประจำวัน</p>
          </div>

          ${organ.diseases
            .map(
              (d, i) => `
              <div class="stagger-item rounded-2xl p-3.5 bg-white/[0.04] border border-white/10 space-y-2" style="animation-delay:${i * 0.05}s">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-bold text-white">${d.name}</div>
                  <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 border border-rose-400/30 text-rose-200">${d.severity}</span>
                </div>
                <div class="text-[11px] text-slate-300"><b class="text-slate-100">สาเหตุ:</b> ${d.cause}</div>
                <div class="text-[11px] text-slate-300"><b class="text-amber-300">อาการเด่น:</b> ${d.symptoms}</div>
                <div class="rounded-lg p-2 bg-emerald-500/10 border border-emerald-400/20 text-[11px] text-emerald-200">
                  <b>วิธีดูแลและป้องกัน:</b> ${d.care}
                </div>
              </div>
            `
            )
            .join('')}
        </div>

        <!-- Amazing Fun Facts -->
        <div class="space-y-2.5 pt-1">
          <h3 class="text-sm font-bold text-white">⚡ รู้หรือไม่? เกร็ดความรู้สุดทึ่ง</h3>
          ${organ.funFacts
            .map(
              (fact, i) => `
              <div class="stagger-item rounded-xl p-3 bg-gradient-to-r from-white/[0.06] to-transparent border-l-2 text-xs text-slate-200 leading-relaxed" style="border-color:${organ.accentColor}; animation-delay:${0.15 + i * 0.05}s">
                <span class="font-bold mr-1.5" style="color:${organ.accentColor}">#${i + 1}</span> ${fact}
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  /* ==================== TAB 6: 3D FLIP FLASHCARDS ==================== */
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
          <div>
            <h3 class="text-sm font-bold text-white">🃏 แฟลชการ์ด 3D ท่องจำเอนไซม์</h3>
            <p class="text-[11px] text-slate-400">แตะที่การ์ดเพื่อพลิกดูเฉลยและสมการ</p>
          </div>
          <div class="inline-flex rounded-full p-0.5 bg-white/5 border border-white/10 text-[11px]">
            <button type="button" data-fc-scope="all" class="px-2.5 py-1 rounded-full transition ${fcScope === 'all' ? 'bg-white/20 text-white' : 'text-slate-400'}">ทั้งหมด (${FLASHCARDS.length})</button>
            <button type="button" data-fc-scope="organ" class="px-2.5 py-1 rounded-full transition ${fcScope === 'organ' ? 'bg-white/20 text-white' : 'text-slate-400'}">${organ.name}</button>
          </div>
        </div>

        <!-- Mastery Progress Bar -->
        <div class="space-y-1">
          <div class="flex justify-between text-[11px] text-slate-300">
            <span>ใบที่ ${fcIndex + 1} / ${deck.length}</span>
            <span class="text-emerald-300 font-medium">จำได้แล้ว ${masteredCount}/${deck.length} (${pct}%)</span>
          </div>
          <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500" style="width:${pct}%"></div>
          </div>
        </div>

        <!-- 3D Flip Card -->
        <div class="flashcard-scene">
          <div id="fc-card-inner" class="flashcard-inner cursor-pointer ${fcFlipped ? 'is-flipped' : ''}">
            <!-- Front Face -->
            <div class="flashcard-face p-5 flex flex-col justify-between bg-gradient-to-br from-slate-800/95 to-slate-950/95 border border-white/20 shadow-2xl">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white">${card.tag}</span>
                <span class="text-[10px] ${isMastered ? 'text-emerald-300' : 'text-slate-400'}">${isMastered ? '✓ จำได้แล้ว' : 'แตะเพื่อพลิกดูคำตอบ ↻'}</span>
              </div>
              <div class="text-center my-4">
                <div class="text-lg font-bold text-white leading-snug">${card.frontTitle}</div>
                <p class="mt-2 text-xs text-slate-300">${card.frontHint}</p>
              </div>
              <div class="text-center text-[10px] text-slate-400">👆 แตะที่การ์ดเพื่อพลิก</div>
            </div>

            <!-- Back Face -->
            <div class="flashcard-face flashcard-back p-5 flex flex-col justify-between border shadow-2xl" style="background:linear-gradient(155deg, rgba(${organ.accentRgb},0.28), rgba(15,23,42,0.96)); border-color:rgba(${organ.accentRgb},0.65)">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-white/80">เฉลยคำตอบ</span>
                <span class="text-[10px] text-white/75">${card.tag}</span>
              </div>
              <p class="text-xs sm:text-sm text-white leading-relaxed my-2">${card.backAnswer}</p>
              <div class="rounded-xl px-3 py-2 bg-slate-950/80 border border-white/15 text-center text-[11px] font-semibold text-amber-300">
                ${card.backFormula}
              </div>
            </div>
          </div>
        </div>

        <!-- Flashcard Controls -->
        <div class="grid grid-cols-4 gap-2">
          <button id="fc-prev" type="button" class="py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-slate-200 transition">← ก่อนหน้า</button>
          <button id="fc-review" type="button" class="py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-xs text-amber-200 font-medium transition">ทวนอีกที ↻</button>
          <button id="fc-master" type="button" class="py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-xs text-emerald-200 font-semibold transition">จำได้แล้ว ✓</button>
          <button id="fc-next" type="button" class="py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-slate-200 transition">ถัดไป →</button>
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

  /* ==================== TAB 7: GAMIFIED QUIZ & MASTERY BADGES ==================== */
  function startNewQuiz(scope = quizScope) {
    quizScope = scope;
    const organ = getOrgan();
    const pool =
      scope === 'organ'
        ? QUIZ_QUESTIONS.filter((q) => q.organId === organ.id || q.organId === 'all')
        : [...QUIZ_QUESTIONS];
    // Deterministic-friendly shuffle
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
      <div class="pt-3 border-t border-white/10 space-y-2.5">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-white">🏅 สมุดสะสมเหรียญตรา (${progress.unlockedBadges.length}/${BADGE_DEFS.length})</h4>
          <span class="text-[10px] text-slate-400">สถิติสูงสุด: ${progress.bestQuizPct}%</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          ${BADGE_DEFS.map((b) => {
            const unlocked = progress.unlockedBadges.includes(b.id);
            return `
              <div class="rounded-xl p-2.5 border transition ${
                unlocked
                  ? 'bg-amber-500/15 border-amber-400/45 shadow'
                  : 'bg-white/[0.03] border-white/10 opacity-55'
              }">
                <div class="flex items-center gap-2">
                  <span class="text-lg ${unlocked ? '' : 'grayscale'}">${b.icon}</span>
                  <div class="text-[11px] font-semibold text-white leading-tight">${b.title}</div>
                </div>
                <p class="mt-1 text-[10px] text-slate-300 leading-snug">${b.desc}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    if (quizFinished) {
      const pct = Math.round((quizScore / Math.max(1, quizList.length)) * 100);
      const rank =
        pct >= 90
          ? '👑 ปรมาจารย์ระบบย่อยอาหาร'
          : pct >= 70
          ? '🧬 นักวิจัยชีวการแพทย์'
          : pct >= 50
          ? '🔬 นักสำรวจชีววิทยา'
          : '🌱 มือใหม่หัดย่อย (ลองทวนแฟลชการ์ดแล้วลุยใหม่!)';

      contentEl.innerHTML = `
        <div class="space-y-4 pb-6">
          <div class="stagger-item rounded-2xl p-5 text-center border border-white/20 bg-gradient-to-b from-white/10 to-slate-950/90 space-y-3">
            <div class="text-4xl">${pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '📚'}</div>
            <div class="text-xs uppercase tracking-wider text-amber-300 font-semibold">สรุปผลทดสอบ</div>
            <div class="text-3xl font-extrabold text-white">${quizScore} / ${quizList.length} <span class="text-base text-slate-300">(${pct}%)</span></div>
            <div class="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white">${rank}</div>
            <div class="pt-2 flex justify-center gap-2">
              <button id="btn-quiz-retry" type="button" class="px-4 py-2 rounded-full text-xs font-semibold text-white accent-glow" style="background:${organ.accentColor}">เล่นใหม่อีกครั้ง ↻</button>
              <button id="btn-quiz-goto-fc" type="button" class="px-4 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-white">ทบทวนแฟลชการ์ด</button>
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
        <!-- Scope & Score Header -->
        <div class="flex items-center justify-between gap-2">
          <div class="inline-flex rounded-full p-0.5 bg-white/5 border border-white/10 text-[11px]">
            <button type="button" data-qscope="all" class="px-2.5 py-1 rounded-full transition ${quizScope === 'all' ? 'bg-white/20 text-white' : 'text-slate-400'}">รวมทุกอวัยวะ</button>
            <button type="button" data-qscope="organ" class="px-2.5 py-1 rounded-full transition ${quizScope === 'organ' ? 'bg-white/20 text-white' : 'text-slate-400'}">${organ.name}</button>
          </div>
          <div class="flex items-center gap-2 text-xs">
            ${quizStreak >= 2 ? `<span class="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 font-bold">🔥 x${quizStreak}</span>` : ''}
            <span class="font-bold text-emerald-300">คะแนน: ${quizScore}</span>
          </div>
        </div>

        <!-- Question Progress -->
        <div class="space-y-1">
          <div class="flex justify-between text-[11px] text-slate-400">
            <span>ข้อที่ ${quizIndex + 1} จาก ${quizList.length}</span>
            <span class="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-slate-200">ระดับ: ${q.difficulty}</span>
          </div>
          <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-300" style="width:${progressPct}%; background:${organ.accentColor}"></div>
          </div>
        </div>

        <!-- Question Card -->
        <div class="rounded-2xl p-4 bg-white/[0.05] border border-white/15">
          <p class="text-sm font-semibold text-white leading-relaxed">${q.question}</p>
        </div>

        <!-- Options -->
        <div class="space-y-2">
          ${q.options
            .map((opt, idx) => {
              let cls = 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.1]';
              if (answered) {
                if (idx === q.answer) {
                  cls = 'bg-emerald-500/25 border-emerald-400 text-white shadow';
                } else if (idx === quizSelectedOption) {
                  cls = 'bg-rose-500/25 border-rose-400 text-rose-100';
                } else {
                  cls = 'bg-white/[0.02] border-white/5 text-slate-400 opacity-60';
                }
              }
              return `
                <button type="button" data-qopt="${idx}" ${answered ? 'disabled' : ''} class="w-full text-left rounded-xl px-3.5 py-2.5 border text-xs transition flex items-start gap-2.5 ${cls}">
                  <span class="w-5 h-5 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">${String.fromCharCode(65 + idx)}</span>
                  <span class="leading-relaxed">${opt}</span>
                </button>
              `;
            })
            .join('')}
        </div>

        <!-- Explanation + Next Button -->
        ${
          answered
            ? `
            <div class="stagger-item rounded-xl p-3 border ${
              quizSelectedOption === q.answer
                ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-100'
                : 'bg-rose-500/15 border-rose-400/35 text-rose-100'
            } text-xs leading-relaxed space-y-2">
              <div class="font-bold">${quizSelectedOption === q.answer ? '✅ ถูกต้องยอดเยี่ยม!' : '❌ ยังไม่ถูก — มาดูเฉลยกัน:'}</div>
              <p>${q.explanation}</p>
              <button id="btn-quiz-next" type="button" class="w-full py-2 rounded-xl font-semibold text-white transition" style="background:${organ.accentColor}">
                ${quizIndex + 1 < quizList.length ? 'ข้อถัดไป →' : 'ดูสรุปคะแนน 🏆'}
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
        if (pct > progress.bestQuizPct) {
          progress.bestQuizPct = pct;
        }
        saveProgress();
        if (pct >= 70) {
          soundEngine.playAchievement();
          confetti.burst(85);
        }
      }
      renderQuizTab();
    });
  }

  // Initial counter sync
  if (discoveryPillEl) {
    discoveryPillEl.textContent = `${progress.discoveredOrgans.length}/3`;
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
