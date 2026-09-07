/* Ping · shell
 * Split out of apps/ping.html. These files are classic scripts, not modules:
 * top-level bindings are shared across them, so LOAD ORDER IS THE CONTRACT.
 * The order is fixed in ping.html and must not be rearranged.
 */

/* =========================================================
   Ping Shell v6 — interaction (theme + variant + rails)
   ========================================================= */

const VARIANTS = {
  pulse: ['electric', 'cyber', 'acid', 'heat', 'fuchsia'],
  slate: ['forest', 'mint', 'pine', 'cobalt', 'nordic'],
  linen: ['harvest', 'champagne', 'marigold', 'copper', 'peach'],
  paper: ['sky', 'ice', 'alabaster', 'denim', 'sage']
};

/* per-theme rolling cursor */
const cursor = { pulse: 0, slate: 0, linen: 0, paper: 0 };

const html  = document.documentElement;
const shell = document.getElementById('shell');

/* ---- bubble swatch palette (marble: 70% base + 30% variant accent) ---- */
const BASES = {
  pulse: '#000000',
  slate: '#0e1416',
  linen: '#f1e6d3',
  paper: '#f6f3e4'
};
const ACCENTS = {
  pulse: { electric: '#bf00ff', cyber: '#00f0ff',  acid: '#aaff00',     heat: '#ff4500',   fuchsia: '#ff0080' },
  slate: { forest:   '#34d399', mint:  '#6ee7b7',  pine: '#1f8b5a',     cobalt: '#3b6dff', nordic:  '#7aa6c2' },
  linen: { harvest:  '#b8732a', champagne: '#9d7c4a', marigold: '#c8841a', copper: '#a85a28', peach: '#d97757' },
  paper: { sky:      '#2563eb', ice:   '#74b9e8',  alabaster: '#5a6370', denim: '#4a7ba6',  sage:    '#6f8a5e' }
};

function applyTheme() {
  const t = html.dataset.theme;
  html.dataset.variant = VARIANTS[t][cursor[t]];

  document.querySelectorAll('.mf-bubble').forEach(b => {
    const bt = b.dataset.t;
    const isActive = bt === t;
    b.setAttribute('aria-pressed', isActive);
    // marble swatch — base + this theme's current variant accent
    const variantName = VARIANTS[bt][cursor[bt]];
    b.style.setProperty('--swatch-base', BASES[bt]);
    b.style.setProperty('--swatch-accent', ACCENTS[bt][variantName]);
    // dots
    const dots = b.querySelectorAll('.mf-vdots i');
    dots.forEach((dot, i) => {
      dot.classList.toggle('on', isActive && i === cursor[t]);
    });
  });
}

/* topbar event delegation */
document.querySelector('.mf-topbar').addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;

  if (t.classList.contains('mf-bubble')) {
    const themeKey = t.dataset.t;
    if (html.dataset.theme === themeKey) {
      // same theme → cycle variant
      cursor[themeKey] = (cursor[themeKey] + 1) % VARIANTS[themeKey].length;
    } else {
      // switch theme (preserve cursor for that theme)
      html.dataset.theme = themeKey;
    }
    applyTheme();
  }
});

/* shuffle */
document.getElementById('shuffleBtn').addEventListener('click', () => {
  const themes = Object.keys(VARIANTS);
  const t = themes[Math.floor(Math.random() * themes.length)];
  cursor[t] = Math.floor(Math.random() * VARIANTS[t].length);
  html.dataset.theme = t;
  applyTheme();
});

