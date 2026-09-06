/* Ping · insights-render
 * Split out of apps/ping.html. These files are classic scripts, not modules:
 * top-level bindings are shared across them, so LOAD ORDER IS THE CONTRACT.
 * The order is fixed in ping.html and must not be rearranged.
 */

/* ========== INSIGHTS RENDER + DOM WIRING ========== */
function mfReadinessLabel(score) {
  if (score >= 84) return 'Ready';
  if (score >= 68) return 'Needs polish';
  if (score >= 45) return 'Needs work';
  return 'Hold';
}

function mfSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function mfRenderRows(containerId, rows, options) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'mf-empty-insight';
    empty.textContent = (options && options.empty) || 'No active signals.';
    container.appendChild(empty);
    return;
  }
  rows.forEach(row => {
    const wrap = document.createElement('div');
    wrap.className = (options && options.kind) || 'mf-engine-row';
    if (row.severity) wrap.dataset.severity = row.severity;
    const dot = document.createElement('span');
    dot.className = 'mf-engine-dot';
    const body = document.createElement('div');
    const title = document.createElement('b');
    title.textContent = row.label;
    const meta = document.createElement('span');
    meta.textContent = row.note || row.coach || row.value || '';
    body.appendChild(title);
    body.appendChild(meta);
    if (row.insert) {
      const btn = document.createElement('button');
      btn.className = 'mf-insert-btn';
      btn.type = 'button';
      btn.dataset.insightInsert = row.insert;
      btn.textContent = 'Insert';
      body.appendChild(btn);
    }
    wrap.appendChild(dot);
    wrap.appendChild(body);
    container.appendChild(wrap);
  });
}

function mfRenderDriverRows(containerId, rows, emptyText) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!rows || !rows.length) {
    const empty = document.createElement('div');
    empty.className = 'mf-driver-empty';
    empty.textContent = emptyText || 'No driver evidence yet.';
    container.appendChild(empty);
    return;
  }
  rows.forEach(row => {
    const wrap = document.createElement('div');
    wrap.className = 'mf-driver-row';

    const body = document.createElement('div');
    const title = document.createElement('b');
    title.textContent = row.label;
    const note = document.createElement('small');
    note.textContent = row.note || '';
    body.appendChild(title);
    body.appendChild(note);

    if (row.tags && row.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'mf-driver-tags';
      row.tags.slice(0, 6).forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'mf-driver-tag';
        chip.textContent = tag;
        tags.appendChild(chip);
      });
      body.appendChild(tags);
    }

    const score = document.createElement('span');
    score.className = 'mf-driver-score';
    score.textContent = Math.round(row.score || 0) + '%';

    const bar = document.createElement('div');
    bar.className = 'mf-driver-bar';
    bar.style.setProperty('--driver-w', Math.max(0, Math.min(100, row.score || 0)) + '%');
    const fill = document.createElement('span');
    bar.appendChild(fill);

    wrap.appendChild(body);
    wrap.appendChild(score);
    wrap.appendChild(bar);
    container.appendChild(wrap);
  });
}

