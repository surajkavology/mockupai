/* =============================================================
   MockupAI — LayoutValidator.js
   Three-pass validation pipeline:
     1. validateData()  — repair AI JSON before code generation
     2. validateHTML()  — repair HTML string before iframe load
     3. validateIframe() — audit live DOM after render
   ============================================================= */

const LayoutValidator = {

  /* ============================================================
     PASS 1 — Validate & auto-repair AI JSON data
     Returns { data: repairedData, warnings: [] }
  ============================================================= */
  validateData(raw) {
    const warnings = [];
    const d = JSON.parse(JSON.stringify(raw)); // deep clone — never mutate original

    /* ---- Business name ---- */
    if (!d.businessName) {
      d.businessName = 'Your Business';
      warnings.push(this._w('empty', 'Business name missing — used placeholder.', true));
    }

    /* ---- Hero ---- */
    d.hero = d.hero || {};

    if (!d.hero.headline || d.hero.headline.trim().length < 3) {
      d.hero.headline = d.tagline || d.businessName;
      warnings.push(this._w('empty', 'Hero headline was empty — used tagline as fallback.', true));
    } else {
      const words = d.hero.headline.trim().split(/\s+/);
      if (words.length > 12) {
        d.hero.headline = words.slice(0, 10).join(' ') + '…';
        warnings.push(this._w('headline', `Hero headline had ${words.length} words — truncated to 10.`, true));
      }
    }

    if (!d.hero.subheadline) d.hero.subheadline = `${d.businessName} delivers exceptional results for every customer.`;
    if (!d.hero.ctaPrimary)  d.hero.ctaPrimary  = 'Get Started';
    if (!d.hero.ctaSecondary) d.hero.ctaSecondary = 'Learn More';
    if (!d.hero.socialProof)  d.hero.socialProof  = 'Trusted by thousands worldwide';

    /* ---- Navbar ---- */
    d.navbar = d.navbar || {};
    if (!d.navbar.logo) d.navbar.logo = d.businessName;

    const GENERIC = new Set(['home', 'about', 'services', 'contact', 'us']);
    if (!Array.isArray(d.navbar.links) || d.navbar.links.filter(Boolean).length < 4) {
      d.navbar.links = ['About', 'Services', 'Portfolio', 'Contact'];
      warnings.push(this._w('layout', 'Navbar links were missing or incomplete — used generic fallbacks.', true));
    } else {
      const lower = d.navbar.links.map(l => (l || '').toLowerCase().trim());
      const allGeneric = lower.every(l => GENERIC.has(l));
      if (allGeneric) {
        warnings.push(this._w('layout', 'Navbar uses only generic links (Home/About/Services/Contact). Consider industry-specific links.', false));
      }
      d.navbar.links = d.navbar.links.map(l => l || 'Link');
    }

    /* ---- Color palette ---- */
    const DEFAULTS = { primary: '#6366f1', secondary: '#818cf8', accent: '#f59e0b', dark: '#0d1117', light: '#f5f7ff' };
    const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    d.colorPalette = d.colorPalette || {};
    let colorPatched = false;
    for (const [key, fallback] of Object.entries(DEFAULTS)) {
      if (!d.colorPalette[key] || !HEX_RE.test(d.colorPalette[key])) {
        d.colorPalette[key] = fallback;
        colorPatched = true;
      }
    }
    if (colorPatched) {
      warnings.push(this._w('color', 'One or more palette colors were missing or invalid — defaults applied.', true));
    }

    /* ---- Typography ---- */
    d.typography = d.typography || {};
    if (!d.typography.heading) d.typography.heading = 'Inter';
    if (!d.typography.body)    d.typography.body    = 'Inter';

    /* ---- Features (must be 6 items) ---- */
    const DEFAULT_FEATURES = [
      { icon: '⚡', title: 'Lightning Fast', description: 'Optimised for peak performance at any scale.' },
      { icon: '🔒', title: 'Secure by Design', description: 'Enterprise-grade security built into every layer.' },
      { icon: '📊', title: 'Real-Time Analytics', description: 'Actionable insights to guide every decision.' },
      { icon: '🤝', title: 'Expert Support', description: 'A dedicated team ready when you need them.' },
      { icon: '🌐', title: 'Global Reach', description: 'Serve customers in every corner of the world.' },
      { icon: '🔧', title: 'Easy Integration', description: 'Connects with the tools you already rely on.' },
    ];

    if (!Array.isArray(d.features) || d.features.length === 0) {
      d.features = DEFAULT_FEATURES;
      warnings.push(this._w('empty', 'Features section was empty — used default placeholders.', true));
    } else {
      d.features = d.features.slice(0, 6).map((f, i) => {
        const r = { ...f };
        if (!r.icon || typeof r.icon !== 'string' || r.icon.trim().length === 0 || r.icon.length > 6) {
          r.icon = DEFAULT_FEATURES[i]?.icon || '✦';
        }
        if (!r.title || r.title.trim().length === 0) {
          r.title = DEFAULT_FEATURES[i]?.title || `Feature ${i + 1}`;
          warnings.push(this._w('empty', `Feature ${i + 1} had no title — used placeholder.`, true));
        }
        if (!r.description || r.description.trim().length === 0) {
          r.description = DEFAULT_FEATURES[i]?.description || 'Details coming soon.';
        }
        return r;
      });
      while (d.features.length < 6) {
        const i = d.features.length;
        d.features.push(DEFAULT_FEATURES[i] || { icon: '✦', title: `Feature ${i + 1}`, description: 'Details coming soon.' });
      }
    }

    /* ---- Testimonials (must be 3) ---- */
    const DEFAULT_TESTIMONIALS = [
      { name: 'Alex Johnson',  role: 'CEO, TechCorp',       avatar: 'AJ', text: 'This completely transformed the way we operate. The results speak for themselves.', rating: 5 },
      { name: 'Maria Garcia',  role: 'Founder, StartupXYZ', avatar: 'MG', text: 'Exceptional quality and the support team is outstanding. Would recommend without hesitation.', rating: 5 },
      { name: 'Sam Lee',       role: 'Product Manager',     avatar: 'SL', text: 'Best investment we made this year. The ROI was clear within the first month.', rating: 5 },
    ];

    if (!Array.isArray(d.testimonials) || d.testimonials.length === 0) {
      d.testimonials = DEFAULT_TESTIMONIALS;
      warnings.push(this._w('empty', 'Testimonials section was empty — used default placeholders.', true));
    } else {
      d.testimonials = d.testimonials.slice(0, 3).map((t, i) => {
        const r = { ...t };
        if (!r.name)  r.name = DEFAULT_TESTIMONIALS[i]?.name || 'Happy Customer';
        if (!r.role)  r.role = DEFAULT_TESTIMONIALS[i]?.role || 'Verified Customer';
        if (!r.text || r.text.trim().length < 10) {
          r.text = DEFAULT_TESTIMONIALS[i]?.text || 'Excellent service — highly recommended.';
        } else if (r.text.length > 320) {
          r.text = r.text.slice(0, 300) + '…';
          warnings.push(this._w('long', `Testimonial from "${r.name}" exceeded 320 chars — truncated.`, true));
        }
        if (!r.rating || typeof r.rating !== 'number') r.rating = 5;
        return r;
      });
      while (d.testimonials.length < 3) {
        d.testimonials.push(DEFAULT_TESTIMONIALS[d.testimonials.length]);
      }
    }

    /* ---- FAQ (must be 4 items) ---- */
    const DEFAULT_FAQ = [
      { q: 'How do I get started?',          a: 'Simply reach out and our team will guide you through the onboarding process step by step.' },
      { q: 'What are your pricing options?', a: 'We offer flexible plans for businesses of all sizes. Contact us for a personalised quote.' },
      { q: 'Do you offer customer support?', a: 'Yes — our dedicated support team is available to help you whenever you need it.' },
      { q: 'Can I cancel at any time?',      a: 'Absolutely. No long-term commitments required.' },
    ];

    if (!Array.isArray(d.faq) || d.faq.length === 0) {
      d.faq = DEFAULT_FAQ;
      warnings.push(this._w('empty', 'FAQ section was empty — used default placeholders.', true));
    } else {
      d.faq = d.faq.slice(0, 4).map((item, i) => ({
        q: item.q?.trim() || DEFAULT_FAQ[i]?.q || `Question ${i + 1}`,
        a: item.a?.trim() || DEFAULT_FAQ[i]?.a || 'Answer coming soon.',
      }));
      while (d.faq.length < 4) d.faq.push(DEFAULT_FAQ[d.faq.length]);
    }

    /* ---- About ---- */
    d.about = d.about || {};
    if (!d.about.heading) d.about.heading = `About ${d.businessName}`;
    if (!d.about.body || d.about.body.trim().length < 20) {
      d.about.body = `${d.businessName} is dedicated to delivering exceptional ${d.industry || 'industry'} solutions that make a real difference.`;
    }
    const statDefaults = [
      { value: '10K+', label: 'Happy Clients' },
      { value: '98%',  label: 'Satisfaction Rate' },
      { value: '5★',   label: 'Average Rating' },
    ];
    ['highlightStat1', 'highlightStat2', 'highlightStat3'].forEach((key, i) => {
      if (!d.about[key] || !d.about[key].value) d.about[key] = statDefaults[i];
    });

    /* ---- Contact ---- */
    d.contact = d.contact || {};
    if (!d.contact.heading) d.contact.heading = 'Get In Touch';
    if (!d.contact.subtext) d.contact.subtext = `Ready to work together? Reach out to the ${d.businessName} team.`;
    if (!d.contact.email)   d.contact.email   = `hello@${d.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    if (!d.contact.phone)   d.contact.phone   = '+1 (555) 000-0000';

    /* ---- Footer ---- */
    d.footer = d.footer || {};
    if (!d.footer.tagline) d.footer.tagline = d.tagline || 'Quality you can trust.';
    if (!d.footer.year || typeof d.footer.year !== 'number') d.footer.year = new Date().getFullYear();

    /* ---- SEO meta ---- */
    d.seoMeta = d.seoMeta || {};
    if (!d.seoMeta.title) {
      d.seoMeta.title = `${d.businessName} — ${d.tagline || d.industry || 'Official Website'}`;
    }
    if (!d.seoMeta.description) {
      d.seoMeta.description = (d.about.body || '').slice(0, 155) ||
        `${d.businessName} provides premium ${d.industry || ''} services.`;
    }

    return { data: d, warnings };
  },

  /* ============================================================
     PASS 2 — Validate & repair generated HTML string
     Returns { html: repairedHtml, warnings: [] }
  ============================================================= */
  validateHTML(htmlString) {
    const warnings = [];
    let html = htmlString;

    /* Safety-net styles injected into every generated page */
    const safetyCSS = `
<style id="lv-safety">
  /* LayoutValidator safety net */
  html, body { overflow-x: hidden !important; max-width: 100% !important; width: 100% !important; }
  *, *::before, *::after { min-width: 0; box-sizing: border-box; }
  img { max-width: 100% !important; height: auto !important; display: block; }
  table { table-layout: fixed; width: 100%; }
  pre, code { overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
</style>`;

    if (html.includes('</head>')) {
      html = html.replace('</head>', safetyCSS + '\n</head>');
    } else {
      html = safetyCSS + html;
    }

    /* Ensure every <img> has max-width inline (belt-and-suspenders) */
    const imgsBefore = (html.match(/<img /gi) || []).length;
    html = html.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
      if (/style=/i.test(attrs)) {
        return match.replace(/style="([^"]*)"/i, (sm, sv) =>
          `style="${sv};max-width:100%;height:auto"`);
      }
      return `<img${attrs} style="max-width:100%;height:auto">`;
    });
    const imgsAfter = (html.match(/<img /gi) || []).length;
    if (imgsBefore > 0) {
      warnings.push(this._w('image', `${imgsBefore} image tag(s) hardened with max-width:100%.`, true));
    }

    /* Detect potentially problematic long unbreakable strings in visible text only */
    const visibleText = html
      .replace(/<style[\s\S]*?<\/style>/gi, '')   // strip CSS blocks
      .replace(/<script[\s\S]*?<\/script>/gi, '')  // strip JS blocks
      .replace(/<[^>]+>/g, ' ');                   // strip remaining tags
    const longWordMatches = visibleText.match(/\S{60,}/g) || [];
    const suspiciousLongWords = longWordMatches.filter(w =>
      !w.startsWith('data:') && !w.includes('googleapis') &&
      !w.includes('base64') && !w.startsWith('#') && !w.startsWith('http')
    );
    if (suspiciousLongWords.length > 0) {
      warnings.push(this._w('overflow',
        `${suspiciousLongWords.length} very long word(s) detected that may cause overflow on narrow screens.`, false));
    }

    /* Check for sections that are structurally empty */
    const emptySections = [...html.matchAll(/<section[^>]*id="([^"]*)"[^>]*>\s*<\/section>/gi)];
    if (emptySections.length > 0) {
      emptySections.forEach(m => {
        warnings.push(this._w('empty', `Section "#${m[1]}" appears to be completely empty.`, false));
      });
    }

    /* Detect missing Google Fonts link (fonts may be blocked) */
    if (!html.includes('fonts.googleapis.com')) {
      warnings.push(this._w('layout', 'Google Fonts link not found — system fonts will be used as fallback.', false));
    }

    return { html, warnings };
  },

  /* ============================================================
     PASS 3 — Post-render DOM audit inside the iframe
     Returns array of warning objects
  ============================================================= */
  async validateIframe(iframe, delayMs = 2500) {
    const warnings = [];

    /* Poll until iframe sections are laid out.
       Heights are captured HERE — at the exact tick they are verified —
       so the audit never re-reads from a potentially stale document. */
    let iDoc = null;
    let iWin  = null;
    const polledHeights = new Map(); // id → scrollHeight captured at poll time
    const deadline = Date.now() + delayMs;

    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 120));
      try {
        const d = iframe.contentDocument;
        if (!d) continue;
        /* Don't gate on readyState=complete — fonts can block it for >2s.
           CSS layout (and therefore scrollHeight) is ready long before fonts load. */
        const sections = d.querySelectorAll('section[id]');
        if (!sections.length) continue;
        const heights = new Map();
        sections.forEach(sec => heights.set(sec.id, sec.scrollHeight));
        const firstH = heights.values().next().value;
        if (firstH > 10) {
          iDoc = d;
          iWin = iframe.contentWindow;
          heights.forEach((h, id) => polledHeights.set(id, h));
          break;
        }
      } catch (_) { /* keep polling */ }
    }
    /* Last-resort fallback if poll timed out without finding content */
    if (!iDoc) {
      iDoc = iframe.contentDocument;
      iWin = iframe.contentWindow;
    }

    try {
      if (!iDoc || !iWin) {
        warnings.push(this._w('iframe', 'Cannot access iframe document — cross-origin or sandbox restriction.', false));
        return warnings;
      }

      const viewW = iWin.innerWidth;

      /* ----------------------------------------------------------
         SNAPSHOT — capture all layout measurements in ONE pass
         before any other DOM reads that could force a reflow and
         corrupt subsequent measurements (e.g. innerText)
      ---------------------------------------------------------- */
      const snapshot = {
        docScrollW:   iDoc.documentElement.scrollWidth,
        sections:     [],
        offscreenEls: 0,
        grids:        [],
        brokenImages: [],
      };

      // Section content (heights captured during poll — reliable across iframe repaint)
      iDoc.querySelectorAll('section[id]').forEach(sec => {
        snapshot.sections.push({
          id:   sec.id,
          text: sec.textContent?.trim() || '',
        });
      });

      // Elements beyond right edge
      iDoc.querySelectorAll('*').forEach(el => {
        try {
          const r = el.getBoundingClientRect();
          if (r.right > viewW + 4 && r.width > 0) snapshot.offscreenEls++;
        } catch (_) {}
      });

      // Grid collapse check (mobile only)
      if (viewW <= 768) {
        iDoc.querySelectorAll('.features-grid, .testimonials-grid').forEach(grid => {
          const kids = Array.from(grid.children);
          if (kids.length >= 2) {
            const r0 = kids[0].getBoundingClientRect();
            const r1 = kids[1].getBoundingClientRect();
            snapshot.grids.push({ cls: grid.className, collapsed: Math.abs(r0.left - r1.left) <= 8 });
          }
        });
      }

      // Broken images
      iDoc.querySelectorAll('img').forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          const src = img.getAttribute('src') || '';
          if (src && !src.startsWith('data:')) snapshot.brokenImages.push(src.slice(0, 70));
        }
      });

      /* ----------------------------------------------------------
         ANALYSIS — generate warnings from the snapshot
      ---------------------------------------------------------- */

      /* Horizontal overflow */
      if (snapshot.docScrollW > viewW + 4) {
        warnings.push(this._w('overflow',
          `Horizontal overflow: content is ${snapshot.docScrollW}px wide in a ${viewW}px viewport.`, false));
      }

      /* Offscreen elements */
      if (snapshot.offscreenEls > 0) {
        warnings.push(this._w('overflow',
          `${snapshot.offscreenEls} element(s) extend beyond the ${viewW}px viewport edge.`, false));
      }

      /* Poll timed out — page may not have rendered */
      if (polledHeights.size === 0 && snapshot.sections.length === 0) {
        warnings.push(this._w('layout', 'Layout may not have rendered — no sections detected after timeout.', false));
      }

      /* Section empty content */
      snapshot.sections.forEach(({ id, text }) => {
        if (text.length < 15) {
          warnings.push(this._w('empty', `Section "#${id}" rendered with very little content.`, false));
        }
      });

      /* Broken images */
      snapshot.brokenImages.forEach(src => {
        warnings.push(this._w('image', `Image failed to load: "${src}".`, false));
      });

      /* Grid collapse */
      snapshot.grids.forEach(({ cls, collapsed }) => {
        if (!collapsed) {
          warnings.push(this._w('mobile',
            `Grid ".${cls.split(' ')[0]}" did not collapse to a single column at ${viewW}px.`, false));
        }
      });

    } catch (err) {
      warnings.push(this._w('iframe', `Iframe audit error: ${err.message}`, false));
    }

    return warnings;
  },

  /* ============================================================
     UI — Render the warnings panel into resultPanel
  ============================================================= */
  showWarnings(warnings) {
    const existing = document.getElementById('lv-panel');
    if (existing) existing.remove();
    if (!warnings || warnings.length === 0) return;

    const autoFixed  = warnings.filter(w => w._autoFixed);
    const remaining  = warnings.filter(w => !w._autoFixed);

    const typeIcon = { overflow: '↔', empty: '○', long: '↕', layout: '⊞',
                       color: '◉', image: '⬜', iframe: '⚙', headline: '✎', mobile: '📱' };
    const typeLabel = { overflow: 'Overflow', empty: 'Empty', long: 'Length', layout: 'Layout',
                        color: 'Color', image: 'Image', iframe: 'Iframe', headline: 'Headline', mobile: 'Mobile' };

    const makeItem = w => `
      <li class="lv-item ${w._autoFixed ? 'lv-fixed-item' : 'lv-warn-item'}">
        <span class="lv-tag lv-tag-${w.type}">${typeIcon[w.type] || '⚠'} ${typeLabel[w.type] || w.type}</span>
        <span class="lv-msg">${w.msg}</span>
        ${w._autoFixed ? '<span class="lv-badge-fixed">Auto-fixed</span>' : ''}
      </li>`;

    const panel = document.createElement('div');
    panel.id = 'lv-panel';
    panel.innerHTML = `
      <div class="lv-header">
        <div class="lv-header-left">
          <span class="lv-icon">🛡</span>
          <div>
            <div class="lv-title">Layout Validator</div>
            <div class="lv-subtitle">
              ${autoFixed.length} auto-fixed &nbsp;·&nbsp; ${remaining.length} warning${remaining.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <button class="lv-close" aria-label="Close" onclick="document.getElementById('lv-panel').remove()">✕</button>
      </div>
      ${autoFixed.length > 0 ? `
        <div class="lv-section">
          <div class="lv-section-label">✓ Auto-repaired</div>
          <ul class="lv-list">${autoFixed.map(makeItem).join('')}</ul>
        </div>` : ''}
      ${remaining.length > 0 ? `
        <div class="lv-section">
          <div class="lv-section-label">⚠ Remaining warnings</div>
          <ul class="lv-list">${remaining.map(makeItem).join('')}</ul>
        </div>` : ''}
    `;

    const target = document.getElementById('resultPanel');
    if (target) target.appendChild(panel);
  },

  /* ============================================================
     Internal helpers
  ============================================================= */
  _w(type, msg, autoFixed = false) {
    return { type, msg, _autoFixed: autoFixed };
  },
};