function syncRailControls() {
  const rightPanel = shell.dataset.rightPanel || 'assist';
  const insightsOpen = shell.dataset.insights !== 'collapsed';
  const rightOpen = shell.dataset.phone !== 'collapsed';
  const insightsBtn = document.getElementById('tabInsights');
  if (insightsBtn) {
    insightsBtn.dataset.state = insightsOpen ? 'open' : 'collapsed';
    insightsBtn.setAttribute('aria-pressed', String(insightsOpen));
    insightsBtn.classList.toggle('is-active', insightsOpen);
    insightsBtn.title = `${insightsOpen ? 'Collapse' : 'Open'} left panel`;
  }
  const rightToggle = document.getElementById('tabRightPanel');
  if (rightToggle) {
    rightToggle.dataset.state = rightOpen ? 'open' : 'collapsed';
    rightToggle.setAttribute('aria-pressed', String(rightOpen));
    rightToggle.classList.toggle('is-active', rightOpen);
    rightToggle.title = `${rightOpen ? 'Collapse' : 'Open'} right panel`;
  }
  [
    ['tabAssist', 'assist', 'assist'],
    ['tabPhone',  'phone',  'phone'],
    ['tabNotes',  'notes',  'side notes']
  ].forEach(([id, panel, label]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const isActive = rightPanel === panel;
    btn.dataset.state = isActive ? (rightOpen ? 'open' : 'selected') : 'inactive';
    btn.setAttribute('aria-pressed', String(isActive));
    btn.classList.toggle('is-active', isActive);
    btn.title = `${isActive && rightOpen ? 'Showing' : 'Open'} ${label} panel`;
  });
}

function normalizeWorkspaceMode(mode) {
  if (mode === 'ping') return 'insights';
  if (mode === 'engine') return 'drivers';
  if (mode === 'coach' || mode === 'review') return 'insights';
  return ['assist', 'insights', 'drivers'].includes(mode) ? mode : 'assist';
}

