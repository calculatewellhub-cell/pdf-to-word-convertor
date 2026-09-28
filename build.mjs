// Static site generator: `node build.mjs`
// Generates SEO-optimised HTML pages, sitemap.xml, robots.txt, llms.txt and manifest.
// Configure your domain with SITE_URL, e.g.  SITE_URL=https://pdf.example.com node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { TOOLS, NAV, HOME } from './tools.mjs';

const CONFIG = {
  url: (process.env.SITE_URL || 'https://calculatewellhub-cell.github.io/pdf-to-word-convertor').replace(/\/$/, ''),
  name: 'WellHub PDF',
  tagline: 'Free Online PDF Converter',
  lang: 'en',
  gaId: process.env.GA_ID || '',            // optional Google Analytics 4 ID (G-XXXX)
  gscVerify: process.env.GSC_VERIFY || '',  // optional Google Search Console token
  updated: process.env.UPDATED || new Date().toISOString().slice(0, 10)
};

const CSS = readFileSync('assets/css/style.css', 'utf8').replace(/\n/g, '');
const bySlug = Object.fromEntries(TOOLS.map(t => [t.slug, t]));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = s => String(s).replace(/<[^>]+>/g, '');
const abs = path => CONFIG.url + '/' + path;
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const nice = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e5322d"/><stop offset="1" stop-color="#ff6b3d"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#lg)"/><path d="M10 7h8l5 5v13a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" fill="#fff"/><path d="M18 7v5h5" fill="#ffd4c7"/><path d="M12 17h8M12 20h8M12 23h5" stroke="#e5322d" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function head({ title, desc, path, image, root, extraLd = [] }) {
  const url = abs(path);
  return `<!doctype html>
<html lang="${CONFIG.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="theme-color" content="#e5322d">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${CONFIG.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${abs(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${abs(image)}">
${CONFIG.gscVerify ? `<meta name="google-site-verification" content="${esc(CONFIG.gscVerify)}">\n` : ''}<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
<link rel="manifest" href="${root}site.webmanifest">
<link rel="preload" href="${root}assets/js/app.js" as="script">
<style>${CSS}</style>
${extraLd.map(ld).join('\n')}
${CONFIG.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${CONFIG.gaId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${CONFIG.gaId}');</script>` : ''}
</head>`;
}

function header(root, current) {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="logo" href="${root}" aria-label="${CONFIG.name} home">${LOGO}<span>WellHub <em>PDF</em></span></a>
<nav class="main" aria-label="Main">${NAV.map(s => `<a href="${root}${s}/"${s === current ? ' aria-current="page"' : ''}>${bySlug[s].name}</a>`).join('')}</nav>
</div></header>`;
}

function footer(root) {
  const toPdf = TOOLS.filter(t => t.to === 'PDF' || t.slug === 'merge-pdf' || t.slug === 'split-pdf');
  const fromPdf = TOOLS.filter(t => !toPdf.includes(t));
  const list = arr => `<ul>${arr.map(t => `<li><a href="${root}${t.slug}/">${t.name}</a></li>`).join('')}</ul>`;
  return `<footer><div class="wrap">
<div class="cols">
<div><a class="logo" href="${root}">${LOGO}<span>WellHub <em>PDF</em></span></a><p style="color:var(--mut)">Free, fast and private PDF tools that run entirely in your browser. No uploads, no signup, no watermarks.</p></div>
<div><h2>Convert from PDF</h2>${list(fromPdf)}</div>
<div><h2>Convert to PDF &amp; organise</h2>${list(toPdf)}</div>
<div><h2>Company</h2><ul><li><a href="${root}about/">About</a></li><li><a href="${root}privacy-policy/">Privacy Policy</a></li><li><a href="${root}sitemap.xml">Sitemap</a></li></ul></div>
</div>
<p class="copy">© ${new Date().getFullYear()} ${CONFIG.name}. All conversions happen locally on your device.</p>
</div></footer>`;
}

