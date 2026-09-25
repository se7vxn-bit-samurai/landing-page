/* MirrorFlow Notes · the studio
 * ─────────────────────────────────────────────────────────────────────────
 * Slides and Doc, moved out of Excelsior Coach's Build mode. Coach analyses,
 * facilitates and assesses; authoring an artefact is bench work, and Notes is
 * the workbench.
 *
 * This file is NOT in Notes' boot path. It is fetched the first time someone
 * opens the Slides or Doc pane - see __tgcLoadStudio in apps/notes.html. Notes
 * boots at its own weight whether or not you ever author a deck.
 *
 * The code came across as it was written, against its own ex-* class names and
 * DOM ids, because rewriting a 90 KB editor is a rebuild, not a move. What it
 * used to borrow from Coach is shimmed below - eight names, all small.
 */
(function () {
  'use strict';

  /* ── the shim · what this used to take from Coach ───────────────────── */
  /* new URL(relative, location.href) throws under a blob: origin - the portable
   build has no path hierarchy to resolve against, and an uncaught throw here
   aborts this entire module before anything below it runs. The print/export
   flow that reads this only degrades (no custom @import in the popup); the
   app itself must never die for it. */
let FONTS_CSS = '';
try { FONTS_CSS = new URL('../fonts/fonts.css', location.href).href; } catch (e) {}
  const THEME_VARIANTS = {
    press: [
      { name:'Classic', gold:'#d4a832', goldDim:'#a6842a', fire:'#e05c24', fireDim:'#b04a1d' },
      { name:'Midnight', gold:'#9ec1d4', goldDim:'#6b8da0', fire:'#d4a832', fireDim:'#a6842a' },
      { name:'Ember',   gold:'#e09a2a', goldDim:'#a87420', fire:'#c4361a', fireDim:'#922811' },
    ],
    cream: [
      { name:'Terra',  gold:'#8b6914', goldDim:'#6e530f', fire:'#8b2c0e', fireDim:'#6b2009' },
      { name:'Sage',   gold:'#5c6f3a', goldDim:'#465330', fire:'#8b3a1a', fireDim:'#6b2c14' },
      { name:'Slate',  gold:'#4a5d6f', goldDim:'#384654', fire:'#7a3a1a', fireDim:'#5c2c14' },
    ],
  };

  /* The studio's own state. Coach declared these outside its section banners, so
     they arrived with the stray regions at the foot of this file - far below the
     code that reads them at load time. Hoisted here, or every reference before
     that point is a temporal-dead-zone error. */
  let slidesDeck = [];
  let currentSlideIdx = -1;
  let selectedElementId = null;

  /* copyText and getClippings are small Coach utilities the studio still calls for
     "copy deck as text" and for pasting a saved clipping as an element. Both are
     self-contained, so they are duplicated here rather than reached for across an
     app boundary - Coach keeps its own copies for its own features. getClippings
     reads through this module's own persistGet, so it is the studio's clippings,
     never Coach's - no canon violation, just a shared little function shape. */
  async function copyText(text, btnEl) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied');
      if (btnEl) {
        btnEl.classList.add('is-copied');
        const orig = btnEl.textContent;
        btnEl.textContent = '\u2713 Copied';
        setTimeout(() => { btnEl.classList.remove('is-copied'); btnEl.textContent = orig; }, 1500);
      }
    } catch (e) { toast('Copy failed', true); }
  }
  function getClippings() { return persistGet('clippings', []) || []; }

  /* Coach's storage and toast, answered by the host app. Notes hands these in
     on init so the studio never reaches into another app's namespace - the
     canon is explicit exchange, not shared globals. */
  let host = { persistGet: (k, d) => d, persistSet: () => {}, toast: () => {} };
  const persistGet = (k, d) => host.persistGet(k, d);
  const persistSet = (k, v) => host.persistSet(k, v);
  const toast = (m) => host.toast(m);
  /* Coach switched on a global mode string; here the pane is the mode. */
  let currentMode = 'slides';

/* ──────────────────────────────────────────────────────────────
   BUILD MODE - Slides
────────────────────────────────────────────────────────────── */
const slideCanvas = document.getElementById('slideCanvas');
const slideDeckEl = document.getElementById('slideDeck');
const slideLayoutSel = document.getElementById('slideLayout');
const addSlideBtn = document.getElementById('addSlideBtn');
const exportDeckBtn = document.getElementById('exportDeckBtn');

/* Element-based slide templates (v0.9.2)
   Each layout pre-populates a list of elements. Users add/remove/edit. */
const SLIDE_TEMPLATES = {
  title: () => ({
    layout: 'title',
    elements: [
      { id: uid(), type: 'heading', text: 'Excelsior', size: 'large' },
      { id: uid(), type: 'divider' },
      { id: uid(), type: 'subheading', text: 'theGuide · A Collection of Practical Lessons' },
    ],
  }),
  agenda: () => ({
    layout: 'agenda',
    elements: [
      { id: uid(), type: 'heading', text: 'Agenda' },
      { id: uid(), type: 'subheading', text: 'What we\'ll cover today' },
      { id: uid(), type: 'divider' },
      { id: uid(), type: 'numbered', items: ['Foundation', 'Conversation', 'Influence', 'Communication', 'Practice'] },
    ],
  }),
  content: () => ({
    layout: 'content',
    elements: [
      { id: uid(), type: 'heading', text: 'Key Point' },
      { id: uid(), type: 'subheading', text: 'Supporting context' },
      { id: uid(), type: 'bullets', items: ['First detail point', 'Second detail point', 'Third detail point'] },
    ],
  }),
  discussion: () => ({
    layout: 'discussion',
    elements: [
      { id: uid(), type: 'heading', text: 'Discussion' },
      { id: uid(), type: 'divider' },
      { id: uid(), type: 'bullets', items: ['What resonated?', 'What challenged you?', 'How will you apply this?'] },
      { id: uid(), type: 'pullquote', text: 'The unexamined life is not worth living.' },
    ],
  }),
  practice: () => ({
    layout: 'practice',
    elements: [
      { id: uid(), type: 'heading', text: 'Practice Exercise' },
      { id: uid(), type: 'subheading', text: 'Time to apply what we covered' },
      { id: uid(), type: 'callout', text: 'Activity instructions go here. Be specific about the goal, the duration, and what success looks like.' },
      { id: uid(), type: 'numbered', items: ['Step one', 'Step two', 'Step three'] },
    ],
  }),
  summary: () => ({
    layout: 'summary',
    elements: [
      { id: uid(), type: 'heading', text: 'Summary' },
      { id: uid(), type: 'subheading', text: 'Key Takeaways' },
      { id: uid(), type: 'divider' },
      { id: uid(), type: 'bullets', items: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3'] },
      { id: uid(), type: 'ornament' },
    ],
  }),
  blank: () => ({
    layout: 'blank',
    elements: [],
  }),
};
let uidCounter = 0;
function uid() { return 'el-' + (++uidCounter) + '-' + Math.floor(Math.random()*9999); }

/* Legacy support: if a slide is in old {title,subtitle,body} format, migrate */
function migrateSlide(s) {
  if (s.elements) return s;
  const els = [];
  if (s.title) els.push({ id: uid(), type: 'heading', text: s.title, size: s.layout === 'title' ? 'large' : '' });
  if (s.subtitle) els.push({ id: uid(), type: 'subheading', text: s.subtitle });
  if (s.body && s.body.trim()) {
    const lines = s.body.split('\n').filter(Boolean);
    if (lines.length > 1) els.push({ id: uid(), type: 'bullets', items: lines });
    else if (lines.length === 1) els.push({ id: uid(), type: 'body', text: lines[0] });
  }
  return { layout: s.layout || 'blank', elements: els };
}

function addSlide() {
  const layout = slideLayoutSel.value;
  const template = SLIDE_TEMPLATES[layout] || SLIDE_TEMPLATES.blank;
  slidesDeck.push(template());
  currentSlideIdx = slidesDeck.length - 1;
  persistSet('slides-deck', slidesDeck);
  renderSlideCanvas();
  renderSlideDeck();
}

/* hoisted to the top of the module · see the shim */

function renderStyleInspector(el) {
  const a = el.align || 'left';
  const z = el.size || 'md';
  const ac = el.accent === 'on' ? 'on' : 'off';
  return `<div class="ex-style-inspector">
    <div class="ex-style-inspector__group">
      <button class="ex-style-inspector__btn ${a==='left'?'is-on':''}" data-style="align" data-val="left" data-eid="${el.id}" title="Left">L</button>
      <button class="ex-style-inspector__btn ${a==='center'?'is-on':''}" data-style="align" data-val="center" data-eid="${el.id}" title="Center">C</button>
      <button class="ex-style-inspector__btn ${a==='right'?'is-on':''}" data-style="align" data-val="right" data-eid="${el.id}" title="Right">R</button>
    </div>
    <div class="ex-style-inspector__group">
      <button class="ex-style-inspector__btn ${z==='sm'?'is-on':''}" data-style="size" data-val="sm" data-eid="${el.id}" title="Small">S</button>
      <button class="ex-style-inspector__btn ${z==='md'?'is-on':''}" data-style="size" data-val="md" data-eid="${el.id}" title="Medium">M</button>
      <button class="ex-style-inspector__btn ${z==='lg'?'is-on':''}" data-style="size" data-val="lg" data-eid="${el.id}" title="Large">L</button>
    </div>
    <div class="ex-style-inspector__group">
      <button class="ex-style-inspector__btn ${ac==='on'?'is-on':''}" data-style="accent" data-val="${ac==='on'?'off':'on'}" data-eid="${el.id}" title="Accent colour">★</button>
    </div>
  </div>`;
}

function renderElement(el, idx, total) {
  const isSel = el.id === selectedElementId;
  const dataAttrs = `data-align="${el.align||'left'}" data-size="${el.size||'md'}" data-accent="${el.accent||'off'}"`;
  const handle = `<span class="ex-drag-handle" title="Drag to reorder">⋮⋮</span>`;
  const inspector = renderStyleInspector(el);
  const ctrls = `<div class="ex-slide-element__controls">
    <button class="ex-slide-element__ctrl-btn" data-act="del" data-eid="${el.id}" title="Delete">✕</button>
  </div>`;
  let inner = '';
  switch (el.type) {
    case 'heading':
      inner = `<div class="ex-se--heading ${el.size==='large'?'is-large':''}" contenteditable="true" data-eid="${el.id}" data-field="text">${el.text||''}</div>`;
      break;
    case 'subheading':
      inner = `<div class="ex-se--subheading" contenteditable="true" data-eid="${el.id}" data-field="text">${el.text||''}</div>`;
      break;
    case 'body':
      inner = `<div class="ex-se--body" contenteditable="true" data-eid="${el.id}" data-field="text">${el.text||''}</div>`;
      break;
    case 'dropcap':
      inner = `<div class="ex-se--dropcap" contenteditable="true" data-eid="${el.id}" data-field="text">${el.text||''}</div>`;
      break;
    case 'pullquote':
      inner = `<div class="ex-se--pullquote" contenteditable="true" data-eid="${el.id}" data-field="text">${el.text||''}</div>`;
      break;
    case 'bullets':
      inner = `<ul class="ex-se--bullets" data-eid="${el.id}">${(el.items||[]).map((it,i)=>`<li contenteditable="true" data-eid="${el.id}" data-item-idx="${i}">${it}</li>`).join('')}</ul>`;
      break;
    case 'numbered':
      inner = `<ol class="ex-se--numbered" data-eid="${el.id}">${(el.items||[]).map((it,i)=>`<li contenteditable="true" data-eid="${el.id}" data-item-idx="${i}">${it}</li>`).join('')}</ol>`;
      break;
    case 'callout':
      inner = `<div class="ex-se--callout" contenteditable="true" data-eid="${el.id}" data-field="text">${el.text||''}</div>`;
      break;
    case 'columns':
      inner = `<div class="ex-se--columns" data-eid="${el.id}"><div contenteditable="true" data-eid="${el.id}" data-col="0">${el.left||'Left column...'}</div><div contenteditable="true" data-eid="${el.id}" data-col="1">${el.right||'Right column...'}</div></div>`;
      break;
    case 'divider':
      inner = `<div class="ex-se--divider"><svg width="44" height="14" viewBox="0 0 44 14" fill="currentColor" aria-hidden="true"><path d="M22 1 L26 7 L22 13 L18 7 Z" opacity="0.9"/><path d="M14 7 L9 4 L9 10 Z" opacity="0.7"/><path d="M30 7 L35 4 L35 10 Z" opacity="0.7"/></svg></div>`;
      break;
    case 'ornament':
      inner = `<div class="ex-se--ornament"><svg width="120" height="16" viewBox="0 0 120 16" fill="currentColor" aria-hidden="true"><path d="M60 2 L66 8 L60 14 L54 8 Z" opacity="0.9"/><path d="M44 8 C 48 4, 52 4, 54 8 C 52 12, 48 12, 44 8 Z" opacity="0.6"/><path d="M76 8 C 72 4, 68 4, 66 8 C 68 12, 72 12, 76 8 Z" opacity="0.6"/><line x1="14" y1="8" x2="42" y2="8" stroke="currentColor" stroke-width="0.6"/><line x1="78" y1="8" x2="106" y2="8" stroke="currentColor" stroke-width="0.6"/><circle cx="10" cy="8" r="2"/><circle cx="110" cy="8" r="2"/></svg></div>`;
      break;
    case 'sunburst':
      inner = `<div class="ex-se--ornament"><svg width="80" height="80" viewBox="0 0 200 200" fill="currentColor" aria-hidden="true"><defs><g id="rs"><polygon points="100,100 99,0 101,0"/></g></defs><use href="#rs"/><use href="#rs" transform="rotate(30 100 100)"/><use href="#rs" transform="rotate(60 100 100)"/><use href="#rs" transform="rotate(90 100 100)"/><use href="#rs" transform="rotate(120 100 100)"/><use href="#rs" transform="rotate(150 100 100)"/><use href="#rs" transform="rotate(180 100 100)"/><use href="#rs" transform="rotate(210 100 100)"/><use href="#rs" transform="rotate(240 100 100)"/><use href="#rs" transform="rotate(270 100 100)"/><use href="#rs" transform="rotate(300 100 100)"/><use href="#rs" transform="rotate(330 100 100)"/><circle cx="100" cy="100" r="32" fill="none" stroke="currentColor" stroke-width="2"/></svg></div>`;
      break;
    case 'fleur':
      inner = `<div class="ex-se--ornament"><svg width="48" height="48" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true"><path d="M14 2 C14 8, 18 10, 20 12 C18 14, 14 14, 14 20 C14 14, 10 14, 8 12 C10 10, 14 8, 14 2 Z"/><path d="M14 18 L14 26" stroke="currentColor" stroke-width="1.2"/><ellipse cx="14" cy="22" rx="5" ry="1"/></svg></div>`;
      break;
    case 'sourcetag':
      inner = `<div><span class="ex-se--sourcetag" contenteditable="true" data-eid="${el.id}" data-field="text">${el.text||'source.pdf'}</span></div>`;
      break;
    case 'image':
      if (el.src) {
        inner = `<div class="ex-se--image"><img src="${el.src}" alt=""/><div class="ex-se--image__caption" contenteditable="true" data-eid="${el.id}" data-field="caption">${el.caption||'Caption (click to edit)'}</div></div>`;
      } else {
        inner = `<div class="ex-image-dropzone" data-eid="${el.id}" data-imgdrop="1">Click or drop an image here<br/><span style="font-size:9px;opacity:0.6;">PNG / JPG / SVG · stored locally as base64</span></div>`;
      }
      break;
    default:
      inner = `<div>[unknown element: ${el.type}]</div>`;
  }
  return `<div class="ex-slide-element ${isSel?'is-selected':''}" data-eid="${el.id}" draggable="true" ${dataAttrs}>${handle}${inspector}${ctrls}${inner}</div>`;
}

function renderSlideCanvas() {
  if (currentSlideIdx < 0 || !slidesDeck[currentSlideIdx]) {
    slideCanvas.innerHTML = '<div class="ex-slide-canvas__hint">Select a slide or add one to begin</div>';
    return;
  }
  // Migrate legacy slides on first render
  slidesDeck[currentSlideIdx] = migrateSlide(slidesDeck[currentSlideIdx]);
  const s = slidesDeck[currentSlideIdx];
  slideCanvas.dataset.layout = s.layout || 'blank';
  if (!s.elements.length) {
    slideCanvas.innerHTML = `<div class="ex-slide-canvas__hint">Empty slide - pick an element from the palette →</div><div style="position:absolute;bottom:8px;right:12px;font-family:var(--ex-font-mono);font-size:10px;color:var(--ex-text-muted);">Slide ${currentSlideIdx+1} / ${slidesDeck.length} · ${s.layout}</div>`;
  } else {
    slideCanvas.innerHTML = s.elements.map((el, i) => renderElement(el, i, s.elements.length)).join('') +
      `<div style="position:absolute;bottom:8px;right:12px;font-family:var(--ex-font-mono);font-size:10px;color:var(--ex-text-muted);">Slide ${currentSlideIdx+1} / ${slidesDeck.length} · ${s.layout}</div>`;
  }
  bindSlideEditing();
}

// Generic element-collection editing - used by both slides and doc
function bindElementEditing(container, getElements, onChange) {
  container.querySelectorAll('.ex-slide-element').forEach(elNode => {
    elNode.addEventListener('click', (e) => {
      if (e.target.closest('.ex-slide-element__controls')) return;
      if (e.target.closest('.ex-style-inspector')) return;
      if (e.target.closest('.ex-drag-handle')) return;
      if (e.target.closest('.ex-resize-handle')) return;
      const wasSelected = elNode.dataset.eid === selectedElementId;
      selectedElementId = elNode.dataset.eid;
      // v2.2.2: single-click also enters edit mode for text elements
      if (e.target.isContentEditable) return;  // already editing
      const editable = elNode.querySelector('[contenteditable]');
      if (editable && wasSelected) {
        editable.focus();
        // Position cursor at click point (best-effort)
        try {
          const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
          if (range) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }
        } catch {}
      } else if (editable && !wasSelected) {
        // First click selects + immediately focuses for editing
        setTimeout(() => { editable.focus(); }, 30);
      }
      onChange();
    });
    // Drag-to-reorder
    elNode.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', elNode.dataset.eid);
      e.dataTransfer.effectAllowed = 'move';
      elNode.classList.add('is-dragging');
    });
    elNode.addEventListener('dragend', () => {
      elNode.classList.remove('is-dragging');
      container.querySelectorAll('.is-drop-target').forEach(n => n.classList.remove('is-drop-target'));
    });
    elNode.addEventListener('dragover', (e) => {
      e.preventDefault();
      elNode.classList.add('is-drop-target');
    });
    elNode.addEventListener('dragleave', () => elNode.classList.remove('is-drop-target'));
    elNode.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData('text/plain');
      const toId = elNode.dataset.eid;
      if (fromId === toId) return;
      const els = getElements();
      const fromIdx = els.findIndex(x => x.id === fromId);
      const toIdx = els.findIndex(x => x.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [m] = els.splice(fromIdx, 1);
      els.splice(toIdx, 0, m);
      onChange();
    });
  });
  // Delete button
  container.querySelectorAll('.ex-slide-element__ctrl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const eid = btn.dataset.eid;
      const els = getElements();
      const idx = els.findIndex(el => el.id === eid);
      if (idx < 0) return;
      if (btn.dataset.act === 'del') { els.splice(idx, 1); selectedElementId = null; }
      onChange();
    });
  });
  // Style inspector
  container.querySelectorAll('.ex-style-inspector__btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const eid = btn.dataset.eid;
      const style = btn.dataset.style;
      const val = btn.dataset.val;
      const el = getElements().find(x => x.id === eid);
      if (!el) return;
      el[style] = val;
      onChange();
    });
  });
  // Inline editing
  container.querySelectorAll('[contenteditable]').forEach(node => {
    node.addEventListener('blur', () => {
      const eid = node.dataset.eid;
      const el = getElements().find(x => x.id === eid);
      if (!el) return;
      if (node.dataset.itemIdx !== undefined) {
        el.items[parseInt(node.dataset.itemIdx)] = node.textContent;
      } else if (node.dataset.col !== undefined) {
        if (node.dataset.col === '0') el.left = node.textContent;
        else el.right = node.textContent;
      } else if (node.dataset.field) {
        el[node.dataset.field] = node.textContent;
      }
      onChange();
    });
  });
  // Image dropzones
  container.querySelectorAll('[data-imgdrop="1"]').forEach(dz => {
    dz.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.addEventListener('change', () => { if (inp.files[0]) handleImageFile(inp.files[0], dz.dataset.eid, getElements, onChange); });
      inp.click();
    });
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('is-hover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('is-hover'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('is-hover');
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) handleImageFile(f, dz.dataset.eid, getElements, onChange);
    });
  });
}
function handleImageFile(file, eid, getElements, onChange) {
  if (file.size > 2000000) { toast('Image too large (>2MB) - pick smaller', true); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const el = getElements().find(x => x.id === eid);
    if (!el) return;
    el.src = reader.result;
    onChange();
  };
  reader.readAsDataURL(file);
}

