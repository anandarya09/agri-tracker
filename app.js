// ===== Keys =====
const LS_KEY = 'farm_records_v2';
const SETTINGS_KEY = 'farm_settings_v1';
const LANG_KEY = 'farm_lang_v1';

// ===== Helpers =====
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const DEFAULT_SETTINGS = {
  plots: ['Kamaktchi 3 Acre','Paravakadu 2 Acre','Block C'],
  wagePerHour: 600,
  currency: '₹',
  templates: [
    { name: 'Weeding - Labour (4 people, 6 hrs)', category:'Labour', activity:'Weeding', material:'', quantity:6, unit:'hrs', laborers:4, hours:6, cost:'' },
    { name: 'Fertilizer - Urea 50 kg', category:'Fertilizer', activity:'Basal application', material:'Urea', quantity:50, unit:'kg', laborers:0, hours:0, cost:'' },
    { name: 'Pesticide - Neem oil spray 2 L', category:'Pesticide', activity:'Foliar spray', material:'Neem oil', quantity:2, unit:'L', laborers:0, hours:0, cost:'' },
    { name: 'Irrigation - Drip running 5 hrs', category:'Irrigation', activity:'Drip irrigation', material:'', quantity:5, unit:'hrs', laborers:0, hours:5, cost:'' },
    { name: 'Harvest - Green cardamom 25 kg', category:'Harvest', activity:'Harvesting', material:'Green pods', quantity:25, unit:'kg', laborers:0, hours:0, cost:'' },
    { name: 'Expense - Spare parts', category:'Expense', activity:'Pump maintenance', material:'Spare parts', quantity:1, unit:'', laborers:0, hours:0, cost:'' },
  ]
};

// Storage
const loadSettings = () => { try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY))||{}) }; } catch { return DEFAULT_SETTINGS; } };
const saveSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
const loadRecords  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } };
const saveRecords  = (recs) => localStorage.setItem(LS_KEY, JSON.stringify(recs));

// Currency
function currency(n){ const s = loadSettings(); const v = Number(n||0); return (s.currency||'₹') + v.toFixed(2); }
function todayISO(){ const d=new Date(); const tz=d.getTimezoneOffset()*60000; return new Date(d-tz).toISOString().slice(0,10); }

// i18n (kept for placeholders/hints only; does NOT override title/h1)
const i18n = {
  en: { edit_entry:'Edit Entry', update:'Update', confirm_delete:'Delete this entry?', restore_complete:'Restore complete!', restore_failed:'Failed to restore: ', wage_hint:'Used to auto-calc Labour cost: labourers × hours × rate' },
  kn: { edit_entry:'ದಾಖಲೆ ಸಂಪಾದನೆ', update:'ನವೀಕರಿಸಿ', confirm_delete:'ಈ ದಾಖಲೆಯನ್ನು ಅಳಿಸಬೇಕೇ?', restore_complete:'ಮರುಸ್ಥಾಪನೆ ಪೂರ್ಣಗೊಂಡಿದೆ!', restore_failed:'ಮರುಸ್ಥಾಪನೆ ವಿಫಲವಾಗಿದೆ: ', wage_hint:'ಕಾರ್ಮಿಕರು × ಗಂಟೆಗಳು × ದರ ಆಧರಿಸಿ ವೆಚ್ಚ ಲೆಕ್ಕ' },
  ta: { edit_entry:'பதிவை திருத்து', update:'புதுப்பிக்க', confirm_delete:'இந்த பதிவை நீக்கவா?', restore_complete:'மீட்டெடுத்தல் முடிந்தது!', restore_failed:'மீட்டெடுக்க முடியவில்லை: ', wage_hint:'தொழிலாளர்கள் × மணி × விகிதம் அடிப்படையில் செலவு கணக்கிடப்படும்' }
};
function getLang(){ return localStorage.getItem(LANG_KEY) || 'en'; }
function setLang(l){ localStorage.setItem(LANG_KEY, l); }

