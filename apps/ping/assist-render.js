/* Ping · assist-render
 * Split out of apps/ping.html. These files are classic scripts, not modules:
 * top-level bindings are shared across them, so LOAD ORDER IS THE CONTRACT.
 * The order is fixed in ping.html and must not be rearranged.
 */

/* ========== ASSIST STATE + RENDER ========== */
let mfAssistIgnore = new Set();
let mfAssistFilter = 'all';
let mfLastAssist   = null;
let mfAssistDebounce = 0;
let mfAssistLastTestReport = null;
let mfAssistLastApply = null;
let mfAssistRestoringUndo = false;
let mfAssistApplyingFix = false;

function mfAssistSetUndoState(state) {
  mfAssistLastApply = state || null;
  const btn = document.getElementById('mfAssistUndoApply');
  if (!btn) return;
  btn.style.display = mfAssistLastApply ? 'block' : 'none';
  if (mfAssistLastApply) btn.title = 'Undo ' + (mfAssistLastApply.label || 'last Assist fix');
}

const SEV_ORDER = { high: 0, medium: 1, low: 2 };

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}

function mfAssistIssueKey(issue) {
  return issue ? issue.ruleId + ':' + issue.excerpt : '';
}

function mfAssistIsIssueIgnored(issue) {
  return mfAssistIgnore.has(mfAssistIssueKey(issue));
}

function mfAssistSafeIssues(result) {
  let floor = Infinity;
  return (result?.issues || []).filter(issue =>
    !mfAssistIsIssueIgnored(issue) &&
    issue.applySafe &&
    issue.replacement !== null &&
    issue.replacement !== undefined &&
    issue.replacement !== issue.excerpt &&
    Number.isFinite(issue.start) &&
    Number.isFinite(issue.end))
    .sort((a, b) => (b.start - a.start) || (b.end - a.end))
    .filter(issue => {
      if (issue.end > floor) return false;
      floor = issue.start;
      return true;
    })
    .sort((a, b) => a.start - b.start);
}

function mfAssistIssueCounts(issues) {
  const active = issues.filter(i => !mfAssistIsIssueIgnored(i));
  return {
    all: active.length,
    grammar: active.filter(i => i.category === 'grammar').length,
    clarity: active.filter(i => i.category === 'clarity').length,
    tone:    active.filter(i => i.category === 'tone').length
  };
}

function updateAssistFilterTabs(counts) {
  counts = counts || { all:0, grammar:0, clarity:0, tone:0 };
  const map = { all: counts.all, grammar: counts.grammar, clarity: counts.clarity, tone: counts.tone };
  const labels = { all:'All', grammar:'Grammar', clarity:'Clarity', tone:'Tone' };
  document.querySelectorAll('.mf-assist-filter-btn').forEach(btn => {
    const f = btn.dataset.filter;
    const n = map[f] ?? 0;
    btn.textContent = n > 0 ? `${labels[f]} ${n}` : labels[f];
  });
}

function mfAssistSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function mfAssistEmptyHtml(title, note) {
  return `<div class="mf-assist-empty"><strong>${escHtml(title)}</strong><span>${escHtml(note)}</span></div>`;
}

function renderAssistRightStatus(result) {
  const box = document.getElementById('mfAssistRightStatus');
  if (!box) return;
  if (!result) {
    box.dataset.state = 'idle';
    mfAssistSetText('mfAssistRightScope', mfAssistScope === 'selection' ? 'Selection' : 'Draft');
    mfAssistSetText('mfAssistRightScore', '--');
    mfAssistSetText('mfAssistRightIssues', '0');
    mfAssistSetText('mfAssistRightFixes', '0');
    mfAssistSetText('mfAssistRightNote', mfAssistScope === 'selection'
      ? 'Select text in the editor to check a fragment.'
      : 'Type a draft to run the writing check.');
    return;
  }
  const counts = mfAssistIssueCounts(result.issues || []);
  const safeCount = mfAssistSafeIssues(result).length;
  const rewriteCount = (result.rewrites || []).filter(item => item && item.text).length;
  const score = result.quality?.score ?? 0;
  const scoped = result.editorScope === 'selection';
  const risk = result.tone?.risk || 'Low';
  const state = counts.all === 0 ? 'clean' : risk === 'High' ? 'risk' : safeCount ? 'action' : 'review';
  box.dataset.state = state;
  mfAssistSetText('mfAssistRightScope', scoped ? 'Selection' : 'Draft');
  mfAssistSetText('mfAssistRightScore', Number.isFinite(score) ? `${score}%` : '--');
  mfAssistSetText('mfAssistRightIssues', String(counts.all));
  mfAssistSetText('mfAssistRightFixes', String(safeCount));
  const note = counts.all === 0
    ? `${scoped ? 'Selection' : 'Draft'} is clean. ${rewriteCount} rewrite preview${rewriteCount === 1 ? '' : 's'} available.`
    : `${counts.grammar} grammar · ${counts.clarity} clarity · ${counts.tone} tone. ${safeCount} safe fix${safeCount === 1 ? '' : 'es'}${rewriteCount ? ` · ${rewriteCount} rewrite${rewriteCount === 1 ? '' : 's'}` : ''}.`;
  mfAssistSetText('mfAssistRightNote', note);
}

function updateAssistDotBadge(total) {
  const dot = document.getElementById('mfAssistDot');
  if (!dot) return;
  if (total > 0) {
    dot.textContent = total > 9 ? '9+' : String(total);
    dot.classList.add('visible');
  } else {
    dot.textContent = '';
    dot.classList.remove('visible');
  }
}

function mfAssistClearDraftState() {
  mfLastAssist = null;
  mfActiveIssueId = null;
  mfAssistScope = 'draft';
  mfAssistIgnore.clear();
  mfAssistSetUndoState(null);
  syncAssistScopeControls();
  renderAssistRightStatus(null);
}

