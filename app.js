// app.js (ES module)
import { saveRecord, deleteRecord } from './firebase.js';

/*** Keys & storage ***/
const LS_KEY = 'farm_records_v5';      // legacy local cache (fallback only)
const SETTINGS_KEY = 'farm_settings_v4';
const LANG_KEY = 'farm_lang_v1';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/*** Defaults ***/
const DEFAULT_FIELDS = ['Block A','Block B','Block C'];
const DEFAULT_CATEGORIES = [
  { name:'Weeding',   icon:'🌿',  color:'#7dd3fc' },
  { name:'Fertilizer',icon:'🧪',  color:'#86efac' },
  { name:'Pesticide', icon:'🧴',  color:'#ffd166' },
  { name:'Irrigation',icon:'💧',  color:'#7cc8ff' },
  { name:'Labour',    icon:'👩‍🌾', color:'#feb2b2' },
  { name:'Harvest',   icon:'🧺',  color:'#d6b4fe' },
  { name:'Expense',   icon:'₹',   color:'#dbe4ee' },
  { name:'Other',     icon:'🔧',  color:'#cde1ff' },
];
const DEFAULT_SETTINGS = {
  fields: [...DEFAULT_FIELDS],
  categories: [...DEFAULT_CATEGORIES],
  rateNormal: 500,
  rateSpecial: 700,
  currency: '₹',
};

/*** State ***/
const App = {
  mode: 'homeTiles',
  selectedField: null,
  selectedCategory: null,
  cloudRows: [],  // get filled from firebase.js via document event
};