function mfBuildAssistDriverRows() {
  const text = getDraftPlain().trim();
  if (!text || !window.MirrorFlowAssistEngine || typeof window.MirrorFlowAssistEngine.analyzeText !== 'function') return [];
  try {
    const analysis = window.MirrorFlowAssistEngine.analyzeText(text, { surface: 'ping_drivers', mode: 'writing_only' });
    const issues = analysis.issues || [];
    const grammar = issues.filter(issue => issue.category === 'grammar').length;
    const clarity = issues.filter(issue => issue.category === 'clarity').length;
    const tone = issues.filter(issue => issue.category === 'tone').length;
    const rows = [
      {
        label: 'Writing health',
        note: `${issues.length} active writing issue${issues.length === 1 ? '' : 's'}`,
        score: Math.max(0, 100 - issues.length * 12),
        tags: ['Assist', 'grammar', 'clarity', 'tone']
      },
      {
        label: 'Readability',
        note: `${analysis.clarity.readability} · grade ${analysis.clarity.grade} · ${analysis.clarity.avgSentenceLength} words/sentence`,
        score: analysis.clarity.quality,
        tags: ['Assist', 'clarity']
      },
      {
        label: 'Tone load',
        note: `${analysis.tone.primary} · ${analysis.tone.risk} · ${tone} tone signal${tone === 1 ? '' : 's'}`,
        score: Math.max(0, 100 - analysis.tone.score),
        tags: ['Assist', 'tone']
      },
      {
        label: 'Grammar rules',
        note: `${grammar} grammar match${grammar === 1 ? '' : 'es'} · ${analysis.rules.active.filter(rule => rule.category === 'grammar').length} active rules`,
        score: Math.max(0, 100 - grammar * 20),
        tags: ['Assist', 'grammar']
      }
    ];
    issues.slice(0, 4).forEach(issue => {
      rows.push({
        label: issue.label,
        note: issue.message,
        score: issue.severity === 'high' ? 30 : issue.severity === 'medium' ? 55 : 76,
        tags: ['Assist', issue.category, issue.severity]
      });
    });
    return rows;
  } catch (_) {
    return [];
  }
}

function mfBuildBackendDriverRows(result) {
  const text = getDraftPlain().trim();
  const assistReady = Boolean(window.MirrorFlowAssistEngine?.analyzeText);
  const insightsReady = typeof window.MF_runPingUniversalEngine === 'function';
  const assistIssues = mfLastAssist?.issues?.length ?? 0;
  const rewriteCount = mfLastAssist?.rewrites?.length ?? 0;
  const sourceMode = result?.sourceMode || (text ? 'draft_only' : 'blank');
  const state = result?.responseState?.code || 'pending';
  const failedDomainChecks = result?.domainChecks?.failed?.length ?? 0;
  const rows = [
    {
      label: '/health adapter',
      note: assistReady && insightsReady ? 'Assist, Insights, rule health, and offline readiness can be checked locally.' : 'One or more local engines are not ready.',
      score: assistReady && insightsReady ? 92 : 40,
      tags: ['API', 'health', 'readiness']
    },
    {
      label: '/check adapter',
      note: assistReady ? `${assistIssues} issue${assistIssues === 1 ? '' : 's'} · ${rewriteCount} rewrite${rewriteCount === 1 ? '' : 's'} ready for API shape.` : 'Assist engine not ready.',
      score: assistReady ? 92 : 0,
      tags: ['API', 'Assist', 'writing']
    },
    {
      label: '/insights adapter',
      note: insightsReady ? `${sourceMode} · response ${state}.` : 'Insights engine not ready.',
      score: insightsReady ? 88 : 0,
      tags: ['API', 'Insights', sourceMode]
    },
    {
      label: '/drivers adapter',
      note: 'Assist evidence, Insights proof, backend proof, and diagnostics are separated for API handoff.',
      score: assistReady && insightsReady ? 88 : 40,
      tags: ['API', 'Drivers', 'proof']
    },
    {
      label: '/policy adapter',
      note: failedDomainChecks ? `${failedDomainChecks} domain policy warning${failedDomainChecks === 1 ? '' : 's'} can be surfaced before send.` : 'Domain, risk language, and tenant phrase checks can run before send.',
      score: assistReady && insightsReady ? (failedDomainChecks ? 76 : 86) : 40,
      tags: ['API', 'Policy', 'pre-send']
    },
    {
      label: '/feedback adapter',
      note: 'Apply, ignore, copy, send, undo, profile, and note events have a normalized learning-signal shape.',
      score: 84,
      tags: ['API', 'Feedback', 'learning']
    },
    {
      label: '/session adapter',
      note: 'Assist, Insights, Drivers, optional Policy, and optional Feedback can be composed into one session envelope.',
      score: assistReady && insightsReady ? 86 : 40,
      tags: ['API', 'Session', 'integration']
    },
    {
      label: 'Offline shell',
      note: 'Runtime stays local: no stylesheet links, script sources, imports, fetches, or token requests.',
      score: 96,
      tags: ['offline', 'portable', 'self-contained']
    }
  ];
  return rows;
}

