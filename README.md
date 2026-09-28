# WellHub PDF – All-in-one free PDF converter

A fast static website with 12 PDF tools. Every conversion runs **in the browser**, so files are never uploaded. There is no backend, no signup and no watermark.

| From PDF | To PDF | Organise |
|---|---|---|
| PDF → Word (.docx) | Word (.docx) → PDF | Merge PDF |
| PDF → Excel (.xlsx / .csv) | Excel / CSV → PDF | Split PDF / extract pages |
| PDF → JPG | JPG / PNG / WEBP → PDF | |
| PDF → PNG | Text → PDF | |
| PDF → Text | | |

The home page (`/`) is a smart all-in-one converter. Drop any file and it shows every conversion that fits that file. Each tool also has its own SEO landing page (`/pdf-to-word/`, `/merge-pdf/` …).

## SEO / AIO features
- A unique title, meta description, canonical URL, Open Graph and Twitter tags, and a 1200×630 share image on every page
- JSON-LD `@graph` data: Organization, WebSite, WebPage, WebApplication, HowTo, FAQPage and BreadcrumbList
- A "quick answer" block, 3-step how-to, features, a guide, FAQs and related-tool links on every page, for search engines and AI answer engines
- `sitemap.xml` (with images), a `robots.txt` that allows AI crawlers, `llms.txt`, a web manifest and a 404 page
- Speed: CSS is inlined, there are no web fonts, one small deferred script, and heavy libraries load only when you convert. Libraries are self-hosted in `assets/vendor/`

## Build
```bash
SITE_URL=https://your-domain.com node build.mjs   # regenerate every page, the sitemap, robots.txt and llms.txt
```
Optional environment variables: `GA_ID` (Google Analytics 4) and `GSC_VERIFY` (Search Console token).
Page text for each tool lives in `tools.mjs`. The converter engine is in `assets/js/app.js`.

## Deploy (GitHub Pages)
Settings → Pages → Source: `Deploy from a branch` → pick the branch and `/ (root)`.
Before you deploy on a custom domain, rebuild with `SITE_URL` set to that domain so the canonical URLs and the sitemap are correct.

## Libraries
pdf.js 3.11 (Mozilla), pdf-lib 1.17, docx 8.5, SheetJS 0.18, mammoth 1.8, html2canvas 1.4, JSZip 3.10.
