/* Ping · app
 * Split out of apps/ping.html. These files are classic scripts, not modules:
 * top-level bindings are shared across them, so LOAD ORDER IS THE CONTRACT.
 * The order is fixed in ping.html and must not be rearranged.
 */

/* ========== PERSISTENCE ========== */
const KEY = 'mf-ping-state';
const STATE_VERSION = 3;
const DEFAULT_LAYOUT_STATE = Object.freeze({
  insights: 'open',
  phone: 'open',
  rightPanel: 'assist',
  workspaceMode: 'assist'
});
const VALID_PANEL_STATES = new Set(['open', 'collapsed']);
const VALID_RIGHT_PANELS = new Set(['assist', 'phone', 'notes']);

function setAssistDiagnosticsOpen(open) {
  const box = document.getElementById('mfAssistDiagnostics');
  const toggle = document.getElementById('mfAssistDiagnosticsToggle');
  if (!box) return;
  const nextOpen = Boolean(open);
  /* build the report on first open · boot stays free of it */
  if (nextOpen) {
    window.__tgcLensWantDiagnostics = true;
    if (!window.MirrorFlowAssistEngine && window.__tgcLoadLensEngine) window.__tgcLoadLensEngine();
  }
  if (nextOpen && !mfAssistLastTestReport) { try { renderPingAssistDiagnostics(); } catch (e) {} }
  box.dataset.open = nextOpen ? 'true' : 'false';
  if (toggle) toggle.setAttribute('aria-expanded', String(nextOpen));
}

function normalizePanelState(value, fallback) {
  return VALID_PANEL_STATES.has(value) ? value : fallback;
}

function normalizeRightPanel(value) {
  return VALID_RIGHT_PANELS.has(value) ? value : DEFAULT_LAYOUT_STATE.rightPanel;
}

function railWidthValue(value, min, max) {
  const n = parseInt(String(value || '').replace('px', ''), 10);
  if (!Number.isFinite(n)) return '';
  return Math.max(min, Math.min(max, n)) + 'px';
}
function getRailWidth(prop) {
  return shell.style.getPropertyValue(prop).trim();
}
function restoreRailWidth(prop, value, min, max) {
  const px = railWidthValue(value, min, max);
  if (px) shell.style.setProperty(prop, px);
  else shell.style.removeProperty(prop);
}

function normalizeCursorState(value) {
  const next = Object.assign({}, cursor);
  Object.keys(VARIANTS).forEach(theme => {
    const raw = value && Number.isFinite(value[theme]) ? value[theme] : next[theme];
    next[theme] = Math.max(0, Math.min(VARIANTS[theme].length - 1, Math.floor(raw || 0)));
  });
  return next;
}

function normalizeSavedState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw && typeof raw === 'object' ? raw : {};
  const theme = VARIANTS[source.theme] ? source.theme : html.dataset.theme;
  return Object.assign({}, source, {
    version: STATE_VERSION,
    theme,
    cursor: normalizeCursorState(source.cursor),
    insights: normalizePanelState(source.insights, DEFAULT_LAYOUT_STATE.insights),
    phone: normalizePanelState(source.phone, DEFAULT_LAYOUT_STATE.phone),
    rightPanel: normalizeRightPanel(source.rightPanel),
    workspaceMode: normalizeWorkspaceMode(source.workspaceMode),
    phoneSettings: normalizePhoneSettings(source.phoneSettings),
    insightsWidth: railWidthValue(source.insightsWidth, 180, 520),
    phoneWidth: railWidthValue(source.phoneWidth, 220, 560),
    sideNotes: Array.isArray(source.sideNotes) ? normalizeSideNotes(source.sideNotes) : sideNotes,
    assistDiagnosticsOpen: source.assistDiagnosticsOpen === true,
    assistIgnore: Array.isArray(source.assistIgnore) ? source.assistIgnore : [],
    assistRuleProfile: source.assistRuleProfile && typeof source.assistRuleProfile === 'object' ? source.assistRuleProfile : null,
    assistDisabledRules: Array.isArray(source.assistDisabledRules) ? source.assistDisabledRules : []
  });
}

