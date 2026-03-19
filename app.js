/***** Keys & storage *****/
const LS_KEY = 'farm_records_v4';          // bumped for new schema
const SETTINGS_KEY = 'farm_settings_v3';    // bumped for new settings
const LANG_KEY = 'farm_lang_v1';

const $  = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);

/***** Defaults *****/
const DEFAULT_FIELDS = ['Block A','Block B','Block C'];
const DEFAULT_CATEGORIES = [
  { name:'Weeding',    icon:'🌿',  color:'#7dd3fc' },
  { name:'Fertilizer', icon:'🧪',  color:'#86efac' },
  { name:'Pesticide',  icon:'🧴',  color:'#ffd166' },
  { name:'Irrigation', icon:'💧',  color:'#7cc8ff' },
  { name:'Labour',     icon:'🧑‍🌾', color:'#feb2b2' },
  { name:'Harvest',    icon:'🧺',  color:'#d6b4fe' },
  { name:'Expense',    icon:'₹',   color:'#dbe4ee' },
  { name:'Other',      icon:'🔧',  color:'#cde1ff' },
];

const DEFAULT_SETTINGS = {
  fields: [...DEFAULT_FIELDS],
  categories: [...DEFAULT_CATEGORIES],
  rateNormal: 500,    // ₹ per person
  rateSpecial: 700,   // ₹ per person
  currency: '₹',
};

/***** State *****/
const App = {
  mode: 'home',           // home | fieldView | categoryView | globalDash | recordsAll | settings
  selectedField: null,
  selectedCategory: null,
};

/***** Storage helpers *****/
function loadSettings(){ try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY))||{}) }; } catch { return DEFAULT_SETTINGS; } }
function saveSettings(s){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
function loadRecords(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function saveRecords(r){ localStorage.setItem(LS_KEY, JSON.stringify(r)); }

/***** Utils *****/
function currency(n){ const s=loadSettings(); const v=Number(n||0); return (s.currency||'₹') + v.toFixed(2); }
function todayISO(){ const d=new Date(); const z=d.getTimezoneOffset()*60000; return new Date(d-z).toISOString().slice(0,10); }
function sumCost(list){ return list.reduce((s,r)=> s + (Number(r.cost)||0), 0); }
function isThisMonth(dateStr){ if (!dateStr) return false; const ym = new Date().toISOString().slice(0,7); return dateStr.startsWith(ym); }
function inRange(d,f,t){ if (f && d<f) return false; if (t && d>t) return false; return true; }
function shade(hex, amt){ let c=hex.replace('#',''); if (c.length===3) c=c.split('').map(x=>x+x).join(''); const num=parseInt(c,16); let r=(num>>16)+amt,g=((num>>8)&0x00FF)+amt,b=(num&0x0000FF)+amt; r=Math.max(Math.min(255,r),0); g=Math.max(Math.min(255,g),0); b=Math.max(Math.min(255,b),0); return '#'+(b| (g<<8) | (r<<16)).toString(16).padStart(6,'0'); }
function slug(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function switchTab(id){ $$('.tab').forEach(t=>t.classList.remove('active')); $('#'+id).classList.add('active'); $$('.tab-btn').forEach(b=>b.classList.remove('active')); const btn=Array.from($$('.tab-btn')).find(b=>b.dataset.tab===id); if (btn) btn.classList.add('active'); }
function setSubtab(id){ $$('.subtab').forEach(t=>t.classList.remove('active')); $('#'+id).classList.add('active'); $$('.subtab-btn').forEach(b=>b.classList.remove('active')); const btn=Array.from($$('.subtab-btn')).find(b=>b.dataset.subtab===id); if (btn) btn.classList.add('active'); }

/***** i18n (placeholders only) *****/
const i18n = {
  en:{ confirm_delete:'Delete this entry?', restore_complete:'Restore complete!', restore_failed:'Failed to restore: ' },
  kn:{ confirm_delete:'ಈ ದಾಖಲೆಯನ್ನು ಅಳಿಸಬೇಕೇ?', restore_complete:'ಮರುಸ್ಥಾಪನೆ ಪೂರ್ಣಗೊಂಡಿದೆ!', restore_failed:'ಮರುಸ್ಥಾಪನೆ ವಿಫಲವಾಗಿದೆ: ' },
  ta:{ confirm_delete:'இந்த பதிவை நீக்கவா?', restore_complete:'மீட்டெடுத்தல் முடிந்தது!', restore_failed:'மீட்டெடுக்க முடியவில்லை: ' }
};
function getLang(){ return localStorage.getItem(LANG_KEY)||'en'; }
function setLang(l){ localStorage.setItem(LANG_KEY, l); }
function applyI18n(){
  const lang=getLang();
  $('#material')?.setAttribute('placeholder', lang==='kn'?'ಯೂರಿಯಾ / ನೀಮ್ / ಸ್ಪೇರ್': lang==='ta'?'யூரியா / நீம் / ஸ்பேர்':'Urea / Neem oil / Spare');
}

/***** Navigation *****/
$$('.tab-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    switchTab(b.dataset.tab); App.mode=b.dataset.tab;
    if (App.mode==='homeTiles') renderHome();
    if (App.mode==='globalDash') renderGlobalDash();
    if (App.mode==='recordsAll') renderAllRecords();
    if (App.mode==='settings') renderSettingsPage();
  });
});
$$('.subtab-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    setSubtab(b.dataset.subtab);
    if (b.dataset.subtab==='catDash') renderCategoryDash();
    if (b.dataset.subtab==='catRecords') renderTable();
  });
});

