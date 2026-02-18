const PASSCODE_KEY = 'm2z-admin-auth';
const PASSCODE = 'm2z-secure';
const fallbackOg = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80';
const SITE_URL = 'https://example.com';

const isAuthed = () => localStorage.getItem(PASSCODE_KEY) === '1';
const escapeHtml = (v = '') => v.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function writeFileHandle(dirHandle, path, content) {
  const parts = path.split('/');
  let current = dirHandle;
  for (let i = 0; i < parts.length - 1; i += 1) current = await current.getDirectoryHandle(parts[i], { create: true });
  const fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

function sectionToHtml(section, title) {
  if (section.type === 'text') {
    return `<section class="article-section"><div class="article-text" style="font-size:${Number(section.size) || 16}px;font-weight:${section.weight || '400'};text-align:${section.align || 'left'};">${section.content || ''}</div></section>`;
  }

  if (section.type === 'grid') {
    const ipr = Number(section.ipr) === 2 ? 2 : 1;
    return `<section class="article-section"><div class="article-grid article-grid-${ipr}">
      ${section.img1 ? `<img loading="lazy" src="${escapeHtml(section.img1)}" alt="${escapeHtml(title)} gallery image one">` : ''}
      ${section.img2 ? `<img loading="lazy" src="${escapeHtml(section.img2)}" alt="${escapeHtml(title)} gallery image two">` : ''}
    </div></section>`;
  }

  if (section.type === 'button') {
    return `<section class="article-section" style="text-align:${section.align || 'left'};"><a class="btn" href="${escapeHtml(section.link || '#')}" target="_blank" rel="nofollow noopener">${escapeHtml(section.text || 'Learn more')}</a></section>`;
  }

  return '';
}

function buildPostHtml(meta, editorData) {
  const heroImage = editorData.heroImage || meta.ogImage || fallbackOg;
  const ogImage = meta.ogImage || heroImage;
  const sections = (editorData.sections || []).map((s) => sectionToHtml(s, meta.title)).join('\n');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(meta.title)}</title><meta name="description" content="${escapeHtml(meta.description)}"><link rel="canonical" href="${SITE_URL}/posts/${meta.slug}.html"><meta property="og:title" content="${escapeHtml(meta.title)}"><meta property="og:description" content="${escapeHtml(meta.description)}"><meta property="og:type" content="article"><meta property="og:url" content="${SITE_URL}/posts/${meta.slug}.html"><meta property="og:image" content="${escapeHtml(ogImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapeHtml(ogImage)}"><link rel="stylesheet" href="/css/style.css"><style>.article-section{margin:1.1rem 0}.article-text{line-height:1.8}.article-grid{display:grid;gap:.8rem}.article-grid-1{grid-template-columns:1fr}.article-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}.article-grid img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:12px}@media(max-width:900px){.article-grid-2{grid-template-columns:1fr}}</style><script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"${escapeHtml(meta.title)}","description":"${escapeHtml(meta.description)}","image":"${escapeHtml(ogImage)}","datePublished":"${meta.publishDate}","author":{"@type":"Person","name":"${escapeHtml(meta.author)}"},"publisher":{"@type":"Organization","name":"M2Z Reviews"}}</script></head><body data-page="post" data-slug="${meta.slug}"><header class="site-header"><a class="logo" href="/">M2Z Reviews</a><nav class="nav"><a href="/reviews.html">Reviews</a><a href="/compare.html">Compare</a><a href="/about.html">About</a><button class="theme-toggle" data-theme-toggle>Theme</button></nav></header><main class="layout"><article class="content article"><p class="meta">Published ${meta.publishDate} • ${meta.readingTime} • by ${escapeHtml(meta.author)}</p><h1 style="font-size:${Number(editorData.titleSize) || 32}px;font-weight:${editorData.titleWeight || '700'};text-align:${editorData.titleAlign || 'left'};">${escapeHtml(meta.title)}</h1><img class="hero-image" src="${escapeHtml(heroImage)}" alt="${escapeHtml(meta.title)} hero image">${sections}<section class="related"><h2>Related posts</h2><div class="posts-grid" data-related-posts></div></section></article><aside class="sidebar"><section class="card"><h3>Latest posts</h3><ul class="list" data-sidebar-latest></ul></section><section class="card"><h3>Trending</h3><ul class="list" data-sidebar-trending></ul></section></aside></main><footer class="site-footer">© 2026 M2Z Reviews.</footer><script src="/js/global.js" defer></script></body></html>`;
}

function beautifyEmbeddedEditor() {
  const frame = document.getElementById('editorFrame');
  if (!frame) return;

  frame.addEventListener('load', () => {
    try {
      const doc = frame.contentDocument;
      if (!doc || doc.getElementById('adminInjectedEditorStyle')) return;
      const style = doc.createElement('style');
      style.id = 'adminInjectedEditorStyle';
      style.textContent = `
        body { background:#edf2f9 !important; font-family: Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif !important; }
        .container { height:100vh !important; }
        .left { width:40% !important; padding:20px !important; border-right:1px solid #dde3ef !important; }
        .right { width:60% !important; padding:20px !important; }
        .editor-box { border-radius:12px !important; border:1px solid #dde3ef !important; }
        .image-grid.ipr-1 { grid-template-columns: 1fr !important; }
        .image-grid.ipr-2 { grid-template-columns: repeat(2, 1fr) !important; }
        .button-wrapper { margin-top:18px !important; }
        input, textarea, select, button { border-radius:10px !important; }
        .preview-wrapper { width:min(900px, 100%) !important; border-radius:16px !important; }
      `;
      doc.head.appendChild(style);
    } catch {
      // ignore iframe styling errors
    }
  });
}

async function exportPackage() {
  const status = document.getElementById('exportState');
  const frame = document.getElementById('editorFrame');
  if (!frame) return;

  let editorData;
  try {
    editorData = frame.contentWindow.eval('pageData');
  } catch {
    status.textContent = 'Unable to read editor data. Ensure /editor is loaded.';
    return;
  }

  const title = document.getElementById('title').value.trim();
  if (!title) {
    status.textContent = 'Title is required.';
    return;
  }

  const slug = slugify(document.getElementById('slug').value || title);
  const description = document.getElementById('description').value.trim() || `Read ${title} on M2Z Reviews.`;
  const publishDate = document.getElementById('publishDate').value || new Date().toISOString().slice(0, 10);
  const readingTime = document.getElementById('readingTime').value.trim() || `${Math.max(1, Math.ceil((frame.contentWindow.document.getElementById('preview')?.innerText.split(/\s+/).length || 200) / 200))} min read`;
  const category = document.getElementById('category').value.trim() || 'General';
  const author = document.getElementById('author').value.trim() || 'M2Z Reviews Team';
  const ogImage = document.getElementById('ogImage').value.trim() || editorData.heroImage || fallbackOg;
  const trending = document.getElementById('trendingFlag').checked;
  const publishNow = document.getElementById('publishNow').checked;

  const meta = { title, slug, description, publishDate, readingTime, category, author, ogImage };
  const heroImage = editorData.heroImage || ogImage;
  const postEntry = { ...meta, heroImage, heroAlt: `${title} hero image`, trending };
  const html = buildPostHtml(meta, editorData);

  const postsRes = await fetch('/data/posts.json');
  const posts = await postsRes.json();
  const updated = publishNow ? [postEntry, ...posts.filter((p) => p.slug !== slug)] : posts;

  if ('showDirectoryPicker' in window) {
    const dir = await window.showDirectoryPicker();
    await writeFileHandle(dir, `posts/${slug}.html`, html);
    if (publishNow) await writeFileHandle(dir, 'data/posts.json', JSON.stringify(updated, null, 2));
    status.textContent = publishNow
      ? `Exported posts/${slug}.html and updated data/posts.json`
      : `Exported posts/${slug}.html only.`;
    return;
  }

  const htmlLink = document.createElement('a');
  htmlLink.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  htmlLink.download = `${slug}.html`;
  htmlLink.click();

  if (publishNow) {
    const dataLink = document.createElement('a');
    dataLink.href = URL.createObjectURL(new Blob([JSON.stringify(updated, null, 2)], { type: 'application/json' }));
    dataLink.download = 'posts.json';
    dataLink.click();
  }

  status.textContent = publishNow
    ? 'Downloaded HTML + posts.json (manual placement required).'
    : 'Downloaded HTML file (manual placement required).';
}

function initLoginPage() {
  if (isAuthed()) {
    window.location.href = '/admin-editor.html';
    return;
  }

  const unlockBtn = document.getElementById('unlockBtn');
  const passInput = document.getElementById('adminPass');
  const authError = document.getElementById('authError');

  const login = () => {
    if (passInput.value === PASSCODE) {
      localStorage.setItem(PASSCODE_KEY, '1');
      window.location.href = '/admin-editor.html';
      return;
    }
    authError.hidden = false;
  };

  unlockBtn?.addEventListener('click', login);
  passInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
  });
}

function initEditorPage() {
  if (!isAuthed()) {
    window.location.href = '/admin.html';
    return;
  }

  document.getElementById('title')?.addEventListener('input', (e) => {
    document.getElementById('slug').value = slugify(e.target.value);
  });
  document.getElementById('exportBtn')?.addEventListener('click', exportPackage);
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem(PASSCODE_KEY);
    window.location.href = '/admin.html';
  });

  beautifyEmbeddedEditor();
}

document.addEventListener('DOMContentLoaded', () => {
  const mode = document.body.dataset.adminPage;
  if (mode === 'login') initLoginPage();
  if (mode === 'editor') initEditorPage();
});