function syncModeControls() {
  const mode = normalizeWorkspaceMode(shell.dataset.workspaceMode);
  shell.dataset.workspaceMode = mode;
  const titleMap = {
    insights: 'Insights',
    drivers: 'Drivers',
    assist: 'Assist'
  };
  mfSetText('mfRailTitle', titleMap[mode] || 'Insights');
  document.querySelectorAll('[data-mode-toggle]').forEach(btn => {
    const isActive = btn.dataset.modeToggle === mode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

/* INSIGHTS — left dock toggle */
document.getElementById('tabInsights').addEventListener('click', (e) => {
  e.stopPropagation();
  shell.dataset.insights = shell.dataset.insights === 'open' ? 'collapsed' : 'open';
  syncRailControls();
});

/* RIGHT PANEL — dock toggle */
document.getElementById('tabRightPanel').addEventListener('click', (e) => {
  e.stopPropagation();
  shell.dataset.phone = shell.dataset.phone === 'open' ? 'collapsed' : 'open';
  if (!['assist', 'phone', 'notes'].includes(shell.dataset.rightPanel)) {
    shell.dataset.rightPanel = 'assist';
  }
  if (shell.dataset.phone === 'open' && shell.dataset.rightPanel === 'assist') renderPingAssist();
  syncRailControls();
  if (shell.dataset.rightPanel === 'phone') beginPhonePanelMotion();
  schedulePhoneScale();
});

/* PHONE — right dock mode */
document.getElementById('tabPhone').addEventListener('click', (e) => {
  e.stopPropagation();
  shell.dataset.rightPanel = 'phone';
  shell.dataset.phone = 'open';
  syncRailControls();
  beginPhonePanelMotion();
  schedulePhoneScale();
});

document.getElementById('tabNotes').addEventListener('click', (e) => {
  e.stopPropagation();
  shell.dataset.rightPanel = 'notes';
  shell.dataset.phone = 'open';
  syncRailControls();
  schedulePhoneScale();
});

document.getElementById('tabAssist').addEventListener('click', (e) => {
  e.stopPropagation();
  shell.dataset.rightPanel = 'assist';
  shell.dataset.phone = 'open';
  renderPingAssist();
  syncRailControls();
  schedulePhoneScale();
});

document.querySelectorAll('[data-mode-toggle]').forEach(btn => {
  btn.addEventListener('click', () => {
    shell.dataset.workspaceMode = btn.dataset.modeToggle;
    shell.dataset.insights = 'open';
    syncModeControls();
    syncRailControls();
    renderPingInsights();
    if (btn.dataset.modeToggle === 'assist') renderPingAssist();
    save();
    toast(`${btn.title.replace(' mode', '')} mode`);
  });
});

/* drag-resize insights */
const handle = document.getElementById('resizeHandle');
let dragging = false;
handle.addEventListener('mousedown', (e) => {
  if (shell.dataset.insights === 'collapsed') return;
  dragging = true;
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dockW = document.querySelector('.mf-left-dock')?.getBoundingClientRect().width || 0;
  const w = Math.max(180, Math.min(520, e.clientX - dockW));
  if (w < 130) {
    shell.dataset.insights = 'collapsed';
    dragging = false;
    document.body.style.cursor = ''; document.body.style.userSelect = '';
    return;
  }
  shell.style.setProperty('--mf-rail-insights-w', w + 'px');
});
document.addEventListener('mouseup', () => {
  if (!dragging) return;
  dragging = false;
  document.body.style.cursor = ''; document.body.style.userSelect = '';
  save();
});

/* =========================================================
   LIVE WIRING — editor ← phone, counters, tone, persistence
   ========================================================= */
const editorEl   = document.getElementById('editorSurface');
const customerEl = document.getElementById('customerInput');
const phoneWrap  = document.getElementById('phoneWrap');
const phoneBody  = document.getElementById('phoneBody');
const phoneSettingsBtn = document.getElementById('phoneSettingsBtn');
const phoneSettingsPopover = document.getElementById('phoneSettingsPopover');
const sideNotesList = document.getElementById('sideNotesList');
const sideNotesSearch = document.getElementById('sideNotesSearch');
const sideNotesClearSearch = document.getElementById('sideNotesClearSearch');
const sideNotesStatus = document.getElementById('sideNotesStatus');
const addNoteBtn = document.getElementById('addNoteBtn');
const addNoteFromDraftBtn = document.getElementById('addNoteFromDraftBtn');
/* counterEl removed */
const toneEl     = document.getElementById('toneValue');
const toneMetaEl = document.getElementById('toneMeta');
const moveEl     = document.getElementById('moveValue');
/* metaEl removed — auto-save status now lives in More popover */

/* persistent draft bubbles (Lite-style) */
const draftOut = document.createElement('div');
draftOut.className = 'bubble preview';
draftOut.dataset.role = 'agent';
const draftIn  = document.createElement('div');
draftIn.className  = 'bubble preview';
draftIn.dataset.role = 'cust';

/* The idle phone used to mime a fake support conversation. It now says what it is:
   a preview surface waiting for your words, with nothing invented in it. */
const PHONE_IDLE_MSGS = [
  { role: 'idle-hint', text: 'Your reply previews here as you write it.' }
];

let sideNotes = [];   /* no seeded note · the empty state carries the hint */
let sideNotesQuery = '';

const PHONE_TEXT_SCALES = Object.freeze({
  small: 0.92,
  normal: 1,
  large: 1.12
});
const VALID_PHONE_DENSITIES = new Set(['tight', 'normal', 'airy']);
let phoneSettings = {
  text: 'normal',
  density: 'normal'
};

function normalizePhoneText(value) {
  return Object.prototype.hasOwnProperty.call(PHONE_TEXT_SCALES, value) ? value : 'normal';
}

function normalizePhoneDensity(value) {
  return VALID_PHONE_DENSITIES.has(value) ? value : 'normal';
}

function normalizePhoneSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    text: normalizePhoneText(source.text),
    density: normalizePhoneDensity(source.density)
  };
}

function renderPhoneSettingsControls() {
  if (!phoneSettingsPopover) return;
  phoneSettingsPopover.querySelectorAll('[data-phone-setting]').forEach(btn => {
    const key = btn.dataset.phoneSetting;
    const active = phoneSettings[key] === btn.dataset.value;
    btn.setAttribute('aria-pressed', String(active));
  });
}

function setPhoneSettingsOpen(open) {
  if (!phoneSettingsBtn || !phoneSettingsPopover) return;
  const nextOpen = Boolean(open);
  phoneSettingsPopover.dataset.open = nextOpen ? 'true' : 'false';
  phoneSettingsPopover.setAttribute('aria-hidden', String(!nextOpen));
  phoneSettingsBtn.setAttribute('aria-expanded', String(nextOpen));
}

function applyPhoneSettings(value = phoneSettings) {
  phoneSettings = normalizePhoneSettings(value);
  if (phoneWrap) {
    phoneWrap.dataset.phoneText = phoneSettings.text;
    phoneWrap.dataset.phoneDensity = phoneSettings.density;
    phoneWrap.style.setProperty('--phone-font-scale', String(PHONE_TEXT_SCALES[phoneSettings.text]));
  }
  renderPhoneSettingsControls();
  schedulePhoneScale();
}

function makeNote(text = '', options = {}) {
  return {
    id: 'note-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    text,
    pinned: Boolean(options.pinned)
  };
}

function normalizeSideNotes(notes) {
  if (!Array.isArray(notes)) return sideNotes;
  return notes
    .filter(note => note && typeof note.id === 'string')
    .map(note => ({ id: note.id, text: String(note.text || ''), pinned: Boolean(note.pinned) }));
}

function visibleSideNotes() {
  const query = sideNotesQuery.trim().toLowerCase();
  return sideNotes
    .slice()
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    .filter(note => !query || String(note.text || '').toLowerCase().includes(query));
}

function noteWordCount(text) {
  const words = String(text || '').trim().match(/\b[\w'-]+\b/g);
  return words ? words.length : 0;
}

function renderSideNotesStatus(visibleCount = null) {
  if (!sideNotesStatus) return;
  const query = sideNotesQuery.trim();
  const total = sideNotes.length;
  const pinned = sideNotes.filter(note => note.pinned).length;
  const shown = visibleCount === null ? visibleSideNotes().length : visibleCount;
  sideNotesStatus.textContent = query
    ? `${shown}/${total} match${shown === 1 ? '' : 'es'} · ${pinned} pinned`
    : `${total} note${total === 1 ? '' : 's'} · ${pinned} pinned`;
  if (sideNotesClearSearch) sideNotesClearSearch.disabled = !query;
}

function renderSideNotes() {
  if (!sideNotesList) return;
  if (!sideNotes.length) {
    sideNotesList.innerHTML = '<div class="mf-note-empty">No side notes yet. Add one for reusable copy.</div>';
    renderSideNotesStatus(0);
    return;
  }
  const notes = visibleSideNotes();
  if (!notes.length) {
    sideNotesList.innerHTML = '<div class="mf-note-empty">No matching notes.</div>';
    renderSideNotesStatus(0);
    return;
  }
  renderSideNotesStatus(notes.length);
  sideNotesList.innerHTML = notes.map(note => `
    <article class="mf-note-card" data-note-id="${escapeAttr(note.id)}" data-pinned="${note.pinned ? 'true' : 'false'}">
      <div class="mf-note-top">
        <span class="mf-note-pin" aria-hidden="true"></span>
        <span class="mf-note-meta">${noteWordCount(note.text)}w</span>
        <button class="mf-note-action" type="button" data-note-pin>${note.pinned ? 'Pinned' : 'Pin'}</button>
        <button class="mf-note-action is-primary" type="button" data-note-insert>Use</button>
        <button class="mf-note-action" type="button" data-note-copy>Copy</button>
        <button class="mf-note-action" type="button" data-note-delete>Del</button>
      </div>
      <textarea class="mf-note-input" spellcheck="false" placeholder="Write a reusable note...">${escapeHTML(note.text)}</textarea>
    </article>
  `).join('');
}

function focusFirstNote() {
  const first = sideNotesList && sideNotesList.querySelector('.mf-note-input');
  if (first) {
    first.focus();
    first.select();
  }
}

function saveSideNote(text, options = {}) {
  const value = String(text || '').trim();
  if (!value) return null;
  const note = makeNote(value, options);
  sideNotes.unshift(note);
  renderSideNotes();
  if (options.focus !== false) focusFirstNote();
  save();
  return note;
}

function addSideNoteFromDraft() {
  const selected = getSavedEditorSelectionText();
  const text = (selected || getDraftPlain()).trim();
  if (!text) {
    toast('No draft text to save');
    return;
  }
  saveSideNote(text);
  toast(selected ? 'Selection saved as note' : 'Draft saved as note');
}

function insertNoteIntoDraft(note) {
  const text = String(note?.text || '').trim();
  if (!text) {
    toast('Note empty');
    return;
  }
  insertAtCursor(text);
  toast('Note inserted');
}

if (addNoteBtn) {
  addNoteBtn.addEventListener('click', () => {
    sideNotes.unshift(makeNote('', { pinned: sideNotesQuery ? false : false }));
    renderSideNotes();
    focusFirstNote();
    save();
  });
}

if (addNoteFromDraftBtn) {
  addNoteFromDraftBtn.addEventListener('click', addSideNoteFromDraft);
}

if (sideNotesSearch) {
  sideNotesSearch.addEventListener('input', () => {
    sideNotesQuery = sideNotesSearch.value || '';
    renderSideNotes();
  });
}

if (sideNotesClearSearch) {
  sideNotesClearSearch.addEventListener('click', () => {
    sideNotesQuery = '';
    if (sideNotesSearch) sideNotesSearch.value = '';
    renderSideNotes();
    toast('Note search cleared');
  });
}

if (sideNotesList) {
  sideNotesList.addEventListener('input', (e) => {
    const input = e.target.closest('.mf-note-input');
    if (!input) return;
    const card = input.closest('[data-note-id]');
    const note = sideNotes.find(item => item.id === card.dataset.noteId);
    if (!note) return;
    note.text = input.value;
    const meta = card.querySelector('.mf-note-meta');
    if (meta) meta.textContent = noteWordCount(note.text) + 'w';
    renderSideNotesStatus();
    save();
  });
  sideNotesList.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-note-id]');
    if (!card) return;
    const note = sideNotes.find(item => item.id === card.dataset.noteId);
    if (!note) return;
    if (e.target.closest('[data-note-pin]')) {
      note.pinned = !note.pinned;
      renderSideNotes();
      save();
      toast(note.pinned ? 'Note pinned' : 'Note unpinned');
      return;
    }
    if (e.target.closest('[data-note-insert]')) {
      insertNoteIntoDraft(note);
      return;
    }
    if (e.target.closest('[data-note-copy]')) {
      if (!note.text.trim()) { toast('Note empty'); return; }
      try {
        await navigator.clipboard.writeText(note.text);
        toast('Note copied');
      } catch {
        toast('Copy failed - clipboard blocked');
      }
      return;
    }
    if (e.target.closest('[data-note-delete]')) {
      sideNotes = sideNotes.filter(item => item.id !== note.id);
      renderSideNotes();
      save();
    }
  });
}

