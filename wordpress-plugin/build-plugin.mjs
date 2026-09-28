// Builds the WordPress plugin zip and the Gutenberg content for every page.
// Run from the repo root:  node wordpress-plugin/build-plugin.mjs
//   -> wordpress-plugin/dist/cwh-pdf-tools.zip   (upload in WP Admin → Plugins → Add New → Upload)
//   -> wordpress-plugin/pages/*.html + pages.json (page content, one per tool)
import { writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { TOOLS, HOME } from '../tools.mjs';

const BASE = '/pdf-tools/';                 // must match cwh_pdf_base() in the plugin
const P = 'wordpress-plugin/';
const PLUGIN = P + 'cwh-pdf-tools/';

/* ---------- plugin files ---------- */
const howto = t => t.slug === 'merge-pdf' ? 'How to merge PDF files' : t.slug === 'split-pdf' ? 'How to split a PDF' : `How to convert ${t.from} to ${t.to}`;
writeFileSync(PLUGIN + 'tools.json', JSON.stringify({
  home: { title: HOME.title, desc: HOME.desc, faqs: HOME.faqs },
  tools: TOOLS.map(t => ({
    slug: t.slug, name: t.name, icon: t.icon, from: t.from, to: t.to, card: t.card,
    title: t.title, desc: t.desc, answer: t.answer, howto: howto(t),
    steps: t.steps, features: t.features, faqs: t.faqs
  }))
}, null, 1));
cpSync('assets/js/app.js', PLUGIN + 'assets/app.js');
rmSync(PLUGIN + 'assets/vendor', { recursive: true, force: true });
cpSync('assets/vendor', PLUGIN + 'assets/vendor', { recursive: true });
rmSync(PLUGIN + 'assets/og', { recursive: true, force: true });
cpSync('assets/og', PLUGIN + 'assets/og', { recursive: true });
mkdirSync(P + 'dist', { recursive: true });
rmSync(P + 'dist/cwh-pdf-tools.zip', { force: true });
execSync(`cd ${P} && python3 -c "import shutil; shutil.make_archive('dist/cwh-pdf-tools', 'zip', '.', 'cwh-pdf-tools')"`);

/* ---------- Gutenberg page content ---------- */
const links = html => html.replace(/href="\.\.\/([a-z-]+)\/"/g, `href="${BASE}$1/"`);
const para = (html, cls) => cls
  ? `<!-- wp:paragraph {"className":"${cls}"} -->\n<p class="${cls}">${html}</p>\n<!-- /wp:paragraph -->`
  : `<!-- wp:paragraph -->\n<p>${html}</p>\n<!-- /wp:paragraph -->`;
const center = html => `<!-- wp:paragraph {"align":"center"} -->\n<p class="has-text-align-center">${html}</p>\n<!-- /wp:paragraph -->`;
const h2 = (text, id) => `<!-- wp:heading -->\n<h2 class="wp-block-heading" id="${id}">${text}</h2>\n<!-- /wp:heading -->`;
const sc = code => `<!-- wp:shortcode -->\n${code}\n<!-- /wp:shortcode -->`;
const list = (items, ordered) => `<!-- wp:list${ordered ? ' {"ordered":true}' : ''} -->\n<${ordered ? 'ol' : 'ul'} class="wp-block-list">${items.map(i => `<!-- wp:list-item -->\n<li>${i}</li>\n<!-- /wp:list-item -->`).join('')}</${ordered ? 'ol' : 'ul'}>\n<!-- /wp:list -->`;
const faq = faqs => faqs.map(([q, a]) => `<!-- wp:details {"className":"cwhp-faq"} -->\n<details class="wp-block-details cwhp-faq"><summary>${q}</summary>${para(a)}</details>\n<!-- /wp:details -->`).join('\n\n');
const guideParas = html => html.split(/\n+/).map(p => p.trim()).filter(Boolean).map(p => para(links(p.replace(/^<p>|<\/p>$/g, '')))).join('\n\n');

const pages = [];
for (const t of TOOLS) {
  const content = [
    center(t.sub),
    sc(`[cwh_pdf tool="${t.slug}"]`),
    h2(`${t.slug === 'merge-pdf' ? 'How to merge PDF files' : t.slug === 'split-pdf' ? 'How to split a PDF' : `How to convert ${t.from} to ${t.to}`} — quick answer`, 'quick-answer'),
    para(t.answer, 'cwhp-answer'),
    h2(`${t.name} in 3 easy steps`, 'how-to'),
    list(t.steps.map(([n, d]) => `<strong>${n}:</strong> ${d}`), true),
    h2(`Why use our ${t.name} ${t.slug.includes('-to-') ? 'converter' : 'tool'}?`, 'features'),
    list(t.features.map(([n, d]) => `<strong>${n}</strong> — ${d}`)),
    h2(`${t.name}: everything you need to know`, 'guide'),
    guideParas(t.guide),
    h2(`${t.name} — frequently asked questions`, 'faq'),
    faq(t.faqs),
    h2('Related PDF tools', 'related'),
    sc(`[cwh_pdf_tools only="${t.related.join(',')}"]`)
  ].join('\n\n');
  const title = t.h1.replace(/<[^>]+>/g, '');
  pages.push({ slug: t.slug, title, excerpt: t.desc, content });
}

const cmp = [
  ['Files uploaded to servers', 'Never — processed on your device', 'Usually yes'],
  ['Price', 'Free, unlimited', 'Free tier with limits'],
  ['Watermark', 'None', 'Often added'],
  ['Signup / email', 'Not required', 'Often required'],
  ['Tools', '12 tools in one place', 'Spread across sites'],
  ['Speed', 'Instant — no upload/download wait', 'Depends on your internet']
];
const table = `<!-- wp:table -->\n<figure class="wp-block-table"><table><thead><tr><th>Feature</th><th>Our PDF tools</th><th>Typical online converters</th></tr></thead><tbody>${cmp.map(r => `<tr><td>${r[0]}</td><td>✅ ${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></figure>\n<!-- /wp:table -->`;
pages.unshift({
  slug: 'pdf-tools', title: 'Free PDF Converter — All Tools in One', excerpt: HOME.desc, content: [
    center('Convert PDF to Word, Excel, JPG &amp; Text — or Word, Excel, images &amp; text to PDF. Merge and split PDFs. Fast, free and 100% private.'),
    sc('[cwh_pdf tool="auto"]'),
    h2('Convert from PDF', 'from-pdf'),
    sc('[cwh_pdf_tools group="from"]'),
    h2('Convert to PDF &amp; organise PDFs', 'to-pdf'),
    sc('[cwh_pdf_tools group="to"]'),
    h2('How does this all-in-one PDF converter work?', 'quick-answer'),
    para('Drop any file into the box above — a PDF, Word document, Excel sheet, image or text file. The converter detects the file type and shows every available conversion (for a PDF: Word, Excel, JPG, PNG, Text, Split or Merge). Pick one, click <strong>Convert</strong> and download the result. All processing runs inside your browser with open-source engines, so your files are never uploaded and results appear in seconds.', 'cwhp-answer'),
    h2('Convert any file in 3 steps', 'how-to'),
    list(['<strong>Add your file:</strong> click “Choose files”, drag &amp; drop, or paste. PDF, DOCX, XLSX, CSV, JPG, PNG and TXT are supported.', '<strong>Pick the output:</strong> choose Word, Excel, JPG, PNG, Text or PDF — or merge and split PDFs.', '<strong>Download:</strong> get your converted file instantly. Multiple results can be downloaded as one ZIP.'], true),
    h2('Our PDF tools vs typical online converters', 'compare'),
    table,
    h2('A private PDF converter that works in your browser', 'private'),
    para('Most online PDF converters upload your documents to a remote server, process them there and ask you to download the result. That is slow on mobile data and risky for confidential files such as bank statements, contracts, ID cards and medical reports.'),
    para('These tools take a different approach: they use battle-tested open-source engines (Mozilla’s pdf.js, pdf-lib, SheetJS and docx) directly on your device. Your files never travel across the internet, conversions start instantly, and the tools keep working even on slow connections once the page has loaded.'),
    h2('Frequently asked questions', 'faq'),
    faq(HOME.faqs)
  ].join('\n\n')
});

mkdirSync(P + 'pages', { recursive: true });
for (const p of pages) writeFileSync(`${P}pages/${p.slug}.html`, p.content);
writeFileSync(P + 'pages/pages.json', JSON.stringify(pages.map(({ content, ...rest }) => rest), null, 1));
console.log('Plugin zip: ' + P + 'dist/cwh-pdf-tools.zip; pages: ' + pages.length);
