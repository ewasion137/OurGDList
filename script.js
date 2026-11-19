const CREATORS = ["Miles_Fur", "banbondir", "Legendary", "ewasion", "tanker"];

const DEMON_ICONS = {
  M: "https://static.wikia.nocookie.net/geometry-dash-unofficial/images/d/d8/Medium_Demon.png/revision/latest?cb=20180707082309",
  H: "https://static.wikia.nocookie.net/geometry-dash-unofficial/images/4/48/Hard_Demon.png/revision/latest?cb=20180130191113",
  I: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Insane_Demon_Icon.webp?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original"
};

const DIFF_LABELS = {
  M: "Medium Demon",
  H: "Hard Demon",
  I: "Insane Demon"
};

function esc(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSorted(list) {
  return [...list].sort((a, b) => (b.points || 0) - (a.points || 0));
}

function getTier(rank) {
  if (rank <= 5) return "HELL";
  if (rank <= 10) return "GOLD";
  if (rank <= 15) return "SILVER";
  if (rank <= 20) return "BRONZE";
  return "ROCK";
}

function isVideoThumb(path) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(String(path || ""));
}

function formatAttempts(val) {
  if (val === null || val === undefined || val === "") return "";
  return typeof val === "number" ? val.toLocaleString("en-US") : String(val);
}

function idButtonHtml(id) {
  return `<button class="id-btn" type="button" data-copy="${esc(id)}">ID: ${esc(id)}</button>`;
}

/* =========================================================
   БУМАЖНЫЙ STOP-MOTION ДВИЖОК + КАРТОННЫЕ ПОПАПЫ
   ========================================================= */
