/**
 * Target Size Tester
 * Version: 51
 *
 * Tests WCAG 2.2 SC 2.5.8 (Target Size Minimum, AA, 24px)
 * and SC 2.5.5 (Target Size Enhanced, AAA, 44px).
 *
 * Usage: build this file into a bookmarklet using `npm run build`,
 * then drag the resulting link from index.html to your bookmarks bar.
 * Run on any page to overlay interactive targets color-coded by
 * conformance status. Run again to remove all overlays.
 *
 * Keyboard shortcuts (active while overlays are present):
 *   Alt+T  — toggle legend panel visibility
 *   Alt+=  — rerun in place (refreshes after scroll or DOM changes)
 *
 * Author: Will Slone
 * License: MIT
 */

(function () {

  // ─── Constants ────────────────────────────────────────────────────────────────

  const FONT = '-apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, Adwaita Sans, Cantarell, Ubuntu, roboto, noto, helvetica, arial, sans-serif';

  // Spacing radius for SC 2.5.8: half of the 24px minimum diameter.
  const SPACING_RADIUS = 12;

  // Element IDs — all prefixed sc258- to reduce host-page conflicts.
  const ID_WRAP   = 'sc258-tester';   // overlay container (regular document)
  const ID_HOST   = 'sc258-host';     // shadow host element (regular document)
  const ID_LEGEND = 'sc258-legend';   // legend panel     (shadow root)
  const ID_TIP    = 'sc258-tip';      // tooltip          (shadow root)
  const ID_DIALOG = 'sc258-dialog';   // results dialog   (shadow root)
  const ID_STYLE  = 'sc258-style';    // injected styles  (shadow root)
  const ID_CURSOR = 'sc258-cursor';   // cursor override  (document.head)
  const ID_TAB    = 'sc258-tab';      // collapsed tab    (shadow root)

  // Selector covering all interactive element types the bookmarklet evaluates.
  const SEL = [
    'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea', 'summary',
    '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
    '[role="menuitem"]', '[role="tab"]', '[role="switch"]', '[role="option"]',
    '[tabindex="0"]',
  ].join(',');

  // Shadow DOM elements are invisible to document.querySelectorAll, so only
  // the overlay wrap needs excluding from target detection on rerun.
  const OWN_CONTAINERS = `#${ID_WRAP}`;

  // ─── Teardown on second run ───────────────────────────────────────────────────

  const existing = document.getElementById(ID_WRAP);
  if (existing) {
    document.getElementById(ID_HOST)?.remove();    // removes shadow root and all UI inside it
    document.getElementById(ID_CURSOR)?.remove();  // cursor override in document.head
    existing.remove();                             // overlay container
    if (existing._kh)  document.removeEventListener('keydown',   existing._kh);
    if (existing._rh)  document.removeEventListener('keydown',   existing._rh);
    if (existing._mh)  document.removeEventListener('mousemove', existing._mh);
    if (existing._sh)  window.removeEventListener('scroll',      existing._sh);
    if (existing._rzh) window.removeEventListener('resize',      existing._rzh);
    return;
  }

  // ─── Shadow root setup ────────────────────────────────────────────────────────

  // All bookmarklet UI (legend, dialog, tooltip, tab, styles) lives inside a
  // shadow root. Host-page styles cannot cross the shadow boundary, so no
  // !important overrides are needed in the injected stylesheet.
  const shadowHost = document.createElement('div');
  shadowHost.id = ID_HOST;
  document.body.appendChild(shadowHost);
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  // ─── Injected styles ──────────────────────────────────────────────────────────

  const sty = document.createElement('style');
  sty.id = ID_STYLE;
  sty.textContent = `
    /* Reset — normalises UA defaults within the shadow root.
       No !important needed: host-page styles cannot reach in. */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
      background-image: none;
      box-shadow: none;
      color: inherit;
      font-family: inherit;
      font-size: inherit;
      font-weight: inherit;
      font-style: normal;
      line-height: inherit;
      letter-spacing: normal;
      word-spacing: normal;
      text-align: left;
      text-transform: none;
      text-decoration: none;
      text-indent: 0;
      text-shadow: none;
      white-space: normal;
      vertical-align: baseline;
      list-style: none;
      float: none;
      clear: none;
      overflow: visible;
      opacity: 1;
      visibility: visible;
      cursor: inherit;
      transition: none;
      animation: none;
      transform: none;
      outline: none;
    }

    *::before, *::after {
      content: none;
      display: none;
    }

    /* ── Base elements ── */

    b { font-weight: bold; }
    span { display: inline; }

    #sc258-leg-hdr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    fieldset { display: block; margin-bottom: 10px; }
    legend   { display: block; font-weight: bold; margin-bottom: 4px; }

    label {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 24px;
      cursor: pointer;
    }

    #sc258-cur-lbl { margin-bottom: 8px; }

    input[type="radio"],
    input[type="checkbox"] {
      display: inline-block;
      flex-shrink: 0;
      cursor: pointer;
    }

    ul { display: block; margin-bottom: 10px; }
    li { display: block; }

    /* Abbreviation key — hidden by default, shown when labels checkbox is checked */
    #sc258-key {
      display: none;
      padding-left: 22px;
      font-size: 11px;
      line-height: 1.8;
      color: #aaa;
      margin-bottom: 6px;
    }
    #sc258-key.sc258-key-vis { display: block; }

    /* Spacing exception list item — hidden in SC 2.5.5 mode */
    #sc258-li-sp.sc258-hidden { display: none; }

    /* Collapse button */
    #sc258-col-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #eee;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    /* View results button */
    #sc258-view {
      display: block;
      width: 100%;
      color: #eee;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      padding: 6px 0;
      text-align: center;
      border: 1px solid #666;
      border-radius: 4px;
    }

    /* ── Dialog elements ── */

    #sc258-dialog::backdrop { background: rgba(0, 0, 0, .65); }

    #sc258-dlg-hdr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    #sc258-dlg-title {
      display: block;
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
      color: #eee;
    }

    #sc258-dlg-x {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      color: #eee;
      cursor: pointer;
      flex-shrink: 0;
    }

    table {
      display: table;
      border-collapse: collapse;
      border-spacing: 0;
      width: 100%;
    }
    thead { display: table-header-group; }
    tbody { display: table-row-group; }
    tr    { display: table-row; background: transparent; }
    th, td {
      display: table-cell;
      border: 1px solid #444;
      padding: 4px 8px;
      vertical-align: top;
    }
    th { font-weight: bold; }

    /* ── Utility classes ── */

    .sc258-copy-xpath {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      color: #aaa;
      cursor: pointer;
    }
    .sc258-copied { color: #00d400; }

    .sc258-dot-s  { color: #00d400; }
    .sc258-dot-sp { color: #f0a000; }
    .sc258-dot-f  { color: #e83030; }
    .sc258-dot-e  { color: #8888ee; }

    .sc258-note { color: #a0a0a0; font-size: 10px; line-height: 1.4; }
    .sc258-na   { color: #777; }
    .sc258-nowrap { white-space: nowrap; }
    .sc258-center { text-align: center; }

    .sc258-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* ── Scrollbar for legend panel ── */
    #sc258-legend { scrollbar-width: thin; scrollbar-color: #555 #222; }
    #sc258-legend::-webkit-scrollbar { width: 5px; }
    #sc258-legend::-webkit-scrollbar-track { background: #222; }
    #sc258-legend::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }

    /* ── Focus indicator ── */
    *:focus { outline: 3px solid #eee; outline-offset: 2px; }
    *:focus:not(:focus-visible) { outline: none; }
  `;
  shadowRoot.appendChild(sty);

  // ─── State ────────────────────────────────────────────────────────────────────

  let scrollX, scrollY;
  let mode = '258';           // '258' = SC 2.5.8 (24px) | '255' = SC 2.5.5 (44px)
  let dialogTbody = null;
  let circChk, hideChk;
  let counts = { s: 0, sp: 0, f: 0, e: 0 };
  let legState = 'expanded';
  let prevLegState = 'expanded';
  let tgts = [];
  let wrap;

  // ─── Color definitions ────────────────────────────────────────────────────────

  const CLR = {
    s:  { b: 'rgba(0,180,0,.25)',    d: '#00b400', dot: '#00d400', lbl: 'Pass: size',             lbl255: 'Pass: size',             abbr: 'P',  ring: null      },
    sp: { b: 'rgba(210,140,0,.3)',   d: '#d28c00', dot: '#f0a000', lbl: 'Pass: spacing exception', lbl255: '',                       abbr: 'SP', ring: '#3d2000' },
    f:  { b: 'rgba(210,0,0,.35)',    d: '#c80000', dot: '#e83030', lbl: 'Fail: spacing overlap',   lbl255: 'Fail',                   abbr: 'F',  ring: '#8b0000' },
    e:  { b: 'rgba(80,80,200,.2)',   d: '#5050c8', dot: '#8888ee', lbl: 'Exempt: inline context',  lbl255: 'Exempt: inline context', abbr: 'EX', ring: null      },
  };

  const clrLbl = key => mode === '255' ? (CLR[key].lbl255 || CLR[key].lbl) : CLR[key].lbl;

  // ─── SVG icons ────────────────────────────────────────────────────────────────

  const clipSVG = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="9" height="11" rx="1"/>
    <rect x="6" y="1" width="9" height="11" rx="1" fill="#111"/>
  </svg>`;

  const checkSVG = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <polyline points="1,7 5,11 13,3"/>
  </svg>`;

  const closeSVG = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <line x1="2" y1="2" x2="14" y2="14"/>
    <line x1="14" y1="2" x2="2" y2="14"/>
  </svg>`;

  // ─── Detection helpers ────────────────────────────────────────────────────────

  function isHiddenInput(el, rect, style) {
    return rect.width < 4
      || rect.height < 4
      || rect.right < 0
      || rect.bottom < 0
      || (style.clip && style.clip !== 'auto')
      || (style.clipPath && style.clipPath !== 'none' && style.clipPath !== '');
  }

  function effectiveLbl(el) {
    if (el.tagName !== 'INPUT') return null;
    const type = (el.type || '').toLowerCase();
    if (type !== 'checkbox' && type !== 'radio') return null;
    let label = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
    return label || el.closest('label');
  }

  function mergeLineRects(rects) {
    if (rects.length <= 1) return rects;
    const sorted = [...rects].sort((a, b) => a.top - b.top);
    const out = [{
      left: sorted[0].left, top: sorted[0].top,
      right: sorted[0].right, bottom: sorted[0].bottom,
      width: sorted[0].right - sorted[0].left,
      height: sorted[0].bottom - sorted[0].top,
    }];
    for (let i = 1; i < sorted.length; i++) {
      const r = sorted[i];
      const last = out[out.length - 1];
      const overlapH = Math.min(last.bottom, r.bottom) - Math.max(last.top, r.top);
      const shorterH = Math.min(last.height, r.bottom - r.top);
      if (overlapH > 0 && overlapH / shorterH > 0.5) {
        last.left   = Math.min(last.left,   r.left);
        last.top    = Math.min(last.top,    r.top);
        last.right  = Math.max(last.right,  r.right);
        last.bottom = Math.max(last.bottom, r.bottom);
        last.width  = last.right - last.left;
        last.height = last.bottom - last.top;
      } else {
        out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom,
                   width: r.right - r.left, height: r.bottom - r.top });
      }
    }
    return out;
  }

  function effectiveRects(el) {
    let lineRects = Array.from(el.getClientRects()).filter(r => r.width > 0 && r.height > 0);
    if (!lineRects.length) {
      const fb = el.getBoundingClientRect();
      return (fb.width > 0 && fb.height > 0) ? [fb] : [];
    }
    lineRects = mergeLineRects(lineRects);
    const children = Array.from(el.querySelectorAll('img, svg, canvas, video, picture'));
    return lineRects.map(lr => {
      let bH = lr.height, bT = lr.top, bB = lr.bottom;
      for (const ch of children) {
        const cr = ch.getBoundingClientRect();
        if (cr.width > 0 && cr.height > bH && cr.right > lr.left && cr.left < lr.right) {
          bH = cr.height; bT = cr.top; bB = cr.bottom;
        }
      }
      return bH > lr.height
        ? { left: lr.left, top: bT, right: lr.right, bottom: bB, width: lr.width, height: bH }
        : lr;
    });
  }

  function vis(el) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const type = el.tagName === 'INPUT' ? (el.type || '').toLowerCase() : '';
    if (type === 'checkbox' || type === 'radio') {
      if (isHiddenInput(el, rect, style)) {
        return !!(el.id && document.querySelector(`label[for="${el.id}"]`)) || !!el.closest('label');
      }
      return rect.width > 0 && rect.height > 0;
    }
    return parseFloat(style.opacity || 1) > 0 && rect.width > 0;
  }

  function isInline(el) {
    if (getComputedStyle(el).display !== 'inline') return false;
    let parent = el.parentElement;
    while (parent) {
      const d = getComputedStyle(parent).display;
      if (/^(block|list-item|table-cell|flex|grid)$/.test(d)) {
        for (const node of parent.childNodes) {
          if (node.nodeType === 3 && node.textContent.trim()) return true;
        }
        break;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  function circleHitsRect(cx, cy, radius, t) {
    const dx = Math.max(t.left - cx, 0, cx - t.right);
    const dy = Math.max(t.top  - cy, 0, cy - t.bottom);
    return Math.sqrt(dx * dx + dy * dy) < radius;
  }

  function centersWithin24(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy) < 24;
  }

  function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function accName(el) {
    const ids = el.getAttribute('aria-labelledby');
    if (ids) {
      const t = ids.split(' ')
        .map(id => { const ref = document.getElementById(id); return ref ? ref.textContent.trim() : ''; })
        .join(' ').trim();
      if (t) return t;
    }
    const al = el.getAttribute('aria-label');
    if (al?.trim()) return al.trim();
    if (el.id) {
      const lb = document.querySelector(`label[for="${el.id}"]`);
      if (lb) return lb.textContent.trim();
    }
    const ti = el.getAttribute('title');
    if (ti?.trim()) return ti.trim();
    if (el.tagName === 'INPUT' && /^(submit|reset|button)$/i.test(el.type || '')) {
      const v = el.getAttribute('value');
      if (v) return v.trim();
    }
    const clone = el.cloneNode(true);
    clone.querySelectorAll('script, style, noscript').forEach(n => n.remove());
    const tx = clone.textContent.trim().replace(/\s+/g, ' ');
    return tx ? (tx.length > 40 ? tx.slice(0, 40) + '\u2026' : tx) : '';
  }

  function parentTarget(el) {
    const tag = el.tagName.toLowerCase();
    if (/^(a|button|input|select|textarea|summary)$/.test(tag)) return null;
    if (!el.hasAttribute('role') && el.getAttribute('tabindex') !== '0') return null;
    if (getComputedStyle(el).display !== 'inline') return null;
    const p = el.parentElement;
    if (!p) return null;
    if (p.matches(SEL)) return null;
    const pd = getComputedStyle(p).display;
    if (!/^(block|flex|grid|list-item|table-cell|inline-block)$/.test(pd)) return null;
    for (const node of p.childNodes) {
      if (node.nodeType === 3 && node.textContent.trim()) return null;
    }
    const others = p.querySelectorAll(SEL);
    for (const other of others) { if (other !== el) return null; }
    const er = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
    if (pr.width <= er.width && pr.height <= er.height) return null;
    return p;
  }

  // ─── Target building ──────────────────────────────────────────────────────────

  function buildTargets() {
    scrollX = window.scrollX;
    scrollY = window.scrollY;
    tgts = [];

    Array.from(document.querySelectorAll(SEL))
      .filter(el => vis(el) && !el.closest(OWN_CONTAINERS))
      .forEach(el => {
        let viaLabel = false, viaParent = false, rects;

        const label = effectiveLbl(el);
        if (label) {
          viaLabel = true;
          if (el.closest('label') === label) {
            rects = effectiveRects(label);
          } else {
            const er = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (isHiddenInput(el, er, style)) {
              rects = effectiveRects(label);
            } else {
              const inputRects = effectiveRects(el);
              const labelRects = effectiveRects(label);
              const all = [...inputRects, ...labelRects].filter(r => r.width > 0 && r.height > 0);
              if (all.length) {
                const ul = Math.min(...all.map(r => r.left));
                const ut = Math.min(...all.map(r => r.top));
                const ur = Math.max(...all.map(r => r.right));
                const ub = Math.max(...all.map(r => r.bottom));
                rects = [{ left: ul, top: ut, right: ur, bottom: ub, width: ur - ul, height: ub - ut }];
              } else {
                rects = effectiveRects(label);
              }
            }
          }
        } else {
          const pt = parentTarget(el);
          if (pt) { viaParent = true; rects = effectiveRects(pt); }
          else     { rects = effectiveRects(el); }
        }

        rects.forEach((r, idx) => {
          tgts.push({
            el, viaLabel, viaParent,
            fragIdx: idx, fragTotal: rects.length,
            left:   r.left   + scrollX,
            top:    r.top    + scrollY,
            right:  r.right  + scrollX,
            bottom: r.bottom + scrollY,
            w: r.width, h: r.height,
            cx: r.left + r.width  / 2 + scrollX,
            cy: r.top  + r.height / 2 + scrollY,
          });
        });
      });

    tgts = tgts.filter((t, i, a) =>
      !a.slice(0, i).some(u => Math.abs(t.cx - u.cx) < 2 && Math.abs(t.cy - u.cy) < 2)
    );
  }

  // ─── Classification ───────────────────────────────────────────────────────────

  function classify() {
    counts = { s: 0, sp: 0, f: 0, e: 0 };
    const thresh = mode === '255' ? 44 : 24;

    tgts.forEach((t, i) => {
      if (isInline(t.el)) {
        t.s = 'e';
        if (t.fragIdx === 0) counts.e++;
        return;
      }
      if (t.w >= thresh && t.h >= thresh) {
        t.s = 's';
        if (t.fragIdx === 0) counts.s++;
        return;
      }
      if (mode === '258') {
        const uAdequate = u => u.w >= thresh && u.h >= thresh;
        const fail = tgts.some((u, j) => {
          if (i === j || t.el === u.el) return false;
          return uAdequate(u)
            ? circleHitsRect(t.cx, t.cy, SPACING_RADIUS, u)
            : circleHitsRect(t.cx, t.cy, SPACING_RADIUS, u) || centersWithin24(t.cx, t.cy, u.cx, u.cy);
        });
        t.s = fail ? 'f' : 'sp';
        if (t.fragIdx === 0) { fail ? counts.f++ : counts.sp++; }
      } else {
        t.s = 'f';
        if (t.fragIdx === 0) counts.f++;
      }
    });
  }

  // ─── Cursor SVG ───────────────────────────────────────────────────────────────

  function makeCursorSVG(r) {
    const d = r * 2, cx = r, cy = r;
    const lo = Math.round(r * 0.5), li = Math.round(r * 0.583);
    return `<svg viewBox="0 0 ${d} ${d}" width="${d}" height="${d}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r - 0.5}" fill="none" stroke="#000" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 1.5}" fill="none" stroke="#fff" stroke-width="1"/>
      <line x1="${cx - lo}" y1="${cy}" x2="${cx + lo}" y2="${cy}" stroke="#fff" stroke-width="4"/>
      <line x1="${cx}" y1="${cy - lo}" x2="${cx}" y2="${cy + lo}" stroke="#fff" stroke-width="4"/>
      <line x1="${cx - li}" y1="${cy}" x2="${cx + li}" y2="${cy}" stroke="#000" stroke-width="2"/>
      <line x1="${cx}" y1="${cy - li}" x2="${cx}" y2="${cy + li}" stroke="#000" stroke-width="2"/>
    </svg>`;
  }

  function applyCursor() {
    const r = mode === '255' ? 22 : 12;
    const el = document.createElement('style');
    el.id = ID_CURSOR;
    el.textContent = `* { cursor: url("data:image/svg+xml,${encodeURIComponent(makeCursorSVG(r))}") ${r} ${r}, auto !important }`;
    document.head.appendChild(el);
  }

  // ─── Tooltip ─────────────────────────────────────────────────────────────────

  const tip = document.createElement('div');
  tip.id = ID_TIP;
  tip.setAttribute('aria-hidden', 'true');
  tip.style.cssText = [
    'position:fixed', 'display:none', 'background:#111', 'color:#eee',
    `font-size:12px`, `line-height:1.6`, `font-family:${FONT}`,
    'padding:8px 12px', 'border:1px solid #555',
    'box-shadow:0 4px 15px rgba(0,0,0,0.5)', 'border-radius:6px',
    'pointer-events:none', 'z-index:2147483647', 'white-space:nowrap',
  ].join(';');
  shadowRoot.appendChild(tip);

  function placeTip(vx, vy) {
    tip.style.display = 'block';
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let tx = vx - tw / 2, ty = vy - th - 8;
    if (ty < 4) ty = vy + 8;
    if (tx < 4) tx = 4;
    if (tx + tw > window.innerWidth - 4) tx = window.innerWidth - tw - 4;
    tip.style.left = `${tx}px`;
    tip.style.top  = `${ty}px`;
  }

  const hideTip = () => { tip.style.display = 'none'; };

  function makeTipHTML(t) {
    const c = CLR[t.s];
    const note = t.viaLabel  ? '<span style="color:#a0a0a0">(input + label)</span>'
               : t.viaParent ? '<span style="color:#a0a0a0">(size from parent)</span>'
               : '';
    const fragNote = t.fragTotal > 1
      ? `<br><span style="color:#a0a0a0">fragment ${t.fragIdx + 1} of ${t.fragTotal}</span>`
      : '';
    return `<span style="color:${c.dot}">&#9632;</span> <b>${clrLbl(t.s)}</b> ${note}`
         + `<br><span style="color:#aaa">${Math.round(t.w)} &times; ${Math.round(t.h)} px</span>`
         + fragNote;
  }

  // ─── Overlays ─────────────────────────────────────────────────────────────────

  function buildOverlays() {
    document.getElementById(ID_WRAP)?.remove();
    wrap = document.createElement('div');
    wrap.id = ID_WRAP;
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:2147483646;';

    tgts.forEach(t => {
      const c = CLR[t.s];

      const box = document.createElement('div');
      box.className = 'sc258-box';
      box.style.cssText = [
        'position:absolute', 'box-sizing:border-box', 'pointer-events:none',
        `left:${t.left}px`, `top:${t.top}px`, `width:${t.w}px`, `height:${t.h}px`,
        `background:${c.b}`, `outline:2px solid ${c.d}`, 'outline-offset:-1px',
      ].join(';');

      const boxLbl = document.createElement('span');
      boxLbl.className = 'sc258-lbl';
      boxLbl.setAttribute('aria-hidden', 'true');
      boxLbl.style.cssText = 'display:none;position:absolute;top:0;left:0;font-size:9px;line-height:1;padding:2px 3px;color:#eee;background:rgba(0,0,0,.85);white-space:nowrap;pointer-events:none;';
      boxLbl.textContent = c.abbr;
      box.appendChild(boxLbl);
      t.boxEl = box; t.lblEl = boxLbl;
      wrap.appendChild(box);

      let ring = null;
      if (t.s === 'f' || t.s === 'sp') {
        ring = document.createElement('div');
        ring.className = 'sc258-ring';
        ring.style.cssText = [
          'position:absolute', 'box-sizing:border-box', 'pointer-events:none', 'border-radius:50%',
          `left:${t.cx - SPACING_RADIUS}px`, `top:${t.cy - SPACING_RADIUS}px`,
          'width:24px', 'height:24px', `border:2px dashed ${c.ring || c.d}`,
        ].join(';');
        wrap.appendChild(ring);
      }
      t.ringEl = ring;

      const circle = document.createElement('div');
      circle.className = 'sc258-circle24';
      circle.style.cssText = [
        'display:none', 'position:absolute', 'box-sizing:border-box', 'pointer-events:none', 'border-radius:50%',
        `left:${t.cx - SPACING_RADIUS}px`, `top:${t.cy - SPACING_RADIUS}px`,
        'width:24px', 'height:24px', `background:${c.b}`, `outline:2px solid ${c.d}`, 'outline-offset:-1px',
      ].join(';');
      t.c24El = circle;
      wrap.appendChild(circle);

      const circLbl = document.createElement('span');
      circLbl.className = 'sc258-circ-lbl';
      circLbl.setAttribute('aria-hidden', 'true');
      circLbl.style.cssText = [
        'display:none', 'position:absolute', 'font-size:9px', 'line-height:1',
        'padding:2px 3px', 'color:#eee', 'background:rgba(0,0,0,.85)',
        'white-space:nowrap', 'pointer-events:none',
        'transform:translateX(-100%) translateY(-50%)',
        `left:${t.cx - SPACING_RADIUS - 4}px`, `top:${t.cy}px`,
      ].join(';');
      circLbl.textContent = c.abbr;
      t.circLblEl = circLbl;
      wrap.appendChild(circLbl);
    });

    document.body.appendChild(wrap);
  }

  function updateOverlays() {
    const cr = mode === '255' ? 22 : 12;
    tgts.forEach(t => {
      const c = CLR[t.s];
      const circOn = circChk?.checked;

      if (t.boxEl) {
        t.boxEl.style.backgroundColor = c.b;
        t.boxEl.style.outlineColor = c.d;
      }
      if (t.ringEl) {
        const showRing = mode === '258' && (t.s === 'f' || t.s === 'sp') && !circOn;
        t.ringEl.style.display = showRing ? '' : 'none';
        if (showRing) t.ringEl.style.borderColor = c.ring || c.d;
      }
      if (t.c24El) {
        t.c24El.style.backgroundColor = c.b;
        t.c24El.style.outlineColor = c.d;
        t.c24El.style.left   = `${t.cx - cr}px`;
        t.c24El.style.top    = `${t.cy - cr}px`;
        t.c24El.style.width  = `${cr * 2}px`;
        t.c24El.style.height = `${cr * 2}px`;
      }
      if (t.lblEl)    t.lblEl.textContent    = c.abbr;
      if (t.circLblEl) {
        t.circLblEl.textContent  = c.abbr;
        t.circLblEl.style.left   = `${t.cx - cr - 4}px`;
      }
    });
  }

  // ─── Results dialog ───────────────────────────────────────────────────────────

  const swatch = key => `<span aria-hidden="true" class="sc258-dot-${key}">&#9632;</span>`;

  function generateXPath(el) {
    const tag = el.tagName.toLowerCase();
    if (el.id) return `//${tag}[@id="${el.id}"]`;
    const al = (el.getAttribute('aria-label') || '').trim();
    if (al) return `//${tag}[@aria-label="${al}"]`;
    const parts = [];
    let cur = el;
    while (cur && cur.tagName && cur !== document.documentElement) {
      const t = cur.tagName.toLowerCase();
      const par = cur.parentElement;
      if (par) {
        const sibs = Array.from(par.children).filter(c => c.tagName === cur.tagName);
        const pos = sibs.indexOf(cur) + 1;
        parts.unshift(sibs.length > 1 ? `${t}[${pos}]` : t);
        if (par.id) return `//*[@id="${par.id}"]/${parts.join('/')}`;
        cur = par;
      } else { parts.unshift(t); break; }
    }
    return '/' + parts.join('/');
  }

  function buildRows() {
    return tgts.map(t => {
      const tag  = t.el.tagName.toLowerCase();
      const role = t.el.getAttribute('role');
      const tp   = (tag === 'input' && t.el.type) ? t.el.type.toLowerCase() : '';

      let info;
      if (role)                                          info = `${tag}[role=${role}]`;
      else if (tag === 'a' && t.el.hasAttribute('href')) info = 'a[href]';
      else if (tp)                                       info = `${tag}[type=${tp}]`;
      else                                               info = tag;

      const rawName      = accName(t.el);
      const nameIsAbsent = rawName === '';
      const nameCell     = nameIsAbsent
        ? `<span aria-hidden="true" class="sc258-na">&#8212;</span><span class="sc258-sr-only">missing name</span>`
        : esc(rawName);

      const fragNote = t.fragTotal > 1
        ? `<br><span class="sc258-note">fragment ${t.fragIdx + 1} of ${t.fragTotal}</span>`
        : '';
      const elemNote = t.viaLabel  ? '<br><span class="sc258-note">input + label</span>'
                     : t.viaParent ? '<br><span class="sc258-note">size from parent</span>'
                     : '';

      const xp = generateXPath(t.el);
      const xpSafe = xp.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const ariaLbl = nameIsAbsent
        ? `Copy XPath for ${info}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        : `Copy XPath for ${rawName} (${info})`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      const copyBtn = `<button class="sc258-copy-xpath" data-xpath="${xpSafe}" aria-label="${ariaLbl}">${clipSVG}</button>`;

      return `<tr>`
           + `<td>${esc(info)}${elemNote}${fragNote}</td>`
           + `<td>${nameCell}</td>`
           + `<td class="sc258-nowrap">${swatch(t.s)} ${clrLbl(t.s)}</td>`
           + `<td class="sc258-nowrap">${Math.round(t.w)}&times;${Math.round(t.h)}</td>`
           + `<td class="sc258-center">${copyBtn}</td>`
           + `</tr>`;
    }).join('');
  }

  function execCommandCopy(text, onSuccess) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      onSuccess();
    } catch (e) {}
  }

  function bindXPathButtons() {
    if (!dialogTbody) return;
    dialogTbody.querySelectorAll('.sc258-copy-xpath').forEach(btn => {
      btn.addEventListener('click', () => {
        const xp = btn.getAttribute('data-xpath');
        if (!xp) return;
        const onCopied = () => {
          btn.innerHTML = checkSVG;
          btn.classList.add('sc258-copied');
          setTimeout(() => { btn.innerHTML = clipSVG; btn.classList.remove('sc258-copied'); }, 1500);
        };
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(xp).then(onCopied).catch(() => execCommandCopy(xp, onCopied));
        } else {
          execCommandCopy(xp, onCopied);
        }
      });
    });
  }

  function rebuildDialog() {
    if (dialogTbody) {
      dialogTbody.innerHTML = buildRows();
      bindXPathButtons();
    }
  }

  // ─── Rerun ────────────────────────────────────────────────────────────────────

  let chk, key;

  function doRerun() {
    document.getElementById(ID_CURSOR)?.remove();
    buildTargets();
    classify();
    buildOverlays();
    wrap._kh  = kbHandler;
    wrap._rh  = rerunHandler;
    wrap._mh  = moveHandler;
    wrap._sh  = scrollHandler;
    wrap._rzh = resizeHandler;
    updateOverlays();
    updateLegendCounts();
    rebuildDialog();

    if (circChk?.checked) {
      wrap.querySelectorAll('.sc258-box').forEach(b => b.style.display = 'none');
      wrap.querySelectorAll('.sc258-circle24').forEach(c => c.style.display = 'block');
    }
    if (chk?.checked) {
      key.classList.add('sc258-key-vis');
      if (circChk?.checked) {
        wrap.querySelectorAll('.sc258-circ-lbl').forEach(l => l.style.display = 'block');
      } else {
        wrap.querySelectorAll('.sc258-lbl').forEach(l => l.style.display = 'block');
      }
    }
    if (hideChk?.checked) wrap.style.display = 'none';
    if (shadowRoot.getElementById('sc258-cur-chk')?.checked) applyCursor();
  }

  // ─── Initial run ──────────────────────────────────────────────────────────────

  buildTargets();
  classify();
  buildOverlays();

  // ─── Results dialog ───────────────────────────────────────────────────────────

  const dlg = document.createElement('dialog');
  dlg.id = ID_DIALOG;
  dlg.setAttribute('aria-labelledby', 'sc258-dlg-title');
  dlg.style.cssText = [
    'position:fixed', 'inset:0', 'margin:auto',
    'background:#111', 'color:#eee',
    'border:1px solid #444', 'box-shadow:0 4px 15px rgba(0,0,0,0.5)', 'border-radius:8px',
    'padding:16px 20px', 'font-size:13px', 'line-height:1.6', `font-family:${FONT}`,
    'max-width:min(960px,92vw)', 'max-height:80vh', 'overflow-y:auto',
    'width:fit-content', 'height:fit-content',
  ].join(';');
  dlg.innerHTML = `
    <div id="sc258-dlg-hdr">
      <h2 id="sc258-dlg-title">Target Size Results</h2>
      <button id="sc258-dlg-x" aria-label="Close Target Size results dialog">${closeSVG}</button>
    </div>
    <table>
      <thead>
        <tr>
          <th scope="col">Element</th>
          <th scope="col">Accessible name</th>
          <th scope="col" class="sc258-nowrap">Status</th>
          <th scope="col" class="sc258-nowrap">Size (px)</th>
          <th scope="col" class="sc258-center">XPath</th>
        </tr>
      </thead>
      <tbody id="sc258-dlg-body"></tbody>
    </table>
  `;
  shadowRoot.appendChild(dlg);
  dialogTbody = shadowRoot.getElementById('sc258-dlg-body');
  rebuildDialog();

  const dlgX = shadowRoot.getElementById('sc258-dlg-x');
  let viewBtn;

  const closeDialog = () => { dlg.close(); viewBtn?.focus(); };
  dlgX.addEventListener('click', closeDialog);
  dlg.addEventListener('cancel', e => { e.preventDefault(); closeDialog(); });
  dlg.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(dlg.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"]),input,select,textarea'));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) { if (shadowRoot.activeElement === first) { e.preventDefault(); last.focus(); } }
    else            { if (shadowRoot.activeElement === last)  { e.preventDefault(); first.focus(); } }
  });

  // ─── Legend panel ─────────────────────────────────────────────────────────────

  function updateLegendCounts() {
    const cs   = shadowRoot.getElementById('sc258-c-s');
    const csp  = shadowRoot.getElementById('sc258-c-sp');
    const cf   = shadowRoot.getElementById('sc258-c-f');
    const ce   = shadowRoot.getElementById('sc258-c-e');
    const liSp = shadowRoot.getElementById('sc258-li-sp');
    const flbl = shadowRoot.getElementById('sc258-f-lbl');
    if (cs)   cs.textContent   = counts.s;
    if (csp)  csp.textContent  = counts.sp;
    if (cf)   cf.textContent   = counts.f;
    if (ce)   ce.textContent   = counts.e;
    if (liSp) liSp.classList.toggle('sc258-hidden', mode === '255');
    if (flbl) flbl.textContent = mode === '255' ? 'Fail' : 'Fail: spacing overlap';
  }

  const tab = document.createElement('button');
  tab.id = ID_TAB;
  tab.setAttribute('aria-label', 'Toggle Target Size Tester panel');
  tab.setAttribute('aria-expanded', 'false');
  tab.setAttribute('aria-controls', ID_LEGEND);
  tab.style.cssText = [
    'display:none', 'position:fixed', 'bottom:16px', 'right:0',
    'width:44px', 'height:44px', 'background:#111', 'color:#eee',
    'border:1px solid #444', 'border-right:none', 'border-radius:4px 0 0 4px',
    'font-size:22px', 'line-height:1', 'cursor:pointer',
    'z-index:2147483647', 'align-items:center', 'justify-content:center',
    'box-shadow:0 4px 15px rgba(0,0,0,0.5)', 'padding:0',
  ].join(';');
  tab.textContent = '\u25b4';
  shadowRoot.appendChild(tab);

  function collapseLeg() {
    legState = 'collapsed';
    leg.style.display = 'none';
    tab.style.display = 'flex';
    tab.focus();
  }
  function expandLeg() {
    legState = 'expanded';
    leg.style.display = '';
    tab.style.display = 'none';
    shadowRoot.getElementById('sc258-col-btn')?.focus();
  }
  function hideLeg() {
    prevLegState = legState;
    legState = 'hidden';
    leg.style.display = 'none';
    tab.style.display = 'none';
  }
  function restoreLeg() {
    legState = prevLegState;
    if (prevLegState === 'collapsed') {
      leg.style.display = 'none';
      tab.style.display = 'flex';
      tab.focus();
    } else {
      leg.style.display = '';
      tab.style.display = 'none';
      shadowRoot.getElementById('sc258-col-btn')?.focus();
    }
  }

  const leg = document.createElement('div');
  leg.id = ID_LEGEND;
  leg.style.cssText = [
    'position:fixed', 'bottom:16px', 'right:16px',
    'background:#111', 'color:#eee',
    'padding:12px 14px', 'font-size:13px', 'line-height:1.6', `font-family:${FONT}`,
    'z-index:2147483647', 'pointer-events:auto',
    'border:1px solid #444', 'box-shadow:0 4px 15px rgba(0,0,0,0.5)', 'border-radius:8px',
    'min-width:260px', 'max-height:calc(100vh - 32px)', 'overflow-y:auto',
  ].join(';');

  leg.innerHTML = `
    <div id="sc258-leg-hdr">
      <b>Target Size Tester</b>
      <button id="sc258-col-btn" aria-label="Toggle Target Size Tester panel"
              aria-expanded="true" aria-controls="sc258-legend">&#9662;</button>
    </div>
    <fieldset>
      <legend>Active standard</legend>
      <label>
        <input type="radio" name="sc258-mode" value="258" checked>
        <span>SC 2.5.8 &mdash; 24px minimum</span>
      </label>
      <label>
        <input type="radio" name="sc258-mode" value="255">
        <span>SC 2.5.5 &mdash; 44px enhanced</span>
      </label>
    </fieldset>
    <ul role="list">
      <li>${swatch('s')} Pass: size (<span id="sc258-c-s">${counts.s}</span>)</li>
      <li id="sc258-li-sp">${swatch('sp')} Pass: spacing exception (<span id="sc258-c-sp">${counts.sp}</span>)</li>
      <li>${swatch('f')} <span id="sc258-f-lbl">Fail: spacing overlap</span> (<span id="sc258-c-f">${counts.f}</span>)</li>
      <li>${swatch('e')} Exempt: inline context (<span id="sc258-c-e">${counts.e}</span>)</li>
    </ul>
    <label>
      <input type="checkbox" id="sc258-lbl-chk">
      <span>Show target indicator labels</span>
    </label>
    <ul id="sc258-key" role="list">
      <li><b>P</b> &mdash; Pass: size</li>
      <li><b>SP</b> &mdash; Pass: spacing exception</li>
      <li><b>F</b> &mdash; Fail</li>
      <li><b>EX</b> &mdash; Exempt: inline context</li>
    </ul>
    <label>
      <input type="checkbox" id="sc258-circ-chk">
      <span>Show target indicators as minimum circles</span>
    </label>
    <label>
      <input type="checkbox" id="sc258-hide-chk">
      <span>Hide target indicators</span>
    </label>
    <label id="sc258-cur-lbl">
      <input type="checkbox" id="sc258-cur-chk">
      <span>Manual test cursor</span>
    </label>
    <button id="sc258-view" aria-label="View Target Size audit results">View results</button>
  `;

  shadowRoot.appendChild(leg);

  // ─── Legend event listeners ───────────────────────────────────────────────────

  shadowRoot.getElementById('sc258-col-btn').addEventListener('click', collapseLeg);
  tab.addEventListener('click', expandLeg);

  shadowRoot.querySelectorAll('input[name="sc258-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      mode = radio.value;
      classify();
      updateOverlays();
      updateLegendCounts();
      rebuildDialog();
      const existingCursor = document.getElementById(ID_CURSOR);
      if (existingCursor) { existingCursor.remove(); applyCursor(); }
    });
  });

  chk = shadowRoot.getElementById('sc258-lbl-chk');
  key = shadowRoot.getElementById('sc258-key');
  chk.addEventListener('change', () => {
    const show = chk.checked;
    key.classList.toggle('sc258-key-vis', show);
    if (circChk?.checked) {
      wrap.querySelectorAll('.sc258-circ-lbl').forEach(l => l.style.display = show ? 'block' : 'none');
    } else {
      wrap.querySelectorAll('.sc258-lbl').forEach(l => l.style.display = show ? 'block' : 'none');
    }
  });

  circChk = shadowRoot.getElementById('sc258-circ-chk');
  circChk.addEventListener('change', () => {
    const on = circChk.checked;
    wrap.querySelectorAll('.sc258-box').forEach(b => b.style.display = on ? 'none' : 'block');
    wrap.querySelectorAll('.sc258-circle24').forEach(c => c.style.display = on ? 'block' : 'none');
    updateOverlays();
    if (chk?.checked) {
      wrap.querySelectorAll('.sc258-lbl').forEach(l => l.style.display = on ? 'none' : 'block');
      wrap.querySelectorAll('.sc258-circ-lbl').forEach(l => l.style.display = on ? 'block' : 'none');
    }
  });

  hideChk = shadowRoot.getElementById('sc258-hide-chk');
  hideChk.addEventListener('change', () => { wrap.style.display = hideChk.checked ? 'none' : ''; });

  const curChk = shadowRoot.getElementById('sc258-cur-chk');
  curChk.addEventListener('change', () => {
    const existingCursor = document.getElementById(ID_CURSOR);
    if (curChk.checked) { if (!existingCursor) applyCursor(); }
    else                { existingCursor?.remove(); }
  });

  viewBtn = shadowRoot.getElementById('sc258-view');
  viewBtn.addEventListener('click', () => dlg.showModal());

  // ─── Keyboard handlers ────────────────────────────────────────────────────────

  const kbHandler = e => {
    if (e.altKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      legState === 'hidden' ? restoreLeg() : hideLeg();
    }
  };
  document.addEventListener('keydown', kbHandler);
  wrap._kh = kbHandler;

  const rerunHandler = e => {
    if (e.altKey && e.key === '=') {
      e.preventDefault();
      if (dlg?.open) return;
      doRerun();
    }
  };
  document.addEventListener('keydown', rerunHandler);
  wrap._rh = rerunHandler;

  // ─── Mousemove tooltip handler ────────────────────────────────────────────────

  const moveHandler = e => {
    if (hideChk?.checked || dlg?.open) { hideTip(); return; }
    const mxd = e.clientX + window.scrollX;
    const myd = e.clientY + window.scrollY;
    const circViewOn = circChk?.checked;
    const cr = mode === '255' ? 22 : 12;
    let hit = null;
    for (const t of tgts) {
      if (circViewOn) {
        const dx = mxd - t.cx, dy = myd - t.cy;
        if (Math.sqrt(dx * dx + dy * dy) <= cr) { hit = t; break; }
      } else {
        if (mxd >= t.left && mxd <= t.right && myd >= t.top && myd <= t.bottom) { hit = t; break; }
      }
    }
    if (hit) { tip.innerHTML = makeTipHTML(hit); placeTip(e.clientX, e.clientY); }
    else      { hideTip(); }
  };
  document.addEventListener('mousemove', moveHandler);
  wrap._mh = moveHandler;

  // ─── Scroll and resize handlers ──────────────────────────────────────────────

  // Scroll: rAF throttle — repositions overlays at most once per frame.
  let rafPending = false;
  const scrollHandler = () => {
    if (rafPending || dlg?.open) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      doRerun();
    });
  };

  // Resize: debounce — waits until the user stops resizing before rebuilding,
  // since dimensions and positions can change significantly mid-drag.
  let resizeTimer = null;
  const resizeHandler = () => {
    if (dlg?.open) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(doRerun, 150);
  };

  window.addEventListener('scroll', scrollHandler, { passive: true });
  window.addEventListener('resize', resizeHandler);
  wrap._sh  = scrollHandler;
  wrap._rzh = resizeHandler;

})();