/***** HOME (Fields) *****/
function renderHome(){
  const s=loadSettings(); const recs=loadRecords(); const wrap=$('#fieldsGrid'); wrap.innerHTML='';
  s.fields.forEach(field=>{
    const monthRecs = recs.filter(r => (r.field||r.plot)===field && isThisMonth(r.date));
    const total = sumCost(monthRecs), cnt = monthRecs.length;
    const div=document.createElement('div'); div.className='tile';
    div.innerHTML = `<div class="t-name">${field}</div>
      <div class="t-sub">${currency(total)} · ${cnt} entries</div>
      <div class="t-icon">🏷️</div>`;
    div.addEventListener('click', ()=> openField(field));
    wrap.appendChild(div);
  });
}

function openField(field){
  App.selectedField=field; App.selectedCategory=null;
  $('#crumbField').textContent=field; $('#fieldNameLabel').textContent=field;
  switchTab('fieldView'); renderFieldCategories();
}

$('#backToHome').addEventListener('click', ()=> switchTab('homeTiles'));

function renderFieldCategories(){
  const s=loadSettings(); const wrap=$('#categoriesGrid'); wrap.innerHTML='';
  s.categories.forEach(cat=>{
    const monthRecs = loadRecords().filter(r=>(r.field||r.plot)===App.selectedField && r.category===cat.name && isThisMonth(r.date));
    const sum = sumCost(monthRecs);
    const div=document.createElement('div'); div.className='tile'; div.style.borderColor=shade(cat.color,-25);
    div.innerHTML = `<div class="t-name">${cat.icon} ${cat.name}</div>
      <div class="t-sub" style="color:#081018;background:${cat.color}22;padding:4px 8px;display:inline-block;border-radius:999px;border:1px solid ${shade(cat.color,-20)}">${currency(sum)}</div>`;
    div.addEventListener('click', ()=> openCategory(App.selectedField, cat.name));
    wrap.appendChild(div);
  });
}

/***** CATEGORY VIEW *****/
function openCategory(field, category){
  App.selectedField=field; App.selectedCategory=category;
  $('#crumbField2').textContent = field;
  $('#crumbCategory').textContent = category;

  // Pre-fill Add form (only allowed inputs)
  F.id.value='';
  $('#category').value = category;
  $('#date').value = todayISO();
  $('#material').value = '';
  $('#quantity').value = '';
  $('#normalLab').value = '';
  $('#specialLab').value = '';
  $('#cost').value = '';
  $('#notes').value = '';
  $('#autoCostHint').textContent='';

  switchTab('categoryView'); setSubtab('catDash');
  renderCategoryDash();
}