/*** Storage helpers ***/
function loadSettings(){
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')) }; }
  catch { return DEFAULT_SETTINGS; }
}
function saveSettings(s){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
// Prefer cloud rows; fallback to legacy cache
function loadRecords(){
  if (Array.isArray(App.cloudRows) && App.cloudRows.length) {
    return App.cloudRows.map(x => ({ id: x.id, ...x.d }));
  }
  try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch { return []; }
}
function saveRecords(r){ if (!Array.isArray(App.cloudRows) || App.cloudRows.length===0) localStorage.setItem(LS_KEY, JSON.stringify(r)); }

/*** Intl currency ***/
function currentLocale(){
  const lang = getLang();
  return lang==='ta' ? 'ta-IN' : (lang==='kn' ? 'kn-IN' : 'en-IN');
}
function currencyFmt(){
  // Default to INR narrow symbol; you still can display custom symbol from settings if you want.
  return new Intl.NumberFormat(currentLocale(), { style:'currency', currency:'INR', currencyDisplay:'narrowSymbol' });
}
function currency(n){
  const fmt = currencyFmt();
  return fmt.format(Number(n||0));
}

/*** Utils ***/
function todayISO(){ const d=new Date(); const z=d.getTimezoneOffset()*60000; return new Date(d-z).toISOString().slice(0,10); }
function sumCost(list){ return list.reduce((s,r)=> s + (Number(r.cost)||0), 0); }
function isThisMonth(dateStr){ if (!dateStr) return false; const ym=new Date().toISOString().slice(0,7); return String(dateStr).startsWith(ym); }
function inRange(d,f,t){ if (f && d<f) return false; if (t && d>t) return false; return true; }
function shade(hex, amt){ let c=hex.replace('#',''); if(c.length===3) c=c.split('').map(x=>x+x).join(''); const num=parseInt(c,16);
  let r=(num>>16)+amt,g=((num>>8)&0x00FF)+amt,b=(num&0x0000FF)+amt; r=Math.max(Math.min(255,r),0); g=Math.max(Math.min(255,g),0); b=Math.max(Math.min(255,b),0);
  return '#'+(b | (g<<8) | (r<<16)).toString(16).padStart(6,'0'); }
function slug(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function switchTab(id){ $$('.tab').forEach(t=>t.classList.remove('active')); $('#'+id).classList.add('active'); $$('.tab-btn').forEach(b=>b.classList.remove('active')); const btn=Array.from($$('.tab-btn')).find(b=>b.dataset.tab===id); if(btn) btn.classList.add('active'); App.mode=id; }
function setSubtab(id){ $$('.subtab').forEach(t=>t.classList.remove('active')); $('#'+id).classList.add('active'); $$('.subtab-btn').forEach(b=>b.classList.remove('active')); const btn=Array.from($$('.subtab-btn')).find(b=>b.dataset.subtab===id); if(btn) btn.classList.add('active'); }

/*** i18n ***/
const I18N = {
  en: {
    home:'Home', global_dashboard:'Global Dashboard', all_records:'All Records', settings:'Settings',
    fields_areas:'Fields / Areas', fields_tip:'Tip: Add/rename in Settings → Fields.',
    back_to_fields:'← Back to Fields', back_to_categories:'← Back to Categories',
    dashboard:'Dashboard', add_entry:'Add Entry', records:'Records',
    total_cost_month:'Total Cost (This Month)', entries_month:'Entries (This Month)', avg_per_entry:'Average Cost / Entry',
    export_csv:'Export CSV', backup_json:'Backup (JSON)', restore:'Restore', download_png:'Download Report (PNG)',
    date:'Date', category:'Category', field:'Field', material:'Material', material_only:'Material', quantity:'Quantity', qty_short:'Qty',
    normal_lab:'Normal Labourers (count)', special_lab:'Special Labourers (count)', normal_short:'Normal', special_short:'Special',
    cost:'Cost', notes:'Notes', save:'Save', reset:'Reset', from:'From', to:'To', search:'Search', total:'Total',
    top_category:'Top Category', by_category_month:'By Category (This Month)', footer_note:'For your farm • Local-only data',
    add_field:'Add Field', categories:'Categories', add_category:'Add Category', general:'General',
    rate_normal:'Normal Labourer Rate (₹ / person)', rate_special:'Special Labourer Rate (₹ / person)', currency_symbol:'Currency Symbol',
    calc_hint:'Cost = Normal × Normal Rate + Special × Special Rate (editable).',
    report_title:'EverGreen Farm — Report',
    canvas_total:'Total (This Month)', canvas_entries:'Entries (This Month)', canvas_avg:'Avg / Entry', canvas_by_cat:'By Category (This Month)', canvas_recent:'Recent Entries'
  },
  ta: {
    home:'முகப்பு', global_dashboard:'முழுமை டாஷ்போர்டு', all_records:'அனைத்து பதிவுகள்', settings:'அமைப்புகள்',
    fields_areas:'புலங்கள் / பகுதிகள்', fields_tip:'குறிப்பு: அமைப்புகள் → புலங்களில் சேர்க்க/பெயர் மாற்றலாம்.',
    back_to_fields:'← புலங்களுக்கு திரும்ப', back_to_categories:'← வகைகளுக்கு திரும்ப',
    dashboard:'டாஷ்போர்டு', add_entry:'பதிவு சேர்க்க', records:'பதிவுகள்',
    total_cost_month:'இந்த மாதம் — மொத்த செலவு', entries_month:'இந்த மாதம் — பதிவுகள்', avg_per_entry:'ஒரு பதிவுக்கான சராசரி',
    export_csv:'CSV ஏற்றுமதி', backup_json:'காப்பு (JSON)', restore:'மீட்டெடு', download_png:'அறிக்கை (PNG) பதிவிறக்கு',
    date:'தேதி', category:'வகுப்பு', field:'புலம்', material:'பொருள் (இருநாள்)', material_only:'பொருள்', quantity:'அளவு', qty_short:'அள.',
    normal_lab:'சாதாரண தொழிலாளர்கள் (எண்)', special_lab:'சிறப்பு தொழிலாளர்கள் (எண்)', normal_short:'சா. தொழி.', special_short:'சி. தொழி.',
    cost:'செலவு', notes:'குறிப்புகள்', save:'சேமிக்க', reset:'ரீசெட்', from:'இருந்', to:'வரை', search:'தேடல்', total:'மொத்தம்',
    top_category:'அதி செலவான வகுப்பு', by_category_month:'இந்த மாதம் — வகுப்புவாரி', footer_note:'உங்கள் பண்ணைக்கு • உள்ளூர் தரவு',
    add_field:'புதிய புலம்', categories:'வகுப்புகள்', add_category:'புதிய வகுப்பு', general:'பொது',
    rate_normal:'சாதாரண தொழிலாளர் காசு (₹ / பேர்)', rate_special:'சிறப்பு தொழிலாளர் காசு (₹ / பேர்)', currency_symbol:'நாணய குறி',
    calc_hint:'செலவு = சாதாரண × காசு + சிறப்பு × காசு (மாற்றலாம்).',
    report_title:'EverGreen Farm — அறிக்கை',
    canvas_total:'இந்த மாதம் — மொத்த செலவு', canvas_entries:'இந்த மாதம் — பதிவுகள்', canvas_avg:'ஒரு பதிவின் சராசரி', canvas_by_cat:'இந்த மாதம் — வகுப்புகள்', canvas_recent:'சமீபத்திய பதிவுகள்'
  },
  kn: {
    home:'ಮುಖಪುಟ', global_dashboard:'ಸಾರ್ವತ್ರಿಕ ಫಲಕ', all_records:'ಎಲ್ಲ ದಾಖಲೆಗಳು', settings:'ಸಂಯೋಜನೆ',
    fields_areas:'ಪ್ಲಾಟ್‌ಗಳು / ಪ್ರದೇಶಗಳು', fields_tip:'ಸೂಚನೆ: ಸೆಟ್ಟಿಂಗ್ಗಳಲ್ಲಿ → ಪ್ಲಾಟ್‌ಗಳಲ್ಲಿ ಸೇರಿಸಿ/ಪುನಃಹೆಸರು.',
    back_to_fields:'← ಪ್ಲಾಟ್‌ಗಳಿಗೆ ಹಿಂದಿರುಗಿ', back_to_categories:'← ವರ್ಗಗಳಿಗೆ ಹಿಂದಿರುಗಿ',
    dashboard:'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', add_entry:'ದಾಖಲೆ ಸೇರಿಸಿ', records:'ದಾಖಲೆಗಳು',
    total_cost_month:'ಈ ತಿಂಗಳು — ಒಟ್ಟು ವೆಚ್ಚ', entries_month:'ಈ ತಿಂಗಳು — ದಾಖಲೆಗಳು', avg_per_entry:'ಒಂದು ದಾಖಲೆ ಸರಾಸರಿ',
    export_csv:'CSV ಎಕ್ಸ್‌ಪೋರ್ಟ್', backup_json:'ಬ್ಯಾಕಪ್ (JSON)', restore:'ಮರುಸ್ಥಾಪಿಸು', download_png:'ವರದಿ (PNG) ಡೌನ್‌ಲೋಡ್',
    date:'ದಿನಾಂಕ', category:'ವರ್ಗ', field:'ಪ್ಲಾಟ್', material:'ಸಾಮಗ್ರಿ', material_only:'ಸಾಮಗ್ರಿ', quantity:'ಪ್ರಮಾಣ', qty_short:'ಪ್ರಮಾ.',
    normal_lab:'ಸಾಮಾನ್ಯ ಕಾರ್ಮಿಕರು (ಸಂಖ್ಯೆ)', special_lab:'ವಿಶೇಷ ಕಾರ್ಮಿಕರು (ಸಂಖ್ಯೆ)', normal_short:'ಸಾ. ಕಾರ್.', special_short:'ವಿ. ಕಾರ್.',
    cost:'ವೆಚ್ಚ', notes:'ಟಿಪ್ಪಣಿ', save:'ಉಳಿಸಿ', reset:'ರೀಸೆಟ್', from:'ಇಂದ', to:'ತನಕ', search:'ಹುಡುಕಿ', total:'ಒಟ್ಟು',
    top_category:'ಅತಿ ವೆಚ್ಚದ ವರ್ಗ', by_category_month:'ಈ ತಿಂಗಳು — ವರ್ಗವಾರು', footer_note:'ನಿಮ್ಮ ತೋಟಕ್ಕೆ • ಸ್ಥಳೀಯ ಡೇಟಾ',
    add_field:'ಹೊಸ ಪ್ಲಾಟ್', categories:'ವರ್ಗಗಳು', add_category:'ಹೊಸ ವರ್ಗ', general:'ಸಾಮಾನ್ಯ',
    rate_normal:'ಸಾಮಾನ್ಯ ಕಾರ್ಮಿಕ ದರ (₹ / ವ್ಯಕ್ತಿ)', rate_special:'ವಿಶೇಷ ಕಾರ್ಮಿಕ ದರ (₹ / ವ್ಯಕ್ತಿ)', currency_symbol:'ಕರೆನ್ಸಿ ಚಿಹ್ನೆ',
    calc_hint:'ವೆಚ್ಚ = ಸಾಮಾನ್ಯ × ದರ + ವಿಶೇಷ × ದರ (ಬದಲಿಸಬಹುದು).',
    report_title:'EverGreen Farm — ವರದಿ',
    canvas_total:'ಈ ತಿಂಗಳು — ಒಟ್ಟು ವೆಚ್ಚ', canvas_entries:'ಈ ತಿಂಗಳು — ದಾಖಲೆಗಳು', canvas_avg:'ಸರಾಸರಿ / ದಾಖಲೆ', canvas_by_cat:'ಈ ತಿಂಗಳು — ವರ್ಗಗಳು', canvas_recent:'ಇತ್ತೀಚಿನ ದಾಖಲೆಗಳು'
  }
};
function getLang(){ return localStorage.getItem(LANG_KEY) || 'ta'; }
function setLang(l){ localStorage.setItem(LANG_KEY, l); }
function t(k){ const lang=getLang(); return (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; }
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key=el.getAttribute('data-i18n'); const tx=t(key); if(tx) el.textContent=tx;
  });
  $('#material')?.setAttribute('placeholder', getLang()==='ta' ? 'யூரியா / நீம் எண்ணெய் / spare' : (getLang()==='kn' ? 'ಯೂರಿಯಾ / ನೀಮ್ ಎಣ್ಣೆ / spare' : 'Urea / Neem oil / Spare'));
  $('#aQ')?.setAttribute('placeholder', getLang()==='ta' ? 'பொருள், குறிப்புகள்' : (getLang()==='kn' ? 'ಸಾಮಗ್ರಿ, ಟಿಪ್ಪಣಿ' : 'material, notes'));
  $('#filterSearch')?.setAttribute('placeholder', getLang()==='ta' ? 'பொருள், குறிப்புகள்' : (getLang()==='kn' ? 'ಸಾಮಗ್ರಿ, ಟಿಪ್ಪಣಿ' : 'material, notes'));
}

