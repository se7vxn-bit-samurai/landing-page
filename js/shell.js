/* ═══════════════════════════════════════════════════════════
   TheGuide Shell v2 · the living nave + the engine.
   Manifest · Frame manager (LRU-3) · Exchange bus · Session.
   Canon: apps never read each other's storage · packets only.
   ═══════════════════════════════════════════════════════════ */

/* ═══════════ MANIFEST ═══════════ */
const STATUS = {
  active:{label:'Active',dot:'#7dd3a6'}, building:{label:'Building',dot:'#e2b85a'},
  soon:{label:'Soon',dot:'#b98bff'}, archived:{label:'Archived',dot:'#7890a0'},
  open:{label:'Open',dot:'#e08b4a'}
};
const WORLDS = {
  mirrorflow:{name:'MirrorFlow',motto:'Specvlvm Lvcens',tagline:'The communication mirror.',status:'building',version:'v1.4',
    accent:'#5dd9ff',glyph:'M',app:'ping',appName:'MirrorFlow Ping',
    palette:{bg:'#070d14',ink:'#eef0f5',accent:'#5dd9ff',fire:'#7df9e8'},
    desc:'The productivity arm, expressed as two instruments. Ping holds the moment: one mirror, one note back. Sync holds the long arc: continuity across days. Notes catches what falls between. Together: your voice, reflected and kept.'},
  excelsior:{name:'Excelsior',motto:'Ars Vendendi',tagline:'The editorial sales coach.',status:'active',version:'v2.7',
    accent:'#d4a832',glyph:'E',flagship:true,app:'coach',appName:'Excelsior Coach',
    palette:{bg:'#17120b',ink:'#f4eee0',accent:'#d4a832',fire:'#e05c24'},
    desc:'A coaching atelier for sellers who think in arguments, not scripts. The flagship of the house: mindset, craft, and the art of the honest sale. Every session is an argument refined; every review, a rung on the ladder.'},
  riftborn:{name:'Riftborn',motto:'Inter Mvndos',tagline:'Fables, worlds & memory.',status:'active',version:'v2.0',
    accent:'#b98bff',glyph:'R',app:'codex',appName:'the Codex',
    palette:{bg:'#0c0816',ink:'#ede7ff',accent:'#b98bff',fire:'#ff6ec7'},
    desc:'The fable arm of the house: worldbuilding, symbolism, and the memory that keeps it canon. The Codex is its living terminal: rituals, design bibles and lore, all sealed here. Inside it, the game is still forming: a card-and-tile crossing between worlds.'},
  altar:{name:'The Altar',motto:'Nova Flamma',tagline:'Where new ideas are laid.',status:'open',version:'tier',
    accent:'#e08b4a',glyph:'A',app:null,appName:null,
    palette:{bg:'#100c09',ink:'#ece4d6',accent:'#e08b4a',fire:'#ffb36b'},
    desc:'The fourth door is not a product. It is a tier. New ideas are laid here as candles: named, given a line of intent, and watched. An idea that catches fire earns a world of its own; one that gutters descends to the undercroft. Nothing is pitched in the dark.'}
};
const APPS = {
  ping:{id:'ping',short:'Ping',name:'MirrorFlow Ping',world:'mirrorflow',glyph:'P',accent:'#7df9e8',status:'active',version:'v6',
    kind:'Message mirror',localPath:'apps/ping.html',
    desc:'A single tap. One mirror, one moment, one note back.'},
  sync:{id:'sync',short:'Sync',name:'MirrorFlow Sync',world:'mirrorflow',glyph:'S',accent:'#9bb8ff',status:'building',version:'v64',
    kind:'Schedules & continuity',localPath:'apps/sync.html',
    desc:'Continuity across days, your voice over time.'},
  notes:{id:'notes',short:'Notes',name:'MirrorFlow Notes',world:'mirrorflow',glyph:'N',accent:'#a9b6c8',status:'active',version:'v4',
    kind:'The workbench',localPath:'apps/notes.html',
    desc:'Catch it before it goes, then shape it into something worth handing over.'},
  coach:{id:'coach',short:'Coach',name:'Excelsior Coach',world:'excelsior',glyph:'E',accent:'#d4a832',status:'active',version:'v2.7',
    kind:'Editorial sales coach',localPath:'apps/coach.html',
    desc:'Coaching for sellers who think in arguments.'},
  insight:{id:'insight',short:'Insight',name:'MirrorFlow Insight',world:'mirrorflow',glyph:'I',accent:'#7df9e8',status:'soon',version:'—',
    kind:'Pattern & signal layer',localPath:null,
    desc:'The memory of the mirror. Reads digests, shows the arc.'},
  codex:{id:'codex',short:'Codex',name:'the Codex',world:'riftborn',glyph:'C',accent:'#b98bff',status:'active',version:'v2.0',
    kind:'Riftborn terminal',localPath:'apps/codex.html',
    desc:'Rituals, bibles, lore: sealed and canon.'}
};
window.TGC_APPS = APPS;            // apps live under apps/<id>.html · fetched on demand
const DOCK = ['ping','sync','coach','codex'];
const ORDER = ['mirrorflow','excelsior','riftborn','altar'];
const SKY_X = {mirrorflow:16,excelsior:36,riftborn:64,altar:84};
const ARCHIVE = [
  {name:'MirrorFlow Assist',version:'v1',sealed:'Jun 2026',to:'Ping',world:'mirrorflow',note:'The communication cockpit. Declared a donor: its instruments are being harvested into Ping.'},
  {name:'MirrorFlow Classic',version:'v6.2',sealed:'Mar 2026',to:'Ping',world:'mirrorflow',note:'The original single-window chat. A donor quarry for Ping.'},
  {name:'MirrorFlow Lite',version:'v1.0',sealed:'Nov 2025',to:'Ping',world:'mirrorflow',note:'First one-tap mirror. The OG build, folded into Ping.'},
  {name:'Sync · Schedule Cleaner',version:'v38',sealed:'Jan 2026',to:'Sync',world:'mirrorflow',note:'The Bible-era cleaner. Superseded by Chronos.'},
  {name:'Excelsior Classic',version:'v0.0.9',sealed:'Feb 2026',to:'Coach',world:'excelsior',note:'The printed-dossier prototype. Now the Coach Library.'}
];
const EXCHANGE = {
  excelsior:{consumes:'theguide.exchange.v2 · handoff',produces:'theguide.exchange.v2 · receipt',note:'Coach receives handoffs: Ping hands conversations here for review, and seals a receipt when the work is done.'},
  mirrorflow:{consumes:'theguide.exchange.v2 (Sync)',produces:'theguide.exchange.v2 (Ping, Notes)',note:'Ping and Notes seal handoffs and digests; Sync receives them.'},
  riftborn:{consumes:'none',produces:'none',note:'The Codex keeps memory, not correspondence. The game gets no bus until the rift opens.'},
  altar:{consumes:'none',produces:'none',note:'Ideas have no bus. An idea earns one by becoming an app.'}
};
/* ═══════════ THE CONTRACT · what a missive may be ═══════════
   v2 adds a declared kind so the receiver never has to guess what arrived.
   v1 packets are still accepted and read as handoffs — the old contract holds. */
const CONTRACTS = ['theguide.exchange.v1','theguide.exchange.v2'];
const KINDS = {
  handoff:{sigil:'✦',label:'handoff',verb:'deliver',note:'work handed to another instrument'},
  digest: {sigil:'◈',label:'digest', verb:'open',   note:'a summary, sealed for reading'},
  receipt:{sigil:'✓',label:'receipt',verb:'acknowledge',note:'an acknowledgement that work was done'}
};
function readPacket(p){
  if(!p || typeof p!=='object') return {ok:false,why:'not a packet'};
  if(CONTRACTS.indexOf(p.contract)<0) return {ok:false,why:'must declare '+CONTRACTS[CONTRACTS.length-1]};
  const kind = p.kind || (p.contract==='theguide.exchange.v1' ? 'handoff' : null);
  if(!kind) return {ok:false,why:'a v2 packet must declare a kind'};
  if(!KINDS[kind]) return {ok:false,why:'unknown kind · '+kind};
  if(kind!=='receipt' && !APPS[p.to]) return {ok:false,why:'unknown recipient · '+(p.to||'none named')};
  return {ok:true,kind};
}
const kindOf = p => (readPacket(p).kind || 'handoff');
const IDEAS = [
  {name:'MirrorFlow Insight',stage:'concept',desc:'Analytics, pattern detection, signal layers over Ping & Sync data.',dest:'MirrorFlow'},
  {name:'Undercroft Exchange',stage:'prototype',desc:'A harvest surface: browsing donor engines and porting them as modules. Handoff received.',dest:'Shell'},
  {name:'Artemis',stage:'drafting',desc:'Unnamed venture, still veiled. A folder on the workshop floor.',dest:'unplaced'}
];
/* demo packet retired · the exchange carries real missives only (Ping → hand to Coach) */
const KEYS = {session:'tgc.shell2.session',inbox:'tgc.shell2.inbox',demo:'tgc.shell2.demoDone',
  altar:'tgc.shell2.altar',gate:'tgc.shell2.gate',last:'tgc.shell2.last',settings:'tgc.shell2.settings',
  visits:'tgc.shell2.visits', digests:'tgc.shell2.digests'};
const BUILD_RAW = '3 Jul 2026 · v2.0';                       // the builder stamps the real date here · qol pass
const QOL = 'satchel·relay·inbox·stamp·rites·vestry';     // sync marker
const BUILD = BUILD_RAW.charAt(0)==='@' ? 'workshop build' : BUILD_RAW;