$('#backToField').addEventListener('click', ()=> { setSubtab('catDash'); switchTab('fieldView'); renderFieldCategories(); });

function renderCategoryDash(){
  const list = contextRecords(true); // field+category
  const month = list.filter(r=>isThisMonth(r.date));
  const total = sumCost(month);
  $('#catTotalCost').textContent = currency(total);
  $('#catEntryCount').textContent = String(month.length);
  $('#catAvgCost').textContent = currency(month.length? total/month.length : 0);
  drawCategoryBar(month);
}

/***** FORM (Category Add) *****/
const F = {
  id: $('#entryId'),
  date: $('#date'),
  category: $('#category'),
  material: $('#material'),
  quantity: $('#quantity'),
  normalLab: $('#normalLab'),
  specialLab: $('#specialLab'),
  cost: $('#cost'),
  notes: $('#notes'),
};
$('#resetBtn').addEventListener('click', ()=>{
  F.id.value=''; F.date.value=todayISO();
  F.material.value=''; F.quantity.value='';
  F.normalLab.value=''; F.specialLab.value='';
  F.cost.value=''; F.notes.value=''; $('#autoCostHint').textContent='';
});

['input','change'].forEach(ev=>{
  F.normalLab.addEventListener(ev, autoCostFromCounts);
  F.specialLab.addEventListener(ev, autoCostFromCounts);
});
function autoCostFromCounts(){
  const s=loadSettings();
  const n = Number(F.normalLab.value||0);
  const sp = Number(F.specialLab.value||0);
  const calc = n*(s.rateNormal||0) + sp*(s.rateSpecial||0);
  const hint = `Cost = Normal(${n})×₹${s.rateNormal||0} + Special(${sp})×₹${s.rateSpecial||0} = ${currency(calc)}`;
  $('#autoCostHint').textContent = hint;
  if (!F.cost.value) F.cost.value = calc.toFixed(2);
}

$('#entryForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const rec = {
    id: F.id.value || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    date: F.date.value,
    field: App.selectedField,          // from context
    plot: App.selectedField,           // compatibility
    category: F.category.value,
    activity: '',                      // removed from UI
    material: F.material.value.trim(),
    quantity: parseFloat(F.quantity.value||0),
    unit: '',                          // removed from UI
    laborers: parseInt((Number(F.normalLab.value||0) + Number(F.specialLab.value||0)) || 0), // total for compatibility
    normalLab: parseInt(F.normalLab.value||0),
    specialLab: parseInt(F.specialLab.value||0),
    hours: 0,                          // no hours
    cost: parseFloat(F.cost.value||0),
    notes: F.notes.value.trim(),
    createdAt: Date.now(),
  };
  if (!rec.date || !rec.field || !rec.category){ alert('Date, Field and Category are required'); return; }
  const list = loadRecords();
  const idx = list.findIndex(r=>r.id===rec.id);
  if (idx>=0) list[idx]=rec; else list.push(rec);
  saveRecords(list);
  renderCategoryDash(); renderTable();
  $('#resetBtn').click();
  setSubtab('catRecords');
});

/***** CATEGORY TABLE *****/
const filter = { from: $('#filterFrom'), to: $('#filterTo'), search: $('#filterSearch') };
[filter.from, filter.to, filter.search].forEach(el => el.addEventListener('input', renderTable));

