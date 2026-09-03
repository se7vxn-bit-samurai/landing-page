/* ═══════════ theGuide app bridge ═══════════
   Injected into every hosted app frame (apps/<id>.html).
   1 · derives the app id from its own filename
   2 · storage shim · engages ONLY where localStorage is blocked;
       persists to the shell via tgc.ls.persist postMessage
   3 · key relay · Esc / Ctrl+K / Ctrl+1-4 reach the shell
   ═══════════════════════════════════════════ */
window.__TGC_APP_ID = (location.pathname.split('/').pop() || 'app').replace(/\.html$/, '');
window.__TGC_LS_SEED = window.__TGC_LS_SEED || {};
try {
  var __seed = window.parent !== window && window.parent.localStorage.getItem('tgc.appstore.' + window.__TGC_APP_ID);
  if (__seed) window.__TGC_LS_SEED = JSON.parse(__seed);
} catch (e) { /* cross-origin or blocked parent · empty seed */ }

(function () {
  function usable(name) { try { var s = window[name]; var k = '__tgc_probe'; s.setItem(k, '1'); s.removeItem(k); return true; } catch (e) { return false; } }
  var id = window.__TGC_APP_ID || 'app';
  if (!usable('localStorage')) {
    var data = window.__TGC_LS_SEED || {};
    var timer = null;
    function flush() { timer = null; try { parent.postMessage({ type: 'tgc.ls.persist', appId: id, data: JSON.stringify(data) }, '*'); } catch (e) {} }
    function push() { if (!timer) timer = setTimeout(flush, 120); }
    var shim = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[String(k)] = String(v); push(); },
      removeItem: function (k) { delete data[String(k)]; push(); },
      clear: function () { data = {}; push(); },
      key: function (i) { return Object.keys(data)[i] || null; }
    };
    Object.defineProperty(shim, 'length', { get: function () { return Object.keys(data).length; } });
    try { Object.defineProperty(window, 'localStorage', { value: shim, configurable: true }); window.__TGC_LS_SHIMMED = true; } catch (e) {}
    window.addEventListener('pagehide', flush);
  }
  if (!usable('sessionStorage')) {
    var sdata = {};
    var sshim = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(sdata, k) ? sdata[k] : null; },
      setItem: function (k, v) { sdata[String(k)] = String(v); },
      removeItem: function (k) { delete sdata[String(k)]; },
      clear: function () { sdata = {}; },
      key: function (i) { return Object.keys(sdata)[i] || null; }
    };
    Object.defineProperty(sshim, 'length', { get: function () { return Object.keys(sdata).length; } });
    try { Object.defineProperty(window, 'sessionStorage', { value: sshim, configurable: true }); } catch (e3) {}
  }
})();
(function () {
  function send(c){ try{ parent.postMessage({ type:'tgc.keys', combo:c }, '*'); }catch(e){} }
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { send('esc'); return; }
    if (e.ctrlKey || e.metaKey) {
      var k = (e.key || '').toLowerCase();
      if (k === 'k') { e.preventDefault(); send('ctrlk'); }
      else if (k >= '1' && k <= '4') { e.preventDefault(); send('ctrl' + k); }
    }
  }, true);
})();
