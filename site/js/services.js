// Городские службы. Кто на улице — зависит от погоды. Нажатие открывает фото и гифку.
const SVC = [
  {
    id: "voda",
    title: "Водоканал",
    color: "#1c6fb5",
    photo: "img/services/voda.jpg",
    clip: "img/services/voda.mp4",
    blurb: "Бригада у люка. В дождь и мороз их больше: колодцы и прорывы.",
    show: (w) => true,
    count: (w) => (w.snow || w.rain ? 2 : 1),
  },
  {
    id: "water",
    title: "Поливалка",
    color: "#3aa8c4",
    photo: "img/services/water.jpg",
    clip: "img/services/water.mp4",
    blurb: "Моют проезжую часть. Выезжают, когда сухо и тепло, не в снег.",
    show: (w) => !w.snow && !w.rain && w.warm,
    count: () => 2,
  },
  {
    id: "mchs",
    title: "МЧС",
    color: "#e4572e",
    photo: "img/services/mchs.jpg",
    clip: "img/services/mchs.mp4",
    blurb: "Спасатели на дежурстве. В снег и гололёд машина ближе к центру.",
    show: () => true,
    count: (w) => (w.snow ? 2 : 1),
  },
  {
    id: "snow",
    title: "Снегоуборка",
    color: "#f0c14a",
    photo: "img/services/snow.jpg",
    clip: "img/services/snow.mp4",
    blurb: "Нож и щётка. Сейчас как раз их сезон: снег и гололёд.",
    show: (w) => w.snow,
    count: () => 3,
  },
  {
    id: "trash",
    title: "Мусоровоз",
    color: "#3e6b4a",
    photo: "img/services/trash.jpg",
    clip: "",
    blurb: "Обходит дворы по графику. В снегопад едет тише, но маршрут тот же.",
    show: () => true,
    count: () => 1,
  },
  {
    id: "sweep",
    title: "Подметалка",
    color: "#e07a3d",
    photo: "img/services/sweep.jpg",
    clip: "",
    blurb: "Щётки по кромке. В снег её сменяет снегоуборка.",
    show: (w) => !w.snow,
    count: () => 1,
  },
];

const svcTrucks = [];
let svcKey = "";
let svcHinted = false;
let svcLook = null;

function svcWeather() {
  const w = typeof weather !== "undefined" && weather ? weather : {};
  const snow = w.kind === "snow" || !!w.ice || (w.t != null && w.t <= -2);
  const rain = w.kind === "rain";
  const warm = !snow && !rain && (w.kind === "clear" || w.kind === "heat" || (w.t != null && w.t >= 16) || w.t == null);
  return { snow, rain, warm, raw: w };
}

function svcSpot() {
  if (!world || !world.stops || !world.stops.length || typeof player === "undefined") return null;
  const near = world.stops.filter((s) => dist(s.x, s.y, player.x, player.y) < 900);
  const pool = near.length > 4 ? near : world.stops;
  return pool[Math.floor(Math.random() * pool.length)];
}

function svcEnsure() {
  const w = svcWeather();
  const key = (w.snow ? "s" : w.rain ? "r" : w.warm ? "h" : "c") + ":" + Math.round((player.x || 0) / 800);
  if (key === svcKey && svcTrucks.length) return;
  svcKey = key;
  for (const def of SVC) {
    const n = def.show(w) ? def.count(w) : 0;
    let have = svcTrucks.filter((t) => t.id === def.id);
    while (have.length < n) {
      const spot = svcSpot();
      if (!spot) break;
      const t = {
        id: def.id,
        title: def.title,
        color: def.color,
        photo: def.photo,
        clip: def.clip,
        blurb: def.blurb,
        x: spot.x,
        y: spot.y,
        hx: 1,
        hy: 0,
        tx: spot.x,
        ty: spot.y,
        on: true,
      };
      svcTrucks.push(t);
      have.push(t);
    }
    have.forEach((t, i) => {
      t.on = i < n;
    });
  }
  if (!svcHinted && svcTrucks.some((t) => t.on)) {
    svcHinted = true;
    if (typeof setHint === "function") setHint("Службы города на улицах. Нажмите на машину — фото и гифка.");
  }
}