// Apply only placeholders (avoid overriding custom title)
function applyI18n() {
  const lang = getLang();
  $('#plot')?.setAttribute('placeholder', lang==='kn'?'ಬ್ಲಾಕ್ A': lang==='ta'?'பிளாக் A':'Block A');
  $('#activity')?.setAttribute('placeholder', lang==='kn'?'ನಿರಲೆ': lang==='ta'?'களை எடுப்பு':'Weeding');
  $('#material')?.setAttribute('placeholder', lang==='kn'?'ಯೂರಿಯಾ / ಮ್ಯಾಂಕೋಜೆಬ್': lang==='ta'?'யூரியா / மாங்கோசெப்':'Urea / Mancozeb');
}

// Tabs
$$('.tab-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    $$('.tab-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    $$('.tab').forEach(t=>t.classList.remove('active'));
    $('#'+b.dataset.tab).classList.add('active');
  });
});

// Language select
const langSelect = $('#langSelect');
langSelect.value = getLang();
langSelect.addEventListener('change', ()=>{ setLang(langSelect.value); applyI18n(); });

// Form
const form = $('#entryForm');
const fields = {
  id: $('#entryId'), date: $('#date'), category: $('#category'), plot: $('#plot'),
  activity: $('#activity'), material: $('#material'), quantity: $('#quantity'),
  unit: $('#unit'), laborers: $('#laborers'), hours: $('#hours'),
  cost: $('#cost'), notes: $('#notes')
};
fields.date.value = todayISO();

$('#resetBtn').addEventListener('click', ()=>{
  form.reset(); fields.id.value=''; fields.date.value=todayISO();
  $('#saveBtn').textContent='Save';
});

function autoCostHint(){
  const s = loadSettings();
  const dict = i18n[getLang()] || i18n.en;
  if ((fields.category.value||'') === 'Labour') {
    const lab = Number(fields.laborers.value||0);
    const hrs = Number(fields.hours.value||0);
    const rate = Number(s.wagePerHour||0);
    if (lab>0 && hrs>0 && rate>0) {
      const calc = lab*hrs*rate;
      $('#autoCostHint').textContent = `${dict.wage_hint} = ${lab}×${hrs}×${rate} = ${currency(calc)}`;
      if (!fields.cost.value) fields.cost.value = calc.toFixed(2);
    } else { $('#autoCostHint').textContent=''; }
  } else { $('#autoCostHint').textContent=''; }
}
['input','change'].forEach(ev=>{
  fields.category.addEventListener(ev, autoCostHint);
  fields.laborers.addEventListener(ev, autoCostHint);
  fields.hours.addEventListener(ev, autoCostHint);
});

form.addEventListener('submit',(e)=>{
  e.preventDefault();
  const rec = {
    id: fields.id.value || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    date: fields.date.value, category: fields.category.value,
    plot: fields.plot.value.trim(), activity: fields.activity.value.trim(),
    material: fields.material.value.trim(), quantity: parseFloat(fields.quantity.value||0),
    unit: fields.unit.value.trim(), laborers: parseInt(fields.laborers.value||0),
    hours: parseFloat(fields.hours.value||0), cost: parseFloat(fields.cost.value||0),
    notes: fields.notes.value.trim(), createdAt: Date.now()
  };
  if (!rec.date || !rec.category) { alert('Date & Category required'); return; }
  const list = loadRecords();
  const idx = list.findIndex(r=>r.id===rec.id);
  if (idx>=0) list[idx]=rec; else list.push(rec);
  saveRecords(list);
  renderDashboard(); renderTable();
  $('#resetBtn').click();
  document.querySelector('[data-tab="records"]').click();
});

// Filters
const filter = { from: $('#filterFrom'), to: $('#filterTo'), category: $('#filterCategory'), search: $('#filterSearch') };
[filter.from, filter.to, filter.category, filter.search].forEach(el => el.addEventListener('input', renderTable));

function inRange(d,f,t){ if (f && d < f) return false; if (t && d > t) return false; return true; }