(function initPaperCraftEngine() {
  // 1. SVG-фильтры для эффекта "помятости" текста на каждом кадре
  const seeds = [7, 23, 51, 89];
  const strongFilters = seeds.map((seed, i) => `
    <filter id="crumple-strong-${i}" x="-10%" y="-20%" width="120%" height="140%">
      <feTurbulence type="turbulence" baseFrequency="0.032 0.075" numOctaves="2" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${2.3 + (i % 2) * 0.9}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  `).join("");

  const softFilters = seeds.map((seed, i) => `
    <filter id="crumple-soft-${i}" x="-8%" y="-15%" width="116%" height="130%">
      <feTurbulence type="turbulence" baseFrequency="0.04 0.08" numOctaves="2" seed="${seed + 100}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${1.05 + (i % 2) * 0.35}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  `).join("");

  const svgHost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgHost.setAttribute("width", "0");
  svgHost.setAttribute("height", "0");
  svgHost.style.position = "absolute";
  svgHost.style.pointerEvents = "none";
  svgHost.innerHTML = `<defs>${strongFilters}${softFilters}</defs>`;
  document.body.prepend(svgHost);

  // 2. Фон из мятой бумаги (4 бесшовных кадра на canvas)
  const backdrop = document.createElement("div");
  backdrop.className = "paper-backdrop";
  const vignette = document.createElement("div");
  vignette.className = "paper-vignette";
  document.body.prepend(vignette);
  document.body.prepend(backdrop);

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateCrumpledPaperFrame(seed) {
    const size = 460;
    const grid = 8;
    const cell = size / grid;
    const rand = mulberry32(seed);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#eceef1";
    ctx.fillRect(0, 0, size, size);

    const ox = [];
    const oy = [];
    for (let y = 0; y < grid; y++) {
      ox[y] = [];
      oy[y] = [];
      for (let x = 0; x < grid; x++) {
        ox[y][x] = (rand() - 0.5) * cell * 0.72;
        oy[y][x] = (rand() - 0.5) * cell * 0.72;
      }
    }

    function pt(gx, gy) {
      const wx = ((gx % grid) + grid) % grid;
      const wy = ((gy % grid) + grid) % grid;
      return {
        x: gx * cell + ox[wy][wx],
        y: gy * cell + oy[wy][wx]
      };
    }

    function drawFacet(a, b, c, shadeShift) {
      const nx = (rand() - 0.5) * 2;
      const ny = (rand() - 0.5) * 2;
      const light = nx * -0.58 + ny * -0.72 + shadeShift;
      const base = Math.max(176, Math.min(254, Math.round(224 + light * 28)));
      const d1 = Math.max(168, Math.min(255, base - 10));
      const d2 = Math.max(175, Math.min(255, base + 12));

      const grad = ctx.createLinearGradient(a.x, a.y, c.x, c.y);
      grad.addColorStop(0, `rgb(${d1}, ${d1 + 1}, ${d1 + 3})`);
      grad.addColorStop(1, `rgb(${d2}, ${d2 + 1}, ${d2 + 2})`);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.lineWidth = 0.9;
      ctx.strokeStyle = rand() > 0.45 ? "rgba(70, 74, 84, 0.22)" : "rgba(255, 255, 255, 0.55)";
      ctx.stroke();
    }

    // Рисуем с перекрытием по краям для бесшовности
    for (let gy = -1; gy <= grid; gy++) {
      for (let gx = -1; gx <= grid; gx++) {
        const p00 = pt(gx, gy);
        const p10 = pt(gx + 1, gy);
        const p01 = pt(gx, gy + 1);
        const p11 = pt(gx + 1, gy + 1);
        const shift = (rand() - 0.5) * 0.25;
        if (rand() > 0.5) {
          drawFacet(p00, p10, p11, shift);
          drawFacet(p00, p11, p01, -shift);
        } else {
          drawFacet(p00, p10, p01, shift);
          drawFacet(p10, p11, p01, -shift);
        }
      }
    }

    // Мелкое зерно бумаги
    for (let i = 0; i < 1100; i++) {
      const rx = rand() * size;
      const ry = rand() * size;
      ctx.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.28)";
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }

    return canvas.toDataURL("image/png");
  }

  const paperFrames = [101, 313, 617, 941].map(generateCrumpledPaperFrame);
  backdrop.style.backgroundImage = `url("${paperFrames[0]}")`;

  // 3. Stop-Motion таймер (~4.3 FPS)
  const MOTION_KEY = "ewasion_paper_motion";
  let motionOn = localStorage.getItem(MOTION_KEY) !== "off";
  let frameIdx = 0;

  const toggleBtn = document.getElementById("motion-toggle");
  function syncMotionState() {
    if (motionOn) {
      document.documentElement.dataset.boil = String(frameIdx);
      backdrop.style.backgroundImage = `url("${paperFrames[frameIdx]}")`;
      if (toggleBtn) toggleBtn.textContent = "PAPER: 4 FPS";
    } else {
      document.documentElement.dataset.boil = "off";
      backdrop.style.backgroundImage = `url("${paperFrames[0]}")`;
      if (toggleBtn) toggleBtn.textContent = "PAPER: STATIC";
    }
  }

  syncMotionState();
  setInterval(() => {
    if (!motionOn) return;
    frameIdx = (frameIdx + 1) % 4;
    syncMotionState();
  }, 230);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      motionOn = !motionOn;
      localStorage.setItem(MOTION_KEY, motionOn ? "on" : "off");
      syncMotionState();
      showCardboardToast("Stop-Motion", motionOn ? "Мятая бумага включена (4 FPS)" : "Бумага зафиксирована");
    });
  }

  // 4. Контейнер для картонных тостов и картонного мини-попапа
  const toastStack = document.createElement("div");
  toastStack.className = "cb-toast-stack";
  document.body.appendChild(toastStack);

  const modalBackdrop = document.createElement("div");
  modalBackdrop.className = "cb-modal-backdrop";
  modalBackdrop.innerHTML = `
    <div class="cb-note-popup" role="dialog" aria-modal="true">
      <button type="button" class="cb-note-close" aria-label="Закрыть">&times;</button>
      <div class="cb-note-tag crumple-soft" id="cb-note-tag">GD NOTE</div>
      <div class="cb-note-title crumple-strong" id="cb-note-title">Заметка</div>
      <div class="cb-note-text crumple-soft" id="cb-note-text"></div>
      <div class="cb-note-grid" id="cb-note-grid"></div>
    </div>
  `;
  document.body.appendChild(modalBackdrop);

  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop || e.target.closest(".cb-note-close")) {
      modalBackdrop.classList.remove("open");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modalBackdrop.classList.remove("open");
  });

  window.showCardboardToast = function (title, body) {
    const toast = document.createElement("div");
    toast.className = "cb-toast";
    toast.innerHTML = `
      <div class="cb-toast-title crumple-soft">${esc(title)}</div>
      <div class="cb-toast-body crumple-soft">${esc(body)}</div>
    `;
    toastStack.appendChild(toast);
    while (toastStack.children.length > 3) {
      toastStack.firstElementChild.remove();
    }
    setTimeout(() => {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 220);
    }, 2400);
  };

  window.openCardboardNote = function ({ tag = "CARDBOARD NOTE", title, text = "", stats = [] }) {
    document.getElementById("cb-note-tag").textContent = tag;
    document.getElementById("cb-note-title").textContent = title;
    const textEl = document.getElementById("cb-note-text");
    textEl.textContent = text;
    textEl.style.display = text ? "block" : "none";

    const gridEl = document.getElementById("cb-note-grid");
    gridEl.innerHTML = stats.map((s) => `
      <div class="cb-note-stat">
        <span>${esc(s.label)}</span>
        <strong class="crumple-soft">${esc(s.value)}</strong>
      </div>
    `).join("");
    gridEl.style.display = stats.length ? "grid" : "none";

    modalBackdrop.classList.add("open");
  };
})();

