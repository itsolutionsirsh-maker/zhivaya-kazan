// Мотик — часть города, не его название. Покупка как у своей машины: пока не купил, ехать не на чем.
const MOTO_MODELS = [
  { id: "vorobei", name: "Воробей", price: 4800, color: "#d4522a", blurb: "Городской. Дворы и Баумана." },
  { id: "idel", name: "Идель", price: 9200, color: "#1f8f4e", blurb: "Классика. Набережная и Кремль." },
  { id: "tulpar", name: "Тулпар", price: 16800, color: "#ebbb4b", blurb: "Быстрее. В снег салон не выпускает." },
];

const KHRUSTIKI = [
  { name: "Рамиль", color: "#1f8f4e", line: "Сезон. По центру сегодня можно ехать спокойно." },
  { name: "Алина", color: "#d4522a", line: "Я на Баумана только если сухо. В дождь стою." },
  { name: "Марат", color: "#2a6fdb", line: "Мотик не телепорт: сел и поехал по улице." },
  { name: "Гузель", color: "#c4922a", line: "В снег чехол. Погода решает, не я." },
];

if (typeof VEH !== "undefined") {
  VEH.moto = { vmax: 13, acc: 4, brake: 7, turn: 2.6, len: 2.15, wid: 0.75, start: 0, perMin: 0, label: "мотик", word: "мотике" };
}

let ownMoto = null;
const khrustiks = [];

function motoWeatherOk() {
  const w = typeof weather !== "undefined" ? weather : null;
  if (!w) return true;
  if (w.ice || w.kind === "snow") return false;
  if (w.t != null && w.t <= -8) return false;
  return true;
}

function motoSlots() {
  const w = typeof weather !== "undefined" ? weather : {};
  if (!motoWeatherOk()) return 0;
  if (w.kind === "rain") return 1;
  if (w.t != null && w.t >= 30) return 1;
  return 3;
}

function motoSave() {
  try {
    localStorage.setItem(
      "zk.moto",
      JSON.stringify({ owned: !!player.hasMoto, model: player.motoName || "", color: player.motoColor || "" }),
    );
  } catch (e) {}
}

function motoLoad() {
  try {
    const s = JSON.parse(localStorage.getItem("zk.moto") || "null");
    if (s && s.owned) {
      player.hasMoto = true;
      player.motoName = s.model || "Воробей";
      player.motoColor = s.color || "#1f8f4e";
    }
  } catch (e) {}
}

function motoParkNear(x, y) {
  if (typeof nodeNear === "function" && world.carNodes && typeof curbSpot === "function") {
    const n = nodeNear(world.carNodes, [x, y], 90);
    const s = n != null ? curbSpot(n) : null;
    if (s) return s;
  }
  return { x: x + 6, y: y + 3, hx: 1, hy: 0 };
}

function ensureOwnMoto() {
  if (!player.hasMoto || typeof world === "undefined" || !world) return;
  if (ownMoto) return;
  const spot = motoParkNear(player.x || 0, player.y || 0);
  ownMoto = {
    kind: "moto",
    x: spot.x,
    y: spot.y,
    hx: spot.hx || 1,
    hy: spot.hy || 0,
    color: player.motoColor || "#1f8f4e",
    parked: true,
  };
}

function motoMoney(n) {
  return typeof fmtMoney === "function" ? fmtMoney(n) : n + " ₽";
}

function buyMoto(model) {
  if (player.hasMoto) {
    setHint("Мотик уже ваш. Он на карте — подойдите и нажмите E.");
    return;
  }
  if ((player.money || 0) < model.price) {
    setHint("Не хватает " + motoMoney(model.price - (player.money || 0)) + ".");
    return;
  }
  player.money -= model.price;
  player.hasMoto = true;
  player.motoName = model.name;
  player.motoColor = model.color;
  ownMoto = null;
  ensureOwnMoto();
  if (ownMoto) ownMoto.color = model.color;
  motoSave();
  if (typeof addEvent === "function") addEvent("Мотосалон: «" + model.name + "» ваш. Стоит рядом — садитесь, когда погода пускает.");
  setHint("«" + model.name + "» на карте. Подойдите вплотную.");
  const box = document.getElementById("motoModal");
  if (box) box.hidden = true;
  paintSalon();
}

function paintSalon() {
  const list = document.getElementById("motoList");
  if (!list) return;
  list.innerHTML = "";
  for (const model of MOTO_MODELS) {
    const row = document.createElement("div");
    row.className = "row";
    row.style.justifyContent = "space-between";
    const owned = player.hasMoto && player.motoName === model.name;
    row.innerHTML = "<span><b>" + model.name + "</b> · " + motoMoney(model.price) + "<br><small>" + model.blurb + "</small></span>";
    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.type = "button";
    btn.textContent = owned ? "ваш" : player.hasMoto ? "уже есть мотик" : "Купить";
    btn.disabled = !!player.hasMoto;
    btn.onclick = () => buyMoto(model);
    row.append(btn);
    list.append(row);
  }
}