function bindSlideEditing() {
  bindElementEditing(slideCanvas,
    () => slidesDeck[currentSlideIdx]?.elements || [],
    () => { persistSet('slides-deck', slidesDeck); renderSlideCanvas(); }
  );
}

/* Element type → default free-positioning size */
const ELEMENT_DEFAULT_SIZE = {
  heading:    { w: 380, h: 70 },
  subheading: { w: 380, h: 50 },
  body:       { w: 380, h: 80 },
  dropcap:    { w: 420, h: 140 },
  pullquote:  { w: 420, h: 100 },
  bullets:    { w: 380, h: 140 },
  numbered:   { w: 380, h: 140 },
  callout:    { w: 380, h: 100 },
  columns:    { w: 500, h: 120 },
  divider:    { w: 200, h: 30 },
  ornament:   { w: 160, h: 30 },
  sunburst:   { w: 120, h: 120 },
  fleur:      { w: 64, h: 64 },
  sourcetag:  { w: 180, h: 30 },
  image:      { w: 280, h: 200 },
};

/* Element palette - insert at end of current slide's elements */
function insertElement(type) {
  if (currentSlideIdx < 0) {
    slidesDeck.push(SLIDE_TEMPLATES.blank());
    currentSlideIdx = slidesDeck.length - 1;
  }
  const s = slidesDeck[currentSlideIdx];
  if (!s.elements) s.elements = [];
  const fresh = { id: uid(), type, pos: 'free' };
  // Default position: stagger so new elements don't all overlap
  const offset = (s.elements.filter(e => e.pos === 'free').length % 6) * 20;
  fresh.x = 60 + offset;
  fresh.y = 60 + offset;
  const sz = ELEMENT_DEFAULT_SIZE[type] || { w: 320, h: 80 };
  fresh.width = sz.w;
  fresh.height = sz.h;
  switch (type) {
    case 'heading': fresh.text = 'Heading'; break;
    case 'subheading': fresh.text = 'Subheading in italic'; break;
    case 'body': fresh.text = 'Body paragraph.'; break;
    case 'dropcap': fresh.text = 'Drop-cap paragraph - the first letter will render large and italic in your theme accent.'; break;
    case 'pullquote': fresh.text = 'A memorable line worth lifting from the body.'; break;
    case 'bullets': fresh.items = ['First point', 'Second point', 'Third point']; break;
    case 'numbered': fresh.items = ['Step one', 'Step two', 'Step three']; break;
    case 'callout': fresh.text = 'A highlighted note worth standing apart.'; break;
    case 'columns': fresh.left = 'Left column text.'; fresh.right = 'Right column text.'; break;
    case 'sourcetag': fresh.text = 'source.pdf'; break;
    // divider, ornament, sunburst, fleur - no text
  }
  s.elements.push(fresh);
  selectedElementId = fresh.id;
  saveSlidesWithHistory();
  renderSlideCanvas();
  renderSlideDeck();
  // Focus contenteditable immediately for text types
  if (['heading','subheading','body','dropcap','pullquote','callout','sourcetag'].includes(type)) {
    setTimeout(() => {
      const node = slideCanvas.querySelector(`[data-eid="${fresh.id}"] [contenteditable]`);
      if (node) { node.focus(); document.execCommand('selectAll', false, null); }
    }, 40);
  }
}
document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => insertElement(btn.dataset.add));
});

/* ──────────────────────────────────────────────────────────────
   v1.1 - HISTORY STACK (undo/redo)
────────────────────────────────────────────────────────────── */
let _history = [];
let _historyIdx = -1;
const HISTORY_MAX = 50;

function pushHistory() {
  _history = _history.slice(0, _historyIdx + 1);
  _history.push(JSON.stringify(slidesDeck));
  if (_history.length > HISTORY_MAX) _history.shift();
  _historyIdx = _history.length - 1;
  updateHistoryButtons();
}
function undo() {
  if (_historyIdx <= 0) return;
  _historyIdx--;
  slidesDeck = JSON.parse(_history[_historyIdx]);
  persistSet('slides-deck', slidesDeck);
  renderSlideCanvas(); renderSlideDeck(); renderLayerPanel();
  updateHistoryButtons();
  toast('Undo');
}
function redo() {
  if (_historyIdx >= _history.length - 1) return;
  _historyIdx++;
  slidesDeck = JSON.parse(_history[_historyIdx]);
  persistSet('slides-deck', slidesDeck);
  renderSlideCanvas(); renderSlideDeck(); renderLayerPanel();
  updateHistoryButtons();
  toast('Redo');
}
function updateHistoryButtons() {
  const u = document.getElementById('undoBtn');
  const r = document.getElementById('redoBtn');
  if (u) u.disabled = _historyIdx <= 0;
  if (r) r.disabled = _historyIdx >= _history.length - 1;
}
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
// Seed history with current deck
pushHistory();

/* Wrap saves so they push history */
const _origPersistSlides = () => persistSet('slides-deck', slidesDeck);
function saveSlidesWithHistory() {
  _origPersistSlides();
  pushHistory();
}

/* ──────────────────────────────────────────────────────────────
   v1.1 - FREE POSITIONING + RESIZE
────────────────────────────────────────────────────────────── */
function toggleElementPosition(eid) {
  const s = slidesDeck[currentSlideIdx];
  const el = s.elements.find(e => e.id === eid);
  if (!el) return;
  if (el.pos === 'free') {
    delete el.pos; delete el.x; delete el.y; delete el.width; delete el.height;
  } else {
    el.pos = 'free';
    el.x = 60; el.y = 60; el.width = 280; el.height = 80;
  }
  saveSlidesWithHistory();
  renderSlideCanvas(); renderLayerPanel();
}

function applyFreePosStyle(node, el) {
  if (el.pos === 'free') {
    node.style.left = (el.x||0) + 'px';
    node.style.top = (el.y||0) + 'px';
    if (el.width) node.style.width = el.width + 'px';
    if (el.height) node.style.height = el.height + 'px';
  }
}