/* ═══════════ HELPERS ═══════════ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const pip = (st,extra='') => `<span class="pip" style="--pc:${STATUS[st].dot}"><i></i>${STATUS[st].label}${extra}</span>`;
const lsGet = (k,d) => { try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } };
const lsSet = (k,v) => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),2300); }
document.addEventListener('click',e=>{ const el=e.target.closest('[data-toast]'); if(el){ e.stopPropagation(); toast(el.dataset.toast);} });

(()=>{ const s=$('#stars'); let h='';
  for(let i=0;i<72;i++) h+=`<i style="left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${(Math.random()*4).toFixed(2)}s;opacity:${(.1+Math.random()*.6).toFixed(2)}"></i>`;
  s.innerHTML=h; })();

$('#sky-date').textContent = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});

/* ═══════════ THE FRAME · manager (LRU-3, session, veil) ═══════════ */
const Frame = {
  iframes:{}, order:[], active:null, warmed:{},
  pinned: new Set(lsGet('tgc.shell2.pins',[])),
  togglePin(id){
    Frame.pinned.has(id) ? Frame.pinned.delete(id) : Frame.pinned.add(id);
    lsSet('tgc.shell2.pins',[...Frame.pinned]);
    renderBraziers();
    toast(APPS[id].short + (Frame.pinned.has(id)?' pinned · safe from eviction':' unpinned'));
  },
  reload(){
    const id = Frame.active; if(!id) return;
    const fr = Frame.iframes[id]; if(!fr) return;
    $('#veil').classList.add('on'); $('#veil-line').textContent='re-summoning '+APPS[id].short.toLowerCase();
    fr.src = APPS[id].localPath;
  },
  enter(id){
    const a = APPS[id];
    if(!a || !a.localPath){ toast((a?a.short:'it')+' has no frame yet'); return; }
    if(typeof currentChamber!=='undefined' && currentChamber) closeChamber();
    document.body.dataset.view = 'frame';
    let fr = Frame.iframes[id];
    if(!fr){
      const cap = matchMedia('(max-width:980px)').matches ? 2 : 4;   // phones keep 2 frames warm
      if(Frame.order.length>=cap){
        const evictId = Frame.order.find(x=>x!==Frame.active && x!==id && !Frame.pinned.has(x))
                     || Frame.order.find(x=>x!==Frame.active && x!==id);
        if(evictId){
          Frame.order.splice(Frame.order.indexOf(evictId),1);
          const f2 = Frame.iframes[evictId]; if(f2) f2.remove();
          delete Frame.iframes[evictId];
          toast(APPS[evictId].short+' evicted from the braziers · re-summons on return');
        }
      }
      fr = document.createElement('iframe');
      fr.setAttribute('data-shell-app',id);
      fr.src = a.localPath;                       // apps/<id>.html · same-origin frame
      $('#veil').classList.add('on'); $('#veil-line').textContent = 'summoning '+a.short.toLowerCase();
      fr.addEventListener('load',()=>{ $('#veil').classList.remove('on'); Bus.flush(id); broadcastTheme(fr.contentWindow); });
      $('#frame').appendChild(fr);
      Frame.iframes[id] = fr;
    } else {
      const ix = Frame.order.indexOf(id); if(ix>-1) Frame.order.splice(ix,1);
    }
    Frame.order.push(id);
    { const v = lsGet(KEYS.visits,{}); v[id] = Date.now(); lsSet(KEYS.visits,v); }   /* the pulse: when each door was last truly entered */
    Object.entries(Frame.iframes).forEach(([k,f])=>f.classList.toggle('active',k===id));
    Frame.active = id;
    localStorage.setItem(KEYS.last,id);
    lsSet(KEYS.session,{view:'frame',app:id});
    history.replaceState(null,'','#app='+id);
    renderBraziers(); updateBadge();
  },
  ascend(){
    document.body.dataset.view = 'nave';
    Frame.active = null;
    lsSet(KEYS.session,{view:'nave'});
    history.replaceState(null,'','#nave');
    renderBraziers(); updateBadge();
    if(typeof Pulse!=='undefined') Pulse.paint();   // door pulse lines reflect the visit just made
  },
  warm(id){
    const a = APPS[id];
    if(!a || !a.localPath || Frame.warmed[id]) return;
    Frame.warmed[id] = true;
    try{ fetch(a.localPath).catch(()=>{}); }catch(e){}
  }
};
document.addEventListener('click',e=>{ if(e.target.closest('[data-ascend]')) Frame.ascend(); });

/* ═══════════ THE EXCHANGE · bus, inbox, missive ═══════════ */
const Bus = {
  queue: lsGet(KEYS.inbox,[]),
  pending:{},
  init(){
    window.addEventListener('message',e=>{
      const d = e.data; if(!d || typeof d!=='object') return;
      if(d.type==='tgc.shell.hello' && typeof d.appId==='string'){ Bus.flush(d.appId, e.source); Bus.flushLedger(d.appId, e.source); broadcastTheme(e.source); }
      if(d.type==='tgc.exchange.send' && d.packet) Bus.receive(d.packet);
    });
    Bus.queue = Bus.queue.filter(p=>!p.demo);   // demo missive (Hartley & Co.) retired · inbox starts clean
    Bus.save();
  },
  receive(p){
    const v = readPacket(p);
    if(!v.ok){ toast('packet refused · '+v.why); return; }
    if(v.kind==='digest'){ Bus.ledger(p); return; }   /* telemetry never asks a human to decide */
    Bus.queue.push(p); Bus.save();
    renderMissive(); updateBadge();
    toast('a '+KINDS[v.kind].label+' arrives · '+(p.from||'?')+(p.to?' → '+p.to:''));
  },
  deliver(p){
    if(kindOf(p)==='receipt') return Bus.acknowledge(p);   // a receipt has nowhere to be delivered
    const i = Bus.queue.indexOf(p); if(i>-1) Bus.queue.splice(i,1);
    Bus.save();
    const target = p.to;
    Bus.pending[target] = Bus.pending[target]||[]; Bus.pending[target].push(p);
    renderMissive(); updateBadge();
    toast(KINDS[kindOf(p)].label+' delivered into '+(APPS[target]?APPS[target].short:target));
    Frame.enter(target);
    Bus.flush(target);
  },
  /* The digest ledger · digests accumulate here until their instrument exists and
     mounts, then they are handed over in one go. Capped; oldest fall off first.
     Contract and intent: docs/INSIGHT.md. */
  ledger(p){
    const L = lsGet(KEYS.digests,[]);
    L.push(p);
    while(L.length > 2000) L.shift();
    lsSet(KEYS.digests,L);
    const fr = Frame.iframes[p.to];
    if(fr && fr.contentWindow){ try{ fr.contentWindow.postMessage({type:'tgc.exchange.deliver',packet:p},'*'); }catch(e){} }
  },
  /* hand an instrument its whole backlog when it announces itself */
  flushLedger(id, win){
    const L = lsGet(KEYS.digests,[]).filter(d => d.to === id);
    if(!L.length || !win) return;
    try{ win.postMessage({type:'tgc.exchange.ledger', packets:L},'*'); }catch(e){}
  },
  acknowledge(p){
    const i = Bus.queue.indexOf(p); if(i>-1) Bus.queue.splice(i,1);
    Bus.save(); renderMissive(); updateBadge();
    toast('receipt acknowledged · the work is recorded');
  },
  dismiss(p){
    const i = Bus.queue.indexOf(p); if(i>-1) Bus.queue.splice(i,1);
    Bus.save(); renderMissive(); updateBadge();
    toast('missive set aside');
  },
  flush(id,source){
    const fr = Frame.iframes[id];
    const win = source || (fr && fr.contentWindow);
    if(!win || !Bus.pending[id] || !Bus.pending[id].length) return;
    Bus.pending[id].splice(0).forEach(p=>{
      try{ win.postMessage({type:'tgc.exchange.deliver',packet:p},'*'); }catch(e){}
    });
  },
  save(){ lsSet(KEYS.inbox,Bus.queue); }
};

function updateBadge(){
  const n = Bus.queue.length;
  document.title = (n>0?'✦'+n+' · ':'') + (Frame.active?APPS[Frame.active].short+' · ':'') + 'theGuide.Club';
  const dm = $('#tb-missive');
  if(dm){ dm.textContent = (n?KINDS[kindOf(Bus.queue[0])].sigil:'✦')+' '+n; dm.classList.toggle('on',n>0); }
  const an = $('#tb-appname'); if(an) an.textContent = Frame.active ? APPS[Frame.active].name+' · '+APPS[Frame.active].version : '';
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const x = cv.getContext('2d');
  x.fillStyle='#0a0d14'; x.beginPath(); x.arc(16,16,15,0,7); x.fill();
  x.strokeStyle='#d4af37'; x.lineWidth=2; x.beginPath(); x.arc(16,16,11,0,7); x.stroke();
  x.fillStyle='#d4af37'; x.font='14px Georgia'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('G',16,17);
  if(n>0){ x.fillStyle='#e2b85a'; x.beginPath(); x.arc(26,6,5,0,7); x.fill(); }
  let l = document.querySelector('link[rel="icon"]');
  if(!l){ l = document.createElement('link'); l.rel='icon'; document.head.appendChild(l); }
  l.href = cv.toDataURL();
}
function renderBraziers(){
  $$('[data-braziers]').forEach(el=>{
    el.innerHTML = [0,1,2,3].map(i=>{
      const mounted = Frame.order[i];
      const pin = mounted && Frame.pinned.has(mounted);
      return mounted
        ? `<span class="brz lit ${mounted===Frame.active?'active':''} ${pin?'pin':''}" style="--bc:${APPS[mounted].accent}" tabindex="0" role="button"
             aria-label="${APPS[mounted].name}, kept warm" title="${APPS[mounted].name} · click to switch · right-click to ${pin?'unpin':'pin'}" data-brz="${mounted}">${APPS[mounted].glyph}</span>`
        : `<span class="brz" title="an unlit brazier · a free frame slot">·</span>`;
    }).join('');
  });
}
document.addEventListener('click',e=>{
  const b = e.target.closest('[data-brz]');
  if(b){ e.stopPropagation(); Frame.enter(b.dataset.brz); }
});
document.addEventListener('contextmenu',e=>{
  const b = e.target.closest('[data-brz]');
  if(b){ e.preventDefault(); Frame.togglePin(b.dataset.brz); }
});
/* keyboard activation for focusable door panels & braziers */
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter' && e.key!==' ') return;
  const t = e.target;
  if(t.classList && t.classList.contains('tp-panel')){ e.preventDefault(); openChamber(t.dataset.world); }
  else if(t.dataset && t.dataset.brz){ e.preventDefault(); Frame.enter(t.dataset.brz); }
});