// ===== Category → CSS class helpers =====
const CAT_CLASS = {
  Labour: 'labour',
  Fertilizer: 'fertilizer',
  Pesticide: 'pesticide',
  Irrigation: 'irrigation',
  Harvest: 'harvest',
  Expense: 'expense',
  Other: 'other'
};
function catNameToClass(name){ return CAT_CLASS[name] || 'other'; }

// Dashboard
function renderDashboard(){
  const list = loadRecords();
  const ym = new Date().toISOString().slice(0,7);
  const month = list.filter(r => (r.date||'').startsWith(ym));
  const total = month.reduce((s,r)=>s+(r.cost||0),0);
  $('#totalCost').textContent = currency(total);
  $('#entryCount').textContent = String(month.length);

  const byCat = month.reduce((a,r)=>{ const k=r.category||'Other'; a[k]=(a[k]||0)+(r.cost||0); return a; },{});
  const wrap = $('#byCategory'); wrap.innerHTML='';
  Object.entries(byCat)
    .sort((a,b)=>b[1]-a[1])
    .forEach(([k,v])=>{
      const span = document.createElement('span');
      span.className = `chip-cat chip-${catNameToClass(k)}`;
      span.textContent = `${k}: ${currency(v)}`;
      wrap.appendChild(span);
    });
}

// Table
function renderTable(){
  const tbody = $('#recordsTable tbody'); tbody.innerHTML='';
  let list = loadRecords();
  list = list.filter(r=>{
    const okDate = inRange(r.date||'', filter.from.value||'', filter.to.value||'');
    const okCat  = !filter.category.value || r.category === filter.category.value;
    const q = (filter.search.value||'').toLowerCase();
    const hay = [r.plot,r.activity,r.material,r.notes].join(' ').toLowerCase();
    const okText = !q || hay.includes(q);
    return okDate && okCat && okText;
  });
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||'') || b.createdAt-a.createdAt);

  let total = 0;
  const dict = i18n[getLang()] || i18n.en;
  list.forEach(r=>{
    total += (r.cost||0);
    const catCls = catNameToClass(r.category||'Other');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date||''}</td>
      <td>
        <span class="chip-cat chip-${catCls}">
          <span class="dot ${catCls}"></span>
          ${r.category||''}
        </span>
      </td>
      <td>${r.plot||''}</td>
      <td><strong>${r.activity||''}</strong>${r.material? ' / '+r.material:''}</td>
      <td>${r.quantity||''}</td>
      <td>${r.unit||''}</td>
      <td>${r.laborers||''}</td>
      <td>${r.hours||''}</td>
      <td>${r.cost? currency(r.cost):''}</td>
      <td>${r.notes||''}</td>
      <td class="row-actions">
        <button class="btn small secondary" data-action="edit" data-id="${r.id}">${dict.edit_entry}</button>
        <button class="btn small danger" data-action="del" data-id="${r.id}">DEL</button>
      </td>`;
    tbody.appendChild(tr);
  });
  $('#tableTotal').textContent = currency(total);

  // actions
  tbody.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      let list = loadRecords();
      const idx = list.findIndex(r=>r.id===id); if (idx<0) return;
      if (btn.dataset.action==='edit'){
        const r = list[idx];
        fields.id.value=r.id; fields.date.value=r.date||todayISO(); fields.category.value=r.category||'';
        fields.plot.value=r.plot||''; fields.activity.value=r.activity||''; fields.material.value=r.material||'';
        fields.quantity.value=r.quantity||''; fields.unit.value=r.unit||''; fields.laborers.value=r.laborers||'';
        fields.hours.value=r.hours||''; fields.cost.value=r.cost||''; fields.notes.value=r.notes||'';
        $('#saveBtn').textContent = (i18n[getLang()]||i18n.en).update;
        document.querySelector('[data-tab="add"]').click();
      } else if (btn.dataset.action==='del'){
        if (confirm((i18n[getLang()]||i18n.en).confirm_delete)) {
          list.splice(idx,1); saveRecords(list); renderDashboard(); renderTable();
        }
      }
    });
  });
}

// Export / Import
function toCSV(records){
  const cols = ['date','category','plot','activity','material','quantity','unit','laborers','hours','cost','notes'];
  const esc = (v)=>{ if(v==null) return ''; const s=String(v).replace(/"/g,'""'); return `"${s}"`; };
  const lines = [cols.join(',')];
  records.forEach(r=> lines.push(cols.map(c=>esc(r[c])).join(',')));
  return lines.join('\n');
}
function download(filename, content, type='text/plain'){
  const blob = new Blob([content], {type}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}
$('#exportCsvBtn').addEventListener('click', ()=> download(`farm-records-${new Date().toISOString().slice(0,10)}.csv`, toCSV(loadRecords()), 'text/csv'));
$('#exportJsonBtn').addEventListener('click', ()=> download(`farm-records-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(loadRecords(),null,2), 'application/json'));
$('#importJsonInput').addEventListener('change', async (e)=>{
  const file = e.target.files?.[0]; if (!file) return;
  const text = await file.text();
  try{
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Invalid backup file');
    const current = loadRecords();
    const map = new Map(current.map(r=>[r.id, r]));
    data.forEach(r=>{
      const nid = r.id || (crypto.randomUUID? crypto.randomUUID(): String(Date.now()+Math.random()));
      map.set(nid, { ...map.get(r.id), ...r, id:nid });
    });
    saveRecords(Array.from(map.values()));
    alert((i18n[getLang()]||i18n.en).restore_complete);
    renderDashboard(); renderTable();
  }catch(err){
    alert((i18n[getLang()]||i18n.en).restore_failed + err.message);
  }finally{ e.target.value=''; }
});