const NOTE_PRESETS = {
  rules: {
    tag: "EWASION LIST // ПРАВИЛА",
    title: "Картонная памятка",
    text: "Кликай по ID уровня чтобы скопировать, нажимай на тиры (HELL/GOLD) или имена игроков, чтобы открыть картонные заметки!",
    stats: [
      { label: "Main Top", value: "0 - 1,000 pts" },
      { label: "Zoink Skill", value: "1K - 10K pts" },
      { label: "Impossible", value: "до 6000 TPS" },
      { label: "Rule 1 Skip", value: "5 раз подряд" }
    ]
  },
  leaderboard: {
    tag: "SCORE SYSTEM",
    title: "Как считаются баллы",
    text: "Main 100% даёт полные баллы. Если уровень ещё не верифицирован — лучший прогресс в Main и Zoink даёт % от баллов уровня.",
    stats: [
      { label: "Main Verify", value: "100% pts" },
      { label: "Zoink WR", value: "progress %" }
    ]
  },
  HELL: {
    tag: "TIER #1 - #5",
    title: "HELL TIER",
    text: "Пятёрка самых хардкорных уровней листа. Максимальный накал и самые жирные баллы.",
    stats: [{ label: "Позиции", value: "Top 1 - 5" }, { label: "Сложность", value: "Extreme" }]
  },
  GOLD: {
    tag: "TIER #6 - #10",
    title: "GOLD TIER",
    text: "Золотая пятёрка элитных уровней сразу за Hell-зоной.",
    stats: [{ label: "Позиции", value: "Top 6 - 10" }, { label: "Цвет", value: "GD Star" }]
  },
  SILVER: {
    tag: "TIER #11 - #15",
    title: "SILVER TIER",
    text: "Крепкие уровни середины топа.",
    stats: [{ label: "Позиции", value: "Top 11 - 15" }]
  },
  BRONZE: {
    tag: "TIER #16 - #20",
    title: "BRONZE TIER",
    text: "Отличная база для первых серьёзных поинтов в Main Top.",
    stats: [{ label: "Позиции", value: "Top 16 - 20" }]
  },
  ROCK: {
    tag: "TIER #21+",
    title: "ROCK TIER",
    text: "Нижняя часть Main Top — идеально для разминки или рулетки.",
    stats: [{ label: "Позиции", value: "Top 21+" }]
  },
  SKIP: {
    tag: "ПРАВИЛО 1",
    title: "Skip Allowed",
    text: "Длинное пустое начало можно скипать через Speedhack / Noclip / Startpos, если вы стабильно проходите его 5 раз подряд.",
    stats: [{ label: "Условие", value: "5x подряд" }, { label: "Noclip", value: "Выкл после секции" }]
  }
};

document.addEventListener("click", (e) => {
  const copyBtn = e.target.closest("[data-copy]");
  if (copyBtn) {
    const text = copyBtn.getAttribute("data-copy");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    copyBtn.textContent = "COPIED!";
    copyBtn.classList.add("copied");
    window.showCardboardToast("ID скопирован!", `Уровень ${text} в буфере`);
    setTimeout(() => {
      copyBtn.textContent = `ID: ${text}`;
      copyBtn.classList.remove("copied");
    }, 950);
    return;
  }

  const detBtn = e.target.closest("[data-details]");
  if (detBtn) {
    const card = detBtn.closest(".ill-card");
    if (!card) return;
    const isOpen = card.classList.toggle("open");
    detBtn.textContent = isOpen ? "Hide details \u25B4" : "Show details \u25BE";
    return;
  }

  const noteBtn = e.target.closest("[data-popup-note]");
  if (noteBtn) {
    const key = noteBtn.getAttribute("data-popup-note");
    if (NOTE_PRESETS[key]) window.openCardboardNote(NOTE_PRESETS[key]);
    return;
  }

  const playerTrigger = e.target.closest("[data-player-card]");
  if (playerTrigger && window._PLAYER_STATS) {
    const name = playerTrigger.getAttribute("data-player-card");
    const p = window._PLAYER_STATS[name];
    if (p) {
      window.openCardboardNote({
        tag: "GD PLAYER CARD",
        title: p.name,
        text: `Общий счёт в Ewasion List: ${(p.mainPts + p.zoinkPts).toLocaleString("en-US")} pts.`,
        stats: [
          { label: "Main Pts", value: p.mainPts.toLocaleString("en-US") },
          { label: "Zoink Pts", value: p.zoinkPts.toLocaleString("en-US") },
          { label: "Clears / Beaten", value: `${p.clears} / ${p.beaten}` },
          { label: "Created Levels", value: p.created }
        ]
      });
    }
    return;
  }

  const pillNote = e.target.closest("[data-note]");
  if (pillNote) {
    const key = pillNote.getAttribute("data-note");
    if (NOTE_PRESETS[key]) window.openCardboardNote(NOTE_PRESETS[key]);
  }
});