function bindFreePositionDrag(node, el, getElements, onChange) {
  if (el.pos !== 'free') return;
  // Add resize handles
  ['nw','ne','sw','se'].forEach(corner => {
    const h = document.createElement('div');
    h.className = 'ex-resize-handle ex-resize-handle--' + corner;
    h.dataset.corner = corner;
    node.appendChild(h);
  });
  let dragging = null;
  node.addEventListener('mousedown', (e) => {
    // Resize handle?
    if (e.target.classList.contains('ex-resize-handle')) {
      const corner = e.target.dataset.corner;
      dragging = { mode: 'resize', corner, startX: e.clientX, startY: e.clientY, sx: el.x, sy: el.y, sw: el.width, sh: el.height };
      e.preventDefault(); e.stopPropagation();
      return;
    }
    // Drag from element body, not from inner editable content
    if (e.target.isContentEditable || e.target.closest('[contenteditable]')) return;
    if (e.target.closest('.ex-style-inspector') || e.target.closest('.ex-slide-element__controls')) return;
    dragging = { mode: 'move', startX: e.clientX, startY: e.clientY, sx: el.x, sy: el.y };
    e.preventDefault();
  });
  function onMove(e) {
    if (!dragging) return;
    if (dragging.mode === 'move') {
      el.x = dragging.sx + (e.clientX - dragging.startX);
      el.y = dragging.sy + (e.clientY - dragging.startY);
      node.style.left = el.x + 'px';
      node.style.top = el.y + 'px';
    } else if (dragging.mode === 'resize') {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      if (dragging.corner.includes('e')) el.width = Math.max(40, dragging.sw + dx);
      if (dragging.corner.includes('s')) el.height = Math.max(20, dragging.sh + dy);
      if (dragging.corner.includes('w')) { el.x = dragging.sx + dx; el.width = Math.max(40, dragging.sw - dx); }
      if (dragging.corner.includes('n')) { el.y = dragging.sy + dy; el.height = Math.max(20, dragging.sh - dy); }
      node.style.left = el.x + 'px'; node.style.top = el.y + 'px';
      node.style.width = el.width + 'px'; node.style.height = el.height + 'px';
    }
  }
  function onUp() {
    if (dragging) { dragging = null; onChange(); }
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

/* ──────────────────────────────────────────────────────────────
   v1.1 - LAYER PANEL
────────────────────────────────────────────────────────────── */
function elementLabel(el) {
  if (el.text) return el.text.slice(0, 30);
  if (el.items) return (el.items[0]||'') + ' …';
  if (el.left) return 'Cols: ' + (el.left||'').slice(0, 20);
  return el.type;
}

function renderLayerPanel() {
  const list = document.getElementById('layerList');
  const count = document.getElementById('layerCount');
  if (!list || currentSlideIdx < 0) { if (list) list.innerHTML = '<div style="font-size:10px;color:var(--ex-text-muted);padding:8px;">No slide</div>'; return; }
  const s = slidesDeck[currentSlideIdx];
  if (count) count.textContent = (s.elements||[]).length;
  list.innerHTML = (s.elements||[]).map((el, i) => `
    <div class="ex-layer-row ${el.id===selectedElementId?'is-selected':''} ${el.hidden?'is-hidden':''}" data-eid="${el.id}" draggable="true">
      <span class="ex-layer-row__type">${el.type.slice(0,3)}</span>
      <span class="ex-layer-row__label">${escapeHtml(elementLabel(el))}</span>
      <button class="ex-layer-row__vis" data-vis="${el.id}" title="${el.hidden?'Show':'Hide'}">${el.hidden?'⊘':'●'}</button>
    </div>
  `).join('');
  list.querySelectorAll('.ex-layer-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('ex-layer-row__vis')) return;
      selectedElementId = row.dataset.eid;
      renderSlideCanvas(); renderLayerPanel();
    });
    row.addEventListener('dragstart', (e) => { e.dataTransfer.setData('layer/eid', row.dataset.eid); });
    row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('is-drop-target'); });
    row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('is-drop-target');
      const fromId = e.dataTransfer.getData('layer/eid');
      const toId = row.dataset.eid;
      if (!fromId || fromId === toId) return;
      const els = s.elements;
      const fi = els.findIndex(x => x.id === fromId);
      const ti = els.findIndex(x => x.id === toId);
      if (fi < 0 || ti < 0) return;
      const [m] = els.splice(fi, 1);
      els.splice(ti, 0, m);
      saveSlidesWithHistory();
      renderSlideCanvas(); renderLayerPanel();
    });
  });
  list.querySelectorAll('[data-vis]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = s.elements.find(x => x.id === btn.dataset.vis);
      if (!el) return;
      el.hidden = !el.hidden;
      saveSlidesWithHistory();
      renderSlideCanvas(); renderLayerPanel();
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   v1.1 - SLIDE BACKGROUND
────────────────────────────────────────────────────────────── */
function applyBgToCanvas() {
  if (currentSlideIdx < 0) return;
  const s = slidesDeck[currentSlideIdx];
  if (s.bg) {
    slideCanvas.style.background = s.bg;
    slideCanvas.dataset.hasBg = '1';
  } else {
    slideCanvas.style.background = '';
    delete slideCanvas.dataset.hasBg;
  }
  // Sync color picker
  const ci = document.getElementById('bgColorInput');
  if (ci && s.bg && /^#[0-9a-f]{6}$/i.test(s.bg)) ci.value = s.bg;
}
document.getElementById('bgColorInput').addEventListener('input', (e) => {
  if (currentSlideIdx < 0) return;
  slidesDeck[currentSlideIdx].bg = e.target.value;
  applyBgToCanvas();
  // Debounced save
  clearTimeout(window._bgSaveTimer);
  window._bgSaveTimer = setTimeout(saveSlidesWithHistory, 400);
});
document.getElementById('bgClearBtn').addEventListener('click', () => {
  if (currentSlideIdx < 0) return;
  delete slidesDeck[currentSlideIdx].bg;
  applyBgToCanvas();
  saveSlidesWithHistory();
});
document.querySelectorAll('[data-bg]').forEach(sw => {
  sw.addEventListener('click', () => {
    if (currentSlideIdx < 0) return;
    const v = sw.dataset.bg;
    if (v) slidesDeck[currentSlideIdx].bg = v;
    else delete slidesDeck[currentSlideIdx].bg;
    applyBgToCanvas();
    saveSlidesWithHistory();
  });
});
document.getElementById('bgImgBtn').addEventListener('click', () => {
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='image/*';
  inp.addEventListener('change', () => {
    if (!inp.files[0]) return;
    if (inp.files[0].size > 2000000) { toast('Image >2MB, pick smaller', true); return; }
    const r = new FileReader();
    r.onload = () => {
      slidesDeck[currentSlideIdx].bg = `url(${r.result}) center/cover no-repeat`;
      applyBgToCanvas();
      saveSlidesWithHistory();
    };
    r.readAsDataURL(inp.files[0]);
  });
  inp.click();
});
document.getElementById('bgImgClearBtn').addEventListener('click', () => {
  if (currentSlideIdx < 0) return;
  delete slidesDeck[currentSlideIdx].bg;
  applyBgToCanvas();
  saveSlidesWithHistory();
});

/* ──────────────────────────────────────────────────────────────
   v1.1 - COPY / PASTE / DUPLICATE ELEMENTS
────────────────────────────────────────────────────────────── */
let _elementClipboard = null;

function copySelectedElement() {
  if (!selectedElementId || currentSlideIdx < 0) return false;
  const s = slidesDeck[currentSlideIdx];
  const el = (s.elements||[]).find(x => x.id === selectedElementId);
  if (!el) return false;
  _elementClipboard = JSON.parse(JSON.stringify(el));
  toast('Element copied');
  return true;
}
function pasteElement() {
  if (!_elementClipboard) { toast('Clipboard empty', true); return; }
  if (currentSlideIdx < 0) return;
  const fresh = JSON.parse(JSON.stringify(_elementClipboard));
  fresh.id = uid();
  if (fresh.pos === 'free') { fresh.x = (fresh.x||0) + 20; fresh.y = (fresh.y||0) + 20; }
  const s = slidesDeck[currentSlideIdx];
  s.elements = s.elements || [];
  s.elements.push(fresh);
  selectedElementId = fresh.id;
  saveSlidesWithHistory();
  renderSlideCanvas(); renderLayerPanel();
  toast('Pasted');
}
function duplicateSelectedElement() {
  if (!copySelectedElement()) return;
  pasteElement();
}

/* ──────────────────────────────────────────────────────────────
   v1.1 - INLINE FORMAT BAR (bold/italic/underline)
────────────────────────────────────────────────────────────── */
const formatBar = document.getElementById('formatBar');
function positionFormatBar() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { formatBar.classList.remove('is-visible'); return; }
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
  // Only show in slide canvas / doc page contenteditable
  if (!node.closest || (!node.closest('#slideCanvas') && !node.closest('#docPage'))) {
    formatBar.classList.remove('is-visible'); return;
  }
  const r = range.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) { formatBar.classList.remove('is-visible'); return; }
  formatBar.style.left = (r.left + r.width/2 - 60) + 'px';
  formatBar.style.top = (r.top - 36) + 'px';
  formatBar.classList.add('is-visible');
}
document.addEventListener('selectionchange', positionFormatBar);
formatBar.querySelectorAll('.ex-format-bar__btn').forEach(b => {
  b.addEventListener('mousedown', (e) => { e.preventDefault(); }); // don't lose selection
  b.addEventListener('click', () => {
    document.execCommand(b.dataset.fmt, false, null);
    // Trigger blur to persist on contenteditable
    setTimeout(positionFormatBar, 10);
  });
});

/* Add toolbar button: Free Position toggle for selected element */
/* Add data-style="pos" to renderStyleInspector via runtime patch: */
const _origRenderStyleInspector = renderStyleInspector;
renderStyleInspector = function(el) {
  const base = _origRenderStyleInspector(el);
  const posOn = el.pos === 'free';
  // inject a Pos group before closing div
  const posGroup = `<div class="ex-style-inspector__group"><button class="ex-style-inspector__btn ${posOn?'is-on':''}" data-style="pos" data-val="${posOn?'flow':'free'}" data-eid="${el.id}" title="Free / flow position">⤧</button></div>`;
  return base.replace('</div>', posGroup + '</div>');
};
// Intercept pos style button (the existing inspector handler stores el[style]=val,
// but for pos we need to toggle x/y/w/h)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-style="pos"]');
  if (!btn) return;
  toggleElementPosition(btn.dataset.eid);
}, true);

/* ──────────────────────────────────────────────────────────────
   v1.1 - REWIRE renderSlideCanvas to apply bg, free-pos style, layer panel
────────────────────────────────────────────────────────────── */
const _origRenderSlideCanvas = renderSlideCanvas;
renderSlideCanvas = function() {
  _origRenderSlideCanvas();
  applyBgToCanvas();
  // Apply free-pos inline styles + bind drag
  if (currentSlideIdx >= 0) {
    const s = slidesDeck[currentSlideIdx];
    (s.elements||[]).forEach(el => {
      const node = slideCanvas.querySelector(`.ex-slide-element[data-eid="${el.id}"]`);
      if (!node) return;
      node.dataset.pos = el.pos || 'flow';
      if (el.hidden) node.style.display = 'none';
      if (el.pos === 'free') {
        applyFreePosStyle(node, el);
        bindFreePositionDrag(node, el,
          () => slidesDeck[currentSlideIdx]?.elements || [],
          () => { saveSlidesWithHistory(); renderLayerPanel(); }
        );
      }
    });
  }
  renderLayerPanel();
};

/* Wrap addSlide and slide ops to push history */
const _origAddSlide = addSlide;
addSlide = function() { _origAddSlide(); pushHistory(); };

/* Render layer panel + bg on initial load */
setTimeout(() => { renderLayerPanel(); applyBgToCanvas(); }, 50);

/* Global keyboard shortcuts for editing power */
document.addEventListener('keydown', (e) => {
  const useCtrl = (e.ctrlKey || e.metaKey) && !e.altKey;
  if (!useCtrl) return;
  // Don't intercept if focused in contenteditable for text formatting shortcuts
  // (browser handles B/I/U natively in contenteditable)
  if (e.key === 'z' || e.key === 'Z') {
    if (e.shiftKey) { e.preventDefault(); redo(); }
    else { e.preventDefault(); undo(); }
  } else if (e.key === 'y' || e.key === 'Y') {
    e.preventDefault(); redo();
  } else if (e.key === 'd' || e.key === 'D') {
    // Don't intercept browser bookmark on every page - only when an element is selected
    if (selectedElementId) { e.preventDefault(); duplicateSelectedElement(); }
  } else if ((e.key === 'c' || e.key === 'C') && selectedElementId && !window.getSelection().toString()) {
    // Only when no text selected (otherwise let native copy work)
    e.preventDefault(); copySelectedElement();
  } else if ((e.key === 'v' || e.key === 'V') && _elementClipboard && document.activeElement === document.body) {
    e.preventDefault(); pasteElement();
  }
});

/* ──────────────────────────────────────────────────────────────
   v1.2.1 - SNAP / GRID
────────────────────────────────────────────────────────────── */
let snapEnabled = persistGet('snap-on', false);
const SNAP_THRESHOLD = 8;
const SNAP_GRID = 16;

function updateGridDisplay() {
  slideCanvas.classList.toggle('is-grid-on', snapEnabled);
}
updateGridDisplay();
document.getElementById('gridToggleBtn').addEventListener('click', () => {
  snapEnabled = !snapEnabled;
  persistSet('snap-on', snapEnabled);
  updateGridDisplay();
  toast(snapEnabled ? 'Snap + grid ON' : 'Snap OFF');
});

function snapValue(v) {
  if (!snapEnabled) return v;
  return Math.round(v / SNAP_GRID) * SNAP_GRID;
}

/* Show snap line during drag if element edge aligns with another */
function showSnapLines(el, allEls) {
  if (!snapEnabled || el.pos !== 'free') return;
  const vLine = document.getElementById('snapLineV');
  const hLine = document.getElementById('snapLineH');
  const rect = slideCanvas.getBoundingClientRect();
  let vMatch = null, hMatch = null;
  // Centre lines of canvas
  if (Math.abs(el.x + (el.width||0)/2 - rect.width/2) < SNAP_THRESHOLD) vMatch = rect.width/2;
  if (Math.abs(el.y + (el.height||0)/2 - rect.height/2) < SNAP_THRESHOLD) hMatch = rect.height/2;
  // Edges of other free elements
  allEls.filter(o => o.pos === 'free' && o.id !== el.id).forEach(o => {
    [o.x, o.x + (o.width||0)].forEach(x => {
      if (Math.abs(el.x - x) < SNAP_THRESHOLD) { vMatch = x; el.x = x; }
      if (Math.abs(el.x + (el.width||0) - x) < SNAP_THRESHOLD) { vMatch = x; el.x = x - (el.width||0); }
    });
    [o.y, o.y + (o.height||0)].forEach(y => {
      if (Math.abs(el.y - y) < SNAP_THRESHOLD) { hMatch = y; el.y = y; }
      if (Math.abs(el.y + (el.height||0) - y) < SNAP_THRESHOLD) { hMatch = y; el.y = y - (el.height||0); }
    });
  });
  if (vMatch !== null) { vLine.style.left = vMatch + 'px'; vLine.style.top = '0'; vLine.style.height = '100%'; vLine.classList.add('is-visible'); }
  else vLine.classList.remove('is-visible');
  if (hMatch !== null) { hLine.style.top = hMatch + 'px'; hLine.style.left = '0'; hLine.style.width = '100%'; hLine.classList.add('is-visible'); }
  else hLine.classList.remove('is-visible');
}
function hideSnapLines() {
  document.getElementById('snapLineV').classList.remove('is-visible');
  document.getElementById('snapLineH').classList.remove('is-visible');
}