// Settings
function renderSettings(){
  const s = loadSettings();
  $('#settingsPlots').value = (s.plots||[]).join(', ');
  $('#settingsWage').value = s.wagePerHour || '';
  $('#settingsCurrency').value = s.currency || '₹';

  // datalist
  const dl = $('#plotsList'); dl.innerHTML='';
  (s.plots||[]).forEach(p=>{ const o=document.createElement('option'); o.value=p; dl.appendChild(o); });

  // templates
  const tsel = $('#templateSelect'); tsel.innerHTML='';
  (s.templates||[]).forEach((t,i)=>{ const o=document.createElement('option'); o.value=String(i); o.textContent=t.name; tsel.appendChild(o); });
}
$('#saveSettingsBtn').addEventListener('click', ()=>{
  const plots = $('#settingsPlots').value.split(',').map(s=>s.trim()).filter(Boolean);
  const wage  = Number($('#settingsWage').value||0);
  const cur   = ($('#settingsCurrency').value||'₹').trim().slice(0,3);
  const s = loadSettings(); s.plots=plots; s.wagePerHour=wage; s.currency=cur; saveSettings(s);
  renderSettings(); applyI18n(); alert('Saved');
});
$('#applyTemplateBtn').addEventListener('click', ()=>{
  const s = loadSettings(); const idx = Number($('#templateSelect').value||0);
  const t = (s.templates||[])[idx]; if (!t) return;
  fields.category.value=t.category||''; fields.activity.value=t.activity||''; fields.material.value=t.material||'';
  fields.quantity.value=t.quantity||''; fields.unit.value=t.unit||''; fields.laborers.value=t.laborers||'';
  fields.hours.value=t.hours||''; fields.cost.value=t.cost||'';
  autoCostHint();
});

// Small style helpers
const style = document.createElement('style');
style.textContent = `
.badge{display:inline-block;margin:4px 6px 0 0;padding:6px 10px;border-radius:999px;background:#07142a;border:1px solid #213159;color:#cfe0ff}
.tag{display:inline-block;padding:3px 8px;border-radius:999px;background:#15234a;border:1px solid #2a3b66}
`;
document.head.appendChild(style);

// Init
(function init(){
  if (!localStorage.getItem(SETTINGS_KEY)) saveSettings(DEFAULT_SETTINGS);
  applyI18n();
  renderSettings();
  renderDashboard();
  renderTable();
})();