/*** Navigation ***/
$$('.tab-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    switchTab(b.dataset.tab);
    if (App.mode==='homeTiles') renderHome();
    if (App.mode==='globalDash') renderGlobalDash();
    if (App.mode==='settings') renderSettingsPage();
    if (App.mode==='recordsAll') { renderAllFilters(); renderAllTable(); }
  });
});
$$('.subtab-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    setSubtab(b.dataset.subtab);
    if (b.dataset.subtab==='catDash') renderCategoryDash();
    if (b.dataset.subtab==='catRecords') { renderCategoryForm(); renderCategoryTable(); }
  });
});

/*** HOME (Fields) ***/
function renderHome(){
  const s=loadSettings(); const recs=loadRecords(); const wrap=$('#fieldsGrid'); if(!wrap) return; wrap.innerHTML='';
  s.fields.forEach(field=>{
    const monthRecs = recs.filter(r => r.field===field && isThisMonth(r.date));
    const total = sumCost(monthRecs), cnt = monthRecs.length;
    const div=document.createElement('div'); div.className='tile'; div.tabIndex=0;
    div.innerHTML = `<div class="t-name">${field}</div>
      <div class="t-sub">${currency(total)} · ${cnt} ${getLang()==='ta'?'பதிவுகள்':(getLang()==='kn'?'ದಾಖಲೆಗಳು':'entries')}</div>
      <div class="t-icon">🏷️</div>`;
    div.addEventListener('click', ()=> openField(field));
    div.addEventListener('keypress', (e)=>{ if(e.key==='Enter') openField(field); });
    wrap.appendChild(div);
  });
}
function openField(field){
  App.selectedField=field; App.selectedCategory=null;
  $('#crumbField').textContent=field; $('#fieldNameLabel').textContent=field;
  switchTab('fieldView'); renderFieldCategories();
}
$('#backToHome')?.addEventListener('click', ()=> switchTab('homeTiles'));

