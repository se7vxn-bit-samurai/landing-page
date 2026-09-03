/* ═══════════ BUILD 2 · THE SCROLL LANDING (self-contained module) ═══════════ */
(function(){
  // ── doodle motifs, recreated as clean SVG (from Sel's zentangle work) ──
  function stringArt(w,h,n,col){
    let l=''; for(let i=0;i<=n;i++){ const t=i/n;
      l+=`<line x1="0" y1="${(h*t).toFixed(1)}" x2="${(w*t).toFixed(1)}" y2="${h}"/>`;
      l+=`<line x1="${w}" y1="${(h*t).toFixed(1)}" x2="${(w*(1-t)).toFixed(1)}" y2="${h}"/>`;
      l+=`<line x1="${(w*t).toFixed(1)}" y1="0" x2="0" y2="${(h*(1-t)).toFixed(1)}"/>`;
      l+=`<line x1="${(w*t).toFixed(1)}" y1="0" x2="${w}" y2="${(h*t).toFixed(1)}"/>`;
    }
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" fill="none" stroke="${col}" stroke-width="0.5">${l}</svg>`;
  }
  function circleField(col){
    let s=''; for(let r=0;r<4;r++)for(let c=0;c<7;c++){ const cx=60+c*120,cy=60+r*120;
      s+=`<circle cx="${cx}" cy="${cy}" r="52"/>`;
      const k=(r*7+c)%4;
      if(k===0){ for(let a=0;a<12;a++){const ang=a*Math.PI/6;s+=`<line x1="${cx}" y1="${cy}" x2="${(cx+Math.cos(ang)*52).toFixed(0)}" y2="${(cy+Math.sin(ang)*52).toFixed(0)}"/>`;} }
      else if(k===1){ s+=`<circle cx="${cx}" cy="${cy}" r="34"/><circle cx="${cx}" cy="${cy}" r="18"/>`; }
      else if(k===2){ s+=`<path d="M${cx-52} ${cy} q52 -70 104 0 q-52 70 -104 0"/>`; }
      else { for(let rr=8;rr<52;rr+=10)s+=`<circle cx="${cx}" cy="${cy}" r="${rr}"/>`; }
    }
    return `<svg viewBox="0 0 840 480" preserveAspectRatio="xMidYMid slice" fill="none" stroke="${col}" stroke-width="0.6">${s}</svg>`;
  }
  function tangleSwirls(col){
    let s=''; for(let i=0;i<10;i++){ const cx=40+(i%5)*180,cy=70+Math.floor(i/5)*220;
      let p=`M${cx} ${cy}`; for(let a=0;a<28;a++){ const ang=a*0.45, rad=4+a*3.2; p+=` L${(cx+Math.cos(ang)*rad).toFixed(0)} ${(cy+Math.sin(ang)*rad).toFixed(0)}`; }
      s+=`<path d="${p}"/>`;
    }
    return `<svg viewBox="0 0 900 440" preserveAspectRatio="xMidYMid slice" fill="none" stroke="${col}" stroke-width="0.7">${s}</svg>`;
  }

  // ── styles ──
  const css = `
  #landing{position:fixed;inset:0;z-index:380;overflow-y:scroll;scroll-snap-type:y mandatory;scroll-behavior:smooth;
    background:var(--bg);color:var(--ink);transition:opacity .8s,transform .8s;display:none}
  #landing.show{display:block}
  #landing.gone{opacity:0;pointer-events:none;transform:scale(1.03)}
  #landing::-webkit-scrollbar{width:0}
  .lp{min-height:100vh;min-height:100dvh;scroll-snap-align:start;position:relative;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;padding:7vh 6vw;overflow:hidden}
  .lp-bg{position:absolute;inset:-5%;pointer-events:none;opacity:.13;color:var(--gilt)}
  .lp-bg svg{width:100%;height:100%}
  .lp-wash{position:absolute;inset:0;pointer-events:none;background:var(--sky-grad)}
  .lp .in-up{opacity:0;transform:translateY(34px);transition:opacity .9s cubic-bezier(.2,1,.3,1),transform .9s cubic-bezier(.2,1,.3,1)}
  .lp.seen .in-up{opacity:1;transform:none}
  .lp .d1{transition-delay:.05s}.lp .d2{transition-delay:.18s}.lp .d3{transition-delay:.31s}.lp .d4{transition-delay:.44s}.lp .d5{transition-delay:.57s}
  .lp-seal{color:var(--gilt)}.lp-seal svg{width:96px;height:96px}
  .lp-name{font-family:var(--display);font-weight:600;font-size:clamp(40px,7vw,84px);letter-spacing:.02em;margin-top:18px;position:relative}
  .lp-name span{color:var(--gilt)}
  .lp-motto{font-family:var(--serif-alt);font-style:italic;font-size:clamp(16px,2.4vw,24px);color:var(--gilt-soft);letter-spacing:.16em;margin-top:12px}
  .lp-sub{font-size:clamp(13px,1.5vw,16px);color:var(--ink2);max-width:540px;line-height:1.7;margin-top:22px;position:relative}
  .lp-cue{position:absolute;bottom:5vh;font-family:var(--mono);font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:var(--ink3);animation:lpbob 2.4s ease-in-out infinite}
  @keyframes lpbob{0%,100%{transform:translateY(0);opacity:.6}50%{transform:translateY(7px);opacity:1}}
  .lp-resume{margin-top:26px;font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gilt);
    border:1px solid var(--gilt-dim);border-radius:999px;padding:9px 20px;cursor:pointer;transition:all .25s;position:relative}
  .lp-resume:hover{background:var(--gilt-faint)}
  .lp-h{font-family:var(--mono);font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--gilt-soft);margin-bottom:6px;position:relative}
  .lp-title{font-family:var(--display);font-weight:600;font-size:clamp(28px,4vw,46px);position:relative}
  .lp-cards{display:flex;gap:18px;margin-top:46px;flex-wrap:wrap;justify-content:center;position:relative;max-width:1180px}
  .lp-card{flex:1;min-width:200px;max-width:260px;border:1px solid var(--rule);border-radius:10px;padding:30px 22px;cursor:pointer;
    background:linear-gradient(180deg,transparent,var(--card-wash) 160%);transition:transform .3s,border-color .3s,box-shadow .3s;position:relative;overflow:hidden}
  .lp-card:hover{transform:translateY(-7px);border-color:var(--cac);box-shadow:0 16px 40px color-mix(in srgb,var(--cac) 22%,transparent)}
  .lp-card .g{font-family:var(--serif-alt);font-size:52px;line-height:1;color:var(--cac);text-shadow:0 0 26px var(--cac)}
  .lp-card .nm{font-family:var(--display);font-size:22px;font-weight:600;margin-top:14px}
  .lp-card .mo{font-family:var(--serif-alt);font-style:italic;font-size:14px;color:var(--gilt-soft);letter-spacing:.1em;margin-top:6px}
  .lp-card .tg{font-size:12px;color:var(--ink3);line-height:1.5;margin-top:12px;min-height:34px}
  .lp-card .en{font-family:var(--mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--cac);margin-top:14px;opacity:0;transition:opacity .3s}
  .lp-card:hover .en{opacity:1}
  .lp-eco{display:flex;gap:30px;flex-wrap:wrap;justify-content:center;max-width:760px;margin-top:34px;position:relative}
  .lp-eco .e{font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:var(--ink2);text-align:left;max-width:210px}
  .lp-eco .e b{display:block;font-family:var(--display);font-size:16px;letter-spacing:0;color:var(--ink);margin-bottom:5px;font-weight:600}
  .lp-enter{margin-top:48px;font-family:var(--mono);font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--cbg,var(--bg));
    background:var(--gilt);border:none;padding:16px 34px;cursor:pointer;font-weight:500;transition:all .25s;position:relative;display:inline-flex;gap:11px;align-items:center}
  .lp-enter:hover{gap:16px;box-shadow:0 0 34px var(--gilt-soft)}
  .lp-foot{position:absolute;bottom:4vh;font-family:var(--mono);font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink4)}
  @media(max-width:760px){.lp-cards{gap:12px}.lp-card{min-width:140px;padding:20px 14px}}
  @media (prefers-reduced-motion:reduce){.lp .in-up{transition:none}}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  // ── world data (mirror of the manifest, for the cards) ──
  const W = (typeof WORLDS!=='undefined') ? WORLDS : {};
  const order = (typeof ORDER!=='undefined') ? ORDER : ['mirrorflow','excelsior','riftborn','altar'];
  const PEAK = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="24" cy="9" r="3.4" fill="currentColor" stroke="none"/><path d="M24 14.5 L40 41 H8 Z"/><path d="M24 21 L33.5 41 H14.5 Z" opacity=".68"/><path d="M24 28 L28.5 41 H19.5 Z" opacity=".46"/></svg>';

  const cardsHTML = order.map((id,i)=>{ const w=W[id]||{}; return `
    <div class="lp-card in-up d${i+1}" data-world="${id}" style="--cac:${w.accent};--card-wash:${(w.accent||'#d4af37')}14">
      <div class="g">${w.glyph||'?'}</div>
      <div class="nm">${w.name||id}</div>
      <div class="mo">${w.motto||''}</div>
      <div class="tg">${w.tagline||''}</div>
      <div class="en">${w.app?'enter ↘':'a standing tier'}</div>
    </div>`; }).join('');

  const wrap=document.createElement('div'); wrap.id='landing';
  wrap.innerHTML = `
    <section class="lp" data-p="1">
      <div class="lp-wash"></div>
      <div class="lp-bg" id="lp-bg1"></div>
      <div class="lp-seal in-up d1">${PEAK}</div>
      <div class="lp-name in-up d2">theGuide<span>.Club</span></div>
      <div class="lp-motto in-up d3">· The Seletiv Kolektiv ·</div>
      <div class="lp-sub in-up d4">One roof over four worlds: a productivity mirror, an editorial coach, a house of fables, and an altar for what comes next. Built as one place, not a list of links.</div>
      <div class="lp-resume in-up d5" id="lp-resume" style="display:none"></div>
      <div class="lp-cue">scroll ↓</div>
    </section>
    <section class="lp" data-p="2">
      <div class="lp-bg" id="lp-bg2"></div>
      <div class="lp-h in-up d1">the worlds</div>
      <div class="lp-title in-up d2">Four doors, one nave</div>
      <div class="lp-cards">${cardsHTML}</div>
      <div class="lp-cue">scroll ↓</div>
    </section>
    <section class="lp" data-p="3">
      <div class="lp-wash"></div>
      <div class="lp-bg" id="lp-bg3"></div>
      <div class="lp-h in-up d1">the ecosystem</div>
      <div class="lp-title in-up d2">A place that keeps its own memory</div>
      <div class="lp-eco in-up d3">
        <div class="e"><b>MirrorFlow</b>The productivity arm ·Ping for the moment, Sync for the long arc.</div>
        <div class="e"><b>Excelsior</b>The editorial sales coach ·argument, mindset, craft.</div>
        <div class="e"><b>Riftborn</b>Fables, worlds & the Codex that keeps them canon.</div>
        <div class="e"><b>The Altar</b>Where new ideas are laid as candles, and watched.</div>
      </div>
      <button class="lp-enter in-up d4" id="lp-enter">enter the nave <span>↘</span></button>
      <div class="lp-foot">the sky follows your hour · night · day · twilight</div>
    </section>`;
  document.body.appendChild(wrap);

  // paint doodle backgrounds (tinted by theme accent via currentColor)
  document.getElementById('lp-bg1').innerHTML = stringArt(600,600,26,'currentColor');
  document.getElementById('lp-bg2').innerHTML = circleField('currentColor');
  document.getElementById('lp-bg3').innerHTML = tangleSwirls('currentColor');

  // reveal on scroll
  const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('seen'); }),{threshold:.35});
  wrap.querySelectorAll('.lp').forEach(p=>io.observe(p));

  // ── entry ──
  function enterNave(world){
    try{ sessionStorage.setItem(KEYS.gate,'1'); }catch(e){}
    wrap.classList.add('gone');
    setTimeout(()=>{ wrap.style.display='none'; wrap.scrollTop=0; }, 900);
    if(world && typeof openChamber==='function') setTimeout(()=>openChamber(world), 520);
  }
  wrap.querySelector('#lp-enter').addEventListener('click',()=>enterNave());
  wrap.querySelectorAll('.lp-card').forEach(c=>c.addEventListener('click',()=>enterNave(c.dataset.world)));

  function showLanding(){
    const g=document.getElementById('gate'); if(g) g.classList.add('gone');
    wrap.style.display='block'; wrap.classList.remove('gone'); wrap.classList.add('show');
    wrap.scrollTop=0;
    wrap.querySelectorAll('.lp').forEach(p=>p.classList.remove('seen'));
    wrap.querySelector('.lp[data-p="1"]').classList.add('seen');
    // resume affordance
    try{
      const last=localStorage.getItem(KEYS.last);
      if(last && typeof APPS!=='undefined' && APPS[last]){
        const r=wrap.querySelector('#lp-resume');
        r.style.display='inline-block';
        r.textContent='↻ resume '+APPS[last].short;
        r.addEventListener('click',()=>{ enterNave(); setTimeout(()=>Frame.enter(last),560); });
      }
    }catch(e){}
  }
  // ── immersion: draw-in seal, scroll-rail, parallax, pointer tilt, revert button ──
  (function(){
    const xst=document.createElement('style'); xst.textContent=`
      .lp-seal svg path,.lp-seal svg circle{stroke-dasharray:130;stroke-dashoffset:130;animation:lpdraw 1.7s ease forwards .3s}
      .lp-seal svg circle{animation-delay:.1s}
      @keyframes lpdraw{to{stroke-dashoffset:0}}
      .lp-bg{transition:transform .3s ease-out}
      #lp-rail{position:fixed;right:22px;top:50%;transform:translateY(-50%);z-index:382;display:flex;flex-direction:column;gap:14px}
      #lp-rail.hide,body[data-view="frame"] #lp-rail,#landing.gone #lp-rail{display:none}
      #lp-rail b{width:9px;height:9px;border-radius:50%;border:1px solid var(--gilt-dim);cursor:pointer;transition:all .25s}
      #lp-rail b.on{background:var(--gilt);box-shadow:0 0 9px var(--gilt-soft);transform:scale(1.25)}
    `; document.head.appendChild(xst);
    const panels=[...wrap.querySelectorAll('.lp')];
    const rail=document.createElement('div'); rail.id='lp-rail'; rail.className='hide';
    rail.innerHTML='<b data-i="0"></b><b data-i="1"></b><b data-i="2"></b>';
    wrap.appendChild(rail);   /* lives inside the landing · hides with it, never haunts the nave */
    rail.querySelectorAll('b').forEach(d=>d.addEventListener('click',()=>panels[+d.dataset.i].scrollIntoView({behavior:'smooth'})));
    function syncRail(){
      if(wrap.style.display==='none' || wrap.classList.contains('gone')){ rail.classList.add('hide'); return; }
      rail.classList.remove('hide');
      const i=Math.max(0,Math.min(2,Math.round(wrap.scrollTop/Math.max(1,wrap.clientHeight))));
      rail.querySelectorAll('b').forEach((b,k)=>b.classList.toggle('on',k===i));
      panels.forEach((p,pi)=>{ if(pi===0) return; const bg=p.querySelector('.lp-bg'); if(bg){ const rel=(p.offsetTop-wrap.scrollTop)/Math.max(1,wrap.clientHeight); bg.style.transform='translateY('+(rel*-46).toFixed(1)+'px)'; } });
      const seal=wrap.querySelector('.lp-seal'); if(seal) seal.style.transform='translateY('+(wrap.scrollTop*-0.12).toFixed(1)+'px)';
    }
    wrap.addEventListener('scroll',syncRail,{passive:true});
    wrap.addEventListener('mousemove',e=>{ const b=document.getElementById('lp-bg1'); if(!b)return; const nx=(e.clientX/innerWidth-.5),ny=(e.clientY/innerHeight-.5); b.style.transform=`translate(${(nx*20).toFixed(1)}px,${(ny*16).toFixed(1)}px)`; });
    // revert-to-landing control in the top bar
    const tb=document.getElementById('topbar');
    if(tb){ const btn=document.createElement('span'); btn.className='tb-btn'; btn.id='tb-intro'; btn.title='back to the intro (scroll screen)'; btn.textContent='⤒ intro';
      btn.addEventListener('click',()=>showLanding());
      const sp=tb.querySelector('.spacer'); if(sp && sp.nextSibling) tb.insertBefore(btn,sp.nextSibling); else tb.appendChild(btn); }
    // re-sync the rail whenever the landing is (re)shown
    const _sl=showLanding; showLanding=function(){ _sl(); setTimeout(syncRail,60); };
    setTimeout(syncRail,80);
  })();

  window.showLanding = showLanding;

  // first-visit decision (runs before boot's deferred timer)
  try{
    const hash=location.hash, deep=/^#(app=|world\/)/.test(hash);
    const session=lsGet(KEYS.session,null);
    const restore=!deep && session && session.view==='frame' && (typeof APPS!=='undefined') && APPS[session.app];
    const seen=sessionStorage.getItem(KEYS.gate);
    if(!deep && !restore && !seen && !(typeof SETTINGS!=='undefined' && SETTINGS.gateOff)){
      showLanding();                       // landing owns first-run entry
      sessionStorage.setItem(KEYS.gate,'1'); // so boot skips the door-gate ceremony
    }
  }catch(e){}
})();
