const BACKEND_URL = 'http://localhost:3001';

// DOM refs
const form = document.getElementById('briefForm');
const generateBtn = document.getElementById('generateBtn');
const btnText = generateBtn.querySelector('.btn-text');
const btnLoader = generateBtn.querySelector('.btn-loader');
const formPanel = document.getElementById('formPanel');
const resultPanel = document.getElementById('resultPanel');
const mockupContent = document.getElementById('mockupContent');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const backBtn = document.getElementById('backBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const brandColorInput = document.getElementById('brandColor');
const colorHex = document.getElementById('colorHex');
const browserUrl = document.getElementById('browserUrl');

// Loading messages rotation
const loadingMessages = [
  'Analyzing your brief...',
  'Crafting your brand story...',
  'Designing the structure...',
  'Writing compelling copy...',
  'Selecting the perfect palette...',
  'Finalizing your mockup...',
];
let loadingInterval;

function startLoadingMessages() {
  let i = 0;
  loadingText.textContent = loadingMessages[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[i];
  }, 1800);
}
function stopLoadingMessages() {
  clearInterval(loadingInterval);
}

// Color picker sync
brandColorInput.addEventListener('input', () => {
  colorHex.textContent = brandColorInput.value;
  document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
});

document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const color = btn.dataset.color;
    brandColorInput.value = color;
    colorHex.textContent = color;
    document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Toast
function showToast(msg, duration = 4000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, duration);
}

// Form submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const businessName = document.getElementById('businessName').value.trim();
  const industry = document.getElementById('industry').value;
  const description = document.getElementById('description').value.trim();
  const audience = document.getElementById('audience').value.trim();
  const goal = document.getElementById('goal').value.trim();
  const brandColor = brandColorInput.value;

  if (!businessName || !industry || !description) {
    showToast('Please fill in Business Name, Industry, and Description.');
    return;
  }

  // Show loading
  loadingOverlay.hidden = false;
  generateBtn.disabled = true;
  btnText.hidden = true;
  btnLoader.hidden = false;
  startLoadingMessages();

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
    renderMockup(data);

    formPanel.hidden = true;
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    loadingOverlay.hidden = true;
    generateBtn.disabled = false;
    btnText.hidden = false;
    btnLoader.hidden = true;
    stopLoadingMessages();
  }
});