function resetPingLayout() {
  shell.dataset.insights = DEFAULT_LAYOUT_STATE.insights;
  shell.dataset.phone = DEFAULT_LAYOUT_STATE.phone;
  shell.dataset.rightPanel = DEFAULT_LAYOUT_STATE.rightPanel;
  shell.dataset.workspaceMode = DEFAULT_LAYOUT_STATE.workspaceMode;
  shell.style.removeProperty('--mf-rail-insights-w');
  shell.style.removeProperty('--mf-rail-phone-w');
  syncModeControls();
  syncRailControls();
  renderPingInsights();
  renderPingAssist();
  schedulePhoneScale();
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      version: STATE_VERSION,
      theme: html.dataset.theme,
      cursor,
      insights: shell.dataset.insights,
      insightsWidth: getRailWidth('--mf-rail-insights-w'),
      phone: shell.dataset.phone,
      phoneWidth: getRailWidth('--mf-rail-phone-w'),
      phoneSettings,
      rightPanel: shell.dataset.rightPanel,
      workspaceMode: shell.dataset.workspaceMode,
      sideNotes,
      assistDiagnosticsOpen: document.getElementById('mfAssistDiagnostics')?.dataset.open === 'true',
      draft: editorEl.innerHTML,
      customer: customerEl.value,
      chatHTML: getPersistablePhoneHTML(),
      assistIgnore: Array.from(mfAssistIgnore),
      assistRuleProfile: typeof window.MirrorFlowAssistEngine !== 'undefined'
        ? window.MirrorFlowAssistEngine.exportProfile() : null,
      assistDisabledRules: typeof window.MirrorFlowAssistEngine !== 'undefined'
        ? window.MirrorFlowAssistEngine.getDisabledRules() : []
    }));
  } catch (_) {}
}
function load() {
  try {
    const s = normalizeSavedState(JSON.parse(localStorage.getItem(KEY) || 'null'));
    if (!s) return null;
    if (s.theme && VARIANTS[s.theme]) html.dataset.theme = s.theme;
    if (s.cursor) Object.assign(cursor, s.cursor);
    shell.dataset.insights = s.insights;
    restoreRailWidth('--mf-rail-insights-w', s.insightsWidth, 180, 520);
    shell.dataset.phone = s.phone;
    restoreRailWidth('--mf-rail-phone-w', s.phoneWidth, 220, 560);
    applyPhoneSettings(s.phoneSettings);
    shell.dataset.rightPanel = s.rightPanel;
    if (Array.isArray(s.assistIgnore)) mfAssistIgnore = new Set(s.assistIgnore);
    if (typeof window.MirrorFlowAssistEngine !== 'undefined') {
      if (s.assistRuleProfile && typeof window.MirrorFlowAssistEngine.importProfile === 'function') {
        const v = window.MirrorFlowAssistEngine.importProfile(s.assistRuleProfile);
        if (!v.valid && Array.isArray(s.assistDisabledRules)) {
          s.assistDisabledRules.forEach(id => window.MirrorFlowAssistEngine.disableRule(id));
        }
      } else if (Array.isArray(s.assistDisabledRules)) {
        s.assistDisabledRules.forEach(id => window.MirrorFlowAssistEngine.disableRule(id));
      }
    }
    setAssistDiagnosticsOpen(s.assistDiagnosticsOpen);
    shell.dataset.workspaceMode = normalizeWorkspaceMode(s.workspaceMode);
    if (Array.isArray(s.sideNotes)) sideNotes = s.sideNotes;
    if (s.draft) editorEl.innerHTML = s.draft;
    if (s.customer) customerEl.value = s.customer;
    if (s.chatHTML) phoneBody.innerHTML = s.chatHTML;
    return s;
  } catch (_) {
    try { localStorage.removeItem(KEY); } catch (_) {}
    return null;
  }
}

/* ========== AUTO-SAVE STATE (surfaced via More menu) ========== */
let lastEdit = Date.now();
let savedAgo = 'saved just now';
function tickMeta() {
  const s = Math.floor((Date.now() - lastEdit) / 1000);
  if (s < 2)       savedAgo = 'saved just now';
  else if (s < 60) savedAgo = `auto-saved ${s}s ago`;
  else             savedAgo = `auto-saved ${Math.floor(s/60)}m ago`;
  // if More popover is open, refresh its first row in-place
  const tag = document.getElementById('moreSavedTag');
  if (tag) tag.textContent = savedAgo;
}
setInterval(tickMeta, 1000);

/* ========== TOAST ========== */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'mf-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 320);
  }, 2200);
}

/* ========== INPUT WIRING ========== */
let mfInsightsDebounce = 0;
let mfSaveDebounce = 0;

function renderPingInsightsDebounced(delay = 180) {
  clearTimeout(mfInsightsDebounce);
  mfInsightsDebounce = setTimeout(renderPingInsights, delay);
}

function saveDebounced(delay = 220) {
  clearTimeout(mfSaveDebounce);
  mfSaveDebounce = setTimeout(save, delay);
}