function normalizeEditorVisibleText(value) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

const EDITOR_LINE_BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'LI']);

function editorNodeLineText(node) {
  if (!node) return '';
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  if (node.tagName === 'BR') return '\n';
  return Array.from(node.childNodes).map(editorNodeLineText).join('');
}

function editorLineBlocks(root) {
  const blocks = [];
  let inline = '';
  function flushInline() {
    const text = normalizeEditorVisibleText(inline);
    if (text) blocks.push(text);
    inline = '';
  }
  Array.from(root.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      inline += node.nodeValue || '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (EDITOR_LINE_BLOCKS.has(node.tagName)) {
      flushInline();
      blocks.push(normalizeEditorVisibleText(editorNodeLineText(node)));
      return;
    }
    if (node.tagName === 'BR') {
      inline += '\n';
      return;
    }
    inline += editorNodeLineText(node);
  });
  flushInline();
  return blocks;
}

/* convert editor view → customer-facing plain text, preserving visible line breaks */
function getDraftPlain() {
  return normalizeEditorVisibleText(editorLineBlocks(editorEl).join('\n'));
}

/* collapsed text (used for counter/tone calcs) */
function getDraftText() {
  return getDraftPlain().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function getDraftStats() {
  const text = getDraftPlain();
  const words = text ? (text.match(/\b[\w'’-]+\b/g) || []).length : 0;
  const allLines = text ? text.split('\n') : [];
  const contentLines = allLines.filter(line => line.trim()).length;
  const blankLines = allLines.filter(line => !line.trim()).length;
  return { text, words, lines: allLines.length, contentLines, blankLines, chars: text.length };
}

function syncEditorStatus() {
  const status = document.getElementById('editorLiveStatus');
  const stats = getDraftStats();
  editorEl.dataset.empty = stats.words ? 'false' : 'true';
  if (status) {
    status.textContent = stats.words
      ? `${stats.words}w · ${Math.max(1, stats.lines)} lines${stats.blankLines ? ` · ${stats.blankLines} blank` : ''}`
      : 'Ready';
  }
}

let editorSavedRange = null;
let editorSavedSelectionText = '';
let mfAssistScope = 'draft';

function editorOwnsNode(node) {
  return Boolean(node && (node === editorEl || editorEl.contains(node)));
}

function editorRangeIsUsable(range) {
  try {
    return Boolean(range && editorOwnsNode(range.startContainer) && editorOwnsNode(range.endContainer));
  } catch (_) {
    return false;
  }
}

function captureEditorSelection() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !editorOwnsNode(sel.anchorNode) || !editorOwnsNode(sel.focusNode)) return;
  const range = sel.getRangeAt(0);
  editorSavedRange = range.cloneRange();
  editorSavedSelectionText = sel.isCollapsed ? '' : sel.toString().trim();
  syncAssistScopeControls();
}

function getSavedEditorSelectionText() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount && !sel.isCollapsed && editorOwnsNode(sel.anchorNode) && editorOwnsNode(sel.focusNode)) {
    return sel.toString().trim();
  }
  return editorSavedSelectionText;
}