function renderInsightGuidanceCue(result) {
  if (!result) return;
  const cue = mfBuildCoachModel(result);
  mfSetText('mfInsightCueTitle', cue.headline);
  mfSetText('mfInsightCueWhy', cue.why);
  mfSetText('mfInsightCueMove', cue.tryLabel);
  mfSetText('mfInsightCueText', cue.tryText);
  const btn = document.getElementById('mfInsightCueInsert');
  if (btn) {
    btn.dataset.insightInsert = cue.tryInsert || '';
    btn.disabled = !cue.tryInsert;
    btn.textContent = cue.tryInsert ? 'Insert move' : 'No insert yet';
  }
}

function renderPingDrivers(result) {
  if (!result || !result.drivers) return;
  const d = result.drivers;
  const assistRows = mfBuildAssistDriverRows();
  const backendRows = mfBuildBackendDriverRows(result);
  const insightRowCount = [
    d.domainRows,
    d.intentRows,
    d.signalRows,
    d.coverageRows,
    d.adviceRows
  ].reduce((sum, rows) => sum + ((rows || []).length), 0);
  mfSetText('mfDriverMode', result.domain.label);
  mfSetText('mfDriverMeta', d.metrics.highGapCount
    ? d.metrics.highGapCount + ' high-priority driver' + (d.metrics.highGapCount === 1 ? '' : 's')
    : d.state.source + ' · ' + d.metrics.gapCount + ' active driver' + (d.metrics.gapCount === 1 ? '' : 's'));
  mfSetText('mfDriverAssistCount', assistRows.length + ' row' + (assistRows.length === 1 ? '' : 's'));
  mfSetText('mfDriverInsightCount', insightRowCount + ' row' + (insightRowCount === 1 ? '' : 's'));
  mfSetText('mfDriverBackendCount', backendRows.length + ' row' + (backendRows.length === 1 ? '' : 's'));
  mfSetText('mfDriverSourceMode', (result.sourceMode || d.state.source || 'blank').replace(/_/g, ' '));
  mfSetText('mfDriverStateCode', d.state.response);
  mfSetText('mfDriverDomain', d.state.domain);
  mfSetText('mfDriverIntent', d.state.intent);
  mfSetText('mfDriverSendState', d.state.send);
  mfRenderDriverRows('mfDomainDrivers', d.domainRows, 'No classification evidence yet.');
  mfRenderDriverRows('mfAssistDrivers', assistRows, 'No Assist evidence yet.');
  mfRenderDriverRows('mfBackendDrivers', backendRows, 'No backend proof yet.');
  mfRenderDriverRows('mfIntentDrivers', d.intentRows, 'No intent evidence yet.');
  mfRenderDriverRows('mfSignalDrivers', d.signalRows, 'No pressure signals found.');
  mfRenderDriverRows('mfCoverageDrivers', d.coverageRows, 'No coverage map yet.');
  mfRenderDriverRows('mfAdviceDrivers', d.adviceRows, 'No advice causes found.');
}