function renderTable(){
  const tbody = $('#recordsTable tbody'); tbody.innerHTML='';
  let list = contextRecords(true); // field+category
  list = list.filter(r=>{
    const okDate = inRange(r.date||'', filter.from.value||'', filter.to.value||'');
    const q=(filter.search.value||'').toLowerCase(); const hay=[r.material,r.notes].join(' ').toLowerCase();
    return okDate && (!q || hay.includes(q));
  });
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||'') || b.createdAt-a.createdAt);

  let total = 0;
  list.forEach(r=>{
    total += (r.cost||0);
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date||''}</td>
      <td>${r.category||''}</td>
      <td>${r.field||r.plot||''}</td>
      <td>${r.material||''}</td>
      <td>${r.quantity||''}</td>
      <td>${r.normalLab!=null ? r.normalLab : (r.laborers||'')}</td>
      <td>${r.specialLab!=null ? r.specialLab : ''}</td>
      <td>${r.cost!=null ? currency(r.cost): ''}</td>
      <td>${r.notes||''}</td>
      <td class="row-actions">
        <button class="secondary small" data-action="edit" data-id="${r.id}">Edit</button>
        <button class="danger small" data-action="del" data-id="${r.id}">DEL</button>
      </td>`;
    tbody.appendChild(tr);
  });
  $('#tableTotal').textContent = currency(total);

  // actions
  tbody.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id; let list=loadRecords(); const idx=list.findIndex(r=>r.id===id); if (idx<0) return;
      const r=list[idx];
      if (btn.dataset.action==='edit'){
        F.id.value=r.id; F.date.value=r.date||todayISO(); F.category.value=r.category||App.selectedCategory;
        F.material.value=r.material||''; F.quantity.value=r.quantity||'';
        F.normalLab.value = (r.normalLab!=null)? r.normalLab : (r.laborers||0);
        F.specialLab.value = (r.specialLab!=null)? r.specialLab : 0;
        F.cost.value=r.cost||''; F.notes.value=r.notes||'';
        $('#autoCostHint').textContent=''; $('#saveBtn').textContent='Update';
        setSubtab('catAdd');
      } else if (btn.dataset.action==='del'){
        if (confirm((i18n[getLang()]||i18n.en).confirm_delete)){
          list.splice(idx,1); saveRecords(list); renderCategoryDash(); renderTable();
        }
      }
    });
  });
}

/***** GLOBAL DASH *****/
function renderGlobalDash(){
  const list = loadRecords().filter(r=>isThisMonth(r.date));
  $('#gTotal').textContent = currency(sumCost(list));
  $('#gCount').textContent = String(list.length);

  const s=loadSettings(); const byCat={}; list.forEach(r=> byCat[r.category]=(byCat[r.category]||0)+(r.cost||0));
  const wrap=$('#gByCat'); wrap.innerHTML=''; const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  $('#gTopCat').textContent = sorted[0]? `${sorted[0][0]} (${currency(sorted[0][1])})` : '—';
  sorted.forEach(([k,v])=>{
    const cat=s.categories.find(c=>c.name===k)||{color:'#2a3b66'};
    const span=document.createElement('span'); span.className='chip-cat'; span.style.borderColor=shade(cat.color,-20);
    span.style.background='#0b1430'; span.innerHTML=`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cat.color};margin-right:6px"></span>${k}: ${currency(v)}`;
    wrap.appendChild(span);
  });
  drawGlobalBar(byCat, s);
}

/***** ALL RECORDS *****/
function renderAllRecords(){
  const s=loadSettings(); const selCat=$('#aCat'), selField=$('#aField');
  selCat.innerHTML = `<option value="">All</option>${s.categories.map(c=>`<option>${c.name}</option>`).join('')}`;
  selField.innerHTML = `<option value="">All</option>${s.fields.map(f=>`<option>${f}</option>`).join('')}`;
  const f=$('#aFrom'), t=$('#aTo'), c=$('#aCat'), fld=$('#aField'), q=$('#aQ');
  [f,t,c,fld,q].forEach(el=> el.addEventListener('input', renderAllRecords));

  const tbody=$('#allTable tbody'); tbody.innerHTML='';
  let list=loadRecords();
  list=list.filter(r=>{
    const okDate=inRange(r.date||'', f.value||'', t.value||'');
    const okCat=!c.value || r.category===c.value;
    const okField=!fld.value || (r.field||r.plot)===fld.value;
    const text=(q.value||'').toLowerCase(); const hay=[r.material,r.notes,(r.field||r.plot),r.category].join(' ').toLowerCase();
    return okDate && okCat && okField && (!text || hay.includes(text));
  });
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||'') || b.createdAt-a.createdAt);
  list.forEach(r=>{
    const tr=document.createElement('tr'); tr.innerHTML=`
      <td>${r.date||''}</td>
      <td>${r.category||''}</td>
      <td>${r.field||r.plot||''}</td>
      <td>${r.material||''}</td>
      <td>${r.quantity||''}</td>
      <td>${r.normalLab!=null ? r.normalLab : (r.laborers||'')}</td>
      <td>${r.specialLab!=null ? r.specialLab : ''}</td>
      <td>${r.cost!=null ? currency(r.cost):''}</td>
      <td>${r.notes||''}</td>`;
    tbody.appendChild(tr);
  });
}