/* Patch bindFreePositionDrag to snap + show guides */
const _origBindFreePositionDrag = bindFreePositionDrag;
bindFreePositionDrag = function(node, el, getElements, onChange) {
  if (el.pos !== 'free') return;
  ['nw','ne','sw','se'].forEach(corner => {
    if (!node.querySelector(`.ex-resize-handle--${corner}`)) {
      const h = document.createElement('div');
      h.className = 'ex-resize-handle ex-resize-handle--' + corner;
      h.dataset.corner = corner;
      node.appendChild(h);
    }
  });
  let dragging = null;
  node.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('ex-resize-handle')) {
      const corner = e.target.dataset.corner;
      dragging = { mode: 'resize', corner, startX: e.clientX, startY: e.clientY, sx: el.x, sy: el.y, sw: el.width, sh: el.height };
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (e.target.isContentEditable || e.target.closest('[contenteditable]')) return;
    if (e.target.closest('.ex-style-inspector') || e.target.closest('.ex-slide-element__controls')) return;
    dragging = { mode: 'move', startX: e.clientX, startY: e.clientY, sx: el.x, sy: el.y };
    e.preventDefault();
  });
  function onMove(e) {
    if (!dragging) return;
    if (dragging.mode === 'move') {
      el.x = snapValue(dragging.sx + (e.clientX - dragging.startX));
      el.y = snapValue(dragging.sy + (e.clientY - dragging.startY));
      showSnapLines(el, getElements());
      node.style.left = el.x + 'px'; node.style.top = el.y + 'px';
    } else if (dragging.mode === 'resize') {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      if (dragging.corner.includes('e')) el.width = Math.max(40, snapValue(dragging.sw + dx));
      if (dragging.corner.includes('s')) el.height = Math.max(20, snapValue(dragging.sh + dy));
      if (dragging.corner.includes('w')) { el.x = snapValue(dragging.sx + dx); el.width = Math.max(40, dragging.sw - dx); }
      if (dragging.corner.includes('n')) { el.y = snapValue(dragging.sy + dy); el.height = Math.max(20, dragging.sh - dy); }
      node.style.left = el.x + 'px'; node.style.top = el.y + 'px';
      node.style.width = el.width + 'px'; node.style.height = el.height + 'px';
    }
  }
  function onUp() {
    if (dragging) { dragging = null; hideSnapLines(); onChange(); }
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

/* ──────────────────────────────────────────────────────────────
   v1.2.2 - Z-ORDER (bring forward / send back)
────────────────────────────────────────────────────────────── */
function zOrder(direction) {
  if (!selectedElementId || currentSlideIdx < 0) return;
  const s = slidesDeck[currentSlideIdx];
  const idx = s.elements.findIndex(e => e.id === selectedElementId);
  if (idx < 0) return;
  let newIdx;
  if (direction === 'front') newIdx = s.elements.length - 1;
  else if (direction === 'back') newIdx = 0;
  else if (direction === 'forward') newIdx = Math.min(idx + 1, s.elements.length - 1);
  else if (direction === 'backward') newIdx = Math.max(idx - 1, 0);
  if (newIdx === idx) return;
  const [m] = s.elements.splice(idx, 1);
  s.elements.splice(newIdx, 0, m);
  saveSlidesWithHistory();
  renderSlideCanvas();
}
/* Inject z-order into style inspector via the existing patch */
const _origRenderStyleInspectorV12 = renderStyleInspector;
renderStyleInspector = function(el) {
  const base = _origRenderStyleInspectorV12(el);
  const zGroup = `<div class="ex-style-inspector__group">
    <button class="ex-style-inspector__btn" data-zorder="back" data-eid="${el.id}" title="Send to back">⤓</button>
    <button class="ex-style-inspector__btn" data-zorder="backward" data-eid="${el.id}" title="Send backward">↓</button>
    <button class="ex-style-inspector__btn" data-zorder="forward" data-eid="${el.id}" title="Bring forward">↑</button>
    <button class="ex-style-inspector__btn" data-zorder="front" data-eid="${el.id}" title="Bring to front">⤒</button>
  </div>`;
  return base.replace('</div>', zGroup + '</div>');
};
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-zorder]');
  if (!btn) return;
  selectedElementId = btn.dataset.eid;
  zOrder(btn.dataset.zorder);
}, true);

/* ──────────────────────────────────────────────────────────────
   v1.2.3 - MULTI-SELECT
────────────────────────────────────────────────────────────── */
let _multiSelected = new Set();
function clearMultiSelect() {
  _multiSelected.clear();
  document.querySelectorAll('.is-multi-selected').forEach(n => n.classList.remove('is-multi-selected'));
}
function toggleMultiSelect(eid) {
  if (_multiSelected.has(eid)) _multiSelected.delete(eid);
  else _multiSelected.add(eid);
  const node = slideCanvas.querySelector(`[data-eid="${eid}"]`);
  if (node) node.classList.toggle('is-multi-selected', _multiSelected.has(eid));
}
slideCanvas.addEventListener('click', (e) => {
  const node = e.target.closest('.ex-slide-element');
  if (!node) { clearMultiSelect(); return; }
  if (e.shiftKey) { toggleMultiSelect(node.dataset.eid); e.stopPropagation(); }
  else clearMultiSelect();
}, true);

function groupSelected() {
  if (_multiSelected.size < 2 || currentSlideIdx < 0) { toast('Shift-click 2+ elements first', true); return; }
  const s = slidesDeck[currentSlideIdx];
  const ids = Array.from(_multiSelected);
  const children = s.elements.filter(e => ids.includes(e.id));
  const remaining = s.elements.filter(e => !ids.includes(e.id));
  const group = { id: uid(), type: 'group', children };
  s.elements = [...remaining, group];
  clearMultiSelect();
  selectedElementId = group.id;
  saveSlidesWithHistory();
  renderSlideCanvas();
  toast('Grouped ' + children.length + ' elements');
}
function ungroupSelected() {
  if (!selectedElementId || currentSlideIdx < 0) return;
  const s = slidesDeck[currentSlideIdx];
  const el = s.elements.find(e => e.id === selectedElementId);
  if (!el || el.type !== 'group') { toast('Select a group first', true); return; }
  const idx = s.elements.findIndex(e => e.id === el.id);
  s.elements.splice(idx, 1, ...(el.children||[]));
  saveSlidesWithHistory();
  renderSlideCanvas();
  toast('Ungrouped');
}

/* Extend renderElement to handle group type via runtime patch */
const _origRenderElementV12 = renderElement;
renderElement = function(el, idx, total) {
  if (el.type === 'group') {
    const isSel = el.id === selectedElementId;
    const dataAttrs = `data-align="${el.align||'left'}" data-size="${el.size||'md'}" data-accent="${el.accent||'off'}"`;
    const handle = `<span class="ex-drag-handle" title="Drag to reorder">⋮⋮</span>`;
    const inspector = renderStyleInspector(el);
    const ctrls = `<div class="ex-slide-element__controls"><button class="ex-slide-element__ctrl-btn" data-act="del" data-eid="${el.id}" title="Delete">✕</button></div>`;
    const inner = `<div class="ex-se--group">${(el.children||[]).map(c => _origRenderElementV12(c)).join('')}</div>`;
    return `<div class="ex-slide-element ${isSel?'is-selected':''}" data-eid="${el.id}" draggable="true" ${dataAttrs}>${handle}${inspector}${ctrls}${inner}</div>`;
  }
  return _origRenderElementV12(el, idx, total);
};

/* ──────────────────────────────────────────────────────────────
   v1.2.4 - VISUAL SLIDE THUMBNAILS
────────────────────────────────────────────────────────────── */
const _origRenderSlideDeck = renderSlideDeck;
renderSlideDeck = function() {
  slideDeckEl.innerHTML = slidesDeck.map((s, i) => {
    const slide = migrateSlide(s);
    const elsHtml = (slide.elements||[]).slice(0, 6).map(e => _origRenderElementV12(e)).join('');
    return `<div class="ex-slide-thumb ${i === currentSlideIdx ? 'is-active' : ''}" data-idx="${i}">
      <div class="ex-slide-thumb__num">${i+1}</div>
      <div class="ex-slide-thumb__viewport" style="${s.bg ? 'background:'+s.bg : ''}">${elsHtml}</div>
    </div>`;
  }).join('');
  slideDeckEl.querySelectorAll('.ex-slide-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      currentSlideIdx = parseInt(thumb.dataset.idx);
      renderSlideCanvas();
      renderSlideDeck();
      loadSpeakerNotes();
    });
  });
};

/* ──────────────────────────────────────────────────────────────
   v1.2.5 - SPEAKER NOTES PER SLIDE
────────────────────────────────────────────────────────────── */
const speakerNotes = document.getElementById('speakerNotes');
const speakerNotesArea = document.getElementById('speakerNotesArea');
const speakerNotesHint = document.getElementById('speakerNotesHint');

document.getElementById('speakerNotesHeader').addEventListener('click', () => {
  speakerNotes.classList.toggle('is-open');
});
function loadSpeakerNotes() {
  if (currentSlideIdx < 0) return;
  const s = slidesDeck[currentSlideIdx];
  speakerNotesArea.value = s.notes || '';
  speakerNotesHint.textContent = (s.notes||'').length ? '· has notes' : 'click to expand';
}
let _spkTimer;
speakerNotesArea.addEventListener('input', () => {
  clearTimeout(_spkTimer);
  _spkTimer = setTimeout(() => {
    if (currentSlideIdx < 0) return;
    slidesDeck[currentSlideIdx].notes = speakerNotesArea.value;
    saveSlidesWithHistory();
    speakerNotesHint.textContent = speakerNotesArea.value.length ? '· has notes' : 'click to expand';
  }, 500);
});

/* ──────────────────────────────────────────────────────────────
   v1.2.6 - FIND & REPLACE
────────────────────────────────────────────────────────────── */
const findBar = document.getElementById('findBar');
const findInput = document.getElementById('findInput');
const replaceInput = document.getElementById('replaceInput');
const findCount = document.getElementById('findCount');
let _findMatches = [];
let _findCur = 0;

function openFindBar() {
  findBar.classList.add('is-visible');
  findInput.focus(); findInput.select();
  runFind();
}
function closeFindBar() { findBar.classList.remove('is-visible'); }
document.getElementById('findBtn').addEventListener('click', openFindBar);
document.getElementById('findCloseBtn').addEventListener('click', closeFindBar);

function eachTextField(slideIdx, fn) {
  const s = slidesDeck[slideIdx];
  if (!s.elements) return;
  s.elements.forEach((el, ei) => {
    const fields = ['text','caption','left','right'];
    fields.forEach(f => { if (typeof el[f] === 'string') fn(slideIdx, ei, f, el[f], (v)=>{el[f]=v;}); });
    if (el.items) el.items.forEach((it, j) => fn(slideIdx, ei, 'items.'+j, it, (v)=>{el.items[j]=v;}));
    if (el.children) el.children.forEach((c, ci) => fields.forEach(f => { if (typeof c[f] === 'string') fn(slideIdx, ei, 'children.'+ci+'.'+f, c[f], (v)=>{c[f]=v;}); }));
  });
}
function runFind() {
  const q = findInput.value;
  _findMatches = [];
  if (!q) { findCount.textContent = '0 / 0'; return; }
  slidesDeck.forEach((s, si) => {
    eachTextField(si, (slideIdx, ei, field, text, setter) => {
      if (text.toLowerCase().includes(q.toLowerCase())) _findMatches.push({ slideIdx, ei, field, setter });
    });
  });
  _findCur = 0;
  findCount.textContent = _findMatches.length ? `1 / ${_findMatches.length}` : '0 / 0';
  if (_findMatches.length) jumpToFindMatch(0);
}
function jumpToFindMatch(i) {
  const m = _findMatches[i];
  if (!m) return;
  currentSlideIdx = m.slideIdx;
  renderSlideCanvas(); renderSlideDeck(); loadSpeakerNotes();
}
findInput.addEventListener('input', runFind);
document.getElementById('findNextBtn').addEventListener('click', () => {
  if (!_findMatches.length) return;
  _findCur = (_findCur + 1) % _findMatches.length;
  findCount.textContent = `${_findCur+1} / ${_findMatches.length}`;
  jumpToFindMatch(_findCur);
});
document.getElementById('replaceOneBtn').addEventListener('click', () => {
  const q = findInput.value, r = replaceInput.value;
  if (!q || !_findMatches.length) return;
  const m = _findMatches[_findCur];
  // Reload current value (history could shift)
  const slide = slidesDeck[m.slideIdx];
  const elem = slide.elements[m.ei];
  if (m.field.startsWith('items.')) {
    const j = parseInt(m.field.split('.')[1]);
    elem.items[j] = elem.items[j].split(q).join(r);
  } else if (m.field.startsWith('children.')) {
    const parts = m.field.split('.');
    const ci = parseInt(parts[1]); const f = parts[2];
    elem.children[ci][f] = (elem.children[ci][f]||'').split(q).join(r);
  } else {
    elem[m.field] = (elem[m.field]||'').split(q).join(r);
  }
  saveSlidesWithHistory();
  renderSlideCanvas();
  runFind();
  toast('Replaced');
});
document.getElementById('replaceAllBtn').addEventListener('click', () => {
  const q = findInput.value, r = replaceInput.value;
  if (!q) return;
  let count = 0;
  slidesDeck.forEach((s, si) => {
    eachTextField(si, (_, __, ___, text, setter) => {
      if (text.includes(q)) { setter(text.split(q).join(r)); count++; }
    });
  });
  if (count) { saveSlidesWithHistory(); renderSlideCanvas(); runFind(); toast(`Replaced ${count}`); }
  else toast('No matches', true);
});

/* ──────────────────────────────────────────────────────────────
   v1.2.7 - ADVANCED TEXT CONTROLS
   v1.2.8 - IMAGE CONTROLS
────────────────────────────────────────────────────────────── */
const textControls = document.getElementById('textControls');
const imageControls = document.getElementById('imageControls');