function refreshAll(options = {}) {
  const immediate = options && options.immediate === true;
  /* the engine is not in the boot path · the first real prose pulls it in, and its
     loader calls back through here once it lands (see ping.html) */
  if (!window.MirrorFlowAssistEngine && window.__tgcLoadLensEngine) {
    try { if (/[A-Za-z]{2,}/.test(getDraftPlain() || '')) window.__tgcLoadLensEngine(); } catch (e) {}
  }
  syncEditorStatus();
  updatePhoneDraft();
  updateCustomerDraft();
  updatePhoneInteractionCount();
  updateCounter();
  if (immediate) {
    clearTimeout(mfInsightsDebounce);
    renderPingInsights();
    renderPingAssist();
  } else {
    renderPingInsightsDebounced();
    renderPingAssistDebounced();
  }
}
/* Digest telemetry · counts only, reset on every send. Nothing here can hold
   anything a person typed — see docs/INSIGHT.md for why that is load-bearing. */
let tgcDraftStartedAt = null, tgcDraftRevisions = 0;

editorEl.addEventListener('input', () => {
  lastEdit = Date.now();
  if (tgcDraftStartedAt === null) tgcDraftStartedAt = Date.now();
  tgcDraftRevisions++;
  captureEditorSelection();
  if (!mfAssistApplyingFix && !mfAssistRestoringUndo) mfAssistSetUndoState(null);
  if (!getDraftPlain().trim()) mfAssistClearDraftState();
  refreshAll();
  saveDebounced();
});
customerEl.addEventListener('input', () => {
  updateCustomerDraft();
  renderPingInsightsDebounced();
  renderPingAssistDebounced();
  saveDebounced();
});

/* persist theme/variant changes too */
const _applyTheme = applyTheme;
applyTheme = function() { _applyTheme(); save(); };

/* persist rail state changes */
const observer = new MutationObserver(() => {
  syncRailControls();
  save();
});
observer.observe(shell, { attributes: true, attributeFilter: ['data-insights', 'data-phone', 'data-right-panel', 'data-workspace-mode'] });

/* ========== FOCUS MODE — ⌘. ========== */
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === '.') {
    e.preventDefault();
    shell.dataset.focus = shell.dataset.focus === 'editor' ? '' : 'editor';
    toast(shell.dataset.focus === 'editor' ? `Focus mode — ${MOD_KEY}+. to exit` : 'Focus off');
  }
});

/* ========== SEND — cmd+enter + click ========== */
function doSend() {
  const btn = document.querySelector('.mf-tb-btn.send');
  btn.style.transform = 'scale(0.96)';
  setTimeout(() => btn.style.transform = '', 140);
  toast('Sent — draft cleared');
  editorEl.innerHTML = '<p>Hi,</p><p><br></p>';
  customerEl.value = '';
  draftOut.remove(); draftIn.remove();
  mfAssistIgnore.clear();
  mfLastAssist = null;
  mfActiveIssueId = null;
  mfAssistSetUndoState(null);
  lastEdit = Date.now();
  refreshAll();
  save();
}
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    doSend();
  }
});
document.querySelector('.mf-tb-btn.send').addEventListener('click', doSend);

/* =========================================================
   v6.2 — snippets · thread switcher · drill-down · phone resize
   ========================================================= */

/* platform-aware modifier key for shortcut hints */
const MOD_KEY = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? 'Cmd' : 'Ctrl';

/* ---------- SNIPPET LIBRARY (compact, Lite-inspired) ---------- */
const SNIPPETS = {
  replies: {
    head: 'Replies — full templates',
    sections: [
      { title: 'Apology + fix', items: [
        'Hi {name} — that was on us. {fix} is locked in. Sorry for the runaround.',
        'Hi {name}, sorry for the hassle. We\'ve fixed {issue} and you\'re sorted.'
      ]},
      { title: 'Status update', items: [
        'Hi {name} — this is in motion. Riley\'s on it. I\'ll update you by EOD.',
        'Hi {name}, quick update: {progress}. Next step: {next}.'
      ]},
      { title: 'Confirmation', items: [
        'Hi {name} — confirmed. {detail}. See you then.',
        'Hi {name}, all set: {detail}.'
      ]},
      { title: 'Closing', items: [
        'Anything else? Happy to help.',
        'That should do it — give a shout if anything shifts.'
      ]}
    ]
  },
  phrases: {
    head: 'Phrases — by intent',
    sections: [
      { title: 'Empathy',     items: ['I get the frustration.', 'That\'s not the experience we want.', 'Totally fair.', 'I hear you.'] },
      { title: 'Good news',   items: ['Good news — ', 'Sorted.', 'Locked in.', 'You\'re all set.'] },
      { title: 'Sorry',       items: ['That was on us.', 'Sorry for the hassle.', 'We dropped the ball — sorry.', 'My apologies.'] },
      { title: 'Reassurance', items: ['We\'ve got it from here.', 'You\'re sorted.', 'I\'ll see this through.', 'Nothing to worry about.'] },
      { title: 'Closing',     items: ['Anything else?', 'Talk soon.', 'Cheers,', 'Hope this helps.'] }
    ]
  },
};

/* ---------- SAMPLE CHAT (placeholder, cleared on New Session) ---------- */