/***** SETTINGS *****/
function renderSettingsPage(){
  const s=loadSettings();
  // fields
  const ul=$('#fieldsList'); ul.innerHTML='';
  s.fields.forEach((name,idx)=>{
    const li=document.createElement('li'); li.innerHTML=`
      <span class="badge">Field</span>
      <input type="text" value="${name}" data-idx="${idx}" class="fName"/>
      <button class="danger small" data-action="del" data-idx="${idx}">Delete</button>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll('.fName').forEach(inp=> inp.addEventListener('input',()=>{ const i=+inp.dataset.idx; s.fields[i]=inp.value||`Field ${i+1}`; saveSettings(s); renderHome(); }));
  ul.querySelectorAll('button[data-action="del"]').forEach(btn=> btn.addEventListener('click',()=>{ const i=+btn.dataset.idx; s.fields.splice(i,1); saveSettings(s); renderSettingsPage(); renderHome(); }));

  // categories
  const cl=$('#catsList'); cl.innerHTML='';
  s.categories.forEach((c,idx)=>{
    const li=document.createElement('li'); li.innerHTML=`
      <span class="badge">Category</span>
      <input type="text" value="${c.name}" class="cName" data-idx="${idx}" />
      <input type="text" value="${c.icon}" class="cIcon" data-idx="${idx}" style="width:80px"/>
      <input type="color" value="${c.color}" class="cColor" data-idx="${idx}" />
      <button class="danger small" data-action="cdel" data-idx="${idx}">Delete</button>`;
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
$('#addFieldBtn').addEventListener('click', ()=>{
  const s=loadSettings(); const v=($('#newFieldName').value||'').trim(); if (!v) return;
  s.fields.push(v); saveSettings(s); $('#newFieldName').value=''; renderSettingsPage(); renderHome();
});
$('#addCatBtn').addEventListener('click', ()=>{
  const s=loadSettings(); const name=($('#newCatName').value||'').trim(); const icon=$('#newCatIcon').value||'•'; const color=$('#newCatColor').value||'#7dd3fc';
  if (!name) return; s.categories.push({name,icon,color}); saveSettings(s);
  $('#newCatName').value=''; $('#newCatIcon').value=''; renderSettingsPage(); renderFieldCategories(); renderGlobalDash();
});
$('#saveSettingsBtn').addEventListener('click', ()=>{
  const s=loadSettings();
  s.rateNormal = Number($('#rateNormal').value||0);
  s.rateSpecial = Number($('#rateSpecial').value||0);
  s.currency = ($('#settingsCurrency').value||'₹').trim().slice(0,3);
  saveSettings(s); alert('Saved');
});

/***** CSV / JSON / PNG *****/
function toCSV(records){
  const cols=['date','field','category','material','quantity','normalLab','specialLab','cost','notes'];
  const esc=v=>{ if(v==null) return ''; const s=String(v).replace(/"/g,'""'); return `"${s}"`; };
  const lines=[cols.join(',')]; records.forEach(r=> lines.push(cols.map(c=> esc(c==='field'?(r.field||r.plot):r[c])).join(',')));
  return lines.join('\n');
}
function download(filename, content, type='text/plain'){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
$('#exportCsvBtn').addEventListener('click', ()=>{ const ctx=contextLabel(); const list=contextRecords(); download(`farm-records-${ctx}-${new Date().toISOString().slice(0,10)}.csv`, toCSV(list), 'text/csv'); });
$('#exportJsonBtn').addEventListener('click', ()=> download(`farm-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(loadRecords(),null,2),'application/json'));
$('#importJsonInput').addEventListener('change', async (e)=>{
  const f=e.target.files?.[0]; if(!f) return; const text=await f.text();
  try{
    const data=JSON.parse(text); if(!Array.isArray(data)) throw new Error('Invalid backup file');
    const current=loadRecords(); const map=new Map(current.map(r=>[r.id,r]));
    data.forEach(r=>{ const id=r.id||(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())); map.set(id,{...map.get(r.id),...r,id}); });
    saveRecords(Array.from(map.values()));
    alert((i18n[getLang()]||i18n.en).restore_complete);
    renderHome(); renderGlobalDash(); if(App.mode==='categoryView'){ renderCategoryDash(); renderTable(); } if(App.mode==='recordsAll') renderAllRecords();
  }catch(err){ alert((i18n[getLang()]||i18n.en).restore_failed + err.message); }
  finally{ e.target.value=''; }
});