function syncInspectorsForSelected() {
  const el = currentSlideIdx >= 0
    ? (slidesDeck[currentSlideIdx]?.elements||[]).find(e => e.id === selectedElementId)
    : null;
  if (!el) { textControls.classList.remove('is-visible'); imageControls.classList.remove('is-visible'); return; }
  const TEXT_TYPES = ['heading','subheading','body','dropcap','pullquote','callout','sourcetag'];
  if (TEXT_TYPES.includes(el.type)) {
    textControls.classList.add('is-visible');
    document.getElementById('tcFont').value = el.font || '';
    document.getElementById('tcColor').value = el.color || '#1a1a18';
    const lh = el.lineHeight ? Math.round(parseFloat(el.lineHeight)*100) : 155;
    document.getElementById('tcLineHeight').value = lh;
    document.getElementById('tcLineHeightVal').textContent = (lh/100).toFixed(2);
    const ls = el.letterSpacing ? parseFloat(el.letterSpacing)*100 : 0;
    document.getElementById('tcLetterSpacing').value = ls;
    document.getElementById('tcLetterSpacingVal').textContent = (ls/100).toFixed(2) + 'em';
  } else textControls.classList.remove('is-visible');

  if (el.type === 'image') {
    imageControls.classList.add('is-visible');
    document.getElementById('icFilter').value = el.imgfilter || '';
    document.getElementById('icBorder').value = el.imgborder || '';
    document.getElementById('icRound').value = el.imground || '';
  } else imageControls.classList.remove('is-visible');
}
function updateSelectedElementField(field, value) {
  if (currentSlideIdx < 0 || !selectedElementId) return;
  const el = slidesDeck[currentSlideIdx].elements.find(e => e.id === selectedElementId);
  if (!el) return;
  el[field] = value;
  saveSlidesWithHistory();
  renderSlideCanvas();
}
document.getElementById('tcFont').addEventListener('change', (e) => updateSelectedElementField('font', e.target.value));
document.getElementById('tcColor').addEventListener('input', (e) => updateSelectedElementField('color', e.target.value));
document.getElementById('tcColor').addEventListener('change', (e) => updateSelectedElementField('color', e.target.value));
document.getElementById('tcColorReset').addEventListener('click', () => updateSelectedElementField('color', ''));
document.getElementById('tcLineHeight').addEventListener('input', (e) => {
  document.getElementById('tcLineHeightVal').textContent = (parseInt(e.target.value)/100).toFixed(2);
  updateSelectedElementField('lineHeight', (parseInt(e.target.value)/100).toString());
});
document.getElementById('tcLetterSpacing').addEventListener('input', (e) => {
  document.getElementById('tcLetterSpacingVal').textContent = (parseInt(e.target.value)/100).toFixed(2) + 'em';
  updateSelectedElementField('letterSpacing', (parseInt(e.target.value)/100).toString());
});
document.getElementById('icFilter').addEventListener('change', (e) => updateSelectedElementField('imgfilter', e.target.value));
document.getElementById('icBorder').addEventListener('change', (e) => updateSelectedElementField('imgborder', e.target.value));
document.getElementById('icRound').addEventListener('change', (e) => updateSelectedElementField('imground', e.target.value));
document.getElementById('icShadow').addEventListener('click', () => {
  if (currentSlideIdx < 0 || !selectedElementId) return;
  const el = slidesDeck[currentSlideIdx].elements.find(e => e.id === selectedElementId);
  if (!el) return;
  el.imgshadow = el.imgshadow === 'on' ? '' : 'on';
  saveSlidesWithHistory();
  renderSlideCanvas();
});

/* Ensure overlay scaffolding (snap-grid, snap-lines, marquee) always exists inside slideCanvas */
function ensureCanvasOverlays() {
  if (!slideCanvas.querySelector('.ex-snap-grid')) {
    const g = document.createElement('div'); g.className = 'ex-snap-grid';
    slideCanvas.prepend(g);
  }
  if (!slideCanvas.querySelector('#snapLineV')) {
    const v = document.createElement('div'); v.id='snapLineV'; v.className='ex-snap-line ex-snap-line--v';
    slideCanvas.appendChild(v);
  }
  if (!slideCanvas.querySelector('#snapLineH')) {
    const h = document.createElement('div'); h.id='snapLineH'; h.className='ex-snap-line ex-snap-line--h';
    slideCanvas.appendChild(h);
  }
  if (!slideCanvas.querySelector('#marquee')) {
    const m = document.createElement('div'); m.id='marquee'; m.className='ex-marquee';
    slideCanvas.appendChild(m);
  }
}

/* Apply text/image data attrs to rendered nodes (inline styles for fonts) */
const _origRenderSlideCanvasV12 = renderSlideCanvas;
renderSlideCanvas = function() {
  _origRenderSlideCanvasV12();
  ensureCanvasOverlays();
  if (currentSlideIdx >= 0) {
    const s = slidesDeck[currentSlideIdx];
    (s.elements||[]).forEach(el => {
      const node = slideCanvas.querySelector(`[data-eid="${el.id}"]`);
      if (!node) return;
      // Image styling
      if (el.imgfilter) node.dataset.imgfilter = el.imgfilter;
      if (el.imgborder) node.dataset.imgborder = el.imgborder;
      if (el.imground) node.dataset.imground = el.imground;
      if (el.imgshadow) node.dataset.imgshadow = el.imgshadow;
      // Text styling
      const txt = node.querySelector('.ex-se--heading, .ex-se--subheading, .ex-se--body, .ex-se--dropcap, .ex-se--pullquote, .ex-se--callout');
      if (txt) {
        if (el.font) txt.dataset.font = el.font;
        if (el.color) txt.style.color = el.color;
        if (el.lineHeight) txt.style.lineHeight = el.lineHeight;
        if (el.letterSpacing) txt.style.letterSpacing = el.letterSpacing + 'em';
      }
    });
  }
  loadSpeakerNotes();
  syncInspectorsForSelected();
};

/* ──────────────────────────────────────────────────────────────
   v1.2 - Wire global keyboard for find / group
────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  const useCtrl = (e.ctrlKey || e.metaKey) && !e.altKey;
  if (!useCtrl) return;
  if (e.key === 'f' || e.key === 'F') {
    // Only in Build/Slides mode
    if (currentMode === 'build') { e.preventDefault(); openFindBar(); }
  } else if (e.key === 'g' || e.key === 'G') {
    if (currentMode !== 'build') return;
    e.preventDefault();
    if (e.shiftKey) ungroupSelected();
    else groupSelected();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && findBar.classList.contains('is-visible')) {
    closeFindBar();
  }
});

/* ──────────────────────────────────────────────────────────────
   v1.3.7 - BRAND KIT EDITOR
────────────────────────────────────────────────────────────── */
function getCustomVariants() { return persistGet('custom-variants', {}) || {}; }
function saveCustomVariants(v) { persistSet('custom-variants', v); }

const brandKitModal = document.getElementById('brandKitModal');
document.getElementById('brandKitBtn').addEventListener('click', () => {
  brandKitModal.classList.toggle('is-open');
  renderBkPreview();
  renderBkSavedList();
});
document.getElementById('bkCloseBtn').addEventListener('click', () => brandKitModal.classList.remove('is-open'));

function renderBkPreview() {
  const fire = document.getElementById('bkFire').value;
  const gold = document.getElementById('bkGold').value;
  const preview = document.getElementById('bkPreview');
  const family = document.getElementById('bkFamily').value;
  preview.style.background = family === 'press' ? '#101520' : '#faf6ec';
  preview.style.color = family === 'press' ? '#e8e6e1' : '#1a1a18';
  preview.querySelector('span').style.color = fire;
  preview.querySelector('div:last-child').style.color = gold;
  document.getElementById('bkGoldHex').value = gold;
  document.getElementById('bkFireHex').value = fire;
}
['bkGold','bkFire','bkFamily'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderBkPreview);
  document.getElementById(id).addEventListener('change', renderBkPreview);
});
['bkGoldHex','bkFireHex'].forEach(id => {
  document.getElementById(id).addEventListener('input', (e) => {
    const v = e.target.value.trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      document.getElementById(id.replace('Hex','')).value = v;
      renderBkPreview();
    }
  });
});
document.getElementById('bkSaveBtn').addEventListener('click', () => {
  const name = document.getElementById('bkName').value.trim() || 'Custom';
  const family = document.getElementById('bkFamily').value;
  const fire = document.getElementById('bkFire').value;
  const gold = document.getElementById('bkGold').value;
  const customs = getCustomVariants();
  if (!customs[family]) customs[family] = [];
  customs[family].push({ name, gold, goldDim: gold, fire, fireDim: fire });
  saveCustomVariants(customs);
  toast('Saved variant: ' + name);
  renderBkSavedList();
  // Append to THEME_VARIANTS so cycle uses it
  THEME_VARIANTS[family].push({ name, gold, goldDim: gold, fire, fireDim: fire });
});
function renderBkSavedList() {
  const customs = getCustomVariants();
  const el = document.getElementById('bkSavedList');
  const rows = [];
  for (const family of ['press','cream']) {
    (customs[family]||[]).forEach((v, i) => {
      rows.push(`<div class="ex-brandkit-list__row">
        <span class="ex-brandkit-list__chip" style="background:${v.fire};"></span>
        <span class="ex-brandkit-list__chip" style="background:${v.gold};"></span>
        <span style="flex:1;font-family:var(--ex-font-mono);">${family} · ${v.name}</span>
        <button class="ex-btn" data-del-bk="${family}.${i}" style="padding:2px 6px;font-size:9px;">×</button>
      </div>`);
    });
  }
  el.innerHTML = rows.join('') || '<div style="font-size:10px;color:var(--ex-text-muted);padding:6px;font-style:italic;">No custom variants yet</div>';
  el.querySelectorAll('[data-del-bk]').forEach(b => {
    b.addEventListener('click', () => {
      const [fam, idxStr] = b.dataset.delBk.split('.');
      const idx = parseInt(idxStr);
      const customs = getCustomVariants();
      if (customs[fam]) { customs[fam].splice(idx, 1); saveCustomVariants(customs); renderBkSavedList(); }
      // Rebuild THEME_VARIANTS arrays from base+customs
      // (Simpler: ask user to reload to re-apply removal cleanly)
      toast('Removed - reload to clean up cycling');
    });
  });
}
// On load, merge custom variants into THEME_VARIANTS
(function loadCustomVariants(){
  const customs = getCustomVariants();
  for (const family of ['press','cream']) {
    (customs[family]||[]).forEach(v => THEME_VARIANTS[family].push(v));
  }
})();

/* ──────────────────────────────────────────────────────────────
   v1.3.2 - PRESENTER MODE
   v1.3.3 - PER-ELEMENT ANIMATIONS
   v1.3.4 - SLIDE TRANSITIONS
────────────────────────────────────────────────────────────── */
const presenter = document.getElementById('presenter');
const presenterSlide = document.getElementById('presenterSlide');
const presenterNotes = document.getElementById('presenterNotes');
const presenterNotesContent = document.getElementById('presenterNotesContent');
let presIdx = 0;
let presRevealStep = 0;
let presActive = false;

function startPresent() {
  if (!slidesDeck.length) { toast('No slides to present', true); return; }
  presIdx = currentSlideIdx >= 0 ? currentSlideIdx : 0;
  presActive = true;
  presenter.classList.add('is-active');
  renderPresenterSlide(false);
  document.documentElement.requestFullscreen?.().catch(()=>{});
}
function stopPresent() {
  presActive = false;
  presenter.classList.remove('is-active');
  if (document.fullscreenElement) document.exitFullscreen?.();
}
function renderPresenterSlide(animated) {
  const slide = migrateSlide(slidesDeck[presIdx]);
  presenterSlide.dataset.transition = slide.transition || 'cut';
  presenterSlide.style.background = slide.bg || '#faf6ec';
  presenterSlide.innerHTML = (slide.elements||[]).filter(e => !e.hidden).map(el => _origRenderElementV12(el)).join('');
  // Clear style inspectors / controls
  presenterSlide.querySelectorAll('.ex-slide-element__controls, .ex-style-inspector, .ex-drag-handle, .ex-resize-handle').forEach(n => n.remove());
  // Apply animation data-anim attrs from el.anim
  (slide.elements||[]).forEach(el => {
    if (el.hidden || !el.anim) return;
    const node = presenterSlide.querySelector(`[data-eid="${el.id}"]`);
    if (node) node.dataset.anim = el.anim;
  });
  // Free-position style
  (slide.elements||[]).forEach(el => {
    if (el.pos === 'free') {
      const node = presenterSlide.querySelector(`[data-eid="${el.id}"]`);
      if (node) {
        node.style.position = 'absolute';
        node.style.left = (el.x||0)*0.5 + 'px';  // rough scale
        node.style.top = (el.y||0)*0.5 + 'px';
        if (el.width) node.style.width = el.width*0.5 + 'px';
        if (el.height) node.style.height = el.height*0.5 + 'px';
      }
    }
  });
  // Reveal animations: auto-anim elements appear immediately, click-anim wait for clicks
  presRevealStep = 0;
  setTimeout(() => {
    presenterSlide.querySelectorAll('[data-anim]').forEach(n => {
      const el = (slide.elements||[]).find(e => e.id === n.dataset.eid);
      if (el && el.reveal !== 'click') n.classList.add('is-revealed');
    });
    presenterSlide.querySelectorAll('.ex-slide-element:not([data-anim])').forEach(n => n.classList.add('is-revealed'));
  }, 50);
  // Counter
  document.getElementById('presCounter').textContent = `${presIdx+1} / ${slidesDeck.length}`;
  // Notes
  presenterNotesContent.textContent = slide.notes || '(no notes)';
}
function presNext() {
  // Check if any click-reveal elements pending
  const clickReveals = Array.from(presenterSlide.querySelectorAll('[data-anim]')).filter(n => !n.classList.contains('is-revealed'));
  if (clickReveals.length) {
    clickReveals[0].classList.add('is-revealed');
    return;
  }
  if (presIdx < slidesDeck.length - 1) {
    presenterSlide.classList.add('is-leaving');
    setTimeout(() => {
      presenterSlide.classList.remove('is-leaving');
      presIdx++;
      renderPresenterSlide(true);
    }, 500);
  }
}
function presPrev() {
  if (presIdx > 0) {
    presIdx--;
    renderPresenterSlide(true);
  }
}
document.getElementById('presentBtn').addEventListener('click', startPresent);
document.getElementById('presNextBtn').addEventListener('click', presNext);
document.getElementById('presPrevBtn').addEventListener('click', presPrev);
document.getElementById('presExitBtn').addEventListener('click', stopPresent);
document.getElementById('presNotesBtn').addEventListener('click', () => presenterNotes.classList.toggle('is-visible'));

