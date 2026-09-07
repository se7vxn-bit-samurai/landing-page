/* Ping · insights
 * Split out of apps/ping.html. These files are classic scripts, not modules:
 * top-level bindings are shared across them, so LOAD ORDER IS THE CONTRACT.
 * The order is fixed in ping.html and must not be rearranged.
 */

/* ========== MIRRORFLOW PING INSIGHTS ENGINE (inlined) ========== */
/* Universal local insight engine: core first, vertical packs second */
const MF_PING_STOP_WORDS = new Set([
  'about','again','also','because','been','being','before','between','could','does','doing','from','have','into',
  'just','know','like','more','need','needs','onto','over','really','same','should','still','that','their','them',
  'then','there','these','they','this','those','through','today','want','what','when','where','which','while',
  'with','would','your','youre','youll','youve','thanks','thank'
]);

const MF_PING_DOMAIN_PACKS = [
  {
    id: 'claims',
    label: 'Claims',
    modeLabel: 'Claims',
    summary: 'Insurance, repairs, cover, liability, settlement, excess, or claim progress.',
    keywords: ['claim','claims','policy','insurance','insurer','settlement','payout','excess','garage','repair','engineer','liability','fault','non fault','third party','windscreen','valuation','total loss','written off','cover','covered','premium','no claims','ncd','ncb','accident'],
    jargon: ['ncd','ncb','bacs','subrogation','liability','excess','endorsement','indemnity']
  },
  {
    id: 'retail',
    label: 'Retail / order support',
    modeLabel: 'Retail',
    summary: 'Orders, delivery, refunds, returns, replacements, products, stores, or couriers.',
    keywords: ['order','delivery','delivered','parcel','courier','tracking','refund','return','replacement','exchange','item','product','store','checkout','purchase','receipt','damaged','missing','warehouse','stock'],
    jargon: ['rma','sku','fulfilment','backorder','dispatch exception']
  },
  {
    id: 'booking',
    label: 'Booking / scheduling',
    modeLabel: 'Auto',
    summary: 'Appointments, slots, reservations, cancellations, or rescheduling.',
    keywords: ['booking','appointment','reservation','slot','schedule','reschedule','cancelled','canceled','calendar','availability','date','time','confirm','confirmation','double booked'],
    jargon: ['slot window','calendar hold','reschedule flow'],
    packType: 'booking_change',
    packSummary: 'Checks booking anchor, date/time, confirmation, fallback, reference handling, and promise risk.'
  },
  {
    id: 'billing',
    label: 'Billing / payment',
    modeLabel: 'Auto',
    summary: 'Payments, invoices, charges, subscriptions, refunds, fees, or account balance.',
    keywords: ['payment','invoice','charge','charged','fee','bill','billing','subscription','renewal','refund','money','paid','overpaid','receipt','balance','direct debit'],
    jargon: ['arrears','pro rata','chargeback','billing cycle'],
    packType: 'refund_payment',
    packSummary: 'Checks money anchor, amount or stage, ownership, movement timing, payment path, reference handling, and promise risk.'
  },
  {
    id: 'account',
    label: 'Account / access',
    modeLabel: 'Auto',
    summary: 'Login, password, verification, account access, app, or portal issues.',
    keywords: ['account','login','log in','password','verification','code','otp','app','portal','profile','access','locked','unlock','email address','username'],
    jargon: ['2fa','mfa','sso','oauth','tenant']
  },
  {
    id: 'technical',
    label: 'Technical support',
    modeLabel: 'Auto',
    summary: 'Errors, bugs, crashes, devices, setup, installation, or service failure.',
    keywords: ['error','bug','crash','broken','not working','device','install','installation','setup','website','screen','loading','failed','failure','sync','download','update'],
    jargon: ['cache','api','endpoint','payload','server error','client']
  },
  {
    id: 'general',
    label: 'Universal service',
    modeLabel: 'General',
    summary: 'General messenger insight mode with no specialised vertical assumptions.',
    keywords: ['help','support','question','issue','problem','clarify','explain','update','status'],
    jargon: ['process','workflow','internal team']
  }
];

const MF_PING_QUERY_TYPES = [
  { id:'status', label:'Status chase', need:'current state, blocker, next step, and timing', phrases:['any update','status','progress','where is','what is happening','whats happening','still waiting','waiting','no update','not heard','follow up','following up','chasing','when will','how long'] },
  { id:'complaint', label:'Complaint / escalation', need:'acknowledgement, ownership, route, and response timeframe', phrases:['complaint','complain','unacceptable','formal complaint','manager','supervisor','escalate','legal action','ombudsman','regulator','trustpilot','worst','disappointed','angry'] },
  { id:'refund_payment', label:'Money / refund', need:'amount or stage, who owns it, and when money moves', phrases:['refund','payment','paid','charge','charged','invoice','cost','fee','money back','payout','settlement','excess','premium','overcharged'] },
  { id:'delivery_replacement', label:'Delivery / replacement', need:'where the item is, replacement path, and confirmation timing', phrases:['delivery','delivered','parcel','tracking','courier','replacement','return','exchange','damaged','missing','order','item','product'] },
  { id:'booking_change', label:'Booking / change', need:'confirmed slot, changed detail, and fallback option', phrases:['booking','appointment','reservation','slot','reschedule','cancel','cancelled','canceled','double booked','confirm','confirmation','availability'] },
  { id:'clarification', label:'Clarification', need:'simple explanation, one idea per sentence, and a check for understanding', phrases:['confused','confusing','dont understand','don\'t understand','what does','explain','unclear','not sure','how does','break it down','which one is true'] },
  { id:'access', label:'Access help', need:'account state, reset route, and safe next step', phrases:['login','log in','password','account','verification','code','locked','access','app','portal','cant get in','can\'t get in'] },
  { id:'technical_fault', label:'Technical fault', need:'what failed, what to try next, and escalation path', phrases:['error','bug','crash','not working','broken','failed','loading','screen','install','setup','device','sync'] },
  { id:'coverage_eligibility', label:'Cover / eligibility', need:'clear yes/no, reason, and next step', phrases:['covered','cover','eligible','entitled','policy','terms','approved','declined','not covered','can i claim','am i covered'] }
];