function renderPingInsights() {
  activeInsightMode = 'auto';
  const customerContext = getCustomerContextText();
  const result = MF_runPingUniversalEngine(customerContext, getDraftPlain(), activeInsightMode);
  const draftOnly = result.sourceMode === 'draft_only';
  const responseState = result.responseState || { code: 'blocked', label: 'Blocked', score: 0, reason: 'No response state available.', severity: 'high' };
  window.MF_PING_LAST_ENGINE = result;
  renderPingDrivers(result);
  renderInsightGuidanceCue(result);

  mfSetText('mfDetectedMode', result.domain.label);
  mfSetText('mfDetectedMeta', (draftOnly ? 'Draft-only · ' : '') + result.domain.confidence + '% · ' + result.query.label);
  mfSetText('mfModeBadge', draftOnly ? 'Draft' : 'Detected');
  mfSetText('mfDomainLabel', result.domain.label);
  mfSetText('mfDomainMeta', result.domain.forced
    ? 'Forced mode. ' + result.domain.summary
    : result.domain.confidence + '% confidence. ' + (result.domain.hits.length ? 'Signals: ' + result.domain.hits.join(', ') : result.domain.summary));
  const stateCard = document.getElementById('mfResponseStateCard');
  if (stateCard) stateCard.dataset.responseState = responseState.code;
  const briefStateCard = document.getElementById('mfBriefStateCard');
  if (briefStateCard) briefStateCard.dataset.responseState = responseState.code;
  mfSetText('mfReadyScore', result.reply.hasDraft ? responseState.score + '%' : '--');
  mfSetText('mfReadyLabel', responseState.label);
  const readyBar = document.getElementById('mfReadyBar');
  if (readyBar) readyBar.style.width = responseState.score + '%';
  mfSetText('mfBriefPriority', result.brief.priority);
  mfSetText('mfBriefWhy', result.brief.why);
  mfSetText('mfBriefMove', result.brief.move);
  mfSetText('mfBriefProof', result.brief.proof);
  mfSetText('mfBriefConfidence', result.brief.confidence + '%');
  mfSetText('mfBriefSendState', result.brief.sendState);
  mfSetText('mfQueryType', result.query.label);
  mfSetText('mfQueryMeta', result.query.need);
  mfSetText('mfPassRead', result.signals.rows.length
    ? result.signals.rows.slice(0, 2).map(s => s.label).join(', ') + ' detected.'
    : draftOnly ? 'Draft is being read directly.' : result.query.label + ' in ' + result.domain.label.toLowerCase() + '.');
  mfSetText('mfPassReadState', result.signals.load >= 30 ? 'Loaded' : 'Stable');
  mfSetText('mfPassWrite', result.reply.hasDraft
    ? draftOnly
      ? responseState.label + ' · writing read.'
      : responseState.label + ' · coverage ' + result.reply.coverage.score + '%.'
    : 'No draft to evaluate.');
  mfSetText('mfPassWriteState', result.reply.hasDraft ? responseState.score + '%' : '--');
  const highGapCount = result.gaps.filter(g => g.severity === 'high').length;
  mfSetText('mfPassAudit', highGapCount
    ? highGapCount + ' high-priority issue' + (highGapCount === 1 ? '' : 's') + ' before send.'
    : (responseState.reason || (result.gaps.length ? result.gaps.length + ' polish item' + (result.gaps.length === 1 ? '' : 's') + '.' : 'No blocking gaps.')));
  mfSetText('mfPassAuditState', responseState.label);

  const signalRows = result.signals.rows.slice(0, 4).map(signal => ({
    label: signal.label,
    note: signal.coach + (signal.hits.length ? ' Hits: ' + signal.hits.slice(0, 3).join(', ') : '')
  }));
  mfRenderRows('mfSignalList', signalRows, { empty: draftOnly ? 'No strong writing signal detected.' : 'No strong customer signal detected.', kind: 'mf-engine-row' });

  const stateRow = {
    label: 'State: ' + responseState.label,
    note: responseState.reason + (responseState.next ? ' Next: ' + responseState.next : ''),
    severity: responseState.severity || 'medium'
  };
  const domainCheckRows = result.domainChecks && result.domainChecks.active
    ? result.domainChecks.checks.map(check => ({
        label: check.label,
        value: check.passed ? 'Pass' : 'Gap',
        note: check.note,
        severity: check.passed ? 'low' : check.severity
      }))
    : [];
  const checkRows = draftOnly ? [
    stateRow,
    ...domainCheckRows,
    { label:'Source', value:'Draft', note:'No customer message required. Writing help is reading this text directly.', severity:'low' },
    { label:'Plain language', value: result.reply.plain ? 'Clear' : 'Heavy', note: result.reply.plain ? 'Sentence load and jargon are under control.' : 'Split long sentences or translate internal terms.', severity: result.reply.plain ? 'low' : 'medium' },
    { label:'Action path', value: result.reply.supportLike ? (result.reply.nextStep ? 'Present' : 'Optional') : 'Universal', note: result.reply.supportLike ? (result.reply.nextStep ? 'Action path is visible.' : 'Add a next action if this is a support reply.') : 'General text mode; no customer reply action required.', severity: result.reply.supportLike && !result.reply.nextStep ? 'medium' : 'low' },
    { label:'Risk', value: result.reply.riskHits.length ? 'Flagged' : 'Clear', note: result.reply.riskHits.length ? result.reply.riskHits.slice(0, 4).join(', ') : 'No hard risk phrase found.', severity: result.reply.riskHits.length ? 'high' : 'low' }
  ] : [
    stateRow,
    ...domainCheckRows,
    { label:'Coverage', value: result.reply.coverage.score + '%', note: result.reply.coverage.score >= 70 ? 'Customer ask is represented.' : 'Missing: ' + (result.reply.coverage.missing.join(', ') || 'customer detail'), severity: result.reply.coverage.score >= 70 ? 'low' : 'medium' },
    { label:'Ownership', value: result.reply.ownership ? 'Present' : 'Missing', note: result.reply.ownership ? 'Sender action is visible.' : 'Add who will do what.', severity: result.reply.ownership ? 'low' : 'high' },
    { label:'Next step', value: result.reply.nextStep ? 'Present' : 'Missing', note: result.reply.nextStep ? 'Action path is visible.' : 'Add the next concrete action.', severity: result.reply.nextStep ? 'low' : 'medium' },
    { label:'Risk', value: result.reply.riskHits.length ? 'Flagged' : 'Clear', note: result.reply.riskHits.length ? result.reply.riskHits.slice(0, 4).join(', ') : 'No hard risk phrase found.', severity: result.reply.riskHits.length ? 'high' : 'low' }
  ];
  mfRenderRows('mfCheckList', checkRows, { kind: 'mf-gap-row' });
  mfRenderRows('mfGapList', result.gaps, { empty: 'No blocking gaps found.', kind: 'mf-gap-row' });
  mfRenderRows('mfSuggestionList', result.suggestions.map(s => ({ label: s.label, note: s.note, insert: s.insert })), { kind: 'mf-suggestion-row' });
}