function renderFieldCategories(){
  const s=loadSettings(); const wrap=$('#categoriesGrid'); if(!wrap) return; wrap.innerHTML='';
  s.categories.forEach(cat=>{
    const monthRecs = loadRecords().filter(r=> r.field===App.selectedField && r.category===cat.name && isThisMonth(r.date));
    const sum = sumCost(monthRecs);
    const div=document.createElement('div'); div.className='tile'; div.style.borderColor=shade(cat.color,-25);
    div.innerHTML = `<div class="t-name">${cat.icon} ${cat.name}</div>
      <div class="t-sub" style="color:#081018;background:${cat.color}22;padding:4px 8px;display:inline-block;border-radius:999px;border:1px solid ${shade(cat.color,-20)}">${currency(sum)}</div>`;
    div.addEventListener('click', ()=> openCategory(App.selectedField, cat.name));
    wrap.appendChild(div);
  });
}

/*** CATEGORY VIEW ***/
function openCategory(field, category){
  App.selectedField=field; App.selectedCategory=category;
  $('#crumbField2').textContent = field; $('#crumbCategory').textContent = category;

  // Pre-fill form
  const F = formRefs();
  F.id.value=''; F.date.value=todayISO(); F.category.value=category; 
  F.material.value=''; F.quantity.value=''; F.materialRate.value='';
  F.normalLab.value=''; F.specialLab.value=''; F.cost.value=''; F.notes.value=''; $('#autoCostHint').textContent='';
  toggleMaterialRate();
  switchTab('categoryView'); setSubtab('catDash'); renderCategoryDash();
}
$('#backToField')?.addEventListener('click', () => { setSubtab('catDash'); switchTab('fieldView'); renderFieldCategories(); });

function renderCategoryDash(){
  const list = contextRecords(true); // field+category
  const month = list.filter(r=>isThisMonth(r.date));
  $('#catTotalCost').textContent = currency(sumCost(month));
  $('#catEntryCount').textContent = String(month.length);
  $('#catAvgCost').textContent = currency(month.length? sumCost(month)/month.length : 0);
  drawCategoryBar(month);
}

/*** FORM & COST MODEL ***/
const MATERIAL_CATS = new Set(['Fertilizer','Pesticide','Irrigation','Expense']);
function formRefs(){
  return {
    id: $('#entryId'),
    date: $('#date'),
    category: $('#category'),
    material: $('#material'),
    quantity: $('#quantity'),
    materialRate: $('#materialRate'),
    normalLab: $('#normalLab'),
    specialLab: $('#specialLab'),
    cost: $('#cost'),
    notes: $('#notes'),
  };
}
function renderCategoryForm(){
  // populate category select
  const s=loadSettings(); const sel=$('#category'); if(!sel) return;
  sel.innerHTML = s.categories.map(c=>`<option>${c.name}</option>`).join('');
  sel.value = App.selectedCategory || s.categories[0]?.name || '';
  toggleMaterialRate();
}
function toggleMaterialRate(){
  const sel = $('#category'); const wrap = $('#materialRateWrap');
  wrap.style.display = MATERIAL_CATS.has(sel.value) ? '' : 'none';
}
$('#category')?.addEventListener('change', ()=>toggleMaterialRate());

function calcCostFor(form){
  const s=loadSettings();
  const n = Number(form.normalLab.value||0);
  const sp = Number(form.specialLab.value||0);
  const labour = n*(s.rateNormal||0) + sp*(s.rateSpecial||0);
  const material = MATERIAL_CATS.has(form.category.value)
    ? Number(form.quantity.value||0) * Number(form.materialRate.value||0)
    : 0;
  return labour + material;
}
['input','change'].forEach(ev=>{
  $('#normalLab')?.addEventListener(ev, autoCostHint);
  $('#specialLab')?.addEventListener(ev, autoCostHint);
  $('#quantity')?.addEventListener(ev, autoCostHint);
  $('#materialRate')?.addEventListener(ev, autoCostHint);
  $('#category')?.addEventListener(ev, autoCostHint);
});
function autoCostHint(){
  const s=loadSettings(); const F=formRefs();
  const calc = calcCostFor(F);
  const hint = `${t('cost')} = ${t('normal_short')}(${F.normalLab.value||0})×${s.currency}${s.rateNormal||0} + ${t('special_short')}(${F.specialLab.value||0})×${s.currency}${s.rateSpecial||0}` +
               (MATERIAL_CATS.has(F.category.value) ? ` + Qty(${F.quantity.value||0})×${s.currency}${Number(F.materialRate.value||0)}` : '') +
               ` = ${currency(calc)}`;
  $('#autoCostHint').textContent = hint;
  if (F.cost && !F.cost.value) F.cost.value = calc.toFixed(2);
}
$('#resetBtn')?.addEventListener('click', ()=>{
  const F=formRefs();
  F.id.value=''; F.date.value=todayISO(); F.material.value=''; F.quantity.value=''; F.materialRate.value='';
  F.normalLab.value=''; F.specialLab.value=''; F.cost.value=''; F.notes.value=''; $('#autoCostHint').textContent='';
  $('#deleteBtn').style.display = 'none';
});
$('#saveBtn')?.addEventListener('click', async ()=>{
  const F=formRefs(); 
  if (!App.selectedField) { alert('Select a field first'); return; }
  if (!F.date.value || !F.category.value) { alert('Date and Category are required'); return; }
  if (!F.cost.value) { F.cost.value = calcCostFor(F).toFixed(2); }
  try{
    await saveRecord({
      id: F.id.value || null,
      date: F.date.value,
      field: App.selectedField,
      category: F.category.value,
      material: F.material.value,
      quantity: F.quantity.value,
      materialRate: MATERIAL_CATS.has(F.category.value) ? F.materialRate.value : null,
      normalLab: F.normalLab.value,
      specialLab: F.specialLab.value,
      cost: F.cost.value,
      notes: F.notes.value
    });
    $('#deleteBtn').style.display = F.id.value ? '' : 'none';
    // reset for a new entry
    $('#resetBtn').click();
  }catch(e){ alert(`Save failed: ${e.message}`); }
});
$('#deleteBtn')?.addEventListener('click', async ()=>{
  const id = $('#entryId').value;
  if(!id) return;
  if (!confirm(t('confirm_delete') || 'Delete this entry?')) return;
  try{ await deleteRecord(id); $('#resetBtn').click(); } catch(e){ alert(`Delete failed: ${e.message}`); }
});