const MF_PING_SIGNALS = [
  { id:'frustration', label:'Frustration', weight:22, phrases:['not acceptable','unacceptable','fed up','frustrated','angry','annoyed','ridiculous','disappointed','not good enough','worst','ignored','no one cares'], coach:'Acknowledge the experience before explaining.' },
  { id:'confusion', label:'Confusion', weight:18, phrases:['confused','confusing','dont understand','don\'t understand','not sure','unclear','what does','which one','doesnt make sense','doesn\'t make sense','explain'], coach:'Use simple language and separate steps.' },
  { id:'urgency', label:'Urgency', weight:20, phrases:['urgent','today','now','asap','immediately','need this sorted','affecting my schedule','before monday','deadline','cannot wait','can\'t wait'], coach:'Give a concrete next step and time.' },
  { id:'vulnerability', label:'Potential vulnerability', weight:24, phrases:['overwhelmed','panic','can\'t cope','cant cope','worried','anxious','scared','i give up','helpless','mental health','disabled','vulnerable'], coach:'Slow the pace and reduce uncertainty.' },
  { id:'distrust', label:'Trust gap', weight:18, phrases:['mixed messages','not what i was told','your colleague said','nobody told me','different answers','contradiction','which one is true','left in the dark'], coach:'Clarify the record and avoid defensive wording.' },
  { id:'positive', label:'Positive tone', weight:-8, phrases:['thanks','thank you','appreciate','helpful','no rush','whenever you can'], coach:'Match warmth and keep the momentum.' }
];

const MF_PING_DRAFT_SIGNALS = [
  { id:'instruction_load', label:'Hard instruction', weight:18, phrases:['you need to','you must','you have to','you should have'], coach:'Soften instructions into a clear request or next step.' },
  { id:'vague_timing', label:'Vague timing', weight:16, phrases:['soon','shortly','asap','in due course','at some point','later'], coach:'Replace vague timing with a concrete update point where possible.' },
  { id:'robotic_wording', label:'Robotic wording', weight:14, phrases:['as per','kindly','please note that','process','procedure','escalate internally'], coach:'Use plainer wording that still sounds accountable.' },
  { id:'defensive_wording', label:'Defensive wording', weight:20, phrases:['as i said','as already explained','obviously','not our fault','policy says','per policy'], coach:'Remove defensive framing and keep the explanation neutral.' },
  { id:'overpromise', label:'Promise risk', weight:22, phrases:['guarantee','definitely','promise','100%','will be resolved today'], coach:'Avoid firm promises unless the outcome is verified.' },
  { id:'ownership_visible', label:'Ownership visible', weight:-8, phrases:['i will','i can','we will','we can','i have','we have'], coach:'Keep the owner and action visible.' }
];

let activeInsightMode = 'auto';

function getCustomerContextText() {
  const live = customerEl.value.trim();
  if (live) return live;
  const bubbles = Array.from(phoneBody.querySelectorAll('.bubble[data-role="cust"]'))
    .filter(el => !el.classList.contains('typing') && !el.classList.contains('preview'))
    .map(el => el.textContent.trim())
    .filter(Boolean);
  if (bubbles.length) return bubbles[bubbles.length - 1];
  return '';
}

function mfNorm(text) {
  return String(text || '').toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
}

function mfEscapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mfMatches(text, phrases) {
  const t = mfNorm(text);
  return (phrases || []).filter(p => {
    const needle = mfNorm(p);
    if (!needle) return false;
    if (/^[a-z0-9£$]{2,4}$/.test(needle)) {
      return new RegExp('(^|[^a-z0-9])' + mfEscapeRegExp(needle) + '(?=$|[^a-z0-9])').test(t);
    }
    return t.includes(needle);
  });
}

function mfWords(text) {
  return (mfNorm(text).match(/[a-z0-9£$]{3,}/g) || [])
    .filter(w => !MF_PING_STOP_WORDS.has(w))
    .filter(w => !/^\d+$/.test(w));
}

function mfAverageSentence(text) {
  const parts = String(text || '').split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const count = Math.max(parts.length, 1);
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / count);
}

function mfPackById(id) {
  return MF_PING_DOMAIN_PACKS.find(p => p.id === id) || MF_PING_DOMAIN_PACKS[MF_PING_DOMAIN_PACKS.length - 1];
}

function mfDetectDomain(customer, draft, mode) {
  const customerText = customer || '';
  const draftText = draft || '';
  const text = `${customerText} ${draftText}`;
  const draftOnly = !customerText.trim() && !!draftText.trim();
  if (mode === 'claims' || mode === 'retail' || mode === 'general') {
    const forced = mfPackById(mode);
    return {
      id: forced.id,
      label: forced.label,
      confidence: 100,
      forced: true,
      hits: mfMatches(text, forced.keywords).slice(0, 5),
      summary: forced.summary,
      pack: forced,
      candidates: []
    };
  }
  const scored = MF_PING_DOMAIN_PACKS
    .filter(p => p.id !== 'general')
    .map(pack => {
      const customerHits = mfMatches(customerText, pack.keywords);
      const draftHits = mfMatches(draftText, pack.keywords);
      const hits = Array.from(new Set(customerHits.concat(draftHits)));
      const score = customerHits.length * 22 + draftHits.length * (draftOnly ? 18 : 5) + Math.min(24, new Set(hits).size * 4);
      return { pack, hits, score };
    })
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < 12) {
    const general = mfPackById('general');
    return { id: 'general', label: general.label, confidence: 62, forced: false, hits: [], summary: general.summary, pack: general, candidates: scored.slice(0, 3) };
  }
  return {
    id: top.pack.id,
    label: top.pack.label,
    confidence: Math.max(58, Math.min(96, top.score)),
    forced: false,
    hits: top.hits.slice(0, 5),
    summary: top.pack.summary,
    pack: top.pack,
    candidates: scored.slice(0, 3)
  };
}