function svcStep(dt) {
  if (!world || !world.stops) return;
  const w = svcWeather();
  const pool = world.stops.filter((s) => dist(s.x, s.y, player.x, player.y) < 1100);
  const use = pool.length > 3 ? pool : world.stops;
  for (const t of svcTrucks) {
    if (!t.on) continue;
    if (dist(t.x, t.y, player.x, player.y) > 1400 && use.length) {
      const s = use[Math.floor(Math.random() * use.length)];
      t.x = s.x;
      t.y = s.y;
      t.tx = s.x;
      t.ty = s.y;
    }
    let dx = t.tx - t.x;
    let dy = t.ty - t.y;
    let L = Math.hypot(dx, dy);
    if (L < 8 && use.length) {
      const s = use[Math.floor(Math.random() * use.length)];
      t.tx = s.x + (Math.random() - 0.5) * 8;
      t.ty = s.y + (Math.random() - 0.5) * 6;
      dx = t.tx - t.x;
      dy = t.ty - t.y;
      L = Math.hypot(dx, dy) || 1;
    }
    if (L < 0.5) continue;
    t.hx = dx / L;
    t.hy = dy / L;
    const speed = t.id === "snow" && w.snow ? 7 : t.id === "water" ? 5 : 8;
    const step = Math.min(L, speed * dt);
    t.x += (dx / L) * step;
    t.y += (dy / L) * step;
  }
}

