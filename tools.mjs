// Page content for every tool. Edit text here, then run `node build.mjs`.
// Each tool gets its own SEO landing page at /<slug>/.

export const TOOLS = [
  {
    slug: 'pdf-to-word', icon: 'DOC', from: 'PDF', to: 'Word',
    name: 'PDF to Word',
    title: 'PDF to Word Converter – Free, Editable DOCX & DOC Online',
    desc: 'Convert PDF to editable Word (DOCX or DOC) free. Keeps tables, merged cells, fonts, borders and layout. No signup, no watermark — files never leave your device.',
    h1: 'PDF to <span>Word</span> Converter',
    sub: 'Turn any PDF into an editable Word document (.docx or .doc) with real tables and the original layout. Free, private and without watermarks.',
    card: 'Editable DOCX or DOC with real tables.',
    answer: 'To convert a PDF to Word for free, upload your PDF above, choose <b>DOCX</b> (Word 2007 and newer) or <b>DOC</b> (Word 97-2003) and click <b>Convert</b>. The tool rebuilds real Word tables with merged cells and shading, paragraphs, fonts, bold/italic and underlined text, page borders and page numbers, so question papers, forms and reports keep their original layout. Everything runs inside your browser, so your document is never uploaded.',
    steps: [
      ['Upload your PDF', 'Click “Choose files”, drag & drop, or paste a PDF. You can add several PDFs at once.'],
      ['Pick DOCX or DOC', 'Choose DOCX for Word 2007 and newer, or DOC for old Word 97-2003. Keep “Editable” mode to rebuild tables and text you can edit.'],
      ['Download the Word file', 'Click Convert and download your file. Open it in Microsoft Word, Google Docs, WPS or LibreOffice.']
    ],
    features: [
      ['Real Word tables', 'Table lines in the PDF become real Word tables — merged cells, cell shading and borders included — perfect for question papers, forms and invoices.'],
      ['DOCX and DOC', 'Download a modern .docx or an old-style .doc that opens in Word 97, 2003, 2007 and every newer version.'],
      ['Editable text, not pictures', 'Text is rebuilt into proper paragraphs with the original fonts, sizes, bold, italic, underline and tab alignment.'],
      ['Page layout kept', 'Page size, margins, page borders, shaded headings and “Page X of Y” footers are preserved.'],
      ['Scanned pages handled', 'Pages without selectable text are inserted as high-resolution images so nothing is lost.']
    ],
    guide: `<p>PDF is perfect for sharing, but painful to edit. This PDF to Word converter reads both the text and the drawn lines of your PDF. Lines that form a grid become a <strong>real Word table</strong> with merged cells and shading; the remaining text is rebuilt into paragraphs with the original fonts, alignment, tab stops and spacing. The result is a clean Word file where you can fix a typo, rewrite a question or reuse content without retyping.</p>
<p><strong>DOCX or DOC?</strong> Choose <em>DOCX</em> for Microsoft Word 2007 and newer, Google Docs and WPS — it is the modern standard. Choose <em>DOC</em> only if you must open the file in Word 97-2003 or an old office program.</p>
<p><strong>Which mode should I choose?</strong> Use <em>Editable</em> for question papers, reports, letters, resumes, forms and agreements. Use <em>Exact layout</em> for brochures, certificates and designed flyers where the look matters more than editing — each page is placed in Word as a sharp image.</p>
<p><strong>Tip for scanned PDFs:</strong> a scanned document is a photo of paper and has no real text. Such pages are kept as images. To extract words from a scan you need OCR software; for everything else this converter is instant.</p>`,
    faqs: [
      ['Is this PDF to Word converter really free?', 'Yes. It is 100% free with no signup, no daily limit and no watermark on your documents.'],
      ['Will my Word file keep the original formatting?', 'Yes. Tables (including merged cells and shading), fonts, bold, italic, underline, alignment, page borders, margins and page numbers are rebuilt. Very complex magazine layouts may need small touch-ups; for those, use “Exact look” mode.'],
      ['Can I convert PDF to DOC (Word 97-2003)?', 'Yes. Choose “DOC – Word 97-2003” in the Word format option. The .doc file opens in Word 97, 2003 and all newer versions, as well as LibreOffice and WPS.'],
      ['Will tables in my PDF stay as tables?', 'Yes. Tables drawn with lines — like question papers, mark sheets, invoices and forms — are converted into real, editable Word tables with the same rows, columns and merged cells.'],
      ['Are my files uploaded to a server?', 'No. The conversion runs entirely in your web browser using JavaScript. Your PDF never leaves your computer or phone, which makes it safe for confidential documents.'],
      ['Can I convert a PDF to Word on my mobile phone?', 'Yes. The tool works in Chrome, Safari, Edge and Firefox on Android and iPhone — no app needed.'],
      ['Does it work with Hindi and other languages?', 'Yes. Any language that is stored as real text in the PDF (Hindi, Marathi, Tamil, Arabic, Chinese and more) is copied into the Word file as editable Unicode text.'],
      ['Can I convert a password-protected PDF?', 'Remove the password first (open the PDF with its password and save/print a copy), then convert the unlocked file.']
    ],
    related: ['pdf-to-excel', 'word-to-pdf', 'pdf-to-text', 'merge-pdf']
  },
  {
    slug: 'pdf-to-excel', icon: 'XLS', from: 'PDF', to: 'Excel',
    name: 'PDF to Excel',
    title: 'PDF to Excel Converter – Extract Tables to XLSX Free',
    desc: 'Convert PDF tables to Excel (XLSX) or CSV online free. Detects rows, columns and numbers automatically. Private, fast, no signup and no watermark.',
    h1: 'PDF to <span>Excel</span> Converter',
    sub: 'Extract tables from PDF bank statements, invoices and reports into an editable Excel spreadsheet.',
    card: 'Extract PDF tables into XLSX or CSV.',
    answer: 'To convert a PDF to Excel, upload the PDF above, choose “One sheet per page” or “All pages in one sheet”, and click <b>Convert to XLSX</b>. The tool detects table rows and columns from the position of the text and turns numbers such as 1,25,000.50 into real numeric cells you can sum and sort. Nothing is uploaded — it runs in your browser.',
    steps: [
      ['Add your PDF', 'Drop a PDF bank statement, invoice, price list or any report that contains tables.'],
      ['Choose sheet layout', 'Put each PDF page on its own worksheet, or stack all pages into one sheet. CSV output is also available.'],
      ['Download XLSX', 'Open the spreadsheet in Excel, Google Sheets or LibreOffice Calc and start working with your data.']
    ],
    features: [
      ['Smart column detection', 'Text positions are analysed to rebuild table columns, even for right-aligned numbers.'],
      ['Real numbers', 'Values like 12,500, (450.00) and ₹1,00,000 become numbers, so formulas work immediately.'],
      ['XLSX or CSV', 'Get a formatted Excel workbook with auto column widths, or a UTF-8 CSV for imports.'],
      ['Page selection', 'Convert only the pages you need, e.g. “2-5” for the transaction pages of a statement.']
    ],
    guide: `<p>Copy-pasting a table from a PDF into Excel usually dumps everything into one column. This converter solves that by reading the exact x/y coordinates of every word, clustering them into columns and rows, and writing a proper <strong>.xlsx</strong> workbook.</p>
<p>It works best with <strong>digital PDFs</strong> — statements downloaded from net-banking, GST invoices, e-commerce reports, exported accounting reports and price lists. For scanned paper documents there is no text layer to read, so convert them to images instead.</p>
<p><strong>Pro tip:</strong> choose “All pages in one sheet” for multi-page bank statements so all transactions end up in one continuous table you can filter.</p>`,
    faqs: [
      ['How accurate is the PDF to Excel conversion?', 'For digitally created PDFs with clear tables it is highly accurate: rows, columns and numbers are preserved. Merged cells or tables without spacing may need small adjustments.'],
      ['Can I convert a bank statement PDF to Excel?', 'Yes. Download the statement PDF from your bank, remove the password if it has one, upload it here and choose “All pages in one sheet”.'],
      ['Is my financial data safe?', 'Yes. The file is processed locally in your browser and is never sent to any server.'],
      ['Can I get CSV instead of XLSX?', 'Yes. Select “CSV (.csv)” in the Format option before converting.'],
      ['Does it work with scanned PDFs?', 'Scanned PDFs are images without text, so tables cannot be extracted without OCR. You will see a message if no text is found.']
    ],
    related: ['pdf-to-word', 'excel-to-pdf', 'pdf-to-text', 'split-pdf']
  },
  {
    slug: 'pdf-to-jpg', icon: 'JPG', from: 'PDF', to: 'JPG',
    name: 'PDF to JPG',
    title: 'PDF to JPG Converter – High Quality Images Free Online',
    desc: 'Convert PDF pages to high-quality JPG images online. Choose 96, 150 or 300 DPI, pick pages and download all as ZIP. Free, fast and private.',
    h1: 'PDF to <span>JPG</span> Converter',
    sub: 'Save every PDF page as a sharp JPG image — perfect for WhatsApp, Instagram, websites and presentations.',
    card: 'Save each PDF page as a JPG image.',
    answer: 'To convert a PDF to JPG, upload your PDF above, choose the quality (150 DPI is ideal for screens, 300 DPI for printing) and click <b>Convert to JPG</b>. Every page becomes a separate JPG image; download them one by one or all together as a ZIP file.',
    steps: [
      ['Select a PDF', 'Upload or drag & drop your PDF. Multiple files are supported.'],
      ['Set image quality', 'Choose 96, 150 or 300 DPI and optionally enter specific pages like 1, 3-4.'],
      ['Download images', 'Preview the thumbnails, download single JPGs or everything as one ZIP.']
    ],
    features: [
      ['Up to 300 DPI', 'Print-quality rendering with crisp text and vector graphics.'],
      ['Page picker', 'Convert all pages or only the ones you need.'],
      ['ZIP download', 'Get dozens of pages in one click.'],
      ['Works offline-fast', 'Rendering happens on your device — no upload wait time.']
    ],
    guide: `<p>JPG is the most compatible image format in the world, which makes it ideal for sharing a PDF page on social media, inserting it into PowerPoint, or uploading it to a form that only accepts images. This tool renders each page with the same engine used by the Firefox PDF viewer, so fonts, shapes and colours look exactly like the original.</p>
<p><strong>Choosing DPI:</strong> 96 DPI gives small files for previews, 150 DPI is sharp on phones and laptops, and 300 DPI is best for printing or zooming into fine details. Need transparency or lossless quality? Use <a href="../pdf-to-png/">PDF to PNG</a> instead.</p>`,
    faqs: [
      ['How do I convert only one page of a PDF to JPG?', 'Type the page number in the “Pages” box (for example 3) before clicking Convert.'],
      ['What resolution are the JPG images?', 'An A4 page at 150 DPI is about 1240 × 1754 pixels; at 300 DPI it is about 2480 × 3508 pixels.'],
      ['Is there a page limit?', 'No fixed limit. Very large PDFs depend on your device memory; converting in page ranges helps on older phones.'],
      ['Are my PDFs uploaded?', 'No. Pages are rendered locally in your browser, so your files stay private.']
    ],
    related: ['pdf-to-png', 'jpg-to-pdf', 'pdf-to-word', 'split-pdf']
  },
  {
    slug: 'pdf-to-png', icon: 'PNG', from: 'PDF', to: 'PNG',
    name: 'PDF to PNG',
    title: 'PDF to PNG Converter – Lossless Images Free Online',
    desc: 'Convert PDF to PNG images online in lossless quality. Select pages and DPI, download as ZIP. Free, secure, no signup, no watermark.',
    h1: 'PDF to <span>PNG</span> Converter',
    sub: 'Convert PDF pages into lossless PNG images with razor-sharp text — ideal for design and documentation.',
    card: 'Lossless PNG images from PDF pages.',
    answer: 'To convert a PDF to PNG, upload the PDF above, pick a DPI and click <b>Convert to PNG</b>. Each page is rendered as a lossless PNG image with no compression artefacts, which keeps small text and line art perfectly crisp.',
    steps: [
      ['Upload PDF', 'Choose one or more PDF files from your device.'],
      ['Choose DPI & pages', 'Select 96, 150 or 300 DPI and the pages to export.'],
      ['Save PNGs', 'Download each PNG or get them all in a ZIP archive.']
    ],
    features: [
      ['Lossless quality', 'PNG keeps every pixel — no JPEG blur around text.'],
      ['Great for screenshots & docs', 'Perfect for tutorials, wikis, UI docs and slides.'],
      ['Batch export', 'Convert many pages and files at once.'],
      ['Private by design', 'No uploads, no accounts, no tracking of your files.']
    ],
    guide: `<p>PNG is the best choice when you need maximum sharpness: diagrams, charts, code listings, forms and documents with small text. Unlike JPG, PNG uses lossless compression, so edges stay clean even after zooming. The trade-off is file size — for photos-heavy PDFs, <a href="../pdf-to-jpg/">PDF to JPG</a> produces smaller files.</p>`,
    faqs: [
      ['PNG or JPG — which is better for PDF pages?', 'PNG for text, diagrams and screenshots (lossless). JPG for photo-heavy pages where smaller file size matters.'],
      ['Can I convert a PDF to PNG with a transparent background?', 'Pages are rendered on a white background, exactly like a printed page, so they look correct everywhere.'],
      ['Does it work on iPhone and Android?', 'Yes, it works in any modern mobile browser.'],
      ['Is it free?', 'Completely free with no limits or watermarks.']
    ],
    related: ['pdf-to-jpg', 'png-to-pdf', 'pdf-to-word', 'merge-pdf']
  },
  {
    slug: 'pdf-to-text', icon: 'TXT', from: 'PDF', to: 'Text',
    name: 'PDF to Text',
    title: 'PDF to Text Converter – Extract Text from PDF Free',
    desc: 'Extract text from PDF online and save it as a TXT file. Keeps line breaks and reading order, supports all languages. Free, instant and private.',
    h1: 'PDF to <span>Text</span> Converter',
    sub: 'Extract all text from a PDF into a clean .txt file — keeps reading order and line breaks.',
    card: 'Extract plain text from any PDF.',
    answer: 'To extract text from a PDF, upload it above and click <b>Convert to TXT</b>. The tool reads the PDF text layer in natural reading order and saves it as a UTF-8 .txt file, optionally with page separators. It supports every language stored as text in the PDF.',
    steps: [
      ['Upload PDF', 'Add one or more PDF files.'],
      ['Options', 'Choose pages and whether to add “Page N” separators.'],
      ['Download TXT', 'Get a UTF-8 text file ready for editing, search or AI tools.']
    ],
    features: [
      ['Reading order kept', 'Lines are sorted top-to-bottom, left-to-right with paragraph gaps.'],
      ['Unicode UTF-8', 'Hindi, Urdu, Chinese, emojis and symbols stay intact.'],
      ['Perfect for AI & search', 'Paste clean text into ChatGPT, Claude, Notion or your CMS.'],
      ['Batch friendly', 'Extract text from many PDFs at once.']
    ],
    guide: `<p>Plain text is the most portable format there is. Extracting the text of a PDF lets you search it, translate it, feed it to an AI assistant, or paste it into a website without hidden formatting. For editable formatting use <a href="../pdf-to-word/">PDF to Word</a>; for tables use <a href="../pdf-to-excel/">PDF to Excel</a>.</p>`,
    faqs: [
      ['Why is my extracted text empty?', 'The PDF is probably a scanned image. Scanned pages contain pictures of text, not real characters, so OCR is required.'],
      ['Does it keep columns?', 'Text is read line by line across the page. Wide gaps between columns are kept as spaces so tables stay readable.'],
      ['Which encoding is used?', 'UTF-8, which opens correctly in Notepad, VS Code, TextEdit and all modern editors.'],
      ['Is it secure?', 'Yes — the text is extracted locally in your browser.']
    ],
    related: ['pdf-to-word', 'text-to-pdf', 'pdf-to-excel', 'split-pdf']
  },
  {
    slug: 'word-to-pdf', icon: 'PDF', from: 'Word', to: 'PDF',
    name: 'Word to PDF',
    title: 'Word to PDF Converter – DOCX to PDF Free Online',
    desc: 'Convert Word (DOCX) to PDF online free. Keeps headings, lists, tables and images; supports Hindi and all languages. No signup, no watermark, 100% private.',
    h1: 'Word to <span>PDF</span> Converter',
    sub: 'Convert DOCX documents to professional PDF files — resumes, assignments, letters and reports.',
    card: 'Convert DOCX documents to PDF.',
    answer: 'To convert Word to PDF, upload your .docx file above, choose the page size (A4 or Letter) and margins, then click <b>Convert to PDF</b>. Headings, lists, tables, images and every script including Hindi are rendered exactly as they appear, and the PDF is created on your device without any upload.',
    steps: [
      ['Upload DOCX', 'Choose a Word document (.docx). Several files can be converted together.'],
      ['Set page options', 'Pick A4, Letter or Legal, portrait or landscape, and margin size.'],
      ['Download PDF', 'Your PDF is ready to email, print or submit online.']
    ],
    features: [
      ['Tables & images', 'Tables are split cleanly across pages; images are embedded.'],
      ['All languages', 'Hindi, Bengali, Tamil, Arabic, Chinese — rendered with correct shaping.'],
      ['Smart page breaks', 'Paragraphs and table rows are never cut in half between pages.'],
      ['No watermark', 'Clean, professional output every time.']
    ],
    guide: `<p>Sending a Word file can break its layout on another computer; a PDF looks the same everywhere. This converter reads your .docx, lays out the content on real pages with smart page breaks, and packs the pages into a PDF.</p>
<p><strong>Supported files:</strong> modern Word documents (.docx) created by Microsoft Word, Google Docs, WPS or LibreOffice. Old .doc files (Word 97-2003) must be saved as .docx first.</p>
<p><strong>Note:</strong> pages are rendered as high-resolution images for perfect visual fidelity in every language. If you need selectable text inside the PDF, use “Save as PDF” inside Microsoft Word or Google Docs.</p>`,
    faqs: [
      ['How do I convert Word to PDF without losing formatting?', 'Upload the .docx here. Headings, bold/italic text, lists, tables and images are preserved and paragraphs are never split mid-line across pages.'],
      ['Can I convert a .doc file?', 'Only .docx is supported. Open the .doc in Word or Google Docs and choose “Save as .docx”, then convert it here.'],
      ['Does it support Hindi fonts?', 'Yes. Hindi and other Indic scripts are rendered with your device’s fonts, so the PDF shows them correctly.'],
      ['Is it safe for my resume or legal documents?', 'Yes. The document never leaves your browser.']
    ],
    related: ['pdf-to-word', 'excel-to-pdf', 'text-to-pdf', 'merge-pdf']
  },
  {
    slug: 'excel-to-pdf', icon: 'PDF', from: 'Excel', to: 'PDF',
    name: 'Excel to PDF',
    title: 'Excel to PDF Converter – XLSX to PDF Free Online',
    desc: 'Convert Excel spreadsheets (XLSX, XLS, CSV) to PDF online. Auto-fit wide tables, repeat header rows, landscape mode. Free, private, no signup.',
    h1: 'Excel to <span>PDF</span> Converter',
    sub: 'Turn XLSX, XLS and CSV spreadsheets into neat, print-ready PDF tables.',
    card: 'Convert XLSX, XLS or CSV to PDF.',
    answer: 'To convert Excel to PDF, upload your .xlsx, .xls or .csv file above, keep orientation on “Automatic” and click <b>Convert to PDF</b>. Every worksheet becomes a clean PDF table; wide sheets switch to landscape and shrink to fit, and the header row repeats on every page.',
    steps: [
      ['Upload spreadsheet', 'Supports .xlsx, .xls, .xlsm, .ods and .csv files.'],
      ['Adjust layout', 'Page size, orientation, margins and header-row repeat.'],
      ['Download PDF', 'Share a read-only, print-ready version of your data.']
    ],
    features: [
      ['All sheets included', 'Each worksheet is added with its name as a heading.'],
      ['Fit to page width', 'Wide tables automatically shrink so no columns are cut off.'],
      ['Repeating headers', 'Column titles appear at the top of every page.'],
      ['CSV support', 'Turn any CSV export into a readable PDF report.']
    ],
    guide: `<p>Spreadsheets are great for calculations but awkward to share: recipients may not have Excel, and printing often cuts off columns. Converting to PDF creates a fixed, read-only report that anyone can open. This tool reads your workbook, builds a table per sheet, keeps rows intact across page breaks and repeats the header row for readability.</p>`,
    faqs: [
      ['Can I convert all sheets of a workbook?', 'Yes. Every non-empty worksheet is included, each starting on a new page if you keep that option on.'],
      ['My sheet is very wide. Will it fit?', 'Choose “Automatic” or “Landscape” orientation. Wide tables are also scaled down to fit the page width.'],
      ['Are formulas converted?', 'The PDF shows the calculated values that are saved in the file.'],
      ['Is my spreadsheet uploaded anywhere?', 'No, it is processed only in your browser.']
    ],
    related: ['pdf-to-excel', 'word-to-pdf', 'merge-pdf', 'text-to-pdf']
  },
  {
    slug: 'jpg-to-pdf', icon: 'PDF', from: 'JPG', to: 'PDF',
    name: 'JPG to PDF',
    title: 'JPG to PDF Converter – Combine Images into PDF Free',
    desc: 'Convert JPG, PNG, WEBP and other images to PDF online free. Reorder photos, choose A4 or fit-to-image pages. No upload, no watermark, works on mobile.',
    h1: 'JPG to <span>PDF</span> Converter',
    sub: 'Combine photos, scans and screenshots into one PDF — reorder pages with drag & drop.',
    card: 'Combine images into a single PDF.',
    answer: 'To convert JPG to PDF, add your images above, drag them into the right order, choose A4 or “Same as image” page size and click <b>Convert to PDF</b>. All images are combined into one PDF with correct rotation for phone photos. JPG, PNG, WEBP, GIF and BMP are supported.',
    steps: [
      ['Add images', 'Select or drop JPG, PNG, WEBP, GIF or BMP files — as many as you like.'],
      ['Arrange order', 'Drag files or use the ↑ ↓ buttons to set the page order.'],
      ['Create PDF', 'Choose page size & margins, convert and download one PDF.']
    ],
    features: [
      ['Original quality', 'JPGs are embedded without re-compression whenever possible.'],
      ['Auto-rotate', 'Phone photos are rotated correctly using their EXIF orientation.'],
      ['Flexible pages', 'A4, Letter or exact image size, portrait/landscape, with margins.'],
      ['Perfect for documents', 'Turn photos of ID cards, marksheets and receipts into a single PDF.']
    ],
    guide: `<p>Many online forms — job portals, university admissions, government services — ask for a single PDF. Snap photos of your documents with your phone, add them here in order, and get one tidy PDF in seconds. Because the conversion runs locally, even sensitive documents like Aadhaar or PAN card photos never leave your device.</p>`,
    faqs: [
      ['How do I combine multiple JPGs into one PDF?', 'Select all images at once (or add them one by one), arrange the order and click Convert. You get a single PDF with one image per page.'],
      ['Will image quality be reduced?', 'No. Standard JPG and PNG images are embedded at their original quality.'],
      ['Can I convert photos from my phone?', 'Yes — open this page in your mobile browser, tap “Choose files” and select photos from your gallery.'],
      ['How can I reduce the PDF size?', 'Use smaller images, or choose A4 page size; very large camera photos produce larger PDFs.']
    ],
    related: ['png-to-pdf', 'pdf-to-jpg', 'merge-pdf', 'word-to-pdf']
  },
  {
    slug: 'png-to-pdf', icon: 'PDF', from: 'PNG', to: 'PDF',
    name: 'PNG to PDF',
    title: 'PNG to PDF Converter – Images to PDF Free Online',
    desc: 'Convert PNG images and screenshots to PDF online. Combine multiple PNGs into one PDF, reorder pages, pick A4 or original size. Free and private.',
    h1: 'PNG to <span>PDF</span> Converter',
    sub: 'Convert screenshots, diagrams and PNG images into a single high-quality PDF.',
    card: 'Turn PNG screenshots into a PDF.',
    answer: 'To convert PNG to PDF, add one or more PNG images above, arrange them in order and click <b>Convert to PDF</b>. PNGs are embedded losslessly, so screenshots and diagrams stay perfectly sharp in the resulting PDF.',
    steps: [
      ['Add PNG files', 'Upload screenshots, charts or any PNG images.'],
      ['Order & layout', 'Reorder pages and choose page size, orientation and margins.'],
      ['Download PDF', 'Get one combined, lossless PDF.']
    ],
    features: [
      ['Lossless embedding', 'PNG pixels are stored without quality loss.'],
      ['Mixed formats', 'Mix PNG with JPG, WEBP or GIF in the same PDF.'],
      ['Fit or A4', 'Keep each page the size of the image or place them on A4.'],
      ['No sign-up', 'Just open the page and convert.']
    ],
    guide: `<p>Screenshots are usually saved as PNG. Combining them into a PDF is the easiest way to share a step-by-step guide, a bug report, a receipt collection or lecture slides. This converter keeps PNG images lossless and lets you control the page order before creating the file.</p>`,
    faqs: [
      ['Can I merge PNG and JPG into one PDF?', 'Yes. Add both types together; they will be placed in the order you choose.'],
      ['Are transparent PNGs supported?', 'Yes. Transparent areas appear white in the PDF, like on paper.'],
      ['Is there a limit on the number of images?', 'No fixed limit — it depends on your device memory.'],
      ['Does the PDF have a watermark?', 'Never.']
    ],
    related: ['jpg-to-pdf', 'pdf-to-png', 'merge-pdf', 'split-pdf']
  },
  {
    slug: 'text-to-pdf', icon: 'PDF', from: 'Text', to: 'PDF',
    name: 'Text to PDF',
    title: 'Text to PDF Converter – TXT to PDF Free Online',
    desc: 'Convert TXT and plain-text files to PDF online. Choose font, size, page size and margins. Supports Hindi and all languages. Free, instant, private.',
    h1: 'Text to <span>PDF</span> Converter',
    sub: 'Convert .txt notes, logs and code into clean, readable PDF documents.',
    card: 'Convert TXT, MD or code files to PDF.',
    answer: 'To convert a text file to PDF, upload your .txt (or .md, .log, .csv, .json) file above, pick a font and size and click <b>Convert to PDF</b>. Line breaks and spacing are preserved, long lines wrap automatically, and any language renders correctly.',
    steps: [
      ['Upload text file', 'Supports .txt, .md, .log, .csv, .json, .xml and more.'],
      ['Choose style', 'Sans-serif or monospace font, font size, page size and margins.'],
      ['Download PDF', 'A neatly paginated PDF, ready to share or print.']
    ],
    features: [
      ['Keeps formatting', 'Indentation, blank lines and spacing stay exactly as in the file.'],
      ['Monospace option', 'Ideal for source code, logs and ASCII tables.'],
      ['Unicode support', 'Hindi, emoji and all scripts are displayed properly.'],
      ['Smart pagination', 'Lines never get cut between pages.']
    ],
    guide: `<p>Plain-text files are simple but look unprofessional when printed from a basic editor. This tool gives them proper page margins, readable typography and clean pagination. Choose the monospace font for code and logs so columns stay aligned.</p>`,
    faqs: [
      ['Which file types can I convert?', 'Any plain-text file: .txt, .md, .log, .csv, .json, .xml, .html source and similar.'],
      ['Will long lines be cut off?', 'No. Long lines wrap onto the next line automatically.'],
      ['Can I use Hindi text?', 'Yes, UTF-8 Hindi and all other scripts are supported.'],
      ['Is it private?', 'Yes — the file is converted on your device.']
    ],
    related: ['pdf-to-text', 'word-to-pdf', 'merge-pdf', 'jpg-to-pdf']
  },
  {
    slug: 'merge-pdf', icon: 'PDF', from: 'PDFs', to: 'one PDF',
    name: 'Merge PDF',
    title: 'Merge PDF – Combine PDF Files into One Free Online',
    desc: 'Merge PDF files online free. Combine multiple PDFs into one document, drag to reorder, no file size limits, no watermark. 100% private — no uploads.',
    h1: '<span>Merge PDF</span> Files',
    sub: 'Combine multiple PDFs into a single document in the order you want — instantly and privately.',
    card: 'Combine multiple PDFs into one.',
    answer: 'To merge PDF files, add two or more PDFs above, drag them into the order you want and click <b>Merge PDF</b>. All pages are combined into one PDF without any loss of quality — text, links, forms and images are copied exactly. The merge happens in your browser, so no file is uploaded.',
    steps: [
      ['Add PDF files', 'Select two or more PDFs, or drag them into the box.'],
      ['Reorder', 'Drag the files or use ↑ ↓ to arrange the final order.'],
      ['Merge & download', 'Click Merge PDF and download your combined document.']
    ],
    features: [
      ['Lossless merge', 'Pages are copied as-is: vector text stays searchable and sharp.'],
      ['Unlimited files', 'Combine as many PDFs as your device can handle.'],
      ['Custom file name', 'Name the merged PDF before downloading.'],
      ['Fast & offline-capable', 'No upload or download of your source files needed.']
    ],
    guide: `<p>Merging PDFs is useful for combining scanned pages, assembling a job application (CV + certificates), joining invoices for accounting, or putting chapters of a report together. Unlike many online tools, this one never uploads your files — the pages are copied inside your browser using the open-source pdf-lib engine, keeping text searchable and quality untouched.</p>
<p>Need to turn images into a PDF first? Use <a href="../jpg-to-pdf/">JPG to PDF</a>, then merge. Need only some pages? Use <a href="../split-pdf/">Split PDF</a>.</p>`,
    faqs: [
      ['How do I merge PDF files for free?', 'Add your PDFs above, put them in order and click “Merge PDF”. It is free with no limits or watermark.'],
      ['Does merging reduce quality?', 'No. Pages are copied without re-compression, so quality is identical to the originals.'],
      ['Can I merge password-protected PDFs?', 'Encrypted PDFs must be unlocked first; the tool will tell you which file is protected.'],
      ['How many PDFs can I merge?', 'There is no fixed limit; it depends only on your device memory.'],
      ['Can I merge PDFs on my phone?', 'Yes, it works in mobile browsers on Android and iOS.']
    ],
    related: ['split-pdf', 'jpg-to-pdf', 'word-to-pdf', 'pdf-to-word']
  },
  {
    slug: 'split-pdf', icon: 'PDF', from: 'PDF', to: 'parts',
    name: 'Split PDF',
    title: 'Split PDF – Extract Pages from PDF Free Online',
    desc: 'Split PDF online free: separate every page, split by custom ranges, or extract selected pages into a new PDF. Fast, private, no signup or watermark.',
    h1: '<span>Split PDF</span> & Extract Pages',
    sub: 'Separate a PDF into single pages, split it by ranges, or extract only the pages you need.',
    card: 'Split a PDF or extract pages.',
    answer: 'To split a PDF, upload it above and choose a mode: “Every page into a separate PDF”, “Custom ranges” (e.g. 1-3, 4-6) or “Extract selected pages into one PDF”. Click <b>Split PDF</b> and download the parts individually or as a ZIP. Quality stays exactly the same as the original.',
    steps: [
      ['Upload PDF', 'Choose the PDF you want to split.'],
      ['Choose split mode', 'Every page, custom ranges like 1-3, 5, 8-10, or extract pages.'],
      ['Download', 'Download each new PDF or all of them in one ZIP.']
    ],
    features: [
      ['Three split modes', 'Burst into pages, split by ranges, or extract a selection.'],
      ['Lossless', 'Pages are copied without any quality loss.'],
      ['ZIP download', 'Get all parts at once.'],
      ['Private', 'Your PDF never leaves your device.']
    ],
    guide: `<p>Splitting a PDF lets you send only the relevant pages — one invoice from a monthly batch, a single chapter of a book, or the signature page of a contract. Enter ranges separated by commas: <code>1-3, 7, 10-</code> means pages 1 to 3, page 7, and page 10 to the end.</p>`,
    faqs: [
      ['How do I extract specific pages from a PDF?', 'Choose “Extract selected pages into one PDF”, type the pages (e.g. 2, 5-7) and click Split PDF.'],
      ['Can I split a PDF into single pages?', 'Yes — choose “Every page into a separate PDF”.'],
      ['Does splitting reduce quality?', 'No. Pages are copied exactly as they are.'],
      ['Is it free and secure?', 'Yes, free with no limits, and processed only in your browser.']
    ],
    related: ['merge-pdf', 'pdf-to-jpg', 'pdf-to-word', 'pdf-to-excel']
  }
];