function mfDetectQueryType(customer, domain) {
  const scored = MF_PING_QUERY_TYPES.map(type => {
    const hits = mfMatches(customer, type.phrases);
    return { type, hits, score: hits.length * 16 };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  const candidates = scored.slice(0, 5).map(item => ({
    id: item.type.id,
    label: item.type.label,
    score: item.score,
    hits: item.hits.slice(0, 4),
    need: item.type.need
  }));
  if (!customer.trim()) return { id:'none', label:'No customer message', need:'Type a customer message to classify intent.', hits: [], confidence: 0, candidates };
  if (!top || top.score < 16) return { id:'general', label:'General support', need:'clear answer, ownership, and a useful next step', hits: [], confidence: 52, candidates };
  return { id: top.type.id, label: top.type.label, need: top.type.need, hits: top.hits.slice(0, 4), confidence: Math.min(96, 58 + top.score), candidates };
}

function mfDetectSignals(text, sourceMode) {
  const rules = sourceMode === 'draft_only'
    ? MF_PING_DRAFT_SIGNALS.concat(MF_PING_SIGNALS)
    : MF_PING_SIGNALS;
  const rows = rules.map(rule => {
    const hits = mfMatches(text, rule.phrases);
    return Object.assign({}, rule, { hits, score: hits.length ? Math.max(8, hits.length * Math.abs(rule.weight)) : 0 });
  }).filter(r => r.hits.length).sort((a, b) => b.score - a.score);
  const load = Math.max(0, Math.min(100, rows.reduce((sum, r) => sum + r.weight * r.hits.length, 0)));
  return { rows, load };
}

function mfKeyTerms(customer, domain) {
  const base = Array.from(new Set(mfWords(customer))).filter(w => w.length > 3);
  const domainHits = mfMatches(customer, domain.pack.keywords).map(h => mfNorm(h).split(' ')[0]);
  return Array.from(new Set(domainHits.concat(base))).slice(0, 12);
}

function mfCoverage(customer, draft, domain, sourceMode) {
  if (sourceMode === 'draft_only') {
    return { score: 100, terms: mfKeyTerms(draft, domain), missing: [], mode: 'draft_only' };
  }
  const terms = mfKeyTerms(customer, domain);
  if (!customer.trim()) return { score: 100, terms: [], missing: [], mode: 'none' };
  if (!draft.trim()) return { score: 0, terms, missing: terms.slice(0, 6) };
  const d = mfNorm(draft);
  const hits = terms.filter(term => d.includes(term));
  const score = terms.length ? Math.round((hits.length / terms.length) * 100) : 100;
  return { score, terms, missing: terms.filter(term => !d.includes(term)).slice(0, 6), mode: 'customer' };
}

function mfLooksSupportLike(draft, domain, query) {
  if (!String(draft || '').trim()) return false;
  if (query && query.id && query.id !== 'general' && query.id !== 'none') return true;
  const domainHits = domain && domain.id !== 'general' ? mfMatches(draft, domain.pack.keywords).length : 0;
  const supportHits = mfMatches(draft, ['customer','booking','refund','payment','account','update','confirm','check','send you','let me know','happy to help','next step']).length;
  return domainHits > 0 || supportHits > 0;
}

function mfDetectReply(customer, draft, domain, query, signals, sourceMode) {
  const d = mfNorm(draft);
  const avg = mfAverageSentence(draft);
  const hasDraft = !!d;
  const draftOnly = sourceMode === 'draft_only';
  const supportLike = draftOnly ? mfLooksSupportLike(draft, domain, query) : true;
  const empathy = mfMatches(draft, ['sorry','apologise','apologize','understand','i hear you','i appreciate','thank you','thanks']).length > 0;
  const ownership = /\b(i|we)('ll| will| can| have| am| are|\'ve| can)\b/i.test(draft) || mfMatches(draft, ['i am taking','i will check','i can check','we have fixed','i have picked']).length > 0;
  const timeline = /\b(today|tomorrow|within|by\s+\w+|before\s+\w+|after\s+\w+|end of day|eod|\d+\s+(working\s+)?days?)\b/i.test(draft);
  const nextStep = mfMatches(draft, ['next step','i will','i can','we will','send you','update you','confirm','check','arrange','resolve','call you']).length > 0;
  const closeIndex = Math.max(d.indexOf('let me know'), d.indexOf('send me'), d.indexOf('anything else'), d.indexOf('any questions'), d.indexOf('is that okay'), d.indexOf('happy to help'), d.indexOf('if that time does not work'), d.indexOf("if that doesn't work"));
  const close = closeIndex >= 0 && closeIndex > d.length * 0.58;
  const coverage = mfCoverage(customer, draft, domain, sourceMode);
  const defensive = mfMatches(draft, ['as i said','as already explained','obviously','you must','not our fault','calm down','policy says','per policy']);
  const overpromise = mfMatches(draft, ['guarantee','definitely','promise','100%','will be resolved today']);
  const vagueTimeline = mfMatches(draft, ['soon','shortly','asap','in due course']).filter(Boolean);
  const jargon = mfMatches(draft, (domain.pack.jargon || []).concat(['escalate internally','backend','process flow']));
  const riskHits = defensive.concat(overpromise).concat(vagueTimeline).concat(jargon);
  const plain = avg <= 22 && jargon.length === 0;
  let readiness = hasDraft ? (draftOnly ? 88 : 92) : 0;
  if (!hasDraft) readiness = 0;
  if (signals.load >= 30 && !empathy && !draftOnly) readiness -= 16;
  if (!ownership && supportLike) readiness -= draftOnly ? 8 : 14;
  if (!nextStep && supportLike) readiness -= draftOnly ? 8 : 14;
  if ((query.id === 'status' || query.id === 'refund_payment' || signals.load >= 32) && !timeline && supportLike) readiness -= draftOnly ? 8 : 12;
  if (!close && supportLike) readiness -= draftOnly ? 4 : 6;
  if (!draftOnly) {
    if (coverage.score < 45) readiness -= 18;
    else if (coverage.score < 70) readiness -= 8;
  }
  readiness -= Math.min(28, riskHits.length * 9);
  if (!plain) readiness -= draftOnly ? 8 : 0;
  readiness = Math.max(0, Math.min(100, Math.round(readiness)));
  return {
    hasDraft, empathy, ownership, timeline, nextStep, close, plain, avg, supportLike, sourceMode,
    coverage, riskHits, defensive, overpromise, vagueTimeline, jargon, readiness
  };
}

function mfHasBookingTimeAnchor(text) {
  return /\b(today|tomorrow|tonight|within|by\s+\w+|before\s+\w+|after\s+\w+|end of day|eod|\d+\s+(working\s+)?days?|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|fri|sat|sun|\d{1,2}[:.]\d{2}|\d{1,2}\s?(am|pm))\b/i.test(text);
}

function mfEvaluateDomainPack(domain, query, customer, draft, reply, sourceMode) {
  const packType = domain && domain.pack && domain.pack.packType;
  const isBookingPack = packType === 'booking_change' || query.id === 'booking_change';
  const isMoneyPack = packType === 'refund_payment' || query.id === 'refund_payment';
  const activePack = isMoneyPack ? 'refund_payment' : isBookingPack ? 'booking_change' : 'none';
  const active = activePack !== 'none';
  const packMeta = {
    booking_change: {
      label: 'Booking / change pack',
      summary: 'Checks booking anchor, date/time, confirmation, fallback, reference handling, and promise risk.'
    },
    refund_payment: {
      label: 'Refund / payment pack',
      summary: 'Checks money anchor, amount or stage, ownership, movement timing, payment path, reference handling, and promise risk.'
    }
  };
  const base = {
    active,
    id: activePack,
    label: active ? packMeta[activePack].label : 'No domain pack',
    summary: active ? (domain.pack.packSummary || packMeta[activePack].summary) : '',
    score: 100,
    checks: [],
    failed: []
  };
  if (!active || !reply.hasDraft) return base;

  const combined = `${customer || ''} ${draft || ''}`;

  function check(id, label, passed, note, fix, severity, required) {
    const row = { id, label, passed, note: passed ? note : fix, fix, severity, required: required !== false };
    base.checks.push(row);
    if (!passed) base.failed.push(row);
  }
  function finalize() {
    const required = base.checks.filter(row => row.required);
    const passed = required.filter(row => row.passed).length;
    base.score = required.length ? Math.round((passed / required.length) * 100) : 100;
    return base;
  }

  if (isMoneyPack) {
    const customerAskedReference = mfMatches(combined, ['reference','ref','invoice','receipt','transaction','payment id','refund id','order number','case number','ticket number']).length > 0;
    const moneyAnchor = mfMatches(draft, ['refund','payment','invoice','charge','charged','fee','billing','bill','paid','money','payout','settlement','balance','direct debit','receipt']).length > 0;
    const amountOrStage = /(?:£|\$|€)\s?\d|\b\d+(?:\.\d{2})?\b/i.test(draft) ||
      mfMatches(draft, ['processed','processing','pending','approved','declined','reversed','credited','charged','submitted','raised','checking','being checked','under review','stage','status']).length > 0;
    const owner = reply.ownership || mfMatches(draft, ['i will','i can','we will','we can','i have','we have','billing team','payments team','refund team','finance team']).length > 0;
    const timeAnchor = reply.timeline || mfHasBookingTimeAnchor(draft) || mfMatches(draft, ['working days','business days','billing cycle','next statement','next update','bank processing']).length > 0;
    const paymentPath = mfMatches(draft, ['original payment method','payment method','card','bank account','direct debit','account credit','statement','invoice','receipt','balance','manual payment','refund route','same card']).length > 0;
    const reference = !customerAskedReference || /\b(ref|reference|invoice|receipt|transaction|payment id|refund id|order|case|ticket|[A-Z]{2,}-?\d{3,}|#\d{3,})\b/i.test(draft);
    const promiseRisk = mfMatches(draft, ['guaranteed','guarantee','definitely refunded','definitely paid','definitely back','100% refunded','100% paid','will be resolved today','money will be in today','should be refunded','hopefully','probably']).length > 0;

    check('money_anchor', 'Money anchor', moneyAnchor, 'Money topic is named.', 'Name the refund, payment, charge, invoice, fee, or balance.', 'medium');
    check('money_stage', 'Amount or stage', amountOrStage, 'Amount or processing stage is visible.', 'Add the amount or current stage: pending, approved, processed, reversed, credited, or being checked.', 'high');
    check('money_owner', 'Owner', owner, 'Owner is visible.', 'Say who is checking, correcting, refunding, or confirming the payment.', 'high');
    check('money_timing', 'Movement timing', timeAnchor, 'Money movement timing is visible.', 'Add when the refund/payment update or movement should happen.', 'high');
    check('money_path', 'Payment path', paymentPath, 'Payment route is clear.', 'Mention the payment method, original card, bank account, invoice, receipt, statement, or balance route.', 'medium');
    check('money_reference', 'Reference handling', reference, 'Reference need is handled.', 'Include the invoice, receipt, transaction, payment, refund, order, case, or ticket reference.', customerAskedReference ? 'medium' : 'low', customerAskedReference);
    check('money_promise', 'Promise control', !promiseRisk, 'No money movement overpromise found.', 'Avoid definite refund/payment promises until verified.', 'high');
    return finalize();
  }

  const customerAskedReference = mfMatches(combined, ['reference','ref','booking id','booking number','confirmation number','case number','ticket number']).length > 0;
  const bookingAnchor = mfMatches(draft, ['booking','appointment','reservation','slot','schedule','calendar','availability']).length > 0;
  const timeAnchor = reply.timeline || mfHasBookingTimeAnchor(draft);
  const confirmation = mfMatches(draft, ['confirmed','confirm','confirmation','booked','locked in','reserved','scheduled','rescheduled','cancelled','canceled','moved','changed']).length > 0;
  const fallback = mfMatches(draft, ['if that does not work','if this does not work','if the time does not work','let me know','alternative','another slot','different time','move it','reschedule','available slot','fallback']).length > 0;
  const reference = !customerAskedReference || /\b(ref|reference|booking id|booking number|confirmation number|case|ticket|[A-Z]{2,}-?\d{3,}|#\d{3,})\b/i.test(draft);
  const promiseRisk = mfMatches(draft, ['guaranteed','guarantee','definitely confirmed','definitely booked','100% confirmed','will be resolved today','should be confirmed','should be booked','hopefully','probably']).length > 0;

  check('booking_anchor', 'Booking anchor', bookingAnchor, 'Booking topic is named.', 'Name the booking, appointment, slot, or reservation.', 'medium');
  check('booking_time', 'Time anchor', timeAnchor, 'Date, time, or update point is visible.', 'Add a date, time, slot, or clear update point.', 'high');
  check('booking_confirmation', 'Confirmation state', confirmation, 'Booking status is explicit.', 'Say whether it is confirmed, changed, cancelled, moved, or still being checked.', 'high');
  check('booking_reference', 'Reference handling', reference, 'Reference need is handled.', 'Include the booking reference or say where it will be confirmed.', customerAskedReference ? 'medium' : 'low', customerAskedReference);
  check('booking_fallback', 'Fallback option', fallback, 'Fallback or reply path is visible.', 'Offer a fallback slot or ask them to send a better window.', 'low', false);
  check('booking_promise', 'Promise control', !promiseRisk, 'No booking overpromise found.', 'Avoid definite booking promises unless verified.', 'high');

  return finalize();
}

function mfBuildGaps(reply, query, signals, domainChecks, sourceMode) {
  const gaps = [];
  function add(id, label, note, severity) { gaps.push({ id, label, note, severity }); }
  const draftOnly = sourceMode === 'draft_only';
  if (!reply.hasDraft) return [{ id:'draft_missing', label:'Draft missing', note:'Write or paste text to score writing readiness.', severity:'high' }];
  if (signals.load >= 30 && !reply.empathy && !draftOnly) add('ack_missing', 'Acknowledge pressure', 'Customer signal is loaded. Open with acknowledgement before process.', 'high');
  if (!reply.ownership && reply.supportLike) add('ownership_missing', draftOnly ? 'Ownership could be clearer' : 'Ownership missing', 'Say who is checking, confirming, fixing, or escalating.', draftOnly ? 'medium' : 'high');
  if (!reply.nextStep && reply.supportLike) add('next_step_missing', draftOnly ? 'Action path could be clearer' : 'Next step missing', 'Add the next concrete action, not only reassurance.', 'medium');
  if ((query.id === 'status' || query.id === 'refund_payment') && !reply.timeline && reply.supportLike) add('timeline_missing', 'Timing missing', draftOnly ? 'This topic would be stronger with a time anchor.' : 'Status and money queries need a time anchor.', draftOnly ? 'medium' : 'high');
  if (!draftOnly && reply.coverage.score < 70) add('coverage_gap', 'Customer ask under-covered', reply.coverage.missing.length ? 'Missing terms: ' + reply.coverage.missing.join(', ') : 'Mirror more of the customer ask.', 'medium');
  if (reply.riskHits.length) add('risk_language', 'Risk language found', reply.riskHits.slice(0, 4).join(', '), 'high');
  if (domainChecks && domainChecks.active) {
    domainChecks.failed.forEach(check => {
      if (!check.required && check.severity === 'low') return;
      add('domain_' + check.id, check.label, check.fix || check.note, check.severity || 'medium');
    });
  }
  if (!reply.close && reply.supportLike) add('close_missing', 'Close is weak or early', 'End with a final offer, check, or confirmation.', 'low');
  if (!reply.plain) add('plain_language', 'Plain language risk', 'Average sentence length or jargon is making the reply heavier.', 'medium');
  return gaps;
}

function mfBuildResponseState(reply, gaps, signals, query, sourceMode) {
  const draftOnly = sourceMode === 'draft_only';
  const highGaps = gaps.filter(gap => gap.severity === 'high');
  const mediumGaps = gaps.filter(gap => gap.severity === 'medium');
  const riskGap = gaps.find(gap => gap.id === 'risk_language');
  const topGap = highGaps[0] || gaps[0];
  const adjustedScore = Math.max(0, Math.min(100, reply.readiness - (highGaps.length * 10) - (mediumGaps.length * 5)));

  function cleanEvidence(items) {
    return (items || []).filter(Boolean).map(item => String(item)).slice(0, 4);
  }
  function state(code, label, reason, next, evidence, severity) {
    return {
      code,
      label,
      score: reply.hasDraft ? adjustedScore : 0,
      severity,
      reason,
      next,
      evidence: cleanEvidence(evidence),
      sourceMode
    };
  }

  if (!reply.hasDraft) {
    return state(
      'blocked',
      'Blocked',
      'No draft exists to evaluate.',
      'Write or paste text before scoring the response.',
      ['Draft missing'],
      'high'
    );
  }

  if (!draftOnly && reply.coverage.score < 45) {
    return state(
      'blocked',
      'Blocked',
      'Customer ask is under-covered.',
      'Mirror the unresolved customer detail before sending.',
      reply.coverage.missing.length ? reply.coverage.missing : ['Coverage below 45%'],
      'high'
    );
  }

  if (riskGap || reply.overpromise.length || reply.defensive.length) {
    return state(
      'risky',
      'Risky',
      riskGap ? riskGap.note : 'Risk language is active.',
      'Remove defensive, vague, or over-promising wording.',
      reply.riskHits.length ? reply.riskHits : [riskGap && riskGap.label],
      'high'
    );
  }

  if (highGaps.length) {
    return state(
      'risky',
      'Risky',
      topGap.note,
      'Fix the high-priority gap before treating this as send-ready.',
      highGaps.map(gap => gap.label),
      'high'
    );
  }

  if (reply.readiness < 45) {
    return state(
      'blocked',
      'Blocked',
      'Too many response checks are unresolved.',
      'Rework the draft before polishing details.',
      gaps.map(gap => gap.label),
      'high'
    );
  }

  if (reply.readiness < 68) {
    return state(
      draftOnly && !reply.supportLike ? 'needs_polish' : 'risky',
      draftOnly && !reply.supportLike ? 'Needs polish' : 'Risky',
      topGap ? topGap.note : 'The response needs control before send.',
      topGap ? 'Fix the strongest gap first.' : 'Tighten the wording and action path.',
      topGap ? [topGap.label] : ['Readiness below 68%'],
      draftOnly && !reply.supportLike ? 'medium' : 'high'
    );
  }

  if (reply.readiness < 84 || gaps.length) {
    return state(
      'needs_polish',
      'Needs polish',
      topGap ? topGap.note : 'The response is usable but not fully clean.',
      topGap ? 'Apply the strongest polish move.' : 'Tighten the close before sending.',
      topGap ? [topGap.label] : ['Readiness below ready threshold'],
      'medium'
    );
  }

  return state(
    'ready',
    'Ready',
    draftOnly ? 'No blocking writing risk is active.' : 'No blocking reply risk is active.',
    draftOnly ? 'Keep the message direct.' : 'Send or copy when the final detail is confirmed.',
    [
      draftOnly ? 'Draft-only read' : 'Customer + draft read',
      signals.load >= 30 ? 'Signal load ' + signals.load + '%' : 'Low pressure',
      query.label
    ],
    'low'
  );
}

function mfDomainSuggestion(check) {
  const map = {
    booking_anchor: {
      label: 'Name the booking',
      note: 'Make the reply clearly about the appointment, reservation, or slot.',
      insert: 'I can check the booking and confirm the slot details.'
    },
    booking_time: {
      label: 'Add the booking time',
      note: 'Booking replies need a date, time, or clear update point.',
      insert: 'I will confirm the exact date and time before the next update.'
    },
    booking_confirmation: {
      label: 'Confirm the booking state',
      note: 'Say whether it is confirmed, changed, cancelled, moved, or still being checked.',
      insert: 'I will confirm whether the booking is locked in or needs to be moved.'
    },
    booking_reference: {
      label: 'Handle the reference',
      note: 'Include the booking reference or say where it will be confirmed.',
      insert: 'I will include the booking reference in the confirmation.'
    },
    booking_fallback: {
      label: 'Offer a fallback slot',
      note: 'Give the customer a path if the slot does not work.',
      insert: 'If that slot does not work, send me a better window and I can move it.'
    },
    booking_promise: {
      label: 'Control the promise',
      note: 'Avoid firm booking promises until the slot is verified.',
      insert: 'I will verify the booking first, then confirm the exact slot.'
    },
    money_anchor: {
      label: 'Name the money issue',
      note: 'Make the reply clearly about the refund, payment, invoice, charge, fee, or balance.',
      insert: 'I can check the refund or payment details and confirm the current status.'
    },
    money_stage: {
      label: 'Add amount or stage',
      note: 'Money replies need either the amount or the current processing stage.',
      insert: 'I will confirm whether the refund is pending, approved, processed, or still being checked.'
    },
    money_owner: {
      label: 'Add ownership',
      note: 'Say who is checking, correcting, refunding, or confirming the payment.',
      insert: 'I will check this with the payments team and confirm the next step.'
    },
    money_timing: {
      label: 'Add money timing',
      note: 'Give a clear update point or movement window for the refund/payment.',
      insert: 'I will send you an update today with the payment status and expected movement window.'
    },
    money_path: {
      label: 'Clarify payment path',
      note: 'Mention the card, bank account, invoice, receipt, statement, or balance route.',
      insert: 'If the refund is approved, it will return through the original payment method unless we confirm a different route.'
    },
    money_reference: {
      label: 'Handle money reference',
      note: 'Include the invoice, receipt, transaction, payment, refund, order, case, or ticket reference.',
      insert: 'I will include the invoice or transaction reference in the confirmation.'
    },
    money_promise: {
      label: 'Control money promise',
      note: 'Avoid firm refund/payment promises until verified.',
      insert: 'I will verify the payment status first, then confirm the exact movement window.'
    }
  };
  return map[check.id] || {
    label: check.label,
    note: check.fix || check.note,
    insert: ''
  };
}

function mfBuildSuggestions(customer, domain, query, signals, reply, gaps, domainChecks, sourceMode) {
  const suggestions = [];
  const highSignal = signals.rows[0];
  function push(id, label, note, insert) { suggestions.push({ id, label, note, insert }); }
  if (domainChecks && domainChecks.active) {
    domainChecks.failed.slice(0, 3).forEach(check => {
      const s = mfDomainSuggestion(check);
      push('domain_' + check.id, s.label, s.note, s.insert);
    });
  }
  if (sourceMode === 'draft_only') {
    if (reply.riskHits.length) {
      push('risk', 'Soften risk language', 'Replace defensive, vague, or over-promising wording with accountable language.', 'I can help with the next step and keep the update clear.');
    }
    if (!reply.plain) {
      push('plain', 'Tighten the writing', 'Split long sentences and translate internal language into customer-facing wording.', 'I will keep this short, clear, and focused on the next step.');
    }
    if (reply.supportLike && !reply.ownership) {
      push('own', 'Add ownership', 'Make the message feel held by a person, not a process.', 'I can check this now and confirm what happens next.');
    }
    if (reply.supportLike && !reply.nextStep) {
      push('action', 'Add an action path', 'Give the reader a concrete next move.', 'The next step is for me to confirm the detail and send you the update.');
    }
    if (!suggestions.length) {
      push('polish', 'Keep it clean', 'Writing is usable. Keep it direct and avoid adding process noise.', 'If anything changes, I will keep the next update clear.');
    }
    return suggestions.slice(0, 4);
  }
  if (highSignal && !reply.empathy) {
    push('ack', 'Acknowledge first', highSignal.coach, 'I understand this has been frustrating, and I am going to keep the next step clear.');
  }
  if (!reply.ownership) {
    push('own', 'Take ownership', 'Make the reply feel held by a person, not a process.', 'I can check this now and confirm what happens next.');
  }
  if ((query.id === 'status' || query.id === 'refund_payment' || query.id === 'delivery_replacement') && !reply.timeline) {
    push('time', 'Add timing', 'Give the customer a point in time to reduce uncertainty.', 'I will send you a clear update today with the exact next step.');
  }
  if (reply.coverage.score < 70 && reply.coverage.missing.length) {
    push('cover', 'Mirror the ask', 'Bring the unresolved point back into the reply.', 'I will make sure the update covers ' + reply.coverage.missing.slice(0, 3).join(', ') + '.');
  }
  if (reply.riskHits.length) {
    push('risk', 'Remove friction', 'Replace policy or defensive language with accountable language.', 'I will focus on getting you a clear answer rather than sending you through another loop.');
  }
  if (!suggestions.length) {
    push('close', 'Sharpen close', 'Reply is usable. End with certainty.', 'If anything changes before then, I will let you know straight away.');
  }
  return suggestions.slice(0, 4);
}

function mfBuildInsightBrief(customer, draft, domain, query, signals, reply, gaps, suggestions, responseState, sourceMode) {
  const highGap = gaps.find(g => g.severity === 'high');
  const firstGap = gaps[0];
  const topSignal = signals.rows[0];
  const primarySuggestion = suggestions[0];
  const hasCustomer = !!String(customer || '').trim();
  const draftOnly = sourceMode === 'draft_only';
  const signalConfidence = topSignal ? Math.min(100, 58 + topSignal.score) : 58;
  const evidenceConfidence = Math.round(
    (domain.confidence * 0.28) +
    ((query.confidence || 52) * 0.24) +
    (reply.coverage.score * 0.20) +
    (signalConfidence * 0.14) +
    ((reply.hasDraft ? reply.readiness : 35) * 0.14)
  );

  let priority = draftOnly ? 'Improve the draft' : 'Classify the customer ask';
  let why = hasCustomer ? 'No major pressure marker yet. Keep the reply concrete and easy to scan.' : 'Draft-only mode is active. The engine is reading the message itself for clarity, tone, and action quality.';
  let move = primarySuggestion ? primarySuggestion.label : 'Write a direct reply';
  let proof = primarySuggestion ? primarySuggestion.note : 'Drivers will expose matched terms and reply checks once there is input.';
  let sendState = responseState.label;

  if (!reply.hasDraft) {
    priority = 'Write or paste text';
    why = draftOnly ? 'Writing help starts as soon as there is a draft.' : 'The engine can read the customer ask, but cannot audit reply quality without the response.';
    move = draftOnly ? 'Start writing' : 'Create draft';
    proof = draftOnly ? 'Clarity, tone, risk, and action checks need draft text.' : 'Readiness, ownership, coverage, and risk checks need draft text.';
    sendState = responseState.label;
  } else if (highGap) {
    priority = highGap.label;
    why = highGap.note;
    move = primarySuggestion ? primarySuggestion.label : 'Fix high-priority issue';
    proof = topSignal
      ? `${topSignal.label} signal plus ${highGap.severity} gap is driving this advice.`
      : `${highGap.severity} gap is driving this advice.`;
    sendState = responseState.label;
  } else if (firstGap) {
    priority = firstGap.label;
    why = firstGap.note;
    move = primarySuggestion ? primarySuggestion.label : 'Polish before send';
    proof = draftOnly
      ? `Draft-only writing read · ${gaps.length} polish item${gaps.length === 1 ? '' : 's'}.`
      : `Coverage ${reply.coverage.score}% · ${gaps.length} polish item${gaps.length === 1 ? '' : 's'}.`;
    sendState = responseState.label;
  } else if (topSignal && signals.load >= 30) {
    priority = topSignal.label;
    why = topSignal.coach;
    move = primarySuggestion ? primarySuggestion.label : (draftOnly ? 'Improve the wording' : 'Match the customer pressure');
    proof = `Signal load ${signals.load}% with hits: ${topSignal.hits.slice(0, 3).join(', ')}.`;
    sendState = responseState.label;
  } else {
    priority = draftOnly ? 'Clean writing state' : 'Ready with a clean close';
    why = draftOnly ? 'No blocking writing risk is active. Keep the message direct and readable.' : 'No blocking gap is active. Keep the response direct and avoid adding process noise.';
    move = primarySuggestion ? primarySuggestion.label : (draftOnly ? 'Keep draft' : 'Send');
    proof = draftOnly ? 'Draft-only writing read · no high-priority advice causes.' : `Coverage ${reply.coverage.score}% · no high-priority advice causes.`;
    sendState = responseState.label;
  }

  return {
    priority,
    why,
    move,
    proof,
    confidence: Math.max(0, Math.min(100, evidenceConfidence)),
    sendState
  };
}

function mfBuildDriverModel(customer, draft, domain, query, signals, reply, gaps, suggestions, responseState, domainChecks, sourceMode) {
  const draftOnly = sourceMode === 'draft_only';
  const domainRows = (domain.candidates && domain.candidates.length
    ? domain.candidates
    : [{ pack: domain.pack, hits: domain.hits || [], score: domain.confidence }]
  ).slice(0, 4).map(item => ({
    label: item.pack.label,
    score: Math.max(0, Math.min(100, item.score || 0)),
    note: item.hits && item.hits.length ? 'Matched: ' + item.hits.slice(0, 5).join(', ') : item.pack.summary,
    tags: (item.hits || []).slice(0, 5)
  }));

  const intentSource = query.candidates && query.candidates.some(item => item.score > 0)
    ? query.candidates
    : [{ label: query.label, score: query.confidence, hits: query.hits, need: query.need }];
  const intentRows = intentSource.slice(0, 4).map(item => ({
    label: item.label,
    score: Math.max(0, Math.min(100, item.score > 0 && item.score <= 32 ? 58 + item.score : item.score || 0)),
    note: item.hits && item.hits.length ? 'Matched: ' + item.hits.join(', ') : item.need,
    tags: (item.hits || []).slice(0, 4)
  }));

  const signalRows = signals.rows.length ? signals.rows.slice(0, 5).map(signal => ({
    label: signal.label,
    score: Math.max(0, Math.min(100, signal.score)),
    note: `${signal.weight > 0 ? '+' : ''}${signal.weight} weight · ${signal.coach}`,
    tags: signal.hits.slice(0, 4)
  })) : [{
    label: 'Low pressure',
    score: 12,
    note: 'No strong emotional, urgency, trust, or vulnerability markers found.',
    tags: []
  }];

  const represented = reply.coverage.terms.filter(term => !reply.coverage.missing.includes(term)).slice(0, 6);
  const coverageRows = draftOnly ? [
    {
      label: 'Draft-only mode',
      score: reply.readiness,
      note: 'No customer source is required. The engine is scoring the message itself.',
      tags: represented
    },
    {
      label: 'Writing anchors',
      score: Math.min(100, represented.length * 12),
      note: represented.length ? represented.join(', ') : 'No strong topic anchors detected yet.',
      tags: represented
    }
  ] : [
    {
      label: 'Coverage score',
      score: reply.coverage.score,
      note: reply.hasDraft ? 'How much of the customer ask appears represented in the draft.' : 'No draft to compare against customer ask.',
      tags: represented
    },
    {
      label: 'Missing terms',
      score: Math.max(0, 100 - reply.coverage.score),
      note: reply.coverage.missing.length ? reply.coverage.missing.join(', ') : 'No major missing customer terms.',
      tags: reply.coverage.missing.slice(0, 6)
    }
  ];

  const adviceRows = gaps.length ? gaps.slice(0, 5).map(gap => ({
    label: gap.label,
    score: gap.severity === 'high' ? 92 : gap.severity === 'medium' ? 66 : 34,
    note: gap.note,
    tags: [gap.severity]
  })) : suggestions.slice(0, 3).map(s => ({
    label: s.label,
    score: 36,
    note: s.note,
    tags: ['suggestion']
  }));
  if (domainChecks && domainChecks.active) {
    domainChecks.checks.slice(0, 6).forEach(check => {
      adviceRows.push({
        label: check.label,
        score: check.passed ? 18 : check.severity === 'high' ? 88 : check.severity === 'medium' ? 62 : 28,
        note: check.note,
        tags: [domainChecks.label, check.passed ? 'pass' : 'gap']
      });
    });
  }

  return {
    state: {
      source: draftOnly ? 'Draft-only' : 'Customer + draft',
      response: `${responseState.label} · ${responseState.code}`,
      domain: `${domain.label} · ${domain.confidence}%`,
      intent: `${query.label} · ${query.confidence || 0}%`,
      send: reply.hasDraft ? `${responseState.label} · ${responseState.score}%` : `${responseState.label} · draft missing`
    },
    domainRows,
    intentRows,
    signalRows,
    coverageRows,
    adviceRows,
    metrics: {
      customerChars: (customer || '').length,
      draftChars: (draft || '').length,
      signalLoad: signals.load,
      gapCount: gaps.length,
      highGapCount: gaps.filter(g => g.severity === 'high').length,
      responseState: responseState.code,
      domainPack: domainChecks && domainChecks.active ? domainChecks.id : 'none',
      domainPackScore: domainChecks && domainChecks.active ? domainChecks.score : null
    }
  };
}

function mfCoachTrim(text, fallback, max) {
  const value = String(text || '').replace(/\s+/g, ' ').trim() || fallback || '';
  if (!max || value.length <= max) return value;
  return value.slice(0, Math.max(0, max - 1)).trim() + '…';
}

function mfBuildCoachModel(result) {
  const highGap = result.gaps.find(g => g.severity === 'high');
  const firstGap = result.gaps[0];
  const topSignal = result.signals.rows[0];
  const primarySuggestion = result.suggestions[0];
  const responseState = result.responseState || { code: 'blocked', label: 'Blocked', score: 0, reason: 'No response state available.', next: 'Run the engine again.' };
  const score = responseState.score;
  const label = responseState.label;
  const highSignalIds = ['frustration', 'urgency', 'vulnerability', 'distrust'];
  const hasHighSignal = topSignal && highSignalIds.includes(topSignal.id);
  const draftOnly = result.sourceMode === 'draft_only';

  let headline = draftOnly ? 'Guide the draft directly.' : 'Keep the next move clear.';
  if (!result.reply.hasDraft) {
    headline = draftOnly ? 'Write text before coaching.' : 'Write the draft before coaching.';
  } else if (responseState.code === 'risky') {
    headline = 'Risky: ' + mfCoachTrim(responseState.reason, 'Fix the risk before send.', 48);
  } else if (responseState.code === 'blocked') {
    headline = 'Blocked: ' + mfCoachTrim(responseState.reason, 'Rework before send.', 48);
  } else if (highGap) {
    headline = 'Fix: ' + highGap.label + '.';
  } else if (firstGap) {
    headline = 'Polish: ' + firstGap.label + '.';
  } else if (hasHighSignal) {
    headline = 'Lead with the pressure cue.';
  } else if (result.reply.readiness >= 84) {
    headline = 'Ready: keep it direct.';
  }

  const gapRow = firstGap
    ? { label: firstGap.label, note: firstGap.note, insert: primarySuggestion && primarySuggestion.insert }
    : { label: 'No blocking gap', note: 'The current draft has no high-priority coaching block.' };
  const practiceLabel = primarySuggestion ? primarySuggestion.label : 'Sharpen close';
  const practiceNote = primarySuggestion ? primarySuggestion.note : 'End with certainty and avoid adding process noise.';
  const practiceInsert = primarySuggestion ? primarySuggestion.insert : '';

  const sensitiveRows = result.signals.rows
    .filter(signal => highSignalIds.includes(signal.id))
    .slice(0, 3)
    .map(signal => ({
      label: signal.label,
      note: signal.coach + (signal.hits.length ? ' Hits: ' + signal.hits.slice(0, 3).join(', ') : '')
    }));

  if (!sensitiveRows.length) {
    sensitiveRows.push({
      label: 'No elevated cue',
      note: result.signals.rows.length ? 'Signal is present, but no sensitive coaching cue is elevated.' : 'No vulnerability, urgency, frustration, or trust-risk marker found.'
    });
  }

  return {
    score,
    label,
    headline,
    why: mfCoachTrim(responseState.reason || result.brief.why || result.brief.proof, 'Guidance is waiting for a useful read.', 160),
    confidence: result.brief.confidence,
    tryLabel: practiceLabel,
    tryText: mfCoachTrim(practiceNote, 'Practice move will appear once there is enough signal.', 150),
    tryInsert: practiceInsert,
    stack: [
      {
        zone: draftOnly ? 'Text' : 'Read',
        label: result.query.label,
        note: topSignal ? topSignal.coach : result.query.need,
        action: 'View',
        mode: 'drivers'
      },
      {
        zone: responseState.code === 'ready' ? 'State' : 'Gap',
        label: gapRow.label,
        note: responseState.code === 'ready' ? responseState.next : gapRow.note,
        action: gapRow.insert ? 'Fix' : 'View',
        insert: gapRow.insert,
        mode: gapRow.insert ? '' : 'drivers'
      },
      {
        zone: 'Practice',
        label: practiceLabel,
        note: practiceNote,
        action: practiceInsert ? 'Try' : 'View',
        insert: practiceInsert
      }
    ],
    sensitiveRows,
    evidenceRows: [
      { label: 'Source', note: draftOnly ? 'Draft-only writing mode' : 'Customer message plus draft' },
      { label: 'Domain', note: result.domain.label + ' · ' + result.domain.confidence + '% confidence' },
      { label: 'Intent', note: result.query.label + ' · ' + result.query.need },
      { label: 'Coverage', note: draftOnly ? 'Not required without customer source.' : (result.reply.hasDraft ? result.reply.coverage.score + '% customer ask coverage' : 'No draft coverage available yet.') },
      { label: 'Response state', note: responseState.label + ' · ' + responseState.code + ' · ' + responseState.score + '%' }
    ]
  };
}

function MF_runPingUniversalEngine(customer, draft, mode) {
  const safeMode = ['auto','general','claims','retail'].includes(mode) ? mode : 'auto';
  const hasCustomer = !!String(customer || '').trim();
  const hasDraft = !!String(draft || '').trim();
  const sourceMode = hasCustomer ? 'customer_context' : hasDraft ? 'draft_only' : 'blank';
  const analysisText = hasCustomer ? customer : draft;
  const domain = mfDetectDomain(customer, draft, safeMode);
  const query = mfDetectQueryType(analysisText || '', domain);
  const signals = mfDetectSignals(analysisText || '', sourceMode);
  const reply = mfDetectReply(customer || '', draft || '', domain, query, signals, sourceMode);
  const domainChecks = mfEvaluateDomainPack(domain, query, customer || '', draft || '', reply, sourceMode);
  const gaps = mfBuildGaps(reply, query, signals, domainChecks, sourceMode);
  const responseState = mfBuildResponseState(reply, gaps, signals, query, sourceMode);
  const suggestions = mfBuildSuggestions(customer || '', domain, query, signals, reply, gaps, domainChecks, sourceMode);
  const brief = mfBuildInsightBrief(customer || '', draft || '', domain, query, signals, reply, gaps, suggestions, responseState, sourceMode);
  const drivers = mfBuildDriverModel(customer || '', draft || '', domain, query, signals, reply, gaps, suggestions, responseState, domainChecks, sourceMode);
  return { mode: safeMode, sourceMode, hasCustomer, hasDraft, domain, query, signals, reply, responseState, domainChecks, gaps, suggestions, brief, drivers };
}
window.MF_runPingUniversalEngine = MF_runPingUniversalEngine;