/***** Report PNG (Canvas) *****/
$('#downloadPngBtn').addEventListener('click', ()=>{
  const s=loadSettings(); const list=contextRecords();
  const ctxName=contextLabel(true);
  const W=1100,H=700; const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  gradientBg(g,W,H);
  g.fillStyle='#ecf2ff'; g.font='bold 28px system-ui, Segoe UI, Roboto, Arial'; g.fillText('EverGreen Farm — Report',32,48);
  g.font='16px system-ui'; g.fillStyle='#b9c6ea'; g.fillText(`${new Date().toLocaleString()}`,32,72);
  g.font='bold 22px system-ui'; g.fillStyle='#ecf2ff'; g.fillText(ctxName,32,110);

  const month=list.filter(r=>isThisMonth(r.date)); const total=sumCost(month), count=month.length;
  drawCard(g,32,130,320,120,'#12323a','Total (This Month)', currency(total));
  drawCard(g,372,130,220,120,'#10263b','Entries (This Month)', String(count));
  drawCard(g,612,130,220,120,'#211539','Avg / Entry', currency(count?total/count:0));

  const byCat={}; month.forEach(r=> byCat[r.category]=(byCat[r.category]||0)+(r.cost||0));
  drawBarChart(g, Object.keys(byCat), Object.values(byCat), 32, 270, W-64, 300, s);

  const recent=[...list].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.createdAt-a.createdAt).slice(0,8);
  drawMiniTable(g, recent, 32, 590, W-64, 90, s.currency);

  const png=c.toDataURL('image/png'); const a=document.createElement('a'); a.href=png; a.download=`report-${slug(ctxName)}-${new Date().toISOString().slice(0,10)}.png`; a.click();
});
function gradientBg(g,W,H){ const grd=g.createLinearGradient(0,0,0,H); grd.addColorStop(0,'#0b1022'); grd.addColorStop(1,'#121a36'); g.fillStyle=grd; g.fillRect(0,0,W,H); }
function drawCard(g,x,y,w,h,color,title,val){ g.fillStyle=color; g.globalAlpha=.9; roundRect(g,x,y,w,h,12,true,false); g.globalAlpha=1; g.fillStyle='#cfe0ff'; g.font='bold 15px system-ui'; g.fillText(title,x+14,y+32); g.fillStyle='#ffffff'; g.font='bold 30px system-ui'; g.fillText(val,x+14,y+72); }
function drawBarChart(g,labels,values,x,y,w,h,settings){ g.fillStyle='rgba(255,255,255,.06)'; roundRect(g,x,y,w,h,14,true,false); g.fillStyle='#cfe0ff'; g.font='bold 16px system-ui'; g.fillText('By Category (This Month)',x+14,y+26); const pad=50,bw=(w-2*pad)/Math.max(values.length,1),max=Math.max(...values,10); values.forEach((v,i)=>{ const bh=(h-2*pad)*v/max; const cat=settings.categories.find(c=>c.name===labels[i])||{color:'#7dd3fc'}; g.fillStyle=cat.color; g.fillRect(x+pad+i*bw+10, y+h-pad-bh, bw-20,bh); g.fillStyle='#a9b2c7'; g.font='12px system-ui'; g.fillText(labels[i]||'', x+pad+i*bw+10, y+h-pad+14); }); }
function drawMiniTable(g,rows,x,y,w,h,curSym){ g.fillStyle='rgba(255,255,255,.06)'; roundRect(g,x,y,w,h,14,true,false); g.fillStyle='#cfe0ff'; g.font='bold 16px system-ui'; g.fillText('Recent Entries',x+14,y+24); g.font='12px system-ui'; g.fillStyle='#b9c6ea'; const cols=['Date','Field','Category','Material','Cost']; const cw=[100,140,120, w-100-140-120-100-24, 100]; let cx=x+12; cols.forEach((c,i)=>{ g.fillText(c,cx,y+44); cx+=cw[i]; }); let yy=y+62; rows.forEach(r=>{ g.fillStyle='#ecf2ff'; let px=x+12; g.fillText(r.date||'',px,yy); px+=cw[0]; g.fillText((r.field||r.plot)||'',px,yy); px+=cw[1]; g.fillText(r.category||'',px,yy); px+=cw[2]; g.fillText((r.material||''),px,yy); px+=cw[3]; g.fillText((r.cost!=null? curSym+(+r.cost).toFixed(2):''),px,yy); yy+=18; }); }
function roundRect(g,x,y,w,h,r,fill,stroke){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); if(fill) g.fill(); if(stroke) g.stroke(); }