/* missive in the sky (nave) · comet, constellation, drag-to-deliver */
function renderMissive(){
  const sky = $('#sky');
  const old = $('#missive'); if(old) old.remove();
  const oldC = $('#comet'); if(oldC) oldC.remove();
  const svg = $('#constellation'); svg.innerHTML = '';
  const head = Bus.queue[0];
  if(!head) return;
  const fromW = APPS[head.from] ? APPS[head.from].world : 'mirrorflow';
  const toW   = APPS[head.to]   ? APPS[head.to].world   : 'excelsior';
  const r = sky.getBoundingClientRect(), y = r.height*0.46;
  svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
  svg.innerHTML = `<line class="live" x1="${r.width*SKY_X[fromW]/100}" y1="${y}" x2="${r.width*SKY_X[toW]/100}" y2="${y}"/>`;
  const c = document.createElement('div'); c.id='comet';
  c.style.setProperty('--cx1',SKY_X[fromW]+'%'); c.style.setProperty('--cy1','46%');
  c.style.setProperty('--cx2',SKY_X[toW]+'%');   c.style.setProperty('--cy2','46%');
  sky.appendChild(c);
  const m = document.createElement('div');
  m.id='missive'; m.textContent=KINDS[kindOf(head)].sigil+' '+Bus.queue.length;
  m.setAttribute('role','button'); m.setAttribute('tabindex','0');
  m.setAttribute('aria-label',Bus.queue.length+' sealed missives waiting · open the inbox');
  m.title = kindOf(head)==='receipt'
    ? 'a receipt waits · click to open the inbox and acknowledge it'
    : 'drag onto '+(WORLDS[toW]?WORLDS[toW].name:toW)+' to '+KINDS[kindOf(head)].verb+' · double-click to set aside';
  const homeLeft = (SKY_X[toW]+3.4)+'%';
  m.style.left = homeLeft; m.style.top='30%';
  sky.appendChild(m);
  let drag = null;
  const home = ()=>{ m.style.position='absolute'; m.style.left=homeLeft; m.style.top='30%'; m.style.transform='translate(-50%,-50%)'; };
  m.addEventListener('dblclick',()=>Bus.dismiss(head));
  m.addEventListener('pointerdown',e=>{ e.preventDefault(); m.setPointerCapture(e.pointerId); drag={x0:e.clientX,y0:e.clientY,moved:false}; });
  m.addEventListener('pointermove',e=>{
    if(!drag) return;
    if(Math.abs(e.clientX-drag.x0)+Math.abs(e.clientY-drag.y0)>6){ drag.moved=true; m.classList.add('dragging'); }
    if(!drag.moved) return;
    m.style.position='fixed'; m.style.left=e.clientX+'px'; m.style.top=e.clientY+'px'; m.style.transform='translate(-50%,-50%)';
    const under = document.elementFromPoint(e.clientX,e.clientY);
    $$('.tp-panel').forEach(p=>p.classList.remove('drop-ok'));
    const door = under && under.closest ? under.closest('.tp-panel') : null;
    if(door && door.dataset.world===toW) door.classList.add('drop-ok');
  });
  m.addEventListener('pointerup',e=>{
    if(!drag) return;
    const moved = drag.moved; drag = null; m.classList.remove('dragging');
    const under = document.elementFromPoint(e.clientX,e.clientY);
    const door = under && under.closest ? under.closest('.tp-panel') : null;
    $$('.tp-panel').forEach(p=>p.classList.remove('drop-ok'));
    if(moved && door && door.dataset.world===toW && kindOf(head)!=='receipt') return Bus.deliver(head);
    home();
    if(moved && door) toast('the missive is addressed to '+(APPS[head.to]?APPS[head.to].short:head.to)+' · it will not open elsewhere');
    else if(!moved) openInbox();
  });
}
$('#tb-missive').addEventListener('click',()=>openInbox());

/* ═══════════ THE INBOX · full missive queue ═══════════ */
function openInbox(){ renderInbox(); $('#inbox').classList.add('open'); }
function closeInbox(){ $('#inbox').classList.remove('open'); }
function renderInbox(){
  const list = $('#inbox-list');
  if(!Bus.queue.length){
    list.innerHTML = `<div class="ib-empty">the inbox is clear · no missives wait</div>`;
  } else {
    list.innerHTML = Bus.queue.map((p,ix)=>{
      const toApp = APPS[p.to], kind = kindOf(p), K = KINDS[kind];
      const act = kind==='receipt' ? 'acknowledge ✓'
                : kind==='digest'  ? (toApp?'open in '+toApp.short:'open')+' ↘'
                                   : (toApp?'deliver to '+toApp.short:'deliver')+' ↘';
      return `<div class="ib-row" data-kind="${kind}" style="--iacc:${toApp?toApp.accent:'#d4af37'}">
        <div class="ib-sigil" title="${K.note}">${K.sigil}</div>
        <div class="ib-main">
          <div class="ib-sub">${p.subject||'a sealed missive'}</div>
          <div class="ib-meta"><b class="ib-kind">${K.label}</b>${(p.from||'?')}${p.to?`<span>→</span>${p.to}`:''}${p.privacy?' · '+p.privacy:''}</div>
          ${p.coachSeed?`<div class="ib-seed">${p.coachSeed}</div>`:''}
        </div>
        <div class="ib-acts">
          <button class="ib-btn go" data-ib-deliver="${ix}">${act}</button>
          <button class="ib-btn" data-ib-dismiss="${ix}">set aside</button>
        </div>
      </div>`;
    }).join('');
  }
  $('#inbox-count').textContent = Bus.queue.length+' '+(Bus.queue.length===1?'missive':'missives');
}
document.addEventListener('click',e=>{
  if(e.target.closest('#inbox-close') || e.target.id==='inbox') return closeInbox();
  const dlv = e.target.closest('[data-ib-deliver]');
  if(dlv){ const p=Bus.queue[parseInt(dlv.dataset.ibDeliver,10)]; if(p){ closeInbox(); Bus.deliver(p); } return; }
  const dis = e.target.closest('[data-ib-dismiss]');
  if(dis){ const p=Bus.queue[parseInt(dis.dataset.ibDismiss,10)]; if(p){ Bus.dismiss(p); renderInbox(); } return; }
});

/* ═══════════ THE SATCHEL · export / import all data ═══════════ */
function gatherStore(){ const o={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.indexOf('tgc.')===0) o[k]=localStorage.getItem(k); } return o; }
function exportSatchel(){
  const store = gatherStore();
  const data = {__tgc_satchel:1, build:BUILD, at:new Date().toISOString(), store};
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = 'theguide-satchel-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>{ try{ URL.revokeObjectURL(u); }catch(e){} },2000);
  toast('the satchel is packed · '+Object.keys(store).length+' stores written');
}
function importSatchel(file){
  const fr = new FileReader();
  fr.onload = ()=>{
    let j; try{ j = JSON.parse(fr.result); }catch(e){ j=null; }
    if(!j || !j.store || typeof j.store!=='object'){ toast('not a satchel · import refused'); return; }
    let n=0; Object.entries(j.store).forEach(([k,v])=>{ if(k.indexOf('tgc.')===0){ try{ localStorage.setItem(k,String(v)); n++; }catch(e){} } });
    toast('the satchel is unpacked · '+n+' stores · reloading');
    setTimeout(()=>location.reload(),950);
  };
  fr.readAsText(file);
}
$('#satchel-in').addEventListener('change',e=>{ if(e.target.files[0]) importSatchel(e.target.files[0]); e.target.value=''; });

/* ═══════════ SETTINGS ═══════════ */
const SETTINGS = lsGet(KEYS.settings,{});
function setSetting(k,v){ SETTINGS[k]=v; lsSet(KEYS.settings,SETTINGS); applySettings(); }
function applySettings(){
  document.documentElement.classList.toggle('still', !!SETTINGS.stillNave);
}
if(!document.getElementById('still-css')){
  const s=document.createElement('style'); s.id='still-css';
  s.textContent='.still *,.still *::before,.still *::after{animation:none!important;transition:none!important}';
  document.head.appendChild(s);
}
applySettings();

/* ═══════════ STORAGE REPORT ═══════════ */
function bytesOf(k){ try{ return (localStorage.getItem(k)||'').length; }catch(e){ return 0; } }
function fmtBytes(n){ return n<1024 ? n+' B' : n<1048576 ? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(2)+' MB'; }
function storageReport(){
  const apps = Object.keys(APPS).map(id=>({label:APPS[id].name,key:'tgc.appstore.'+id,bytes:bytesOf('tgc.appstore.'+id)}));
  let shell=0; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.indexOf('tgc.shell2.')===0) shell+=bytesOf(k); }
  return {apps, shell, total: apps.reduce((a,b)=>a+b.bytes,0)+shell};
}
function clearAppData(id){
  try{ localStorage.removeItem('tgc.appstore.'+id); }catch(e){}
  if(Frame.iframes[id]){ Frame.iframes[id].remove(); delete Frame.iframes[id]; const ix=Frame.order.indexOf(id); if(ix>-1) Frame.order.splice(ix,1); renderBraziers(); }
  if(currentChamber==='vestry') relight();
  toast(APPS[id].short+'’s data cleared · re-summons fresh');
}

/* ═══════════ THE PULSE · honest live signals, no theatre ═══════════
   Everything here is read from real state: visit stamps (KEYS.visits),
   appstore bytes, altar candles. If the house can't know it, it isn't shown. */
const Pulse = {
  visits: () => lsGet(KEYS.visits,{}),
  appBytes: id => bytesOf('tgc.appstore.'+id),
  worldApps: id => Object.values(APPS).filter(a=>a.world===id),
  ideas: () => IDEAS.length + userIdeas().length,
  ago(ts){
    const s = Math.max(0,(Date.now()-ts)/1000);
    if(s<90) return 'moments ago';
    if(s<5400) return Math.round(s/60)+' min ago';
    if(s<129600) return Math.round(s/3600)+' h ago';
    return Math.round(s/86400)+' d ago';
  },
  visitLine(id){
    const t = Pulse.visits()[id];
    return t ? 'entered '+Pulse.ago(t) : 'not yet entered here';
  },
  worldLast(id){
    const v = Pulse.visits();
    const ts = Pulse.worldApps(id).map(a=>v[a.id]||0).reduce((a,b)=>Math.max(a,b),0);
    return ts || null;
  },
  line(id){
    if(id==='altar'){ const n=Pulse.ideas(); return n+' idea'+(n===1?'':'s')+' resting'; }
    const apps = Pulse.worldApps(id), act = apps.filter(a=>a.status==='active').length;
    const last = Pulse.worldLast(id);
    return apps.length+' instrument'+(apps.length===1?'':'s')+' · '+act+' active'
      + (last ? ' · entered '+Pulse.ago(last) : '');
  },
  paint(){ $$('.tp-panel').forEach(p=>{ const el=p.querySelector('.tp-pulse'); if(el) el.textContent = Pulse.line(p.dataset.world); }); }
};