// Back button
backBtn.addEventListener('click', () => {
  resultPanel.hidden = true;
  formPanel.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// PDF Download
downloadPdfBtn.addEventListener('click', () => {
  const element = document.getElementById('mockupWrapper');
  const opt = {
    margin: 0,
    filename: `MockupAI-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.97 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };
  downloadPdfBtn.textContent = 'Preparing PDF...';
  downloadPdfBtn.disabled = true;

  // Capture full mockup (remove max-height for PDF)
  const mc = document.getElementById('mockupContent');
  const prevMaxH = mc.style.maxHeight;
  mc.style.maxHeight = 'none';

  html2pdf().set(opt).from(element).save().then(() => {
    mc.style.maxHeight = prevMaxH;
    downloadPdfBtn.textContent = '⬇ Download PDF';
    downloadPdfBtn.disabled = false;
  });
});

// ===== RENDER MOCKUP =====
function renderMockup(d) {
  const p = d.colorPalette;
  const primary = p.primary || d.brandColor || '#6366f1';
  const secondary = p.secondary || '#818cf8';
  const accent = p.accent || '#f59e0b';
  const dark = p.dark || '#312e81';
  const light = p.light || '#e0e7ff';

  // Update browser URL bar
  browserUrl.textContent = d.businessName.toLowerCase().replace(/\s+/g, '') + '.com';

  mockupContent.innerHTML = `
    ${renderNavbar(d, primary, dark)}
    ${renderHero(d, primary, dark)}
    ${renderFeatures(d, primary, light)}
    ${renderAbout(d, primary, light, accent)}
    ${renderTestimonials(d, primary, light)}
    ${renderContact(d, primary, accent)}
    ${renderFooter(d, dark, primary)}
  `;

  renderPalette(p);
  renderSEO(d);
}

function renderNavbar(d, primary, dark) {
  const links = d.navbar.links.map(l =>
    `<li><a href="#">${l}</a></li>`
  ).join('');
  return `
    <nav class="m-navbar" style="background:${dark};">
      <div class="m-nav-logo">${d.navbar.logo}</div>
      <ul class="m-nav-links">${links}</ul>
      <a class="m-nav-cta" href="#" style="background:${primary};">${d.hero.ctaPrimary}</a>
    </nav>
  `;
}

function renderHero(d, primary, dark) {
  return `
    <section class="m-hero" style="background:linear-gradient(135deg, ${dark} 0%, ${primary} 100%);">
      <div class="m-hero-badge">${d.industry}</div>
      <h1>${d.hero.headline}</h1>
      <p>${d.hero.subheadline}</p>
      <div class="m-hero-actions">
        <a class="m-btn-primary" href="#">${d.hero.ctaPrimary}</a>
        <a class="m-btn-secondary" href="#" style="color:${dark};">${d.hero.ctaSecondary}</a>
      </div>
    </section>
  `;
}

function renderFeatures(d, primary, light) {
  const cards = d.features.map(f => `
    <div class="m-feature-card">
      <div class="m-feature-icon">${f.icon}</div>
      <h3 style="color:${primary};">${f.title}</h3>
      <p>${f.description}</p>
    </div>
  `).join('');
  return `
    <section class="m-features">
      <p class="m-section-label" style="color:${primary};">What We Offer</p>
      <h2 class="m-section-heading">Everything You Need to Succeed</h2>
      <p class="m-section-sub">Powerful features designed to help your business grow faster.</p>
      <div class="m-features-grid">${cards}</div>
    </section>
  `;
}

function renderAbout(d, primary, light, accent) {
  return `
    <section class="m-about">
      <div class="m-about-img" style="background:${light};">
        <span style="font-size:5rem;">🏢</span>
      </div>
      <div class="m-about-content">
        <p class="m-section-label" style="color:${primary};">Our Story</p>
        <h2>${d.about.heading}</h2>
        <p>${d.about.body}</p>
        <a class="m-contact-cta" href="#" style="background:${primary};">${d.hero.ctaPrimary}</a>
        <div class="m-about-stats" style="margin-top:28px;">
          <div class="m-stat">
            <strong style="color:${primary};">500+</strong>
            <span>Happy Clients</span>
          </div>
          <div class="m-stat">
            <strong style="color:${primary};">98%</strong>
            <span>Satisfaction Rate</span>
          </div>
          <div class="m-stat">
            <strong style="color:${primary};">5★</strong>
            <span>Average Rating</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTestimonials(d, primary, light) {
  const avatarColors = [primary, '#10b981', '#f59e0b'];
  const cards = d.testimonials.map((t, i) => {
    const initials = t.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    return `
      <div class="m-testimonial-card">
        <div class="m-stars">★★★★★</div>
        <p>"${t.text}"</p>
        <div class="m-reviewer">
          <div class="m-avatar" style="background:${avatarColors[i % 3]};">${initials}</div>
          <div class="m-reviewer-info">
            <strong>${t.name}</strong>
            <span>${t.role}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  return `
    <section class="m-testimonials">
      <p class="m-section-label" style="color:${primary};">Testimonials</p>
      <h2 class="m-section-heading">What Our Clients Say</h2>
      <p class="m-section-sub" style="margin-bottom:36px;">Real stories from real customers who transformed their business.</p>
      <div class="m-testimonials-grid">${cards}</div>
    </section>
  `;
}

function renderContact(d, primary, accent) {
  return `
    <section class="m-contact">
      <p class="m-section-label" style="color:${primary};">Get In Touch</p>
      <h2>${d.contact.heading}</h2>
      <p>${d.contact.subtext}</p>
      <a class="m-contact-cta" href="mailto:${d.contact.email}" style="background:${primary};">Send Us a Message</a>
      <div class="m-contact-info">
        <div class="m-contact-item">
          <span class="m-contact-icon">📧</span>
          <span>${d.contact.email}</span>
        </div>
        <div class="m-contact-item">
          <span class="m-contact-icon">📞</span>
          <span>${d.contact.phone}</span>
        </div>
      </div>
    </section>
  `;
}

function renderFooter(d, dark, primary) {
  return `
    <footer class="m-footer" style="background:${dark};">
      <div class="m-footer-logo">${d.businessName}</div>
      <div class="m-footer-tagline">${d.footer.tagline}</div>
      <div class="m-footer-copy">© ${d.footer.year} ${d.businessName}. All rights reserved.</div>
    </footer>
  `;
}

function renderPalette(p) {
  const strip = document.getElementById('paletteStrip');
  const swatches = [
    { color: p.primary, name: 'Primary' },
    { color: p.secondary, name: 'Secondary' },
    { color: p.accent, name: 'Accent' },
    { color: p.dark, name: 'Dark' },
    { color: p.light, name: 'Light' },
  ];
  strip.innerHTML = `
    <h4>Color Palette</h4>
    <div class="palette-swatches">
      ${swatches.map(s => `
        <div class="swatch">
          <div class="swatch-color" style="background:${s.color};"></div>
          <div class="swatch-name">${s.name}</div>
          <div class="swatch-label">${s.color}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSEO(d) {
  const seo = document.getElementById('seoPreview');
  seo.innerHTML = `
    <h4>SEO Meta Preview</h4>
    <div class="seo-card">
      <div class="seo-card-title">${d.seoMeta.title}</div>
      <div class="seo-card-url">https://www.${d.businessName.toLowerCase().replace(/\s+/g, '')}.com</div>
      <div class="seo-card-desc">${d.seoMeta.description}</div>
    </div>
  `;
}
