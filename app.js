/***********************************************************************
 * EverGreen Farm Activity & Expense Tracker
 * FULL Tamil Language — New Add Entry Workflow
 * Normal & Special labourers (no hours)
 * Auto-cost calculation
 * Compatible with your existing HTML + CSS
 ***********************************************************************/

/* -------------------------
   STORAGE KEYS
--------------------------*/
const LS_KEY = "farm_records_v5";
const SETTINGS_KEY = "farm_settings_v5";
const LANG_KEY = "farm_lang_v2";

/* -------------------------
   SHORTCUTS
--------------------------*/
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* -------------------------
   DEFAULT SETTINGS
--------------------------*/
const DEFAULT_SETTINGS = {
  fields: ["Block A", "Block B", "Block C"],

  // Customizable in Settings
  rateNormal: 500,
  rateSpecial: 700,
  currency: "₹",

  // Categories (Tamil included)
  categories: [
    { name: "Weeding", icon: "🌿", color: "#7dd3fc", ta: "களை எடுப்பு" },
    { name: "Fertilizer", icon: "🧪", color: "#86efac", ta: "உரம்" },
    { name: "Pesticide", icon: "🧴", color: "#ffd166", ta: "பூச்சிக்கொல்லி" },
    { name: "Irrigation", icon: "💧", color: "#7cc8ff", ta: "நீர்ப்பாசனம்" },
    { name: "Labour", icon: "🧑‍🌾", color: "#feb2b2", ta: "தொழிலாளர்" },
    { name: "Harvest", icon: "🧺", color: "#d6b4fe", ta: "அறுவடை" },
    { name: "Expense", icon: "₹", color: "#dbe4ee", ta: "செலவு" },
    { name: "Other", icon: "🔧", color: "#cde1ff", ta: "மற்றவை" }
  ],
};

/* -------------------------
   STATE MANAGEMENT
--------------------------*/
const App = {
  mode: "home",
  selectedField: null,
  selectedCategory: null,
};