function renderPingAssistSummary(result) {
  const chip       = document.getElementById('mfAssistToneChip');
  const issuesEl   = document.getElementById('mfAssistIssues');
  const protectedEl= document.getElementById('mfAssistProtected');
  const wordsEl    = document.getElementById('mfAssistWords');
  const gradeEl    = document.getElementById('mfAssistGrade');
  const recEl      = document.getElementById('mfAssistRec');
  const modeEl     = document.getElementById('mfAssistModeLabel');
  const metaEl     = document.getElementById('mfAssistMetaLabel');

  if (!result) {
    renderAssistRightStatus(null);
    if (modeEl) modeEl.textContent = 'Idle';
    if (metaEl) metaEl.textContent = '0 words · local offline';
    if (chip) { chip.textContent = 'No draft'; chip.dataset.risk = 'Low'; }
    if (issuesEl) issuesEl.textContent = '0';
    if (protectedEl) protectedEl.textContent = '0';
    if (wordsEl) wordsEl.textContent = '0';
    if (gradeEl) gradeEl.textContent = '--';
    [
      ['mfBarValGrammar', 'Grammar'],
      ['mfBarValClarity', 'Clarity'],
      ['mfBarValTone', 'Tone']
    ].forEach(([id, label]) => {
      const el = document.getElementById(id); if (el) el.textContent = label;
    });
    ['mfBarGrammar','mfBarClarity','mfBarTone'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.width = '0%';
    });
    if (recEl) recEl.textContent = 'Start typing to check writing.';
    updateAssistDotBadge(0);
    updateAssistFilterTabs({ all:0, grammar:0, clarity:0, tone:0 });
    return;
  }

  const { issues = [], tone = {}, clarity = {}, protectedSpans = [], quality = {} } = result;
  const scoped = result.editorScope === 'selection';
  const counts = mfAssistIssueCounts(issues);
  const total  = counts.all;
  renderAssistRightStatus(result);
  if (modeEl) modeEl.textContent = scoped ? 'Selection' : (quality.state || 'Assist');
  if (metaEl) {
    const score = quality.score != null ? quality.score + '%' : 'local';
    const words = clarity.words != null ? clarity.words : 0;
    metaEl.textContent = `${scoped ? 'Fragment' : 'Draft'} · ${score} · ${words} word${words === 1 ? '' : 's'} · ${quality.nextAction || 'writing check'}`;
  }

  /* tone chip */
  const risk    = tone.risk    || 'Low';
  const primary = tone.primary || 'Neutral';
  if (chip) { chip.textContent = `${primary} · ${risk} risk`; chip.dataset.risk = risk; }

  /* KPIs */
  if (issuesEl)    issuesEl.textContent    = total;
  if (protectedEl) protectedEl.textContent = protectedSpans.length;
  if (wordsEl)     wordsEl.textContent     = clarity.words != null ? clarity.words : '--';
  if (gradeEl)     gradeEl.textContent     = clarity.grade != null ? `G${clarity.grade}` : '--';

  /* bars — all show HEALTH (higher = cleaner/safer) */
  const grammarHealth = Math.max(0, 100 - counts.grammar * 20);
  const clarityHealth = clarity.quality != null ? Math.round(clarity.quality) : 0;
  const toneHealth    = tone.score      != null ? Math.max(0, 100 - Math.round(tone.score)) : 0;

  const grammarLabel  = counts.grammar === 0 ? 'Clean' : `${counts.grammar} issue${counts.grammar !== 1 ? 's' : ''}`;
  const clarityLabel  = clarity.level || 'Clear';
  const toneLabel     = tone.risk    || 'Low';

  [
    ['mfBarValGrammar', 'mfBarGrammar', grammarLabel, grammarHealth],
    ['mfBarValClarity', 'mfBarClarity', clarityLabel, clarityHealth],
    ['mfBarValTone',    'mfBarTone',    toneLabel,    toneHealth]
  ].forEach(([valId, fillId, label, pct]) => {
    const v = document.getElementById(valId); if (v) v.textContent = label;
    const f = document.getElementById(fillId); if (f) f.style.width = pct + '%';
  });

  /* top recommendation */
  const recs = clarity.recommendations || [];
  if (recEl) recEl.textContent = scoped
    ? (recs[0] || quality.nextAction || 'Selection check is reading only the highlighted text.')
    : (recs[0] || quality.nextAction || '');

  updateAssistDotBadge(total);
  updateAssistFilterTabs(counts);
}

function renderPingAssistRewrites(result) {
  const panel = document.getElementById('mfAssistRewritePanel');
  if (!panel) return;
  const rewrites = (result?.rewrites || []).filter(item => item && item.text).slice(0, 3);
  if (!rewrites.length) {
    panel.dataset.show = 'false';
    panel.innerHTML = '';
    return;
  }
  panel.dataset.show = 'true';
  panel.innerHTML = `
    <div class="mf-assist-rewrite-head">
      <span>${result.editorScope === 'selection' ? 'Selection rewrites' : 'Rewrite previews'}</span>
      <span>${rewrites.length}</span>
    </div>
    ${rewrites.map(rewrite => `
      <div class="mf-assist-rewrite-card" data-rewrite-id="${escAttr(rewrite.id)}">
        <div class="mf-assist-rewrite-title">${escHtml(rewrite.title)}</div>
        <div class="mf-assist-rewrite-intent">${escHtml(rewrite.intent)} · ${rewrite.changes || 0} change${rewrite.changes === 1 ? '' : 's'} · ${escHtml(rewrite.impact?.label || 'Mixed')}</div>
        <div class="mf-assist-rewrite-text" contenteditable="true" spellcheck="false" data-rewrite-edit="${escAttr(rewrite.id)}">${escHtml(rewrite.text)}</div>
        <div class="mf-assist-card-actions" style="margin-top:8px">
          <button class="mf-assist-act-btn apply" data-action="use-rewrite" data-rewrite-id="${escAttr(rewrite.id)}">Use</button>
          <button class="mf-assist-act-btn" data-action="copy-rewrite" data-rewrite-id="${escAttr(rewrite.id)}">Copy</button>
          <button class="mf-assist-act-btn" data-action="save-rewrite" data-rewrite-id="${escAttr(rewrite.id)}">Save</button>
          <button class="mf-assist-act-btn" data-action="reset-rewrite" data-rewrite-id="${escAttr(rewrite.id)}">Reset</button>
        </div>
      </div>
    `).join('')}`;
}