document.addEventListener('keydown', (e) => {
  if (!presActive) return;
  if (e.key === 'Escape') stopPresent();
  else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); presNext(); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); presPrev(); }
  else if (e.key === 'n' || e.key === 'N') presenterNotes.classList.toggle('is-visible');
});
// F5 to start
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5' && currentMode === 'build' && !presActive) {
    e.preventDefault();
    startPresent();
  }
});

/* Inject anim controls into style inspector via runtime patch */
const _origRenderStyleInspectorV13 = renderStyleInspector;
renderStyleInspector = function(el) {
  const base = _origRenderStyleInspectorV13(el);
  const animGroup = `<div class="ex-style-inspector__group">
    <select data-style="anim" data-eid="${el.id}" style="font-family:var(--ex-font-mono);font-size:9px;padding:1px 4px;background:var(--ex-bg);border:1px solid var(--ex-border);color:var(--ex-text);border-radius:2px;">
      <option value="" ${!el.anim?'selected':''}>no anim</option>
      <option value="fade" ${el.anim==='fade'?'selected':''}>fade</option>
      <option value="slide-up" ${el.anim==='slide-up'?'selected':''}>slide↑</option>
      <option value="slide-left" ${el.anim==='slide-left'?'selected':''}>slide←</option>
      <option value="scale" ${el.anim==='scale'?'selected':''}>scale</option>
    </select>
    <select data-style="reveal" data-eid="${el.id}" style="font-family:var(--ex-font-mono);font-size:9px;padding:1px 4px;background:var(--ex-bg);border:1px solid var(--ex-border);color:var(--ex-text);border-radius:2px;">
      <option value="auto" ${el.reveal!=='click'?'selected':''}>auto</option>
      <option value="click" ${el.reveal==='click'?'selected':''}>click</option>
    </select>
  </div>`;
  return base.replace('</div>', animGroup + '</div>');
};
// Bind anim/reveal selects
document.addEventListener('change', (e) => {
  const sel = e.target.closest('[data-style]');
  if (!sel || (sel.dataset.style !== 'anim' && sel.dataset.style !== 'reveal')) return;
  const eid = sel.dataset.eid;
  const el = slidesDeck[currentSlideIdx]?.elements?.find(x => x.id === eid);
  if (!el) return;
  el[sel.dataset.style] = sel.value;
  saveSlidesWithHistory();
  renderSlideCanvas();
});

/* Transition selector per slide */
const transitionSel = document.getElementById('transitionSel');
transitionSel.addEventListener('change', () => {
  if (currentSlideIdx < 0) return;
  slidesDeck[currentSlideIdx].transition = transitionSel.value;
  saveSlidesWithHistory();
});
const _origRenderSlideCanvasV13 = renderSlideCanvas;
renderSlideCanvas = function() {
  _origRenderSlideCanvasV13();
  if (currentSlideIdx >= 0 && transitionSel) {
    transitionSel.value = slidesDeck[currentSlideIdx].transition || 'cut';
    // Apply data-anim attr to canvas elements
    (slidesDeck[currentSlideIdx].elements||[]).forEach(el => {
      if (el.anim) {
        const node = slideCanvas.querySelector(`[data-eid="${el.id}"]`);
        if (node) node.dataset.anim = el.anim;
      }
    });
  }
};

/* Reading Mode - readingModeBtn/readingExitBtn/toggleReadingMode - was miscaptured from
   Coach's markup during the overlay move; it is Coach's own Library feature and has
   nothing to do with slides or doc. Moved back - see apps/coach.html. */

/* The Single/Cohort tab wiring for Assess moved back to Coach with getCohort/
   renderCohort - it never belonged here; see apps/coach.html. */
let docElements = persistGet('doc-elements', null) || [];
const docPageEl = document.getElementById('docPage');