function initHome() {
  const tbody = document.getElementById("leaderboard-body");
  if (!tbody) return;

  const stats = {};
  CREATORS.forEach((name) => {
    stats[name] = { name, mainPts: 0, zoinkPts: 0, clears: 0, beaten: 0, created: 0 };
  });

  function ensurePlayer(name) {
    if (!name || name === "everyone") return null;
    if (!stats[name]) {
      stats[name] = { name, mainPts: 0, zoinkPts: 0, clears: 0, beaten: 0, created: 0 };
    }
    return stats[name];
  }

  (window.MAIN_LIST || []).forEach((lvl) => {
    const cr = ensurePlayer(lvl.creator);
    if (cr) cr.created += 1;

    const cleared = new Set();
    const isEveryone = lvl.verifier === "everyone" || (Array.isArray(lvl.victors) && lvl.victors.includes("everyone"));

    if (lvl.verifier && lvl.verifier !== "everyone") cleared.add(lvl.verifier);
    if (Array.isArray(lvl.victors)) {
      lvl.victors.forEach((v) => {
        if (v !== "everyone") cleared.add(v);
      });
    }
    if (isEveryone) {
      CREATORS.forEach((c) => cleared.add(c));
    }

    cleared.forEach((player) => {
      const p = ensurePlayer(player);
      if (p) {
        p.mainPts += lvl.points || 0;
        p.clears += 1;
      }
    });

    if (!lvl.verifier && lvl.best && lvl.best.player && !cleared.has(lvl.best.player)) {
      const p = ensurePlayer(lvl.best.player);
      if (p) {
        p.mainPts += Math.round((lvl.points || 0) * (lvl.best.percent / 100));
      }
    }
  });

  (window.ZOINK_LIST || []).forEach((lvl) => {
    const cr = ensurePlayer(lvl.creator);
    if (cr) cr.created += 1;
    if (lvl.best && lvl.best.player) {
      const p = ensurePlayer(lvl.best.player);
      if (p) {
        p.zoinkPts += Math.round((lvl.points || 0) * (lvl.best.percent / 100));
      }
    }
  });

  (window.IMPOS_LIST || []).forEach((lvl) => {
    const cr = ensurePlayer(lvl.creator);
    if (cr) cr.created += 1;
  });

  (window.BEATEN_LIST || []).forEach((lvl) => {
    if (!Array.isArray(lvl.victors)) return;
    const beaters = new Set();
    lvl.victors.forEach((v) => {
      if (v === "everyone") CREATORS.forEach((c) => beaters.add(c));
      else beaters.add(v);
    });
    beaters.forEach((v) => {
      const p = ensurePlayer(v);
      if (p) p.beaten += 1;
    });
  });

  window._PLAYER_STATS = stats;

  const rows = Object.values(stats)
    .map((p) => ({ ...p, total: p.mainPts + p.zoinkPts }))
    .sort((a, b) => b.total - a.total || b.clears - a.clears || b.beaten - a.beaten);

  tbody.innerHTML = rows.map((p, i) => `
    <tr data-player-card="${esc(p.name)}" title="Открыть карточку игрока">
      <td class="rank-cell crumple-soft">#${i + 1}</td>
      <td><strong class="crumple-soft">${esc(p.name)}</strong></td>
      <td class="pts-cell">${p.mainPts.toLocaleString("en-US")}</td>
      <td class="pts-cell">${p.zoinkPts.toLocaleString("en-US")}</td>
      <td class="pts-cell" style="color: #6d28d9;">${p.total.toLocaleString("en-US")}</td>
      <td>${p.clears}</td>
      <td>${p.beaten}</td>
      <td>${p.created}</td>
    </tr>
  `).join("");
}