/*** CATEGORY TABLE ***/
const catFilter = { from: $('#filterFrom'), to: $('#filterTo'), search: $('#filterSearch') };
[catFilter.from, catFilter.to, catFilter.search].forEach(el => el?.addEventListener('input', renderCategoryTable));

function renderCategoryTable(){
  const tbody = $('#catTbody'); if(!tbody) return; tbody.innerHTML='';
  const list = contextRecords(true).filter(r=> {
    const okDate = inRange(r.date||'', catFilter.from.value||'', catFilter.to.value||'');
    const q = (catFilter.search.value||'').toLowerCase();
    const okQ = !q || (String(r.material||'').toLowerCase().includes(q) || String(r.notes||'').toLowerCase().includes(q));
    return okDate && okQ;
  });
  let total = 0;
  list.forEach(r=>{
    total += Number(r.cost||0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date||''}</td>
      <td>${r.field||''}</td>
      <td>${r.category||''}</td>
      <td>${r.material||''}</td>
      <td>${r.quantity??''}</td>
      <td>${r.materialRate!=null ? currency(r.materialRate) : ''}</td>
      <td>${currency(r.cost||0)}</td>
      <td>${r.notes||''}</td>
      <td><button class="btn small outline" data-id="${r.id}">✏️</button></td>`;
    tr.querySelector('button').addEventListener('click', ()=> loadRowIntoForm(r));
    tbody.appendChild(tr);
  });
  $('#catTotal').textContent = currency(total);
}
function loadRowIntoForm(r){
  const F=formRefs();
  F.id.value=r.id||'';
  F.date.value=r.date||todayISO();
  $('#category').value=r.category||'';
  F.material.value=r.material||'';
  F.quantity.value=r.quantity!=null ? r.quantity : '';
  F.materialRate.value=r.materialRate!=null ? r.materialRate : '';
  F.normalLab.value=r.normalLab!=null ? r.normalLab : '';
  F.specialLab.value=r.specialLab!=null ? r.specialLab : '';
  F.cost.value=r.cost!=null ? r.cost : '';
  F.notes.value=r.notes||'';
  toggleMaterialRate(); autoCostHint();
  setSubtab('catRecords');
  $('#deleteBtn').style.display = 'inline-block';
}

/*** GLOBAL DASH ***/
function renderGlobalDash(){
  const list = loadRecords().filter(r=>isThisMonth(r.date));
  $('#gTotal').textContent = currency(sumCost(list));
  $('#gCount').textContent = String(list.length);
  const s=loadSettings(); const byCat={}; list.forEach(r=> byCat[r.category]=(byCat[r.category]||0)+(Number(r.cost)||0));
  const wrap=$('#gByCat'); if (wrap){ wrap.innerHTML=''; const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
    $('#gTopCat').textContent = sorted[0]? `${sorted[0][0]} (${currency(sorted[0][1])})` : '—';
    sorted.forEach(([k,v])=>{
      const cat=s.categories.find(c=>c.name===k)||{color:'#2a3b66'};
      const span=document.createElement('span'); span.className='chip-cat'; span.style.border='1px solid '+shade(cat.color,-20);
      span.style.background='#0b1430'; span.style.padding='6px 10px'; span.style.borderRadius='999px'; span.style.margin='4px'; 
      span.innerHTML=`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cat.color};margin-right:6px"></span>${k}: ${currency(v)}`;
      wrap.appendChild(span);
    });
  }
  drawGlobalBar(byCat, s);
}