/* ═══════════ THE RITES · self-test ═══════════ */
function runRites(){
  const rites = [];
  // localStorage
  try{ localStorage.setItem('tgc.__rite','1'); const ok=localStorage.getItem('tgc.__rite')==='1'; localStorage.removeItem('tgc.__rite'); rites.push(['local store','writes and reads',ok]); }
  catch(e){ rites.push(['local store','blocked · shim should engage',false]); }
  // sessionStorage
  try{ sessionStorage.setItem('tgc.__rite','1'); sessionStorage.removeItem('tgc.__rite'); rites.push(['session store','writes and reads',true]); }
  catch(e){ rites.push(['session store','blocked',false]); }
  // blob + objectURL (the app-delivery mechanism)
  let blobOk=false; try{ const u=URL.createObjectURL(new Blob(['x'],{type:'text/html'})); blobOk=!!u; URL.revokeObjectURL(u); }catch(e){}
  rites.push(['blob frames','apps decode to blob urls',blobOk]);
  // canvas (favicon)
  let cvOk=false; try{ const c=document.createElement('canvas'); c.width=c.height=8; cvOk=c.getContext('2d').canvas.toDataURL().indexOf('data:image')===0; }catch(e){}
  rites.push(['canvas seal','favicon badge renders',cvOk]);
  // fonts
  let fontOk=true; try{ fontOk = document.fonts ? document.fonts.check('600 12px "Playfair Display"') : true; }catch(e){}   /* 600 = the weight the shell actually uses · faces load lazily per weight */
  rites.push(['fonts','display family loaded',fontOk]);
  // app payloads resolvable
  /* an instrument declared but not yet built (status 'soon') has no frame by design —
     the rite checks that everything claiming to be enterable actually is */
  const enterable = Object.keys(APPS).filter(id=>APPS[id].status!=='soon');
  const appsReady = enterable.filter(id=>{ try{ return !!APPS[id].localPath; }catch(e){ return false; } }).length;
  const declared  = Object.keys(APPS).length - enterable.length;
  rites.push(['apps mounted',appsReady+' of '+enterable.length+' resolve a source'+(declared?' · '+declared+' declared, not yet built':''),appsReady===enterable.length]);
  // bus echo (async)
  const token = 'rite-'+Date.now();
  let busOk=false;
  const onEcho = ev=>{ if(ev.data && ev.data.type==='tgc.rite.echo' && ev.data.token===token){ busOk=true; window.removeEventListener('message',onEcho); paint(); } };
  window.addEventListener('message',onEcho);
  try{ window.postMessage({type:'tgc.rite.echo',token},'*'); }catch(e){}
  rites.push(['exchange bus','postMessage echoes',null]); // resolved async
  // the contract itself · every kind reads, every malformed packet is refused
  let contractOk = false;
  try{
    contractOk = Object.keys(KINDS).every(k=>readPacket({contract:'theguide.exchange.v2',kind:k,from:'ping',to:'coach'}).ok)
      && readPacket({contract:'theguide.exchange.v1',from:'ping',to:'coach'}).kind==='handoff'
      && !readPacket({contract:'not.a.contract',from:'ping',to:'coach'}).ok
      && !readPacket({contract:'theguide.exchange.v2',kind:'nonsense',to:'coach'}).ok
      && !readPacket({contract:'theguide.exchange.v2',kind:'handoff',to:'no-such-app'}).ok;
  }catch(e){}
  rites.push(['exchange contract','v2 kinds read · malformed refused',contractOk]);
  function paint(){
    const idx = rites.findIndex(r=>r[0]==='exchange bus');
    if(idx>-1) rites[idx][2] = busOk;
    const pass = rites.filter(r=>r[2]===true).length, fail = rites.filter(r=>r[2]===false).length;
    $('#rites-sum').textContent = pass+' kept · '+(fail?fail+' broken':'all rites held');
    $('#rites-list').innerHTML = rites.map(r=>`
      <div class="rt-row" data-st="${r[2]===null?'wait':r[2]?'ok':'bad'}">
        <span class="rt-dot"></span>
        <span class="rt-name">${r[0]}</span>
        <span class="rt-note">${r[1]}</span>
        <span class="rt-mark">${r[2]===null?'…':r[2]?'✓':'✕'}</span>
      </div>`).join('');
  }
  paint();
  setTimeout(paint,250);
  $('#rites').classList.add('open');
}
document.addEventListener('click',e=>{ if(e.target.closest('#rites-close')||e.target.id==='rites') $('#rites').classList.remove('open'); });

/* relay messages from the chambers/vestry buttons */
document.addEventListener('click',e=>{
  const act = e.target.closest('[data-do]'); if(!act) return;
  const d = act.dataset.do;
  if(d==='export') return exportSatchel();
  if(d==='import') return $('#satchel-in').click();
  if(d==='rites') return runRites();
  if(d==='toggle-gate'){ setSetting('gateOff',!SETTINGS.gateOff); relight(); return toast(SETTINGS.gateOff?'the threshold will be skipped':'the threshold returns'); }
  if(d==='toggle-still'){ setSetting('stillNave',!SETTINGS.stillNave); relight(); return toast(SETTINGS.stillNave?'the nave is stilled':'motion restored'); }
  if(d==='toggle-weather'){ setSetting('weather',!SETTINGS.weather); if(SETTINGS.weather) fetchWeather(true); else setWeather('',false); relight(); return toast(SETTINGS.weather?'live weather on · reading your sky':'weather off'); }
  const clr = act.dataset.do==='clear' ? act.dataset.app : null;
  if(clr) return clearAppData(clr);
});

/* ═══════════ KEY RELAY · from inside hosted apps ═══════════ */
window.addEventListener('message',e=>{
  const d = e.data; if(!d || d.type!=='tgc.keys') return;
  const c = d.combo;
  if(c==='esc'){ if(currentChamber) return closeChamber(); if(document.body.dataset.view==='frame') return Frame.ascend(); return; }
  if(c==='ctrlk'){ return $('#palette').classList.contains('open') ? palClose() : palOpen(); }
  if(/^ctrl[1-4]$/.test(c)){ return Frame.enter(DOCK[parseInt(c.slice(4),10)-1]); }
});

/* ═══════════ THE SKY · bodies, sun, moon ═══════════ */
(()=>{
  const sky = $('#sky');
  ORDER.forEach(id=>{
    const w = WORLDS[id];
    const b = document.createElement('div');
    b.className = 'sky-body'+(w.flagship?' flag':'');
    b.dataset.status = w.status; b.dataset.world = id;
    b.style.left = SKY_X[id]+'%';
    b.style.setProperty('--ac',w.accent);
    b.innerHTML = `<div class="sky-orb"></div>
      <div class="sky-tag">${w.name} · ${STATUS[w.status].label} · ${w.version}</div>`;
    b.addEventListener('mouseenter',()=>{ const d=$(`.tp-panel[data-world="${id}"]`); if(d) d.classList.add('breathe'); if(w.app) Frame.warm(w.app); });
    b.addEventListener('mouseleave',()=>{ const d=$(`.tp-panel[data-world="${id}"]`); if(d) d.classList.remove('breathe'); });
    b.addEventListener('click',()=>openChamber(id));
    sky.appendChild(b);
  });
  const now = new Date(), dayFrac = (now.getHours()+now.getMinutes()/60)/24;
  const sun = document.createElement('div');
  sun.id='sun'; sun.className='sky-body';
  sun.style.left = (6+dayFrac*88).toFixed(1)+'%'; sun.style.top='18%';
  sun.innerHTML = `<span style="font-size:11px;color:var(--gilt);text-shadow:0 0 10px var(--gilt-soft)">☉</span>
    <div class="sky-tag">the sun · ${now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · walks the band by the hour</div>`;
  sky.appendChild(sun);
  const synodic = 29.53058867, refNew = Date.UTC(2000,0,6,18,14)/86400000;
  const age = ((Date.now()/86400000 - refNew) % synodic + synodic) % synodic;
  const ph = age/synodic, ill = Math.round((1-Math.cos(2*Math.PI*ph))/2*100);
  const names = ['new moon','waxing crescent','first quarter','waxing gibbous','full moon','waning gibbous','last quarter','waning crescent'];
  const mname = names[Math.floor(((ph+1/16)%1)*8)];
  const off = ((ph<.5 ? 1 : -1)*(1-ill/100)*13).toFixed(1);
  const moon = document.createElement('div');
  moon.id='moon'; moon.className='sky-body';
  moon.style.left='93.5%'; moon.style.top='28%';
  moon.innerHTML = `<div class="moon-disc"><i style="transform:translateX(${off}px)"></i></div>
    <div class="sky-tag">${mname} · ${ill}% lit · day ${Math.round(age)} of the cycle</div>`;
  sky.appendChild(moon);
})();

