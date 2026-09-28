/*!
 * PDF converter engine — every conversion runs 100% in the browser.
 * Files never leave the user's device. Libraries load lazily on demand.
 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ROOT = document.body.getAttribute('data-root') || './';
  var VENDOR = ROOT + 'assets/vendor/';

  /* ------------------------------------------------------------------ *
   * Lazy library loader
   * ------------------------------------------------------------------ */
  var LIBS = {
    pdfjs: { src: 'pdf.min.js', global: 'pdfjsLib', init: function (l) { l.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.js'; } },
    pdflib: { src: 'pdf-lib.min.js', global: 'PDFLib' },
    docx: { src: 'docx.min.js', global: 'docx' },
    xlsx: { src: 'xlsx.full.min.js', global: 'XLSX' },
    mammoth: { src: 'mammoth.browser.min.js', global: 'mammoth' },
    h2c: { src: 'html2canvas.min.js', global: 'html2canvas' },
    jszip: { src: 'jszip.min.js', global: 'JSZip' }
  };
  var loading = {};
  function load(name) {
    if (loading[name]) return loading[name];
    var lib = LIBS[name];
    loading[name] = new Promise(function (resolve, reject) {
      var done = function () { var g = window[lib.global]; if (lib.init) lib.init(g); resolve(g); };
      if (window[lib.global]) return done();
      var s = document.createElement('script');
      s.src = VENDOR + lib.src;
      s.async = true;
      s.onload = done;
      s.onerror = function () { delete loading[name]; reject(new Error('Could not load the converter engine. Please check your internet connection and try again.')); };
      document.head.appendChild(s);
    });
    return loading[name];
  }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  var baseName = function (n) { return n.replace(/\.[^.]+$/, '') || 'file'; };
  var ext = function (n) { var m = /\.([^.]+)$/.exec(n); return m ? m[1].toLowerCase() : ''; };
  var tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };
  function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function canvasBlob(c, type, q) {
    return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error('Image encoding failed')); }, type, q); });
  }
  function median(arr) {
    if (!arr.length) return 0;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    return a[Math.floor(a.length / 2)];
  }

  /* "1-3, 5, 8-" -> [[1,2,3],[5],[8..max]] ; blank -> [[1..max]] */
  function parseRanges(str, max) {
    str = (str || '').trim();
    if (!str) return [range(1, max)];
    var groups = [];
    str.split(/[,;]+/).forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var m = /^(\d*)\s*-\s*(\d*)$/.exec(part);
      var a, b;
      if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : max; }
      else if (/^\d+$/.test(part)) { a = b = +part; }
      else throw new Error('Invalid page range "' + part + '". Use a format like 1-3, 5, 8-10.');
      if (a > b) { var t = a; a = b; b = t; }
      a = Math.max(1, a); b = Math.min(max, b);
      if (a > max) throw new Error('Page ' + a + ' does not exist — this PDF has ' + max + ' page' + (max > 1 ? 's' : '') + '.');
      groups.push(range(a, b));
    });
    if (!groups.length) return [range(1, max)];
    return groups;
  }
  function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }
  function pickPages(str, max) {
    var seen = {}, out = [];
    parseRanges(str, max).forEach(function (g) { g.forEach(function (p) { if (!seen[p]) { seen[p] = 1; out.push(p); } }); });
    return out;
  }

  /* ------------------------------------------------------------------ *
   * PDF reading (pdf.js)
   * ------------------------------------------------------------------ */
  function openPdf(file) {
    return Promise.all([load('pdfjs'), file.arrayBuffer()]).then(function (r) {
      return r[0].getDocument({ data: new Uint8Array(r[1]), isEvalSupported: false }).promise.catch(function (e) {
        if (e && e.name === 'PasswordException') throw new Error('"' + file.name + '" is password-protected. Please remove the password and try again.');
        throw new Error('"' + file.name + '" could not be opened. The file may be damaged or is not a valid PDF.');
      });
    });
  }

  function renderPage(page, scale) {
    var vp = page.getViewport({ scale: scale });
    var maxPx = 16e6; // stay under browser canvas limits
    if (vp.width * vp.height > maxPx) vp = page.getViewport({ scale: scale * Math.sqrt(maxPx / (vp.width * vp.height)) });
    var c = document.createElement('canvas');
    c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () { return c; });
  }

  /* Reconstruct lines, styled runs and table-like cells from positioned text. */
  function extractLines(page) {
    var lib = window.pdfjsLib;
    var vp = page.getViewport({ scale: 1 });
    var fonts = {};
    function fontInfo(name) {
      if (fonts[name]) return fonts[name];
      var info = { bold: false, italic: false };
      try {
        if (page.commonObjs.has(name)) {
          var f = page.commonObjs.get(name), n = (f && f.name) || '';
          info.bold = !!(f && (f.bold || f.black)) || /bold|black|heavy|semibold|demi/i.test(n);
          info.italic = !!(f && f.italic) || /italic|oblique/i.test(n);
        }
      } catch (e) { /* font info unavailable */ }
      return (fonts[name] = info);
    }
    // Operator list resolves fonts so bold/italic can be detected.
    return page.getOperatorList().catch(function () {}).then(function () {
      return page.getTextContent();
    }).then(function (tc) {
      var items = [];
      tc.items.forEach(function (it) {
        if (!it.str || !it.str.trim()) return;
        var t = lib.Util.transform(vp.transform, it.transform);
        var size = Math.hypot(t[2], t[3]) || it.height || 10;
        var w = it.width * (vp.scale || 1);
        items.push({ str: it.str.replace(/\s+/g, ' '), x: t[4], y: t[5], w: w, size: size, font: fontInfo(it.fontName) });
      });
      items.sort(function (a, b) { return a.y - b.y || a.x - b.x; });

      var lines = [];
      items.forEach(function (it) {
        var last = lines[lines.length - 1];
        if (last && Math.abs(last.y - it.y) <= Math.max(2, Math.min(last.size, it.size) * 0.45)) last.items.push(it);
        else lines.push({ y: it.y, size: it.size, items: [it] });
      });

      lines.forEach(function (line) {
        line.items.sort(function (a, b) { return a.x - b.x; });
        var runs = [], cells = [], text = '', prevEnd = null, sizes = {};
        line.items.forEach(function (it) {
          var s = it.str, tab = false;
          if (prevEnd !== null) {
            var gap = it.x - prevEnd;
            if (gap > it.size * 0.8) { cells.push({ x: it.x, end: it.x, text: '' }); if (gap > it.size * 1.6) tab = true; }
            else if (gap > it.size * 0.15 && !/\s$/.test(text) && !/^\s/.test(s)) s = ' ' + s;
          } else cells.push({ x: it.x, end: it.x, text: '' });
          var cell = cells[cells.length - 1];
          cell.text += cell.text ? s : s.replace(/^\s+/, '');
          cell.end = Math.max(cell.end, it.x + it.w);
          if (tab) { runs.push({ tab: true }); s = s.replace(/^\s+/, ''); text += '\t'; }
          text += s;
          var prev = runs[runs.length - 1];
          if (prev && !prev.tab && prev.bold === it.font.bold && prev.italic === it.font.italic && Math.abs(prev.size - it.size) < 0.6) prev.text += s;
          else runs.push({ text: s, bold: it.font.bold, italic: it.font.italic, size: it.size });
          sizes[Math.round(it.size * 2) / 2] = (sizes[Math.round(it.size * 2) / 2] || 0) + s.length;
          prevEnd = Math.max(prevEnd === null ? -Infinity : prevEnd, it.x + it.w);
        });
        var best = 0;
        Object.keys(sizes).forEach(function (k) { if (sizes[k] > (sizes[best] || 0)) best = k; });
        line.size = +best || line.size;
        line.x = line.items[0].x;
        line.end = prevEnd;
        line.text = text;
        line.runs = runs;
        line.cells = cells.map(function (c) { c.text = c.text.trim(); return c; });
      });
      return { lines: lines, width: vp.width, height: vp.height };
    });
  }

  /* ------------------------------------------------------------------ *
   * PDF -> Word (.docx)
   * ------------------------------------------------------------------ */
  var BULLET = /^\s*([•●○◦▪■□►▸\-–—*]|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)]|[ivxIVX]{1,4}[.)])\s/;

  function pageProps(D, vp, margins) {
    var W = Math.round(vp.width * 20), H = Math.round(vp.height * 20);
    var size = W > H ? { width: H, height: W, orientation: D.PageOrientation.LANDSCAPE } : { width: W, height: H };
    return { page: { size: size, margin: margins } };
  }

  function linesToParagraphs(D, data) {
    var lines = data.lines;
    var body = median(lines.map(function (l) { return l.size; })) || 11;
    var minX = Math.min.apply(null, lines.map(function (l) { return l.x; }));
    var maxEnd = Math.max.apply(null, lines.map(function (l) { return l.end; }));
    var mL = Math.min(Math.max(minX, 18), 108), mR = Math.min(Math.max(data.width - maxEnd, 18), 108);
    var mT = Math.min(Math.max(lines[0].y - lines[0].size * 1.2, 18), 108);
    var contentW = data.width - mL - mR;

    var paras = [], cur = null, prev = null;
    lines.forEach(function (line) {
      var gap = prev ? line.y - prev.y : 0;
      var sameSize = prev && Math.abs(line.size - prev.size) < 1;
      var cont = cur && sameSize && gap > 0 && gap < line.size * 1.75 &&
        line.x < cur.x + line.size * 2.5 && line.x > cur.x - line.size * 3 &&
        !BULLET.test(line.text) && line.text.indexOf('\t') < 0 && prev.text.indexOf('\t') < 0 &&
        prev.end > data.width - mR - line.size * 8; // previous line reached the right edge => wrapped text
      if (cont) {
        var lastRun = cur.runs[cur.runs.length - 1];
        if (lastRun && !lastRun.tab && /[a-z]-$/.test(lastRun.text) && /^[a-z]/.test(line.text)) lastRun.text = lastRun.text.slice(0, -1);
        else if (lastRun && !lastRun.tab) lastRun.text += ' ';
        cur.runs = cur.runs.concat(line.runs.map(function (r) { return Object.assign({}, r); }));
        cur.lines++;
        cur.end = Math.max(cur.end, line.end);
      } else {
        var extra = prev ? gap - Math.max(prev.size, line.size) * 1.25 : 0;
        cur = { x: line.x, end: line.end, size: line.size, runs: line.runs.map(function (r) { return Object.assign({}, r); }), lines: 1, before: Math.max(0, Math.min(extra, 48)) };
        paras.push(cur);
      }
      prev = line;
    });

    var children = paras.map(function (p) {
      var align, indent = Math.max(0, p.x - mL);
      var center = (p.x + p.end) / 2, mid = mL + contentW / 2;
      if (p.lines === 1 && indent > 24 && Math.abs(center - mid) < contentW * 0.04) { align = D.AlignmentType.CENTER; indent = 0; }
      else if (p.lines === 1 && p.x > mid && Math.abs(p.end - (data.width - mR)) < 12) { align = D.AlignmentType.RIGHT; indent = 0; }
      var isHeading = p.size >= body * 1.3 && p.lines <= 3;
      return new D.Paragraph({
        alignment: align,
        indent: indent ? { left: Math.round(indent * 20) } : undefined,
        spacing: { before: Math.round(p.before * 20), after: isHeading ? 120 : 60 },
        keepNext: isHeading || undefined,
        children: p.runs.map(function (r) {
          if (r.tab) return new D.TextRun({ children: [new D.Tab()] });
          return new D.TextRun({ text: r.text, bold: r.bold || undefined, italics: r.italic || undefined, size: Math.max(8, Math.round(r.size * 2)) });
        })
      });
    });
    return { children: children, margins: { top: Math.round(mT * 20), bottom: 720, left: Math.round(mL * 20), right: Math.round(mR * 20) } };
  }

  function imageSection(D, page, vp) {
    return renderPage(page, 2).then(function (c) { return canvasBlob(c, 'image/jpeg', 0.9); }).then(function (b) { return b.arrayBuffer(); }).then(function (buf) {
      var k = 96 / 72 * 0.985;
      return {
        properties: pageProps(D, vp, { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0 }),
        children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new D.ImageRun({ data: buf, transformation: { width: Math.round(vp.width * k), height: Math.round(vp.height * k) } })] })]
      };
    });
  }

  async function pdfToWord(file, o, ctx) {
    var D = await load('docx');
    var pdf = await openPdf(file);
    var pages = pickPages(o.pages, pdf.numPages);
    var sections = [], scanned = 0;
    for (var i = 0; i < pages.length; i++) {
      ctx.progress(i / pages.length, 'Converting page ' + pages[i] + ' of ' + pdf.numPages + '…');
      var page = await pdf.getPage(pages[i]);
      var vp = page.getViewport({ scale: 1 });
      var data = o.mode === 'layout' ? null : await extractLines(page);
      if (!data || !data.lines.length) {
        if (data) scanned++;
        sections.push(await imageSection(D, page, vp));
      } else {
        var r = linesToParagraphs(D, data);
        sections.push({ properties: pageProps(D, vp, r.margins), children: r.children });
      }
      page.cleanup();
      await tick();
    }
    if (scanned) ctx.note(scanned + ' page(s) had no selectable text (scanned image) and were added as pictures.');
    var doc = new D.Document({
      creator: 'PDF Converter', title: baseName(file.name),
      styles: { default: { document: { run: { font: 'Calibri' } } } },
      sections: sections
    });
    var blob = await D.Packer.toBlob(doc);
    await pdf.destroy();
    return [{ name: baseName(file.name) + '.docx', blob: blob }];
  }

  /* ------------------------------------------------------------------ *
   * PDF -> Excel (.xlsx / .csv)
   * ------------------------------------------------------------------ */
  var NUM = /^[-+]?(\d{1,3}(,\d{2,3})+|\d+)(\.\d+)?$/;
  function toValue(s) {
    var t = s.replace(/^[₹$€£¥]\s?/, '');
    var neg = /^\((.+)\)$/.exec(t);
    if (neg) t = '-' + neg[1];
    if (NUM.test(t) && !/^[-+]?0\d/.test(t) && t.replace(/\D/g, '').length <= 15) return parseFloat(t.replace(/,/g, ''));
    return s;
  }

  function tableFromLines(lines) {
    var cols = [];
    function overlap(c, col) { return Math.min(c.end, col.max) - Math.max(c.x, col.min); }
    lines.forEach(function (line, r) {
      if (line.cells.length < 2) return;
      line.cells.forEach(function (c) {
        var best = null, bestOv = -Infinity;
        cols.forEach(function (col) {
          if (col.rows[r]) return;
          var ov = overlap(c, col);
          if (ov > -4 && ov > bestOv) { bestOv = ov; best = col; }
        });
        if (!best) { best = { min: c.x, max: c.end, rows: {} }; cols.push(best); }
        best.min = Math.min(best.min, c.x); best.max = Math.max(best.max, c.end); best.rows[r] = 1;
      });
    });
    cols.sort(function (a, b) { return a.min - b.min; });
    for (var i = 0; i < cols.length - 1; i++) { // merge overlapping columns that never share a row
      var a = cols[i], b = cols[i + 1];
      var share = Object.keys(b.rows).some(function (k) { return a.rows[k]; });
      if (!share && b.min < a.max) { a.max = Math.max(a.max, b.max); Object.assign(a.rows, b.rows); cols.splice(i + 1, 1); i--; }
    }
    if (!cols.length) cols.push({ min: 0, max: Infinity, rows: {} });
    return lines.map(function (line) {
      var row = cols.map(function () { return ''; });
      line.cells.forEach(function (c) {
        var idx = 0, bestOv = -Infinity;
        cols.forEach(function (col, j) {
          var ov = line.cells.length < 2 ? -Math.abs(c.x - col.min) : overlap(c, col);
          if (ov > bestOv) { bestOv = ov; idx = j; }
        });
        row[idx] = row[idx] ? row[idx] + ' ' + c.text : c.text;
      });
      return row.map(toValue);
    });
  }

  async function pdfToExcel(file, o, ctx) {
    var X = await load('xlsx');
    var pdf = await openPdf(file);
    var pages = pickPages(o.pages, pdf.numPages);
    var wb = X.utils.book_new(), all = [], found = false;
    for (var i = 0; i < pages.length; i++) {
      ctx.progress(i / pages.length, 'Reading tables on page ' + pages[i] + '…');
      var page = await pdf.getPage(pages[i]);
      var data = await extractLines(page);
      page.cleanup();
      if (!data.lines.length) continue;
      found = true;
      var rows = tableFromLines(data.lines);
      if (o.sheets === 'single' || o.format === 'csv') { if (all.length) all.push([]); all = all.concat(rows); }
      else X.utils.book_append_sheet(wb, sheetWithWidths(X, rows), 'Page ' + pages[i]);
      await tick();
    }
    await pdf.destroy();
    if (!found) throw new Error('No selectable text was found in "' + file.name + '". It looks like a scanned PDF — try PDF to JPG instead.');
    if (o.format === 'csv') {
      var csv = X.utils.sheet_to_csv(X.utils.aoa_to_sheet(all));
      return [{ name: baseName(file.name) + '.csv', blob: new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }) }];
    }
    if (o.sheets === 'single') X.utils.book_append_sheet(wb, sheetWithWidths(X, all), 'Sheet1');
    var out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    return [{ name: baseName(file.name) + '.xlsx', blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) }];
  }
  function sheetWithWidths(X, rows) {
    var ws = X.utils.aoa_to_sheet(rows), w = [];
    rows.forEach(function (r) { r.forEach(function (v, j) { w[j] = Math.max(w[j] || 8, Math.min(60, String(v).length + 2)); }); });
    ws['!cols'] = w.map(function (x) { return { wch: x }; });
    return ws;
  }

  /* ------------------------------------------------------------------ *
   * PDF -> JPG / PNG / Text
   * ------------------------------------------------------------------ */
  function pdfToImages(fmt) {
    return async function (file, o, ctx) {
      var pdf = await openPdf(file);
      var pages = pickPages(o.pages, pdf.numPages), out = [];
      var type = fmt === 'png' ? 'image/png' : 'image/jpeg';
      for (var i = 0; i < pages.length; i++) {
        ctx.progress(i / pages.length, 'Rendering page ' + pages[i] + ' of ' + pdf.numPages + '…');
        var page = await pdf.getPage(pages[i]);
        var c = await renderPage(page, (+o.dpi || 150) / 72);
        out.push({ name: baseName(file.name) + '-page-' + pages[i] + '.' + fmt, blob: await canvasBlob(c, type, 0.92), preview: true });
        c.width = c.height = 0;
        page.cleanup();
      }
      await pdf.destroy();
      return out;
    };
  }

  async function pdfToText(file, o, ctx) {
    var pdf = await openPdf(file);
    var pages = pickPages(o.pages, pdf.numPages), parts = [];
    for (var i = 0; i < pages.length; i++) {
      ctx.progress(i / pages.length, 'Extracting text from page ' + pages[i] + '…');
      var page = await pdf.getPage(pages[i]);
      var data = await extractLines(page), txt = '', prev = null;
      data.lines.forEach(function (l) {
        if (prev && l.y - prev.y > Math.max(l.size, prev.size) * 1.8) txt += '\n';
        txt += l.text.replace(/\t/g, '    ') + '\n';
        prev = l;
      });
      parts.push((o.markers ? '===== Page ' + pages[i] + ' =====\n\n' : '') + txt.trim());
      page.cleanup();
    }
    await pdf.destroy();
    var all = parts.join('\n\n');
    if (!all.replace(/=+ Page \d+ =+/g, '').trim()) throw new Error('No selectable text was found. This PDF appears to be a scanned image.');
    return [{ name: baseName(file.name) + '.txt', blob: new Blob([all], { type: 'text/plain;charset=utf-8' }) }];
  }

  /* ------------------------------------------------------------------ *
   * Merge / Split (pdf-lib)
   * ------------------------------------------------------------------ */
  async function loadPdfLib(file) {
    var L = await load('pdflib');
    var doc;
    try { doc = await L.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true }); }
    catch (e) { throw new Error('"' + file.name + '" could not be opened. The file may be damaged or is not a valid PDF.'); }
    if (doc.isEncrypted) throw new Error('"' + file.name + '" is password-protected or encrypted. Please unlock it first.');
    return doc;
  }
  function pdfBlob(bytes) { return new Blob([bytes], { type: 'application/pdf' }); }

  async function mergePdf(files, o, ctx) {
    if (files.length < 2) throw new Error('Please add at least 2 PDF files to merge.');
    var L = await load('pdflib');
    var out = await L.PDFDocument.create();
    for (var i = 0; i < files.length; i++) {
      ctx.progress(i / files.length, 'Adding ' + files[i].name + '…');
      var src = await loadPdfLib(files[i]);
      var copied = await out.copyPages(src, src.getPageIndices());
      copied.forEach(function (p) { out.addPage(p); });
    }
    out.setTitle(baseName(files[0].name) + ' (merged)');
    return [{ name: (o.name ? o.name.replace(/\.pdf$/i, '') : 'merged') + '.pdf', blob: pdfBlob(await out.save()) }];
  }

  async function splitPdf(file, o, ctx) {
    var L = await load('pdflib');
    var src = await loadPdfLib(file);
    var n = src.getPageCount(), groups;
    if (o.mode === 'each') groups = range(1, n).map(function (p) { return [p]; });
    else {
      if (!(o.pages || '').trim()) throw new Error('Please enter the pages or ranges to split, e.g. 1-3, 4-6, 7.');
      groups = parseRanges(o.pages, n);
      if (o.mode === 'extract') groups = [pickPages(o.pages, n)];
    }
    var out = [];
    for (var i = 0; i < groups.length; i++) {
      ctx.progress(i / groups.length, 'Creating part ' + (i + 1) + ' of ' + groups.length + '…');
      var doc = await L.PDFDocument.create();
      var pages = await doc.copyPages(src, groups[i].map(function (p) { return p - 1; }));
      pages.forEach(function (p) { doc.addPage(p); });
      var g = groups[i], label = g.length === 1 ? 'page-' + g[0] : 'pages-' + g[0] + '-' + g[g.length - 1];
      if (o.mode === 'extract') label = 'extracted';
      out.push({ name: baseName(file.name) + '-' + label + '.pdf', blob: pdfBlob(await doc.save()) });
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * HTML -> paginated PDF (used by Word, Excel and Text to PDF).
   * Renders pixel-perfect pages so every language/script (Hindi, Arabic,
   * Chinese…) looks exactly right, then packs them into a PDF.
   * ------------------------------------------------------------------ */
  var PAGE_PT = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008] };

  function splittable(node) {
    if (node.nodeType !== 1) return null;
    if (node.tagName === 'TABLE') {
      var body = node.tBodies[0] || node;
      return { kids: Array.prototype.slice.call(body.children).filter(function (e) { return e.tagName === 'TR'; }), shell: function () { var t = node.cloneNode(false); if (node.tHead) t.appendChild(node.tHead.cloneNode(true)); var tb = document.createElement('tbody'); t.appendChild(tb); return { el: t, box: tb }; } };
    }
    if (/^(UL|OL|DIV|BLOCKQUOTE|SECTION)$/.test(node.tagName) && node.children.length > 1) {
      return { kids: Array.prototype.slice.call(node.childNodes), shell: function () { var e = node.cloneNode(false); return { el: e, box: e }; } };
    }
    return null;
  }

  async function htmlToPdf(html, o, ctx, css) {
    var loaded = await Promise.all([load('h2c'), load('pdflib')]);
    var h2c = loaded[0], L = loaded[1];
    var pt = (PAGE_PT[o.size] || PAGE_PT.a4).slice();
    if (o.orientation === 'landscape') pt.reverse();
    var W = Math.round(pt[0] * 4 / 3), H = Math.round(pt[1] * 4 / 3), M = +o.margin >= 0 && o.margin !== '' ? +o.margin : 48;

    var host = document.createElement('div');
    host.className = 'r-host';
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = '<style>' + RENDER_CSS + (css || '') + '</style>';
    var stage = document.createElement('div');
    stage.className = 'r-doc';
    stage.style.width = (W - 2 * M) + 'px';
    stage.innerHTML = html;
    host.appendChild(stage);
    document.body.appendChild(host);

    try {
      await Promise.all(Array.prototype.map.call(stage.querySelectorAll('img'), function (img) {
        return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
      }));
      // Shrink wide tables so they fit the page width.
      Array.prototype.forEach.call(stage.querySelectorAll('table'), function (t) {
        var fs = 12;
        while (t.scrollWidth > stage.clientWidth && fs > 5) { fs -= 0.5; t.style.fontSize = fs + 'px'; }
      });

      ctx.progress(0.1, 'Laying out pages…');
      var pages = [], content;
      var avail = H - 2 * M;
      function newPage() {
        var p = document.createElement('div');
        p.className = 'r-page';
        p.style.cssText = 'width:' + W + 'px;height:' + H + 'px;padding:' + M + 'px;';
        content = document.createElement('div');
        content.className = 'r-doc';
        content.style.width = (W - 2 * M) + 'px';
        p.appendChild(content);
        host.appendChild(p);
        pages.push(p);
      }
      function fits() { return content.scrollHeight <= avail + 1; }
      function place(node) {
        if (node.nodeType === 3) {
          if (!node.textContent.trim()) return;
          var p = document.createElement('p'); p.textContent = node.textContent; node = p;
        }
        content.appendChild(node);
        if (fits()) return;
        content.removeChild(node);
        var sp = splittable(node);
        if (sp && sp.kids.length > 1) {
          var part = sp.shell(), moved = 0;
          content.appendChild(part.el);
          for (var i = 0; i < sp.kids.length; i++) {
            part.box.appendChild(sp.kids[i]);
            if (!fits()) { part.box.removeChild(sp.kids[i]); break; }
            moved++;
          }
          if (!moved) content.removeChild(part.el);
          if (moved === sp.kids.length) return;
          if (moved || content.childNodes.length) newPage();
          else { // even one child does not fit on an empty page: force it
            part = sp.shell(); content.appendChild(part.el); part.box.appendChild(sp.kids[0]); newPage();
          }
          return place(node);
        }
        if (!content.childNodes.length) { content.appendChild(node); newPage(); return; }
        newPage();
        place(node);
      }
      newPage();
      var nodes = Array.prototype.slice.call(stage.childNodes);
      stage.remove();
      nodes.forEach(place);
      // drop a trailing empty page
      if (pages.length > 1 && !pages[pages.length - 1].firstChild.childNodes.length) pages.pop().remove();

      var doc = await L.PDFDocument.create();
      for (var i = 0; i < pages.length; i++) {
        ctx.progress(0.15 + 0.85 * i / pages.length, 'Rendering page ' + (i + 1) + ' of ' + pages.length + '…');
        var canvas = await h2c(pages[i], { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, width: W, height: H, windowWidth: W });
        var jpg = await (await canvasBlob(canvas, 'image/jpeg', 0.88)).arrayBuffer();
        var img = await doc.embedJpg(jpg);
        doc.addPage(pt).drawImage(img, { x: 0, y: 0, width: pt[0], height: pt[1] });
        canvas.width = canvas.height = 0;
      }
      if (o.title) doc.setTitle(o.title);
      return pdfBlob(await doc.save());
    } finally {
      host.remove();
    }
  }

  var RENDER_CSS =
    '.r-host{position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none}' +
    '.r-page{box-sizing:border-box;background:#fff;overflow:hidden;margin-bottom:10px}' +
    '.r-doc{color:#111;font:12pt/1.45 Calibri,Carlito,"Segoe UI","Noto Sans","Noto Sans Devanagari",Mangal,Arial,sans-serif;word-wrap:break-word;overflow-wrap:anywhere}' +
    '.r-doc>*:first-child{margin-top:0}' +
    '.r-doc p{margin:0 0 8px}.r-doc h1{font-size:22pt;margin:14px 0 10px}.r-doc h2{font-size:17pt;margin:12px 0 8px}.r-doc h3{font-size:14pt;margin:10px 0 6px}' +
    '.r-doc h4,.r-doc h5,.r-doc h6{font-size:12pt;margin:8px 0 6px}' +
    '.r-doc img{max-width:100%;height:auto}.r-doc ul,.r-doc ol{margin:0 0 8px;padding-left:28px}' +
    '.r-doc table{border-collapse:separate;border-spacing:0;border-top:1px solid #9aa3af;border-left:1px solid #9aa3af;margin:0 0 10px;font-size:12px}.r-doc td,.r-doc th{border:0;border-right:1px solid #9aa3af;border-bottom:1px solid #9aa3af;padding:3px 6px;vertical-align:top}' +
    '.r-doc thead td,.r-doc th{background:#eef1f5;font-weight:700}';

  async function wordToPdf(file, o, ctx) {
    if (ext(file.name) !== 'docx') throw new Error('"' + file.name + '": only .docx files are supported. For an old .doc file, open it in Word or Google Docs and save it as .docx first.');
    var m = await load('mammoth');
    ctx.progress(0.05, 'Reading document…');
    var res = await m.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    if (!res.value.trim()) throw new Error('"' + file.name + '" appears to be empty.');
    var blob = await htmlToPdf(res.value, Object.assign({ title: baseName(file.name) }, o), ctx);
    return [{ name: baseName(file.name) + '.pdf', blob: blob }];
  }

  async function excelToPdf(file, o, ctx) {
    var X = await load('xlsx');
    ctx.progress(0.05, 'Reading spreadsheet…');
    var wb;
    try { wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true, dense: false }); }
    catch (e) { throw new Error('"' + file.name + '" could not be read as a spreadsheet.'); }
    var html = '', many = wb.SheetNames.length > 1, maxCols = 0;
    wb.SheetNames.forEach(function (name, idx) {
      var ws = wb.Sheets[name];
      if (!ws['!ref']) return;
      var cols = X.utils.decode_range(ws['!ref']).e.c + 1;
      maxCols = Math.max(maxCols, cols);
      var doc = new DOMParser().parseFromString(X.utils.sheet_to_html(ws, { header: '', footer: '' }), 'text/html');
      var table = doc.querySelector('table');
      if (!table) return;
      Array.prototype.forEach.call(table.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); });
      if (o.header && table.rows.length > 1) {
        var thead = doc.createElement('thead');
        thead.appendChild(table.rows[0]);
        table.insertBefore(thead, table.firstChild);
      }
      html += (idx && o.breaks ? '<div class="pb"></div>' : '') + (many ? '<h3>' + escapeHtml(name) + '</h3>' : '') + table.outerHTML;
    });
    if (!html) throw new Error('"' + file.name + '" has no data to convert.');
    var opts = Object.assign({ title: baseName(file.name) }, o);
    if (o.orientation === 'auto') opts.orientation = maxCols > 6 ? 'landscape' : 'portrait';
    var blob = await htmlToPdf(html, opts, ctx, '.r-doc td,.r-doc th{white-space:nowrap}');
    return [{ name: baseName(file.name) + '.pdf', blob: blob }];
  }

  async function textToPdf(file, o, ctx) {
    var txt = await file.text();
    if (!txt.trim()) throw new Error('"' + file.name + '" is empty.');
    var html = txt.replace(/\r\n?/g, '\n').split('\n').map(function (l) { return '<p class="t">' + (escapeHtml(l) || '&nbsp;') + '</p>'; }).join('');
    var font = o.font === 'mono' ? 'Consolas,"Courier New",monospace' : 'Calibri,Carlito,"Segoe UI","Noto Sans","Noto Sans Devanagari",Arial,sans-serif';
    var blob = await htmlToPdf(html, Object.assign({ title: baseName(file.name) }, o), ctx,
      '.r-doc p.t{margin:0;white-space:pre-wrap;font-family:' + font + ';font-size:' + (+o.fontSize || 11) + 'pt;line-height:1.4}');
    return [{ name: baseName(file.name) + '.pdf', blob: blob }];
  }

  /* ------------------------------------------------------------------ *
   * Images -> PDF
   * ------------------------------------------------------------------ */
  function jpegOrientation(buf) {
    var v = new DataView(buf);
    if (v.getUint16(0) !== 0xFFD8) return 1;
    var off = 2;
    while (off < v.byteLength - 4) {
      var marker = v.getUint16(off);
      if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) {
        var t = off + 10, le = v.getUint16(t) === 0x4949;
        var ifd = t + v.getUint32(t + 4, le), n = v.getUint16(ifd, le);
        for (var i = 0; i < n; i++) {
          var e = ifd + 2 + i * 12;
          if (e + 10 > v.byteLength) break;
          if (v.getUint16(e, le) === 0x0112) return v.getUint16(e + 8, le);
        }
        return 1;
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      off += 2 + v.getUint16(off + 2);
    }
    return 1;
  }
  function decodeToJpeg(file) {
    var url = URL.createObjectURL(file);
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        var g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvasBlob(c, 'image/jpeg', 0.92).then(function (b) { return b.arrayBuffer(); }).then(res, rej);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('"' + file.name + '" is not a supported image.')); };
      img.src = url;
    });
  }

  async function imagesToPdf(files, o, ctx) {
    var L = await load('pdflib');
    var doc = await L.PDFDocument.create(), M = +o.margin || 0;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      ctx.progress(i / files.length, 'Adding ' + f.name + '…');
      var buf = await f.arrayBuffer(), e = ext(f.name), img;
      try {
        if ((e === 'jpg' || e === 'jpeg' || f.type === 'image/jpeg') && jpegOrientation(buf) === 1) img = await doc.embedJpg(buf);
        else if (e === 'png' || f.type === 'image/png') img = await doc.embedPng(buf);
        else img = await doc.embedJpg(await decodeToJpeg(f));
      } catch (err) {
        img = await doc.embedJpg(await decodeToJpeg(f));
      }
      var iw = img.width * 0.75, ih = img.height * 0.75, pw, ph;
      if (o.size === 'fit') { pw = iw + 2 * M; ph = ih + 2 * M; }
      else {
        var s = (PAGE_PT[o.size] || PAGE_PT.a4).slice();
        var land = o.orientation === 'landscape' || (o.orientation === 'auto' && iw > ih);
        if (land) s.reverse();
        pw = s[0]; ph = s[1];
      }
      var k = Math.min((pw - 2 * M) / iw, (ph - 2 * M) / ih, o.size === 'fit' ? 1 : Infinity);
      var w = iw * k, h = ih * k;
      doc.addPage([pw, ph]).drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      await tick();
    }
    return [{ name: (files.length === 1 ? baseName(files[0].name) : 'images') + '.pdf', blob: pdfBlob(await doc.save()) }];
  }

  /* ------------------------------------------------------------------ *
   * Tool registry
   * ------------------------------------------------------------------ */
  var OPT_PAGES = { id: 'pages', type: 'text', label: 'Pages', placeholder: 'All pages (or e.g. 1-3, 5)' };
  var OPT_SIZE = { id: 'size', type: 'select', label: 'Page size', choices: [['a4', 'A4'], ['letter', 'US Letter'], ['legal', 'Legal']] };
  var OPT_ORIENT = { id: 'orientation', type: 'select', label: 'Orientation', choices: [['portrait', 'Portrait'], ['landscape', 'Landscape']] };
  var OPT_MARGIN = { id: 'margin', type: 'select', label: 'Margins', choices: [['48', 'Normal'], ['24', 'Narrow'], ['72', 'Wide'], ['0', 'None']] };
  var PDF_ACCEPT = '.pdf,application/pdf';
  var IMG_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,image/*';

  var TOOLS = {
    'pdf-to-word': { label: 'PDF to Word', out: 'DOCX', accept: PDF_ACCEPT, perFile: true, run: pdfToWord, options: [
      { id: 'mode', type: 'select', label: 'Conversion mode', choices: [['text', 'Editable text (recommended)'], ['layout', 'Exact layout (pages as images)']] }, OPT_PAGES] },
    'pdf-to-excel': { label: 'PDF to Excel', out: 'XLSX', accept: PDF_ACCEPT, perFile: true, run: pdfToExcel, options: [
      { id: 'sheets', type: 'select', label: 'Worksheets', choices: [['page', 'One sheet per page'], ['single', 'All pages in one sheet']] },
      { id: 'format', type: 'select', label: 'Format', choices: [['xlsx', 'Excel (.xlsx)'], ['csv', 'CSV (.csv)']] }, OPT_PAGES] },
    'pdf-to-jpg': { label: 'PDF to JPG', out: 'JPG', accept: PDF_ACCEPT, perFile: true, run: pdfToImages('jpg'), options: [
      { id: 'dpi', type: 'select', label: 'Quality', choices: [['150', 'High (150 DPI)'], ['96', 'Medium (96 DPI)'], ['300', 'Print (300 DPI)']] }, OPT_PAGES] },
    'pdf-to-png': { label: 'PDF to PNG', out: 'PNG', accept: PDF_ACCEPT, perFile: true, run: pdfToImages('png'), options: [
      { id: 'dpi', type: 'select', label: 'Quality', choices: [['150', 'High (150 DPI)'], ['96', 'Medium (96 DPI)'], ['300', 'Print (300 DPI)']] }, OPT_PAGES] },
    'pdf-to-text': { label: 'PDF to Text', out: 'TXT', accept: PDF_ACCEPT, perFile: true, run: pdfToText, options: [
      OPT_PAGES, { id: 'markers', type: 'check', label: 'Add page separators', def: true }] },
    'word-to-pdf': { label: 'Word to PDF', out: 'PDF', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', perFile: true, run: wordToPdf, options: [OPT_SIZE, OPT_ORIENT, OPT_MARGIN] },
    'excel-to-pdf': { label: 'Excel to PDF', out: 'PDF', accept: '.xlsx,.xls,.xlsm,.ods,.csv', perFile: true, run: excelToPdf, options: [
      OPT_SIZE, { id: 'orientation', type: 'select', label: 'Orientation', choices: [['auto', 'Automatic'], ['portrait', 'Portrait'], ['landscape', 'Landscape']] },
      { id: 'margin', type: 'select', label: 'Margins', choices: [['32', 'Normal'], ['16', 'Narrow'], ['56', 'Wide']] },
      { id: 'header', type: 'check', label: 'Repeat first row on every page', def: true },
      { id: 'breaks', type: 'check', label: 'Start each sheet on a new page', def: true }] },
    'jpg-to-pdf': { label: 'JPG to PDF', out: 'PDF', accept: IMG_ACCEPT, perFile: false, sortable: true, run: imagesToPdf, options: [
      { id: 'size', type: 'select', label: 'Page size', choices: [['a4', 'A4'], ['letter', 'US Letter'], ['fit', 'Same as image']] },
      { id: 'orientation', type: 'select', label: 'Orientation', choices: [['auto', 'Automatic'], ['portrait', 'Portrait'], ['landscape', 'Landscape']] },
      { id: 'margin', type: 'select', label: 'Margins', choices: [['0', 'None'], ['20', 'Small'], ['40', 'Large']] }] },
    'text-to-pdf': { label: 'Text to PDF', out: 'PDF', accept: '.txt,.text,.md,.log,.csv,.json,.xml,.html,text/*', perFile: true, run: textToPdf, options: [
      OPT_SIZE, OPT_ORIENT, OPT_MARGIN,
      { id: 'font', type: 'select', label: 'Font', choices: [['sans', 'Sans-serif'], ['mono', 'Monospace']] },
      { id: 'fontSize', type: 'select', label: 'Font size', choices: [['11', '11 pt'], ['9', '9 pt'], ['10', '10 pt'], ['12', '12 pt'], ['14', '14 pt']] }] },
    'merge-pdf': { label: 'Merge PDF', out: 'PDF', accept: PDF_ACCEPT, perFile: false, sortable: true, run: mergePdf, options: [
      { id: 'name', type: 'text', label: 'Output file name', placeholder: 'merged' }] },
    'split-pdf': { label: 'Split PDF', out: 'PDF', accept: PDF_ACCEPT, perFile: true, run: splitPdf, options: [
      { id: 'mode', type: 'select', label: 'Split mode', choices: [['each', 'Every page into a separate PDF'], ['ranges', 'Custom ranges (one PDF per range)'], ['extract', 'Extract selected pages into one PDF']] },
      { id: 'pages', type: 'text', label: 'Pages / ranges', placeholder: 'e.g. 1-3, 4-6, 9', show: function (o) { return o.mode !== 'each'; } }] }
  };
  TOOLS['png-to-pdf'] = Object.assign({}, TOOLS['jpg-to-pdf'], { label: 'PNG to PDF' });
  TOOLS['image-to-pdf'] = Object.assign({}, TOOLS['jpg-to-pdf'], { label: 'Image to PDF' });

  /* Smart mode (home page): which tools fit a set of files */
  function suggestTools(files) {
    var kinds = {};
    files.forEach(function (f) {
      var e = ext(f.name);
      if (e === 'pdf' || f.type === 'application/pdf') kinds.pdf = (kinds.pdf || 0) + 1;
      else if (e === 'docx' || e === 'doc') kinds.word = 1;
      else if (/^(xlsx|xls|xlsm|ods|csv)$/.test(e)) kinds.excel = 1;
      else if (/^image\//.test(f.type) || /^(jpe?g|png|webp|gif|bmp|avif)$/.test(e)) kinds.image = 1;
      else if (/^text\//.test(f.type) || /^(txt|md|log|json|xml)$/.test(e)) kinds.text = 1;
    });
    var list = [];
    if (kinds.pdf) {
      list.push('pdf-to-word', 'pdf-to-excel', 'pdf-to-jpg', 'pdf-to-png', 'pdf-to-text');
      if (kinds.pdf > 1) list.unshift('merge-pdf');
      list.push('split-pdf');
      if (kinds.pdf === 1) list.push('merge-pdf');
    }
    if (kinds.word) list.push('word-to-pdf');
    if (kinds.excel) list.push('excel-to-pdf');
    if (kinds.image) list.push('image-to-pdf');
    if (kinds.text) list.push('text-to-pdf');
    return list;
  }
  function matches(tool, f) {
    var e = '.' + ext(f.name);
    return tool.accept.split(',').some(function (a) {
      a = a.trim().toLowerCase();
      if (a[0] === '.') return a === e;
      if (/\/\*$/.test(a)) return f.type.indexOf(a.slice(0, -1)) === 0;
      return a === f.type;
    });
  }

  /* ------------------------------------------------------------------ *
   * UI
   * ------------------------------------------------------------------ */
  var root = $('#converter');
  if (!root) return;

  var mode = root.getAttribute('data-tool');
  var state = { tool: mode === 'auto' ? null : mode, files: [], opts: {}, urls: [], busy: false };
  var el = {
    drop: $('.drop', root), input: $('.drop input', root), list: $('.files', root), choose: $('.choose', root),
    opts: $('.opts', root), go: $('.go', root), bar: $('.bar i', root), status: $('.status', root),
    prog: $('.progress', root), results: $('.results', root), err: $('.error', root), work: $('.work', root)
  };

  function tool() { return TOOLS[state.tool]; }

  function setAccept() {
    var t = tool();
    el.input.accept = t ? t.accept : '.pdf,.docx,.xlsx,.xls,.csv,.ods,.txt,.md,image/*';
    el.input.multiple = true;
  }

  function showError(msg) { el.err.textContent = msg; el.err.hidden = !msg; }

  function addFiles(list) {
    showError('');
    clearResults();
    var arr = Array.prototype.slice.call(list), rejected = [];
    arr.forEach(function (f) {
      if (state.tool && !matches(tool(), f)) { rejected.push(f.name); return; }
      if (f.size > 200 * 1048576) { rejected.push(f.name + ' (over 200 MB)'); return; }
      state.files.push(f);
    });
    if (rejected.length) showError('Skipped unsupported file(s): ' + rejected.join(', ') + (tool() ? '. This tool accepts ' + tool().accept.split(',').filter(function (a) { return a[0] === '.'; }).join(' ') + ' files.' : ''));
    render();
    prefetch();
  }

  function prefetch() {
    var t = state.tool;
    if (!t || !state.files.length) return;
    var need = /^pdf-to|split/.test(t) ? (t === 'pdf-to-word' ? ['pdfjs', 'docx'] : t === 'pdf-to-excel' ? ['pdfjs', 'xlsx'] : t === 'split-pdf' ? ['pdflib'] : ['pdfjs'])
      : t === 'merge-pdf' || /image|jpg|png/.test(t) ? ['pdflib']
      : t === 'word-to-pdf' ? ['mammoth', 'h2c', 'pdflib'] : t === 'excel-to-pdf' ? ['xlsx', 'h2c', 'pdflib'] : ['h2c', 'pdflib'];
    need.forEach(function (n) { load(n).catch(function () {}); });
  }

  function renderFiles() {
    el.list.innerHTML = '';
    var sortable = tool() && tool().sortable;
    state.files.forEach(function (f, i) {
      var li = document.createElement('li');
      li.draggable = !!sortable;
      li.dataset.i = i;
      li.innerHTML = '<span class="fi" aria-hidden="true">' + escapeHtml((ext(f.name) || 'file').slice(0, 4).toUpperCase()) + '</span>' +
        '<span class="fn"><b></b><small>' + fmtSize(f.size) + '</small></span>' +
        (sortable ? '<button type="button" class="ib" data-a="up" aria-label="Move up">↑</button><button type="button" class="ib" data-a="down" aria-label="Move down">↓</button>' : '') +
        '<button type="button" class="ib" data-a="del" aria-label="Remove file">✕</button>';
      $('b', li).textContent = f.name;
      el.list.appendChild(li);
    });
    el.list.hidden = !state.files.length;
  }

  function renderChoices() {
    if (mode !== 'auto') return;
    var sug = suggestTools(state.files);
    if (state.tool && sug.indexOf(state.tool) < 0) state.tool = null;
    if (!state.tool && sug.length) state.tool = sug[0];
    el.choose.innerHTML = sug.length ? '<p class="lbl">Convert to:</p>' : '';
    sug.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (id === state.tool ? ' on' : '');
      b.setAttribute('aria-pressed', id === state.tool);
      b.dataset.tool = id;
      b.textContent = TOOLS[id].label;
      el.choose.appendChild(b);
    });
    el.choose.hidden = !sug.length;
    if (state.files.length && !sug.length) showError('Unsupported file type. Add a PDF, Word (.docx), Excel, image or text file.');
  }

  function renderOptions() {
    var t = tool();
    el.opts.innerHTML = '';
    if (!t) { el.opts.hidden = true; return; }
    t.options.forEach(function (op) {
      if (!(op.id in state.opts)) state.opts[op.id] = op.type === 'check' ? !!op.def : op.type === 'select' ? op.choices[0][0] : '';
    });
    t.options.forEach(function (op) {
      if (op.show && !op.show(state.opts)) return;
      var id = 'o-' + op.id, w = document.createElement('div');
      w.className = 'opt' + (op.type === 'check' ? ' ck' : '');
      if (op.type === 'select') {
        w.innerHTML = '<label for="' + id + '">' + op.label + '</label><select id="' + id + '">' +
          op.choices.map(function (c) { return '<option value="' + c[0] + '"' + (state.opts[op.id] === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select>';
      } else if (op.type === 'check') {
        w.innerHTML = '<label><input type="checkbox" id="' + id + '"' + (state.opts[op.id] ? ' checked' : '') + '> ' + op.label + '</label>';
      } else {
        w.innerHTML = '<label for="' + id + '">' + op.label + '</label><input type="text" id="' + id + '" autocomplete="off" placeholder="' + escapeHtml(op.placeholder || '') + '">';
        $('input', w).value = state.opts[op.id] || '';
      }
      var input = $('select,input', w);
      input.dataset.opt = op.id;
      el.opts.appendChild(w);
    });
    el.opts.hidden = !state.files.length;
  }

  function render() {
    renderChoices();
    renderFiles();
    renderOptions();
    setAccept();
    var t = tool();
    el.go.hidden = !state.files.length || !t;
    el.go.disabled = state.busy;
    if (t) el.go.textContent = state.busy ? 'Converting…' : (t.label.indexOf('to') > 0 ? 'Convert to ' + t.out : t.label) + ' →';
    root.classList.toggle('has-files', state.files.length > 0);
  }

  function clearResults() {
    state.urls.forEach(function (u) { URL.revokeObjectURL(u); });
    state.urls = [];
    el.results.innerHTML = '';
    el.results.hidden = true;
  }

  function download(blob, name) {
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 30000);
  }

  function showResults(outputs, notes) {
    clearResults();
    var total = outputs.reduce(function (s, o) { return s + o.blob.size; }, 0);
    var h = '<div class="done"><span class="ok" aria-hidden="true">✓</span><div><h3>Your file' + (outputs.length > 1 ? 's are' : ' is') + ' ready!</h3><p>' +
      outputs.length + ' file' + (outputs.length > 1 ? 's' : '') + ' · ' + fmtSize(total) + '</p></div></div>';
    if (notes.length) h += '<p class="note">' + notes.map(escapeHtml).join('<br>') + '</p>';
    el.results.innerHTML = h;
    var actions = document.createElement('div');
    actions.className = 'actions';
    if (outputs.length > 1) {
      var zipBtn = document.createElement('button');
      zipBtn.type = 'button'; zipBtn.className = 'btn primary'; zipBtn.textContent = '⬇ Download all (ZIP)';
      zipBtn.onclick = function () {
        zipBtn.disabled = true; zipBtn.textContent = 'Preparing ZIP…';
        load('jszip').then(function (Z) {
          var z = new Z(), used = {};
          outputs.forEach(function (o) { var n = o.name; while (used[n]) n = n.replace(/(\.[^.]+)$/, '-1$1'); used[n] = 1; z.file(n, o.blob); });
          return z.generateAsync({ type: 'blob' });
        }).then(function (b) { download(b, 'converted-files.zip'); }).catch(function (e) { showError(e.message); })
          .then(function () { zipBtn.disabled = false; zipBtn.textContent = '⬇ Download all (ZIP)'; });
      };
      actions.appendChild(zipBtn);
    }
    var again = document.createElement('button');
    again.type = 'button'; again.className = 'btn ghost'; again.textContent = '↺ Convert another file';
    again.onclick = function () { state.files = []; clearResults(); render(); el.drop.focus(); };
    el.results.appendChild(actions);
    var ul = document.createElement('ul');
    ul.className = 'outs';
    outputs.forEach(function (o) {
      var u = URL.createObjectURL(o.blob);
      state.urls.push(u);
      var li = document.createElement('li');
      li.innerHTML = (o.preview ? '<img alt="" loading="lazy">' : '<span class="fi" aria-hidden="true">' + escapeHtml(ext(o.name).toUpperCase()) + '</span>') +
        '<span class="fn"><b></b><small>' + fmtSize(o.blob.size) + '</small></span><a class="btn primary sm" download>⬇ Download</a>';
      $('b', li).textContent = o.name;
      if (o.preview) $('img', li).src = u;
      var a = $('a', li); a.href = u; a.download = o.name;
      ul.appendChild(li);
    });
    el.results.appendChild(ul);
    actions.appendChild(again);
    el.results.hidden = false;
    el.results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (outputs.length === 1) $('a', ul).focus({ preventScroll: true });
  }

  async function convert() {
    var t = tool();
    if (!t || !state.files.length || state.busy) return;
    var files = state.files.filter(function (f) { return matches(t, f); });
    if (!files.length) return showError('None of the added files can be used with ' + t.label + '.');
    state.busy = true; showError(''); clearResults(); render();
    el.prog.hidden = false;
    var notes = [], started = performance.now();
    var outputs = [];
    try {
      var jobs = t.perFile ? files.map(function (f) { return [f]; }) : [files];
      for (var j = 0; j < jobs.length; j++) {
        var ctx = {
          progress: function (frac, msg) {
            var p = (j + Math.min(1, Math.max(0, frac))) / jobs.length;
            el.bar.style.width = Math.round(5 + p * 95) + '%';
            el.status.textContent = (jobs.length > 1 ? '[' + (j + 1) + '/' + jobs.length + '] ' : '') + msg;
          },
          note: function (m) { notes.push(m); }
        };
        ctx.progress(0, 'Starting…');
        await tick();
        var res = await t.run(t.perFile ? jobs[j][0] : jobs[j], Object.assign({}, state.opts), ctx);
        outputs = outputs.concat(res);
      }
      el.bar.style.width = '100%';
      notes.push('Done in ' + ((performance.now() - started) / 1000).toFixed(1) + 's — processed privately on your device.');
      showResults(outputs, notes);
      if (window.gtag) window.gtag('event', 'convert', { tool: state.tool, files: files.length });
    } catch (e) {
      console.error(e);
      showError(e && e.message ? e.message : 'Something went wrong. Please try again.');
    } finally {
      state.busy = false;
      el.prog.hidden = true;
      el.bar.style.width = '0';
      render();
    }
  }

  // Events
  el.drop.addEventListener('click', function (e) { if (e.target !== el.input) el.input.click(); });
  el.drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.input.click(); } });
  el.input.addEventListener('change', function () { addFiles(el.input.files); el.input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    root.addEventListener(ev, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) { e.preventDefault(); el.drop.classList.add('over'); } });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    root.addEventListener(ev, function (e) { if (ev === 'dragleave' && root.contains(e.relatedTarget)) return; el.drop.classList.remove('over'); });
  });
  root.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); }
  });
  document.addEventListener('paste', function (e) {
    var fs = e.clipboardData && e.clipboardData.files;
    if (fs && fs.length) addFiles(fs);
  });
  el.list.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var i = +b.closest('li').dataset.i, f = state.files;
    if (b.dataset.a === 'del') f.splice(i, 1);
    else if (b.dataset.a === 'up' && i > 0) f.splice(i - 1, 0, f.splice(i, 1)[0]);
    else if (b.dataset.a === 'down' && i < f.length - 1) f.splice(i + 1, 0, f.splice(i, 1)[0]);
    clearResults(); render();
  });
  var dragI = null;
  el.list.addEventListener('dragstart', function (e) { var li = e.target.closest('li'); if (li) { dragI = +li.dataset.i; e.dataTransfer.effectAllowed = 'move'; } });
  el.list.addEventListener('dragover', function (e) { if (dragI !== null) e.preventDefault(); });
  el.list.addEventListener('drop', function (e) {
    var li = e.target.closest('li');
    if (dragI === null || !li) return;
    e.preventDefault(); e.stopPropagation();
    var to = +li.dataset.i;
    state.files.splice(to, 0, state.files.splice(dragI, 1)[0]);
    dragI = null; clearResults(); render();
  });
  el.list.addEventListener('dragend', function () { dragI = null; });
  el.choose.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tool]'); if (!b) return;
    state.tool = b.dataset.tool; state.opts = {}; clearResults(); render(); prefetch();
  });
  el.opts.addEventListener('change', function (e) {
    var id = e.target.dataset.opt; if (!id) return;
    state.opts[id] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (e.target.tagName === 'SELECT') renderOptions();
  });
  el.opts.addEventListener('input', function (e) { var id = e.target.dataset.opt; if (id && e.target.type === 'text') state.opts[id] = e.target.value; });
  el.go.addEventListener('click', convert);

  render();

  // Expose for automated tests / power users.
  window.PDFTools = { TOOLS: TOOLS, parseRanges: parseRanges, load: load };
})();