/* ---------- POPOVER ENGINE ---------- */
const popoverEl = document.getElementById('popover');
let popoverOpen = false;

function closePopover() {
  popoverEl.classList.remove('is-open');
  popoverEl.setAttribute('aria-hidden', 'true');
  popoverOpen = false;
}

function openPopoverAt(anchor, html, alignRight = false) {
  popoverEl.innerHTML = html;
  popoverEl.classList.add('is-open');
  popoverEl.setAttribute('aria-hidden', 'false');
  popoverOpen = true;
  // position
  const r = anchor.getBoundingClientRect();
  const pw = popoverEl.offsetWidth;
  const ph = popoverEl.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = alignRight ? r.right - pw : r.left;
  let top  = r.bottom + 6;
  if (left + pw > vw - 8) left = vw - pw - 8;
  if (left < 8) left = 8;
  if (top + ph > vh - 8) top = r.top - ph - 6;
  popoverEl.style.left = left + 'px';
  popoverEl.style.top  = top  + 'px';
}

document.addEventListener('click', (e) => {
  if (popoverOpen && !popoverEl.contains(e.target) &&
      !e.target.closest('[data-snippet]') &&
      !e.target.closest('#newSessionBtn')) closePopover();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && popoverOpen) closePopover();
});

/* ---------- SNIPPET INSERTION ---------- */
function placeEditorCursorAfter(node) {
  if (!node) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  editorSavedRange = range.cloneRange();
  editorSavedSelectionText = '';
}

function placeEditorCursorAtEnd() {
  editorEl.focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(editorEl);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  editorSavedRange = range.cloneRange();
  editorSavedSelectionText = '';
}

function plainTextToFragment(value) {
  const frag = document.createDocumentFragment();
  String(value || '').split('\n').forEach((line, index) => {
    if (index) frag.appendChild(document.createElement('br'));
    frag.appendChild(document.createTextNode(line));
  });
  return frag;
}

function insertAtCursor(text) {
  const value = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!value) return false;

  const sel = window.getSelection();
  let range = null;

  if (sel && sel.rangeCount && editorOwnsNode(sel.anchorNode) && editorOwnsNode(sel.focusNode)) {
    range = sel.getRangeAt(0);
  } else if (editorRangeIsUsable(editorSavedRange)) {
    editorEl.focus({ preventScroll: true });
    sel.removeAllRanges();
    sel.addRange(editorSavedRange);
    range = editorSavedRange;
  } else {
    editorEl.focus({ preventScroll: true });
  }

  if (!getDraftPlain()) {
    editorEl.innerHTML = plainToEditorHtml(value);
    placeEditorCursorAtEnd();
  } else if (range && editorRangeIsUsable(range)) {
    const frag = plainTextToFragment(value);
    const lastNode = frag.lastChild;
    range.deleteContents();
    range.insertNode(frag);
    placeEditorCursorAfter(lastNode);
  } else {
    editorEl.insertAdjacentHTML('beforeend', plainToEditorHtml(value));
    placeEditorCursorAtEnd();
  }

  lastEdit = Date.now();
  mfAssistSetUndoState(null);
  refreshAll();
  save();
  return true;
}

/* tone shifts removed with the Tone tab */

/* ---------- SNIPPET POPOVER RENDER ---------- */
function snippetHTML(kind) {
  const lib = SNIPPETS[kind];
  let html = `<div class="mf-pop-head">${lib.head}</div>`;
  lib.sections.forEach(sec => {
    html += `<div class="mf-pop-section"><div class="mf-pop-section-title">${sec.title}</div><div class="mf-chipwrap">`;
    sec.items.forEach(item => {
      if (typeof item === 'string') {
        const isTemplate = kind === 'replies';
        html += `<button class="mf-chip${isTemplate ? ' is-template' : ''}" data-text="${escapeAttr(item)}">${escapeHTML(item)}</button>`;
      } else {
        html += `<button class="mf-chip" data-tone="${item.act}">${item.label}</button>`;
      }
    });
    html += `</div></div>`;
  });
  return html;
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) { return escapeHTML(s); }

document.querySelectorAll('[data-snippet]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const kind = btn.dataset.snippet;
    if (popoverOpen && popoverEl.dataset.kind === kind) { closePopover(); return; }
    openPopoverAt(btn, snippetHTML(kind));
    popoverEl.dataset.kind = kind;
  });
});

popoverEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.mf-chip');
  if (!chip) return;
  if (chip.dataset.text) {
    // strip {name} placeholder since no thread/customer concept anymore
    insertAtCursor(chip.dataset.text.replace(/\{name\}/g, '').replace(/\s{2,}/g, ' ').replace(/^\s*[—–-]\s*/, ''));
    closePopover();
    return;
  }
});

