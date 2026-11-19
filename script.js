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

/* Bryce 3D + PS1 low-poly background engine and UI overlays */
(function initGlacierEngine() {
  const canvas = document.createElement("canvas");
  canvas.className = "glacier-bg ps1";
  const scanOverlay = document.createElement("div");
  scanOverlay.className = "glacier-scan";
  document.body.prepend(scanOverlay);
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d", { alpha: false });
  const MODE_KEY = "ewasion_3d_mode";
  const MODES = ["ps1", "bryce", "off"];
  let mode = localStorage.getItem(MODE_KEY) || "ps1";
  if (!MODES.includes(mode)) mode = "ps1";

  const toggleBtn = document.getElementById("render-toggle");

  function vecSub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function vecCross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  function vecDot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function vecNorm(v) {
    const len = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  function buildIcosphere(radius) {
    const t = (1 + Math.sqrt(5)) / 2;
    const rawVerts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ].map(([x, y, z]) => vecNorm({ x, y, z }));

    const baseFaces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];

    const midCache = new Map();
    const verts = [...rawVerts];

    function getMid(i1, i2) {
      const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
      if (midCache.has(key)) return midCache.get(key);
      const a = verts[i1];
      const b = verts[i2];
      const idx = verts.length;
      verts.push(vecNorm({ x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5, z: (a.z + b.z) * 0.5 }));
      midCache.set(key, idx);
      return idx;
    }

    const faces = [];
    for (const [a, b, c] of baseFaces) {
      const ab = getMid(a, b);
      const bc = getMid(b, c);
      const ca = getMid(c, a);
      faces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }

    const tris = faces.map(([i0, i1, i2], idx) => {
      const v0 = verts[i0];
      const v1 = verts[i1];
      const v2 = verts[i2];
      const n = vecCross(vecSub(v1, v0), vecSub(v2, v0));
      const c = { x: (v0.x + v1.x + v2.x) / 3, y: (v0.y + v1.y + v2.y) / 3, z: (v0.z + v1.z + v2.z) / 3 };
      const ordered = vecDot(n, c) >= 0 ? [v0, v1, v2] : [v0, v2, v1];
      return {
        type: "sphere",
        seed: (idx * 37) % 17,
        v: ordered.map((p) => ({ x: p.x * radius, y: p.y * radius, z: p.z * radius }))
      };
    });
    return tris;
  }

  function buildPyramid(width, height, seedOffset) {
    const hw = width * 0.5;
    const base = [
      { x: -hw, y: 0, z: -hw },
      { x: hw, y: 0, z: -hw },
      { x: hw, y: 0, z: hw },
      { x: -hw, y: 0, z: hw }
    ];
    const apex = { x: 0, y: height, z: 0 };
    const center = { x: 0, y: height * 0.3, z: 0 };
    const sides = [
      [base[0], base[1], apex],
      [base[1], base[2], apex],
      [base[2], base[3], apex],
      [base[3], base[0], apex]
    ];

    return sides.map((tri, idx) => {
      const n = vecCross(vecSub(tri[1], tri[0]), vecSub(tri[2], tri[0]));
      const fc = {
        x: (tri[0].x + tri[1].x + tri[2].x) / 3,
        y: (tri[0].y + tri[1].y + tri[2].y) / 3,
        z: (tri[0].z + tri[1].z + tri[2].z) / 3
      };
      const ordered = vecDot(n, vecSub(fc, center)) >= 0 ? tri : [tri[0], tri[2], tri[1]];
      return {
        type: "pyramid",
        seed: ((idx + seedOffset) * 53) % 19,
        v: ordered
      };
    });
  }

  const sphereTris = buildIcosphere(1.22);
  const pyrLeftTris = buildPyramid(1.55, 1.48, 1);
  const pyrRightTris = buildPyramid(1.75, 1.65, 5);
  const lightDir = vecNorm({ x: -0.55, y: 0.72, z: -0.42 });

  let width = 0;
  let height = 0;
  let mouseX = 0;
  let mouseY = 0;
  let smoothMX = 0;
  let smoothMY = 0;

  function resize() {
    if (mode === "ps1") {
      const targetW = Math.max(320, Math.min(480, Math.round(window.innerWidth / 3.4)));
      width = targetW;
      height = Math.max(180, Math.round(targetW * (window.innerHeight / window.innerWidth)));
      canvas.classList.add("ps1");
    } else {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.round(window.innerWidth * dpr);
      height = Math.round(window.innerHeight * dpr);
      canvas.classList.remove("ps1");
    }
    canvas.width = width;
    canvas.height = height;
    drawStaticBackdrop();
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
    mouseY = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
  }, { passive: true });

  function drawStaticBackdrop() {
    const horizonY = Math.round(height * 0.44);
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, "#0b121e");
    sky.addColorStop(0.55, "#1b2a40");
    sky.addColorStop(0.88, "#3e5775");
    sky.addColorStop(1, "#a9d4ed");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, horizonY);

    const sea = ctx.createLinearGradient(0, horizonY, 0, height);
    sea.addColorStop(0, "#7ab3d4");
    sea.addColorStop(0.08, "#22364f");
    sea.addColorStop(0.45, "#0d1624");
    sea.addColorStop(1, "#05080f");
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizonY, width, height - horizonY);
  }

  function syncModeUI() {
    if (toggleBtn) {
      toggleBtn.textContent = mode === "ps1" ? "3D: PS1" : (mode === "bryce" ? "3D: BRYCE" : "3D: OFF");
    }
    resize();
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      mode = next;
      localStorage.setItem(MODE_KEY, mode);
      syncModeUI();
      if (window.showToast) {
        const labels = {
          ps1: "Low-Poly PS1 режим включен",
          bryce: "Сглаженный Bryce 3D режим включен",
          off: "3D рендер отключен"
        };
        window.showToast("Графика", labels[mode]);
      }
    });
  }

  function transformPoint(p, offset, rotY, rotX, reflect) {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);

    const x1 = p.x * cosY - p.z * sinY;
    const z1 = p.x * sinY + p.z * cosY;
    const y2 = p.y * cosX - z1 * sinX;
    const z2 = p.y * sinX + z1 * cosX;

    const wx = x1 + offset.x;
    const wy = (y2 + offset.y) * (reflect ? -1 : 1);
    const wz = z2 + offset.z;
    return { x: wx, y: wy, z: wz };
  }

  function renderTriangles(tris, offset, rotY, rotX, camPos, horizonY, fov, snap, reflect, time) {
    const projected = [];

    for (const tri of tris) {
      const w0 = transformPoint(tri.v[0], offset, rotY, rotX, reflect);
      const w1 = transformPoint(tri.v[1], offset, rotY, rotX, reflect);
      const w2 = transformPoint(tri.v[2], offset, rotY, rotX, reflect);

      const nRaw = vecCross(vecSub(w1, w0), vecSub(w2, w0));
      const n = vecNorm(reflect ? { x: -nRaw.x, y: -nRaw.y, z: -nRaw.z } : nRaw);
      const c = { x: (w0.x + w1.x + w2.x) / 3, y: (w0.y + w1.y + w2.y) / 3, z: (w0.z + w1.z + w2.z) / 3 };
      const vDir = vecNorm(vecSub(camPos, c));
      const facing = vecDot(n, vDir);
      if (facing <= 0) continue;

      const d0 = w0.z - camPos.z;
      const d1 = w1.z - camPos.z;
      const d2 = w2.z - camPos.z;
      if (d0 <= 0.3 || d1 <= 0.3 || d2 <= 0.3) continue;

      const s0 = fov / d0;
      const s1 = fov / d1;
      const s2 = fov / d2;

      const wave = reflect ? Math.sin(time * 2.1 + c.y * 8 + tri.seed) * (snap > 1 ? 1.5 : 2.5) : 0;

      function proj(w, s) {
        let sx = width * 0.5 + (w.x - camPos.x) * s + wave;
        let sy = horizonY - (w.y - camPos.y) * s;
        if (snap > 1) {
          sx = Math.round(sx / snap) * snap;
          sy = Math.round(sy / snap) * snap;
        }
        return { x: sx, y: sy };
      }

      projected.push({
        depth: (d0 + d1 + d2) / 3,
        pts: [proj(w0, s0), proj(w1, s1), proj(w2, s2)],
        n,
        vDir,
        facing,
        tri
      });
    }

    projected.sort((a, b) => b.depth - a.depth);

    for (const item of projected) {
      const { pts, n, vDir, facing, tri } = item;
      let fill;
      let stroke = null;

      if (tri.type === "sphere") {
        const inc = { x: -vDir.x, y: -vDir.y, z: -vDir.z };
        const ndoti = vecDot(inc, n);
        const refl = vecNorm({
          x: inc.x - 2 * ndoti * n.x,
          y: inc.y - 2 * ndoti * n.y,
          z: inc.z - 2 * ndoti * n.z
        });

        const horizonBand = Math.exp(-Math.abs(refl.y) * 8.5);
        const fresnel = Math.pow(1 - Math.max(0, facing), 2.1);
        const spec = Math.pow(Math.max(0, vecDot(refl, lightDir)), 14);
        const facetNoise = (tri.seed % 5) * 4;

        let r, g, b;
        if (refl.y > 0) {
          const cloud = 0.5 + 0.5 * Math.sin(refl.x * 5 + refl.y * 4);
          r = 46 + cloud * 48 + facetNoise;
          g = 68 + cloud * 58 + facetNoise;
          b = 98 + cloud * 65 + facetNoise;
        } else {
          const depthShade = Math.max(0, 1 + refl.y);
          r = 16 + depthShade * 42 + facetNoise;
          g = 34 + depthShade * 72 + facetNoise;
          b = 54 + depthShade * 88 + facetNoise;
        }

        r += horizonBand * 125 + fresnel * 55 + spec * 130;
        g += horizonBand * 165 + fresnel * 85 + spec * 145;
        b += horizonBand * 185 + fresnel * 110 + spec * 155;

        if (reflect) {
          r *= 0.48;
          g *= 0.56;
          b *= 0.68;
        }

        fill = `rgb(${Math.min(245, Math.round(r))},${Math.min(250, Math.round(g))},${Math.min(255, Math.round(b))})`;
        stroke = reflect ? "rgba(120, 195, 235, 0.08)" : "rgba(185, 232, 255, 0.16)";
      } else {
        const diff = Math.max(0, vecDot(n, lightDir));
        const iceTone = (tri.seed % 7) * 5;
        const horizonBounce = Math.max(0, 1 - Math.abs(n.y)) * 0.25;
        let r = 34 + diff * 86 + horizonBounce * 55 + iceTone;
        let g = 49 + diff * 102 + horizonBounce * 92 + iceTone;
        let b = 68 + diff * 116 + horizonBounce * 118 + iceTone;

        if (reflect) {
          r *= 0.45;
          g *= 0.54;
          b *= 0.66;
        }

        fill = `rgb(${Math.min(235, Math.round(r))},${Math.min(245, Math.round(g))},${Math.min(255, Math.round(b))})`;
        stroke = reflect ? "rgba(110, 180, 225, 0.12)" : "rgba(170, 224, 255, 0.25)";
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  let lastFrame = 0;

  function renderFrame(now) {
    requestAnimationFrame(renderFrame);
    if (mode === "off") return;

    const minDelta = mode === "ps1" ? 48 : 16;
    if (now - lastFrame < minDelta) return;
    lastFrame = now;

    const t = now * 0.001;
    smoothMX += (mouseX - smoothMX) * 0.06;
    smoothMY += (mouseY - smoothMY) * 0.06;

    const horizonY = Math.round(height * 0.44);
    drawStaticBackdrop();

    ctx.fillStyle = "rgba(190, 232, 255, 0.12)";
    for (let i = 0; i < 6; i++) {
      const cy = Math.round((horizonY * (0.12 + i * 0.14)) + Math.sin(t * 0.25 + i) * 4);
      const ch = Math.max(2, Math.round(height * 0.035));
      ctx.fillRect(0, cy, width, ch);
    }

    const fov = Math.min(width, height) * 1.18;
    const camPos = {
      x: smoothMX * 0.35,
      y: 0.82 - smoothMY * 0.14,
      z: -1.6
    };
    const snap = mode === "ps1" ? 1.5 : 0;
    const xBase = width > height ? 1.25 : 0.4;
    const bob = Math.sin(t * 1.15) * 0.12;

    const pLeftOff = { x: xBase - 0.92, y: 0, z: 5.4 };
    const pRightOff = { x: xBase + 0.96, y: 0, z: 5.65 };
    const sphereOff = { x: xBase + 0.06, y: 2.88 + bob, z: 5.25 };

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizonY, width, height - horizonY);
    ctx.clip();
    renderTriangles(pyrLeftTris, pLeftOff, 0.45, 0, camPos, horizonY, fov, snap, true, t);
    renderTriangles(pyrRightTris, pRightOff, -0.35, 0, camPos, horizonY, fov, snap, true, t);
    renderTriangles(sphereTris, sphereOff, t * 0.28, t * 0.14, camPos, horizonY, fov, snap, true, t);

    const waterVeil = ctx.createLinearGradient(0, horizonY, 0, height);
    waterVeil.addColorStop(0, "rgba(130, 198, 235, 0.18)");
    waterVeil.addColorStop(0.2, "rgba(14, 28, 46, 0.32)");
    waterVeil.addColorStop(1, "rgba(5, 9, 16, 0.72)");
    ctx.fillStyle = waterVeil;
    ctx.fillRect(0, horizonY, width, height - horizonY);
    ctx.restore();

    ctx.fillStyle = "rgba(215, 244, 255, 0.85)";
    ctx.fillRect(0, horizonY - 1, width, 2);

    renderTriangles(pyrLeftTris, pLeftOff, 0.45, 0, camPos, horizonY, fov, snap, false, t);
    renderTriangles(pyrRightTris, pRightOff, -0.35, 0, camPos, horizonY, fov, snap, false, t);
    renderTriangles(sphereTris, sphereOff, t * 0.28, t * 0.14, camPos, horizonY, fov, snap, false, t);
  }

  syncModeUI();
  requestAnimationFrame(renderFrame);

  const toastStack = document.createElement("div");
  toastStack.className = "ice-toast-stack";
  document.body.appendChild(toastStack);

  const modalBackdrop = document.createElement("div");
  modalBackdrop.className = "ice-modal-backdrop";
  modalBackdrop.innerHTML = `
    <div class="ice-modal" role="dialog" aria-modal="true">
      <button type="button" class="ice-modal-close" aria-label="Закрыть">&times;</button>
      <div class="ice-modal-tag" id="ice-modal-tag">INFO</div>
      <div class="ice-modal-title" id="ice-modal-title">Заметка</div>
      <div class="ice-modal-text" id="ice-modal-text"></div>
      <div class="ice-modal-grid" id="ice-modal-grid"></div>
    </div>
  `;
  document.body.appendChild(modalBackdrop);

  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop || e.target.closest(".ice-modal-close")) {
      modalBackdrop.classList.remove("open");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modalBackdrop.classList.remove("open");
  });

  window.showToast = function (title, body) {
    const toast = document.createElement("div");
    toast.className = "ice-toast";
    toast.innerHTML = `
      <div class="ice-toast-title">${esc(title)}</div>
      <div class="ice-toast-body">${esc(body)}</div>
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

  window.openInfoModal = function ({ tag = "INFO", title, text = "", stats = [] }) {
    document.getElementById("ice-modal-tag").textContent = tag;
    document.getElementById("ice-modal-title").textContent = title;
    const textEl = document.getElementById("ice-modal-text");
    textEl.textContent = text;
    textEl.style.display = text ? "block" : "none";

    const gridEl = document.getElementById("ice-modal-grid");
    gridEl.innerHTML = stats.map((s) => `
      <div class="ice-modal-stat">
        <span>${esc(s.label)}</span>
        <strong>${esc(s.value)}</strong>
      </div>
    `).join("");
    gridEl.style.display = stats.length ? "grid" : "none";

    modalBackdrop.classList.add("open");
  };
})();

const NOTE_PRESETS = {
  rules: {
    tag: "EWASION LIST // ПРАВИЛА",
    title: "Памятка по листу",
    text: "Кликай по ID уровня, чтобы скопировать его в буфер, нажимай на тиры (HELL/GOLD) или на имена игроков для просмотра статистики.",
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
    text: "Main 100% дает полные баллы. Если уровень еще не верифицирован, лучший прогресс в Main и Zoink дает % от баллов уровня.",
    stats: [
      { label: "Main Verify", value: "100% pts" },
      { label: "Zoink WR", value: "progress %" }
    ]
  },
  HELL: {
    tag: "TIER #1 - #5",
    title: "HELL TIER",
    text: "Пятерка самых сложных уровней листа с максимальным количеством баллов.",
    stats: [{ label: "Позиции", value: "Top 1 - 5" }, { label: "Сложность", value: "Extreme" }]
  },
  GOLD: {
    tag: "TIER #6 - #10",
    title: "GOLD TIER",
    text: "Пятерка уровней сразу после Hell-зоны.",
    stats: [{ label: "Позиции", value: "Top 6 - 10" }]
  },
  SILVER: {
    tag: "TIER #11 - #15",
    title: "SILVER TIER",
    text: "Уровни середины топа.",
    stats: [{ label: "Позиции", value: "Top 11 - 15" }]
  },
  BRONZE: {
    tag: "TIER #16 - #20",
    title: "BRONZE TIER",
    text: "Хорошая база для набора первых очков в Main Top.",
    stats: [{ label: "Позиции", value: "Top 16 - 20" }]
  },
  ROCK: {
    tag: "TIER #21+",
    title: "ROCK TIER",
    text: "Нижняя часть Main Top, отлично подходит для разминки или рулетки.",
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
    window.showToast("ID скопирован", `Уровень ${text} в буфере`);
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
    if (NOTE_PRESETS[key]) window.openInfoModal(NOTE_PRESETS[key]);
    return;
  }

  const playerTrigger = e.target.closest("[data-player-card]");
  if (playerTrigger && window._PLAYER_STATS) {
    const name = playerTrigger.getAttribute("data-player-card");
    const p = window._PLAYER_STATS[name];
    if (p) {
      window.openInfoModal({
        tag: "PLAYER STATS",
        title: p.name,
        text: `Общий счет в Ewasion List: ${(p.mainPts + p.zoinkPts).toLocaleString("en-US")} pts.`,
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
    if (NOTE_PRESETS[key]) window.openInfoModal(NOTE_PRESETS[key]);
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
      <td class="rank-cell">#${i + 1}</td>
      <td><strong>${esc(p.name)}</strong></td>
      <td class="pts-cell">${p.mainPts.toLocaleString("en-US")}</td>
      <td class="pts-cell">${p.zoinkPts.toLocaleString("en-US")}</td>
      <td class="pts-cell total-cell">${p.total.toLocaleString("en-US")}</td>
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
                <span class="ill-title">#${rank} ${esc(name)}</span>
                ${wrText ? `<span class="ill-wr-pill${wrVerified ? " verified" : ""}">${esc(wrText)}</span>` : ""}
              </div>
              <div class="ill-creator">by ${esc(creator)}</div>
              <div class="ill-tags">
                ${tagsHtml || ""}
                ${idPill}
              </div>
            </div>
            <div class="ill-right">
              <div>
                <div class="ill-stat-top">${esc(rightTop)}</div>
                <div class="ill-pts">${esc(ptsText || `${points.toLocaleString("en-US")} pts`)}</div>
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
          `<span class="ill-pill ill-pill-${lvl.tier}" data-note="${lvl.tier}" title="Кликни про тир">${lvl.tier}</span>`,
          lvl.skip ? `<span class="ill-pill ill-pill-skip" data-note="SKIP" title="Правило 1">Skip Allowed</span>` : "",
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
          lvl.skip ? `<span class="ill-pill ill-pill-skip" data-note="SKIP">Skip Allowed</span>` : ""
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
                  <span class="ill-title">${esc(lvl.name)}</span>
                  <span class="ill-wr-pill verified">${esc(DIFF_LABELS[lvl.diff] || lvl.diff)}</span>
                </div>
                <div class="ill-creator">Beaten by: ${esc((lvl.victors || []).join(", "))}</div>
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

  function switchTab(tab, notify = false) {
    activeTab = tab;
    activeTier = "ALL";
    if (location.hash !== "#" + tab) history.replaceState(null, "", "#" + tab);
    renderFilters();
    renderCards();
    if (notify && META[tab]) {
      window.showToast("Список переключен", META[tab].title);
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
      window.showToast("Новый забег", `Пул: ${poolSel.options[poolSel.selectedIndex].text}`);
    }
  }

  function stepNext(done, percentVal) {
    if (!state || state.finished) return;
    const current = state.queue[state.index];
    if (done) {
      const achieved = Math.max(state.target, Math.min(100, percentVal));
      state.score += 1;
      state.log.unshift({ name: current.name, id: current.id, status: `${achieved}%`, ok: true });
      window.showToast("GG! +1 Score", `${current.name}: ${achieved}%`);
      if (achieved >= 100 || state.index + 1 >= state.queue.length) {
        state.finished = true;
      } else {
        state.index += 1;
        state.target = achieved + 1;
      }
    } else {
      state.log.unshift({ name: current.name, id: current.id, status: `SKIP (${state.target}%)`, ok: false });
      window.showToast("Скип", `${current.name} пропущен`);
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
      <h2 style="font-family: var(--display); font-size: 26px; color: var(--frost); margin-bottom: 8px;">${esc(lvl.name)}</h2>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px;">
        ${idButtonHtml(lvl.id)}
        ${lvl.creator ? `<span class="ill-creator" style="margin:0;">by ${esc(lvl.creator)}</span>` : ""}
        ${lvl.skip ? `<span class="ill-pill ill-pill-skip" data-note="SKIP">SKIP ALLOWED</span>` : ""}
      </div>
      <div class="muted" style="font-size: 12px;">Нужно сделать минимум:</div>
      <div class="r-target">${state.target}%</div>
      <div class="r-actions">
        <input id="r-percent-input" type="number" class="num-input" min="${state.target}" max="100" value="${stepHint}" style="width: 96px;">
        <button id="r-done-btn" class="btn btn-primary">Сделал (%)</button>
        <button id="r-skip-btn" class="btn">Скипнуть</button>
      </div>
    `;

    const pctInput = document.getElementById("r-percent-input");
    const submitDone = () => {
      const val = parseInt(pctInput.value, 10);
      if (Number.isNaN(val) || val < state.target || val > 100) return;
      stepNext(true, val);
    };

    document.getElementById("r-done-btn").addEventListener("click", submitDone);
    pctInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitDone();
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