/*** ALL RECORDS ***/
function renderAllFilters(){
  const s=loadSettings(); const selCat=$('#aCat'), selField=$('#aField'); if (!selCat || !selField) return;
  selCat.innerHTML = `<option value="">${getLang()==='ta'?'அனைத்தும்':(getLang()==='kn'?'ಎಲ್ಲ':'All')}</option>${s.categories.map(c=>`<option>${c.name}</option>`).join('')}`;
  selField.innerHTML= `<option value="">${getLang()==='ta'?'அனைத்தும்':(getLang()==='kn'?'ಎಲ್ಲ':'All')}</option>${s.fields.map(f=>`<option>${f}</option>`).join('')}`;
  const f=$('#aFrom'), t2=$('#aTo'), c=$('#aCat'), fld=$('#aField'), q=$('#aQ');
  [f,t2,c,fld,q].forEach(el=> el?.addEventListener('input', debounce(renderAllTable,150)));
}
function renderAllTable(){
  const tbody = $('#allTbody'); if(!tbody) return; tbody.innerHTML='';
  const list = loadRecords().filter(r=>{
    const okDate = inRange(r.date||'', $('#aFrom').value||'', $('#aTo').value||'');
    const okCat = !$('#aCat').value || r.category===$('#aCat').value;
    const okField = !$('#aField').value || r.field===$('#aField').value;
    const q = ($('#aQ').value||'').toLowerCase();
    const okQ = !q || (String(r.material||'').toLowerCase().includes(q) || String(r.notes||'').toLowerCase().includes(q));
    return okDate && okCat && okField && okQ;
  });
  let total = 0;
  list.forEach(r=>{
    total += Number(r.cost||0);
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date||''}</td>
      <td>${r.field||''}</td>
      <td>${r.category||''}</td>
      <td>${r.material||''}</td>
      <td>${r.quantity??''}</td>
      <td>${r.materialRate!=null ? currency(r.materialRate) : ''}</td>
      <td>${currency(r.cost||0)}</td>
      <td>${r.notes||''}</td>
      <td><button class="btn small outline" data-id="${r.id}">✏️</button></td>`;
    tr.querySelector('button').addEventListener('click', ()=> { openCategory(r.field, r.category); loadRowIntoForm(r); });
    tbody.appendChild(tr);
  });
  $('#allTotal').textContent = currency(total);
}

/*** SETTINGS ***/
function renderSettingsPage(){
  const s=loadSettings(); applyI18n();
  // fields
  const ul=$('#fieldsList'); if (!ul) return; ul.innerHTML='';
  s.fields.forEach((name,idx)=>{
    const li=document.createElement('li'); li.innerHTML=`
      <span class="badge">${t('field')}</span>
      <input type="text" value="${name}" data-idx="${idx}" class="fName"/>
      <button class="danger btn small outline" data-action="del" data-idx="${idx}">${getLang()==='ta'?'நீக்கு':(getLang()==='kn'?'ಅಳಿಸು':'Delete')}</button>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll('.fName').forEach(inp=> inp.addEventListener('input',()=>{ const i=+inp.dataset.idx; s.fields[i]=inp.value||`Field ${i+1}`; saveSettings(s); renderHome(); }));
  ul.querySelectorAll('button[data-action="del"]').forEach(btn=> btn.addEventListener('click',()=>{ const i=+btn.dataset.idx; s.fields.splice(i,1); saveSettings(s); renderSettingsPage(); renderHome(); }));

  // categories
  const cl=$('#catsList'); cl.innerHTML='';
  s.categories.forEach((c,idx)=>{
    const li=document.createElement('li'); li.innerHTML=`
      <span class="badge">${t('category')}</span>
      <input type="text" value="${c.name}" class="cName" data-idx="${idx}" />
      <input type="text" value="${c.icon}" class="cIcon" data-idx="${idx}" style="width:80px"/>
      <input type="color" value="${c.color}" class="cColor" data-idx="${idx}" />
      <button class="danger btn small outline" data-action="cdel" data-idx="${idx}">${getLang()==='ta'?'நீக்கு':(getLang()==='kn'?'ಅಳಿಸು':'Delete')}</button>`;
    cl.appendChild(li);
  });
  cl.querySelectorAll('.cName').forEach(inp=> inp.addEventListener('input',()=>{ const i=+inp.dataset.idx; s.categories[i].name=inp.value||'Unnamed'; saveSettings(s); renderFieldCategories(); renderGlobalDash(); }));
  cl.querySelectorAll('.cIcon').forEach(inp=> inp.addEventListener('input',()=>{ const i=+inp.dataset.idx; s.categories[i].icon=inp.value||'•'; saveSettings(s); renderFieldCategories(); }));
  cl.querySelectorAll('.cColor').forEach(inp=> inp.addEventListener('input',()=>{ const i=+inp.dataset.idx; s.categories[i].color=inp.value||'#7dd3fc'; saveSettings(s); renderFieldCategories(); renderGlobalDash(); }));
  cl.querySelectorAll('button[data-action="cdel"]').forEach(btn=> btn.addEventListener('click',()=>{ const i=+btn.dataset.idx; s.categories.splice(i,1); saveSettings(s); renderSettingsPage(); renderFieldCategories(); renderGlobalDash(); }));

  // general
  $('#rateNormal').value = s.rateNormal || 0; 
  $('#rateSpecial').value = s.rateSpecial || 0;
  $('#settingsCurrency').value = s.currency || '₹';
}
$('#addFieldBtn')?.addEventListener('click', ()=>{
  const s=loadSettings(); const v=($('#newFieldName').value||'').trim(); if(!v) return;
  s.fields.push(v); saveSettings(s); $('#newFieldName').value=''; renderSettingsPage(); renderHome();
});
$('#addCatBtn')?.addEventListener('click', ()=>{
  const s=loadSettings(); const name=($('#newCatName').value||'').trim(); const icon=$('#newCatIcon').value||'•'; const color=$('#newCatColor').value||'#7dd3fc';
  if(!name) return; s.categories.push({name,icon,color}); saveSettings(s);
  $('#newCatName').value=''; $('#newCatIcon').value=''; renderSettingsPage(); renderFieldCategories(); renderGlobalDash();
});
$('#saveSettingsBtn')?.addEventListener('click', ()=>{
  const s=loadSettings(); 
  s.rateNormal = Number($('#rateNormal').value||0);
  s.rateSpecial = Number($('#rateSpecial').value||0);
  s.currency = ($('#settingsCurrency').value||'₹').trim().slice(0,3);
  saveSettings(s); alert(getLang()==='ta'?'சேமிக்கப்பட்டது':(getLang()==='kn'?'ಉಳಿಸಲಾಗಿದೆ':'Saved'));
});

/*** CSV / JSON ***/
function toCSV(records){
  const cols=['date','field','category','material','quantity','materialRate','normalLab','specialLab','cost','notes'];
  const esc=v=>{ if(v==null) return ''; const s=String(v).replace(/"/g,'""'); return `"${s}"`; };
  const lines=[cols.join(',')]; records.forEach(r=> lines.push(cols.map(c=> esc(r[c])).join(',')));
  return lines.join('\n');
}
function download(filename, content, type='text/plain'){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
$('#exportCsvBtn')?.addEventListener('click', ()=>{
  const ctx=contextLabel(); const list=contextRecords(); 
  download(`farm-records-${ctx}-${new Date().toISOString().slice(0,10)}.csv`, toCSV(list), 'text/csv');
});
$('#exportJsonBtn')?.addEventListener('click', ()=> download(`farm-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(loadRecords(),null,2),'application/json'));
$('#importJsonInput')?.addEventListener('change', async (e)=>{
  const f=e.target.files?.[0]; if(!f) return; const text=await f.text();
  try{
    const data=JSON.parse(text); if(!Array.isArray(data)) throw new Error('Invalid backup file');
    const current=loadRecords(); const map=new Map(current.map(r=>[r.id,r]));
    data.forEach(r=>{ const id=r.id||(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())); map.set(id,{...map.get(r.id),...r,id}); });
    saveRecords(Array.from(map.values()));
    alert(t('restore_complete')||'Restore complete!');
    renderHome(); renderGlobalDash(); if(App.mode==='categoryView'){ renderCategoryDash(); renderCategoryTable(); } if(App.mode==='recordsAll') renderAllTable();
  }catch(err){ alert((t('restore_failed')||'Restore failed: ') + err.message); }
  finally{ e.target.value=''; }
});

/*** Report PNG (Canvas) + HiDPI helpers ***/
$('#downloadPngBtn')?.addEventListener('click', ()=>{
  const s=loadSettings(); const list=contextRecords();
  const ctxName=contextLabel(true);
  const W=1100,H=700; const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');

  gradientBg(g,W,H);
  g.fillStyle='#ecf2ff'; g.font='bold 28px system-ui, Segoe UI, Roboto, Arial'; g.fillText(t('report_title'),32,48);
  g.font='16px system-ui'; g.fillStyle='#b9c6ea'; g.fillText(`${new Date().toLocaleString()}`,32,72);
  g.font='bold 22px system-ui'; g.fillStyle='#ecf2ff'; g.fillText(ctxName,32,110);

  const month=list.filter(r=>isThisMonth(r.date)); const total=sumCost(month), count=month.length;
  drawCard(g,32,130,320,120,'#12323a', t('canvas_total'), currency(total));
  drawCard(g,372,130,220,120,'#10263b', t('canvas_entries'), String(count));
  drawCard(g,612,130,220,120,'#211539', t('canvas_avg'), currency(count?total/count:0));

  const byCat={}; month.forEach(r=> byCat[r.category]=(byCat[r.category]||0)+(Number(r.cost)||0));
  drawBarChart(g, Object.keys(byCat), Object.values(byCat), 32, 270, W-64, 300, s, t('canvas_by_cat'));

  const recent=[...list].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.createdAt - a.createdAt)).slice(0,8);
  drawMiniTable(g, recent, 32, 590, W-64, 90, t('canvas_recent'));

  const png=c.toDataURL('image/png'); const a=document.createElement('a'); a.href=png; a.download=`report-${slug(ctxName)}-${new Date().toISOString().slice(0,10)}.png`; a.click();
});
function gradientBg(g,W,H){ const grd=g.createLinearGradient(0,0,0,H); grd.addColorStop(0,'#0b1022'); grd.addColorStop(1,'#121a36'); g.fillStyle=grd; g.fillRect(0,0,W,H); }
function drawCard(g,x,y,w,h,color,title,val){ g.fillStyle=color; g.globalAlpha=.9; roundRect(g,x,y,w,h,12,true,false); g.globalAlpha=1; g.fillStyle='#cfe0ff'; g.font='bold 15px system-ui'; g.fillText(title,x+14,y+32); g.fillStyle='#ffffff'; g.font='bold 30px system-ui'; g.fillText(val,x+14,y+72); }
function drawBarChart(g,labels,values,x,y,w,h,settings, titleTxt){ g.fillStyle='rgba(255,255,255,.06)'; roundRect(g,x,y,w,h,14,true,false); g.fillStyle='#cfe0ff'; g.font='bold 16px system-ui'; g.fillText(titleTxt, x+14, y+26); const pad=50,bw=(w-2*pad)/Math.max(values.length,1),max=Math.max(...values,10); values.forEach((v,i)=>{ const bh=(h-2*pad)*v/max; const cat=settings.categories.find(c=>c.name===labels[i])||{color:'#7dd3fc'}; g.fillStyle=cat.color; g.fillRect(x+pad+i*bw+10, y+h-pad-bh, bw-20,bh); g.fillStyle='#a9b2c7'; g.font='12px system-ui'; g.fillText(labels[i]||'', x+pad+i*bw+10, y+h-pad+14); }); }
function drawMiniTable(g,rows,x,y,w,h,titleTxt){ g.fillStyle='rgba(255,255,255,.06)'; roundRect(g,x,y,w,h,14,true,false); g.fillStyle='#cfe0ff'; g.font='bold 16px system-ui'; g.fillText(titleTxt, x+14, y+24); g.font='12px system-ui'; g.fillStyle='#b9c6ea'; const cols=[t('date'),t('field'),t('category'),t('material_only'),t('cost')]; const cw=[100,140,120, w-100-140-120-100-24, 100]; let cx=x+12; cols.forEach((c,i)=>{ g.fillText(c,cx,y+44); cx+=cw[i]; }); let yy=y+62; rows.forEach(r=>{ g.fillStyle='#ecf2ff'; let px=x+12; g.fillText(r.date||'',px,yy); px+=cw[0]; g.fillText(r.field||'',px,yy); px+=cw[1]; g.fillText(r.category||'',px,yy); px+=cw[2]; g.fillText((r.material||''),px,yy); px+=cw[3]; g.fillText(currency(r.cost!=null? +r.cost : 0),px,yy); yy+=18; }); }
function roundRect(g,x,y,w,h,r,fill,stroke){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); if(fill) g.fill(); if(stroke) g.stroke(); }

/*** Charts in page (HiDPI scaling) ***/
function setupCanvas(canvas){
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  const g = canvas.getContext('2d');
  g.setTransform(ratio,0,0,ratio,0,0); // scale everything once
  return g;
}
function drawCategoryBar(list){
  const c=$('#catBar'); if (!c) return; const g=setupCanvas(c);
  const map=new Map(); list.forEach(r=>{ if(r.date) map.set(r.date,(map.get(r.date)||0)+(Number(r.cost)||0)); });
  const labels=Array.from(map.keys()).sort(); const values=labels.map(k=>map.get(k));
  g.fillStyle='rgba(255,255,255,.06)'; g.fillRect(0,0,c.clientWidth,c.clientHeight);
  g.fillStyle='#cfe0ff'; g.font='bold 14px system-ui'; g.fillText(getLang()==='ta'?'இந்த மாதம் — நாள் வாரியான செலவு':(getLang()==='kn'?'ಈ ತಿಂಗಳು — ದಿನವಾರು ವೆಚ್ಚ':'Daily Cost (This Month)'),12,22);
  const pad=40,W=c.clientWidth,H=c.clientHeight,bw=(W-2*pad)/Math.max(values.length,1),max=Math.max(...values,10);
  values.forEach((v,i)=>{ const bh=(H-2*pad)*v/max; g.fillStyle='#7cc8ff'; g.fillRect(pad+i*bw+8, H-pad-bh, bw-16, bh); });
}
function drawGlobalBar(byCat, settings){
  const c=$('#gBar'); if (!c) return; const g=setupCanvas(c);
  const labels=Object.keys(byCat); const values=labels.map(k=>byCat[k]); const pad=50,W=c.clientWidth,H=c.clientHeight,bw=(W-2*pad)/Math.max(values.length,1),max=Math.max(...values,10);
  g.fillStyle='#cfe0ff'; g.font='bold 14px system-ui'; g.fillText(t('by_category_month'),12,22);
  values.forEach((v,i)=>{ const cat=settings.categories.find(c=>c.name===labels[i])||{color:'#7dd3fc'}; const bh=(H-2*pad)*v/max; g.fillStyle=cat.color; g.fillRect(pad+i*bw+10, H-pad-bh, bw-20, bh); g.fillStyle='#a9b2c7'; g.font='12px system-ui'; g.fillText(labels[i]||'', pad+i*bw+10, H-pad+14); });
}

/*** Context helpers ***/
function contextRecords(strict=false){
  const all = loadRecords();
  if (strict && App.selectedField && App.selectedCategory){
    return all.filter(r => r.field===App.selectedField && r.category===App.selectedCategory);
  }
  return all;
}
function contextLabel(short=false){
  if (App.mode==='categoryView' && App.selectedField && App.selectedCategory) return short?`${App.selectedField}-${App.selectedCategory}`:`${App.selectedField} / ${App.selectedCategory}`;
  if (App.mode==='fieldView' && App.selectedField) return short?App.selectedField:`${t('field')}: ${App.selectedField}`;
  return 'All';
}

/*** Language select ***/
const langSelect=$('#langSelect'); if (langSelect){
  langSelect.value=getLang();
  langSelect.addEventListener('change',()=>{ setLang(langSelect.value); applyI18n(); renderHome(); renderFieldCategories(); renderCategoryDash(); renderGlobalDash(); renderAllFilters(); renderAllTable(); });
}

/*** Debounce helper ***/
function debounce(fn, ms=150){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),ms); }; }

/*** Cloud rows listener from firebase.js ***/
document.addEventListener('cloud-rows', (e) => {
  App.cloudRows = Array.isArray(e.detail) ? e.detail : [];
  if (App.mode === 'homeTiles') renderHome();
  if (App.mode === 'globalDash') renderGlobalDash();
  if (App.mode === 'recordsAll') renderAllTable();
  if (App.mode === 'categoryView') { renderCategoryDash(); if ($('#catRecords').classList.contains('active')) renderCategoryTable(); }
});

/*** Init ***/
(function init(){
  if (!localStorage.getItem(SETTINGS_KEY)) saveSettings(DEFAULT_SETTINGS);
  applyI18n();
  renderHome(); renderGlobalDash(); renderAllFilters(); // tables will fill when cloud rows arrive
  renderSettingsPage();
})();
