/*!
 * CWH PDF -> Word layout engine.
 * Rebuilds real Word structure from a PDF page: tables (with merged cells,
 * cell shading and borders), paragraphs, tab-aligned lines, underlines,
 * shaded bars, page borders, headers/footers with page-number fields and
 * pictures. One layout model is rendered to DOCX (docx library) or to a
 * Word 97-2003 compatible .doc (RTF).
 */
(function () {
  'use strict';

  /* ---------------- geometry helpers ---------------- */
  function mul(m, n) {
    return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  }
  function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hex(c) { return c.slice(0, 3).map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join('').toUpperCase(); }
  function isInk(c) { return c[0] + c[1] + c[2] < 3 * 235; }
  function isWhite(c) { return c[0] > 248 && c[1] > 248 && c[2] > 248; }
  function median(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); return s[s.length >> 1]; }

  /* ---------------- vector graphics from the operator list ---------------- */
  function graphics(opList, OPS, vpT) {
    var fnA = opList.fnArray, argA = opList.argsArray;
    var ctm = [1, 0, 0, 1, 0, 0], stack = [], fill = [0, 0, 0], stroke = [0, 0, 0], lw = 1;
    var path = [], segs = [], fills = [], images = [];
    function M() { return mul(vpT, ctm); }
    function T(x, y) { return apply(M(), x, y); }
    function scale() { var m = M(); return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1; }
    function seg(a, b, w, c) { segs.push({ x1: Math.min(a[0], b[0]), y1: Math.min(a[1], b[1]), x2: Math.max(a[0], b[0]), y2: Math.max(a[1], b[1]), w: w, color: c }); }
    function save() { stack.push([ctm, fill, stroke, lw]); }
    function restore() { if (stack.length) { var s = stack.pop(); ctm = s[0]; fill = s[1]; stroke = s[2]; lw = s[3]; } }
    function paint(doFill, doStroke) {
      var sw = Math.max(0.25, lw * scale());
      path.forEach(function (p) {
        if (p.rect) {
          var r = p.rect;
          if (doFill) fills.push({ x0: r[0], y0: r[1], x1: r[2], y1: r[3], color: fill.slice() });
          if (doStroke) {
            var c = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
            for (var k = 0; k < 4; k++) seg(c[k], c[(k + 1) % 4], sw, stroke.slice());
          }
          return;
        }
        if (p.pts.length < 2) return;
        if (doStroke) {
          for (var i = 1; i < p.pts.length; i++) seg(p.pts[i - 1], p.pts[i], sw, stroke.slice());
          if (p.closed) seg(p.pts[p.pts.length - 1], p.pts[0], sw, stroke.slice());
        }
        if (doFill && !p.curve) {
          var xs = p.pts.map(function (q) { return q[0]; }), ys = p.pts.map(function (q) { return q[1]; });
          var bb = [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)];
          var axis = p.pts.every(function (q) {
            return (Math.abs(q[0] - bb[0]) < 0.8 || Math.abs(q[0] - bb[2]) < 0.8) && (Math.abs(q[1] - bb[1]) < 0.8 || Math.abs(q[1] - bb[3]) < 0.8);
          });
          if (axis) fills.push({ x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3], color: fill.slice() });
        }
      });
      path = [];
    }
    for (var i = 0; i < fnA.length; i++) {
      var fn = fnA[i], a = argA[i];
      switch (fn) {
        case OPS.save: save(); break;
        case OPS.restore: restore(); break;
        case OPS.transform: ctm = mul(ctm, a); break;
        case OPS.setLineWidth: lw = a[0]; break;
        case OPS.setFillRGBColor: fill = [a[0], a[1], a[2]]; break;
        case OPS.setStrokeRGBColor: stroke = [a[0], a[1], a[2]]; break;
        case OPS.paintFormXObjectBegin: save(); if (a && a[0]) ctm = mul(ctm, a[0]); break;
        case OPS.paintFormXObjectEnd: restore(); break;
        case OPS.constructPath: {
          var ops = a[0], c = a[1], j = 0, cur = null;
          for (var k = 0; k < ops.length; k++) {
            switch (ops[k]) {
              case OPS.rectangle: {
                var x = c[j++], y = c[j++], w = c[j++], h = c[j++];
                var q = [T(x, y), T(x + w, y), T(x + w, y + h), T(x, y + h)];
                var X = q.map(function (p) { return p[0]; }), Y = q.map(function (p) { return p[1]; });
                path.push({ rect: [Math.min.apply(null, X), Math.min.apply(null, Y), Math.max.apply(null, X), Math.max.apply(null, Y)] });
                cur = null;
                break;
              }
              case OPS.moveTo: cur = { pts: [T(c[j], c[j + 1])] }; path.push(cur); j += 2; break;
              case OPS.lineTo: if (!cur) { cur = { pts: [] }; path.push(cur); } cur.pts.push(T(c[j], c[j + 1])); j += 2; break;
              case OPS.curveTo: if (cur) { cur.curve = true; cur.pts.push(T(c[j + 4], c[j + 5])); } j += 6; break;
              case OPS.curveTo2: case OPS.curveTo3: if (cur) { cur.curve = true; cur.pts.push(T(c[j + 2], c[j + 3])); } j += 4; break;
              case OPS.closePath: if (cur) cur.closed = true; break;
            }
          }
          break;
        }
        case OPS.fill: case OPS.eoFill: paint(true, false); break;
        case OPS.stroke: case OPS.closeStroke: paint(false, true); break;
        case OPS.fillStroke: case OPS.eoFillStroke: case OPS.closeFillStroke: case OPS.closeEOFillStroke: paint(true, true); break;
        case OPS.endPath: path = []; break;
        case OPS.paintImageXObject: case OPS.paintInlineImageXObject: case OPS.paintJpegXObject: {
          var cs = [T(0, 0), T(1, 0), T(1, 1), T(0, 1)];
          var IX = cs.map(function (p) { return p[0]; }), IY = cs.map(function (p) { return p[1]; });
          images.push({ x0: Math.min.apply(null, IX), y0: Math.min.apply(null, IY), x1: Math.max.apply(null, IX), y1: Math.max.apply(null, IY) });
          break;
        }
      }
    }
    return { segs: segs, fills: fills, images: images };
  }

  /* ---------------- rules, shading, tables ---------------- */
  function classify(g, W, H) {
    var hs = [], vs = [], shades = [];
    g.segs.forEach(function (s) {
      if (!isInk(s.color)) return;
      var dx = s.x2 - s.x1, dy = s.y2 - s.y1;
      if (dy < 1.2 && dx > 2) hs.push({ y: (s.y1 + s.y2) / 2, x1: s.x1, x2: s.x2, w: s.w, color: s.color });
      else if (dx < 1.2 && dy > 2) vs.push({ x: (s.x1 + s.x2) / 2, y1: s.y1, y2: s.y2, w: s.w, color: s.color });
    });
    g.fills.forEach(function (f) {
      var w = f.x1 - f.x0, h = f.y1 - f.y0;
      if (w < 0.1 || h < 0.1) return;
      if (h <= 2.5 && w > 2) { if (isInk(f.color)) hs.push({ y: (f.y0 + f.y1) / 2, x1: f.x0, x2: f.x1, w: h, color: f.color }); }
      else if (w <= 2.5 && h > 2) { if (isInk(f.color)) vs.push({ x: (f.x0 + f.x1) / 2, y1: f.y0, y2: f.y1, w: w, color: f.color }); }
      else if (!isWhite(f.color) && !(w > W * 0.95 && h > H * 0.95)) shades.push(f);
    });
    return { H: mergeRules(hs, 'y', 'x1', 'x2'), V: mergeRules(vs, 'x', 'y1', 'y2'), shades: shades };
  }
  function mergeRules(list, pos, a, b) {
    list.sort(function (p, q) { return p[pos] - q[pos] || p[a] - q[a]; });
    var out = [];
    list.forEach(function (s) {
      var last = out[out.length - 1];
      if (last && Math.abs(last[pos] - s[pos]) < 1 && s[a] <= last[b] + 1.5) { last[b] = Math.max(last[b], s[b]); last.w = Math.max(last.w, s.w); }
      else out.push(Object.assign({}, s));
    });
    return out;
  }
  function cluster(vals, tol) {
    vals = vals.slice().sort(function (p, q) { return p - q; });
    var out = [], grp = [];
    vals.forEach(function (v) {
      if (grp.length && v - grp[grp.length - 1] > tol) { out.push(grp.reduce(function (s, x) { return s + x; }, 0) / grp.length); grp = []; }
      grp.push(v);
    });
    if (grp.length) out.push(grp.reduce(function (s, x) { return s + x; }, 0) / grp.length);
    return out;
  }

  function detectTables(L, W, H) {
    var all = L.H.map(function (h) { return { t: 'h', s: h }; }).concat(L.V.map(function (v) { return { t: 'v', s: v }; }));
    var parent = all.map(function (_, i) { return i; });
    function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
    for (var i = 0; i < all.length; i++) {
      if (all[i].t !== 'h') continue;
      var h = all[i].s;
      for (var j = 0; j < all.length; j++) {
        if (all[j].t !== 'v') continue;
        var v = all[j].s;
        if (v.x >= h.x1 - 2 && v.x <= h.x2 + 2 && h.y >= v.y1 - 2 && h.y <= v.y2 + 2) parent[find(i)] = find(j);
      }
    }
    var groups = {};
    all.forEach(function (e, i) { var r = find(i); (groups[r] = groups[r] || []).push(e); });
    var tables = [], border = null, used = new Set();
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      var hs = g.filter(function (e) { return e.t === 'h'; }).map(function (e) { return e.s; });
      var vs = g.filter(function (e) { return e.t === 'v'; }).map(function (e) { return e.s; });
      if (hs.length < 2 || vs.length < 2) return;
      var xs = cluster(vs.map(function (v) { return v.x; }), 2.5), ys = cluster(hs.map(function (h) { return h.y; }), 2.5);
      if (xs.length < 2 || ys.length < 2) return;
      hs.forEach(function (s) { used.add(s); });
      var R = ys.length - 1, C = xs.length - 1;
      var bw = xs[C] - xs[0], bh = ys[R] - ys[0];
      if (R === 1 && C === 1 && bw > W * 0.6 && bh > H * 0.5) {
        border = { x0: xs[0], y0: ys[0], x1: xs[C], y1: ys[R], w: median(hs.map(function (s) { return s.w; })), color: hs[0].color };
        return;
      }
      function hasV(x, ya, yb) { var m = (ya + yb) / 2; return vs.some(function (v) { return Math.abs(v.x - x) < 2.5 && v.y1 <= m + 0.5 && v.y2 >= m - 0.5; }); }
      function hasH(y, xa, xb) { var m = (xa + xb) / 2; return hs.some(function (h) { return Math.abs(h.y - y) < 2.5 && h.x1 <= m + 0.5 && h.x2 >= m - 0.5; }); }
      var map = [], regions = [];
      for (var r = 0; r < R; r++) map.push(new Array(C));
      for (r = 0; r < R; r++) {
        for (var c = 0; c < C; c++) {
          if (map[r][c]) continue;
          var cs = 1, rs = 1;
          while (c + cs < C && !map[r][c + cs] && !hasV(xs[c + cs], ys[r], ys[r + 1])) cs++;
          while (r + rs < R && !hasH(ys[r + rs], xs[c], xs[c + cs])) {
            var free = true;
            for (var q = c; q < c + cs; q++) if (map[r + rs][q]) free = false;
            if (!free) break;
            rs++;
          }
          var reg = { r: r, c: c, rs: rs, cs: cs, x0: xs[c], x1: xs[c + cs], y0: ys[r], y1: ys[r + rs], items: [] };
          var mid = function (a, b) { return (a + b) / 2; };
          var edge = function (list, test) { var s = list.filter(test)[0]; return s ? { w: s.w, color: s.color } : null; };
          reg.bT = edge(hs, function (h) { var m = mid(reg.x0, reg.x1); return Math.abs(h.y - reg.y0) < 2.5 && h.x1 <= m + 0.5 && h.x2 >= m - 0.5; });
          reg.bB = edge(hs, function (h) { var m = mid(reg.x0, reg.x1); return Math.abs(h.y - reg.y1) < 2.5 && h.x1 <= m + 0.5 && h.x2 >= m - 0.5; });
          reg.bL = edge(vs, function (v) { var m = mid(reg.y0, reg.y1); return Math.abs(v.x - reg.x0) < 2.5 && v.y1 <= m + 0.5 && v.y2 >= m - 0.5; });
          reg.bR = edge(vs, function (v) { var m = mid(reg.y0, reg.y1); return Math.abs(v.x - reg.x1) < 2.5 && v.y1 <= m + 0.5 && v.y2 >= m - 0.5; });
          for (var y = r; y < r + rs; y++) for (var x = c; x < c + cs; x++) map[y][x] = reg;
          regions.push(reg);
        }
      }
      tables.push({ xs: xs, ys: ys, R: R, C: C, map: map, regions: regions, x0: xs[0], x1: xs[C], y0: ys[0], y1: ys[R] });
    });
    tables.sort(function (a, b) { return a.y0 - b.y0; });
    var free = L.H.filter(function (h) { return !used.has(h); });
    return { tables: tables, border: border, freeH: free };
  }
  function locate(t, x, y) {
    var r = -1, c = -1;
    for (var i = 0; i < t.R; i++) if (y >= t.ys[i] - 0.5 && y < t.ys[i + 1] + 0.5) { r = i; break; }
    for (var j = 0; j < t.C; j++) if (x >= t.xs[j] - 0.5 && x < t.xs[j + 1] + 0.5) { c = j; break; }
    return r < 0 || c < 0 ? null : t.map[r][c];
  }

  /* ---------------- paragraphs ---------------- */
  var BULLET = /^\s*([•●○◦▪■□►▸\-–—*]|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)]|[ivxIVX]{1,4}[.)]|Q\.?\s*\d+)\s/;
  function top(l) { return l.y - l.size * 0.95; }
  function bot(l) { return l.y + l.size * 0.3; }
  function copyRuns(runs) { return runs.map(function (r) { return Object.assign({}, r); }); }

  // Groups visual lines into paragraphs inside the box [left, right].
  function linesToParas(lines, left, right, inCell) {
    var paras = [], cur = null, prev = null, width = right - left;
    var ratios = [];
    for (var q = 1; q < lines.length; q++) {
      var d = lines[q].y - lines[q - 1].y, sz = lines[q].size;
      if (Math.abs(sz - lines[q - 1].size) < 1 && d >= sz * 0.95 && d <= sz * 1.75) ratios.push(d / sz);
    }
    var ratio = ratios.length ? clamp(median(ratios), 1.0, 1.6) : 1.22;
    function full(l) { var lg = l.x - left, rg = right - l.end; return inCell ? lg <= 4 && rg <= 4 : lg <= 8 && rg <= 8; }
    function centered(l) {
      var lg = l.x - left, rg = right - l.end;
      return inCell ? lg > 4 && rg > 4 && Math.abs(lg - rg) < Math.max(3, width * 0.08) : lg > 8 && rg > 8 && Math.abs(lg - rg) < Math.max(6, width * 0.03);
    }
    var wrapZone = inCell ? Math.min(40, width * 0.35) : 0;
    lines.forEach(function (line) {
      var gap = prev ? line.y - prev.y : 0;
      var zone = inCell ? wrapZone : line.size * 8;
      var cont = cur && Math.abs(line.size - prev.size) < 1 && gap > 0 && gap < line.size * 1.75 &&
        line.x < cur.x + line.size * 2.5 && line.x > cur.x - line.size * 3 &&
        !BULLET.test(line.text) && line.text.indexOf('\t') < 0 && prev.text.indexOf('\t') < 0 &&
        prev.end > right - zone && !prev.hr;
      if (cont) {
        var last = cur.runs[cur.runs.length - 1];
        if (last && !last.tab && /[a-z]-$/.test(last.text) && /^[a-z]/.test(line.text)) last.text = last.text.slice(0, -1);
        else if (last && !last.tab && !/\s$/.test(last.text)) last.text += ' ';
        cur.runs = cur.runs.concat(copyRuns(line.runs));
        cur.ends.push(line.end);
        cur.lines++;
        cur.end = Math.max(cur.end, line.end);
        cur.bottom = bot(line);
        cur.ul = cur.ul && line.ul;
        cur.ctr = cur.ctr && (centered(line) || full(line));
        cur.ctrAny = cur.ctrAny || centered(line);
        cur.x = Math.min(cur.x, line.x);
      } else {
        cur = {
          x: line.x, end: line.end, size: line.size, runs: copyRuns(line.runs), lines: 1, ends: [line.end],
          top: top(line), bottom: bot(line), before: prev ? Math.max(0, gap - 0.25 * prev.size * ratio - 0.8 * line.size * ratio) : 0,
          tabs: line.tabs, shade: line.shade, ul: line.ul, y: line.y, ctr: centered(line) || full(line), ctrAny: centered(line)
        };
        paras.push(cur);
      }
      prev = line;
    });
    return paras.map(function (p) {
      var indent = Math.max(0, p.x - left), align = 'left';
      var mid = (left + right) / 2;
      if (p.ctr && p.ctrAny && !(p.tabs && p.tabs.length)) { align = 'center'; indent = 0; }
      else if (p.lines === 1 && p.x > mid && Math.abs(p.end - right) < (inCell ? 6 : 12) && !(p.tabs && p.tabs.length)) { align = 'right'; indent = 0; }
      else if (p.lines > 1 && p.ends.slice(0, -1).every(function (e) { return e > right - 4; })) align = 'both';
      var tabs = [];
      if (p.tabs && p.tabs.length) {
        p.tabs.forEach(function (t, i) {
          var isLast = i === p.tabs.length - 1;
          if (isLast && p.end > right - 15 && t.x > mid) tabs.push({ type: 'right', pos: right - left });
          else tabs.push({ type: 'left', pos: Math.max(0, t.x - left) });
        });
      }
      if (p.ul) p.runs.forEach(function (r) { if (!r.tab) r.underline = true; });
      return {
        type: 'p', runs: p.runs, align: align, indent: align === 'left' || align === 'both' ? indent : 0,
        before: clamp(p.before, 0, 60), size: p.size, top: p.top, bottom: p.bottom, tabs: tabs, shade: p.shade, line: p.size * ratio
      };
    });
  }

  /* ---------------- page model ---------------- */
  // utils: { getItems(page) -> {items, opList, vp}, groupLines(items), renderPage(page, scale), canvasBlob }
  async function buildPage(page, lib, utils) {
    var got = await utils.getItems(page);
    var vp = got.vp, W = vp.width, H = vp.height;
    var g = graphics(got.opList, lib.OPS, vp.transform);
    var L = classify(g, W, H);
    var det = detectTables(L, W, H);
    var tables = det.tables;
    tables.forEach(function (t) { t.shades = L.shades; });

    // Pictures (logos, photos): skip tiny ones and full-page backgrounds.
    var pics = g.images.filter(function (im) {
      var w = im.x1 - im.x0, h = im.y1 - im.y0;
      return w > 12 && h > 12 && !(w > W * 0.85 && h > H * 0.85);
    });

    var flow = [];
    got.items.forEach(function (it) {
      var cx = it.x + it.w / 2, cy = it.y - it.size * 0.3;
      for (var i = 0; i < tables.length; i++) {
        var t = tables[i];
        if (cx >= t.x0 - 1 && cx <= t.x1 + 1 && cy >= t.y0 - 1 && cy <= t.y1 + 1) {
          var reg = locate(t, cx, cy);
          if (reg) { reg.items.push(it); return; }
        }
      }
      flow.push(it);
    });
    if (!got.items.length) return null;

    var lines = utils.groupLines(flow);
    // underlines and horizontal rules
    var hrs = [];
    det.freeH.forEach(function (h) {
      var hit = lines.filter(function (l) {
        var ov = Math.min(h.x2, l.end) - Math.max(h.x1, l.x);
        return h.y >= l.y - 1 && h.y <= l.y + l.size * 0.45 && ov > (l.end - l.x) * 0.5;
      })[0];
      if (hit) hit.ul = true;
      else if (h.x2 - h.x1 > W * 0.35) hrs.push(h);
    });
    // shaded bars behind lines
    lines.forEach(function (l) {
      var cx = (l.x + l.end) / 2, cy = l.y - l.size * 0.3;
      var s = L.shades.filter(function (f) { return cx >= f.x0 && cx <= f.x1 && cy >= f.y0 && cy <= f.y1; })[0];
      if (s) l.shade = hex(s.color);
    });

    // header / footer bands
    var body = [], header = [], footer = [];
    var tTop = tables.length ? tables[0].y0 : Infinity, tBot = tables.length ? tables[tables.length - 1].y1 : -Infinity;
    lines.forEach(function (l) {
      if (l.y > H * 0.925 && l.y > tBot) footer.push(l);
      else if (l.y < H * 0.055 && l.y < tTop) header.push(l);
      else body.push(l);
    });

    // margins from body content
    var lefts = body.map(function (l) { return l.x; }).concat(tables.map(function (t) { return t.x0; }), pics.map(function (p) { return p.x0; }));
    var rights = body.map(function (l) { return l.end; }).concat(tables.map(function (t) { return t.x1; }), pics.map(function (p) { return p.x1; }));
    var tops = body.map(top).concat(tables.map(function (t) { return t.y0; }), pics.map(function (p) { return p.y0; }));
    var bots = body.map(bot).concat(tables.map(function (t) { return t.y1; }), pics.map(function (p) { return p.y1; }));
    if (!lefts.length) { lefts = [72]; rights = [W - 72]; tops = [72]; bots = [H - 72]; }
    var mL = clamp(Math.min.apply(null, lefts), 14, 108), mR = clamp(W - Math.max.apply(null, rights), 14, 108);
    var mT = clamp(Math.min.apply(null, tops) - 2, 14, 144), mB = clamp(H - Math.max.apply(null, bots) - 8, 14, 72);
    var right = W - mR;

    // events in reading order
    var events = body.map(function (l) { return { y: top(l), line: l }; })
      .concat(tables.map(function (t) { return { y: t.y0, table: t }; }))
      .concat(hrs.map(function (h) { return { y: h.y, hr: h }; }))
      .concat(pics.map(function (p) { return { y: p.y0, pic: p }; }));
    events.sort(function (a, b) { return a.y - b.y; });

    var blocks = [], group = [], prevBottom = null;
    function flush() {
      if (!group.length) return;
      var ps = linesToParas(group, mL, right, false);
      if (ps.length) ps[0].before = prevBottom === null ? 0 : clamp(ps[0].top - prevBottom, 0, 60);
      ps.forEach(function (p) { blocks.push(p); });
      prevBottom = ps[ps.length - 1].bottom;
      group = [];
    }
    var canvas = null;
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      if (ev.line) { group.push(ev.line); continue; }
      flush();
      var gap = prevBottom === null ? 0 : Math.max(0, ev.y - prevBottom);
      if (ev.table) {
        blocks.push({ type: 'table', t: tableModel(ev.table, utils, mL), gap: gap });
        prevBottom = ev.table.y1;
      } else if (ev.hr) {
        blocks.push({ type: 'hr', before: clamp(gap, 0, 40), w: ev.hr.w, color: hex(ev.hr.color) });
        prevBottom = ev.hr.y;
      } else if (ev.pic) {
        if (!canvas) canvas = await utils.renderPage(page, 2);
        var p = ev.pic, k = canvas.width / W;
        var sx = Math.max(0, Math.floor(p.x0 * k)), sy = Math.max(0, Math.floor(p.y0 * k));
        var sw = Math.min(canvas.width - sx, Math.ceil((p.x1 - p.x0) * k)), sh = Math.min(canvas.height - sy, Math.ceil((p.y1 - p.y0) * k));
        if (sw > 2 && sh > 2) {
          var cut = document.createElement('canvas');
          cut.width = sw; cut.height = sh;
          cut.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
          var data = new Uint8Array(await (await utils.canvasBlob(cut, 'image/jpeg', 0.9)).arrayBuffer());
          var cx = (p.x0 + p.x1) / 2, mid = (mL + right) / 2;
          blocks.push({ type: 'img', data: data, w: p.x1 - p.x0, h: p.y1 - p.y0, px: [sw, sh], before: clamp(gap, 0, 60),
            align: Math.abs(cx - mid) < 12 ? 'center' : 'left', indent: Math.max(0, p.x0 - mL) });
        }
        prevBottom = p.y1;
      }
    }
    flush();
    if (canvas) canvas.width = canvas.height = 0;

    var model = {
      w: W, h: H, margins: { top: mT, bottom: mB, left: mL, right: mR, header: 20, footer: 20 },
      blocks: blocks,
      header: header.length ? linesToParas(header, mL, right, false) : null,
      footer: footer.length ? linesToParas(footer, mL, right, false) : null
    };
    if (header.length) model.margins.header = clamp(top(header[0]), 8, mT - 4);
    if (footer.length) model.margins.footer = clamp(H - bot(footer[footer.length - 1]), 8, 72);
    if (model.footer) model.footer.forEach(pageFields);
    if (model.header) model.header.forEach(pageFields);
    if (det.border) {
      var b = det.border, d = { top: b.y0, left: b.x0, bottom: H - b.y1, right: W - b.x1 };
      var fromPage = d.top <= 31 && d.left <= 31 && d.bottom <= 31 && d.right <= 31;
      model.border = {
        fromPage: fromPage, size: clamp(b.w, 0.25, 6), color: hex(b.color),
        space: fromPage ? d : { top: clamp(mT - d.top, 0, 31), left: clamp(mL - d.left, 0, 31), bottom: clamp(mB - d.bottom, 0, 31), right: clamp(mR - d.right, 0, 31) }
      };
    }
    return model;
  }

  // "Page 3 of 6" -> live PAGE / NUMPAGES fields
  function pageFields(p) {
    var out = [], seenPage = false;
    p.runs.forEach(function (r) {
      if (r.tab) return out.push(r);
      var m = /^(.*?Page\s+)(\d+)(\s+of\s+)(\d+)(.*)$/i.exec(r.text);
      if (m) {
        [m[1], { field: 'page', text: m[2] }, m[3], { field: 'pages', text: m[4] }, m[5]].forEach(function (x) {
          if (typeof x === 'string') { if (x) out.push(Object.assign({}, r, { text: x })); } else out.push(Object.assign({}, r, x));
        });
        return;
      }
      var prevText = out.map(function (o) { return o.text || ''; }).join('');
      var num = /^(\s*)(\d+)(\s*)$/.exec(r.text), kind = null;
      if (num && /Page\s*$/i.test(prevText)) kind = 'page';
      else if (num && seenPage && /of\s*$/i.test(prevText)) kind = 'pages';
      if (kind) {
        if (num[1]) out.push(Object.assign({}, r, { text: num[1] }));
        out.push(Object.assign({}, r, { field: kind, text: num[2] }));
        if (num[3]) out.push(Object.assign({}, r, { text: num[3] }));
        if (kind === 'page') seenPage = true;
        return;
      }
      out.push(r);
    });
    p.runs = out;
  }

  function tableModel(t, utils, mL) {
    var cols = [];
    for (var c = 0; c < t.C; c++) cols.push(t.xs[c + 1] - t.xs[c]);
    var rows = [];
    for (var r = 0; r < t.R; r++) rows.push({ h: t.ys[r + 1] - t.ys[r], cells: [] });
    t.regions.forEach(function (reg) {
      var pad = 1.5;
      var lines = reg.items.length ? utils.groupLines(reg.items) : [];
      var paras = lines.length ? linesToParas(lines, reg.x0 + pad, reg.x1 - pad, true) : [];
      paras.forEach(function (p) { p.before = Math.min(p.before, 6); });
      var valign = 'top';
      if (lines.length) {
        var tg = top(lines[0]) - reg.y0, bg = reg.y1 - bot(lines[lines.length - 1]);
        if (tg >= 5 && Math.abs(tg - bg) < 4) valign = 'center';
        else if (tg >= 5 && bg < tg - 4) valign = 'bottom';
      }
      var shade = null;
      if (t.shades) {
        var cx = (reg.x0 + reg.x1) / 2, cy = (reg.y0 + reg.y1) / 2;
        var s = t.shades.filter(function (f) { return cx >= f.x0 && cx <= f.x1 && cy >= f.y0 && cy <= f.y1; })[0];
        if (s) shade = hex(s.color);
      }
      function bd(e) { return e ? { size: clamp(e.w, 0.25, 3), color: hex(e.color) } : null; }
      rows[reg.r].cells.push({
        c: reg.c, cs: reg.cs, rs: reg.rs, paras: paras, valign: valign, shade: shade,
        borders: { top: bd(reg.bT), bottom: bd(reg.bB), left: bd(reg.bL), right: bd(reg.bR) }
      });
    });
    rows.forEach(function (row) { row.cells.sort(function (a, b) { return a.c - b.c; }); });
    return { indent: t.x0 - mL, cols: cols, rows: rows, R: t.R, C: t.C };
  }

  /* ---------------- DOCX renderer ---------------- */
  function toDocx(D, pages, meta) {
    var tw = function (pt) { return Math.round(pt * 20); };
    var AL = { left: D.AlignmentType.LEFT, center: D.AlignmentType.CENTER, right: D.AlignmentType.RIGHT, both: D.AlignmentType.JUSTIFIED };
    function runs(p) {
      return p.runs.map(function (r) {
        if (r.tab) return new D.TextRun({ children: [new D.Tab()] });
        var o = { bold: r.bold || undefined, italics: r.italic || undefined, size: Math.max(8, Math.round(r.size * 2)), font: r.family || undefined, underline: r.underline ? {} : undefined };
        if (r.field === 'page') o.children = [D.PageNumber.CURRENT];
        else if (r.field === 'pages') o.children = [D.PageNumber.TOTAL_PAGES];
        else o.text = r.text;
        return new D.TextRun(o);
      });
    }
    function para(p, inCell) {
      return new D.Paragraph({
        alignment: AL[p.align] || undefined,
        indent: p.indent ? { left: tw(p.indent) } : undefined,
        spacing: p.line ? { before: tw(p.before || 0), after: 0, line: tw(p.line), lineRule: D.LineRuleType.AT_LEAST } : { before: tw(p.before || 0), after: 0 },
        tabStops: p.tabs && p.tabs.length ? p.tabs.map(function (t) { return { type: t.type === 'right' ? D.TabStopType.RIGHT : D.TabStopType.LEFT, position: tw(t.pos) }; }) : undefined,
        shading: p.shade ? { type: D.ShadingType.CLEAR, color: 'auto', fill: p.shade } : undefined,
        children: runs(p)
      });
    }
    function spacer(pt) {
      return new D.Paragraph({ spacing: { before: 0, after: 0, line: Math.max(20, tw(pt)), lineRule: D.LineRuleType.EXACT }, children: [new D.TextRun({ text: '', size: 2 })] });
    }
    function border(b) { return b ? { style: D.BorderStyle.SINGLE, size: Math.max(2, Math.round(b.size * 8)), color: b.color } : { style: D.BorderStyle.NIL, size: 0, color: 'FFFFFF' }; }
    function table(m) {
      var total = m.cols.reduce(function (s, x) { return s + x; }, 0);
      return new D.Table({
        width: { size: tw(total), type: D.WidthType.DXA },
        columnWidths: m.cols.map(tw),
        layout: D.TableLayoutType.FIXED,
        indent: m.indent ? { size: tw(m.indent), type: D.WidthType.DXA } : undefined,
        borders: D.TableBorders ? D.TableBorders.NONE : undefined,
        rows: m.rows.map(function (row) {
          return new D.TableRow({
            cantSplit: true,
            height: { value: tw(Math.max(6, row.h - 0.5)), rule: D.HeightRule.ATLEAST },
            children: row.cells.map(function (c) {
              var w = 0;
              for (var i = c.c; i < c.c + c.cs; i++) w += m.cols[i];
              return new D.TableCell({
                width: { size: tw(w), type: D.WidthType.DXA },
                columnSpan: c.cs > 1 ? c.cs : undefined,
                rowSpan: c.rs > 1 ? c.rs : undefined,
                verticalAlign: c.valign === 'center' ? D.VerticalAlign.CENTER : c.valign === 'bottom' ? D.VerticalAlign.BOTTOM : D.VerticalAlign.TOP,
                shading: c.shade ? { type: D.ShadingType.CLEAR, color: 'auto', fill: c.shade } : undefined,
                margins: { top: 0, bottom: 0, left: 29, right: 29 },
                borders: { top: border(c.borders.top), bottom: border(c.borders.bottom), left: border(c.borders.left), right: border(c.borders.right) },
                children: c.paras.length ? c.paras.map(function (p) { return para(p, true); }) : [new D.Paragraph({ children: [] })]
              });
            })
          });
        })
      });
    }
    function image(b) {
      var k = 96 / 72;
      return new D.Paragraph({
        alignment: AL[b.align], indent: b.indent && b.align === 'left' ? { left: tw(b.indent) } : undefined,
        spacing: { before: tw(b.before || 0), after: 0 },
        children: [new D.ImageRun({ data: b.data, type: 'jpg', transformation: { width: Math.round(b.w * k), height: Math.round(b.h * k) } })]
      });
    }
    function hr(b) {
      return new D.Paragraph({ spacing: { before: tw(b.before || 0), after: 60 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: Math.max(4, Math.round(b.w * 8)), color: b.color, space: 1 } }, children: [] });
    }
    var sections = pages.map(function (pg) {
      var W = tw(pg.w), Hh = tw(pg.h);
      var size = W > Hh ? { width: Hh, height: W, orientation: D.PageOrientation.LANDSCAPE } : { width: W, height: Hh };
      if (pg.full) {
        var kk = 96 / 72 * 0.985;
        return {
          properties: { page: { size: size, margin: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0 } } },
          children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new D.ImageRun({ data: pg.full, type: 'jpg', transformation: { width: Math.round(pg.w * kk), height: Math.round(pg.h * kk) } })] })]
        };
      }
      var m = pg.margins, kids = [], lastWasTable = false;
      pg.blocks.forEach(function (b, i) {
        if (b.type === 'table') {
          if (lastWasTable || (i > 0 && b.gap > 1)) kids.push(spacer(Math.max(1, b.gap)));
          kids.push(table(b.t));
          lastWasTable = true;
          return;
        }
        lastWasTable = false;
        if (b.type === 'p') kids.push(para(b));
        else if (b.type === 'img') kids.push(image(b));
        else if (b.type === 'hr') kids.push(hr(b));
      });
      if (lastWasTable || !kids.length) kids.push(spacer(1));
      var props = { page: { size: size, margin: { top: tw(m.top), bottom: tw(m.bottom), left: tw(m.left), right: tw(m.right), header: tw(m.header), footer: tw(m.footer) } } };
      if (pg.border) {
        var bb = pg.border, side = function (s) { return { style: D.BorderStyle.SINGLE, size: Math.max(2, Math.round(bb.size * 8)), color: bb.color, space: Math.round(s) }; };
        props.page.borders = {
          pageBorders: { display: D.PageBorderDisplay.ALL_PAGES, offsetFrom: bb.fromPage ? D.PageBorderOffsetFrom.PAGE : D.PageBorderOffsetFrom.TEXT },
          pageBorderTop: side(bb.space.top), pageBorderBottom: side(bb.space.bottom), pageBorderLeft: side(bb.space.left), pageBorderRight: side(bb.space.right)
        };
      }
      var sec = { properties: props, children: kids };
      if (pg.header) sec.headers = { default: new D.Header({ children: pg.header.map(function (p) { return para(p); }) }) };
      sec.footers = { default: new D.Footer({ children: pg.footer ? pg.footer.map(function (p) { return para(p); }) : [new D.Paragraph({ children: [] })] }) };
      return sec;
    });
    return new D.Document({
      creator: meta.creator || 'PDF Converter', title: meta.title || '',
      styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
      sections: sections
    });
  }

  /* ---------------- DOC (Word 97-2003 compatible, RTF) renderer ---------------- */
  function toRtf(pages) {
    var fonts = ['Calibri'], colors = [];
    function fi(n) { n = n || 'Calibri'; var i = fonts.indexOf(n); if (i < 0) { fonts.push(n); i = fonts.length - 1; } return i; }
    function ci(h) { h = (h || '000000').toUpperCase(); var i = colors.indexOf(h); if (i < 0) { colors.push(h); i = colors.length - 1; } return i + 1; }
    function tw(pt) { return Math.round(pt * 20); }
    function esc(s) {
      var o = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s.charCodeAt(i);
        if (ch === 92 || ch === 123 || ch === 125) o += '\\' + s[i];
        else if (ch === 9) o += '\\tab ';
        else if (ch === 10 || ch === 13) o += '\\line ';
        else if (ch < 128) o += s[i];
        else o += '\\u' + (ch > 32767 ? ch - 65536 : ch) + '?';
      }
      return o;
    }
    function run(r) {
      if (r.tab) return '\\tab ';
      var f = '\\f' + fi(r.family) + '\\fs' + Math.max(8, Math.round(r.size * 2)) + (r.bold ? '\\b' : '') + (r.italic ? '\\i' : '') + (r.underline ? '\\ul' : '');
      if (r.field) return '{' + f + '{\\field{\\*\\fldinst{' + f + ' ' + (r.field === 'page' ? 'PAGE' : 'NUMPAGES') + '}}{\\fldrslt{' + f + ' ' + esc(r.text) + '}}}}';
      return '{' + f + ' ' + esc(r.text) + '}';
    }
    function pprops(p, inCell) {
      var s = '\\pard\\plain' + (inCell ? '\\intbl' : '') + ({ center: '\\qc', right: '\\qr', both: '\\qj' }[p.align] || '\\ql');
      if (p.indent) s += '\\li' + tw(p.indent);
      s += '\\sb' + tw(p.before || 0) + '\\sa0' + (p.line ? '\\sl' + tw(p.line) + '\\slmult0' : '');
      (p.tabs || []).forEach(function (t) { s += (t.type === 'right' ? '\\tqr' : '') + '\\tx' + tw(t.pos); });
      if (p.shade) s += '\\cbpat' + ci(p.shade);
      return s + ' ';
    }
    function para(p, inCell, end) { return pprops(p, inCell) + p.runs.map(run).join('') + (end || '\\par') + '\n'; }
    function brd(tag, b) { return b ? '\\clbrdr' + tag + '\\brdrs\\brdrw' + clamp(Math.round(b.size * 20), 2, 75) + '\\brdrcf' + ci(b.color) : ''; }
    function table(m) {
      var out = '', left = tw(m.indent), R = m.rows.length;
      var starts = {}; // "r,c" -> cell for regions starting there
      m.rows.forEach(function (row, r) { row.cells.forEach(function (c) { starts[r + ',' + c.c] = c; }); });
      var cover = []; // cover[r][c] -> origin cell
      for (var r = 0; r < R; r++) cover.push([]);
      m.rows.forEach(function (row, r) { row.cells.forEach(function (c) { for (var y = r; y < r + c.rs; y++) for (var x = c.c; x < c.c + c.cs; x++) cover[y][x] = { cell: c, r0: r }; }); });
      for (r = 0; r < R; r++) {
        var defs = '\\trowd\\trgaph29\\trleft' + left + '\\trrh' + tw(Math.max(6, m.rows[r].h - 0.5)) + '\\trkeep', body = '', x = left;
        for (var c = 0; c < m.C;) {
          var cv = cover[r][c];
          if (!cv) { x += tw(m.cols[c]); defs += '\\cellx' + x; body += '\\pard\\intbl\\cell\n'; c++; continue; }
          var cell = cv.cell, w = 0;
          for (var i = cell.c; i < cell.c + cell.cs; i++) w += m.cols[i];
          x += tw(w);
          var first = cv.r0 === r;
          defs += (cell.rs > 1 ? (first ? '\\clvmgf' : '\\clvmrg') : '') +
            ({ center: '\\clvertalc', bottom: '\\clvertalb' }[cell.valign] || '\\clvertalt') +
            brd('t', cell.borders.top) + brd('l', cell.borders.left) + brd('b', cell.borders.bottom) + brd('r', cell.borders.right) +
            (cell.shade ? '\\clcbpat' + ci(cell.shade) : '') + '\\cellx' + x;
          if (first && cell.paras.length) body += cell.paras.map(function (p, k) { return para(p, true, k === cell.paras.length - 1 ? '\\cell' : '\\par'); }).join('');
          else body += '\\pard\\intbl\\cell\n';
          c += cell.cs;
        }
        out += defs + '\n' + body + '\\row\n';
      }
      return out;
    }
    function pict(data, wpt, hpt, px) {
      var h = '';
      for (var i = 0; i < data.length; i++) h += (data[i] < 16 ? '0' : '') + data[i].toString(16);
      return '{\\pict\\jpegblip\\picw' + px[0] + '\\pich' + px[1] + '\\picwgoal' + tw(wpt) + '\\pichgoal' + tw(hpt) + '\n' + h.replace(/(.{128})/g, '$1\n') + '}';
    }
    var body = '';
    pages.forEach(function (pg, idx) {
      var land = pg.w > pg.h;
      var m = pg.full ? { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } : pg.margins;
      body += (idx ? '\\sect' : '') + '\\sectd\\sbkpage\\pgwsxn' + tw(pg.w) + '\\pghsxn' + tw(pg.h) + (land ? '\\lndscpsxn' : '') +
        '\\marglsxn' + tw(m.left) + '\\margrsxn' + tw(m.right) + '\\margtsxn' + tw(m.top) + '\\margbsxn' + tw(m.bottom) +
        '\\headery' + tw(m.header) + '\\footery' + tw(m.footer);
      if (pg.border) {
        var b = pg.border, bw = clamp(Math.round(b.size * 20), 2, 75);
        body += '\\pgbrdropt' + (b.fromPage ? 32 : 0);
        [['t', 'top'], ['b', 'bottom'], ['l', 'left'], ['r', 'right']].forEach(function (s) {
          body += '\\pgbrdr' + s[0] + '\\brdrs\\brdrw' + bw + '\\brdrcf' + ci(b.color) + '\\brsp' + Math.round(b.space[s[1]]);
        });
      }
      body += '\n';
      if (pg.header) body += '{\\header ' + pg.header.map(function (p) { return para(p); }).join('') + '}\n';
      if (pg.footer) body += '{\\footer ' + pg.footer.map(function (p) { return para(p); }).join('') + '}\n';
      if (pg.full) { body += '\\pard\\plain\\qc ' + pict(pg.full, pg.w * 0.985, pg.h * 0.985, pg.px) + '\\par\n'; return; }
      var lastTable = false;
      pg.blocks.forEach(function (b, i) {
        if (b.type === 'table') {
          if (lastTable || (i > 0 && b.gap > 1)) body += '\\pard\\plain\\sl-' + Math.max(20, tw(b.gap)) + '\\slmult0{\\fs2 }\\par\n';
          body += table(b.t);
          lastTable = true;
          return;
        }
        lastTable = false;
        if (b.type === 'p') body += para(b);
        else if (b.type === 'img') body += '\\pard\\plain' + (b.align === 'center' ? '\\qc' : '\\ql') + (b.indent && b.align === 'left' ? '\\li' + tw(b.indent) : '') + '\\sb' + tw(b.before || 0) + ' ' + pict(b.data, b.w, b.h, b.px) + '\\par\n';
        else if (b.type === 'hr') body += '\\pard\\plain\\sb' + tw(b.before || 0) + '\\brdrb\\brdrs\\brdrw' + clamp(Math.round(b.w * 20), 2, 75) + '\\brdrcf' + ci(b.color) + '\\brsp20 \\par\n';
      });
      if (lastTable || !pg.blocks.length) body += '\\pard\\plain\\sl-20\\slmult0{\\fs2 }\\par\n';
    });
    var head = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1\\deflang1033\n{\\fonttbl' + fonts.map(function (f, i) { return '{\\f' + i + '\\fnil\\fcharset0 ' + f + ';}'; }).join('') + '}\n' +
      '{\\colortbl;' + colors.map(function (h) { return '\\red' + parseInt(h.slice(0, 2), 16) + '\\green' + parseInt(h.slice(2, 4), 16) + '\\blue' + parseInt(h.slice(4, 6), 16) + ';'; }).join('') + '}\n' +
      '\\viewkind1\\fet0\n';
    return head + body + '}';
  }

  window.CWHPdf2Word = { buildPage: buildPage, toDocx: toDocx, toRtf: toRtf, _internal: { graphics: graphics, classify: classify, detectTables: detectTables } };
})();
