/**
 * build.js — Target Size Tester build script
 *
 * Usage:
 *   npm install
 *   npm run build
 *
 * Output:
 *   index.html — self-contained install + documentation page for GitHub Pages
 */

import { minify } from 'terser';
import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync('target-size-tester.js', 'utf8');

const result = await minify(src, {
  compress: { passes: 2, drop_console: false },
  mangle: { toplevel: false },
  format: { quote_style: 1 },
  ecma: 5,
  safari10: true,
});

if (result.error) {
  console.error('Minification failed:', result.error);
  process.exit(1);
}

const bookmarkletURI = 'javascript:' + encodeURIComponent(result.code);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Target Size Tester Bookmarklet</title>
  <meta name="description" content="A browser bookmarklet for testing WCAG 2.2 SC 2.5.8 (Target Size Minimum, AA) and SC 2.5.5 (Target Size Enhanced, AAA) on any page." />
  <link rel="icon" type="image/svg+xml" href="https://willslone.com/favicon.svg"/>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,700;1,400&family=Atkinson+Hyperlegible+Mono:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    /* ================================================================
       DESIGN TOKENS
       ================================================================ */
    :root {
      --bg:           #F5F0E8;
      --surface:      #FFFFFF;
      --text:         #0A0A0A;
      --text-muted:   #444444;
      --ink:          #0A0A0A;
      --purple:       #7A2A8E;
      --purple-text:  #5A1A6A;
      --on-purple:    #F5F0E8;
      --purple-light: #F5EDFF;
      --border:       3px solid var(--ink);
      --shadow:       4px 4px 0 var(--ink);
      --font-body:    'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', system-ui, sans-serif;
      --font-mono:    'Atkinson Hyperlegible Mono', ui-monospace, 'SF Mono', Menlo, monospace;
      --measure:      68ch;
      --container:    1120px;
    }

    /* ================================================================
       RESET / BASE
       ================================================================ */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-body);
      background: var(--bg);
      color: var(--text);
      font-size: 1.0625rem;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    img, svg { display: block; max-width: 100%; }
    a {
      color: var(--text);
      text-underline-offset: 3px;
      text-decoration-thickness: 3px;
    }
    a:hover { background: var(--purple-light); text-decoration: none; color: var(--text); }
    ::selection { background: var(--purple); color: var(--on-purple); }
    main { flex: 1; }
    .container {
      width: 100%;
      max-width: var(--container);
      margin: 0 auto;
      padding: 0 2rem;
    }

    /* ================================================================
       FOCUS
       ================================================================ */
    :focus-visible { outline: 3px solid var(--purple); outline-offset: 3px; }
    :focus:not(:focus-visible) { outline: none; }

    /* ================================================================
       PAGE HEADER
       ================================================================ */
    .page-header { padding: 4rem 0 2.5rem; }
    .page-header-grid {
      display: grid;
      grid-template-columns: 4px 1fr;
      gap: 0 2.5rem;
    }
    .page-header-bar { background: var(--purple); align-self: stretch; }
    .page-title {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 700;
      line-height: 1.02;
      letter-spacing: -0.03em;
    }
    .page-lead {
      margin-top: 1.5rem;
      font-size: clamp(1rem, 1.8vw, 1.25rem);
      color: var(--text-muted);
      max-width: 56ch;
      line-height: 1.55;
    }

    /* ================================================================
       PROSE
       ================================================================ */
    .prose {
      max-width: var(--measure);
      padding: 2rem 0 3rem;
      font-size: 1.0625rem;
      line-height: 1.7;
      color: var(--text-muted);
    }
    .prose > * + * { margin-top: 1.25rem; }
    .prose h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
      margin-top: 2.5rem;
      letter-spacing: -0.015em;
    }
    .prose h2:first-child { margin-top: 0; }
    .prose p { color: var(--text-muted); }
    .prose strong { color: var(--text); font-weight: 700; }
    .prose a { color: var(--purple); text-decoration-thickness: 2px; }
    .prose a:hover { background: var(--purple-light); text-decoration: underline; }
    .prose ol, .prose ul { padding-left: 1.5rem; color: var(--text-muted); }
    .prose ol li + li, .prose ul li + li { margin-top: 0.5rem; }
    .prose code {
      font-family: var(--font-mono);
      font-size: 0.875em;
      padding: 0.15em 0.4em;
      background: var(--surface);
      border: 2px solid var(--ink);
      color: var(--text);
    }
    .prose pre {
      background: var(--surface);
      border: var(--border);
      box-shadow: var(--shadow);
      padding: 1rem 1.25rem;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 0.875rem;
      line-height: 1.55;
    }
    .prose pre code { padding: 0; background: transparent; border: none; }

    /* ================================================================
       BOOKMARKLET INSTALL
       ================================================================ */
    .bm-install { margin: 1.5rem 0 0.75rem; }

    /* .prose .bm-link uses higher specificity (0-2-0) to beat
       .prose a (0-1-1), which would otherwise set color: var(--purple)
       and make the link text invisible against the purple background. */
    .prose .bm-link,
    .bm-link {
      display: inline-block;
      padding: 0.6rem 1.25rem;
      font-family: var(--font-mono);
      font-size: 0.9375rem;
      font-weight: 700;
      border: var(--border);
      box-shadow: var(--shadow);
      background: var(--purple);
      color: var(--on-purple);
      text-decoration: none;
      cursor: grab;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .prose .bm-link:hover,
    .bm-link:hover {
      background: var(--purple);
      color: var(--on-purple);
      text-decoration: none;
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 var(--ink);
    }
    .prose .bm-link:focus-visible,
    .bm-link:focus-visible {
      outline: 3px solid var(--on-purple);
      outline-offset: -10px;
    }
    .bm-link:active { cursor: grabbing; }

    /* ================================================================
       KBD
       ================================================================ */
    kbd {
      font-family: var(--font-mono);
      font-size: 0.8125em;
      padding: 0.15em 0.4em;
      background: var(--surface);
      border: 2px solid var(--ink);
      color: var(--text);
    }

    /* ================================================================
       FOOTER
       ================================================================ */
    .site-footer {
      border-top: var(--border);
      padding: 1.25rem 2rem;
    }
    .footer-text {
      font-size: 1.0625rem;
      color: var(--text-muted);
    }
    .site-footer a { color: var(--purple); text-decoration-thickness: 2px; }
    .site-footer a:hover { background: var(--purple-light); }

    /* ================================================================
       RESPONSIVE
       ================================================================ */
    @media (max-width: 720px) {
      .container { padding: 0 1.25rem; }
      .page-header { padding: 2.5rem 0 1.5rem; }
      .page-header-grid { gap: 0 1.25rem; }
      .site-footer { padding: 1.25rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  </style>
</head>
<body>
  <main id="main">
    <div class="page-header">
      <div class="container">
        <div class="page-header-grid">
          <div class="page-header-bar"></div>
          <div>
            <h1 class="page-title">Target Size Tester</h1>
            <p class="page-lead">A bookmarklet for testing WCAG Success Criteria 2.5.8 Target Size (Minimum) (Level AA) and 2.5.5 Target Size (Enhanced) (Level AAA)</p>
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="prose">

        <h2>Installation</h2>
        <p>Drag the link to your bookmarks bar.</p>
        <p class="bm-install">
          <a class="bm-link" href="${bookmarkletURI}">Target Size Tester</a>
        </p>

        <h2>Basic Usage</h2>
        <ol>
          <li>Activate the bookmarklet.</li>
          <li>Observe the color-coded overlays that appear on all detected interactive targets.</li>
          <li>Hover over any overlay to see a tooltip with the conformance result and target dimensions.</li>
          <li>Use the legend panel in the bottom-right corner to switch active standard, adjust the view, and open the results dialog.</li>
          <li>Activate the bookmarklet again to quit.</li>
        </ol>

        <h2>Keyboard Shortcuts</h2>
        <ul>
          <li><kbd>Alt + =</kbd>: Rerun in place and refresh all overlays. Useful after scrolling or when interacting with dynamic content such as dropdown menus.</li>
          <li><kbd>Alt + t</kbd>: Hide the legend panel. Useful when the panel obscures a target.</li>
        </ul>

        <h2>Source code</h2>
        <p>The bookmarklet is open source. Found a bug or a detection edge case? <a href="https://github.com/willslone/target-size-tester/">Open an issue or pull request on GitHub.</a></p>

      </div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p class="footer-text">Created by <a href="https://willslone.com" target="_blank" rel="noopener noreferrer" aria-label="Will Slone (opens in new tab)">Will Slone</a></p>
    </div>
  </footer>
</body>
</html>`;

writeFileSync('index.html', html, 'utf8');
console.log('Done.');