/* ═══════════ THE DOORS ═══════════ */
const LADDER = { lit: 9, total: 12 };   // excelsior's rung count · one source, read by the door rays and the chamber ladder
/* the altar's embers · one per resting idea, named on hover (B4) */
function altarEmbersHTML(){
  const ideas = [...IDEAS, ...userIdeas()];
  return `<div class="tp-embers">${ideas.map((i,k)=>
    `<span class="em" data-nm="${String(i.name).replace(/"/g,'&quot;')}" style="left:${18+((k*29)%64)}%;animation-delay:${((k*0.8)%4.2).toFixed(1)}s"></span>`
  ).join('')}</div>`;
}
function paintEmbers(){
  const old = $('.tp-panel[data-world="altar"] .tp-embers');
  if(old) old.outerHTML = altarEmbersHTML();
}
$('#tp-panels').innerHTML = ORDER.map(id=>{
  const w = WORLDS[id], locked = !w.app;
  const moons = id==='mirrorflow' ? `
    <div class="tp-moonring">
      ${[['ping',9,'-52deg'],['sync',14,'0deg'],['notes',20,'52deg']].map(([mid,T,fan])=>`
      <div class="mn" style="--T:${T}s;--fan:${fan}">
        <i style="--mc:${APPS[mid].accent}" data-launch="${mid}" data-nm="${APPS[mid].short}" title="${APPS[mid].name}"></i>
      </div>`).join('')}
    </div>` : '';
  const litRays = Math.round(24*LADDER.lit/LADDER.total);
  const MOTIF = {
    excelsior:`<svg class="tp-rays" viewBox="0 0 200 200" aria-hidden="true">${[...Array(24)].map((_,k)=>{const a=k*Math.PI/12;return `<line class="${k<litRays?'lit':''}" x1="${100+Math.cos(a)*58}" y1="${100+Math.sin(a)*58}" x2="${100+Math.cos(a)*(k%2?78:88)}" y2="${100+Math.sin(a)*(k%2?78:88)}"/>`;}).join('')}</svg>`,
    riftborn:`<div class="tp-orbits">${[['13s','42%','normal'],['19s','58%','reverse'],['25s','74%','normal']].map(([T,R,D])=>`<div class="orbit-ring" style="--T:${T};--rr:${R};animation-direction:${D}"><i></i></div>`).join('')}<span class="tp-rift-line"></span></div>`,
    altar: altarEmbersHTML()
  };
  const motif = MOTIF[id] || '';
  return `
  <div class="tp-panel ${w.flagship?'flag':''} ${locked?'locked':''}" style="--ac:${w.accent};--wash:${w.accent}22" data-world="${id}"
    role="button" tabindex="0" aria-label="${w.name} · ${w.tagline} · open its chamber">
    <div class="tp-arch"></div>
    ${motif}
    <div class="tp-glyph">${w.glyph}</div>
    ${w.flagship?'<div class="tp-halo"></div>':''}
    ${moons}
    <div class="tp-info">
      <div class="nm">${w.name}</div>
      <div class="motto">· ${w.motto} ·</div>
      <div class="tp-reveal">
        <div class="tp-kind">${w.tagline}</div>
        <div class="tp-meta"><span class="pip" style="--pc:${STATUS[w.status].dot}"><i></i>${STATUS[w.status].label} · ${w.version}</span></div>
        <div class="tp-pulse">${Pulse.line(id)}</div>
        <div class="tp-actions">
          <span class="tp-act">open the chamber</span>
          ${id==='altar'?`<span class="tp-act go" data-altar-lay>✶ lay an idea</span>`:''}
          ${locked?'':`<span class="tp-act go" data-launch="${w.app}">↘ enter now</span>`}
        </div>
        ${id==='altar'?`<div class="tp-lay" hidden><input maxlength="60" placeholder="name the idea, press enter…" aria-label="lay a new idea on the altar"></div>`:''}
      </div>
    </div>
  </div>`;
}).join('');
$$('.tp-panel').forEach(p=>{
  p.addEventListener('mouseenter',()=>{ const w=WORLDS[p.dataset.world]; if(w && w.app) Frame.warm(w.app); });
});
document.addEventListener('click',e=>{
  const el = e.target.closest('[data-launch]');
  if(el){ e.stopPropagation(); Frame.enter(el.dataset.launch); }
});

/* parallax */
(()=>{
  let raf = null;
  addEventListener('mousemove',e=>{
    if(raf || document.body.dataset.view==='frame') return;
    raf = requestAnimationFrame(()=>{
      const nx = (e.clientX/innerWidth - .5), ny = (e.clientY/innerHeight - .5);
      $('#stars').style.transform = `translate(${nx*-7}px,${ny*-5}px)`;
      $$('.tp-panel').forEach(p=>p.style.setProperty('--px',(nx*10)+'px'));
      $$('.sky-body').forEach(b=>b.style.marginLeft = (nx*-5)+'px');
      raf = null;
    });
  });
})();

/* ═══════════ CHAMBER MODULES ═══════════ */
function moduleExcelsior(w){ return `
  <div class="ch-mod-h">The Atelier · three disciplines</div>
  <div class="ex-creed">“We do not pitch. We make the honest argument, and we make it beautifully.”
    <small>the house creed · ars vendendi</small></div>
  <div class="ex-disc">
    <div class="ex-d"><div class="r">I</div><div class="t">Argument</div><div class="s">The case itself: structure, evidence, the shape of persuasion.</div></div>
    <div class="ex-d"><div class="r">II</div><div class="t">Mindset</div><div class="s">The seller's posture: calm, curious, never needy.</div></div>
    <div class="ex-d"><div class="r">III</div><div class="t">Craft</div><div class="s">Delivery: timing, language, the review after the call.</div></div>
  </div>
  <div class="ex-ladder">the ladder · current rung: <b style="color:var(--cacc)">${w.version}</b>
    <div class="rungs">${[...Array(LADDER.total)].map((_,k)=>`<span class="rung ${k<LADDER.lit?'lit':''}"></span>`).join('')}</div>
    <div class="cap"><span>prototype</span><span>excelsior · ever upward</span><span>v3.0</span></div>
  </div>`;
}
function moduleMirrorflow(w){
  const card = id => { const a=APPS[id]; return `
    <div class="mf-card" style="--iacc:${a.accent}" data-launch="${id}">
      <div class="g">${a.glyph}</div><div class="n">${a.short}</div>
      <div class="k">${a.kind} · ${a.version} · ${STATUS[a.status].label}</div>
      <div class="d">${a.desc}</div>
      <div class="foot"><span>${Pulse.visitLine(id)}</span><span class="e">enter ↘</span></div>
    </div>`; };
  return `
  <div class="ch-mod-h">The two instruments</div>
  <div class="mf-pair">${card('ping')}${card('sync')}</div>
  <div class="mf-axis">· the moment ↔ the long arc ·</div>
  <div class="mf-notes" data-launch="notes">
    <span class="g">N</span><span><b style="font-weight:500;color:var(--cink)">Notes</b> · ${APPS.notes.desc} <span style="opacity:.6">· ${Pulse.visitLine('notes')}</span></span>
    <span class="e">enter ↘</span>
  </div>`;
}
function moduleRiftborn(w){ return `
  <div class="ch-mod-h">The Codex · memory of the worlds</div>
  <div class="cx-term">
    <div class="ln"><span class="p">☉ codex</span> :: mounted · riftborn terminal <b>v2.0</b></div>
    <div class="ln">holds :: rituals · design bibles · lore</div>
    <div class="ln">integrity :: <b>canon</b> · nothing deleted, everything sealed</div>
    <div class="ln"><span class="p">&gt;</span> open the codex <span class="cur"></span></div>
  </div>
  <div class="cx-shelves">
    <div class="cx-shelf"><div class="t">Fables</div><div class="s">worldbuilding · symbols · the lore beneath the worlds</div></div>
    <div class="cx-shelf"><div class="t">Design Bibles</div><div class="s">universal design bible · brand bibles · token law</div></div>
    <div class="cx-shelf"><div class="t">Rituals & Manuals</div><div class="s">working modes · shell canon · exchange contract</div></div>
  </div>
  <div class="ch-mod-h" style="margin-top:28px">The Rift · the game, forming</div>
  <div class="rb-rift"><div class="rb-crack"></div><div class="rb-crack c2"></div>
    <div class="cap">the door is drawn · not yet cut</div></div>
  <div class="rb-stats">
    <div class="rb-st"><div class="n">v0.0.3</div><div class="l">rules draft</div></div>
    <div class="rb-st"><div class="n">Forming</div><div class="l">the game's state</div></div>
  </div>`;
}
function userIdeas(){ return lsGet(KEYS.altar,[]); }
function moduleAltar(w){
  const icons = {concept:'○',prototype:'◉',drafting:'◌',laid:'✶'};
  const row = (i,user,ix) => `
  <div class="al-slot lit">
    <div class="al-flame">${icons[i.stage]||'○'}</div>
    <div class="al-main"><div class="n">${i.name}<small>${i.stage}</small></div>
      <div class="d">${i.desc}</div></div>
    <div class="al-dest">would join<br><b>${i.dest}</b></div>
    ${user?`<span class="al-snuff" data-snuff="${ix}" title="snuff & seal">✕</span>`:''}
  </div>`;
  return `
  <div class="ch-mod-h">The Cradle · what rests here</div>
  ${IDEAS.map(i=>row(i,false)).join('')}
  ${userIdeas().map((i,ix)=>row(i,true,ix)).join('')}
  <div class="al-slot empty" id="al-new">
    <div class="al-flame">+</div>
    <div class="al-main"><div class="n">an unlit candle · lay the next idea on the altar</div></div>
  </div>
  <div class="rb-note" style="margin-top:16px">Three fates from here: a candle that catches becomes a world. One that serves another world becomes its instrument. One that gutters is sealed in the undercroft: named, dated, never deleted.</div>`;
}
function moduleUndercroft(){ return `
  <div class="ch-mod-h">The Reliquary · sealed donors</div>
  ${ARCHIVE.map(a=>`
  <div class="uc-row">
    <div class="uc-seal">✕</div>
    <div class="uc-main"><div class="n">${a.name}<small>${a.version} · sealed ${a.sealed}</small></div>
      <div class="note">${a.note}</div></div>
    <div class="uc-succ">succeeded by<br><b>${a.to}</b></div>
  </div>`).join('')}`;
}
function moduleVestry(){
  const rep = storageReport();
  const meter = (label,bytes,clrApp)=>`
    <div class="vs-meter">
      <div class="vs-mrow"><span class="vs-mlbl">${label}</span><span class="vs-mval">${fmtBytes(bytes)}${clrApp?` <span class="vs-clear" data-do="clear" data-app="${clrApp}">clear</span>`:''}</span></div>
      <div class="vs-bar"><i style="width:${rep.total?Math.max(2,Math.round(bytes/rep.total*100)):0}%"></i></div>
    </div>`;
  return `
  <div class="ch-mod-h">The Satchel · your data, portable</div>
  <div class="vs-grid2">
    <button class="vs-act go" data-do="export">⇩ pack the satchel <small>export all data to a file</small></button>
    <button class="vs-act" data-do="import">⇧ unpack a satchel <small>import &amp; restore from a file</small></button>
  </div>

  <div class="ch-mod-h" style="margin-top:26px">The Rites</div>
  <div class="vs-grid2">
    <button class="vs-act" data-do="rites">✦ run the rites <small>self-test storage, blobs, bus, fonts</small></button>
  </div>

  <div class="ch-mod-h" style="margin-top:26px">Observances</div>
  <label class="vs-toggle"><span>Skip the threshold <small>open straight into the nave</small></span>
    <span class="vs-sw ${SETTINGS.gateOff?'on':''}" data-do="toggle-gate"></span></label>
  <label class="vs-toggle"><span>Still the nave <small>halt all motion, ignore OS setting</small></span>
    <span class="vs-sw ${SETTINGS.stillNave?'on':''}" data-do="toggle-still"></span></label>
  <label class="vs-toggle"><span>Live weather &amp; sky <small>uses your location · the nave mirrors your real sky</small></span>
    <span class="vs-sw ${SETTINGS.weather?'on':''}" data-do="toggle-weather"></span></label>

  <div class="ch-mod-h" style="margin-top:26px">The Stores · ${fmtBytes(rep.total)} held</div>
  ${rep.apps.map(a=>meter(a.label,a.bytes,a.bytes?a.key.split('.').pop():null)).join('')}
  ${meter('Shell · nave, altar, session, inbox',rep.shell,null)}`;
}
const MODULES = {excelsior:moduleExcelsior,mirrorflow:moduleMirrorflow,riftborn:moduleRiftborn,altar:moduleAltar};

/* ═══════════ CHAMBER SHELL ═══════════ */
const CH_ORDER = [...ORDER,'undercroft','vestry'];
let currentChamber = null;
function chamberCSS(p,accent){
  const c = $('#chamber');
  c.style.setProperty('--cbg',p.bg); c.style.setProperty('--cink',p.ink);
  c.style.setProperty('--cacc',accent); c.style.setProperty('--cfire',p.fire);
  c.style.setProperty('--cmut','color-mix(in srgb,'+p.ink+' 52%,transparent)');
  c.style.setProperty('--cmut2','color-mix(in srgb,'+p.ink+' 30%,transparent)');
  c.style.setProperty('--crule','color-mix(in srgb,'+accent+' 22%,transparent)');
}
function navArrows(id){
  const ix = CH_ORDER.indexOf(id);
  const prev = CH_ORDER[(ix-1+CH_ORDER.length)%CH_ORDER.length];
  const next = CH_ORDER[(ix+1)%CH_ORDER.length];
  const nm = k => WORLDS[k] ? WORLDS[k].name.toLowerCase() : 'the '+k;
  return `<span class="x" data-nav="${prev}" title="walk left">← ${nm(prev)}</span><span class="x" data-nav="${next}" title="walk right">${nm(next)} →</span><span class="x" data-close>esc · return ✕</span>`;
}
function buildChamberHTML(id){
  if(id==='undercroft'){
    chamberCSS({bg:'#0b0d12',ink:'#cfd6dd',fire:'#7890a0'},'#8fa0b0');
    return `
    <div class="ch-bar"><span class="crumb">the heavens / <b>the undercroft</b></span><span class="nav">${navArrows(id)}</span></div>
    <div class="ch-glyph-bg">⌑</div>
    <div class="ch-grid">
      <div class="ch-id">
        <div class="stat-line">${pip('archived',' · read-only')}</div>
        <h1>The Undercroft</h1>
        <div class="motto">· Nihil Perit · nothing is lost ·</div>
        <div class="desc">Donor codebases, sealed and kept. These are not dead products: they are quarries. Engines, patterns and logic are harvested from here into the living apps. Nothing gets deleted; nothing gets patched in place. The donors themselves stay in the workshop: this portable carries their records, not their weight.</div>
        <div class="ch-pulse-row">
          <div class="ch-pulse"><div class="n" data-count="5">5</div><div class="l">sealed donors</div></div>
          <div class="ch-pulse"><div class="n" data-count="3">3</div><div class="l">feed ping</div></div>
        </div>
        <button class="ch-enter" disabled>read-only · no frame to enter</button>
      </div>
      <div class="ch-module">${moduleUndercroft()}</div>
    </div>
    <div class="ch-foot"><div class="blk"><span class="h">rule</span><br>audit first, port second · donors are quarries, never the dock</div>
      <div class="blk"><span class="h">canon</span><br>apps never read each other's storage · <b>explicit packets only</b></div></div>`;
  }
  if(id==='vestry'){
    chamberCSS({bg:'#0d0f14',ink:'#dfe5ec',fire:'#7dd3a6'},'#9fb2c4');
    return `
    <div class="ch-bar"><span class="crumb">the heavens / <b>the vestry</b></span><span class="nav">${navArrows(id)}</span></div>
    <div class="ch-glyph-bg">⚙</div>
    <div class="ch-grid">
      <div class="ch-id">
        <div class="stat-line">${pip('active',' · settings')}</div>
        <h1>The Vestry</h1>
        <div class="motto">· Ordo Domus · the order of the house ·</div>
        <div class="desc">Where the house keeps itself. Pack your whole life into a satchel and carry it to another device; test that the rites still hold; tend the observances. Everything here is data, not theatre.</div>
        <div class="ch-pulse-row">
          <div class="ch-pulse"><div class="n">${Object.keys(gatherStore()).length}</div><div class="l">stores held</div></div>
          <div class="ch-pulse"><div class="n">${fmtBytes(storageReport().total)}</div><div class="l">on this device</div></div>
        </div>
        <div style="margin-top:24px;font-family:var(--mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--cmut2)">consecrated · ${BUILD}</div>
      </div>
      <div class="ch-module">${moduleVestry()}</div>
    </div>
    <div class="ch-foot"><div class="blk"><span class="h">canon</span><br>each app persists under tgc.appstore.&lt;id&gt; · the shell under tgc.shell2.*</div>
      <div class="blk"><span class="h">the satchel</span><br>a satchel is plain json · safe to read, edit, and carry</div></div>`;
  }
  const w = WORLDS[id], locked = !w.app, ex = EXCHANGE[id];
  chamberCSS(w.palette,w.accent);
  return `
  <div class="ch-bar"><span class="crumb">the heavens / <b>${w.name.toLowerCase()}</b></span><span class="nav">${navArrows(id)}</span></div>
  <div class="ch-glyph-bg">${w.glyph}</div>
  <div class="ch-grid">
    <div class="ch-id">
      <div class="stat-line">${pip(w.status,' · '+w.version)}${w.flagship?' &nbsp;<span class="pip" style="--pc:#d4a832"><i></i>Flagship</span>':''}</div>
      <h1>${w.name}</h1>
      <div class="motto">· ${w.motto} ·</div>
      <div class="desc">${w.desc}</div>
      <div class="ch-pulse-row">
        ${id==='altar'
          ? `<div class="ch-pulse"><div class="n">${STATUS[w.status].label}</div><div class="l">a standing tier</div></div>
             <div class="ch-pulse"><div class="n">${Pulse.ideas()}</div><div class="l">ideas resting</div></div>
             <div class="ch-pulse"><div class="n">${userIdeas().length}</div><div class="l">laid by hand</div></div>`
          : `<div class="ch-pulse"><div class="n">${w.version}</div><div class="l">current build</div></div>
             <div class="ch-pulse"><div class="n">${Pulse.worldApps(id).filter(a=>a.status==='active').length}<small>of ${Pulse.worldApps(id).length}</small></div><div class="l">instruments active</div></div>
             <div class="ch-pulse"><div class="n">${Pulse.worldLast(id)?Pulse.ago(Pulse.worldLast(id)):'—'}</div><div class="l">last entered</div></div>`}
      </div>
      ${locked
        ? `<button class="ch-enter" disabled>${id==='altar'?'a tier, not an app · no frame to enter':'forming · the door is not yet cut'}</button>`
        : `<button class="ch-enter" data-launch="${w.app}">enter the frame <span>↘</span></button>`}
    </div>
    <div class="ch-module">${MODULES[id](w)}</div>
  </div>
  <div class="ch-foot">
    <div class="blk"><span class="h">exchange bus</span><br>produces :: <b>${ex.produces}</b><br>consumes :: <b>${ex.consumes}</b></div>
    <div class="blk" style="max-width:380px"><span class="h">note</span><br>${ex.note}</div>
    <div class="blk"><span class="h">lineage</span><br>${ARCHIVE.filter(a=>a.world===id).map(a=>`${a.name} ${a.version} → <b>${a.to}</b>`).join('<br>')||'no sealed ancestors'}</div>
  </div>`;
}
function countUp(){
  $$('#ch-content [data-count]').forEach(el=>{
    const target = parseInt(el.dataset.count,10); if(isNaN(target)) return;
    const t0 = performance.now(), dur = 650;
    function tick(t){
      const k = Math.min((t-t0)/dur,1), eased = 1-Math.pow(1-k,3);
      el.textContent = Math.round(target*eased).toLocaleString();
      if(k<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
function openChamber(id,animate=true){
  currentChamber = id;
  $('#ch-content').innerHTML = buildChamberHTML(id);
  $('#nave').classList.add('dimmed');
  const c = $('#chamber');
  if(animate){ c.classList.remove('open'); void c.offsetWidth; }
  c.classList.add('open');
  history.replaceState(null,'','#world/'+id);
  const w = WORLDS[id]; if(w && w.app) Frame.warm(w.app);
  setTimeout(countUp, animate?420:0);
}
function relight(){ if(currentChamber) $('#ch-content').innerHTML = buildChamberHTML(currentChamber); }
function closeChamber(){
  currentChamber = null;
  $('#chamber').classList.remove('open');
  $('#nave').classList.remove('dimmed');
  if(document.body.dataset.view!=='frame') history.replaceState(null,'','#nave');
}

/* quick-lay · a candle laid straight from the altar door (B4) */
document.addEventListener('click',e=>{
  const lay = e.target.closest('[data-altar-lay]');
  if(!lay) return;
  e.stopPropagation();
  const panel = $('.tp-panel[data-world="altar"]');
  const form = panel && panel.querySelector('.tp-lay');
  if(!form) return;
  form.hidden = false; lay.hidden = true;
  const inp = form.querySelector('input');
  const close = ()=>{ form.hidden = true; lay.hidden = false; inp.value=''; };
  inp.value=''; inp.focus();
  if(!inp.dataset.wired){
    inp.dataset.wired = '1';
    inp.addEventListener('keydown',ev=>{
      ev.stopPropagation();
      if(ev.key==='Enter' && inp.value.trim()){
        const ideas = userIdeas();
        ideas.push({name:inp.value.trim(),stage:'laid',
          desc:'Laid at the door · '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),dest:'unplaced'});
        lsSet(KEYS.altar,ideas);
        close(); paintEmbers(); Pulse.paint();
        if(currentChamber==='altar') relight();
        toast('a new candle burns on the altar');
      }
      if(ev.key==='Escape'){ ev.stopImmediatePropagation(); close(); }
    });
    inp.addEventListener('blur',()=>{ if(form && !form.hidden && !inp.value.trim()) close(); });
  }
});

/* altar candles */
document.addEventListener('click',e=>{
  const snuff = e.target.closest('[data-snuff]');
  if(snuff){
    const ideas = userIdeas(); ideas.splice(parseInt(snuff.dataset.snuff,10),1);
    lsSet(KEYS.altar,ideas);
    relight(); paintEmbers(); Pulse.paint();
    toast('candle snuffed · sealed in the undercroft'); return;
  }
  const slot = e.target.closest('#al-new');
  if(slot && !slot.querySelector('input')){
    slot.querySelector('.al-main').innerHTML =
      `<input class="al-input" id="al-in" placeholder="name the idea, press enter…" maxlength="60">`;
    const inp = $('#al-in'); inp.focus();
    inp.addEventListener('keydown',ev=>{
      ev.stopPropagation();
      if(ev.key==='Enter' && inp.value.trim()){
        const ideas = userIdeas();
        ideas.push({name:inp.value.trim(),stage:'laid',desc:'Laid by hand · '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),dest:'unplaced'});
        lsSet(KEYS.altar,ideas);
        relight(); paintEmbers(); Pulse.paint();
        toast('a new candle burns on the altar');
      }
      if(ev.key==='Escape'){ relight(); }
    });
  }
});

/* ═══════════ COMMAND PALETTE ═══════════ */
const PAL_ITEMS = [
  ...ORDER.map(id=>({g:WORLDS[id].glyph,ac:WORLDS[id].accent,t:WORLDS[id].name,s:'world · '+WORLDS[id].tagline.toLowerCase(),k:'chamber',act:()=>openChamber(id)})),
  ...Object.keys(APPS).map(id=>({g:APPS[id].glyph,ac:APPS[id].accent,t:APPS[id].name,s:'app · '+APPS[id].kind.toLowerCase()+' · '+APPS[id].version,k:'launch',act:()=>Frame.enter(id)})),
  {g:'⌑',ac:'#8fa0b0',t:'The Undercroft',s:'tier · five sealed donors',k:'chamber',act:()=>openChamber('undercroft')},
  {g:'⚙',ac:'#9fb2c4',t:'The Vestry',s:'settings · data, satchel, observances',k:'chamber',act:()=>openChamber('vestry')},
  {g:'✦',ac:'#d4af37',t:'The Inbox',s:'exchange · every waiting missive',k:'open',act:()=>openInbox()},
  {g:'⇩',ac:'#7dd3a6',t:'Pack the satchel',s:'export · all data to a file',k:'data',act:()=>exportSatchel()},
  {g:'⇧',ac:'#7dd3a6',t:'Unpack a satchel',s:'import · restore from a file',k:'data',act:()=>$('#satchel-in').click()},
  {g:'✦',ac:'#9fb2c4',t:'Run the rites',s:'self-test · storage, blobs, bus, fonts',k:'rites',act:()=>runRites()},
  ...ARCHIVE.map(a=>({g:'✕',ac:'#7890a0',t:a.name,s:'donor · '+a.version+' · sealed '+a.sealed+' → '+a.to,k:'reliquary',act:()=>openChamber('undercroft')})),
  ...IDEAS.map(i=>({g:'○',ac:'#e08b4a',t:i.name,s:'idea · '+i.stage+' · would join '+i.dest,k:'altar',act:()=>openChamber('altar')}))
];
let palSel = 0, palFiltered = PAL_ITEMS;
function palRender(){
  $('#pal-list').innerHTML = palFiltered.map((it,ix)=>`
    <div class="pal-it ${ix===palSel?'sel':''}" data-ix="${ix}" style="--pac:${it.ac}">
      <span class="g">${it.g}</span><span class="t">${it.t}<small>${it.s}</small></span><span class="k">${it.k}</span>
    </div>`).join('') || `<div class="pal-it"><span class="t" style="color:var(--ink4)">nothing answers that summons</span></div>`;
  const sel = $('.pal-it.sel'); if(sel) sel.scrollIntoView({block:'nearest'});
}
function palOpen(){ $('#palette').classList.add('open'); $('#pal-q').value=''; palFilter(''); $('#pal-q').focus(); }
function palClose(){ $('#palette').classList.remove('open'); }
function fuzzyScore(text,q){
  text = text.toLowerCase();
  const ix = text.indexOf(q);
  if(ix>-1) return 100 - Math.min(ix,60);          // substring: earlier = better
  let i = 0;                                        // subsequence fallback
  for(const ch of text){ if(ch===q[i]) i++; if(i===q.length) return 38; }
  return 0;
}
function palRecents(){ return lsGet('tgc.shell2.recents',[]); }
function palRemember(title){
  const r = palRecents().filter(t=>t!==title); r.unshift(title);
  lsSet('tgc.shell2.recents', r.slice(0,12));
}
PAL_ITEMS.forEach(it=>{ const a=it.act; it.act=()=>{ palRemember(it.t); a(); }; });
function palFilter(q){
  q = q.toLowerCase().trim();
  if(!q){
    const r = palRecents();
    palFiltered = [...PAL_ITEMS].sort((a,b)=>{
      const ra=r.indexOf(a.t), rb=r.indexOf(b.t);
      return (ra<0?99:ra) - (rb<0?99:rb);
    });
  } else {
    palFiltered = PAL_ITEMS
      .map(it=>[fuzzyScore(it.t+' '+it.s,q),it])
      .filter(p=>p[0]>0)
      .sort((a,b)=>b[0]-a[0])
      .map(p=>p[1]);
  }
  palSel = 0; palRender();
}
$('#pal-q').addEventListener('input',e=>palFilter(e.target.value));
$('#pal-list').addEventListener('click',e=>{
  const it = e.target.closest('.pal-it[data-ix]'); if(!it) return;
  palClose(); palFiltered[parseInt(it.dataset.ix,10)].act();
});
$('#palette').addEventListener('click',e=>{ if(e.target.id==='palette') palClose(); });

/* ═══════════ GLOBAL WIRING ═══════════ */
document.addEventListener('click',e=>{
  if(e.target.closest('[data-close]')) return closeChamber();
  const nav = e.target.closest('[data-nav]');
  if(nav) return openChamber(nav.dataset.nav,false);
  const panel = e.target.closest('.tp-panel');
  if(panel && !e.target.closest('[data-toast],[data-launch],[data-altar-lay],.tp-lay')) openChamber(panel.dataset.world);
});
/* ═══════════ TOP BAR · home, tips, theme ═══════════ */
function goHome(){
  if($('#palette').classList.contains('open')) palClose();
  if($('#inbox').classList.contains('open')) closeInbox();
  if($('#rites').classList.contains('open')) $('#rites').classList.remove('open');
  if(currentChamber) closeChamber();
  if(document.body.dataset.view==='frame') Frame.ascend();
}
$('#tb-home').addEventListener('click',goHome);
$('#tb-home-txt').addEventListener('click',goHome);
$('#tb-home').title = 'home · the nave · '+BUILD;
$('#tb-reload').addEventListener('click',()=>Frame.reload());
$('#tb-go-vestry').addEventListener('click',()=>{ $('#tb-tips').classList.remove('open'); openChamber('vestry'); });
$('#tb-go-under').addEventListener('click',()=>{ $('#tb-tips').classList.remove('open'); openChamber('undercroft'); });
$('#tb-tips-btn').addEventListener('click',e=>{ e.stopPropagation(); $('#tb-tips').classList.toggle('open'); });
document.addEventListener('click',e=>{ if(!e.target.closest('#tb-tips')) $('#tb-tips').classList.remove('open'); });

/* ═══════════ THEMES · time-aware, gradual sky ═══════════ */
const THEMES = ['night','day','twilight','pop'];   // pop is a chosen skin only · auto never derives it
// themeMode: 'auto' (follow the clock) | a fixed skin name
let themeMode = SETTINGS.themeMode || (THEMES.includes(SETTINGS.theme)?SETTINGS.theme:'auto');
function phaseForHour(h){
  if(h>=8 && h<17) return 'day';
  if((h>=5 && h<8) || (h>=17 && h<20)) return 'twilight';
  return 'night';
}
function skyPhaseName(h){
  if(h>=5 && h<8)  return 'dawn';
  if(h>=8 && h<12) return 'morning';
  if(h>=12 && h<17)return 'afternoon';
  if(h>=17 && h<20)return 'dusk';
  if(h>=20 && h<23)return 'night';
  return 'deep night';
}
// continuous sky-tint keyframes across the day (auto only) · gives the gradual shift
const SKY_STOPS = [
  [0 ,[44,62,120,.12]],[5,[70,92,150,.14]],[7,[255,150,95,.2]],[9,[150,205,248,.46]],
  [13,[120,200,255,.6]],[17,[255,200,120,.42]],[19,[255,150,95,.24]],[21,[64,84,150,.14]],[24,[44,62,120,.12]]
];
function skyTintForHour(hf){
  let a=SKY_STOPS[0], b=SKY_STOPS[SKY_STOPS.length-1];
  for(let i=0;i<SKY_STOPS.length-1;i++){ if(hf>=SKY_STOPS[i][0] && hf<=SKY_STOPS[i+1][0]){ a=SKY_STOPS[i]; b=SKY_STOPS[i+1]; break; } }
  const t=(hf-a[0])/((b[0]-a[0])||1), mix=a[1].map((v,k)=>v+(b[1][k]-v)*t);
  return `rgba(${Math.round(mix[0])},${Math.round(mix[1])},${Math.round(mix[2])},${mix[3].toFixed(3)})`;
}
function effectiveTheme(){ return themeMode==='auto' ? phaseForHour(new Date().getHours()) : themeMode; }
/* the theme handshake · the sky is broadcast to every hosted frame; apps/bridge.js
   maps it onto each app's own skin (ping/notes: pulse·slate·linen, coach: press·cream) */
function broadcastTheme(win){
  const msg = { type:'tgc.theme', theme: effectiveTheme(), mode: themeMode };
  if(win){ try{ win.postMessage(msg,'*'); }catch(e){} return; }
  Object.values(Frame.iframes).forEach(fr=>{ try{ fr.contentWindow.postMessage(msg,'*'); }catch(e){} });
}
function applyTheme(){
  const eff = effectiveTheme();
  if(eff==='night') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme',eff);
  const mt = document.getElementById('meta-theme');
  if(mt) mt.content = ({night:'#0a0d14',day:'#f4eee0',twilight:'#3a2c55',pop:'#bfe0f5'})[eff] || '#0a0d14';
  // gradual sky in auto; let the skin own it when pinned
  const root = document.documentElement.style;
  if(themeMode==='auto'){ const now=new Date(); root.setProperty('--skytint', skyTintForHour(now.getHours()+now.getMinutes()/60)); }
  else root.removeProperty('--skytint');
  // sky label follows the sky
  const lbl = themeMode==='auto'
    ? skyPhaseName(new Date().getHours())+' over the nave'
    : eff+' over the nave';
  const sh=$('#sky-hour'); if(sh) sh.textContent = lbl + (themeMode==='auto'?' · auto':'');
  // toggle UI: dots show the active/derived skin; auto pill lit in auto
  $$('#tb-theme i').forEach(i=>i.classList.toggle('on', themeMode==='auto' ? i.dataset.t===eff : i.dataset.t===themeMode));
  const ap=$('#tb-auto'); if(ap) ap.classList.toggle('on', themeMode==='auto');
  SETTINGS.themeMode = themeMode; SETTINGS.theme = eff; lsSet(KEYS.settings,SETTINGS);
  broadcastTheme();   // the hosted frames follow the sky
}
function setThemeMode(m){ themeMode=m; applyTheme(); }
$$('#tb-theme i').forEach(i=>i.addEventListener('click',()=>{ setThemeMode(i.dataset.t); toast('the sky is set to '+i.dataset.t); }));
{ const ap=$('#tb-auto'); if(ap) ap.addEventListener('click',()=>{ setThemeMode('auto'); toast('the sky now follows the hour'); }); }
applyTheme();
// keep auto in step with the real clock
setInterval(()=>{ if(themeMode==='auto') applyTheme(); }, 4*60*1000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden && themeMode==='auto') applyTheme(); });

/* ═══════════ WEATHER · opt-in, location-aware (Open-Meteo, no key) ═══════════ */
function setWeather(state,windy){
  const r=document.documentElement;
  if(state) r.setAttribute('data-wx',state); else r.removeAttribute('data-wx');
  r.setAttribute('data-wind', windy?'1':'0');
}
function fetchWeather(announce){
  if(!SETTINGS.weather) return;
  if(!('geolocation' in navigator)){ if(announce) toast('this device has no location'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    try{
      const la=pos.coords.latitude.toFixed(2), lo=pos.coords.longitude.toFixed(2);
      fetch('https://api.open-meteo.com/v1/forecast?latitude='+la+'&longitude='+lo+'&current=precipitation,cloud_cover,wind_speed_10m,weather_code')
        .then(r=>r.json()).then(d=>{
          const c=d.current||{};
          const rain=(c.precipitation||0)>0 || [51,53,55,61,63,65,66,67,80,81,82,95,96,99].includes(c.weather_code);
          const cloudy=(c.cloud_cover||0)>55, windy=(c.wind_speed_10m||0)>22;
          setWeather(rain?'rain':cloudy?'clouds':'', windy);
          if(announce) toast('the sky reads '+(rain?'rain':cloudy?'cloud':'clear')+(windy?' · wind':'')+' near you');
        }).catch(()=>{ if(announce) toast('could not reach the weather'); });
    }catch(e){}
  }, ()=>{ if(announce) toast('location declined · weather stays off'); }, {timeout:8000,maximumAge:900000});
}
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT' && e.target.id!=='pal-q') return;
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault();
    $('#palette').classList.contains('open') ? palClose() : palOpen(); return; }
  if((e.ctrlKey||e.metaKey) && ['1','2','3','4'].includes(e.key)){
    e.preventDefault(); Frame.enter(DOCK[parseInt(e.key,10)-1]); return; }
  if((e.ctrlKey||e.metaKey) && (e.key==='ArrowRight'||e.key==='ArrowLeft') && Frame.order.length>1 && !currentChamber){
    e.preventDefault();
    const dir = e.key==='ArrowRight'?1:-1;
    const cur = Math.max(0,Frame.order.indexOf(Frame.active));
    Frame.enter(Frame.order[(cur+dir+Frame.order.length)%Frame.order.length]);
    return; }
  if($('#palette').classList.contains('open')){
    if(e.key==='Escape') palClose();
    if(e.key==='ArrowDown'){ e.preventDefault(); palSel=Math.min(palSel+1,palFiltered.length-1); palRender(); }
    if(e.key==='ArrowUp'){ e.preventDefault(); palSel=Math.max(palSel-1,0); palRender(); }
    if(e.key==='Enter' && palFiltered[palSel]){ palClose(); palFiltered[palSel].act(); }
    return;
  }
  if((e.key==='h'||e.key==='H') && !e.ctrlKey && !e.metaKey){ return goHome(); }
  if(e.key==='Escape'){
    if($('#inbox').classList.contains('open')) return closeInbox();
    if($('#rites').classList.contains('open')) return $('#rites').classList.remove('open');
    if(currentChamber) return closeChamber();
    if(document.body.dataset.view==='frame') return Frame.ascend();
    return;
  }
  if(currentChamber){
    const ix = CH_ORDER.indexOf(currentChamber);
    if(e.key==='ArrowLeft')  return openChamber(CH_ORDER[(ix-1+CH_ORDER.length)%CH_ORDER.length],false);
    if(e.key==='ArrowRight') return openChamber(CH_ORDER[(ix+1)%CH_ORDER.length],false);
  }
  if(document.body.dataset.view!=='frame'){
    const k = {'1':'mirrorflow','2':'excelsior','3':'riftborn','4':'altar','5':'undercroft','6':'vestry'}[e.key];
    if(k && !e.ctrlKey && !e.metaKey) openChamber(k);
  }
});

