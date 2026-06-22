/* =============================================================
   MockupAI — PreviewManager.js
   Manages iframe preview + device switching (Desktop/Tablet/Mobile)
   ============================================================= */

const PreviewManager = {

  currentDevice: 'desktop',

  devices: {
    desktop: { width: '100%',               maxWidth: '1920px',             label: '1440px', icon: '🖥' },
    tablet:  { width: 'min(768px, 100%)',   maxWidth: 'min(768px, 100%)',   label: '768px',  icon: '⬛' },
    mobile:  { width: 'min(390px, 100%)',   maxWidth: 'min(390px, 100%)',   label: '390px',  icon: '📱' },
  },

  /* ----------------------------------------------------------
     Init — call once after DOM is ready
  ---------------------------------------------------------- */
  init() {
    this.frame        = document.getElementById('previewFrame');
    this.frameWrapper = document.getElementById('previewFrameWrapper');
    this.widthLabel   = document.getElementById('deviceWidthLabel');
    this._bindButtons();
    this.setDevice('desktop');
  },

  /* ----------------------------------------------------------
     Switch device — animates width transition
  ---------------------------------------------------------- */
  setDevice(device) {
    if (!this.devices[device]) return;
    this.currentDevice = device;
    const { width, maxWidth, label } = this.devices[device];

    if (this.frameWrapper) {
      this.frameWrapper.style.width    = width;
      this.frameWrapper.style.maxWidth = maxWidth;
    }

    if (this.widthLabel) this.widthLabel.textContent = label;

    document.querySelectorAll('.device-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.device === device);
    });
  },

  /* ----------------------------------------------------------
     Load HTML string into the iframe (preserves scroll)
  ---------------------------------------------------------- */
  load(htmlString) {
    if (!this.frame) return;

    // Save scroll position before reload
    let scrollY = 0;
    try { scrollY = this.frame.contentWindow?.scrollY || 0; } catch (e) {}

    // Revoke previous blob URL if any
    if (this._blobUrl) URL.revokeObjectURL(this._blobUrl);

    const blob = new Blob([htmlString], { type: 'text/html' });
    this._blobUrl = URL.createObjectURL(blob);

    this.frame.onload = () => {
      try { this.frame.contentWindow.scrollTo(0, scrollY); } catch (e) {}
    };

    this.frame.src = this._blobUrl;
  },

  /* ----------------------------------------------------------
     Bind device toggle buttons
  ---------------------------------------------------------- */
  _bindButtons() {
    document.querySelectorAll('.device-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setDevice(btn.dataset.device));
    });
  },
};
