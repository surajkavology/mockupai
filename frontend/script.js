/* =============================================================
   MockupAI — script.js
   Main application controller
   Coordinates: form → API → CodeGenerator → PreviewManager
   ============================================================= */

/* In production (Railway) the frontend is served by the same server,
   so API calls are relative. Locally, point to the dev backend. */
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : '';

/* ----------------------------------------------------------
   DOM References
---------------------------------------------------------- */
const form           = document.getElementById('briefForm');
const generateBtn    = document.getElementById('generateBtn');
const btnText        = generateBtn.querySelector('.btn-text');
const btnLoader      = generateBtn.querySelector('.btn-loader');
const formPanel      = document.getElementById('formPanel');
const resultPanel    = document.getElementById('resultPanel');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText    = document.getElementById('loadingText');
const backBtn        = document.getElementById('backBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const exportZipBtn   = document.getElementById('exportZipBtn');
const brandColorInput= document.getElementById('brandColor');
const colorHex       = document.getElementById('colorHex');
const browserUrl     = document.getElementById('browserUrl');

/* State — holds last generated data & code */
let _lastData      = null;
let _lastGenerated = null;

/* ----------------------------------------------------------
   Loading message rotation
---------------------------------------------------------- */
const loadingMessages = [
  'Analyzing your brief...',
  'Crafting your brand story...',
  'Writing compelling copy...',
  'Designing the palette...',
  'Generating your mockup...',
  'Almost there...',
];
let _loadingInterval;

function startLoading() {
  let i = 0;
  loadingText.textContent = loadingMessages[0];
  _loadingInterval = setInterval(() => {
    i = (i + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[i];
  }, 1800);
}
function stopLoading() { clearInterval(_loadingInterval); }

/* ----------------------------------------------------------
   Color picker sync
---------------------------------------------------------- */
brandColorInput.addEventListener('input', () => {
  colorHex.textContent = brandColorInput.value;
  document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
});
document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    brandColorInput.value = btn.dataset.color;
    colorHex.textContent  = btn.dataset.color;
    document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ----------------------------------------------------------
   Toast notifications
---------------------------------------------------------- */
function showToast(msg, duration = 4000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, duration);
}

/* ----------------------------------------------------------
   FORM SUBMIT → Generate mockup
---------------------------------------------------------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const businessName = document.getElementById('businessName').value.trim();
  const industry     = document.getElementById('industry').value;
  const description  = document.getElementById('description').value.trim();
  const audience     = document.getElementById('audience').value.trim();
  const goal         = document.getElementById('goal').value.trim();
  const brandColor   = brandColorInput.value;

  if (!businessName || !industry || !description) {
    showToast('Please fill in Business Name, Industry, and Description.');
    return;
  }

  /* Show loading state */
  loadingOverlay.hidden = false;
  generateBtn.disabled  = true;
  btnText.hidden        = true;
  btnLoader.hidden      = false;
  startLoading();

  try {
    const res = await fetch(`${BACKEND_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, industry, description, audience, goal, brandColor }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Server error');
    }

    const { data } = await res.json();

    /* Generate clean HTML/CSS/JS from the AI data */
    const generated = CodeGenerator.generate(data);

    /* Render everything (validator will update _lastData/_lastGenerated with repaired versions) */
    await renderResult(data, generated);

    /* Switch to result view */
    formPanel.hidden   = false;
    resultPanel.hidden = false;
    formPanel.hidden   = true;
    resultPanel.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    loadingOverlay.hidden = false;
    loadingOverlay.hidden = true;
    generateBtn.disabled  = false;
    btnText.hidden        = false;
    btnLoader.hidden      = true;
    stopLoading();
  }
});

/* ----------------------------------------------------------
   Render result — three-pass validation then loads preview
---------------------------------------------------------- */
async function renderResult(data, generated) {
  /* PASS 1 — repair JSON data */
  const { data: safeData, warnings: dataWarnings } = LayoutValidator.validateData(data);

  /* Update globals with repaired data so export uses clean version */
  _lastData      = safeData;
  _lastGenerated = CodeGenerator.generate(safeData);

  /* PASS 2 — generate HTML then repair the string */
  const rawHtml = CodeGenerator.generatePreviewHTML(safeData);
  const { html: safeHtml, warnings: htmlWarnings } = LayoutValidator.validateHTML(rawHtml);

  /* Update browser URL bar */
  browserUrl.textContent = safeData.businessName.toLowerCase().replace(/\s+/g, '') + '.com';

  /* Load repaired HTML into iframe */
  PreviewManager.load(safeHtml);

  /* Render meta panels */
  renderPalette(safeData.colorPalette);
  renderSEO(safeData);
  renderDesignPanel(safeData);

  /* PASS 3 — audit live iframe DOM after paint */
  const iframe = document.getElementById('previewFrame');
  const iframeWarnings = await LayoutValidator.validateIframe(iframe);

  /* Show unified warnings panel */
  LayoutValidator.showWarnings([...dataWarnings, ...htmlWarnings, ...iframeWarnings]);
}

/* ----------------------------------------------------------
   Back button
---------------------------------------------------------- */
backBtn.addEventListener('click', () => {
  resultPanel.hidden = true;
  formPanel.hidden   = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ----------------------------------------------------------
   PDF Download
---------------------------------------------------------- */
downloadPdfBtn.addEventListener('click', async () => {
  if (!_lastData) return;

  downloadPdfBtn.textContent = 'Preparing...';
  downloadPdfBtn.disabled    = true;

  try {
    const frame = document.getElementById('previewFrame');
    const previewHtml = CodeGenerator.generatePreviewHTML(_lastData);

    /* Use html2pdf on a hidden clone */
    const container = document.createElement('div');
    container.innerHTML = previewHtml;
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1440px;';
    document.body.appendChild(container);

    const opt = {
      margin: 0,
      filename: `MockupAI-${_lastData.businessName.replace(/\s+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.97 },
      html2canvas: { scale: 1.5, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    /* Dynamically load html2pdf if not present */
    if (typeof html2pdf === 'undefined') {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }

    await html2pdf().set(opt).from(container).save();
    document.body.removeChild(container);
  } catch (err) {
    showToast('PDF generation failed. Try again.');
  } finally {
    downloadPdfBtn.textContent = '⬇ PDF';
    downloadPdfBtn.disabled    = false;
  }
});

/* ----------------------------------------------------------
   Export ZIP
---------------------------------------------------------- */
exportZipBtn.addEventListener('click', async () => {
  if (!_lastData || !_lastGenerated) return;

  exportZipBtn.disabled    = true;
  exportZipBtn.textContent = 'Zipping...';

  try {
    await DownloadZip.download(_lastData, _lastGenerated);
  } catch (err) {
    showToast('Export failed: ' + err.message);
  } finally {
    exportZipBtn.disabled     = false;
    exportZipBtn.innerHTML    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export ZIP`;
  }
});

/* ----------------------------------------------------------
   Meta panel renderers
---------------------------------------------------------- */
function renderPalette(p) {
  if (!p) return;
  const strip = document.getElementById('paletteStrip');
  const swatches = [
    { color: p.primary,   name: 'Primary' },
    { color: p.secondary, name: 'Secondary' },
    { color: p.accent,    name: 'Accent' },
    { color: p.dark,      name: 'Dark' },
    { color: p.light,     name: 'Light' },
  ];
  strip.innerHTML = `
    <h4>Color Palette</h4>
    <div class="palette-swatches">
      ${swatches.map(s => `
        <div class="swatch">
          <div class="swatch-color" style="background:${s.color};"></div>
          <div class="swatch-name">${s.name}</div>
          <div class="swatch-label">${s.color}</div>
        </div>`).join('')}
    </div>`;
}

function renderSEO(d) {
  const seo = document.getElementById('seoPreview');
  const slug = d.businessName.toLowerCase().replace(/\s+/g, '');
  seo.innerHTML = `
    <h4>SEO Meta Preview</h4>
    <div class="seo-card">
      <div class="seo-card-title">${d.seoMeta?.title || d.businessName}</div>
      <div class="seo-card-url">https://www.${slug}.com</div>
      <div class="seo-card-desc">${d.seoMeta?.description || ''}</div>
    </div>`;
}

function renderDesignPanel(d) {
  const panel = document.getElementById('designPanel');
  if (!panel) return;
  panel.innerHTML = `
    <h4>Design Intelligence</h4>
    <div class="design-grid">
      ${d.brandPersonality ? `
        <div class="design-block">
          <div class="design-label">Brand Personality</div>
          <div class="design-val">${d.brandPersonality}</div>
        </div>` : ''}
      ${d.typography ? `
        <div class="design-block">
          <div class="design-label">Typography</div>
          <div class="design-val">
            <strong>${d.typography.heading}</strong> (headings)<br>
            <strong>${d.typography.body}</strong> (body)
            <span class="design-note">${d.typography.style || ''}</span>
          </div>
        </div>` : ''}
      ${d.iconStyle ? `
        <div class="design-block">
          <div class="design-label">Icon Style</div>
          <div class="design-val">${d.iconStyle}</div>
        </div>` : ''}
      ${d.designNotes ? `
        <div class="design-block design-block-full">
          <div class="design-label">Design Notes</div>
          <div class="design-val">${d.designNotes}</div>
        </div>` : ''}
    </div>`;
}

/* ----------------------------------------------------------
   Utility — dynamic script loader
---------------------------------------------------------- */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ----------------------------------------------------------
   Init PreviewManager after DOM ready
---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  PreviewManager.init();
});