/* ---------- PHONE BODY RENDER (sample placeholder, no threads) ---------- */
function appendBubble(m) {
  clearPhoneIdle();
  let el;
  if (m.who === 'time') {
    el = document.createElement('div');
    el.className = 'bubble-time';
    el.textContent = m.t;
  } else if (m.who === 'typing') {
    el = document.createElement('div');
    el.className = 'bubble typing';
    el.dataset.role = 'cust';
    el.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  } else {
    el = document.createElement('div');
    el.className = 'bubble';
    el.dataset.role = (m.who === 'out') ? 'agent' : 'cust';
    el.textContent = m.t;
  }
  phoneBody.appendChild(el);
  updatePhoneInteractionCount();
  return el;
}


/* (insight cards + tone detail removed — placeholder until rebuild) */

/* =========================================================
   v6.3 — toolbar exec, per-thread drafts, send-to-thread, inject
   ========================================================= */

/* ---------- TOOLBAR EXEC ---------- */
function exec(cmd, arg) {
  editorEl.focus();
  try { document.execCommand(cmd, false, arg || null); } catch (_) {}
  lastEdit = Date.now();
  mfAssistSetUndoState(null);
  refreshAll();
  syncToolbarState();
  saveDebounced();
}

function syncToolbarState() {
  let currentBlock = '';
  try { currentBlock = String(document.queryCommandValue('formatBlock') || '').replace(/[<>]/g, '').toLowerCase(); } catch (_) {}
  document.querySelectorAll('.mf-tb-btn[data-cmd]').forEach(btn => {
    const cmd = btn.dataset.cmd;
    if (['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'].includes(cmd)) {
      try { btn.classList.toggle('is-active', document.queryCommandState(cmd)); } catch (_) {}
    } else if (cmd === 'formatBlock') {
      const expected = String(btn.dataset.arg || '').toLowerCase();
      btn.classList.toggle('is-active', Boolean(expected && currentBlock === expected));
    }
  });
}

document.querySelectorAll('.mf-tb-btn[data-cmd]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const cmd = btn.dataset.cmd;
    let arg  = btn.dataset.arg || null;
    if (cmd === 'createLink') {
      const url = prompt('Link URL:', 'https://');
      if (!url) return;
      arg = url;
    }
    exec(cmd, arg);
  });
});

function insertSoftBreak() {
  editorEl.focus();
  try {
    document.execCommand('insertLineBreak');
  } catch (_) {
    try { document.execCommand('insertHTML', false, '<br>'); } catch (_) {}
  }
  lastEdit = Date.now();
  mfAssistSetUndoState(null);
  refreshAll();
  syncToolbarState();
  saveDebounced();
}

editorEl.addEventListener('keyup', syncToolbarState);
editorEl.addEventListener('mouseup', syncToolbarState);

/* keyboard: Cmd+B / I / U / K */
editorEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault();
    insertSoftBreak();
    return;
  }
  if (!(e.metaKey || e.ctrlKey)) return;
  const k = e.key.toLowerCase();
  if (k === 'b') { e.preventDefault(); exec('bold'); }
  else if (k === 'i') { e.preventDefault(); exec('italic'); }
  else if (k === 'u') { e.preventDefault(); exec('underline'); }
  else if (k === 'k') {
    e.preventDefault();
    const url = prompt('Link URL:', 'https://');
    if (url) exec('createLink', url);
  }
});

/* ---------- TOOLBAR ACTIONS (clean / clear / copy / paste / bench / more) ---------- */
document.querySelectorAll('.mf-tb-btn[data-action]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const a = btn.dataset.action;
    if (a === 'clean')  cleanFormatting();
    else if (a === 'clear') clearDraft();
    else if (a === 'copy')  copyDraft();
    else if (a === 'paste') pasteDraft();
    else if (a === 'softbreak') insertSoftBreak();
    else if (a === 'bench') tgcSendToBench();
    else if (a === 'more')  openMore(btn);
  });
});

function cleanFormatting() {
  editorEl.focus();
  const sel = window.getSelection();
  if (sel.rangeCount && !sel.isCollapsed) {
    document.execCommand('removeFormat');
  } else {
    // strip whole document
    const text = editorEl.innerText;
    editorEl.innerHTML = text.split(/\n+/).map(p => `<p>${escapeHTML(p)}</p>`).join('');
  }
  lastEdit = Date.now();
  mfAssistSetUndoState(null);
  refreshAll(); save();
  toast('Formatting cleaned');
}

function clearDraft() {
  if (!confirm('Clear the current draft?')) return;
  editorEl.innerHTML = '<p><br></p>';
  lastEdit = Date.now();
  mfAssistClearDraftState();
  refreshAll(); save();
  toast('Draft cleared');
}