function converter(tool) {
  const t = bySlug[tool];
  const label = t ? (t.from === 'PDF' || t.slug === 'merge-pdf' || t.slug === 'split-pdf' ? 'PDF' : t.from) : '';
  const btn = t ? `Choose ${label} file${t.slug === 'split-pdf' ? '' : 's'}` : 'Choose files';
  const hint = t ? 'or drag &amp; drop here · paste with Ctrl+V' : 'PDF, Word, Excel, JPG, PNG or TXT · drag &amp; drop or paste';
  return `<div id="converter" data-tool="${tool}">
<div class="drop" role="button" tabindex="0" aria-label="${btn}">
<input type="file" multiple aria-hidden="true" tabindex="-1">
<span class="big"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>${btn}</span>
<p>${hint}</p>
</div>
<div class="choose" hidden></div>
<ul class="files" hidden></ul>
<div class="opts" hidden></div>
<div class="error" role="alert" hidden></div>
<button type="button" class="go" hidden>Convert</button>
<div class="progress" hidden><div class="bar"><i></i></div><p class="status" aria-live="polite"></p></div>
<div class="results" hidden></div>
</div>
<p class="privacy">🔒 100% private: files are processed on your device and never uploaded to any server.</p>`;
}

function tabs(root, current) {
  return `<nav class="tabs" aria-label="All PDF tools">${current === 'auto' ? `<a class="chip" aria-current="page" href="${root}">All-in-one</a>` : `<a class="chip" href="${root}">All-in-one</a>`}${TOOLS.map(t => `<a class="chip" href="${root}${t.slug}/"${t.slug === current ? ' aria-current="page"' : ''}>${t.name}</a>`).join('')}</nav>`;
}

function toolCards(root, slugs) {
  return `<div class="grid">${slugs.map(s => { const t = bySlug[s]; return `<a class="card tool-card" href="${root}${s}/"><span class="fi" aria-hidden="true">${t.icon}</span><span><h3>${t.name}</h3><p>${t.card}</p></span></a>`; }).join('')}</div>`;
}

function faqHtml(faqs) {
  return `<div class="faq">${faqs.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}</div>`;
}

const ORG = { '@type': 'Organization', '@id': CONFIG.url + '/#org', name: CONFIG.name, url: CONFIG.url + '/', logo: abs('apple-touch-icon.png') };
const SITE = { '@type': 'WebSite', '@id': CONFIG.url + '/#website', name: CONFIG.name, url: CONFIG.url + '/', publisher: { '@id': ORG['@id'] }, inLanguage: 'en' };

function write(path, html) {
  const file = path ? path + 'index.html' : 'index.html';
  if (path) mkdirSync(path, { recursive: true });
  writeFileSync(file, html.replace(/\n{2,}/g, '\n'));
}

/* ---------------- Tool pages ---------------- */
for (const t of TOOLS) {
  const root = '../', path = t.slug + '/';
  const url = abs(path);
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      ORG, SITE,
      { '@type': 'WebPage', '@id': url + '#webpage', url, name: t.title, description: t.desc, isPartOf: { '@id': SITE['@id'] }, dateModified: CONFIG.updated, inLanguage: 'en', primaryImageOfPage: abs(`assets/og/${t.slug}.png`), breadcrumb: { '@id': url + '#breadcrumb' } },
      { '@type': 'WebApplication', '@id': url + '#app', name: `${t.name} Converter – ${CONFIG.name}`, url, description: t.desc, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (Windows, macOS, Linux, Android, iOS)', browserRequirements: 'Requires JavaScript and a modern browser', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, featureList: t.features.map(f => f[0]), publisher: { '@id': ORG['@id'] } },
      { '@type': 'HowTo', name: `How to convert ${t.from} to ${t.to}`.replace('PDFs to one PDF', 'merge PDF files').replace('PDF to parts', 'split a PDF'), description: strip(t.answer), totalTime: 'PT1M', tool: { '@type': 'HowToTool', name: `${CONFIG.name} ${t.name}` }, step: t.steps.map(([n, d], i) => ({ '@type': 'HowToStep', position: i + 1, name: n, text: d, url: url + '#how-to' })) },
      { '@type': 'FAQPage', '@id': url + '#faq', mainEntity: t.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) },
      { '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'PDF Tools', item: CONFIG.url + '/' }, { '@type': 'ListItem', position: 2, name: t.name, item: url }] }
    ]
  };
  const html = `${head({ title: t.title, desc: t.desc, path, image: `assets/og/${t.slug}.png`, root, extraLd: [graph] })}
<body data-root="${root}">
${header(root, t.slug)}
<main id="main" class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${root}">PDF Tools</a></li><li aria-current="page">${t.name}</li></ol></nav>
<div class="hero">
<h1>${t.h1}</h1>
<p class="sub">${t.sub}</p>
<ul class="badges"><li>Free forever</li><li>No signup</li><li>No watermark</li><li>Files stay on your device</li></ul>
</div>
${converter(t.slug)}
${tabs(root, t.slug)}
<section id="answer" aria-labelledby="qa"><h2 id="qa">How to convert ${t.slug === 'merge-pdf' ? 'multiple PDFs into one' : t.slug === 'split-pdf' ? 'a PDF into separate files' : `${t.from} to ${t.to}`} — quick answer</h2><div class="answer"><p>${t.answer}</p></div></section>
<section id="how-to" aria-labelledby="h-steps"><h2 id="h-steps">${t.name} in 3 easy steps</h2><ol class="steps">${t.steps.map(([n, d]) => `<li><h3>${n}</h3><p>${d}</p></li>`).join('')}</ol></section>
<section aria-labelledby="h-feat"><h2 id="h-feat">Why use our ${t.name} ${t.slug.includes('-to-') ? 'converter' : 'tool'}?</h2><div class="grid">${t.features.map(([n, d]) => `<div class="card"><h3>${n}</h3><p>${d}</p></div>`).join('')}</div></section>
<section class="prose" aria-labelledby="h-guide"><h2 id="h-guide">${t.name}: everything you need to know</h2>${t.guide}<p class="updated">Last updated: <time datetime="${CONFIG.updated}">${nice(CONFIG.updated)}</time> · Reviewed by the ${CONFIG.name} team</p></section>
<section aria-labelledby="h-faq"><h2 id="h-faq">${t.name} — frequently asked questions</h2>${faqHtml(t.faqs)}</section>
<section aria-labelledby="h-rel"><h2 id="h-rel">Related PDF tools</h2>${toolCards(root, t.related)}</section>
</main>
${footer(root)}
<script src="${root}assets/js/app.js" defer></script>
</body>
</html>`;
  write(path, html);
}