/* ═══════════ THE THRESHOLD + BOOT ═══════════ */
Bus.init();
renderMissive(); renderBraziers(); updateBadge();
if(SETTINGS.weather) setTimeout(()=>fetchWeather(false),1400);

/* multi-tab coherence: another tab wrote our stores → refresh this one */
window.addEventListener('storage',e=>{
  if(!e.key || e.key.indexOf('tgc.shell2')!==0) return;
  if(e.key===KEYS.inbox){
    Bus.queue = lsGet(KEYS.inbox,[]);
    renderMissive(); updateBadge();
    if($('#inbox').classList.contains('open')) renderInbox();
  }
  if(e.key===KEYS.settings){
    const s = lsGet(KEYS.settings,{});
    Object.assign(SETTINGS,s);
    themeMode = SETTINGS.themeMode || themeMode;
    applyTheme(); applySettings();
  }
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) return;
  Bus.queue = lsGet(KEYS.inbox,[]);
  renderMissive(); updateBadge(); renderBraziers(); Pulse.paint();
});

/* ═══════════ WEB-NATIVE · service worker, update whisper, error watch ═══════════ */
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
(function(){
  if(!/^https?:$/.test(location.protocol)) return;   // silent no-op on file://
  let bootVer = null;
  function check(){
    fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(v=>{
      if(bootVer===null){ bootVer = v.build; return; }
      if(v.build!==bootVer && !document.getElementById('tb-update')){
        const b=document.createElement('span'); b.className='tb-btn'; b.id='tb-update';
        b.textContent='⟳ new build'; b.title='a newer build was published · click to refresh';
        b.addEventListener('click',()=>location.reload());
        const tt=document.getElementById('tb-tips'); if(tt && tt.parentNode) tt.parentNode.insertBefore(b,tt);
        toast('a newer build of the house exists · ⟳ to refresh');
      }
    }).catch(()=>{});
  }
  check(); setInterval(check, 30*60*1000);
})();
let __errOnce = false;
function __stumble(){ if(__errOnce) return; __errOnce = true; toast('something stumbled · the rites in the vestry can tell you where'); }
addEventListener('error',__stumble);
addEventListener('unhandledrejection',__stumble);