async function copyDraft() {
  const text = getDraftPlain();
  if (!text) { toast('Nothing to copy'); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch {
    toast('Copy failed — clipboard blocked');
  }
}

async function pasteDraft() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) { toast('Clipboard empty'); return; }
    insertAtCursor(text);
    mfAssistSetUndoState(null);
    toast('Pasted');
  } catch {
    toast('Paste failed — try Cmd+V');
  }
}

function openMore(anchor) {
  if (popoverOpen && popoverEl.dataset.kind === 'more') { closePopover(); return; }
  const html = `
    <div class="mf-pop-head">More actions</div>
    <div class="mf-more-status">
      <span class="mf-more-dot"></span>
      <span>Agent draft · <span id="moreSavedTag">${savedAgo}</span></span>
    </div>
    <div class="mf-chipwrap" style="flex-direction:column;">
      <button class="mf-chip" data-more="reset">Reset draft to blank</button>
      <button class="mf-chip" data-more="layout">Reset panels and layout</button>
      <button class="mf-chip" data-more="export">Copy as plain text</button>
      <button class="mf-chip" data-more="coach-export">Export Coach packet</button>
      <button class="mf-chip" data-more="linebreak">Insert line break</button>
      <button class="mf-chip" data-more="help">Keyboard shortcuts</button>
    </div>`;
  openPopoverAt(anchor, html);
  popoverEl.dataset.kind = 'more';
}

popoverEl.addEventListener('click', (e) => {
  const m = e.target.closest('[data-more]');
  if (!m) return;
  const a = m.dataset.more;
  closePopover();
  if (a === 'reset') {
    editorEl.innerHTML = '<p><br></p>';
    lastEdit = Date.now(); mfAssistClearDraftState(); refreshAll(); save();
    toast('Draft reset');
  } else if (a === 'layout') {
    resetPingLayout();
    save();
    toast('Panels reset');
  } else if (a === 'export') {
    copyDraft();
  } else if (a === 'coach-export') {
    mfExportTheGuideExchangePacket();
  } else if (a === 'linebreak') {
    insertSoftBreak();
  } else if (a === 'help') {
    showHelp();
  }
});

function showHelp() {
  alert(
    'Keyboard shortcuts\n' +
    `— ${MOD_KEY}+Enter   Send draft\n` +
    `— ${MOD_KEY}+B/I/U   Bold / Italic / Underline\n` +
    `— ${MOD_KEY}+K       Insert link\n` +
    `— ${MOD_KEY}+.       Toggle focus mode\n` +
    '— Shift+Enter (in draft)          New line\n' +
    '— Enter (in customer box)         Send as customer message\n' +
    '— Shift+Enter (in customer box)   New line\n' +
    '— Esc                             Close popover'
  );
}

/* ---------- SEND — appends agent bubble, no auto-reply ---------- */

/* ═══════════ THE DIGEST · what Ping tells the house about a send ═══════════
   Measurements only. No message text, no names, no matched strings — category
   counts and scores. Contract and rationale: docs/INSIGHT.md. */