function initListPage() {
  const view = document.getElementById("list-view");
  if (!view) return;

  const titleEl = document.getElementById("list-title");
  const subEl = document.getElementById("list-subtitle");
  const containerEl = document.getElementById("list-container");
  const searchEl = document.getElementById("search-box");
  const filtersEl = document.getElementById("tier-filters");
  const tabBtns = document.querySelectorAll("[data-tab]");
  const navLinks = document.querySelectorAll("[data-nav]");

  let activeTab = "main";
  let activeTier = "ALL";
  let query = "";

  const META = {
    main: { title: "Main Top", sub: "Баллы: 0 - 1,000. Верификация от 0-60%, длительность от 5 сек, до 14 CPS." },
    zoink: { title: "Zoink Skill Top", sub: "Баллы: 1,000 - 10,000. Без смены TPS, до 16 CPS, наличие макроса." },
    impossible: { title: "Impossible Top", sub: "Баллы: 10,000 - 100,000. Лимит до 6000 TPS и записанный макрос." },
    unfinished: { title: "Unfinished List", sub: "Уровни в разработке или на верификации. Баллы примерные (Estimated Points)." },
    beaten: { title: "Beaten by Us", sub: "Официальные демоны, пройденные участниками листа." }
  };

  function getTabFromHash() {
    const h = location.hash.replace("#", "").toLowerCase();
    return META[h] ? h : "main";
  }

  function renderFilters() {
    if (activeTab !== "main") {
      filtersEl.innerHTML = "";
      return;
    }
    const tiers = ["ALL", "HELL", "GOLD", "SILVER", "BRONZE", "ROCK"];
    filtersEl.innerHTML = tiers.map((t) =>
      `<button class="tab-btn ${activeTier === t ? "active" : ""}" data-tier="${t}">${t}</button>`
    ).join("");
  }

  function buildCardHtml(opts) {
    const { rank, name, creator, id, points, ptsText, tier, topClass, wrText, wrVerified, rightTop, tagsHtml, detailsHtml, thumb, hasThumb } = opts;
    const mediaSrc = thumb ? esc(encodeURI(thumb)) : "";
    const isVid = isVideoThumb(thumb);

    let bgLayer = "";
    if (hasThumb && thumb) {
      bgLayer = isVid
        ? `<video class="ill-bg-img" src="${mediaSrc}" autoplay loop muted playsinline preload="metadata" onerror="this.style.display='none'"></video><div class="ill-bg-overlay"></div>`
        : `<img class="ill-bg-img" src="${mediaSrc}" alt="" onerror="this.style.display='none'"><div class="ill-bg-overlay"></div>`;
    }

    let thumbLayer = "";
    if (hasThumb) {
      if (!thumb) {
        thumbLayer = `<div class="ill-thumb no-img"></div>`;
      } else if (isVid) {
        thumbLayer = `<div class="ill-thumb"><video src="${mediaSrc}" autoplay loop muted playsinline preload="metadata" onerror="this.parentElement.classList.add('no-img'); this.remove();"></video></div>`;
      } else {
        thumbLayer = `<div class="ill-thumb"><img src="${mediaSrc}" alt="${esc(name)}" onerror="this.parentElement.classList.add('no-img'); this.remove();"></div>`;
      }
    }

    const clipLink = isVid && thumb
      ? `<div class="detail-item"><span class="detail-label">Preview Clip</span><a href="${mediaSrc}" target="_blank">Open MP4</a></div>`
      : "";

    const idPill = id ? idButtonHtml(id) : `<span class="ill-pill">ID: TBA</span>`;
    const gdbBlock = id
      ? `<div class="detail-item"><span class="detail-label">GDBrowser</span><a href="https://gdbrowser.com/${esc(id)}" target="_blank" rel="noopener">gdbrowser.com/${esc(id)}</a></div>`
      : "";

    return `
      <article class="ill-card${hasThumb ? "" : " compact"}${tier ? ` tier-${tier}` : ""}${topClass ? ` ${topClass}` : ""}">
        <div class="ill-card-inner">
          ${bgLayer}
          <div class="ill-main">
            ${thumbLayer}
            <div class="ill-body">
              <div class="ill-title-row">
                <span class="ill-title crumple-strong">#${rank} ${esc(name)}</span>
                ${wrText ? `<span class="ill-wr-pill crumple-soft${wrVerified ? " verified" : ""}">${esc(wrText)}</span>` : ""}
              </div>
              <div class="ill-creator crumple-soft">by ${esc(creator)}</div>
              <div class="ill-tags">
                ${tagsHtml || ""}
                ${idPill}
              </div>
            </div>
            <div class="ill-right">
              <div>
                <div class="ill-stat-top crumple-strong">${esc(rightTop)}</div>
                <div class="ill-pts crumple-soft">${esc(ptsText || `${points.toLocaleString("en-US")} pts`)}</div>
              </div>
              <button class="details-btn" type="button" data-details>Show details \u25BE</button>
            </div>
          </div>
          <div class="ill-details">
            ${detailsHtml}
            ${clipLink}
            ${gdbBlock}
          </div>
        </div>
      </article>
    `;
  }

  function renderCards() {
    const meta = META[activeTab];
    titleEl.textContent = meta.title;
    subEl.textContent = meta.sub;

    tabBtns.forEach((b) => b.classList.toggle("active", b.dataset.tab === activeTab));
    navLinks.forEach((a) => a.classList.toggle("active", a.dataset.nav === activeTab));

    const q = query.trim().toLowerCase();

    if (activeTab === "main") {
      const rows = getSorted(window.MAIN_LIST || [])
        .map((lvl, idx) => ({ ...lvl, rank: idx + 1, tier: getTier(idx + 1) }))
        .filter((lvl) => {
          if (activeTier !== "ALL" && lvl.tier !== activeTier) return false;
          if (!q) return true;
          return [lvl.name, lvl.id, lvl.creator, lvl.verifier, ...(lvl.victors || [])].join(" ").toLowerCase().includes(q);
        });

      containerEl.innerHTML = rows.length ? rows.map((lvl) => {
        const hasThumb = lvl.rank <= 3;
        const wrText = lvl.verifier
          ? `Verified: ${lvl.verifier}`
          : (lvl.best ? `Best: ${lvl.best.percent}% (${lvl.best.player})` : "Unverified");
        const victorsText = Array.isArray(lvl.victors) && lvl.victors.length ? lvl.victors.join(", ") : "None";
        const attText = lvl.rank <= 5 ? formatAttempts(lvl.attempts) : "";
        const attHolder = lvl.verifier || (lvl.best && lvl.best.player) || "";

        const tags = [
          `<span class="ill-pill ill-pill-${lvl.tier} crumple-soft" data-note="${lvl.tier}" title="Кликни про тир">${lvl.tier}</span>`,
          lvl.skip ? `<span class="ill-pill ill-pill-skip crumple-soft" data-note="SKIP" title="Правило 1">Skip Allowed</span>` : "",
          attText ? `<span class="ill-pill ill-pill-att">Attempts: ${esc(attText)}</span>` : "",
          Array.isArray(lvl.victors) && lvl.victors.length ? `<span class="ill-pill">Victors: ${esc(victorsText)}</span>` : ""
        ].join("");

        const details = `
          <div class="detail-item"><span class="detail-label">Verifier</span><span>${esc(lvl.verifier || "Unverified")}</span></div>
          <div class="detail-item"><span class="detail-label">Victors</span><span>${esc(victorsText)}</span></div>
          ${attText ? `<div class="detail-item"><span class="detail-label">Verifier Attempts</span><span>${esc(attText)}${attHolder ? ` (${esc(attHolder)})` : ""}</span></div>` : ""}
          <div class="detail-item"><span class="detail-label">Rule 1 Skip</span><span>${lvl.skip ? "Allowed" : "No"}</span></div>
          ${lvl.video ? `<div class="detail-item"><span class="detail-label">Video</span><a href="${esc(lvl.video)}" target="_blank" rel="noopener">Watch</a></div>` : ""}
        `;

        return buildCardHtml({
          rank: lvl.rank,
          name: lvl.name,
          creator: lvl.creator,
          id: lvl.id,
          points: lvl.points || 0,
          tier: lvl.tier,
          topClass: lvl.rank === 1 ? "top-1" : "",
          wrText,
          wrVerified: Boolean(lvl.verifier),
          rightTop: lvl.verifier ? "VERIFIED" : (lvl.best ? `${lvl.best.percent}%` : "OPEN"),
          tagsHtml: tags,
          detailsHtml: details,
          thumb: lvl.thumb,
          hasThumb
        });
      }).join("") : `<div class="card">Ничего не найдено</div>`;
      return;
    }

    if (activeTab === "zoink") {
      const rows = getSorted(window.ZOINK_LIST || [])
        .map((lvl, idx) => ({ ...lvl, rank: idx + 1 }))
        .filter((lvl) => {
          if (!q) return true;
          return [lvl.name, lvl.id, lvl.creator, lvl.best ? lvl.best.player : ""].join(" ").toLowerCase().includes(q);
        });

      containerEl.innerHTML = rows.length ? rows.map((lvl) => {
        const hasThumb = lvl.rank <= 3;
        const wrText = lvl.best ? `WR: ${lvl.best.percent}% (${lvl.best.player})` : "No progress";
        const attText = lvl.rank <= 5 ? formatAttempts(lvl.attempts) : "";
        const attHolder = (lvl.best && lvl.best.player) || "";

        const tags = [
          `<span class="ill-pill">Standard TPS</span>`,
          `<span class="ill-pill">&le; 16 CPS</span>`,
          attText ? `<span class="ill-pill ill-pill-att">Attempts: ${esc(attText)}</span>` : "",
          lvl.skip ? `<span class="ill-pill ill-pill-skip crumple-soft" data-note="SKIP">Skip Allowed</span>` : ""
        ].join("");

        const details = `
          <div class="detail-item"><span class="detail-label">Best Run</span><span>${esc(wrText)}</span></div>
          ${attText ? `<div class="detail-item"><span class="detail-label">Attempts</span><span>${esc(attText)}${attHolder ? ` (${esc(attHolder)})` : ""}</span></div>` : ""}
          <div class="detail-item"><span class="detail-label">Rule 1 Skip</span><span>${lvl.skip ? "Allowed" : "No"}</span></div>
          ${lvl.video ? `<div class="detail-item"><span class="detail-label">Macro / Video</span><a href="${esc(lvl.video)}" target="_blank" rel="noopener">Watch</a></div>` : ""}
        `;

        return buildCardHtml({
          rank: lvl.rank,
          name: lvl.name,
          creator: lvl.creator,
          id: lvl.id,
          points: lvl.points || 0,
          topClass: lvl.rank === 1 ? "top-1 top-1-zoink" : "",
          wrText,
          wrVerified: false,
          rightTop: lvl.best ? `${lvl.best.percent}%` : "0%",
          tagsHtml: tags,
          detailsHtml: details,
          thumb: lvl.thumb,
          hasThumb
        });
      }).join("") : `<div class="card">Ничего не найдено</div>`;
      return;
    }

    if (activeTab === "impossible") {
      const rows = getSorted(window.IMPOS_LIST || [])
        .map((lvl, idx) => ({ ...lvl, rank: idx + 1 }))
        .filter((lvl) => {
          if (!q) return true;
          return [lvl.name, lvl.id, lvl.creator].join(" ").toLowerCase().includes(q);
        });

      containerEl.innerHTML = rows.length ? rows.map((lvl) => {
        const hasThumb = lvl.rank <= 3;
        const tpsText = lvl.tps ? `${lvl.tps} TPS` : "Macro";
        const tags = [
          `<span class="ill-pill">&le; 6000 TPS</span>`,
          `<span class="ill-pill">Macro Verified</span>`
        ].join("");

        const details = `
          <div class="detail-item"><span class="detail-label">TPS</span><span>${esc(tpsText)}</span></div>
          ${lvl.video ? `<div class="detail-item"><span class="detail-label">Macro</span><a href="${esc(lvl.video)}" target="_blank" rel="noopener">Watch</a></div>` : ""}
        `;

        return buildCardHtml({
          rank: lvl.rank,
          name: lvl.name,
          creator: lvl.creator,
          id: lvl.id,
          points: lvl.points || 0,
          topClass: lvl.rank === 1 ? "top-1 top-1-impos" : "",
          wrText: "Impossible List",
          wrVerified: false,
          rightTop: tpsText,
          tagsHtml: tags,
          detailsHtml: details,
          thumb: lvl.thumb,
          hasThumb
        });
      }).join("") : `<div class="card">Ничего не найдено</div>`;
      return;
    }

    if (activeTab === "unfinished") {
      const rows = getSorted(window.UNFINISHED_LIST || [])
        .map((lvl, idx) => ({ ...lvl, rank: idx + 1 }))
        .filter((lvl) => {
          if (!q) return true;
          return [lvl.name, lvl.id, lvl.creator, lvl.status, lvl.builder, lvl.verifier].join(" ").toLowerCase().includes(q);
        });

      containerEl.innerHTML = rows.length ? rows.map((lvl) => {
        const isVerifying = String(lvl.status || "").toLowerCase() === "verifying";
        const holder = isVerifying ? (lvl.verifier || lvl.creator) : (lvl.builder || lvl.creator);
        const wrText = isVerifying
          ? `Verifying: ${holder} (${lvl.percent || 0}%)`
          : `Building (${holder})`;
        const rightTop = isVerifying ? `${lvl.percent || 0}%` : "BUILDING";
        const attText = lvl.rank <= 5 ? formatAttempts(lvl.attempts) : "";

        const tags = [
          `<span class="ill-pill ${isVerifying ? "ill-pill-verifying" : "ill-pill-building"}">${esc(lvl.status || "Building")}</span>`,
          attText ? `<span class="ill-pill ill-pill-att">Attempts: ${esc(attText)}</span>` : "",
          `<span class="ill-pill">Unfinished</span>`
        ].join("");

        const details = `
          <div class="detail-item"><span class="detail-label">Stage</span><span>${esc(lvl.status || "Building")}</span></div>
          <div class="detail-item"><span class="detail-label">${isVerifying ? "Verifier" : "Builder"}</span><span>${esc(holder)}</span></div>
          ${isVerifying ? `<div class="detail-item"><span class="detail-label">Progress</span><span>${lvl.percent || 0}%</span></div>` : ""}
          ${attText ? `<div class="detail-item"><span class="detail-label">Verifier Attempts</span><span>${esc(attText)} (${esc(holder)})</span></div>` : ""}
          ${lvl.video ? `<div class="detail-item"><span class="detail-label">Preview</span><a href="${esc(lvl.video)}" target="_blank" rel="noopener">Watch</a></div>` : ""}
        `;

        return buildCardHtml({
          rank: lvl.rank,
          name: lvl.name,
          creator: lvl.creator,
          id: lvl.id || "",
          points: lvl.points || 0,
          ptsText: `~${(lvl.points || 0).toLocaleString("en-US")} est. pts`,
          topClass: lvl.rank === 1 ? "top-1 top-1-unfinished" : "",
          wrText,
          wrVerified: false,
          rightTop,
          tagsHtml: tags,
          detailsHtml: details,
          thumb: lvl.thumb,
          hasThumb: Boolean(lvl.thumb)
        });
      }).join("") : `<div class="card">Ничего не найдено</div>`;
      return;
    }

    const rows = (window.BEATEN_LIST || [])
      .map((lvl, idx) => ({ ...lvl, rank: idx + 1 }))
      .filter((lvl) => {
        if (!q) return true;
        return [lvl.name, lvl.id, DIFF_LABELS[lvl.diff] || "", ...(lvl.victors || [])].join(" ").toLowerCase().includes(q);
      });

    containerEl.innerHTML = rows.length ? rows.map((lvl) => {
      const attPills = lvl.attempts && typeof lvl.attempts === "object"
        ? Object.entries(lvl.attempts).map(([player, val]) => {
            const text = formatAttempts(val);
            const suffix = typeof val === "number" ? " att" : "";
            return `<span class="ill-pill ill-pill-att">${esc(player)}: ${esc(text)}${suffix}</span>`;
          }).join("")
        : "";

      return `
        <article class="ill-card compact">
          <div class="ill-card-inner">
            <div class="ill-main" style="align-items: center;">
              <div class="demon-slot">
                <img class="demon-icon" referrerpolicy="no-referrer" src="${esc(DEMON_ICONS[lvl.diff] || "")}" alt="${esc(DIFF_LABELS[lvl.diff] || lvl.diff)}" title="${esc(DIFF_LABELS[lvl.diff] || lvl.diff)}">
              </div>
              <div class="ill-body">
                <div class="ill-title-row">
                  <span class="ill-title crumple-strong">${esc(lvl.name)}</span>
                  <span class="ill-wr-pill verified crumple-soft">${esc(DIFF_LABELS[lvl.diff] || lvl.diff)}</span>
                </div>
                <div class="ill-creator crumple-soft">Beaten by: ${esc((lvl.victors || []).join(", "))}</div>
                ${attPills ? `<div class="ill-tags">${attPills}</div>` : ""}
              </div>
              <div class="ill-right">
                ${idButtonHtml(lvl.id)}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("") : `<div class="card">Ничего не найдено</div>`;
  }

  function switchTab(tab, showToast = false) {
    activeTab = tab;
    activeTier = "ALL";
    if (location.hash !== "#" + tab) history.replaceState(null, "", "#" + tab);
    renderFilters();
    renderCards();
    if (showToast && META[tab]) {
      window.showCardboardToast("Список переключён", META[tab].title);
    }
  }

  tabBtns.forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab, true)));
  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tier]");
    if (!btn) return;
    activeTier = btn.dataset.tier;
    renderFilters();
    renderCards();
  });
  searchEl.addEventListener("input", (e) => {
    query = e.target.value;
    renderCards();
  });
  window.addEventListener("hashchange", () => switchTab(getTabFromHash()));

  switchTab(getTabFromHash());
}

function initRoulette() {
  const view = document.getElementById("roulette-view");
  if (!view) return;

  const poolSel = document.getElementById("r-pool");
  const startBtn = document.getElementById("r-start");
  const stageEl = document.getElementById("r-stage");
  const logEl = document.getElementById("r-log");
  const scoreEl = document.getElementById("r-score");
  const STORAGE_KEY = "ewasion_roulette_v1";

  function buildPool(kind) {
    const main = getSorted(window.MAIN_LIST || []).map((l, i) => ({ ...l, source: `Main #${i + 1}` }));
    const zoink = getSorted(window.ZOINK_LIST || []).map((l, i) => ({ ...l, source: `Zoink #${i + 1}` }));
    const beaten = (window.BEATEN_LIST || []).map((l) => ({ ...l, source: "Beaten" }));
    if (kind === "main") return main;
    if (kind === "zoink") return zoink;
    if (kind === "beaten") return beaten;
    return [...main, ...beaten];
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let state = null;

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function startNewRun(notify = false) {
    const kind = poolSel.value;
    const items = shuffle(buildPool(kind));
    state = {
      kind,
      queue: items,
      index: 0,
      target: 1,
      score: 0,
      finished: items.length === 0,
      log: []
    };
    saveState();
    render();
    if (notify) {
      window.showCardboardToast("Новый забег!", `Пул: ${poolSel.options[poolSel.selectedIndex].text}`);
    }
  }

  function stepNext(done, percentVal) {
    if (!state || state.finished) return;
    const current = state.queue[state.index];
    if (done) {
      const achieved = Math.max(state.target, Math.min(100, percentVal));
      state.score += 1;
      state.log.unshift({ name: current.name, id: current.id, status: `${achieved}%`, ok: true });
      window.showCardboardToast("GG! +1 Score", `${current.name} — ${achieved}%`);
      if (achieved >= 100 || state.index + 1 >= state.queue.length) {
        state.finished = true;
      } else {
        state.index += 1;
        state.target = achieved + 1;
      }
    } else {
      state.log.unshift({ name: current.name, id: current.id, status: `SKIP (${state.target}%)`, ok: false });
      window.showCardboardToast("Скип!", `${current.name} пропущен`);
      if (state.index + 1 >= state.queue.length) {
        state.finished = true;
      } else {
        state.index += 1;
      }
    }
    saveState();
    render();
  }

  function render() {
    if (!state) return;
    scoreEl.textContent = `Score: ${state.score}`;

    logEl.innerHTML = state.log.length
      ? state.log.map((item) => `
        <li>
          <span>${esc(item.name)} <span style="opacity: 0.7;">(${esc(item.id)})</span></span>
          <span class="${item.ok ? "status-ok" : "status-skip"}">${esc(item.status)}</span>
        </li>`).join("")
      : `<li style="opacity: 0.7;">Уровни еще не пройдены</li>`;

    if (state.finished) {
      stageEl.innerHTML = `
        <div class="card-title"><span>Забег завершен</span><span class="range-tag">${state.score} cleared</span></div>
        <div class="r-target crumple-strong">${state.target >= 100 ? "100% WIN" : "STOP"}</div>
        <p class="muted">Нажми «Новый забег», чтобы крутить дальше.</p>
      `;
      return;
    }

    const lvl = state.queue[state.index];
    const stepHint = Math.min(100, state.target);
    stageEl.innerHTML = `
      <div class="card-title">
        <span>${esc(lvl.source)}</span>
        <span class="range-tag">${state.index + 1} / ${state.queue.length}</span>
      </div>
      <h2 class="crumple-strong gd-outline" style="font-size: 26px; margin-bottom: 8px;">${esc(lvl.name)}</h2>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
        ${idButtonHtml(lvl.id)}
        ${lvl.creator ? `<span class="ill-creator crumple-soft" style="margin:0;">by ${esc(lvl.creator)}</span>` : ""}
        ${lvl.skip ? `<span class="ill-pill ill-pill-skip crumple-soft" data-note="SKIP">SKIP ALLOWED</span>` : ""}
      </div>
      <div style="font-size: 12px; color: #cbd5e1;">Нужно сделать минимум:</div>
      <div class="r-target crumple-strong">${state.target}%</div>
      <div class="r-actions">
        <input id="r-percent-input" type="number" class="num-input" min="${state.target}" max="100" value="${stepHint}" style="width: 96px;">
        <button id="r-done-btn" class="btn btn-primary">Сделал (%)</button>
        <button id="r-skip-btn" class="btn">Скипнуть</button>
      </div>
    `;

    document.getElementById("r-done-btn").addEventListener("click", () => {
      const val = parseInt(document.getElementById("r-percent-input").value, 10);
      if (Number.isNaN(val) || val < state.target || val > 100) return;
      stepNext(true, val);
    });
    document.getElementById("r-skip-btn").addEventListener("click", () => stepNext(false, 0));
  }

  startBtn.addEventListener("click", () => startNewRun(true));

  const saved = loadState();
  if (saved && Array.isArray(saved.queue) && saved.queue.length) {
    state = saved;
    poolSel.value = saved.kind || "main";
    render();
  } else {
    startNewRun(false);
  }
}

initHome();
initListPage();
initRoulette();