function openMotoSalon() {
  let box = document.getElementById("motoModal");
  if (!box) {
    box = document.createElement("div");
    box.className = "modal";
    box.id = "motoModal";
    box.innerHTML =
      '<div class="box"><h2>Мотосалон</h2><p>Это не название города, а лавка. Пока не купили — мотика нет. В снег и гололёд он стоит.</p><div id="motoList" class="stack"></div><div class="row"><button class="btn" id="motoClose" type="button">Закрыть</button></div></div>';
    document.body.append(box);
    box.querySelector("#motoClose").onclick = () => {
      box.hidden = true;
    };
    box.addEventListener("click", (e) => {
      if (e.target === box) box.hidden = true;
    });
  }
  paintSalon();
  box.hidden = false;
}

function mountMotoButton() {
  if (document.getElementById("motoBtn")) return;
  const host = document.getElementById("routeBtn");
  if (!host || !host.parentElement) return;
  const b = document.createElement("button");
  b.className = "btn";
  b.id = "motoBtn";
  b.type = "button";
  b.title = "Мотосалон";
  b.textContent = "🏍";
  b.style.fontSize = "16px";
  b.onclick = openMotoSalon;
  host.parentElement.insertBefore(b, host);
}

function drawMotoSprite(x, y, hx, hy, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(hy || 0, hx || 1));
  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath();
  ctx.ellipse(0.1, 0.22, 0.7, 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.arc(-0.72, 0, 0.26, 0, Math.PI * 2);
  ctx.arc(0.78, 0, 0.26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color || "#1f8f4e";
  if (typeof rrect === "function") {
    rrect(ctx, -0.4, -0.16, 0.95, 0.32, 0.08);
    ctx.fill();
  } else ctx.fillRect(-0.4, -0.16, 0.95, 0.32);
  ctx.fillStyle = "#141414";
  ctx.fillRect(0.42, -0.32, 0.1, 0.64);
  ctx.restore();
}

function motoLabel(x, y, text) {
  if (typeof cam === "undefined" || typeof ctx === "undefined") return;
  const z = cam.z || 1;
  const sx = (x - cam.x) * z + W / 2;
  const sy = (y - cam.y) * z + H / 2;
  if (sx < -80 || sy < -80 || sx > W + 80 || sy > H + 80) return;
  ctx.save();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.font = '600 12px "IBM Plex Sans",system-ui';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = "rgba(14,21,18,.88)";
  ctx.fillRect(sx - w / 2, sy - 30, w, 16);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, sx, sy - 22);
  ctx.restore();
}

function drawMotoWorld() {
  if (typeof cam === "undefined" || !ctx || cam.z < 0.75) return;
  const z = cam.z;
  ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (W / 2 - cam.x * z), DPR * (H / 2 - cam.y * z));
  if (ownMoto && ownMoto.parked && !(player.vehicle && player.vehicle.kind === "moto")) {
    drawMotoSprite(ownMoto.x, ownMoto.y, ownMoto.hx, ownMoto.hy, ownMoto.color);
  }
  for (const k of khrustiks) {
    drawMotoSprite(k.x, k.y, k.hx, k.hy, k.color);
    if (typeof drawPerson === "function") {
      drawPerson(k.x - k.hx * 0.1, k.y - k.hy * 0.1, k.hx, k.hy, { clothes: k.color, skin: "#F1D3B5", hair: "#2B1B12" }, 0, {
        moving: !!k.riding,
        scale: 1.2,
      });
    }
  }
  if (ownMoto && ownMoto.parked) motoLabel(ownMoto.x, ownMoto.y, "ваш " + (player.motoName || "мотик"));
  for (const k of khrustiks) motoLabel(k.x, k.y, k.name);
  if (player.hasMoto && ownMoto && typeof mark === "function") {
    const p = player.vehicle && player.vehicle.kind === "moto" ? player.vehicle : ownMoto;
    mark(null, "mymoto", p.x, p.y, "🏍", player.motoName || "ваш мотик", { arrow: true, color: player.motoColor || "#1f8f4e" });
  }
}

function spawnKhrustiks() {
  if (khrustiks.length || !world.stops || !world.stops.length) return;
  const near = world.stops
    .slice()
    .sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))
    .slice(0, 10);
  KHRUSTIKI.forEach((def, i) => {
    const s = near[i % near.length];
    khrustiks.push({
      name: def.name,
      color: def.color,
      line: def.line,
      x: s.x + (i - 1.5) * 3,
      y: s.y + 2,
      hx: 1,
      hy: 0,
      tx: s.x,
      ty: s.y,
      riding: false,
    });
  });
}