function mfAssistSelectionText() {
  return String(getSavedEditorSelectionText() || '').trim();
}

function mfAssistActiveScope() {
  return mfAssistScope === 'selection' && mfAssistSelectionText() ? 'selection' : 'draft';
}

function mfAssistAnalysisText() {
  return mfAssistActiveScope() === 'selection'
    ? mfAssistSelectionText()
    : getDraftPlain().trim();
}

function syncAssistScopeControls() {
  const btn = document.getElementById('mfAssistScopeToggle');
  if (!btn) return;
  const hasSelection = Boolean(mfAssistSelectionText());
  const active = mfAssistActiveScope() === 'selection';
  btn.dataset.active = String(active);
  btn.textContent = active ? 'Selection' : 'Draft';
  btn.title = hasSelection ? 'Toggle Assist between selected text and full draft' : 'Select text in the editor to check a fragment';
}

function setAssistScope(scope) {
  if (scope === 'selection' && !mfAssistSelectionText()) {
    mfAssistScope = 'draft';
    syncAssistScopeControls();
    toast('Select text first');
    return;
  }
  mfAssistScope = scope === 'selection' ? 'selection' : 'draft';
  syncAssistScopeControls();
  renderPingAssist();
}

document.addEventListener('selectionchange', captureEditorSelection);
editorEl.addEventListener('keyup', captureEditorSelection);
editorEl.addEventListener('mouseup', captureEditorSelection);
editorEl.addEventListener('focus', captureEditorSelection);

