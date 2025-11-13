// Metals Planner logic new
// Manual dark/light toggle (option B)

const baseConfig = {
  gold: {
    holdings: 0.335,
    avg: 2928,
    price: 2929,
    buyStrong: 2870,
    buyLightLow: 2870,
    buyLightHigh: 2900,
    trimsCons: [
      { price: 3050, pct: 20 },
      { price: 3120, pct: 20 },
      { price: 3200, pct: 20 }
    ],
    trimsAggro: [
      { price: 3040, pct: 25 },
      { price: 3100, pct: 25 },
      { price: 3180, pct: 25 }
    ]
  },
  silver: {
    holdings: 23.6,
    avg: 37.6,
    price: 37.6,
    buyStrong: 35.0,
    buyLightLow: 35.0,
    buyLightHigh: 38.0,
    trimsCons: [
      { price: 41.0, pct: 20 },
      { price: 43.0, pct: 20 },
      { price: 45.0, pct: 20 }
    ],
    trimsAggro: [
      { price: 40.0, pct: 25 },
      { price: 42.0, pct: 25 },
      { price: 44.0, pct: 25 }
    ]
  }
};

let currentMode = "cons"; // cons or aggro

function qs(id) {
  return document.getElementById(id);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("metalsState"));
    if (!saved) return;
    currentMode = saved.mode || "cons";
    if (saved.gold) Object.assign(baseConfig.gold, saved.gold);
    if (saved.silver) Object.assign(baseConfig.silver, saved.silver);
    if (saved.theme === "light") document.body.classList.add("light");
  } catch (_) {}
}

function saveState() {
  const state = {
    mode: currentMode,
    theme: document.body.classList.contains("light") ? "light" : "dark",
    gold: {
      holdings: parseFloat(qs("goldHold").value) || 0,
      avg: parseFloat(qs("goldAvg").value) || 0,
      price: parseFloat(qs("goldPrice").value) || 0
    },
    silver: {
      holdings: parseFloat(qs("silverHold").value) || 0,
      avg: parseFloat(qs("silverAvg").value) || 0,
      price: parseFloat(qs("silverPrice").value) || 0
    }
  };
  localStorage.setItem("metalsState", JSON.stringify(state));
}

function formatJOD(v) {
  if (isNaN(v)) return "—";
  return v.toFixed(1) + " JOD";
}

function formatPct(v) {
  if (isNaN(v)) return "—";
  return v.toFixed(2) + " %";
}