/***** Charts inside category/global cards *****/
function drawCategoryBar(list){
  const c=$('#catBar'); const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height);
  const map=new Map(); list.forEach(r=>{ if(r.date) map.set(r.date,(map.get(r.date)||0)+(r.cost||0)); });
  const labels=Array.from(map.keys()).sort(); const values=labels.map(k=>map.get(k));
  g.fillStyle='rgba(255,255,255,.06)'; g.fillRect(0,0,c.width,c.height);
  g.fillStyle='#cfe0ff'; g.font='bold 14px system-ui'; g.fillText('Daily Cost (This Month)',12,22);
  const pad=40,W=c.width,H=c.height,bw=(W-2*pad)/Math.max(values.length,1),max=Math.max(...values,10);
  values.forEach((v,i)=>{ const bh=(H-2*pad)*v/max; g.fillStyle='#7cc8ff'; g.fillRect(pad+i*bw+8, H-pad-bh, bw-16, bh); });
}
function drawGlobalBar(byCat, settings){
  const c=$('#gBar'); const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height);
  const labels=Object.keys(byCat); const values=labels.map(k=>byCat[k]); const pad=50,W=c.width,H=c.height,bw=(W-2*pad)/Math.max(values.length,1),max=Math.max(...values,10);
  g.fillStyle='#cfe0ff'; g.font='bold 14px system-ui'; g.fillText('Category Cost (This Month)',12,22);
  values.forEach((v,i)=>{ const cat=settings.categories.find(c=>c.name===labels[i])||{color:'#7dd3fc'}; const bh=(H-2*pad)*v/max; g.fillStyle=cat.color; g.fillRect(pad+i*bw+10, H-pad-bh, bw-20, bh); g.fillStyle='#a9b2c7'; g.font='12px system-ui'; g.fillText(labels[i]||'', pad+i*bw+10, H-pad+14); });
}

/***** Context helpers *****/
function contextRecords(strict=false){
  if (strict && App.selectedField && App.selectedCategory){
    return loadRecords().filter(r => (r.field||r.plot)===App.selectedField && r.category===App.selectedCategory);
  }
  return loadRecords();
}
function contextLabel(short=false){
  if (App.mode==='categoryView' && App.selectedField && App.selectedCategory) return short?`${App.selectedField}-${App.selectedCategory}`:`${App.selectedField} / ${App.selectedCategory}`;
  if (App.mode==='fieldView' && App.selectedField) return short?App.selectedField:`Field: ${App.selectedField}`;
  return 'All';
}

/***** Language select *****/
const langSelect=$('#langSelect'); langSelect.value=getLang(); langSelect.addEventListener('change',()=>{ setLang(langSelect.value); applyI18n(); });

/***** Init *****/
(function init(){
  if (!localStorage.getItem(SETTINGS_KEY)) saveSettings(DEFAULT_SETTINGS);
  applyI18n(); renderHome(); renderGlobalDash(); renderAllRecords();
})();
