
(() => {
  const qs=new URLSearchParams(location.search);
  const apiBase=(qs.get('api')||location.origin).replace(/\/$/,'');
  const previewUrl=qs.get('preview')||'https://circuitcurios.de/';
  const state={textures:[],selected:null,dirty:false};

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const els={
    list:$('#texture-list'),search:$('#search'),status:$('#status'),
    title:$('#f-title'),group:$('#f-group'),family:$('#f-family'),pattern:$('#f-pattern'),
    principle:$('#f-principle'),description:$('#f-description'),image:$('#f-image'),source:$('#f-source'),
    pTitle:$('#p-title'),pMeta:$('#p-meta'),pPrinciple:$('#p-principle'),pDesc:$('#p-description'),pImage:$('#p-image'),
    frame:$('#site-frame'),toast:$('#toast')
  };

  function toast(m){els.toast.textContent=m;els.toast.classList.add('show');setTimeout(()=>els.toast.classList.remove('show'),1400)}
  function setDirty(v=true){state.dirty=v;els.status.textContent=v?'ungespeichert':'gespeichert'}
  function slugify(v){return (v||'neu').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'neu'}
  function imageUrl(path){
    if(!path) return '';
    try{
      if(/^https?:/i.test(path)) return path;
      return new URL(path,previewUrl).href;
    }catch{return path}
  }
  function renderList(){
    const q=els.search.value.trim().toLowerCase();
    els.list.innerHTML='';
    state.textures.filter(t=>[t.title,t.group,t.family,t.pattern].join(' ').toLowerCase().includes(q)).forEach(t=>{
      const b=document.createElement('button'); b.className='item'+(state.selected===t?' active':''); b.type='button';
      b.innerHTML='<strong>'+escapeHtml(t.title)+'</strong><span>'+escapeHtml([t.group,t.family,t.pattern].filter(Boolean).join(' · '))+'</span>';
      b.onclick=()=>select(t); els.list.appendChild(b);
    });
  }
  function escapeHtml(s=''){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function select(t){state.selected=t; fillForm(t); renderList(); setDirty(false)}
  function fillForm(t){
    for(const [k,el] of Object.entries({title:els.title,group:els.group,family:els.family,pattern:els.pattern,principle:els.principle,description:els.description,image:els.image,sourcePage:els.source})) el.value=t?.[k]||'';
    renderPreview();
  }
  function current(){
    return {title:els.title.value.trim(),group:els.group.value.trim(),family:els.family.value.trim(),pattern:els.pattern.value.trim(),principle:els.principle.value.trim(),description:els.description.value.trim(),image:els.image.value.trim(),sourcePage:els.source.value.trim(),slug:state.selected?.slug||slugify(els.title.value)};
  }
  function renderPreview(){
    const t=current();
    els.pTitle.textContent=t.title||'Neue Oberfläche';
    els.pMeta.textContent=[t.group,t.family,t.pattern].filter(Boolean).join(' · ')||'Noch keine Taxonomie';
    els.pPrinciple.textContent=t.principle||'';
    els.pDesc.textContent=t.description||'';
    const src=imageUrl(t.image); els.pImage.src=src; els.pImage.style.display=src?'block':'none';
  }
  function yaml(v){return '"'+String(v||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,'\\n')+'"'}
  function markdown(t){return [
    '---',
    'title: '+yaml(t.title),
    'group: '+yaml(t.group),
    'family: '+yaml(t.family),
    'pattern: '+yaml(t.pattern),
    'principle: '+yaml(t.principle),
    'description: '+yaml(t.description),
    'image: '+yaml(t.image),
    'sourcePage: '+yaml(t.sourcePage),
    '---',''
  ].join('\n')}
  async function save(){
    const t=current(); if(!t.title) return toast('Titel fehlt');
    const path='editor/hugo/content/textures/'+(t.slug||slugify(t.title))+'.md';
    els.status.textContent='speichert …';
    try{
      const r=await fetch(apiBase+'/api/save?file='+encodeURIComponent(path),{method:'POST',headers:{'Content-Type':'text/plain; charset=utf-8'},body:markdown(t)});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const existing=state.selected;
      Object.assign(t,{slug:t.slug||slugify(t.title)});
      if(existing) Object.assign(existing,t); else {state.textures.push(t);state.selected=t}
      setDirty(false);renderList();toast('Gespeichert');
    }catch(e){els.status.textContent='Fehler';toast('Speichern fehlgeschlagen')}
  }
  async function pickImage(){
    try{
      const r=await fetch(apiBase+'/api/pick-image',{cache:'no-store'}); const d=await r.json();
      if(d.path){els.image.value=d.path;setDirty();renderPreview()}
    }catch{toast('Bildauswahl nicht erreichbar')}
  }
  function addNew(){state.selected=null;fillForm({title:'Neue Oberfläche',group:'',family:'',pattern:'',principle:'',description:'',image:'',sourcePage:'/index.html'});setDirty(true);renderList()}
  async function load(){
    els.frame.src=previewUrl;
    try{
      const r=await fetch('index.json',{cache:'no-store'}); const d=await r.json(); state.textures=d.textures||[];
      if(state.textures[0]) select(state.textures[0]); else addNew(); renderList();
    }catch{toast('index.json konnte nicht geladen werden');addNew()}
  }

  els.search.addEventListener('input',renderList);
  $$('#inspector input,#inspector textarea').forEach(el=>el.addEventListener('input',()=>{setDirty();renderPreview()}));
  $('#save').onclick=save; $('#new').onclick=addNew; $('#pick-image').onclick=pickImage;
  $$('.tab').forEach(btn=>btn.onclick=()=>{
    $$('.tab').forEach(x=>x.classList.toggle('active',x===btn));
    $$('.panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===btn.dataset.tab));
  });
  window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save()}});
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue=''}});
  load();
})();