function updatePhoneDraft() {
  clearPhoneIdle();
  const t = getDraftPlain();
  if (t) {
    draftOut.textContent = t;
    if (!draftOut.parentElement) phoneBody.appendChild(draftOut);
    phoneBody.scrollTop = phoneBody.scrollHeight;
  } else {
    draftOut.remove();
    syncPhoneIdle();
  }
}

function updateCustomerDraft() {
  clearPhoneIdle();
  const t = customerEl.value;
  if (t.trim()) {
    draftIn.textContent = t;
    if (!draftIn.parentElement) {
      if (draftOut.parentElement) phoneBody.insertBefore(draftIn, draftOut);
      else phoneBody.appendChild(draftIn);
    }
    phoneBody.scrollTop = phoneBody.scrollHeight;
  } else {
    draftIn.remove();
    syncPhoneIdle();
  }
}

function clearPhoneIdle() {
  phoneBody.querySelectorAll('[data-idle="true"]').forEach(el => el.remove());
}

function hasRealPhoneContent() {
  return Boolean(phoneBody.querySelector('.bubble:not([data-idle="true"]), .bubble-time:not([data-idle="true"])'));
}

function shouldShowPhoneIdle() {
  return !getDraftPlain() && !customerEl.value.trim() && !hasRealPhoneContent();
}

