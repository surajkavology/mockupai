/* =============================================================
   MockupAI — DownloadZip.js
   Packages generated code into a downloadable ZIP file
   Requires: JSZip + FileSaver.js (loaded via CDN in index.html)

   Folder structure:
     project-name/
       index.html
       css/
         styles.css
       js/
         main.js
       assets/
         .gitkeep
   ============================================================= */

const DownloadZip = {

  /* ----------------------------------------------------------
     Main download method
     @param {object} data        — AI mockup data (for naming)
     @param {object} generated   — { html, css, js } from CodeGenerator
  ---------------------------------------------------------- */
  async download(data, generated) {
    if (typeof JSZip === 'undefined') {
      alert('JSZip not loaded. Please check your internet connection.');
      return;
    }

    const folderName = this._slugify(data.businessName || 'mockupai-project');
    const zip    = new JSZip();
    const folder = zip.folder(folderName);

    // index.html — swap inline style/script for external file refs
    const exportHtml = generated.html
      .replace(/<style>[\s\S]*?<\/style>/,  '<link rel="stylesheet" href="css/styles.css">')
      .replace(/<script>[\s\S]*?<\/script>/, '<script src="js/main.js"></script>');

    folder.file('index.html', exportHtml);
    folder.folder('css').file('styles.css', generated.css);
    folder.folder('js').file('main.js', generated.js);
    folder.folder('assets').file('.gitkeep', '# Place your images here\n');

    // Generate and trigger download
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    saveAs(blob, `${folderName}.zip`);
  },

  /* Turn a business name into a safe folder name */
  _slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  },
};