/* -------------------------
   LOAD/SAVE FUNCTIONS
--------------------------*/
function loadSettings() {
  try {
    return {
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(r) {
  localStorage.setItem(LS_KEY, JSON.stringify(r));
}

/* -------------------------
   UTILS
--------------------------*/
function todayISO() {
  const d = new Date();
  const z = d.getTimezoneOffset() * 60000;
  return new Date(d - z).toISOString().slice(0, 10);
}

function currencyFormat(n) {
  const s = loadSettings();
  return (s.currency || "₹") + Number(n || 0).toFixed(2);
}

function slug(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const ym = new Date().toISOString().slice(0, 7);
  return dateStr.startsWith(ym);
}

/* -------------------------
   100% Tamil UI Translation
--------------------------*/
const i18n = {
  ta: {
    home: "முதன்மை",
    global_dashboard: "மொத்த கணக்குப் பலகை",
    all_records: "அனைத்து பதிவுகள்",
    settings: "அமைப்புகள்",

    back_to_categories: "← பிரிவுகளுக்கு திரும்ப",
    back_to_fields: "← பகுதிகளுக்கு திரும்ப",

    add_entry: "புதிய பதிவு",
    dashboard: "டாஷ்போர்ட்",
    records: "பதிவுகள்",

    date: "தேதி",
    category: "பிரிவு",
    material: "பொருள்",
    qty: "அளவு",
    normal_lab: "இயல்பு தொழிலாளர்கள்",
    special_lab: "சிறப்பு தொழிலாளர்கள்",
    cost: "செலவு",
    notes: "குறிப்புகள்",

    save: "சேமி",
    reset: "மீட்டமை",

    total_cost: "மொத்த செலவு (இந்த மாதம்)",
    entries: "மொத்த பதிவுகள்",
    avg_cost: "ஒரு பதிவிற்கான சராசரி செலவு",

    total: "மொத்தம்",

    normal_rate: "இயல்பு தொழிலாளர் விலை",
    special_rate: "சிறப்பு தொழிலாளர் விலை",
    currency_symbol: "நாணய குறியீடு",

    delete_confirm: "இந்த பதிவை நிச்சயமாக நீக்க வேண்டுமா?"
  },

  en: {}, // fallback English
};

/* -------------------------
   Apply Tamil UI everywhere
--------------------------*/
function t(key) {
  const lang = localStorage.getItem(LANG_KEY) || "en";
  return i18n[lang]?.[key] || i18n["ta"]?.[key] || key;
}

/* Auto-translate all HTML text elements with data-i18n */
function applyTamil() {
  if ((localStorage.getItem(LANG_KEY) || "en") !== "ta") return;

  $$("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (i18n.ta[key]) el.textContent = i18n.ta[key];
  });
}

/* -------------------------
   FORM ELEMENTS (Add Entry)
--------------------------*/
const F = {
  id: $("#entryId"),
  date: $("#date"),
  category: $("#category"),
  material: $("#material"),
  quantity: $("#quantity"),
  normalLab: $("#normalLab"),
  specialLab: $("#specialLab"),
  cost: $("#cost"),
  notes: $("#notes"),
};

/* -------------------------
   AUTO-COST CALCULATION
--------------------------*/
function autoCost() {
  const s = loadSettings();
  const n = Number(F.normalLab.value || 0);
  const sp = Number(F.specialLab.value || 0);

  const calc = n * s.rateNormal + sp * s.rateSpecial;

  $("#autoCostHint").textContent =
    `செலவு = இயல்பு (${n}) × ₹${s.rateNormal} + சிறப்பு (${sp}) × ₹${s.rateSpecial} = ${currencyFormat(calc)}`;

  if (!F.cost.value) F.cost.value = calc.toFixed(2);
}

F.normalLab.addEventListener("input", autoCost);
F.specialLab.addEventListener("input", autoCost);

/* -------------------------
   SAVE ENTRY
--------------------------*/
$("#entryForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const rec = {
    id: F.id.value || crypto.randomUUID(),
    date: F.date.value,
    field: App.selectedField,
    category: App.selectedCategory,

    material: F.material.value.trim(),
    quantity: Number(F.quantity.value || 0),

    normalLab: Number(F.normalLab.value || 0),
    specialLab: Number(F.specialLab.value || 0),

    cost: Number(F.cost.value || 0),
    notes: F.notes.value.trim(),

    createdAt: Date.now(),
  };

  if (!rec.date || !rec.field || !rec.category) {
    alert("தேதி, பகுதி, பிரிவு ஆகியவை அவசியம்!");
    return;
  }

  const list = loadRecords();
  const idx = list.findIndex((x) => x.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.push(rec);

  saveRecords(list);
  renderCategoryDash();
  renderCategoryTable();

  $("#resetBtn").click();
  setSubtab("catRecords");
});

/* -------------------------
   RESET FORM
--------------------------*/
$("#resetBtn").addEventListener("click", () => {
  F.id.value = "";
  F.date.value = todayISO();
  F.material.value = "";
  F.quantity.value = "";
  F.normalLab.value = "";
  F.specialLab.value = "";
  F.cost.value = "";
  F.notes.value = "";
  $("#autoCostHint").textContent = "";
});

/* -------------------------
   CHANGE LANGUAGE
--------------------------*/
$("#langSelect").value = localStorage.getItem(LANG_KEY) || "en";
$("#langSelect").addEventListener("change", () => {
  localStorage.setItem(LANG_KEY, $("#langSelect").value);
  applyTamil();
});

/* -------------------------
   CATEGORY TABLE
--------------------------*/
function renderCategoryTable() {
  const tbody = $("#recordsTable tbody");
  tbody.innerHTML = "";

  let list = loadRecords().filter(
    (r) => r.field === App.selectedField && r.category === App.selectedCategory
  );

  const from = $("#filterFrom").value;
  const to = $("#filterTo").value;
  const q = ($("#filterSearch").value || "").toLowerCase();

  list = list.filter((r) => {
    const okRange = (!from || r.date >= from) && (!to || r.date <= to);
    const hay = [r.material, r.notes].join(" ").toLowerCase();
    return okRange && (!q || hay.includes(q));
  });

  list.sort(
    (a, b) =>
      (b.date || "").localeCompare(a.date || "") || b.createdAt - a.createdAt
  );

  let total = 0;

  list.forEach((r) => {
    total += r.cost || 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.category}</td>
      <td>${r.field}</td>
      <td>${r.material || ""}</td>
      <td>${r.quantity || ""}</td>
      <td>${r.normalLab || 0}</td>
      <td>${r.specialLab || 0}</td>
      <td>${currencyFormat(r.cost)}</td>
      <td>${r.notes || ""}</td>
      <td><button class="danger" data-id="${r.id}" data-action="del">DEL</button></td>
    `;
    tbody.appendChild(tr);
  });

  $("#tableTotal").textContent = currencyFormat(total);

  tbody.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.id;
      const list = loadRecords();
      const idx = list.findIndex((r) => r.id === id);
      if (idx < 0) return;

      if (confirm(t("delete_confirm"))) {
        list.splice(idx, 1);
        saveRecords(list);
        renderCategoryTable();
        renderCategoryDash();
      }
    });
  });
}

/* -------------------------
   SIMPLE DASHBOARD (Category)
--------------------------*/
function renderCategoryDash() {
  const list = loadRecords().filter(
    (r) => r.field === App.selectedField && r.category === App.selectedCategory
  );

  const month = list.filter((r) => isThisMonth(r.date));
  const total = month.reduce((s, r) => s + (r.cost || 0), 0);

  $("#catTotalCost").textContent = currencyFormat(total);
  $("#catEntryCount").textContent = month.length;
  $("#catAvgCost").textContent = currencyFormat(
    month.length ? total / month.length : 0
  );
}

/* -------------------------
   FIELD & CATEGORY VIEW (Home Navigation)
--------------------------*/
$("#backToHome").addEventListener("click", () => switchTab("homeTiles"));
$("#backToField").addEventListener("click", () => {
  switchTab("fieldView");
});

function switchTab(id) {
  $$(".tab").forEach((t) => t.classList.remove("active"));
  $("#" + id).classList.add("active");

  $$(".tab-btn").forEach((b) => b.classList.remove("active"));
  const btn = Array.from($$(".tab-btn")).find((b) => b.dataset.tab === id);
  if (btn) btn.classList.add("active");
}

function setSubtab(id) {
  $$(".subtab").forEach((t) => t.classList.remove("active"));
  $("#" + id).classList.add("active");

  $$(".subtab-btn").forEach((b) => b.classList.remove("active"));
  const btn = Array.from($$(".subtab-btn")).find(
    (b) => b.dataset.subtab === id
  );
  if (btn) btn.classList.add("active");
}

/* -------------------------
   HOME TILES (Fields)
--------------------------*/
function renderHome() {
  const s = loadSettings();
  const wrap = $("#fieldsGrid");
  wrap.innerHTML = "";

  s.fields.forEach((field) => {
    const monthRecs = loadRecords().filter(
      (r) => r.field === field && isThisMonth(r.date)
    );
    const t = monthRecs.reduce((s, r) => s + (r.cost || 0), 0);

    const div = document.createElement("div");
    div.className = "tile";
    div.innerHTML = `
      <div class="t-name">${field}</div>
      <div class="t-sub">${currencyFormat(t)} – ${monthRecs.length} பதிவுகள்</div>
      <div class="t-icon">🏷️</div>
    `;
    div.addEventListener("click", () => openField(field));
    wrap.appendChild(div);
  });
}

function openField(field) {
  App.selectedField = field;
  $("#crumbField").textContent = field;
  $("#fieldNameLabel").textContent = field;
  switchTab("fieldView");
  renderFieldCategories();
}

/* -------------------------
   CATEGORY TILES (Inside Field)
--------------------------*/
function renderFieldCategories() {
  const s = loadSettings();
  const wrap = $("#categoriesGrid");
  wrap.innerHTML = "";

  s.categories.forEach((cat) => {
    const monthRecs = loadRecords().filter(
      (r) =>
        r.field === App.selectedField &&
        r.category === cat.name &&
        isThisMonth(r.date)
    );
    const t = monthRecs.reduce((s, r) => s + (r.cost || 0), 0);

    const div = document.createElement("div");
    div.className = "tile";
    div.style.borderColor = shade(cat.color, -25);
    div.innerHTML = `
      <div class="t-name">${cat.icon} ${cat.ta}</div>
      <div class="t-sub" style="
        background:${cat.color}22;
        border:1px solid ${shade(cat.color, -20)};
        padding:4px 8px;
        display:inline-block;
        border-radius:999px;">
        ${currencyFormat(t)}
      </div>
    `;
    div.addEventListener("click", () => openCategory(App.selectedField, cat.name));
    wrap.appendChild(div);
  });
}

function openCategory(field, category) {
  App.selectedField = field;
  App.selectedCategory = category;

  $("#crumbField2").textContent = field;

  const s = loadSettings();
  const cat = s.categories.find((c) => c.name === category);
  $("#crumbCategory").textContent = cat ? cat.ta : category;

  $("#category").value = cat ? cat.ta : category;
  F.date.value = todayISO();

  switchTab("categoryView");
  setSubtab("catDash");

  renderCategoryDash();
  renderCategoryTable();
}

/* -------------------------
   GLOBAL DASHBOARD
--------------------------*/
function renderGlobalDash() {
  const list = loadRecords().filter((r) => isThisMonth(r.date));
  const total = list.reduce((s, r) => s + (r.cost || 0), 0);

  $("#gTotal").textContent = currencyFormat(total);
  $("#gCount").textContent = list.length;

  const byCat = {};
  list.forEach((r) => (byCat[r.category] = (byCat[r.category] || 0) + r.cost));

  const s = loadSettings();
  const wrap = $("#gByCat");
  wrap.innerHTML = "";

  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  $("#gTopCat").textContent =
    sorted.length > 0 ? sorted[0][0] + " (" + currencyFormat(sorted[0][1]) + ")" : "—";

  sorted.forEach(([catName, val]) => {
    const cat = s.categories.find((c) => c.name === catName);
    const chip = document.createElement("span");
    chip.className = "chip-cat";
    chip.style.background = "#0b1430";
    chip.style.borderColor = shade(cat.color, -20);
    chip.innerHTML = `
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cat.color};margin-right:6px"></span>
      ${cat.ta}: ${currencyFormat(val)}
    `;
    wrap.appendChild(chip);
  });
}

/* -------------------------
   ALL RECORDS
--------------------------*/
function renderAllRecords() {
  const s = loadSettings();

  $("#aCat").innerHTML =
    `<option value="">அனைத்தும்</option>` +
    s.categories.map((c) => `<option>${c.ta}</option>`).join("");

  $("#aField").innerHTML =
    `<option value="">அனைத்து பகுதிகள்</option>` +
    s.fields.map((f) => `<option>${f}</option>`).join("");

  const tbody = $("#allTable tbody");
  tbody.innerHTML = "";

  const from = $("#aFrom").value;
  const to = $("#aTo").value;
  const q = ($("#aQ").value || "").toLowerCase();
  const catTa = $("#aCat").value;
  const fieldSel = $("#aField").value;

  const catEng = s.categories.find((c) => c.ta === catTa)?.name;

  let list = loadRecords();

  list = list.filter((r) => {
    const okDate = (!from || r.date >= from) && (!to || r.date <= to);
    const okCat = !catEng || r.category === catEng;
    const okField = !fieldSel || r.field === fieldSel;
    const hay = [r.material, r.notes, r.category, r.field].join(" ").toLowerCase();
    return okDate && okCat && okField && (!q || hay.includes(q));
  });

  list.sort(
    (a, b) =>
      (b.date || "").localeCompare(a.date || "") || b.createdAt - a.createdAt
  );

  list.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${s.categories.find((c) => c.name === r.category)?.ta || r.category}</td>
      <td>${r.field}</td>
      <td>${r.material}</td>
      <td>${r.quantity}</td>
      <td>${r.normalLab || 0}</td>
      <td>${r.specialLab || 0}</td>
      <td>${currencyFormat(r.cost)}</td>
      <td>${r.notes}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* -------------------------
   INITIAL LOAD
--------------------------*/
(function init() {
  if (!localStorage.getItem(SETTINGS_KEY)) saveSettings(DEFAULT_SETTINGS);

  applyTamil();
  renderHome();
  renderGlobalDash();
  renderAllRecords();
})();