function tgcBuildSendDigest(text) {
  const eng = window.MirrorFlowAssistEngine;
  if (!eng || typeof eng.analyzeText !== 'function') return null;
  let a = null;
  try { a = eng.analyzeText(text, { surface: 'ping_send' }); } catch (e) { return null; }
  if (!a) return null;

  const words = (text.match(/[A-Za-z0-9'’-]+/g) || []).length;
  const sentences = (text.split(/[.!?]+(?:\s|$)/).filter(x => x.trim()).length) || 1;
  const lower = text.toLowerCase();
  const count = re => (lower.match(re) || []).length;

  /* rule hits collapsed to category counts — the ids and matched text stay here */
  const grammarHits = {};
  let toneHits = 0;
  (a.issues || []).forEach(i => {
    if (i.category === 'tone') { toneHits++; return; }
    const k = i.subtype || i.category || 'other';
    grammarHits[k] = (grammarHits[k] || 0) + 1;
  });

  const d = {
    to: 'insight', surface: 'reply',
    words, sentences,
    grammarHits, toneHits,
    apologies: count(/\b(sorry|apologise|apologize)\b/g),
    hedges:    count(/\b(just|maybe|perhaps|hopefully|kind of|sort of|i think)\b/g),
    robotic:   count(/\b(as per|process|procedure|escalate internally|backend)\b/g),
    revisions: tgcDraftRevisions
  };
  /* only report what the engine actually gave us · a guessed zero is a lie */
  const grade = a.clarity && a.clarity.grade;
  if (typeof grade === 'number') d.readingGrade = grade;
  const score = a.quality && (a.quality.score ?? a.quality.value);
  if (typeof score === 'number') d.writingScore = score;
  const clarityScore = a.clarity && a.clarity.score;
  if (typeof clarityScore === 'number') d.clarityScore = clarityScore;
  if (a.tone && a.tone.primary) d.tonePrimary = a.tone.primary;
  if (tgcDraftStartedAt) d.secondsToSend = Math.round((Date.now() - tgcDraftStartedAt) / 1000);
  return d;
}

/* A draft worth a second look goes to the Bench as a handoff. It queues in
   the shell's inbox first - nothing reaches an app without a person saying
   yes - which is why this is a separate gesture from Send. */
function tgcSendToBench() {
  const text = getDraftPlain();
  if (!text) { toast('Nothing to send'); return; }
  if (typeof window.tgcSeal !== 'function') { toast('The Bench is reachable from inside the house'); return; }
  const who = (typeof customerEl !== 'undefined' && customerEl && customerEl.value.trim()) || '';
  const subject = (who ? who + ' · ' : '') + text.split('\n')[0].slice(0, 60);
  window.tgcSeal('handoff', { to: 'bench', subject, body: text, facet: 'message', privacy: 'full' });
  toast('Sent to the Bench · waiting in the inbox');
}

function tgcSealSendDigest(text) {
  try {
    if (typeof window.tgcSeal !== 'function') return;   // running outside the shell
    const d = tgcBuildSendDigest(text);
    if (d) window.tgcSeal('digest', d);
  } catch (e) { /* a digest must never break a send */ }
}

function doSendV2() {
  const text = getDraftPlain();
  if (!text) { toast('Nothing to send'); return; }
  const btn = document.querySelector('.mf-tb-btn.send');
  btn.style.transform = 'scale(0.96)';
  setTimeout(() => btn.style.transform = '', 140);
  appendBubble({ who: 'out', t: text });
  editorEl.innerHTML = '<p><br></p>';
  customerEl.value = '';
  draftOut.remove(); draftIn.remove();
  mfAssistSetUndoState(null);
  lastEdit = Date.now();
  refreshAll();
  phoneBody.scrollTop = phoneBody.scrollHeight;
  toast('Sent');
  save();
  tgcSealSendDigest(text);
  tgcDraftStartedAt = null; tgcDraftRevisions = 0;
}

/* re-bind Send button and Cmd+Enter to V2 */
const sendBtn = document.querySelector('.mf-tb-btn.send');
sendBtn.replaceWith(sendBtn.cloneNode(true));
const newSendBtn = document.querySelector('.mf-tb-btn.send');
newSendBtn.addEventListener('click', doSendV2);

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    e.stopImmediatePropagation();
    doSendV2();
  }
}, true);

/* ---------- CUSTOMER INJECT — appends customer bubble ---------- */
function injectCustomer() {
  const text = customerEl.value.trim();
  if (!text) { toast('Type something first'); return; }
  appendBubble({ who: 'in', t: text });
  customerEl.value = '';
  draftIn.remove();
  autosizeCustomer();
  refreshAll();
  phoneBody.scrollTop = phoneBody.scrollHeight;
  save();
}

/* ---------- NEW SESSION — wipe everything ---------- */
function newSession() {
  if (!confirm('Start a new session? This clears the draft, customer input, and chat.')) return;
  editorEl.innerHTML = '<p><br></p>';
  customerEl.value = '';
  phoneBody.innerHTML = '';
  draftOut.remove(); draftIn.remove();
  mfAssistClearDraftState();
  lastEdit = Date.now();
  autosizeCustomer();
  refreshAll();
  toast('New session');
  save();
}
document.getElementById('newSessionBtn').addEventListener('click', newSession);

/* phone-internal send button (replaces external inject) */
document.getElementById('phoneSendBtn').addEventListener('click', injectCustomer);

/* Enter sends, Shift+Enter inserts newline (iMessage-style) */
customerEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    injectCustomer();
  }
});

/* auto-grow textarea + live preview already wired via input listener */
customerEl.addEventListener('input', autosizeCustomer);

/* ---------- TOOLBAR HORIZONTAL SCROLL (wheel → horizontal) ---------- */
const toolbarEl = document.querySelector('.mf-tb');
if (toolbarEl) {
  toolbarEl.addEventListener('wheel', (e) => {
    if (e.deltaY === 0 || e.shiftKey) return;
    if (toolbarEl.scrollWidth <= toolbarEl.clientWidth) return;
    e.preventDefault();
    toolbarEl.scrollLeft += e.deltaY;
  }, { passive: false });
}

/* ---------- LIVE PHONE CLOCK ---------- */
function updatePhoneClock() {
  const el = document.getElementById('phoneTime');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toTimeString().slice(0, 5);
}
updatePhoneClock();
setInterval(updatePhoneClock, 30000);