function stepKhrustiks(dt) {
  if (!khrustiks.length || !world.stops) return;
  const slots = motoSlots();
  const near = world.stops.filter((s) => dist(s.x, s.y, player.x, player.y) < 700);
  const pool = near.length > 3 ? near : world.stops;
  khrustiks.forEach((k, i) => {
    k.riding = i < slots;
    if (dist(k.x, k.y, player.x, player.y) > 1100 && pool.length) {
      const s = pool[i % pool.length];
      k.x = s.x;
      k.y = s.y;
      k.tx = s.x;
      k.ty = s.y;
    }
    if (!k.riding) return;
    let dx = k.tx - k.x;
    let dy = k.ty - k.y;
    let L = Math.hypot(dx, dy);
    if (L < 6) {
      const s = pool[Math.floor(Math.random() * pool.length)] || pool[0];
      if (s) {
        k.tx = s.x;
        k.ty = s.y;
      }
      dx = k.tx - k.x;
      dy = k.ty - k.y;
      L = Math.hypot(dx, dy) || 1;
    }
    k.hx = dx / L;
    k.hy = dy / L;
    const step = Math.min(L, 11 * dt);
    k.x += (dx / L) * step;
    k.y += (dy / L) * step;
  });
}

function hookMoto() {
  if (hookMoto.done) return;
  hookMoto.done = true;
  if (typeof drawPlayerWorld === "function") {
    const prev = drawPlayerWorld;
    drawPlayerWorld = function (x, y, hx, hy, veh, persona, t, me) {
      if (veh && veh.kind === "moto") {
        drawMotoSprite(x, y, hx, hy, (veh.color) || player.motoColor || "#1f8f4e");
        if (typeof drawPerson === "function") {
          drawPerson(x - hx * 0.05, y - hy * 0.05, hx, hy, persona, 0, { moving: false, ring: me, scale: 1.15 });
        }
        return;
      }
      return prev(x, y, hx, hy, veh, persona, t, me);
    };
  }
  if (typeof render === "function") {
    const prev = render;
    render = function () {
      prev();
      try {
        drawMotoWorld();
      } catch (e) {}
    };
  }
  if (typeof enterVehicle === "function") {
    const prev = enterVehicle;
    enterVehicle = function (obj) {
      if (obj && obj.kind === "moto" && !motoWeatherOk()) {
        setHint("Снег или гололёд. Мотик стоит под чехлом.");
        return false;
      }
      if (obj && obj.kind === "moto") obj.parked = false;
      return prev(obj);
    };
  }
  if (typeof exitVehicle === "function") {
    const prev = exitVehicle;
    exitVehicle = function () {
      const v = player.vehicle;
      if (v && v.kind === "moto" && ownMoto) {
        ownMoto.x = v.x;
        ownMoto.y = v.y;
        ownMoto.hx = v.hx || 1;
        ownMoto.hy = v.hy || 0;
        ownMoto.parked = true;
        ownMoto.color = v.color || ownMoto.color;
        player.x = v.x + 1.6;
        player.y = v.y + 1.2;
        player.vehicle = null;
        if (typeof updateTripBox === "function") updateTripBox();
        if (typeof addEvent === "function") addEvent("Слезли с мотика. Он остался здесь.");
        return;
      }
      return prev();
    };
  }
  if (typeof findAction === "function") {
    const prev = findAction;
    findAction = function () {
      const a = prev();
      if (player.vehicle) return a;
      if (ownMoto && ownMoto.parked && player.hasMoto) {
        const d = dist(ownMoto.x, ownMoto.y, player.x, player.y);
        if (d < 4.4) {
          return {
            label: motoWeatherOk() ? "Сесть на «" + (player.motoName || "мотик") + "»" : "Мотик стоит: погода не пускает",
            run: () => enterVehicle(ownMoto),
          };
        }
      }
      if (!a) {
        let best = null;
        let bd = 3.6;
        for (const k of khrustiks) {
          const d = dist(k.x, k.y, player.x, player.y);
          if (d < bd) {
            bd = d;
            best = k;
          }
        }
        if (best) return { label: "Поговорить: " + best.name, run: () => setHint(best.name + ": " + best.line) };
      }
      return a;
    };
  }
}

let motoAcc = 0;
setInterval(() => {
  if (typeof world === "undefined" || !world || !world.stops || !player) return;
  if (!hookMoto.done) {
    motoLoad();
    hookMoto();
    mountMotoButton();
    ensureOwnMoto();
    spawnKhrustiks();
  }
  motoAcc += 0.12;
  stepKhrustiks(0.12);
}, 120);