function renderPhoneIdle() {
  clearPhoneIdle();
  PHONE_IDLE_MSGS.forEach(msg => {
    const el = document.createElement('div');
    el.className = 'bubble idle';
    el.dataset.role = msg.role;
    el.dataset.idle = 'true';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = msg.text;
    phoneBody.appendChild(el);
  });
  updatePhoneInteractionCount();
}

function syncPhoneIdle() {
  if (shouldShowPhoneIdle()) renderPhoneIdle();
  else clearPhoneIdle();
  updatePhoneInteractionCount();
}

function getPersistablePhoneHTML() {
  const clone = phoneBody.cloneNode(true);
  clone.querySelectorAll('[data-idle="true"]').forEach(el => el.remove());
  return clone.innerHTML;
}

/* =========================================================
   MF PING: MirrorGlass Phone v2
   Phone preview metadata
   ========================================================= */
function updatePhoneInteractionCount() {
  const el = document.getElementById('phoneInteractionCount');
  const count = phoneBody.querySelectorAll('.bubble:not(.preview):not([data-idle="true"])').length;
  if (el) el.textContent = String(count);
  if (phoneSettingsBtn) {
    const label = `Phone preview settings, ${count} chat${count === 1 ? '' : 's'}`;
    phoneSettingsBtn.title = label;
    phoneSettingsBtn.setAttribute('aria-label', label);
  }
}

if (phoneSettingsBtn) {
  phoneSettingsBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    setPhoneSettingsOpen(phoneSettingsBtn.getAttribute('aria-expanded') !== 'true');
  });
}

if (phoneSettingsPopover) {
  phoneSettingsPopover.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const btn = ev.target.closest('[data-phone-setting]');
    if (!btn) return;
    const key = btn.dataset.phoneSetting;
    const value = btn.dataset.value;
    if (key === 'text') phoneSettings.text = normalizePhoneText(value);
    if (key === 'density') phoneSettings.density = normalizePhoneDensity(value);
    applyPhoneSettings(phoneSettings);
    save();
  });
}

document.addEventListener('click', (ev) => {
  const target = ev.target;
  if (!phoneSettingsPopover || phoneSettingsPopover.dataset.open !== 'true') return;
  if (target.closest('#phoneSettingsPopover') || target.closest('#phoneSettingsBtn')) return;
  setPhoneSettingsOpen(false);
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') setPhoneSettingsOpen(false);
});

/* phone-input textarea auto-grow */
function autosizeCustomer() {
  customerEl.style.height = 'auto';
  customerEl.style.height = Math.min(92, customerEl.scrollHeight) + 'px';
}

function updateCounter() { /* counter removed — keeping stub so refreshAll stays harmless */ }