/* ---------- PHONE RAIL DRAG-RESIZE ---------- */
const phoneResize = document.getElementById('phoneResize');
let phoneDrag = false;
phoneResize.addEventListener('mousedown', (e) => {
  if (shell.dataset.phone === 'collapsed') return;
  phoneDrag = true;
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
  if (!phoneDrag) return;
  const dockW = document.querySelector('.mf-right-dock')?.getBoundingClientRect().width || 0;
  const w = window.innerWidth - e.clientX - dockW;
  if (w < 100) {
    shell.dataset.phone = 'collapsed';
    phoneDrag = false;
    document.body.style.cursor = ''; document.body.style.userSelect = '';
    schedulePhoneScale();
    return;
  }
  shell.dataset.phone = 'open';
  const clamped = Math.max(220, Math.min(560, w));
  shell.style.setProperty('--mf-rail-phone-w', clamped + 'px');
  schedulePhoneScale();
});
document.addEventListener('mouseup', () => {
  if (!phoneDrag) return;
  phoneDrag = false;
  document.body.style.cursor = ''; document.body.style.userSelect = '';
  save();
});

phoneResize.addEventListener('dblclick', () => {
  shell.dataset.phone = shell.dataset.phone === 'open' ? 'collapsed' : 'open';
  shell.style.removeProperty('--mf-rail-phone-w');
  beginPhonePanelMotion();
  schedulePhoneScale();
  save();
});

/* ---------- LITE-STYLE FLUID PHONE SCALING ---------- */
let phoneScaleRaf = 0;
let phoneMotionTimer = 0;

function schedulePhoneScale() {
  if (phoneScaleRaf) cancelAnimationFrame(phoneScaleRaf);
  phoneScaleRaf = requestAnimationFrame(() => {
    phoneScaleRaf = 0;
    updatePhoneScale();
  });
}

function beginPhonePanelMotion() {
  if (shell.dataset.rightPanel !== 'phone' || shell.dataset.phone !== 'open') return;
  shell.dataset.phoneMotion = 'true';
  clearTimeout(phoneMotionTimer);
  schedulePhoneScale();
  phoneMotionTimer = setTimeout(() => {
    delete shell.dataset.phoneMotion;
    schedulePhoneScale();
  }, 360);
}

function updatePhoneScale() {
  const wrap = document.getElementById('phoneWrap');
  const stage = wrap && wrap.parentElement;
  if (!wrap || !stage) return;
  const padX = 12, padY = 22;
  const availW = Math.max(0, stage.clientWidth  - padX);
  const availH = Math.max(0, stage.clientHeight - padY);
  // Skip zero-dimension updates — happens before layout is flushed on init;
  // the ResizeObserver fires again once real dimensions are available.
  if (availW === 0 && availH === 0) return;
  const style = getComputedStyle(wrap);
  const baseW = parseFloat(style.getPropertyValue('--mf-phone-base-w')) || 372;
  const baseH = parseFloat(style.getPropertyValue('--mf-phone-base-h')) || 724;
  const s = Math.max(0.32, Math.min(1, availW / baseW, availH / baseH));
  wrap.style.setProperty('--phone-scale', isFinite(s) ? s : 1);
}
window.addEventListener('resize', schedulePhoneScale);
new ResizeObserver(schedulePhoneScale).observe(document.querySelector('.mf-phone-stage'));

/* ========== INIT ========== */
const _loaded = load();
applyPhoneSettings(_loaded?.phoneSettings || phoneSettings);
applyTheme();            // sync: sets CSS vars on bubbles immediately
syncRailControls();
syncModeControls();
renderSideNotes();
/* no demo thread is seeded · Ping opens on your own work, not a fiction */
refreshAll();
renderPingAssistRules();
renderPingAssistProfilePresets();
/* The rule self-test runs 80 fixture sentences through the whole engine. That is
   a diagnostic, not a boot task — it now runs the first time the drawer is opened. */
syncPhoneIdle();
tickMeta();
autosizeCustomer();
updatePhoneScale();
requestAnimationFrame(() => {
  // Re-apply theme after browser's first layout/style pass — guarantees CSS
  // custom-property gradients on marble swatches resolve against inline values,
  // not the class-level defaults that were active before the first paint cycle.
  applyTheme();
  updatePhoneScale();
  renderPingInsights();
  requestAnimationFrame(() => {
    updatePhoneScale();
    // Final deferred scale call after all transitions have had one tick to start
    setTimeout(updatePhoneScale, 0);
  });
});

/* The engine is off the critical path, but the Profiles panel is open by default and
   reports on the rules, so waiting for a keystroke would leave it visibly empty. Kick
   the load as soon as the browser is idle: boot never blocks on the 114 KB, and by the
   time anyone reaches for the rail it has landed. The prose and diagnostics triggers
   above remain the guaranteed floor for browsers without requestIdleCallback. */
(function () {
  if (!window.__tgcLoadLensEngine) return;
  var kick = function () { try { window.__tgcLoadLensEngine(); } catch (e) {} };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(kick, { timeout: 2000 });
  else setTimeout(kick, 600);
})();