function renderDoc() {
  if (!docElements.length) {
    docPageEl.innerHTML = '<div class="ex-slide-canvas__hint">Empty doc - add elements from the palette →</div>';
    return;
  }
  docPageEl.innerHTML = docElements.map(el => renderElement(el)).join('');
  bindElementEditing(docPageEl,
    () => docElements,
    () => { persistSet('doc-elements', docElements); renderDoc(); }
  );
}
function insertDocElement(type) {
  const fresh = { id: uid(), type };
  switch (type) {
    case 'heading': fresh.text = 'Heading'; break;
    case 'subheading': fresh.text = 'Subheading'; break;
    case 'body': fresh.text = 'Body paragraph. Type here.'; break;
    case 'dropcap': fresh.text = 'Drop-cap paragraph - the first letter will render large and italic in your theme accent.'; break;
    case 'pullquote': fresh.text = 'A memorable line.'; break;
    case 'bullets': fresh.items = ['Point one', 'Point two', 'Point three']; break;
    case 'numbered': fresh.items = ['Step one', 'Step two', 'Step three']; break;
    case 'callout': fresh.text = 'A highlighted note.'; break;
    case 'columns': fresh.left = 'Left.'; fresh.right = 'Right.'; break;
    case 'sourcetag': fresh.text = 'source.pdf'; break;
  }
  docElements.push(fresh);
  selectedElementId = fresh.id;
  persistSet('doc-elements', docElements);
  renderDoc();
}
document.querySelectorAll('[data-doc-add]').forEach(btn => {
  btn.addEventListener('click', () => insertDocElement(btn.dataset.docAdd));
});
document.getElementById('docAddPara').addEventListener('click', () => insertDocElement('body'));
document.getElementById('docAddHeading').addEventListener('click', () => insertDocElement('heading'));
document.getElementById('docAddDivider').addEventListener('click', () => insertDocElement('divider'));
document.getElementById('docClearBtn').addEventListener('click', () => {
  if (!confirm('Clear the entire doc?')) return;
  docElements = []; persistSet('doc-elements', docElements); renderDoc(); toast('Doc cleared');
});
document.getElementById('docCopyBtn').addEventListener('click', () => {
  const lines = docElements.map(el => {
    if (el.text) return el.text;
    if (el.items) return el.items.map(i=>'• '+i).join('\n');
    if (el.left || el.right) return (el.left||'') + ' | ' + (el.right||'');
    return '';
  }).filter(Boolean).join('\n\n');
  copyText(lines);
});
document.getElementById('docPrintBtn').addEventListener('click', () => {
  if (!docElements.length) { toast('Empty doc', true); return; }
  const html = docElements.map(renderElementForPrint).join('');
  const css = `
    @import url('${FONTS_CSS}');
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
    body{background:#fff;color:#1a1a18;font-family:'Cormorant Garamond',Georgia,serif;font-size:14pt;line-height:1.6;max-width:680px;margin:0 auto;padding:48px 32px;}
    .p-heading{font-family:'Playfair Display',serif;font-size:36pt;font-weight:900;margin:14pt 0 8pt;}
    .p-heading.is-large{font-size:56pt;text-align:center;}
    .p-subheading{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:18pt;color:#8b2c0e;margin:6pt 0;}
    .p-body{margin-bottom:10pt;}
    .p-dropcap{margin-bottom:10pt;}
    .p-dropcap::first-letter{font-family:'Playfair Display',serif;font-weight:900;font-style:italic;color:#8b2c0e;font-size:64pt;float:left;line-height:0.85;padding:4pt 8pt 0 0;}
    .p-pullquote{padding:10pt 14pt 10pt 28pt;border-left:3px double #8b2c0e;font-style:italic;font-size:16pt;margin:10pt 0;}
    .p-bullets{list-style:none;padding:0;margin:0 0 10pt 0;}
    .p-bullets li{padding:3pt 0 3pt 18pt;position:relative;}
    .p-bullets li::before{content:'§';position:absolute;left:0;color:#8b2c0e;}
    .p-numbered{padding-left:24pt;margin-bottom:10pt;}
    .p-callout{padding:10pt 14pt;background:#f7e9c9;border-left:4px solid #b8901c;margin:10pt 0;}
    .p-columns{display:grid;grid-template-columns:1fr 1fr;gap:24pt;margin:10pt 0;}
    .p-divider{display:flex;justify-content:center;margin:14pt 0;}
    .p-sourcetag{display:inline-block;padding:2pt 6pt;background:#eee;font-family:'DM Mono',monospace;font-size:9pt;color:#666;border:1px solid #ccc;margin:4pt 4pt 4pt 0;}
    .footer{margin-top:32pt;padding-top:10pt;border-top:1px solid #ccc;text-align:center;font-family:'DM Mono',monospace;font-size:9pt;color:#888;text-transform:uppercase;letter-spacing:0.1em;}
    @page{margin:18mm 16mm;}
  `;
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) { toast('Pop-up blocked', true); return; }
  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Excelsior Doc - print</title><style>${css}</style></head><body>${html}<div class="footer">Excelsior Coach · theGuide.club · Selvan K. Naicker</div><script>setTimeout(()=>window.print(),400);</scr`+`ipt></body></html>`);
  w.document.close();
  toast('Print preview opened');
});

/* Build tab switching to wire Doc */
document.querySelectorAll('.ex-build-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ex-build-tab').forEach(t => t.classList.remove('is-active'));
    document.querySelectorAll('#panelBuild .ex-build-panel').forEach(p => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    const map = { templates:'buildTemplates', slides:'buildSlides', doc:'buildDoc' };
    document.getElementById(map[tab.dataset.build]).classList.add('is-active');
    if (tab.dataset.build === 'doc') renderDoc();
  });
});

/* ──────────────────────────────────────────────────────────────
   ELEMENT PRESETS (v1.0.6)
────────────────────────────────────────────────────────────── */
function getPresets() { return persistGet('presets', []) || []; }
function savePresets(list) { persistSet('presets', list); }

function renderPresets() {
  const list = getPresets();
  const el = document.getElementById('presetsList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div style="font-size:10px;color:var(--ex-text-muted);padding:4px;font-style:italic;">No presets saved yet</div>';
    return;
  }
  el.innerHTML = list.map((p, i) => `
    <div class="ex-preset-row">
      <span class="ex-preset-row__name" data-preset-idx="${i}" title="Insert ${p.elements.length} elements">${p.name}</span>
      <button class="ex-preset-row__del" data-del-preset="${i}" title="Delete">×</button>
    </div>
  `).join('');
  el.querySelectorAll('[data-preset-idx]').forEach(n => {
    n.addEventListener('click', () => {
      const p = getPresets()[parseInt(n.dataset.presetIdx)];
      if (!p || currentSlideIdx < 0) { toast('Open a slide first', true); return; }
      const slide = slidesDeck[currentSlideIdx];
      // Clone preset elements with fresh ids
      p.elements.forEach(srcEl => {
        const fresh = JSON.parse(JSON.stringify(srcEl));
        fresh.id = uid();
        slide.elements.push(fresh);
      });
      persistSet('slides-deck', slidesDeck);
      renderSlideCanvas();
      toast('Inserted preset: ' + p.name);
    });
  });
  el.querySelectorAll('[data-del-preset]').forEach(n => {
    n.addEventListener('click', () => {
      const idx = parseInt(n.dataset.delPreset);
      const list = getPresets();
      list.splice(idx, 1);
      savePresets(list);
      renderPresets();
      toast('Preset deleted');
    });
  });
}
document.getElementById('saveSelAsPreset').addEventListener('click', () => {
  if (currentSlideIdx < 0 || !slidesDeck[currentSlideIdx]?.elements?.length) { toast('Open a slide with elements first', true); return; }
  const name = prompt('Preset name:', 'My Combo');
  if (!name) return;
  const list = getPresets();
  list.push({ name, elements: JSON.parse(JSON.stringify(slidesDeck[currentSlideIdx].elements)) });
  savePresets(list);
  renderPresets();
  toast('Preset saved: ' + name);
});
renderPresets();

function renderSlideDeck() {
  slideDeckEl.innerHTML = slidesDeck.map((s, i) => `
    <div class="ex-slide-thumb ${i === currentSlideIdx ? 'is-active' : ''}" data-idx="${i}">
      ${i+1}. ${s.layout}
    </div>
  `).join('');
  slideDeckEl.querySelectorAll('.ex-slide-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      currentSlideIdx = parseInt(thumb.dataset.idx);
      renderSlideCanvas();
      renderSlideDeck();
    });
  });
}

function deckAsText() {
  return slidesDeck.map((s, i) => {
    const slide = migrateSlide(s);
    const sep = '─'.repeat(50);
    const lines = (slide.elements||[]).map(el => {
      switch (el.type) {
        case 'heading': return '\n# ' + (el.text||'');
        case 'subheading': return '## ' + (el.text||'');
        case 'body': case 'dropcap': case 'callout': return (el.text||'');
        case 'pullquote': return '> ' + (el.text||'');
        case 'bullets': return (el.items||[]).map(it=>'  § '+it).join('\n');
        case 'numbered': return (el.items||[]).map((it,j)=>'  '+(j+1)+'. '+it).join('\n');
        case 'columns': return 'LEFT: '+(el.left||'')+'\nRIGHT: '+(el.right||'');
        case 'divider': return '- ◆ -';
        case 'ornament': case 'sunburst': case 'fleur': return '※ ※ ※';
        case 'sourcetag': return '[ '+(el.text||'')+' ]';
        default: return '';
      }
    }).filter(Boolean);
    return `SLIDE ${i+1} [${(slide.layout||'').toUpperCase()}]\n${sep}\n${lines.join('\n')}\n`;
  }).join('\n');
}
function exportDeck() {
  if (!slidesDeck.length) { toast('No slides to export', true); return; }
  const text = deckAsText();
  const blob = new Blob([text], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'excelsior-deck.txt';
  a.click(); URL.revokeObjectURL(url);
  toast('Deck downloaded');
}
function copyDeck() {
  if (!slidesDeck.length) { toast('No slides to copy', true); return; }
  copyText(deckAsText());
}

/* Printable slide deck - one slide per page, 16:9, opens in a new window */
function renderElementForPrint(el) {
  switch (el.type) {
    case 'heading':
      return `<div class="p-heading ${el.size==='large'?'is-large':''}">${escapeHtml(el.text||'')}</div>`;
    case 'subheading':
      return `<div class="p-subheading">${escapeHtml(el.text||'')}</div>`;
    case 'body':
      return `<div class="p-body">${escapeHtml(el.text||'')}</div>`;
    case 'dropcap':
      return `<div class="p-dropcap">${escapeHtml(el.text||'')}</div>`;
    case 'pullquote':
      return `<div class="p-pullquote">${escapeHtml(el.text||'')}</div>`;
    case 'bullets':
      return `<ul class="p-bullets">${(el.items||[]).map(it=>`<li>${escapeHtml(it)}</li>`).join('')}</ul>`;
    case 'numbered':
      return `<ol class="p-numbered">${(el.items||[]).map(it=>`<li>${escapeHtml(it)}</li>`).join('')}</ol>`;
    case 'callout':
      return `<div class="p-callout">${escapeHtml(el.text||'')}</div>`;
    case 'columns':
      return `<div class="p-columns"><div>${escapeHtml(el.left||'')}</div><div>${escapeHtml(el.right||'')}</div></div>`;
    case 'divider':
      return `<div class="p-divider"><svg width="44" height="14" viewBox="0 0 44 14" fill="#8b2c0e"><path d="M22 1 L26 7 L22 13 L18 7 Z"/><path d="M14 7 L9 4 L9 10 Z" opacity="0.7"/><path d="M30 7 L35 4 L35 10 Z" opacity="0.7"/></svg></div>`;
    case 'ornament':
      return `<div class="p-divider"><svg width="120" height="16" viewBox="0 0 120 16" fill="#8b2c0e"><path d="M60 2 L66 8 L60 14 L54 8 Z"/><path d="M44 8 C 48 4, 52 4, 54 8 C 52 12, 48 12, 44 8 Z" opacity="0.6"/><path d="M76 8 C 72 4, 68 4, 66 8 C 68 12, 72 12, 76 8 Z" opacity="0.6"/><line x1="14" y1="8" x2="42" y2="8" stroke="#8b2c0e" stroke-width="0.6"/><line x1="78" y1="8" x2="106" y2="8" stroke="#8b2c0e" stroke-width="0.6"/><circle cx="10" cy="8" r="2"/><circle cx="110" cy="8" r="2"/></svg></div>`;
    case 'sunburst':
      return `<div class="p-divider"><svg width="100" height="100" viewBox="0 0 200 200" fill="#8b2c0e"><defs><g id="rsx"><polygon points="100,100 99,0 101,0"/></g></defs><use href="#rsx"/><use href="#rsx" transform="rotate(30 100 100)"/><use href="#rsx" transform="rotate(60 100 100)"/><use href="#rsx" transform="rotate(90 100 100)"/><use href="#rsx" transform="rotate(120 100 100)"/><use href="#rsx" transform="rotate(150 100 100)"/><use href="#rsx" transform="rotate(180 100 100)"/><use href="#rsx" transform="rotate(210 100 100)"/><use href="#rsx" transform="rotate(240 100 100)"/><use href="#rsx" transform="rotate(270 100 100)"/><use href="#rsx" transform="rotate(300 100 100)"/><use href="#rsx" transform="rotate(330 100 100)"/><circle cx="100" cy="100" r="32" fill="none" stroke="#8b2c0e" stroke-width="2"/></svg></div>`;
    case 'fleur':
      return `<div class="p-divider"><svg width="56" height="56" viewBox="0 0 28 28" fill="#8b2c0e"><path d="M14 2 C14 8, 18 10, 20 12 C18 14, 14 14, 14 20 C14 14, 10 14, 8 12 C10 10, 14 8, 14 2 Z"/><path d="M14 18 L14 26" stroke="#8b2c0e" stroke-width="1.2"/><ellipse cx="14" cy="22" rx="5" ry="1"/></svg></div>`;
    case 'sourcetag':
      return `<div><span class="p-sourcetag">${escapeHtml(el.text||'')}</span></div>`;
    default:
      return '';
  }
}
function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function printDeck() {
  if (!slidesDeck.length) { toast('No slides to print', true); return; }
  const slidesHtml = slidesDeck.map((s, i) => {
    const slide = migrateSlide(s);
    const isTitle = slide.layout === 'title';
    const body = (slide.elements||[]).map(renderElementForPrint).join('');
    return `<section class="slide" data-layout="${slide.layout}"><div class="slide-num">${i+1} / ${slidesDeck.length}</div><div class="slide-inner ${isTitle?'is-title':''}">${body}</div><div class="slide-footer">Excelsior · theGuide.club</div></section>`;
  }).join('');
  const css = `
    @import url('${FONTS_CSS}');
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
    body{background:#f4eee0;font-family:'Cormorant Garamond',Georgia,serif;color:#1a1a18;}
    .slide{
      width:100vw;height:100vh;
      padding:48px 64px;
      display:flex;flex-direction:column;justify-content:flex-start;
      page-break-after:always;page-break-inside:avoid;
      position:relative;
      background:#faf6ec;
      border:2px solid #d4cab5;
    }
    .slide-inner{flex:1;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;padding:24px 16px;overflow:hidden;}
    .slide-inner.is-title{justify-content:center;align-items:center;}
    .slide::before{
      content:'';position:absolute;top:24px;left:32px;right:32px;height:1px;
      background:#8b2c0e;opacity:0.3;
    }
    .slide::after{
      content:'';position:absolute;bottom:24px;left:32px;right:32px;height:1px;
      background:#8b2c0e;opacity:0.3;
    }
    .slide-num{
      position:absolute;top:18px;right:32px;
      font-family:'DM Mono',monospace;font-size:11px;color:#6b6455;
      letter-spacing:0.15em;text-transform:uppercase;
    }
    .slide-footer{
      position:absolute;bottom:18px;left:32px;
      font-family:'DM Mono',monospace;font-size:10px;color:#8b2c0e;
      letter-spacing:0.15em;text-transform:uppercase;opacity:0.7;
    }
    /* Element renderers */
    .p-heading{font-family:'Playfair Display',serif;font-weight:900;font-size:48px;line-height:1.05;letter-spacing:-0.02em;color:#1a1a18;}
    .p-heading.is-large{font-size:84px;text-align:center;}
    .p-subheading{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:24px;color:#8b2c0e;line-height:1.4;}
    .is-title .p-subheading{text-align:center;font-size:28px;margin-top:8px;}
    .p-body{font-family:'Cormorant Garamond',serif;font-size:20px;line-height:1.55;}
    .p-dropcap{font-family:'Cormorant Garamond',serif;font-size:20px;line-height:1.55;}
    .p-dropcap::first-letter{font-family:'Playfair Display',serif;font-weight:900;font-style:italic;color:#8b2c0e;font-size:80px;float:left;line-height:0.85;padding:4px 12px 0 0;}
    .p-pullquote{padding:14px 20px 14px 36px;border-left:3px double #8b2c0e;font-style:italic;font-size:22px;line-height:1.45;position:relative;}
    .p-pullquote::before{content:'"';position:absolute;top:-12px;left:8px;font-family:'Playfair Display',serif;font-size:56px;color:#8b2c0e;opacity:0.5;line-height:1;}
    .p-bullets{list-style:none;padding:0;font-size:20px;line-height:1.5;}
    .p-bullets li{padding:5px 0 5px 28px;position:relative;}
    .p-bullets li::before{content:'§';position:absolute;left:0;color:#8b2c0e;font-weight:700;}
    .p-numbered{list-style:decimal;padding-left:32px;font-size:20px;line-height:1.5;}
    .p-numbered li{padding:5px 0;}
    .p-callout{padding:14px 18px;background:#f7e9c9;border-left:4px solid #b8901c;font-size:18px;line-height:1.55;}
    .p-columns{display:grid;grid-template-columns:1fr 1fr;gap:32px;font-size:18px;line-height:1.55;}
    .p-divider{display:flex;justify-content:center;margin:8px 0;}
    .p-sourcetag{display:inline-block;padding:4px 10px;background:#ebe3d3;color:#6b6455;border:1px solid #d4cab5;font-family:'DM Mono',monospace;font-size:11px;}
    /* Layout flavours */
    [data-layout="discussion"] .p-bullets li::before{content:'?';font-style:italic;}
    [data-layout="practice"] .p-bullets li::before{content:'▸';}
    [data-layout="summary"] .p-bullets li::before{content:'✦';}
    @media print{
      @page{size:landscape;margin:0;}
      body{background:#fff;}
      .slide{border:none;width:297mm;height:210mm;}
    }
  `;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Excelsior Deck - print</title><style>${css}</style></head><body>${slidesHtml}<script>setTimeout(()=>window.print(),400);</scr`+`ipt></body></html>`;
  const w = window.open('', '_blank', 'width=1024,height=720');
  if (!w) { toast('Pop-up blocked - allow pop-ups to print', true); return; }
  w.document.open(); w.document.write(html); w.document.close();
  toast('Print preview opened');
}

/* Print pillar - open current pillar view in a new window with print CSS */
function printPillar() {
  const content = facilitateContent.innerHTML;
  if (!content || content.includes('Select a pillar')) { toast('Open a pillar first', true); return; }
  const title = facilitateContent.querySelector('h2')?.textContent || 'Excelsior Pillar';
  const css = `
    @import url('${FONTS_CSS}');
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
    body{
      background:#fff;color:#1a1a18;
      font-family:'Cormorant Garamond',Georgia,serif;font-size:14pt;line-height:1.6;
      max-width:680px;margin:0 auto;padding:48px 32px;
    }
    h2{font-family:'Playfair Display',serif;font-size:36pt;font-weight:900;line-height:1.05;margin-bottom:12pt;}
    h3{font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:18pt;color:#8b2c0e;margin:20pt 0 8pt;}
    p{margin-bottom:10pt;}
    ul{margin:0 0 12pt 24pt;}
    li{margin-bottom:4pt;}
    .ex-source-tag{display:inline-block;padding:2pt 6pt;background:#eee;font-family:'DM Mono',monospace;font-size:8pt;color:#666;margin-right:4pt;border:1px solid #ddd;}
    .ex-pull-quote{border-left:4px double #8b2c0e;padding:8pt 12pt;margin:12pt 0;font-style:italic;}
    .ex-card{border:1px solid #ddd;padding:12pt;margin:12pt 0;background:#faf6ec;}
    .ex-card__title{font-family:'Playfair Display',serif;font-style:italic;color:#8b2c0e;font-size:14pt;margin-bottom:4pt;}
    .ex-gloss{border-bottom:1px dotted #8b2c0e;}
    .ex-gloss::after,.ex-gloss::before{display:none;}
    .ex-ornament-divider{display:flex;justify-content:center;margin:16pt 0;color:#8b2c0e;}
    button{display:none;}
    .footer{margin-top:40pt;padding-top:12pt;border-top:1px solid #ccc;text-align:center;font-family:'DM Mono',monospace;font-size:9pt;color:#666;letter-spacing:0.1em;text-transform:uppercase;}
    @page{margin:18mm 16mm;}
    @media print{button{display:none !important;}}
  `;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${title} - print</title><style>${css}</style></head><body>${content}<div class="footer">Excelsior Coach · theGuide.club · Selvan K. Naicker</div><script>setTimeout(()=>window.print(),400);</scr`+`ipt></body></html>`;
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) { toast('Pop-up blocked - allow pop-ups to print', true); return; }
  w.document.open(); w.document.write(html); w.document.close();
  toast('Print preview opened');
}

addSlideBtn.addEventListener('click', addSlide);
exportDeckBtn.addEventListener('click', exportDeck);
document.getElementById('copyDeckBtn').addEventListener('click', copyDeck);
document.getElementById('printDeckBtn').addEventListener('click', printDeck);
/* printPillarBtn was Coach's Facilitate chrome · it stayed with Coach */
document.getElementById('clearDeckBtn').addEventListener('click', () => {
  if (!slidesDeck.length) return;
  slidesDeck = []; currentSlideIdx = -1;
  persistSet('slides-deck', slidesDeck);
  renderSlideCanvas(); renderSlideDeck();
  toast('Deck cleared');
});

/* (Legacy build tab switcher removed - superseded by Doc-aware handler above) */




/* ── the parts Coach kept outside the section banners ──────────────────────
   Deck state, the slide/element/doc monkey-patch layer, the pattern-background
   controls, clipping import and the markdown importer. All studio code; it only
   lived elsewhere because the banners were drawn late. */
/* hoisted to the top of the module · see the shim */
/* hoisted to the top of the module · see the shim */

const savedDeck = persistGet('slides-deck', null);
if (savedDeck && Array.isArray(savedDeck) && savedDeck.length) {
  slidesDeck = savedDeck;
  currentSlideIdx = 0;
}

/* Coach's boot ran renderScorecard / updateScoreSummary / renderHistory here too;
   those are Assess's and went back with it. The studio's own first paint no longer
   happens at script load either - the host calls init() when a pane opens, which is
   the only moment the studio's DOM is on screen. */


function deleteCurrentSlide() {
  if (currentSlideIdx < 0 || !slidesDeck.length) { toast('No slide to delete', true); return; }
  slidesDeck.splice(currentSlideIdx, 1);
  currentSlideIdx = Math.min(currentSlideIdx, slidesDeck.length - 1);
  persistSet('slides-deck', slidesDeck);
  renderSlideCanvas(); renderSlideDeck();
  toast('Slide deleted');
}
function duplicateCurrentSlide() {
  if (currentSlideIdx < 0 || !slidesDeck[currentSlideIdx]) { toast('No slide to duplicate', true); return; }
  const copy = JSON.parse(JSON.stringify(slidesDeck[currentSlideIdx]));
  slidesDeck.splice(currentSlideIdx + 1, 0, copy);
  currentSlideIdx++;
  persistSet('slides-deck', slidesDeck);
  renderSlideCanvas(); renderSlideDeck();
  toast('Slide duplicated');
}
function moveSlide(dir) {
  if (currentSlideIdx < 0 || slidesDeck.length < 2) return;
  const newIdx = currentSlideIdx + dir;
  if (newIdx < 0 || newIdx >= slidesDeck.length) return;
  const [moved] = slidesDeck.splice(currentSlideIdx, 1);
  slidesDeck.splice(newIdx, 0, moved);
  currentSlideIdx = newIdx;
  persistSet('slides-deck', slidesDeck);
  renderSlideCanvas(); renderSlideDeck();
}
// Bind to toolbar buttons (added below)
setTimeout(() => {
  const dB = document.getElementById('deleteSlideBtn'); if (dB) dB.addEventListener('click', deleteCurrentSlide);
  const dpB = document.getElementById('dupSlideBtn'); if (dpB) dpB.addEventListener('click', duplicateCurrentSlide);
  const upB = document.getElementById('moveUpBtn'); if (upB) upB.addEventListener('click', () => moveSlide(-1));
  const dnB = document.getElementById('moveDnBtn'); if (dnB) dnB.addEventListener('click', () => moveSlide(1));
}, 100);


document.querySelectorAll('[data-pattern]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentSlideIdx < 0) { toast('Open a slide first', true); return; }
    slidesDeck[currentSlideIdx].bg = BG_PATTERNS[btn.dataset.pattern];
    applyBgToCanvas();
    saveSlidesWithHistory();
  });
});

/* Gradient builder */
function buildGradient() {
  const c1 = document.getElementById('grad1').value;
  const c2 = document.getElementById('grad2').value;
  const type = document.getElementById('gradType').value;
  const angle = document.getElementById('gradAngle').value;
  return type === 'radial'
    ? `radial-gradient(circle at center, ${c1}, ${c2})`
    : `linear-gradient(${angle}deg, ${c1}, ${c2})`;
}
['grad1','grad2','gradType','gradAngle'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    document.getElementById('gradAngleVal').textContent = document.getElementById('gradAngle').value + '°';
    // Live-preview if slide is selected
    if (currentSlideIdx >= 0) {
      slidesDeck[currentSlideIdx].bg = buildGradient();
      applyBgToCanvas();
    }
  });
});
document.getElementById('gradApply').addEventListener('click', () => {
  if (currentSlideIdx < 0) { toast('Open a slide first', true); return; }
  slidesDeck[currentSlideIdx].bg = buildGradient();
  applyBgToCanvas();
  saveSlidesWithHistory();
  toast('Gradient applied');
});

/* Motif overlays */
const MOTIF_SVGS = {
  sunburst: `<svg viewBox="0 0 200 200" fill="currentColor"><defs><g id="rsm"><polygon points="100,100 99,0 101,0"/></g></defs><use href="#rsm"/><use href="#rsm" transform="rotate(15 100 100)"/><use href="#rsm" transform="rotate(30 100 100)"/><use href="#rsm" transform="rotate(45 100 100)"/><use href="#rsm" transform="rotate(60 100 100)"/><use href="#rsm" transform="rotate(75 100 100)"/><use href="#rsm" transform="rotate(90 100 100)"/><use href="#rsm" transform="rotate(105 100 100)"/><use href="#rsm" transform="rotate(120 100 100)"/><use href="#rsm" transform="rotate(135 100 100)"/><use href="#rsm" transform="rotate(150 100 100)"/><use href="#rsm" transform="rotate(165 100 100)"/><use href="#rsm" transform="rotate(180 100 100)"/><use href="#rsm" transform="rotate(195 100 100)"/><use href="#rsm" transform="rotate(210 100 100)"/><use href="#rsm" transform="rotate(225 100 100)"/><use href="#rsm" transform="rotate(240 100 100)"/><use href="#rsm" transform="rotate(255 100 100)"/><use href="#rsm" transform="rotate(270 100 100)"/><use href="#rsm" transform="rotate(285 100 100)"/><use href="#rsm" transform="rotate(300 100 100)"/><use href="#rsm" transform="rotate(315 100 100)"/><use href="#rsm" transform="rotate(330 100 100)"/><use href="#rsm" transform="rotate(345 100 100)"/></svg>`,
  fleur: `<svg viewBox="0 0 28 28" fill="currentColor"><path d="M14 2 C14 8, 18 10, 20 12 C18 14, 14 14, 14 20 C14 14, 10 14, 8 12 C10 10, 14 8, 14 2 Z"/><path d="M14 18 L14 26" stroke="currentColor" stroke-width="1.2"/><ellipse cx="14" cy="22" rx="5" ry="1"/></svg>`,
  scroll: `<svg viewBox="0 0 120 16" fill="currentColor"><path d="M60 2 L66 8 L60 14 L54 8 Z"/><path d="M44 8 C 48 4, 52 4, 54 8 C 52 12, 48 12, 44 8 Z"/><path d="M76 8 C 72 4, 68 4, 66 8 C 68 12, 72 12, 76 8 Z"/></svg>`,
};
document.querySelectorAll('[data-motif]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentSlideIdx < 0) return;
    const motif = btn.dataset.motif;
    if (motif === 'none') delete slidesDeck[currentSlideIdx].motif;
    else slidesDeck[currentSlideIdx].motif = motif;
    applyBgToCanvas();
    renderSlideCanvasMotif();
    saveSlidesWithHistory();
  });
});
function renderSlideCanvasMotif() {
  // remove existing overlay
  slideCanvas.querySelectorAll('.ex-slide-canvas__motif-overlay').forEach(n => n.remove());
  if (currentSlideIdx < 0) return;
  const motif = slidesDeck[currentSlideIdx].motif;
  if (!motif || !MOTIF_SVGS[motif]) return;
  const overlay = document.createElement('div');
  overlay.className = 'ex-slide-canvas__motif-overlay';
  overlay.innerHTML = MOTIF_SVGS[motif];
  slideCanvas.appendChild(overlay);
}
// Hook into renderSlideCanvas
const _origRenderSlideCanvasV22 = renderSlideCanvas;
renderSlideCanvas = function() {
  _origRenderSlideCanvasV22();
  renderSlideCanvasMotif();
};


function insertClippingAsElement(clip) {
  if (currentSlideIdx < 0) {
    slidesDeck.push(SLIDE_TEMPLATES.blank());
    currentSlideIdx = slidesDeck.length - 1;
  }
  const s = slidesDeck[currentSlideIdx];
  s.elements = s.elements || [];
  // Pick element type based on clipping type
  const typeMap = { quote: 'pullquote', heading: 'heading', body: 'body', finding: 'callout', mirror: 'body' };
  const elType = typeMap[clip.type] || 'body';
  const offset = (s.elements.filter(e => e.pos === 'free').length % 6) * 20;
  const fresh = {
    id: uid(),
    type: elType,
    pos: 'free',
    x: 60 + offset,
    y: 60 + offset,
    width: 420,
    height: 140,
    text: clip.content,
  };
  s.elements.push(fresh);
  selectedElementId = fresh.id;
  saveSlidesWithHistory();
  renderSlideCanvas();
  renderSlideDeck();
  toast('Inserted from inbox');
}

/* Wire slide canvas to accept dropped clippings */
slideCanvas.addEventListener('dragover', (e) => {
  if (e.dataTransfer.types.includes('text/excelsior-clip')) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  }
});
slideCanvas.addEventListener('drop', (e) => {
  const id = e.dataTransfer.getData('text/excelsior-clip');
  if (!id) return;
  e.preventDefault();
  const clip = getClippings().find(x => x.id === id);
  if (!clip) return;
  // Insert at drop coordinates if in free mode
  const rect = slideCanvas.getBoundingClientRect();
  if (currentSlideIdx < 0) {
    slidesDeck.push(SLIDE_TEMPLATES.blank());
    currentSlideIdx = slidesDeck.length - 1;
  }
  const s = slidesDeck[currentSlideIdx];
  s.elements = s.elements || [];
  const typeMap = { quote: 'pullquote', heading: 'heading', body: 'body', finding: 'callout', mirror: 'body' };
  const elType = typeMap[clip.type] || 'body';
  const fresh = {
    id: uid(), type: elType, pos: 'free',
    x: e.clientX - rect.left - 100,
    y: e.clientY - rect.top - 30,
    width: 420, height: 100,
    text: clip.content,
  };
  s.elements.push(fresh);
  selectedElementId = fresh.id;
  saveSlidesWithHistory();
  renderSlideCanvas();
});


document.getElementById('mdImportApplyBtn').addEventListener('click', () => {
  const txt = document.getElementById('mdImportText').value;
  if (!txt.trim()) { toast('Paste markdown first', true); return; }
  const parsed = parseMarkdownToElements(txt);
  docElements = docElements.concat(parsed);
  persistSet('doc-elements', docElements);
  renderDoc();
  mdImportModal.classList.remove('is-open');
  toast('Appended ' + parsed.length + ' elements');
});
document.getElementById('mdImportReplaceBtn').addEventListener('click', () => {
  const txt = document.getElementById('mdImportText').value;
  if (!txt.trim()) { toast('Paste markdown first', true); return; }
  const parsed = parseMarkdownToElements(txt);
  docElements = parsed;
  persistSet('doc-elements', docElements);
  renderDoc();
  mdImportModal.classList.remove('is-open');
  toast('Replaced doc with ' + parsed.length + ' elements');
});


const _origRenderStyleInspectorV15 = renderStyleInspector;
renderStyleInspector = function(el) {
  const base = _origRenderStyleInspectorV15(el);
  const TEXT_TYPES = ['heading','subheading','body','dropcap','pullquote','callout','sourcetag'];
  if (!TEXT_TYPES.includes(el.type)) return base;
  const hasLink = !!el.link;
  const linkGroup = `<div class="ex-style-inspector__group">
    <button class="ex-style-inspector__btn ${hasLink?'is-on':''}" data-style="link-edit" data-eid="${el.id}" title="${hasLink?'Edit link: '+el.link:'Add link'}">🔗</button>
  </div>`;
  return base.replace('</div>', linkGroup + '</div>');
};
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-style="link-edit"]');
  if (!btn) return;
  e.stopPropagation();
  const eid = btn.dataset.eid;
  const el = (slidesDeck[currentSlideIdx]?.elements||[]).find(x => x.id === eid);
  if (!el) return;
  const url = prompt('URL (or leave blank to clear):', el.link || '');
  if (url === null) return;
  if (url.trim() === '') delete el.link; else el.link = url.trim();
  saveSlidesWithHistory();
  renderSlideCanvas();
}, true);

/* Patch element render to wrap text in anchor if link set */
const _origRenderElementV15 = renderElement;
renderElement = function(el, idx, total) {
  const out = _origRenderElementV15(el, idx, total);
  if (!el.link) return out;
  // Wrap inner editable content with anchor (visible in editor as ::after hint)
  return out.replace(/contenteditable="true"/, `contenteditable="true" data-link="${el.link}"`);
};

/* ──────────────────────────────────────────────────────────────
   v1.5.5 - SLIDE COMMENTS
────────────────────────────────────────────────────────────── */
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const commentsCount = document.getElementById('commentsCount');

function renderComments() {
  if (currentSlideIdx < 0) { commentsList.innerHTML=''; commentsCount.textContent='-'; return; }
  const s = slidesDeck[currentSlideIdx];
  const comments = s.comments || [];
  commentsCount.textContent = comments.length;
  if (!comments.length) {
    commentsList.innerHTML = '<div style="font-size:11px;color:var(--ex-text-muted);font-style:italic;padding:4px;">No comments yet.</div>';
    return;
  }
  commentsList.innerHTML = comments.map((c, i) => `
    <div class="ex-comment-row">
      <div class="ex-comment-row__author">${c.author || 'You'} · ${(c.date||'').slice(5,16)}</div>
      ${escapeHtml(c.text)}
      <button class="ex-comment-row__del" data-cmt-del="${i}">×</button>
    </div>
  `).join('');
  commentsList.querySelectorAll('[data-cmt-del]').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.cmtDel);
      s.comments.splice(idx, 1);
      saveSlidesWithHistory();
      renderComments();
    });
  });
}
document.getElementById('commentAddBtn').addEventListener('click', () => {
  if (currentSlideIdx < 0) return;
  const text = commentInput.value.trim();
  if (!text) return;
  const s = slidesDeck[currentSlideIdx];
  s.comments = s.comments || [];
  s.comments.push({ text, author: 'You', date: new Date().toISOString() });
  commentInput.value = '';
  saveSlidesWithHistory();
  renderComments();
});
commentInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('commentAddBtn').click(); }
});
// Re-render comments on slide change (hook into slide canvas render)
const _origRenderSlideCanvasV15 = renderSlideCanvas;
renderSlideCanvas = function() {
  _origRenderSlideCanvasV15();
  renderComments();
};



/* ── the markdown importer · authored Doc elements, so it came too ────── */
function parseMarkdownToElements(md) {
  const lines = md.split('\n');
  const elements = [];
  let curBullets = null, curNumbered = null;
  function flushList() {
    if (curBullets) { elements.push({ id: uid(), type: 'bullets', items: curBullets }); curBullets = null; }
    if (curNumbered) { elements.push({ id: uid(), type: 'numbered', items: curNumbered }); curNumbered = null; }
  }
  function inlineFmt(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  }
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushList(); continue; }
    if (line === '---' || line === '***') { flushList(); elements.push({ id: uid(), type: 'divider' }); continue; }
    if (line.startsWith('# ')) { flushList(); elements.push({ id: uid(), type: 'heading', text: line.slice(2), size: 'large' }); continue; }
    if (line.startsWith('## ')) { flushList(); elements.push({ id: uid(), type: 'heading', text: line.slice(3) }); continue; }
    if (line.startsWith('### ')) { flushList(); elements.push({ id: uid(), type: 'subheading', text: line.slice(4) }); continue; }
    if (line.startsWith('> ')) { flushList(); elements.push({ id: uid(), type: 'pullquote', text: line.slice(2) }); continue; }
    const bm = line.match(/^[-*+]\s+(.+)$/);
    if (bm) { if (!curBullets) { flushList(); curBullets = []; } curBullets.push(inlineFmt(bm[1])); continue; }
    const nm = line.match(/^\d+\.\s+(.+)$/);
    if (nm) { if (!curNumbered) { flushList(); curNumbered = []; } curNumbered.push(inlineFmt(nm[1])); continue; }
    flushList();
    elements.push({ id: uid(), type: 'body', text: inlineFmt(line) });
  }
  flushList();
  return elements;
}
const mdImportModal = document.getElementById('mdImportModal');
document.getElementById('mdImportBtn').addEventListener('click', () => {
  mdImportModal.classList.add('is-open');
  document.getElementById('mdImportText').focus();
});
document.getElementById('mdImportCancelBtn').addEventListener('click', () => mdImportModal.classList.remove('is-open'));

  /* ── what the host may call ─────────────────────────────────────────── */
  window.NotesStudio = {
    init(opts) {
      host = Object.assign(host, opts || {});
      currentMode = (opts && opts.mode) || 'slides';
      try { if (typeof renderSlideDeck === 'function') renderSlideDeck(); } catch (e) {}
      try { if (typeof renderDoc === 'function') renderDoc(); } catch (e) {}
    },
    setMode(m) { currentMode = m; },
    get deck() { return slidesDeck; }
  };
})();
