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

function idButtonHtml(id) {
  return `<button class="id-btn" type="button" data-copy="${esc(id)}">ID: ${esc(id)}</button>`;
}

document.addEventListener("click", (e) => {
  const copyBtn = e.target.closest("[data-copy]");
  if (copyBtn) {
    const text = copyBtn.getAttribute("data-copy");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    copyBtn.textContent = "COPIED";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = `ID: ${text}`;
      copyBtn.classList.remove("copied");
    }, 900);
    return;
  }

  const detBtn = e.target.closest("[data-details]");
  if (detBtn) {
    const card = detBtn.closest(".ill-card");
    if (!card) return;
    const isOpen = card.classList.toggle("open");
    detBtn.textContent = isOpen ? "Hide details \u25B4" : "Show details \u25BE";
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

  const rows = Object.values(stats)
    .map((p) => ({ ...p, total: p.mainPts + p.zoinkPts }))
    .sort((a, b) => b.total - a.total || b.clears - a.clears || b.beaten - a.beaten);

  tbody.innerHTML = rows.map((p, i) => `
    <tr>
      <td class="rank-cell">#${i + 1}</td>
      <td><strong>${esc(p.name)}</strong></td>
      <td class="pts-cell">${p.mainPts.toLocaleString("en-US")}</td>
      <td class="pts-cell">${p.zoinkPts.toLocaleString("en-US")}</td>
      <td class="pts-cell" style="color: var(--accent)">${p.total.toLocaleString("en-US")}</td>
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
    const { rank, name, creator, id, points, tier, topClass, wrText, wrVerified, rightTop, tagsHtml, detailsHtml, thumb, hasThumb } = opts;
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
      ? `<div class="detail-item"><span class="detail-label">Preview Clip</span><a href="${mediaSrc}" target="_blank" style="color: var(--ok);">Open MP4</a></div>`
      : "";

    return `
      <article class="ill-card${hasThumb ? "" : " compact"}${tier ? ` tier-${tier}` : ""}${topClass ? ` ${topClass}` : ""}">
        ${bgLayer}
        <div class="ill-main">
          ${thumbLayer}
          <div class="ill-body">
            <div class="ill-title-row">
              <span class="ill-title">#${rank} ${esc(name)}</span>
              ${wrText ? `<span class="ill-wr-pill${wrVerified ? " verified" : ""}">${esc(wrText)}</span>` : ""}
            </div>
            <div class="ill-creator">by ${esc(creator)}</div>
            <div class="ill-tags">
              ${tagsHtml || ""}
              ${idButtonHtml(id)}
            </div>
          </div>
          <div class="ill-right">
            <div>
              <div class="ill-stat-top">${esc(rightTop)}</div>
              <div class="ill-pts">${points.toLocaleString("en-US")} pts</div>
            </div>
            <button class="details-btn" type="button" data-details>Show details \u25BE</button>
          </div>
        </div>
        <div class="ill-details">
          ${detailsHtml}
          ${clipLink}
          <div class="detail-item">
            <span class="detail-label">GDBrowser</span>
            <a href="https://gdbrowser.com/${esc(id)}" target="_blank" rel="noopener" style="color: #93c5fd;">gdbrowser.com/${esc(id)}</a>
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
        const tags = [
          `<span class="ill-pill ill-pill-${lvl.tier}">${lvl.tier}</span>`,
          lvl.skip ? `<span class="ill-pill ill-pill-skip">Skip Allowed</span>` : "",
          Array.isArray(lvl.victors) && lvl.victors.length ? `<span class="ill-pill">Victors: ${esc(victorsText)}</span>` : ""
        ].join("");

        const details = `
          <div class="detail-item"><span class="detail-label">Verifier</span><span>${esc(lvl.verifier || "Unverified")}</span></div>
          <div class="detail-item"><span class="detail-label">Victors</span><span>${esc(victorsText)}</span></div>
          <div class="detail-item"><span class="detail-label">Rule 1 Skip</span><span>${lvl.skip ? "Allowed" : "No"}</span></div>
          ${lvl.video ? `<div class="detail-item"><span class="detail-label">Video</span><a href="${esc(lvl.video)}" target="_blank" rel="noopener" style="color: var(--ok);">Watch</a></div>` : ""}
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
      }).join("") : `<div class="card muted">Ничего не найдено</div>`;
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
        const tags = [
          `<span class="ill-pill">Standard TPS</span>`,
          `<span class="ill-pill">&le; 16 CPS</span>`,
          lvl.skip ? `<span class="ill-pill ill-pill-skip">Skip Allowed</span>` : ""
        ].join("");

        const details = `
          <div class="detail-item"><span class="detail-label">Best Run</span><span>${esc(wrText)}</span></div>
          <div class="detail-item"><span class="detail-label">Rule 1 Skip</span><span>${lvl.skip ? "Allowed" : "No"}</span></div>
          ${lvl.video ? `<div class="detail-item"><span class="detail-label">Macro / Video</span><a href="${esc(lvl.video)}" target="_blank" rel="noopener" style="color: var(--ok);">Watch</a></div>` : ""}
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
      }).join("") : `<div class="card muted">Ничего не найдено</div>`;
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
          ${lvl.video ? `<div class="detail-item"><span class="detail-label">Macro</span><a href="${esc(lvl.video)}" target="_blank" rel="noopener" style="color: var(--ok);">Watch</a></div>` : ""}
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
      }).join("") : `<div class="card muted">Ничего не найдено</div>`;
      return;
    }

    const rows = (window.BEATEN_LIST || [])
      .map((lvl, idx) => ({ ...lvl, rank: idx + 1 }))
      .filter((lvl) => {
        if (!q) return true;
        return [lvl.name, lvl.id, ...(lvl.victors || [])].join(" ").toLowerCase().includes(q);
      });

    containerEl.innerHTML = rows.length ? rows.map((lvl) => `
      <article class="ill-card compact">
        <div class="ill-main" style="align-items: center;">
          <div class="demon-slot">
            <img class="demon-icon" referrerpolicy="no-referrer" src="${esc(DEMON_ICONS[lvl.diff] || "")}" alt="${esc(DIFF_LABELS[lvl.diff] || lvl.diff)}" title="${esc(DIFF_LABELS[lvl.diff] || lvl.diff)}">
          </div>
          <div class="ill-body">
            <div class="ill-title-row">
              <span class="ill-title">${esc(lvl.name)}</span>
              <span class="ill-wr-pill verified">${esc(DIFF_LABELS[lvl.diff] || lvl.diff)}</span>
            </div>
            <div class="ill-creator">Beaten by: ${esc((lvl.victors || []).join(", "))}</div>
          </div>
          <div class="ill-right">
            ${idButtonHtml(lvl.id)}
          </div>
        </div>
      </article>
    `).join("") : `<div class="card muted">Ничего не найдено</div>`;
  }

  function switchTab(tab) {
    activeTab = tab;
    activeTier = "ALL";
    if (location.hash !== "#" + tab) history.replaceState(null, "", "#" + tab);
    renderFilters();
    renderCards();
  }

  tabBtns.forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
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

  function startNewRun() {
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
  }

  function stepNext(done, percentVal) {
    if (!state || state.finished) return;
    const current = state.queue[state.index];
    if (done) {
      const achieved = Math.max(state.target, Math.min(100, percentVal));
      state.score += 1;
      state.log.unshift({ name: current.name, id: current.id, status: `${achieved}%`, ok: true });
      if (achieved >= 100 || state.index + 1 >= state.queue.length) {
        state.finished = true;
      } else {
        state.index += 1;
        state.target = achieved + 1;
      }
    } else {
      state.log.unshift({ name: current.name, id: current.id, status: `SKIP (${state.target}%)`, ok: false });
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
          <span>${esc(item.name)} <span class="muted">(${esc(item.id)})</span></span>
          <span class="${item.ok ? "status-ok" : "status-skip"}">${esc(item.status)}</span>
        </li>`).join("")
      : `<li class="muted">Уровни еще не пройдены</li>`;

    if (state.finished) {
      stageEl.innerHTML = `
        <div class="card-title"><span>Забег завершен</span><span class="range-tag">${state.score} cleared</span></div>
        <div class="r-target">${state.target >= 100 ? "100% WIN" : "STOP"}</div>
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
      <h2 style="font-size: 24px; margin-bottom: 6px;">${esc(lvl.name)}</h2>
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 12px;">
        ${idButtonHtml(lvl.id)}
        ${lvl.creator ? `<span class="muted">by ${esc(lvl.creator)}</span>` : ""}
        ${lvl.skip ? `<span class="ill-pill ill-pill-skip">SKIP ALLOWED</span>` : ""}
      </div>
      <div class="muted" style="font-size: 12px;">Нужно сделать минимум:</div>
      <div class="r-target">${state.target}%</div>
      <div class="r-actions">
        <input id="r-percent-input" type="number" class="num-input" min="${state.target}" max="100" value="${stepHint}" style="width: 90px;">
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

  startBtn.addEventListener("click", startNewRun);

  const saved = loadState();
  if (saved && Array.isArray(saved.queue) && saved.queue.length) {
    state = saved;
    poolSel.value = saved.kind || "main";
    render();
  } else {
    startNewRun();
  }
}

initHome();
initListPage();
initRoulette();
