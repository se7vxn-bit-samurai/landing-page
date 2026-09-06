/* QC · the house sweep
 *
 * 44 checks across entry, the pulse, all four skins, the theme handshake, the
 * motifs, the altar, the exchange, the Lens rule suite, the rites, the satchel,
 * mobile, and the portable build. It also guards the canon: any request that
 * leaves the origin (bar the opt-in weather lookup) fails the sweep.
 *
 * This is tooling, not site code — the no-dependency rule applies to what ships,
 * not to what checks it. Playwright is not vendored and not committed.
 *
 *   npm i playwright && npx playwright install chromium     (once)
 *   python3 -m http.server 8901                             (from the repo root)
 *   python3 build-portable.py                               (the portable checks read its output)
 *   node tools/qc.mjs
 *
 * PORTABLE overrides where the portable build was written; CHROMIUM overrides the
 * browser binary when Playwright's own download is not what you want to drive.
 */
import { chromium } from 'playwright';
const B = 'http://127.0.0.1:8901';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const PORTABLE = process.env.PORTABLE || new URL('../theguide-portable.html', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: CHROMIUM }).catch(() => chromium.launch());
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ' · ' + detail : ''}`); };

const page = await browser.newPage();
const errs = [], external = [];
page.on('request', r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(u)) external.push(u.slice(0, 70)); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('requestfailed', r => errs.push('reqfail: ' + r.url()));

// ─── ENTRY ───
await page.goto(B + '/index.html');
await page.waitForTimeout(1200);
check('landing owns first run', await page.evaluate(() => document.getElementById('landing').classList.contains('show')));
check('gate retired (never shown)', await page.evaluate(() => document.getElementById('gate').classList.contains('gone')));
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
check('house fonts load', await page.evaluate(() => document.fonts.check('600 12px "Playfair Display"') && document.fonts.check('12px "DM Mono"')));
await page.evaluate(() => document.querySelector('.lp[data-p="3"]').scrollIntoView());
await page.waitForTimeout(600);
check('mini-sky renders 4 worlds + constellation',
  await page.evaluate(() => document.querySelectorAll('.lp-star').length === 4 && document.querySelectorAll('#lp-sky svg line').length === 3));
await page.click('.lp-star[data-world="riftborn"]');
await page.waitForTimeout(300);
const leaves = await page.evaluate(() => document.getElementById('lp-leaves').classList.contains('shut'));
await page.waitForTimeout(1400);
check('door-leaf ceremony → correct chamber', leaves &&
  await page.evaluate(() => document.getElementById('chamber').classList.contains('open') && document.querySelector('.ch-bar .crumb b').textContent === 'riftborn'));
check('chamber arrows name their destination',
  await page.evaluate(() => [...document.querySelectorAll('.ch-bar .nav .x')].slice(0,2).map(x=>x.textContent).join('|').includes('excelsior')));
await page.evaluate(() => closeChamber());

// ─── PULSE ───
check('door pulse lines are live, not invented',
  await page.evaluate(() => [...document.querySelectorAll('.tp-pulse')].every(e => /instrument|idea/.test(e.textContent))),
  await page.evaluate(() => document.querySelector('.tp-panel[data-world="altar"] .tp-pulse').textContent));
check('no invented counters left in manifest',
  await page.evaluate(() => !Object.values(WORLDS).some(w => w.pulse) && !Object.values(APPS).some(a => a.pulse)));

// ─── THEMES (all four) ───
const skins = {};
for (const t of ['night','day','twilight','pop']) {
  await page.evaluate(x => setThemeMode(x), t);
  await page.waitForTimeout(1100);   // past the .6s background transition
  skins[t] = await page.evaluate(() => getComputedStyle(document.body).backgroundColor + ' / ' + getComputedStyle(document.documentElement).getPropertyValue('--gilt').trim());
}
const uniq = new Set(Object.values(skins));
check('four skins are four distinct palettes', uniq.size === 4);
check('pop ≠ night (the reported bug)', skins.pop !== skins.night, `pop ${skins.pop} vs night ${skins.night}`);
check('day is paper, not beach', skins.day.includes('244, 238, 224'), skins.day);
check('auto never derives pop', await page.evaluate(() => [0,3,6,9,12,15,18,21,23].every(h => phaseForHour(h) !== 'pop')));

// ─── FRAMES + HANDSHAKE ───
await page.evaluate(() => setThemeMode('night'));
await page.evaluate(() => Frame.enter('ping'));
await page.waitForFunction(() => !document.getElementById('veil').classList.contains('on'), null, { timeout: 25000 });
await page.waitForTimeout(1300);
check('ping mounts from apps/ping.html', await page.evaluate(() => document.querySelector('#frame iframe.active').getAttribute('src') === 'apps/ping.html'));

// the Lens engine's own fixture suite, run through the shell the way a user meets it
const lens = await page.evaluate(() => {
  const e = document.querySelector('iframe[data-shell-app="ping"]').contentWindow.MirrorFlowAssistEngine;
  const rep = e.runRuleTests();
  return { rules: e.rules.length, total: rep.total, failed: rep.failed,
           fails: rep.results.filter(r => !r.passed).map(r => r.id).join(',') };
});
const lensDeferred = await page.evaluate(() => {
  const w = document.querySelector('iframe[data-shell-app="ping"]').contentWindow;
  const nav = w.performance.getEntriesByType('navigation')[0] || {};
  const r = w.performance.getEntriesByType('resource').find(x => x.name.includes('ping/lens.js'));
  return { dcl: Math.round(nav.domContentLoadedEventEnd || 0), at: r ? Math.round(r.startTime) : null };
});
// Assert the deterministic fact, not the race: a parser-blocking <script src> for the
// engine is what would put it back in the boot path. The fetch timing sits only a few ms
// after DCL by design (an idle kick), so asserting on that alone would be a flaky test.
const pingSrc = await (await fetch(B + '/apps/ping.html')).text();
check('the Lens engine stays out of Ping\'s boot path',
  !/<script[^>]+src=["']ping\/lens\.js["']/.test(pingSrc) && /__TGC_LENS_ENGINE_URL/.test(pingSrc),
  'no parser-blocking tag · fetched at ' + lensDeferred.at + ' ms vs DCL ' + lensDeferred.dcl + ' ms');
check('ping rule suite green in-frame', lens.failed === 0,
  lens.rules + ' rules · ' + lens.total + ' fixtures' + (lens.failed ? ' · failing ' + lens.fails : ''));
// every declared category and subtype must actually carry rules — no promised coverage
const lensCov = await page.evaluate(() => {
  const e = document.querySelector('iframe[data-shell-app="ping"]').contentWindow.MirrorFlowAssistEngine;
  const cats = {}, subs = {};
  e.rules.forEach(r => { cats[r.category] = (cats[r.category]||0)+1; if (r.subtype) subs[r.subtype] = (subs[r.subtype]||0)+1; });
  const declared = e.contract.rules ? e.contract.rules.categories : null;
  return { cats, punct: subs.punctuation||0, style: subs.style||0, declared };
});
check('no declared category ships empty',
  Object.values(lensCov.cats).every(n => n > 0) && lensCov.punct > 0 && lensCov.style > 0,
  JSON.stringify(lensCov.cats) + ' · punctuation ' + lensCov.punct + ' · style ' + lensCov.style);
check('handshake: ping wears night → pulse', await page.evaluate(() => document.querySelector('iframe[data-shell-app="ping"]').contentDocument.documentElement.dataset.theme) === 'pulse');
await page.evaluate(() => setThemeMode('pop')); await page.waitForTimeout(1300);
check('handshake: live sky change → paper', await page.evaluate(() => document.querySelector('iframe[data-shell-app="ping"]').contentDocument.documentElement.dataset.theme) === 'paper');
await page.evaluate(() => setThemeMode('night')); await page.waitForTimeout(1000);
await page.evaluate(() => Frame.enter('coach'));
await page.waitForFunction(() => !document.getElementById('veil').classList.contains('on'), null, { timeout: 25000 });
await page.waitForTimeout(1300);
check('handshake: coach wears night → press', await page.evaluate(() => document.querySelector('iframe[data-shell-app="coach"]').contentDocument.documentElement.dataset.theme) === 'press');
await page.evaluate(() => Frame.ascend());
check('visit stamps recorded', await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('tgc.shell2.visits')||'{}')).length >= 2));

// ─── MOTIFS ───
check('excelsior rays lit by the ladder (18/24)',
  await page.evaluate(() => document.querySelectorAll('.tp-panel[data-world="excelsior"] .tp-rays line.lit').length) === 18);
await page.evaluate(() => openChamber('excelsior')); await page.waitForTimeout(500);
check('chamber ladder derives from same source (9/12)',
  await page.evaluate(() => document.querySelectorAll('.ex-ladder .rung.lit').length) === 9 &&
  await page.evaluate(() => document.querySelectorAll('.ex-ladder .rung').length) === 12);
await page.evaluate(() => closeChamber());
await page.hover('.tp-panel[data-world="mirrorflow"]'); await page.waitForTimeout(500);
check('mirrorflow moons fan out with labels on hover',
  await page.evaluate(() => [...document.querySelectorAll('.tp-panel[data-world="mirrorflow"] .mn')].every(m =>
    getComputedStyle(m).animationName === 'none' && getComputedStyle(m.querySelector('i'), '::after').content.length > 2)));

// ─── ALTAR ───
const embers0 = await page.evaluate(() => document.querySelectorAll('.tp-panel[data-world="altar"] .em').length);
await page.hover('.tp-panel[data-world="altar"]'); await page.waitForTimeout(600);
await page.click('[data-altar-lay]'); await page.waitForTimeout(200);
const chamberStayedShut = await page.evaluate(() => !document.getElementById('chamber').classList.contains('open'));
await page.keyboard.type('QC candle'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
check('quick-lay adds an ember without opening the chamber',
  chamberStayedShut && await page.evaluate(() => document.querySelectorAll('.tp-panel[data-world="altar"] .em').length) === embers0 + 1);
check('laid idea persists + names its ember',
  await page.evaluate(() => (localStorage.getItem('tgc.shell2.altar')||'').includes('QC candle')) &&
  await page.evaluate(() => [...document.querySelectorAll('.tp-panel[data-world="altar"] .em')].some(e => e.dataset.nm === 'QC candle')));

// ─── EXCHANGE v2 ───
const send = pkt => page.evaluate(k => window.postMessage({ type:'tgc.exchange.send', packet:k }, '*'), pkt);
await send({ contract:'bogus', from:'ping', to:'coach' }); await page.waitForTimeout(220);
check('malformed packet refused with a reason',
  await page.evaluate(() => Bus.queue.length) === 0 &&
  (await page.evaluate(() => document.getElementById('toast').textContent)).includes('must declare'));
await send({ contract:'theguide.exchange.v2', kind:'handoff', from:'ping', to:'coach', subject:'QC handoff' });
await send({ contract:'theguide.exchange.v2', kind:'digest',  from:'sync', to:'notes', subject:'QC digest' });
await send({ contract:'theguide.exchange.v2', kind:'receipt', from:'coach', subject:'QC receipt' });
await send({ contract:'theguide.exchange.v1', from:'notes', to:'ping', subject:'QC legacy v1' });
await page.waitForTimeout(450);
check('handoffs + receipts queue, legacy v1 accepted', await page.evaluate(() => Bus.queue.length) === 3);
check('a digest bypasses the human inbox and lands in the ledger',
  await page.evaluate(() => (JSON.parse(localStorage.getItem('tgc.shell2.digests')||'[]')).some(d => d.subject === 'QC digest')) &&
  await page.evaluate(() => Bus.queue.every(p => p.kind !== 'digest')));
await page.evaluate(() => openInbox()); await page.waitForTimeout(400);
const rows = await page.evaluate(() => [...document.querySelectorAll('.ib-row')].map(r => r.dataset.kind + ':' + r.querySelector('.ib-sigil').textContent).join(' '));
check('per-kind inbox rendering', rows === 'handoff:✦ receipt:✓ handoff:✦', rows);
await page.evaluate(() => { const i = Bus.queue.findIndex(x => x.kind === 'receipt'); document.querySelector(`[data-ib-deliver="${i}"]`).click(); });
await page.waitForTimeout(500);
check('receipt acknowledges without entering an app',
  await page.evaluate(() => Bus.queue.length) === 2 && await page.evaluate(() => document.body.dataset.view) === 'nave');
await page.evaluate(() => closeInbox());

// ─── RITES ───
await page.evaluate(() => runRites()); await page.waitForTimeout(800);
const rites = await page.evaluate(() => document.getElementById('rites-sum').textContent);
check('rites all hold', rites.includes('all rites held'), rites);
check('exchange contract rite present + ok',
  await page.evaluate(() => { const r = [...document.querySelectorAll('.rt-row')].find(x => x.querySelector('.rt-name').textContent === 'exchange contract'); return r && r.dataset.st === 'ok'; }));
await page.evaluate(() => document.getElementById('rites').classList.remove('open'));

// ─── SATCHEL ROUND-TRIP ───
check('satchel gathers every tgc.* store',
  await page.evaluate(() => Object.keys(gatherStore()).every(k => k.startsWith('tgc.')) && Object.keys(gatherStore()).length > 3));

// ─── BRIDGE HELPERS ───
await page.evaluate(() => Frame.enter('notes'));
await page.waitForFunction(() => !document.getElementById('veil').classList.contains('on'), null, { timeout: 25000 });
await page.waitForTimeout(700);
check('bridge exposes tgcSeal + tgcOnMissive in-frame',
  await page.evaluate(() => { const w = document.querySelector('iframe[data-shell-app="notes"]').contentWindow; return typeof w.tgcSeal === 'function' && typeof w.tgcOnMissive === 'function'; }));
const l0 = await page.evaluate(() => (JSON.parse(localStorage.getItem('tgc.shell2.digests')||'[]')).length);
await page.evaluate(() => document.querySelector('iframe[data-shell-app="notes"]').contentWindow.tgcSeal('digest', { to:'insight', subject:'QC from inside' }));
await page.waitForTimeout(500);
check('tgcSeal from a live app produces a valid packet',
  await page.evaluate(() => (JSON.parse(localStorage.getItem('tgc.shell2.digests')||'[]')).length) === l0 + 1 &&
  await page.evaluate(() => { const L = JSON.parse(localStorage.getItem('tgc.shell2.digests')||'[]'); const p = L[L.length-1];
    return p.contract==='theguide.exchange.v2' && p.kind==='digest' && p.from==='notes' && p.to==='insight' && !!p.at; }));
check('notes wears the house type stack',
  (await page.evaluate(() => { const d = document.querySelector('iframe[data-shell-app="notes"]').contentDocument; return getComputedStyle(d.body).fontFamily; })).startsWith('"DM Sans"'));

// ─── SYNC · vendored libraries ───
await page.evaluate(() => Frame.enter('sync'));
await page.waitForFunction(() => !document.getElementById('veil').classList.contains('on'), null, { timeout: 45000 });
await page.waitForTimeout(2500);
const syncLibs = await page.evaluate(() => { const f = document.querySelector('iframe[data-shell-app="sync"]').contentWindow;
  return { XLSX: typeof f.XLSX, html2canvas: typeof f.html2canvas, ExcelJS: typeof f.ExcelJS, JSZip: typeof f.JSZip }; });
check('sync loads all four vendored libraries',
  syncLibs.XLSX === 'object' && syncLibs.html2canvas === 'function' && syncLibs.ExcelJS === 'object' && syncLibs.JSZip === 'function',
  JSON.stringify(syncLibs));
check('vendored xlsx actually works (write → read)',
  (await page.evaluate(() => { const f = document.querySelector('iframe[data-shell-app="sync"]').contentWindow;
    try { const ws = f.XLSX.utils.aoa_to_sheet([['Name','Shift'],['Sel','Early']]); const wb = f.XLSX.utils.book_new();
      f.XLSX.utils.book_append_sheet(wb, ws, 'S1'); const out = f.XLSX.write(wb, { type:'array', bookType:'xlsx' });
      const back = f.XLSX.read(new Uint8Array(out), { type:'array' });
      return JSON.stringify(f.XLSX.utils.sheet_to_json(back.Sheets['S1'], { header:1 }));
    } catch (e) { return 'ERR ' + e.message; } })) === '[["Name","Shift"],["Sel","Early"]]');
// leave sync mounted — the session-restore check below reloads and expects to land back in a frame

check('no external runtime requests (canon)', external.length === 0, external.slice(0,2).join(' | '));

// ─── SESSION RESTORE ───
await page.reload(); await page.waitForTimeout(1500);
check('session restores into the last frame, no ceremony replay',
  await page.evaluate(() => document.body.dataset.view) === 'frame' &&
  await page.evaluate(() => { const l = document.getElementById('landing'); return !l || l.style.display === 'none' || !l.classList.contains('show'); }));
await page.close();

// ─── MOBILE ───
const m = await browser.newPage({ viewport: { width: 390, height: 800 } });
m.on('pageerror', e => errs.push('mobile pageerror: ' + e.message));
await m.goto(B + '/index.html'); await m.waitForTimeout(1000);
await m.click('#lp-enter'); await m.waitForTimeout(900);
check('phone keeps a slim sky with tappable orbs',
  await m.evaluate(() => document.getElementById('sky').offsetHeight) === 60 &&
  await m.evaluate(() => parseInt(getComputedStyle(document.querySelector('.sky-orb')).width)) >= 22);
check('phone doors stack and reveal without hover',
  await m.evaluate(() => getComputedStyle(document.querySelector('.tp-reveal')).opacity) === '1');
await m.close();

// ─── PORTABLE ───
const pf = await browser.newPage();
const perrs = [];
pf.on('pageerror', e => perrs.push(e.message));
await pf.goto('file://' + PORTABLE);
await pf.waitForTimeout(1500);
check('portable edition boots from file://', await pf.evaluate(() => !!document.getElementById('landing')));
await pf.click('#lp-enter'); await pf.waitForTimeout(900);
await pf.evaluate(() => Frame.enter('ping'));
await pf.waitForFunction(() => !document.getElementById('veil').classList.contains('on'), null, { timeout: 30000 });
check('portable mounts an app via blob url', await pf.evaluate(() => document.querySelector('#frame iframe.active').src.startsWith('blob:')));
// a part fetched on demand in the served build must be inlined in the portable one:
// the Lens engine shipped missing from the portable edition the day it left the boot path
await pf.waitForTimeout(2500);
// a blob frame under file:// is cross-origin, so reach it as a frame, not through contentWindow
const pFrame = pf.frames().find(f => f.url().startsWith('blob:'));
const pLens = pFrame ? await pFrame.evaluate(() => ({
  engine: typeof window.MirrorFlowAssistEngine,
  rules: window.MirrorFlowAssistEngine ? window.MirrorFlowAssistEngine.rules.length : 0
})) : { engine: 'no blob frame', rules: 0 };
check('portable carries Ping\'s rule engine', pLens.engine === 'object' && pLens.rules > 200,
  pLens.engine + ' · ' + pLens.rules + ' rules');
check('portable has no console errors', perrs.length === 0, perrs.slice(0,2).join(' | '));
await pf.close();

console.log(`\n${'─'.repeat(46)}\n${pass} passed · ${fail} failed · ${errs.length} runtime errors`);
if (errs.length) errs.slice(0, 8).forEach(e => console.log('  ' + e));
await browser.close();
process.exit(fail || errs.length ? 1 : 0);
