/* Lens · the rule suite and the clean-prose ceiling
 *
 * Two things the fixture suite alone cannot tell you:
 *
 *   1. the floor — every declared rule fires on the text it exists for
 *      (the 111 fixtures, run in a real browser through analyzeText)
 *   2. the ceiling — no rule fires on ordinary professional writing
 *
 * The second is the one that catches over-eager rules, and it is where the
 * F3 pack's passive-voice rule was first found flagging "the report is
 * attached". A new rule is not done until both come back clean.
 *
 *   python3 -m http.server 8901       (from the repo root)
 *   node tools/lens.mjs
 */
import { chromium } from 'playwright';

const B = process.env.BASE || 'http://127.0.0.1:8901';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';

/* Ordinary replies, correctly written. Nothing here should be flagged.
   Each line is here because some rule shape is tempted by it. */
const CLEAN = [
  "Hi Marcus, thanks for waiting. I have checked the booking and the slot is confirmed for Thursday at 14:30.",
  "However, the engineer cannot make the original window, so I have moved you to the next available slot.",
  "If you need anything else, I will be here until 17:00.",
  "Should you need to reschedule, reply here and I will sort it out.",
  "Can you confirm the reference number?",
  "I am interested in the outcome and pleased the team is involved.",
  "The office is closed on Monday and the account is limited to two users.",
  "Please note: the slot has moved. Thanks for your patience.",
  "There is nothing more I need from you at this stage.",
  "Do the right thing and send it back today.",
  "I checked the file and it is fine.",
  "We have refunded the amount to the original card; it should land within three working days.",
  "Your booking (reference TG-4821) is confirmed.",
  "Visit https://sel.theguide.club or email support@theguide.club for the full policy.",
  "Thanks for flagging this. The report is attached. Let me know if anything looks off."
];

const browser = await chromium.launch({ executablePath: CHROMIUM }).catch(() => chromium.launch());
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(B + '/apps/ping.html', { waitUntil: 'load' });
await page.waitForTimeout(1200);

if (errs.length) { console.log('PAGE ERRORS:\n' + errs.join('\n')); await browser.close(); process.exit(1); }

/* ─── the floor ─── */
const suite = await page.evaluate(() => {
  const e = window.MirrorFlowAssistEngine, rep = e.runRuleTests();
  const cats = {}, subs = {};
  e.rules.forEach(r => { cats[r.category] = (cats[r.category] || 0) + 1; if (r.subtype) subs[r.subtype] = (subs[r.subtype] || 0) + 1; });
  return { rules: e.rules.length, total: rep.total, passed: rep.passed, failed: rep.failed, cats, subs,
    fails: rep.results.filter(r => !r.passed).map(r => ({ id: r.id, ruleId: r.ruleId, matched: r.matched, want: r.expectedReplacement, got: r.actualReplacements })) };
});
console.log(`rules ${suite.rules} · fixtures ${suite.total} · passed ${suite.passed} · failed ${suite.failed}`);
console.log('categories ' + JSON.stringify(suite.cats));
suite.fails.forEach(f => console.log(`  FAIL ${f.id} ${f.ruleId} · matched=${f.matched} want=${JSON.stringify(f.want)} got=${JSON.stringify(f.got)}`));

/* no declared category or headline subtype may ship empty — the F3 failure, guarded */
const empty = Object.entries(suite.cats).filter(([, n]) => !n).map(([c]) => c)
  .concat(['punctuation', 'style', 'spelling', 'wordiness'].filter(s => !suite.subs[s]));
if (empty.length) console.log('  EMPTY: ' + empty.join(', '));

/* ─── the ceiling ─── */
const fp = await page.evaluate(list => list.map(t => ({
  t, hits: window.MirrorFlowAssistEngine.analyzeText(t, { source: 'fp' }).issues
        .map(i => i.ruleId + ' «' + i.excerpt + '»')
})), CLEAN);

let hits = 0;
fp.forEach(o => { if (o.hits.length) { hits += o.hits.length; console.log('\n· ' + o.t.slice(0, 74)); o.hits.forEach(h => console.log('    ' + h)); } });
console.log(hits ? `\nclean corpus · ${hits} hit(s) to judge` : '\nclean corpus · 0 false positives');

await browser.close();
process.exit(suite.failed || empty.length || hits ? 1 : 0);