export const NAV = ['pdf-to-word', 'pdf-to-excel', 'pdf-to-jpg', 'word-to-pdf', 'jpg-to-pdf', 'merge-pdf', 'split-pdf'];

export const HOME = {
  title: 'Free PDF Converter – PDF to Word, Excel, JPG & Merge PDF',
  desc: 'All-in-one free PDF converter: PDF to Word, Excel, JPG, PNG, Text and Word, Excel, JPG to PDF. Merge & split PDF. No signup, no watermark, files never uploaded.',
  faqs: [
    ['What can this free PDF converter do?', 'It converts PDF to Word (DOCX), Excel (XLSX/CSV), JPG, PNG and Text, converts Word, Excel, images and text files to PDF, and merges or splits PDF files — 12 tools in one place.'],
    ['Do I need to install software or create an account?', 'No. Everything works directly in your browser on Windows, Mac, Linux, Android and iPhone. There is no signup and no email required.'],
    ['Are my files safe?', 'Yes. Unlike most online converters, your files are never uploaded. All processing happens locally on your device, so nobody else can access your documents.'],
    ['Is there a file size or daily limit?', 'There are no daily limits. Files up to 200 MB are supported; the practical limit depends on your device’s memory.'],
    ['Does it add a watermark?', 'Never. All converted files are clean and ready to use.'],
    ['Which is the best free PDF to Word converter?', 'A good PDF to Word converter should keep formatting, be free without watermarks and protect your privacy. This tool does all three and works offline once the page is loaded.']
  ]
};