document.getElementById('pingInsightEngine').addEventListener('click', (e) => {
  const jump = e.target.closest('[data-mode-jump]');
  if (jump && jump.dataset.modeJump) {
    shell.dataset.workspaceMode = normalizeWorkspaceMode(jump.dataset.modeJump);
    shell.dataset.insights = 'open';
    syncModeControls();
    syncRailControls();
    save();
    return;
  }
  const btn = e.target.closest('[data-insight-insert]');
  if (!btn) return;
  insertAtCursor(btn.dataset.insightInsert);
  toast('Inserted insight move');
});

/* ========== THEGUIDE EXCHANGE EXPORT (Ping -> Coach/Sync) ========== */
const THEGUIDE_EXCHANGE_SCHEMA = 'theguide.exchange.v1';
const THEGUIDE_EXCHANGE_SOURCE = 'mirrorflow-ping';

function mfExchangeTrim(text, max) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!max || value.length <= max) return value;
  return value.slice(0, Math.max(0, max - 1)).trim() + '...';
}

function mfExchangeClone(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value == null ? fallback : value));
  } catch (_) {
    return fallback;
  }
}

function mfExchangeId() {
  return 'ping_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function mfExchangeSlug(text) {
  const slug = String(text || 'ping-session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'ping-session';
}

function mfPhoneTranscriptTurns() {
  return Array.from(phoneBody.children).reduce((turns, el, index) => {
    if (el.dataset.idle === 'true' || el.classList.contains('preview') || el.classList.contains('typing')) return turns;
    const text = String(el.textContent || '').trim();
    if (!text) return turns;
    if (el.classList.contains('bubble-time')) {
      turns.push({ index, type: 'time', label: text });
      return turns;
    }
    if (!el.classList.contains('bubble')) return turns;
    const role = el.dataset.role === 'agent' ? 'agent' : 'customer';
    turns.push({
      id: 'turn_' + String(turns.length + 1).padStart(2, '0'),
      index,
      type: 'message',
      role,
      text
    });
    return turns;
  }, []);
}

function mfLatestTranscriptText(turns, role) {
  const match = (turns || []).filter(turn => turn.type === 'message' && turn.role === role).pop();
  return match ? match.text : '';
}

function mfCompactAssistForExchange(analysis) {
  if (!analysis) return null;
  return {
    engine: analysis.engine || 'mirrorflow-assist-local-v1',
    quality: mfExchangeClone(analysis.quality, {}),
    tone: mfExchangeClone(analysis.tone, {}),
    clarity: mfExchangeClone(analysis.clarity, {}),
    issues: (analysis.issues || []).slice(0, 32).map(issue => ({
      id: issue.id,
      ruleId: issue.ruleId,
      category: issue.category,
      subtype: issue.subtype,
      severity: issue.severity,
      label: issue.label,
      message: issue.message,
      excerpt: issue.excerpt,
      replacement: issue.replacement,
      applySafe: Boolean(issue.applySafe),
      confidence: issue.confidence
    })),
    rewrites: (analysis.rewrites || []).slice(0, 4).map(rewrite => ({
      id: rewrite.id,
      title: rewrite.title,
      intent: rewrite.intent,
      impact: rewrite.impact,
      text: rewrite.text
    })),
    protectedSpans: (analysis.protectedSpans || []).slice(0, 16),
    rules: {
      disabled: analysis.rules && analysis.rules.disabled || [],
      categories: analysis.rules && analysis.rules.categories || []
    }
  };
}

function mfCompactInsightsForExchange(result) {
  if (!result) return null;
  return {
    mode: result.mode,
    sourceMode: result.sourceMode,
    hasCustomer: Boolean(result.hasCustomer),
    hasDraft: Boolean(result.hasDraft),
    domain: mfExchangeClone(result.domain, {}),
    query: mfExchangeClone(result.query, {}),
    responseState: mfExchangeClone(result.responseState, {}),
    brief: mfExchangeClone(result.brief, {}),
    gaps: mfExchangeClone(result.gaps || [], []),
    suggestions: mfExchangeClone(result.suggestions || [], []),
    domainChecks: mfExchangeClone(result.domainChecks, null),
    signals: mfExchangeClone(result.signals, {})
  };
}

function mfBuildCoachSeed(assist, insights, analysisText, customerText) {
  const categories = new Set((assist?.issues || []).map(issue => issue.category).filter(Boolean));
  const highIssues = (assist?.issues || []).filter(issue => issue.severity === 'high');
  const gaps = insights?.gaps || [];
  const suggestions = insights?.suggestions || [];
  const signals = insights?.signals?.rows || [];
  const modules = [];
  const focusAreas = [];

  if (categories.has('grammar') || categories.has('clarity')) {
    modules.push('Build');
    focusAreas.push('Writing mechanics and clarity');
  }
  if (categories.has('tone') || signals.length) {
    modules.push('Analyse');
    focusAreas.push('Tone, pressure, and reader impact');
  }
  if (customerText) {
    modules.push('Facilitate');
    focusAreas.push('Customer-context role play');
  }
  if (gaps.length || highIssues.length || (insights?.responseState?.score || 100) < 75) {
    modules.push('Assess');
    focusAreas.push('Readiness and coaching review');
  }

  return {
    targetApp: 'excelsior-coach',
    entryMode: 'analyse',
    primaryText: analysisText,
    sourceContext: customerText ? 'customer_context' : 'draft_or_sent_message',
    recommendedModes: Array.from(new Set(modules.length ? modules : ['Analyse'])),
    focusAreas: Array.from(new Set(focusAreas.length ? focusAreas : ['Clean message review'])),
    firstActions: [
      insights?.brief?.priority || 'Run Analyse on imported Ping text',
      suggestions[0]?.label || 'Review Coach findings',
      highIssues[0]?.label || gaps[0]?.label || 'Build a targeted practice step'
    ].filter(Boolean).slice(0, 3)
  };
}

function mfBuildExchangeTitle(insights, analysisText) {
  const domain = insights?.domain?.label;
  const query = insights?.query?.label;
  if (domain && query) return domain + ' - ' + query;
  const firstLine = String(analysisText || '').split('\n').map(line => line.trim()).find(Boolean);
  return mfExchangeTrim(firstLine || 'Ping session export', 72);
}

function mfBuildTheGuideExchangePacket() {
  const draftText = getDraftPlain();
  const transcript = mfPhoneTranscriptTurns();
  const finalText = mfLatestTranscriptText(transcript, 'agent');
  const customerText = getCustomerContextText() || mfLatestTranscriptText(transcript, 'customer');
  const analysisText = draftText || finalText || customerText;
  const insightsDraft = draftText || finalText;
  const hasAssist = Boolean(insightsDraft && window.MirrorFlowAssistEngine?.analyzeText);
  const assist = hasAssist
    ? window.MirrorFlowAssistEngine.analyzeText(insightsDraft, { surface: 'ping_exchange', mode: 'writing_only' })
    : null;
  const insights = typeof window.MF_runPingUniversalEngine === 'function'
    ? window.MF_runPingUniversalEngine(customerText, insightsDraft, activeInsightMode || 'auto')
    : null;
  const title = mfBuildExchangeTitle(insights, analysisText);
  const assistPacket = mfCompactAssistForExchange(assist);
  const insightsPacket = mfCompactInsightsForExchange(insights);

  return {
    schema: THEGUIDE_EXCHANGE_SCHEMA,
    exportedAt: new Date().toISOString(),
    sourceApp: THEGUIDE_EXCHANGE_SOURCE,
    sourceVersion: 'ping-shell-v6-codex',
    destinationHints: ['excelsior-coach', 'mirrorflow-sync'],
    session: {
      id: mfExchangeId(),
      title,
      customerText,
      draftText,
      finalText,
      analysisText,
      sideNotes: sideNotes.map(note => ({
        id: note.id,
        text: note.text,
        pinned: Boolean(note.pinned)
      })),
      chatTurns: transcript
    },
    analysis: {
      assist: assistPacket,
      insights: insightsPacket,
      drivers: {
        insightRows: mfExchangeClone(insights?.drivers || {}, {}),
        assistRows: mfExchangeClone(mfBuildAssistDriverRows(), [])
      },
      coachSeed: mfBuildCoachSeed(assistPacket, insightsPacket, analysisText, customerText)
    },
    privacy: {
      redacted: false,
      containsCustomerText: Boolean(customerText || transcript.some(turn => turn.role === 'customer')),
      containsAgentText: Boolean(draftText || finalText),
      storage: 'local-download'
    }
  };
}

function mfDownloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 300);
}

function mfExportTheGuideExchangePacket() {
  const packet = mfBuildTheGuideExchangePacket();
  if (!packet.session.analysisText && !packet.session.chatTurns.length) {
    toast('Nothing to export');
    return null;
  }
  mfDownloadJson(packet, 'theguide-exchange-' + mfExchangeSlug(packet.session.title) + '.json');
  toast('Coach packet exported');
  return packet;
}

window.MF_buildTheGuideExchangePacket = mfBuildTheGuideExchangePacket;
window.MF_exportTheGuideExchangePacket = mfExportTheGuideExchangePacket;