function svcNear(x, y, r) {
  let best = null;
  let bd = r;
  for (const t of svcTrucks) {
    if (!t.on) continue;
    const d = dist(t.x, t.y, x, y);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

function svcDrawTruck(t) {
  if (typeof drawCarSprite === "function") {
    drawCarSprite(t.x, t.y, t.hx, t.hy, t.id === "snow" ? 7.2 : 6.2, 2.35, t.color, t.id === "mchs" ? "amb" : "car", cityAnimT || 0, null);
  }
  if (t.id === "snow") {
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.beginPath();
    ctx.moveTo(t.x + t.hx * 4.2, t.y + t.hy * 4.2);
    ctx.lineTo(t.x + t.hx * 2.2 - t.hy * 1.6, t.y + t.hy * 2.2 + t.hx * 1.6);
    ctx.lineTo(t.x + t.hx * 2.2 + t.hy * 1.6, t.y + t.hy * 2.2 - t.hx * 1.6);
    ctx.fill();
  }
  if (t.id === "water") {
    ctx.strokeStyle = "rgba(180,220,255,.55)";
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(t.x + t.hx * 2.4, t.y + t.hy * 2.4);
    ctx.lineTo(t.x + t.hx * 5.5 - t.hy * 1.4, t.y + t.hy * 5.5 + t.hx * 1.4);
    ctx.moveTo(t.x + t.hx * 2.4, t.y + t.hy * 2.4);
    ctx.lineTo(t.x + t.hx * 5.2 + t.hy * 1.2, t.y + t.hy * 5.2 - t.hx * 1.2);
    ctx.stroke();
  }
}

function svcDraw() {
  if (typeof cam === "undefined" || typeof ctx === "undefined" || cam.z < 0.75) return;
  const z = cam.z;
  ctx.save();
  ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (W / 2 - cam.x * z), DPR * (H / 2 - cam.y * z));
  for (const t of svcTrucks) if (t.on) svcDrawTruck(t);
  ctx.restore();
  ctx.save();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.font = '700 12px "IBM Plex Sans",system-ui';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of svcTrucks) {
    if (!t.on) continue;
    const sx = (t.x - cam.x) * z + W / 2;
    const sy = (t.y - cam.y) * z + H / 2;
    if (sx < -40 || sy < -40 || sx > W + 40 || sy > H + 40) continue;
    const w = ctx.measureText(t.title).width + 14;
    ctx.fillStyle = "rgba(14,21,18,.9)";
    ctx.fillRect(sx - w / 2, sy - 28, w, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(t.title, sx, sy - 20);
  }
  ctx.restore();
}

function svcShow(mode) {
  const t = svcLook;
  if (!t) return;
  const img = document.getElementById("svcImg");
  const vid = document.getElementById("svcVid");
  const gifBtn = document.getElementById("svcGif");
  if (gifBtn) gifBtn.hidden = !t.clip;
  if (mode === "gif" && t.clip && vid) {
    img.style.display = "none";
    vid.style.display = "block";
    if (vid.getAttribute("src") !== t.clip) vid.src = t.clip;
    vid.play().catch(() => {});
  } else if (img) {
    if (vid) {
      vid.pause();
      vid.style.display = "none";
    }
    img.style.display = "block";
    img.src = t.photo;
    img.alt = t.title;
  }
}

function openServiceLook(t) {
  svcLook = t;
  let box = document.getElementById("svcLook");
  if (!box) {
    box = document.createElement("div");
    box.className = "modal";
    box.id = "svcLook";
    box.innerHTML =
      '<div class="box" style="max-width:560px"><div style="border-radius:14px;overflow:hidden;background:#14201b;margin:0 0 10px;aspect-ratio:16/9"><img id="svcImg" alt="" style="width:100%;height:100%;object-fit:cover;display:block"><video id="svcVid" muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:none"></video></div><h2 id="svcTitle"></h2><p id="svcText"></p><div class="row"><button class="btn" id="svcPhoto" type="button">Фото</button><button class="btn primary" id="svcGif" type="button">Гифка</button><button class="btn" id="svcClose" type="button">Закрыть</button></div></div>';
    document.body.append(box);
    box.querySelector("#svcClose").onclick = closeServiceLook;
    box.querySelector("#svcPhoto").onclick = () => svcShow("photo");
    box.querySelector("#svcGif").onclick = () => svcShow("gif");
    box.addEventListener("click", (e) => {
      if (e.target === box) closeServiceLook();
    });
  }
  document.getElementById("svcTitle").textContent = t.title;
  const w = svcWeather();
  const extra = t.id === "snow" && w.snow ? " Сейчас они как раз на линии." : t.id === "water" && !w.warm ? " В такую погоду поливалка стоит." : "";
  document.getElementById("svcText").textContent = t.blurb + extra;
  box.hidden = false;
  if (typeof player !== "undefined") player.busy = true;
  svcShow(t.clip ? "gif" : "photo");
}

function closeServiceLook() {
  const box = document.getElementById("svcLook");
  const vid = document.getElementById("svcVid");
  if (vid) vid.pause();
  if (box) box.hidden = true;
  svcLook = null;
  if (typeof player !== "undefined" && (typeof chatNpc === "undefined" || !chatNpc)) player.busy = false;
}

function svcHook() {
  if (svcHook.done) return;
  svcHook.done = true;
  if (typeof render === "function") {
    const prev = render;
    render = function () {
      prev();
      try {
        svcDraw();
      } catch (e) {}
    };
  }
  if (typeof findAction === "function") {
    const prev = findAction;
    findAction = function () {
      const a = prev();
      if (typeof player === "undefined" || player.vehicle || player.busy) return a;
      const s = svcNear(player.x, player.y, 7);
      if (!s) return a;
      return { label: "Посмотреть: " + s.title, run: () => openServiceLook(s) };
    };
  }
  const map = document.getElementById("map");
  if (map) {
    let down = null;
    map.addEventListener("pointerdown", (e) => {
      down = { x: e.clientX, y: e.clientY };
    }, true);
    map.addEventListener("pointerup", (e) => {
      if (!down || typeof cam === "undefined" || typeof player === "undefined") return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 8 || player.busy || (typeof scene !== "undefined" && scene !== "city")) return;
      const wx = cam.x + (e.clientX - innerWidth / 2) / cam.z;
      const wy = cam.y + (e.clientY - innerHeight / 2) / cam.z;
      const s = svcNear(wx, wy, Math.max(7, 20 / cam.z));
      if (!s) return;
      e.stopPropagation();
      openServiceLook(s);
    }, true);
  }
}

setInterval(() => {
  if (typeof world === "undefined" || !world || !world.stops || !world.stops.length || typeof player === "undefined") return;
  if (!svcHook.done) svcHook();
  svcEnsure();
  svcStep(0.12);
}, 120);