function renderPingAssistCards(result) {
  const list        = document.getElementById('mfAssistCardList');
  const clearBtn    = document.getElementById('mfAssistClearIgnored');
  const applySafeBtn= document.getElementById('mfAssistApplySafe');
  if (!list) return;

  /* show/hide "clear ignored" button */
  if (clearBtn) clearBtn.style.display = mfAssistIgnore.size > 0 ? 'block' : 'none';
  if (applySafeBtn) {
    applySafeBtn.style.display = 'none';
    applySafeBtn.textContent = 'Fix safe';
    applySafeBtn.title = 'Apply all safe Assist fixes';
  }

  if (!result) {
    if (clearBtn) clearBtn.style.display = 'none';
    const empty = mfAssistScope === 'selection'
      ? ['Selection waiting', 'Highlight a sentence or paragraph, then run the fragment check.']
      : ['Draft waiting', 'Type or paste text to see grammar, clarity, tone, and rewrite help.'];
    list.innerHTML = mfAssistEmptyHtml(empty[0], empty[1]);
    return;
  }
  const { issues = [] } = result;
  const safeIssues = mfAssistSafeIssues(result);
  if (applySafeBtn) {
    applySafeBtn.style.display = safeIssues.length ? 'block' : 'none';
    applySafeBtn.textContent = safeIssues.length ? `Fix safe ${safeIssues.length}` : 'Fix safe';
    applySafeBtn.title = safeIssues.length
      ? `Apply ${safeIssues.length} safe Assist fix${safeIssues.length === 1 ? '' : 'es'}${result.editorScope === 'selection' ? ' to selection' : ''}`
      : 'Apply all safe Assist fixes';
  }

  /* update filter tab counts (may have changed via ignore) */
  updateAssistFilterTabs(mfAssistIssueCounts(issues));

  const visible = issues
    .filter(i => {
      if (mfAssistIsIssueIgnored(i)) return false;
      return mfAssistFilter === 'all' || i.category === mfAssistFilter;
    })
    .sort((a, b) => (SEV_ORDER[a.severity] ?? 1) - (SEV_ORDER[b.severity] ?? 1));

  if (!visible.length) {
    const activeCount = issues.filter(i => !mfAssistIsIssueIgnored(i)).length;
    const empty = mfAssistFilter !== 'all'
      ? [`No ${mfAssistFilter} issues`, `Switch filters or keep writing. ${result.editorScope === 'selection' ? 'Selection' : 'Draft'} check is still active.`]
      : activeCount === 0 && mfAssistIgnore.size > 0
        ? ['Ignored issues hidden', 'Clear ignored to bring the hidden cards back.']
        : ['No issues found', 'The current text is clean. Use rewrite previews if you want a different tone or length.'];
    list.innerHTML = mfAssistEmptyHtml(empty[0], empty[1]);
    return;
  }

  const CAT_ORDER = ['grammar', 'clarity', 'tone'];
  if (mfAssistFilter === 'all') {
    visible.sort((a, b) => {
      const catDiff = CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category);
      if (catDiff !== 0) return catDiff;
      return (SEV_ORDER[a.severity] ?? 1) - (SEV_ORDER[b.severity] ?? 1);
    });
  }

  const catLabels = { grammar:'Grammar', clarity:'Clarity', tone:'Tone' };
  let html = '', currentCat = '';

  visible.forEach(issue => {
    /* group header when showing all */
    if (mfAssistFilter === 'all' && issue.category !== currentCat) {
      currentCat = issue.category;
      const groupCount = visible.filter(i => i.category === currentCat).length;
      html += `<div class="mf-assist-group-label">${catLabels[currentCat] || currentCat} · ${groupCount}</div>`;
    }

    const hasR     = issue.replacement != null && issue.replacement !== issue.excerpt;
    const isSafe   = hasR && issue.applySafe;
    const afterCls = hasR && !issue.applySafe ? ' review-only' : '';
    const isActive = issue.id === mfActiveIssueId;
    const previewReplacement = issue.replacement === '' ? 'Remove this phrase' : issue.replacement;
    const canCopyReplacement = hasR && issue.replacement !== '';

    html += `<div class="mf-assist-card" data-cat="${issue.category}" data-issue-id="${escAttr(issue.id)}"${isActive ? ' data-active="true"' : ''}>
      <div class="mf-assist-card-head">
        <span class="mf-assist-badge" data-cat="${issue.category}">${issue.category}</span>
        <span class="mf-assist-sev" data-sev="${issue.severity}">${issue.severity}</span>
        <span style="font:700 11px var(--mf-font-ui);color:var(--mf-ink-2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(issue.label)}</span>
      </div>
      <div style="font:400 12px/1.5 var(--mf-font-ui);color:var(--mf-ink-2);margin-bottom:6px">${escHtml(issue.message)}</div>
      <div class="mf-assist-before-after">
        <div class="mf-assist-preview-label">Current</div>
        <div class="mf-assist-before">${escHtml(issue.excerpt)}</div>
        ${hasR ? `<div class="mf-assist-preview-label">Suggestion</div><div class="mf-assist-after${afterCls}">${escHtml(previewReplacement)}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        ${isSafe ? `<button class="mf-assist-act-btn apply" data-action="apply" data-issue-id="${escAttr(issue.id)}">Apply</button>` : ''}
        ${canCopyReplacement ? `<button class="mf-assist-act-btn" data-action="copy" data-replacement="${escAttr(issue.replacement)}">Copy</button>` : ''}
        <button class="mf-assist-act-btn" data-action="ignore" data-rule-id="${escAttr(issue.ruleId)}" data-excerpt="${escAttr(issue.excerpt)}">Ignore</button>
        <button class="mf-assist-act-btn" data-action="ignore-rule" data-rule-id="${escAttr(issue.ruleId)}">Rule off</button>
      </div>
    </div>`;
  });

  list.innerHTML = html;
}

function renderPingAssist() {
  if (typeof window.MirrorFlowAssistEngine === 'undefined') return;
  const scope = mfAssistActiveScope();
  const text = mfAssistAnalysisText();
  syncAssistScopeControls();
  if (!text) {
    mfAssistClearDraftState();
    renderPingAssistSummary(null);
    renderPingAssistRewrites(null);
    renderPingAssistCards(null);
    renderPingAssistRows(null);
    renderPingAssistSpans(null);
    renderPingAssistRules();
    renderPingAssistProfilePresets();
    renderPingAssistDiagnostics();
    return;
  }
  try {
    mfLastAssist = window.MirrorFlowAssistEngine.analyzeText(text, { surface: 'ping_assist', mode: 'writing_only' });
    mfLastAssist.editorScope = scope;
    renderPingAssistSummary(mfLastAssist);
    renderPingAssistRewrites(mfLastAssist);
    renderPingAssistCards(mfLastAssist);
    renderPingAssistRows(mfLastAssist);
    renderPingAssistSpans(mfLastAssist);
    renderPingAssistRules();
    renderPingAssistProfilePresets();
    renderPingAssistDiagnostics();
  } catch (_) {}
}

function renderPingAssistDebounced() {
  clearTimeout(mfAssistDebounce);
  mfAssistDebounce = setTimeout(renderPingAssist, 350);
}

function replaceEditorTextMatch(excerpt, replacement) {
  const needle = String(excerpt || '');
  if (!needle) return false;
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const idx = node.nodeValue.indexOf(needle);
    if (idx < 0) continue;
    node.nodeValue = node.nodeValue.slice(0, idx) + replacement + node.nodeValue.slice(idx + needle.length);
    return true;
  }
  return false;
}

function plainToEditorHtml(value) {
  return String(value || '').split('\n\n')
    .map(p => `<p>${escHtml(p).replace(/\n/g, '<br>') || '<br>'}</p>`)
    .join('');
}

function replaceSavedEditorSelectionWithPlainText(value) {
  if (!editorRangeIsUsable(editorSavedRange)) return false;
  const range = editorSavedRange.cloneRange();
  editorEl.focus({ preventScroll: true });
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  const frag = plainTextToFragment(value);
  const lastNode = frag.lastChild;
  range.deleteContents();
  range.insertNode(frag);
  placeEditorCursorAfter(lastNode);
  return true;
}

function applyAssistReplacement(excerpt, replacement) {
  if (replaceEditorTextMatch(excerpt, replacement)) {
    refreshAll();
    save();
    return true;
  }
  const plain = getDraftPlain();
  const idx = plain.indexOf(excerpt);
  if (idx === -1) return false;
  const newPlain = plain.slice(0, idx) + replacement + plain.slice(idx + excerpt.length);
  editorEl.innerHTML = plainToEditorHtml(newPlain);
  refreshAll();
  save();
  return true;
}

/* ---- focus issue: highlight excerpt in editor ---- */
function buildEditorTextIndex() {
  const chunks = [];
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
  let text = '', node;
  while ((node = walker.nextNode())) {
    const start = text.length;
    text += node.nodeValue;
    chunks.push({ node, start, end: text.length });
    const par = node.parentElement;
    if (par && /^(P|DIV|LI|H[1-6])$/.test(par.tagName)) text += '\n';
  }
  return { text, chunks };
}

function offsetToPoint(index, offset) {
  const direct = index.chunks.find(c => offset >= c.start && offset <= c.end);
  if (direct) return { node: direct.node, offset: Math.max(0, Math.min(direct.node.nodeValue.length, offset - direct.start)) };
  const next = index.chunks.find(c => c.start > offset);
  if (next) return { node: next.node, offset: 0 };
  const last = index.chunks[index.chunks.length - 1];
  return last ? { node: last.node, offset: last.node.nodeValue.length } : null;
}

let mfActiveIssueId = null;

function focusPingIssue(issueId) {
  if (!mfLastAssist) return;
  const issue = mfLastAssist.issues.find(i => i.id === issueId);
  if (!issue || issue.start == null || issue.end == null) return;
  mfActiveIssueId = issueId;

  // re-render cards to show active state
  renderPingAssistCards(mfLastAssist);

  // build text index and select range in editor
  const index = buildEditorTextIndex();
  let start = index.text.indexOf(issue.excerpt, Math.max(0, issue.start - 20));
  if (start < 0) start = index.text.indexOf(issue.excerpt);
  if (start < 0) start = issue.start;
  const end = start + String(issue.excerpt || '').length;
  const startPt = offsetToPoint(index, start);
  const endPt   = offsetToPoint(index, end);
  if (!startPt || !endPt) return;

  const range = document.createRange();
  range.setStart(startPt.node, startPt.offset);
  range.setEnd(endPt.node, endPt.offset);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  const target = startPt.node.parentElement || editorEl;
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  editorEl.focus({ preventScroll: true });
}

/* ---- apply using start/end offsets (more reliable than excerpt search) ---- */
function applyAssistByOffset(issue) {
  if (mfLastAssist?.editorScope === 'selection') {
    return applyAssistSelectionByOffset(issue);
  }
  if (replaceEditorTextMatch(issue.excerpt, issue.replacement)) {
    mfActiveIssueId = null;
    refreshAll();
    save();
    return true;
  }
  const plain = getDraftPlain();
  let start = issue.start, end = issue.end;
  // verify offset region matches excerpt (text may have shifted)
  if (plain.slice(start, end) !== issue.excerpt) {
    // fallback: search by excerpt
    const idx = plain.indexOf(issue.excerpt);
    if (idx === -1) { toast('Excerpt not found - re-run check'); return false; }
    start = idx; end = idx + issue.excerpt.length;
  }
  const newPlain = plain.slice(0, start) + issue.replacement + plain.slice(end);
  editorEl.innerHTML = plainToEditorHtml(newPlain);
  mfActiveIssueId = null;
  refreshAll();
  save();
  return true;
}

function applyAssistSelectionByOffset(issue) {
  const plain = mfAssistSelectionText();
  let start = issue.start, end = issue.end;
  if (!plain || !editorRangeIsUsable(editorSavedRange)) {
    toast('Selection lost - select text again');
    return false;
  }
  if (plain.slice(start, end) !== issue.excerpt) {
    const idx = plain.indexOf(issue.excerpt);
    if (idx === -1) {
      toast('Selection changed - re-run check');
      return false;
    }
    start = idx; end = idx + issue.excerpt.length;
  }
  const next = plain.slice(0, start) + issue.replacement + plain.slice(end);
  if (!replaceSavedEditorSelectionWithPlainText(next)) {
    toast('Selection lost - select text again');
    return false;
  }
  mfActiveIssueId = null;
  mfAssistScope = 'draft';
  refreshAll();
  save();
  return true;
}

function mfAssistNormalizePlain(value) {
  return String(value || '')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/\s+([)\]}])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_, lead, first) => lead + first.toUpperCase());
}

function mfAssistApplyIssueSetToPlain(plain, issues) {
  let next = String(plain || '');
  let floor = next.length + 1;
  const applied = [];
  let skipped = 0;
  const canShareBoundary = issue =>
    issue && issue.subtype === 'punctuation' &&
    issue.start < floor && issue.end === floor + 1;
  issues.slice().sort((a, b) => (b.start - a.start) || (b.end - a.end)).forEach(issue => {
    if ((issue.end > floor && !canShareBoundary(issue)) || next.slice(issue.start, issue.end) !== issue.excerpt) {
      skipped += 1;
      return;
    }
    next = next.slice(0, issue.start) + String(issue.replacement) + next.slice(issue.end);
    floor = issue.start;
    applied.push(issue);
  });
  return { text: mfAssistNormalizePlain(next), applied: applied.reverse(), skipped };
}

function mfAssistApplySafeIssues() {
  if (!mfLastAssist) return;
  const issues = mfAssistSafeIssues(mfLastAssist);
  if (!issues.length) { toast('No safe fixes available'); return; }
  const beforeHtml = editorEl.innerHTML;
  const isSelection = mfLastAssist.editorScope === 'selection';
  const beforePlain = isSelection ? mfAssistSelectionText() : getDraftPlain();
  if (isSelection && (!beforePlain || !editorRangeIsUsable(editorSavedRange))) {
    toast('Selection lost - select text again');
    return;
  }
  const result = mfAssistApplyIssueSetToPlain(beforePlain, issues);
  if (!result.applied.length || result.text === beforePlain.trim()) {
    toast(result.skipped ? 'Re-run Assist check' : 'No safe changes applied');
    return;
  }
  mfAssistApplyingFix = true;
  try {
    if (isSelection) {
      if (!replaceSavedEditorSelectionWithPlainText(result.text)) {
        toast('Selection lost - select text again');
        return;
      }
      mfAssistScope = 'draft';
    } else {
      editorEl.innerHTML = plainToEditorHtml(result.text);
    }
    mfActiveIssueId = null;
    refreshAll();
    save();
  } finally {
    mfAssistApplyingFix = false;
  }
  mfAssistSetUndoState({
    beforeHtml,
    afterHtml: editorEl.innerHTML,
    issueCount: result.applied.length,
    label: 'safe Assist fixes',
    appliedAt: Date.now()
  });
  toast(`Applied ${result.applied.length} safe fix${result.applied.length === 1 ? '' : 'es'} - Undo available`);
}

function mfAssistUseRewrite(rewrite) {
  const text = String(rewrite?.text || '').trim();
  if (!text) {
    toast('Rewrite preview empty');
    return;
  }
  const beforeHtml = editorEl.innerHTML;
  const isSelection = mfLastAssist?.editorScope === 'selection';
  if (isSelection) {
    if (!replaceSavedEditorSelectionWithPlainText(text)) {
      toast('Selection lost - select text again');
      return;
    }
    mfAssistScope = 'draft';
  } else {
    editorEl.innerHTML = plainToEditorHtml(text);
  }
  mfActiveIssueId = null;
  refreshAll();
  save();
  mfAssistSetUndoState({
    beforeHtml,
    afterHtml: editorEl.innerHTML,
    rewriteId: rewrite.id,
    issueCount: rewrite.changes || 0,
    label: `${rewrite.title || 'Assist'} rewrite`,
    appliedAt: Date.now()
  });
  toast('Rewrite inserted - Undo available');
}

/* ---- summary detail rows ---- */
function mfAssistRowHtml(title, note, pct) {
  return `<div class="mf-assist-row">
    <div class="mf-assist-row-head">
      <span class="mf-assist-row-title">${escHtml(title)}</span>
    </div>
    <div class="mf-assist-row-note">${escHtml(note)}</div>
    ${pct != null ? `<div class="mf-assist-row-meter"><span class="mf-assist-row-fill" style="width:${Math.max(0,Math.min(100,Math.round(pct)))}%"></span></div>` : ''}
  </div>`;
}

function renderPingAssistRows(result) {
  const el = document.getElementById('mfAssistRows');
  if (!el) return;
  if (!result) { el.innerHTML = ''; return; }
  const { issues = [], tone = {}, clarity = {}, quality = {} } = result;
  const comps = Object.values(clarity.components || {}).sort((a, b) => b.score - a.score);
  const topComp = comps.find(c => c.score > 0);
  const grammarCount = issues.filter(i => i.category === 'grammar').length;
  const toneCount    = issues.filter(i => i.category === 'tone').length;
  const rows = [];
  rows.push(
    mfAssistRowHtml('Writing score',
      `${quality.state || 'Pending'} · ${quality.score ?? 0}% · ${quality.nextAction || 'Review draft'}`,
      quality.score ?? 0),
    mfAssistRowHtml('Reading load',
      `${clarity.readability || 'Good'} · grade ${clarity.grade ?? '--'} · ${clarity.avgSentenceLength ?? '--'} words/sentence`,
      Math.min(100, (clarity.grade || 0) * 7)),
    mfAssistRowHtml('Clarity priority',
      topComp ? topComp.recommendation : 'No clarity pressure detected.',
      topComp ? topComp.impact : 0),
    mfAssistRowHtml('Voice pressure',
      `${tone.primary || 'Neutral'} · ${tone.risk || 'Low'} tone load · ${tone.apologyCount ?? 0} apolog${tone.apologyCount !== 1 ? 'ies' : 'y'}, ${tone.roboticCount ?? 0} robotic phrase${tone.roboticCount !== 1 ? 's' : ''}`,
      tone.score ?? 0),
    mfAssistRowHtml('Grammar signals',
      `${grammarCount} phrase-level match${grammarCount !== 1 ? 'es' : ''} from ${result.rules?.active?.filter(r => r.category === 'grammar').length ?? 0} active grammar rules`,
      Math.min(100, grammarCount * 24)),
    mfAssistRowHtml('Tone signals',
      `${toneCount} voice signal${toneCount !== 1 ? 's' : ''} detected`,
      tone.score ?? 0)
  );
  el.innerHTML = rows.join('');
}

/* ---- protected spans list ---- */
function renderPingAssistSpans(result) {
  const el   = document.getElementById('mfAssistSpansList');
  const lbl  = document.getElementById('mfAssistSpansLabel');
  if (!el) return;
  const spans = result?.protectedSpans || [];
  if (lbl) lbl.textContent = `Protected tokens${spans.length ? ' · ' + spans.length : ''}`;
  if (!spans.length) {
    el.innerHTML = '<div class="mf-assist-empty" style="padding:8px 0">No protected tokens detected.</div>';
    return;
  }
  el.innerHTML = spans.map(s =>
    `<div class="mf-assist-span-row">
      <span class="mf-assist-span-type">${escHtml(s.type)}</span>
      <span class="mf-assist-span-text">${escHtml(s.text)}</span>
    </div>`
  ).join('');
}

/* ---- rule controls ---- */
function renderPingAssistRules() {
  const el = document.getElementById('mfAssistRuleList');
  if (!el || typeof window.MirrorFlowAssistEngine === 'undefined') return;
  const eng = window.MirrorFlowAssistEngine;
  el.innerHTML = eng.rules.map(rule => {
    const disabled = eng.isRuleDisabled(rule.id);
    const catLabel = { grammar:'Grammar', clarity:'Clarity', tone:'Tone' }[rule.category] || rule.category;
    return `<div class="mf-assist-rule-card" data-disabled="${disabled}">
      <div class="mf-assist-rule-info">
        <div class="mf-assist-rule-label">${escHtml(rule.label)}</div>
        <div class="mf-assist-rule-meta">${catLabel} · ${rule.severity} · ${Math.round((rule.confidence || 0) * 100)}%</div>
      </div>
      <button class="mf-assist-rule-switch" type="button"
        data-rule-toggle="${escAttr(rule.id)}"
        aria-pressed="${!disabled}"
        title="${disabled ? 'Enable' : 'Disable'} rule"></button>
    </div>`;
  }).join('');
}

function renderPingAssistProfilePresets() {
  const el = document.getElementById('mfAssistProfilePresets');
  const label = document.getElementById('mfAssistProfileLabel');
  if (!el || typeof window.MirrorFlowAssistEngine === 'undefined') return;
  const eng = window.MirrorFlowAssistEngine;
  const presets = typeof eng.getProfilePresets === 'function' ? eng.getProfilePresets() : [];
  const profile = typeof eng.exportProfile === 'function' ? eng.exportProfile() : {};
  const activePresetId = profile.presetId || (!((profile.disabledRuleIds || []).length) ? 'balanced' : 'custom');
  if (label) label.textContent = profile.name ? `Profiles · ${profile.name}` : 'Profiles';
  if (!presets.length) {
    el.innerHTML = '<div class="mf-assist-empty" style="padding:8px 0">No profile presets available.</div>';
    return;
  }
  el.innerHTML = presets.map(preset => {
    const active = activePresetId === preset.id;
    return `<button class="mf-assist-profile-btn" type="button"
      data-profile-preset="${escAttr(preset.id)}"
      data-active="${active}"
      title="${escAttr(preset.note)}">
      <strong>${escHtml(preset.name)}</strong>
      <span>${escHtml(preset.activeRuleCount)} on · ${escHtml(preset.disabledRuleCount)} off</span>
    </button>`;
  }).join('');
}

function mfAssistSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function mfAssistBuildDiagnosticsPayload() {
  if (typeof window.MirrorFlowAssistEngine === 'undefined') return null;
  const eng = window.MirrorFlowAssistEngine;
  mfAssistLastTestReport = mfAssistLastTestReport || eng.runRuleTests();
  return {
    app: 'MirrorFlow Ping',
    exportedAt: new Date().toISOString(),
    contract: eng.contract,
    ruleProfile: eng.exportProfile(),
    testReport: mfAssistLastTestReport
  };
}

function renderPingAssistDiagnostics(report) {
  if (typeof window.MirrorFlowAssistEngine === 'undefined') return;
  const eng = window.MirrorFlowAssistEngine;
  const box = document.getElementById('mfAssistDiagnostics');
  if (!box) return;
  const r = report || mfAssistLastTestReport || eng.runRuleTests();
  mfAssistLastTestReport = r;
  const profile = eng.exportProfile();
  const validation = profile.validation || {};
  const disabledCount = Array.isArray(profile.disabledRuleIds) ? profile.disabledRuleIds.length : 0;
  const activeRuleCount = Array.isArray(profile.activeRuleIds) ? profile.activeRuleIds.length : Math.max(0, eng.rules.length - disabledCount);
  const warnings = Array.isArray(validation.warnings) ? validation.warnings : [];
  const failures = (r.results || []).filter(result => !result.skipped && !result.passed);
  const profileState = profile.valid === false ? 'invalid' : (validation.status || 'valid');
  const uiState = failures.length ? 'fail' : profileState === 'warning' ? 'warn' : profileState === 'invalid' ? 'fail' : 'pass';

  mfAssistSetText('mfAssistDiagStatus', failures.length ? 'Rule tests failing' : profileState === 'warning' ? 'Profile warnings' : 'Rule tests passing');
  mfAssistSetText('mfAssistDiagPill', failures.length ? `${failures.length} fail` : uiState === 'warn' ? 'Warn' : 'Pass');
  mfAssistSetText('mfAssistDiagTests', `${r.passed || 0}/${r.active || 0}`);
  mfAssistSetText('mfAssistDiagRules', `${activeRuleCount}/${eng.rules.length}`);
  mfAssistSetText('mfAssistDiagDisabled', String(disabledCount));
  mfAssistSetText('mfAssistDiagProfile', profileState === 'warning' ? 'Warn' : profileState === 'invalid' ? 'Invalid' : 'Valid');

  const pill = document.getElementById('mfAssistDiagPill');
  if (pill) pill.dataset.state = uiState;

  const note = document.getElementById('mfAssistDiagNote');
  if (note) {
    const skipped = r.skipped || 0;
    if (failures.length) {
      note.textContent = `${failures.length} active test${failures.length === 1 ? '' : 's'} failing. ${skipped} skipped by disabled rules.`;
    } else if (warnings.length) {
      note.textContent = `${r.passed || 0} active tests passing. Profile has ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`;
    } else {
      note.textContent = `${r.passed || 0} active tests passing. ${skipped} skipped by disabled rules.`;
    }
  }

  const failBox = document.getElementById('mfAssistDiagFailures');
  if (failBox) {
    const rows = failures.length ? failures.slice(0, 4) : warnings.slice(0, 4).map((warning, idx) => ({
      id: `W-${idx + 1}`,
      ruleId: 'profile.warning',
      detail: warning
    }));
    failBox.dataset.show = rows.length ? 'true' : 'false';
    failBox.innerHTML = rows.map(row => {
      const detail = row.detail || `matched ${row.matched || 0}; expected ${row.expectedReplacement == null ? 'issue' : row.expectedReplacement}`;
      return `<div class="mf-assist-diag-failure">
        <strong>${escHtml(row.id)} · ${escHtml(row.ruleId)}</strong>
        <span>${escHtml(detail)}</span>
      </div>`;
    }).join('');
  }
}

function mfAssistInvalidateDiagnostics() {
  mfAssistLastTestReport = null;
  renderPingAssistDiagnostics();
}

function mfAssistRunTests() {
  if (typeof window.MirrorFlowAssistEngine === 'undefined') return;
  mfAssistLastTestReport = window.MirrorFlowAssistEngine.runRuleTests();
  renderPingAssistDiagnostics(mfAssistLastTestReport);
  toast(mfAssistLastTestReport.failed ? 'Rule tests failing' : 'Rule tests passing');
}

async function mfAssistCopyDiagnosticsReport() {
  const payload = mfAssistBuildDiagnosticsPayload();
  if (!payload || !navigator.clipboard?.writeText) { toast('Copy failed - clipboard blocked'); return; }
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast('Diagnostics copied');
  } catch (_) {
    toast('Copy failed - clipboard blocked');
  }
}

function mfAssistDownloadDiagnosticsReport() {
  const payload = mfAssistBuildDiagnosticsPayload();
  if (!payload) return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mirrorflow-ping-assist-diagnostics.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 300);
  toast('Diagnostics exported');
}

/* ---- analysis export ---- */
function mfAssistExportJson() {
  if (typeof window.MirrorFlowAssistEngine === 'undefined') return;
  const eng = window.MirrorFlowAssistEngine;
  const text = getDraftPlain();
  const analysis = mfLastAssist || eng.analyzeText(text, { surface: 'ping_assist', mode: 'writing_only' });
  const payload = {
    app: 'MirrorFlow Ping',
    exportedAt: new Date().toISOString(),
    contract: eng.contract,
    ruleProfile: eng.exportProfile(),
    text,
    analysis
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mirrorflow-assist-analysis.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 300);
  toast('Analysis exported');
}

function mfAssistExportProfile() {
  if (typeof window.MirrorFlowAssistEngine === 'undefined') return;
  const payload = {
    app: 'MirrorFlow Ping', exportedAt: new Date().toISOString(),
    contract: window.MirrorFlowAssistEngine.contract,
    ruleProfile: window.MirrorFlowAssistEngine.exportProfile()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mirrorflow-assist-rule-profile.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 300);
  toast('Profile exported');
}

function mfAssistImportProfile(file) {
  if (!file || typeof window.MirrorFlowAssistEngine === 'undefined') return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || '{}'));
      const v = window.MirrorFlowAssistEngine.importProfile(data);
      if (!v.valid) { toast('Invalid profile — ' + (v.errors[0] || 'unknown error')); return; }
      mfAssistLastTestReport = null;
      renderPingAssistRules();
      renderPingAssistProfilePresets();
      renderPingAssist();
      save();
      toast(v.status === 'warning' ? 'Profile loaded with warnings' : 'Rule profile loaded');
    } catch (_) { toast('Invalid profile JSON'); }
  };
  reader.readAsText(file);
}

function mfAssistResetProfile() {
  if (typeof window.MirrorFlowAssistEngine === 'undefined') return;
  window.MirrorFlowAssistEngine.resetProfile();
  mfAssistLastTestReport = null;
  renderPingAssistRules();
  renderPingAssistProfilePresets();
  renderPingAssist();
  save();
  toast('Profile reset to default');
}

function mfAssistApplyProfilePreset(id) {
  if (!id || typeof window.MirrorFlowAssistEngine === 'undefined') return;
  const eng = window.MirrorFlowAssistEngine;
  if (typeof eng.applyProfilePreset !== 'function') return;
  const result = eng.applyProfilePreset(id);
  if (!result || !result.valid) {
    toast('Profile preset failed');
    return;
  }
  mfAssistLastTestReport = null;
  renderPingAssistRules();
  renderPingAssistProfilePresets();
  renderPingAssist();
  save();
  toast('Profile set: ' + (result.profile?.name || id));
}

/* ---- collapsible section toggle ---- */
document.querySelectorAll('[data-section-toggle]').forEach(btn => {
  btn.addEventListener('click', () => {
    const sec = document.getElementById(btn.dataset.sectionToggle);
    if (!sec) return;
    const isOpen = sec.dataset.open === 'true';
    sec.dataset.open = isOpen ? 'false' : 'true';
  });
});

/* ---- rule toggle delegation ---- */
document.getElementById('mfAssistRuleList').addEventListener('click', e => {
  const btn = e.target.closest('[data-rule-toggle]');
  if (!btn || typeof window.MirrorFlowAssistEngine === 'undefined') return;
  const id = btn.dataset.ruleToggle;
  const eng = window.MirrorFlowAssistEngine;
  const wasDisabled = eng.isRuleDisabled(id);
  if (wasDisabled) eng.enableRule(id); else eng.disableRule(id);
  mfAssistLastTestReport = null;
  renderPingAssistRules();
  renderPingAssistProfilePresets();
  renderPingAssist();
  save();
  toast(wasDisabled ? 'Rule enabled' : 'Rule disabled');
});

document.getElementById('mfAssistProfilePresets')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-profile-preset]');
  if (!btn) return;
  mfAssistApplyProfilePreset(btn.dataset.profilePreset);
});

/* ---- action buttons ---- */
document.getElementById('mfAssistScopeToggle')?.addEventListener('click', () => {
  setAssistScope(mfAssistActiveScope() === 'selection' ? 'draft' : 'selection');
});
document.getElementById('mfAssistExportJson').addEventListener('click', mfAssistExportJson);
document.getElementById('mfAssistExportProfile').addEventListener('click', mfAssistExportProfile);
document.getElementById('mfAssistResetProfile').addEventListener('click', mfAssistResetProfile);
document.getElementById('mfAssistImportProfile').addEventListener('click', () =>
  document.getElementById('mfAssistProfileInput').click());
document.getElementById('mfAssistProfileInput').addEventListener('change', e => {
  mfAssistImportProfile(e.target.files && e.target.files[0]);
  e.target.value = '';
});

const mfAssistDiagnosticsToggle = document.getElementById('mfAssistDiagnosticsToggle');
if (mfAssistDiagnosticsToggle) {
  mfAssistDiagnosticsToggle.addEventListener('click', () => {
    const box = document.getElementById('mfAssistDiagnostics');
    if (!box) return;
    const nextOpen = box.dataset.open !== 'true';
    setAssistDiagnosticsOpen(nextOpen);
    save();
  });
}
document.getElementById('mfAssistRunTests')?.addEventListener('click', mfAssistRunTests);
document.getElementById('mfAssistCopyReport')?.addEventListener('click', mfAssistCopyDiagnosticsReport);
document.getElementById('mfAssistDownloadReport')?.addEventListener('click', mfAssistDownloadDiagnosticsReport);
document.getElementById('mfAssistApplySafe')?.addEventListener('click', mfAssistApplySafeIssues);
document.getElementById('mfAssistUndoApply')?.addEventListener('click', () => {
  if (!mfAssistLastApply) return;
  mfAssistRestoringUndo = true;
  editorEl.innerHTML = mfAssistLastApply.beforeHtml;
  mfAssistRestoringUndo = false;
  mfAssistSetUndoState(null);
  mfActiveIssueId = null;
  refreshAll();
  save();
  toast('Assist fix undone');
});

/* filter bar */
document.getElementById('mfAssistFilterBar').addEventListener('click', e => {
  const btn = e.target.closest('.mf-assist-filter-btn');
  if (!btn) return;
  mfAssistFilter = btn.dataset.filter || 'all';
  document.querySelectorAll('.mf-assist-filter-btn').forEach(b =>
    b.classList.toggle('is-active', b === btn));
  renderPingAssistCards(mfLastAssist);
});

async function mfAssistCopySuggestion(text) {
  const value = String(text || '').trim();
  if (!value) return;
  if (!navigator.clipboard?.writeText) {
    toast('Copy failed - clipboard blocked');
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    toast('Suggestion copied');
  } catch (_) {
    toast('Copy failed - clipboard blocked');
  }
}

function mfAssistRewriteById(id) {
  return (mfLastAssist?.rewrites || []).find(item => item && item.id === id);
}

function mfAssistRewriteEditor(id) {
  return document.getElementById('mfAssistRewritePanel')
    ?.querySelector(`[data-rewrite-edit="${id}"]`) || null;
}

function mfAssistRewriteText(id) {
  const el = mfAssistRewriteEditor(id);
  return String((el?.innerText ?? el?.textContent) || '').trim();
}

function mfAssistSetRewriteEditedState(el) {
  if (!el) return;
  const rewrite = mfAssistRewriteById(el.dataset.rewriteEdit);
  const card = el.closest('.mf-assist-rewrite-card');
  if (!rewrite || !card) return;
  card.dataset.edited = String(String(el.innerText || el.textContent || '').trim() !== String(rewrite.text || '').trim());
}

document.getElementById('mfAssistRewritePanel')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const rewrite = mfAssistRewriteById(btn.dataset.rewriteId);
  if (!rewrite) return;
  const editedText = mfAssistRewriteText(rewrite.id);
  if (btn.dataset.action === 'copy-rewrite') {
    if (!editedText) { toast('Rewrite preview empty'); return; }
    mfAssistCopySuggestion(editedText);
  } else if (btn.dataset.action === 'use-rewrite') {
    mfAssistUseRewrite({ ...rewrite, text: editedText });
  } else if (btn.dataset.action === 'save-rewrite') {
    const note = saveSideNote(editedText, { focus: false });
    if (note) toast('Rewrite saved to notes');
    else toast('Rewrite preview empty');
  } else if (btn.dataset.action === 'reset-rewrite') {
    const el = mfAssistRewriteEditor(rewrite.id);
    if (el) {
      el.textContent = rewrite.text;
      mfAssistSetRewriteEditedState(el);
      toast('Preview reset');
    }
  }
});

document.getElementById('mfAssistRewritePanel')?.addEventListener('input', e => {
  const el = e.target.closest('[data-rewrite-edit]');
  mfAssistSetRewriteEditedState(el);
});

/* card actions + click-to-focus */
document.getElementById('mfAssistCardList').addEventListener('click', e => {
  const btn  = e.target.closest('[data-action]');
  const card = e.target.closest('.mf-assist-card[data-issue-id]');

  if (btn) {
    if (btn.dataset.action === 'apply') {
      const issue = mfLastAssist?.issues.find(i => i.id === btn.dataset.issueId);
      if (issue) {
        const beforeHtml = editorEl.innerHTML;
        let applied = false;
        mfAssistApplyingFix = true;
        try {
          applied = applyAssistByOffset(issue);
        } finally {
          mfAssistApplyingFix = false;
        }
        if (applied) {
          mfAssistSetUndoState({
            beforeHtml,
            afterHtml: editorEl.innerHTML,
            issueId: issue.id,
            ruleId: issue.ruleId,
            label: issue.label,
            appliedAt: Date.now()
          });
          mfActiveIssueId = null;
          toast('Fix applied - Undo available');
        }
      }
    } else if (btn.dataset.action === 'ignore') {
      mfAssistIgnore.add(btn.dataset.ruleId + ':' + btn.dataset.excerpt);
      if (mfActiveIssueId === card?.dataset.issueId) mfActiveIssueId = null;
      renderPingAssistCards(mfLastAssist);
      renderPingAssistSummary(mfLastAssist);
      save();
    } else if (btn.dataset.action === 'ignore-rule') {
      const eng = window.MirrorFlowAssistEngine;
      if (!eng?.disableRule(btn.dataset.ruleId)) {
        toast('Rule not found');
        return;
      }
      mfAssistLastTestReport = null;
      mfActiveIssueId = null;
      renderPingAssistRules();
      renderPingAssist();
      save();
      toast('Rule disabled');
    } else if (btn.dataset.action === 'copy') {
      mfAssistCopySuggestion(btn.dataset.replacement || '');
    }
    return;
  }

  /* click anywhere on card (not a button) → focus in editor */
  if (card) focusPingIssue(card.dataset.issueId);
});

/* clear ignored */
document.getElementById('mfAssistClearIgnored').addEventListener('click', () => {
  mfAssistIgnore.clear();
  renderPingAssist();
  save();
  toast('Ignored issues restored');
});