function updateAsset(assetKey) {
  const cfg = baseConfig[assetKey];
  const holdInput = qs(assetKey + "Hold");
  const avgInput = qs(assetKey + "Avg");
  const priceInput = qs(assetKey + "Price");
  const prevInput = qs(assetKey + "Prev");

  const hold = parseFloat(holdInput.value) || 0;
  const avg = parseFloat(avgInput.value) || 0;
  const price = parseFloat(priceInput.value) || 0;
  const prev = parseFloat(prevInput?.value) || null;

  const cost = hold * avg;
  const value = hold * price;
  const pl = value - cost;
  const plPct = cost > 0 ? (pl / cost) * 100 : 0;

  qs(assetKey + "Value").value = value ? value.toFixed(1) : "";

  qs(assetKey + "Cost").textContent = formatJOD(cost);
  const plNode = qs(assetKey + "PL");
  const plPctNode = qs(assetKey + "PLPct");

  plNode.textContent = formatJOD(pl);
  plPctNode.textContent = formatPct(plPct);

  plNode.classList.remove("value-green", "value-red");
  plPctNode.classList.remove("value-green", "value-red");
  if (pl > 0) {
    plNode.classList.add("value-green");
    plPctNode.classList.add("value-green");
  } else if (pl < 0) {
    plNode.classList.add("value-red");
    plPctNode.classList.add("value-red");
  }

  // status
  const statusEl = qs(assetKey + "Status");
  const dot = statusEl.querySelector(".status-dot");
  let text = "";
  if (price <= cfg.buyStrong) {
    dot.className = "status-dot buy";
    text = "STRONG BUY zone";
  } else if (price <= cfg.buyLightHigh && price >= cfg.buyLightLow) {
    dot.className = "status-dot buy";
    text = "Light buy / average-down";
  } else {
    const trims = currentMode === "cons" ? cfg.trimsCons : cfg.trimsAggro;
    const hit = trims.find(t => price >= t.price);
    if (hit) {
      dot.className = "status-dot sell";
      text = `Trim zone @ ${hit.price} JOD`;
    } else {
      dot.className = "status-dot hold";
      text = "HOLD – between buy & trims";
    }
  }
  statusEl.lastElementChild.textContent = text;

  // 24h move
  if (prev && price) {
    const change = ((price - prev) / prev) * 100;
    const moveId = assetKey + "Move";
    const moveStatusId = assetKey + "MoveStatus";
    qs(moveId).value = change.toFixed(2) + " %";

    const statusText = qs(moveStatusId);
    let msg = "Big move status: ";
    if (Math.abs(change) >= 5) {
      msg += `⚡ ${change > 0 ? "UP" : "DOWN"} > 5% – check trims / buys`;
    } else {
      msg += "Calm – inside normal daily range";
    }
    statusText.innerHTML = msg;
  }

  // trim ladder
  const bodyId = assetKey === "gold" ? "goldTrimBody" : "silverTrimBody";
  const body = qs(bodyId);
  body.innerHTML = "";
  const trims = currentMode === "cons" ? cfg.trimsCons : cfg.trimsAggro;
  trims.forEach(t => {
    const qty = hold * (t.pct / 100);
    const profit = (t.price - avg) * qty;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>@ ${t.price.toFixed(1)}</td>
      <td>${t.pct}%</td>
      <td>${qty.toFixed(3)}</td>
      <td class="${profit >= 0 ? "value-green" : "value-red"}">
        ${formatJOD(profit)}
      </td>
    `;
    body.appendChild(tr);
  });

  updatePortfolio();
}

function updatePortfolio() {
  const gHold = parseFloat(qs("goldHold").value) || 0;
  const gAvg = parseFloat(qs("goldAvg").value) || 0;
  const gPrice = parseFloat(qs("goldPrice").value) || 0;
  const sHold = parseFloat(qs("silverHold").value) || 0;
  const sAvg = parseFloat(qs("silverAvg").value) || 0;
  const sPrice = parseFloat(qs("silverPrice").value) || 0;

  const gCost = gHold * gAvg;
  const gVal = gHold * gPrice;
  const sCost = sHold * sAvg;
  const sVal = sHold * sPrice;

  const totalCost = gCost + sCost;
  const totalVal = gVal + sVal;
  const totalPL = totalVal - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  qs("pfTotalValue").textContent = formatJOD(totalVal);
  qs("pfTotalCost").textContent = formatJOD(totalCost);

  const pfNode = qs("pfTotalPL");
  pfNode.textContent = `${formatJOD(totalPL)} (${formatPct(totalPLPct)})`;
  pfNode.classList.remove("value-green", "value-red");
  if (totalPL > 0) pfNode.classList.add("value-green");
  else if (totalPL < 0) pfNode.classList.add("value-red");
}

function applyConfigToInputs() {
  qs("goldHold").value = baseConfig.gold.holdings;
  qs("goldAvg").value = baseConfig.gold.avg;
  qs("goldPrice").value = baseConfig.gold.price;

  qs("silverHold").value = baseConfig.silver.holdings;
  qs("silverAvg").value = baseConfig.silver.avg;
  qs("silverPrice").value = baseConfig.silver.price;
}

function setupThemeToggle() {
  const btn = document.getElementById("themeToggle");
  btn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    saveState();
  });
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const asset = tab.dataset.asset;
      document.getElementById("goldPanel").style.display =
        asset === "gold" ? "block" : "none";
      document.getElementById("silverPanel").style.display =
        asset === "silver" ? "block" : "none";
    });
  });
}

function setupModeToggle() {
  const btns = document.querySelectorAll("#modeToggle .mode-btn");
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      qs("goldModeLabel").textContent =
        "Mode: " + (currentMode === "cons" ? "Cons." : "Aggro");
      qs("silverModeLabel").textContent =
        "Mode: " + (currentMode === "cons" ? "Cons." : "Aggro");
      updateAsset("gold");
      updateAsset("silver");
      saveState();
    });
  });
}

function setupInputs() {
  [
    "goldHold",
    "goldAvg",
    "goldPrice",
    "goldPrev",
    "silverHold",
    "silverAvg",
    "silverPrice",
    "silverPrev"
  ].forEach(id => {
    const el = qs(id);
    if (!el) return;
    el.addEventListener("input", () => {
      updateAsset("gold");
      updateAsset("silver");
      saveState();
    });
  });
}

function init() {
  loadState();
  setupThemeToggle();
  setupTabs();
  setupModeToggle();
  applyConfigToInputs();
  setupInputs();
  updateAsset("gold");
  updateAsset("silver");
}

document.addEventListener("DOMContentLoaded", init);