/* ═══════════ VIGIL · 90s idle in the nave becomes a watch ═══════════ */
(function(){
  const vg = document.createElement('div');
  vg.id='vigil'; vg.innerHTML='<div class="vg-time"></div><div class="vg-cap">the nave keeps vigil · move to wake</div>';
  document.body.appendChild(vg);
  let t=null, on=false;
  function tick(){ if(on) vg.querySelector('.vg-time').textContent = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
  setInterval(tick, 20000);
  function wake(){
    if(on){ on=false; document.body.classList.remove('vigil'); }
    clearTimeout(t);
    t = setTimeout(()=>{
      const landing = document.getElementById('landing');
      const landingUp = landing && landing.classList.contains('show') && landing.style.display!=='none';
      if(document.body.dataset.view==='nave' && !currentChamber && !landingUp
         && !$('#palette').classList.contains('open') && !$('#inbox').classList.contains('open')){
        on = true; document.body.classList.add('vigil'); tick();
      }
    }, 90000);
  }
  ['mousemove','keydown','pointerdown','wheel','touchstart'].forEach(ev=>addEventListener(ev,wake,{passive:true}));
  wake();
})();

function boot(){
  /* one ceremony only (B3): the scroll landing owns first-run entry and exits
     through the door leaves; the old gate screen is retired — its element now
     serves only as the initial paint cover, gone the moment boot decides. */
  const gate = $('#gate');
  gate.classList.add('gone');
  const mApp = location.hash.match(/^#app=(\w+)$/);
  const mWorld = location.hash.match(/^#world\/(\w+)$/);
  const session = lsGet(KEYS.session,null);
  const deep = !!(mApp || mWorld);
  const restoreFrame = !deep && session && session.view==='frame' && APPS[session.app];

  if(mApp && APPS[mApp[1]] && APPS[mApp[1]].localPath){ Frame.enter(mApp[1]); return; }
  if(mWorld && (WORLDS[mWorld[1]] || mWorld[1]==='undercroft')){ openChamber(mWorld[1],false); return; }
  if(restoreFrame){ Frame.enter(session.app); return; }
  const last = localStorage.getItem(KEYS.last);
  if(last && APPS[last] && DOCK.includes(last)) Frame.warm(last);
}

/* ═══════════ APPSTORE PERSIST · fallback for shimmed app frames ═══════════ */
window.addEventListener('message', e => {
  const d = e.data;
  if (!d || d.type !== 'tgc.ls.persist' || typeof d.appId !== 'string') return;
  if (!APPS[d.appId]) return;
  try { localStorage.setItem('tgc.appstore.' + d.appId, String(d.data)); } catch (err) {}
});

setTimeout(boot,0);   // deferred: the landing module (js/landing.js) registers before boot fires