/* ---------------- Home page (all-in-one) ---------------- */
{
  const root = './';
  const { title, desc, faqs: homeFaqs } = HOME;
  const all = TOOLS.map(t => t.slug);
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      ORG, SITE,
      { '@type': 'WebPage', '@id': CONFIG.url + '/#webpage', url: CONFIG.url + '/', name: title, description: desc, isPartOf: { '@id': SITE['@id'] }, dateModified: CONFIG.updated, inLanguage: 'en', about: { '@id': CONFIG.url + '/#app' } },
      { '@type': 'WebApplication', '@id': CONFIG.url + '/#app', name: `${CONFIG.name} – All-in-one PDF Converter`, url: CONFIG.url + '/', description: desc, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (Windows, macOS, Linux, Android, iOS)', browserRequirements: 'Requires JavaScript and a modern browser', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, featureList: TOOLS.map(t => t.name), publisher: { '@id': ORG['@id'] } },
      { '@type': 'ItemList', name: 'PDF tools', itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: abs(t.slug + '/') })) },
      { '@type': 'FAQPage', '@id': CONFIG.url + '/#faq', mainEntity: homeFaqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
    ]
  };
  const cmp = [
    ['Files uploaded to servers', 'Never — processed on your device', 'Usually yes'],
    ['Price', 'Free, unlimited', 'Free tier with limits'],
    ['Watermark', 'None', 'Often added'],
    ['Signup / email', 'Not required', 'Often required'],
    ['Tools', '12 tools in one place', 'Spread across sites'],
    ['Speed', 'Instant — no upload/download wait', 'Depends on your internet']
  ];
  const html = `${head({ title, desc, path: '', image: 'assets/og/home.png', root, extraLd: [graph] })}
<body data-root="${root}">
${header(root, '')}
<main id="main" class="wrap">
<div class="hero">
<h1>Free <span>PDF Converter</span> — All Tools in One</h1>
<p class="sub">Convert PDF to Word, Excel, JPG &amp; Text — or Word, Excel, images &amp; text to PDF. Merge and split PDFs. Fast, free and 100% private.</p>
<ul class="badges"><li>12 tools in one</li><li>No signup</li><li>No watermark</li><li>Files never uploaded</li></ul>
</div>
${converter('auto')}
${tabs(root, 'auto')}
<section aria-labelledby="h-conv"><h2 id="h-conv">Convert from PDF</h2>${toolCards(root, ['pdf-to-word', 'pdf-to-excel', 'pdf-to-jpg', 'pdf-to-png', 'pdf-to-text'])}</section>
<section aria-labelledby="h-to"><h2 id="h-to">Convert to PDF &amp; organise PDFs</h2>${toolCards(root, ['word-to-pdf', 'excel-to-pdf', 'jpg-to-pdf', 'png-to-pdf', 'text-to-pdf', 'merge-pdf', 'split-pdf'])}</section>
<section id="answer" aria-labelledby="qa"><h2 id="qa">How does this all-in-one PDF converter work?</h2><div class="answer"><p>Drop any file into the box above — a PDF, Word document, Excel sheet, image or text file. The converter detects the file type and shows every available conversion (for a PDF: Word, Excel, JPG, PNG, Text, Split or Merge). Pick one, click <b>Convert</b> and download the result. All processing runs inside your browser with open-source engines, so your files are never uploaded and results appear in seconds.</p></div></section>
<section id="how-to" aria-labelledby="h-steps"><h2 id="h-steps">Convert any file in 3 steps</h2><ol class="steps"><li><h3>Add your file</h3><p>Click “Choose files”, drag &amp; drop, or paste. PDF, DOCX, XLSX, CSV, JPG, PNG and TXT are supported.</p></li><li><h3>Pick the output</h3><p>Choose Word, Excel, JPG, PNG, Text or PDF — or merge and split PDFs.</p></li><li><h3>Download</h3><p>Get your converted file instantly. Multiple results can be downloaded as one ZIP.</p></li></ol></section>
<section aria-labelledby="h-cmp"><h2 id="h-cmp">${CONFIG.name} vs typical online converters</h2><div class="tbl"><table class="cmp"><thead><tr><th scope="col">Feature</th><th scope="col">${CONFIG.name}</th><th scope="col">Typical online converters</th></tr></thead><tbody>${cmp.map(r => `<tr><th scope="row">${r[0]}</th><td>✅ ${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div></section>
<section class="prose" aria-labelledby="h-about"><h2 id="h-about">A private PDF converter that works in your browser</h2>
<p>Most online PDF converters upload your documents to a remote server, process them there and ask you to download the result. That is slow on mobile data and risky for confidential files such as bank statements, contracts, ID cards and medical reports.</p>
<p>${CONFIG.name} takes a different approach: it uses battle-tested open-source engines (Mozilla's pdf.js, pdf-lib, SheetJS and docx) directly on your device. Your files never travel across the internet, conversions start instantly, and the tools keep working even on slow connections once the page has loaded.</p>
<p class="updated">Last updated: <time datetime="${CONFIG.updated}">${nice(CONFIG.updated)}</time></p></section>
<section aria-labelledby="h-faq"><h2 id="h-faq">Frequently asked questions</h2>${faqHtml(homeFaqs)}</section>
</main>
${footer(root)}
<script src="${root}assets/js/app.js" defer></script>
</body>
</html>`;
  write('', html);
}

/* ---------------- Simple content pages ---------------- */
function simplePage(slug, title, desc, h1, body) {
  const root = '../';
  const html = `${head({ title, desc, path: slug + '/', image: 'assets/og/home.png', root, extraLd: [{ '@context': 'https://schema.org', '@graph': [ORG, SITE, { '@type': 'WebPage', url: abs(slug + '/'), name: title, description: desc, isPartOf: { '@id': SITE['@id'] }, dateModified: CONFIG.updated }] }] })}
<body data-root="${root}">
${header(root, '')}
<main id="main" class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${root}">PDF Tools</a></li><li aria-current="page">${h1}</li></ol></nav>
<section class="prose" style="margin-top:24px"><h1>${h1}</h1>${body}<p class="updated">Last updated: ${nice(CONFIG.updated)}</p></section>
<section aria-labelledby="h-rel"><h2 id="h-rel">Popular tools</h2>${toolCards(root, ['pdf-to-word', 'pdf-to-excel', 'merge-pdf', 'jpg-to-pdf'])}</section>
</main>
${footer(root)}
</body>
</html>`;
  write(slug + '/', html);
}

simplePage('privacy-policy', `Privacy Policy – ${CONFIG.name}`, `${CONFIG.name} privacy policy: your files are processed locally in your browser and are never uploaded, stored or shared.`, 'Privacy Policy', `
<p><strong>Short version: we never see your files.</strong> Every conversion on ${CONFIG.name} — PDF to Word, PDF to Excel, merging, splitting and all other tools — runs locally in your web browser using JavaScript. Your documents are not uploaded to our servers or to any third party.</p>
<h2>Files</h2><p>Files you select are read into your browser's memory only for the duration of the conversion. Results are created on your device and downloaded directly. Closing the tab removes them from memory.</p>
<h2>Analytics</h2><p>We may use privacy-friendly analytics to count page visits and which tools are used. Analytics never receive file names or file contents.</p>
<h2>Cookies</h2><p>The tools themselves do not require cookies. If analytics are enabled, they may set cookies according to their own policies.</p>
<h2>Contact</h2><p>Questions about privacy? Contact the site owner through the details on the About page.</p>`);

simplePage('about', `About ${CONFIG.name} – Free Private PDF Tools`, `${CONFIG.name} offers 12 free PDF tools that run fully in your browser: PDF to Word, Excel, JPG, merge and split PDF, and more.`, `About ${CONFIG.name}`, `
<p>${CONFIG.name} is a free collection of PDF tools built for speed and privacy. We believe converting a document should not require creating an account, waiting for uploads, or trusting a stranger's server with your data.</p>
<h2>How it works</h2><p>All tools run inside your browser using well-known open-source libraries: <strong>pdf.js</strong> (Mozilla) to read and render PDFs, <strong>pdf-lib</strong> to create, merge and split PDFs, <strong>docx</strong> to build Word files, <strong>SheetJS</strong> for Excel, <strong>mammoth</strong> to read Word documents and <strong>html2canvas</strong> for high-fidelity rendering.</p>
<h2>Our tools</h2><ul>${TOOLS.map(t => `<li><a href="../${t.slug}/">${t.name}</a> — ${t.card}</li>`).join('')}</ul>`);

/* ---------------- 404 ---------------- */
writeFileSync('404.html', `${head({ title: `Page not found – ${CONFIG.name}`, desc: 'The page you are looking for does not exist.', path: '404.html', image: 'assets/og/home.png', root: CONFIG.url + '/' }).replace('index,follow', 'noindex')}
<body data-root="${CONFIG.url}/">
${header(CONFIG.url + '/', '')}
<main id="main" class="wrap"><div class="hero"><h1>Page not <span>found</span></h1><p class="sub">Try one of our free PDF tools instead.</p></div>${toolCards(CONFIG.url + '/', TOOLS.map(t => t.slug))}</main>
${footer(CONFIG.url + '/')}
</body></html>`);

/* ---------------- sitemap, robots, llms.txt, manifest ---------------- */
const urls = ['', ...TOOLS.map(t => t.slug + '/'), 'about/', 'privacy-policy/'];
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(u => {
  const t = bySlug[u.replace('/', '')];
  return `<url><loc>${abs(u)}</loc><lastmod>${CONFIG.updated}</lastmod><changefreq>${u === '' ? 'weekly' : 'monthly'}</changefreq><priority>${u === '' ? '1.0' : t ? '0.9' : '0.3'}</priority>${t || u === '' ? `<image:image><image:loc>${abs(`assets/og/${t ? t.slug : 'home'}.png`)}</image:loc></image:image>` : ''}</url>`;
}).join('\n')}
</urlset>
`);

writeFileSync('robots.txt', `User-agent: *
Allow: /

# AI assistants & answer engines are welcome
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /

Sitemap: ${abs('sitemap.xml')}
`);

writeFileSync('llms.txt', `# ${CONFIG.name}

> ${CONFIG.name} (${CONFIG.url}/) is a free, all-in-one online PDF converter with 12 tools. Every conversion runs locally in the user's web browser — files are never uploaded — with no signup, no watermark and no daily limits.

## Tools
${TOOLS.map(t => `- [${t.name}](${abs(t.slug + '/')}): ${strip(t.desc)}`).join('\n')}

## Key facts
- Price: free, unlimited.
- Privacy: files are processed on-device using pdf.js, pdf-lib, SheetJS, docx and mammoth; nothing is uploaded.
- Platforms: any modern browser on Windows, macOS, Linux, Android and iOS.
- Supported inputs: PDF, DOCX, XLSX, XLS, ODS, CSV, JPG, PNG, WEBP, GIF, BMP, TXT, MD.
- Supported outputs: DOCX, XLSX, CSV, JPG, PNG, TXT, PDF, ZIP.

## Optional
- [About](${abs('about/')})
- [Privacy Policy](${abs('privacy-policy/')})
`);

writeFileSync('site.webmanifest', JSON.stringify({
  name: `${CONFIG.name} – ${CONFIG.tagline}`, short_name: CONFIG.name, start_url: './', scope: './', display: 'standalone',
  background_color: '#ffffff', theme_color: '#e5322d', description: 'Free private PDF converter: PDF to Word, Excel, JPG, merge & split PDF.',
  icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
}, null, 2));

writeFileSync('favicon.svg', LOGO.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(' aria-hidden="true"', ''));
writeFileSync('.nojekyll', '');

console.log(`Built ${urls.length} pages for ${CONFIG.url}`);
