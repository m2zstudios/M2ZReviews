const fallbackOg = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80';
const SITE_URL = 'https://example.com';

const cfg = window.APPWRITE_CONFIG || {};
const sdk = window.Appwrite || {};
let account;
let storage;
let databases;

function initAppwriteClients() {
  if (!sdk.Client || !cfg.projectId || !cfg.endpoint) return false;
  const client = new sdk.Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);
  account = new sdk.Account(client);
  storage = new sdk.Storage(client);
  databases = new sdk.Databases(client);
  return true;
}

const escapeHtml = (v = '') => v.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function sectionToHtml(section, title) {
  if (section.type === 'text') return `<section class="article-section"><div class="article-text" style="font-size:${Number(section.size) || 16}px;font-weight:${section.weight || '400'};text-align:${section.align || 'left'};">${section.content || ''}</div></section>`;
  if (section.type === 'grid') {
    const ipr = Number(section.ipr) === 2 ? 2 : 1;
    return `<section class="article-section"><div class="article-grid article-grid-${ipr}">${section.img1 ? `<img loading="lazy" src="${escapeHtml(section.img1)}" alt="${escapeHtml(title)} gallery image one">` : ''}${section.img2 ? `<img loading="lazy" src="${escapeHtml(section.img2)}" alt="${escapeHtml(title)} gallery image two">` : ''}</div></section>`;
  }
  if (section.type === 'button') return `<section class="article-section" style="text-align:${section.align || 'left'};"><a class="btn" href="${escapeHtml(section.link || '#')}" target="_blank" rel="nofollow noopener">${escapeHtml(section.text || 'Learn more')}</a></section>`;
  return '';
}

function buildPostHtml(meta, editorData) {
  const heroImage = editorData.heroImage || meta.ogImage || fallbackOg;
  const ogImage = meta.ogImage || heroImage;
  const sections = (editorData.sections || []).map((s) => sectionToHtml(s, meta.title)).join('\n');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(meta.title)}</title><meta name="description" content="${escapeHtml(meta.description)}"><link rel="canonical" href="${SITE_URL}/posts/${meta.slug}.html"><meta property="og:title" content="${escapeHtml(meta.title)}"><meta property="og:description" content="${escapeHtml(meta.description)}"><meta property="og:type" content="article"><meta property="og:url" content="${SITE_URL}/posts/${meta.slug}.html"><meta property="og:image" content="${escapeHtml(ogImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapeHtml(ogImage)}"><link rel="stylesheet" href="/css/style.css"><style>.article-section{margin:1.1rem 0}.article-text{line-height:1.8}.article-grid{display:grid;gap:.8rem}.article-grid-1{grid-template-columns:1fr}.article-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}.article-grid img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:12px}@media(max-width:900px){.article-grid-2{grid-template-columns:1fr}}</style><script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"${escapeHtml(meta.title)}","description":"${escapeHtml(meta.description)}","image":"${escapeHtml(ogImage)}","datePublished":"${meta.publishDate}","author":{"@type":"Person","name":"${escapeHtml(meta.author)}"},"publisher":{"@type":"Organization","name":"M2Z Reviews"}}</script></head><body data-page="post" data-slug="${meta.slug}"><header class="site-header"><a class="logo" href="/">M2Z Reviews</a><nav class="nav"><a href="/reviews.html">Reviews</a><a href="/compare.html">Compare</a><a href="/about.html">About</a><button class="theme-toggle" data-theme-toggle>🌙</button></nav></header><main class="layout"><article class="content article"><p class="meta">Published ${meta.publishDate} • ${meta.readingTime} • by ${escapeHtml(meta.author)}</p><h1 style="font-size:${Number(editorData.titleSize) || 32}px;font-weight:${editorData.titleWeight || '700'};text-align:${editorData.titleAlign || 'left'};">${escapeHtml(meta.title)}</h1><img class="hero-image" src="${escapeHtml(heroImage)}" alt="${escapeHtml(meta.title)} hero image">${sections}<section class="related"><h2>Related posts</h2><div class="posts-grid" data-related-posts></div></section></article><aside class="sidebar"><section class="card"><h3>Latest posts</h3><ul class="list" data-sidebar-latest></ul></section><section class="card"><h3>Trending</h3><ul class="list" data-sidebar-trending></ul></section></aside></main><footer class="site-footer">© 2026 M2Z Reviews.</footer><script src="/js/appwrite-config.js" defer></script><script src="/js/global.js" defer></script></body></html>`;
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
      style.textContent = `body{background:#edf2f9 !important;font-family:Inter,system-ui !important}.container{height:100vh !important}.left{width:40% !important;padding:20px !important;border-right:1px solid #dde3ef !important}.right{width:60% !important;padding:20px !important}.editor-box{border-radius:12px !important;border:1px solid #dde3ef !important}.image-grid.ipr-1{grid-template-columns:1fr !important}.image-grid.ipr-2{grid-template-columns:repeat(2,1fr) !important}.button-wrapper{margin-top:18px !important}input,textarea,select,button{border-radius:10px !important}.preview-wrapper{width:min(900px,100%) !important;border-radius:16px !important}`;
      doc.head.appendChild(style);
    } catch {}
  });
}

async function requireSession() {
  try {
    await account.get();
    return true;
  } catch {
    return false;
  }
}

async function uploadToBucket(file) {
  if (!file) return null;
  const created = await storage.createFile(cfg.bucketId, sdk.ID.unique(), file);
  return `${cfg.endpoint}/storage/buckets/${cfg.bucketId}/files/${created.$id}/view?project=${cfg.projectId}`;
}

async function connectUploaders() {
  const frame = document.getElementById('editorFrame');
  const heroInput = document.getElementById('heroUploader');
  const gridInput = document.getElementById('gridUploader');
  const status = document.getElementById('exportState');

  heroInput?.addEventListener('change', async () => {
    if (!heroInput.files?.[0]) return;
    try {
      status.textContent = 'Uploading hero image...';
      const url = await uploadToBucket(heroInput.files[0]);
      document.getElementById('ogImage').value = url;
      const w = frame.contentWindow;
      if (w?.pageData) {
        w.pageData.heroImage = url;
        w.renderPreview?.();
      }
      status.textContent = 'Hero image uploaded.';
    } catch (e) {
      status.textContent = `Hero upload failed: ${e.message || 'error'}`;
    }
  });

  gridInput?.addEventListener('change', async () => {
    if (!gridInput.files?.[0]) return;
    try {
      status.textContent = 'Uploading grid image...';
      const url = await uploadToBucket(gridInput.files[0]);
      const sectionNum = Number(document.getElementById('gridSectionIndex').value || 1) - 1;
      const slot = document.getElementById('gridSlot').value;
      const w = frame.contentWindow;
      const grids = (w?.pageData?.sections || []).map((s, idx) => ({ s, idx })).filter(({ s }) => s.type === 'grid');
      const target = grids[sectionNum];
      if (target) {
        target.s[slot] = url;
        w.renderEditor?.();
        w.renderPreview?.();
      }
      status.textContent = 'Grid image uploaded.';
    } catch (e) {
      status.textContent = `Grid upload failed: ${e.message || 'error'}`;
    }
  });
}

async function upsertPostInAppwrite(meta, postEntry, html) {
  if (!databases || !cfg.databaseId || !cfg.postsCollectionId) return;
  try {
    const q = [sdk.Query.equal('slug', postEntry.slug), sdk.Query.limit(1)];
    const existing = await databases.listDocuments(cfg.databaseId, cfg.postsCollectionId, q);
    const payload = { ...postEntry, contentHtml: html, status: 'published' };
    if (existing.total > 0) {
      await databases.updateDocument(cfg.databaseId, cfg.postsCollectionId, existing.documents[0].$id, payload);
    } else {
      await databases.createDocument(cfg.databaseId, cfg.postsCollectionId, sdk.ID.unique(), payload);
    }
  } catch {
    // ignore when permissions/schema not ready
  }
}

async function exportPackage() {
  const status = document.getElementById('exportState');
  const frame = document.getElementById('editorFrame');
  let editorData;
  try { editorData = frame.contentWindow.eval('pageData'); } catch { status.textContent = 'Unable to read editor data.'; return; }

  const title = document.getElementById('title').value.trim();
  if (!title) { status.textContent = 'Title is required.'; return; }
  const slug = slugify(document.getElementById('slug').value || title);
  const description = document.getElementById('description').value.trim() || `Read ${title} on M2Z Reviews.`;
  const publishDate = document.getElementById('publishDate').value || new Date().toISOString().slice(0, 10);
  const readingTime = document.getElementById('readingTime').value.trim() || `${Math.max(1, Math.ceil((frame.contentWindow.document.getElementById('preview')?.innerText.split(/\s+/).length || 200) / 200))} min read`;
  const category = document.getElementById('category').value.trim() || 'General';
  const author = document.getElementById('author').value.trim() || 'Meraz Ahmed';
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

  await upsertPostInAppwrite(meta, postEntry, html);

  if ('showDirectoryPicker' in window) {
    const dir = await window.showDirectoryPicker();
    const writeFileHandle = async (base, path, content) => {
      const parts = path.split('/');
      let current = base;
      for (let i = 0; i < parts.length - 1; i += 1) current = await current.getDirectoryHandle(parts[i], { create: true });
      const fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content); await writable.close();
    };
    await writeFileHandle(dir, `posts/${slug}.html`, html);
    if (publishNow) await writeFileHandle(dir, 'data/posts.json', JSON.stringify(updated, null, 2));
    status.textContent = publishNow ? `Exported posts/${slug}.html and updated data/posts.json` : `Exported posts/${slug}.html only.`;
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
  status.textContent = publishNow ? 'Downloaded HTML + posts.json (manual placement required).' : 'Downloaded HTML only.';
}

async function initLoginPage() {
  if (!initAppwriteClients()) return;

  try {
    await account.get();
    window.location.href = '/admin-editor.html';
    return;
  } catch {}

  const email = document.getElementById('adminEmail');
  const password = document.getElementById('adminPassword');
  const name = document.getElementById('adminName');
  const errorEl = document.getElementById('authError');

  const setError = (msg) => { errorEl.hidden = !msg; errorEl.textContent = msg || ''; };

  document.getElementById('loginBtn')?.addEventListener('click', async () => {
    try {
      setError('');
      await account.createEmailPasswordSession(email.value.trim(), password.value);
      window.location.href = '/admin-editor.html';
    } catch (e) { setError(e.message || 'Login failed'); }
  });

  document.getElementById('signupBtn')?.addEventListener('click', async () => {
    try {
      setError('');
      await account.create(sdk.ID.unique(), email.value.trim(), password.value, name.value.trim() || 'Admin User');
      await account.createEmailPasswordSession(email.value.trim(), password.value);
      window.location.href = '/admin-editor.html';
    } catch (e) { setError(e.message || 'Signup failed'); }
  });
}

async function initEditorPage() {
  if (!initAppwriteClients()) return;
  const ok = await requireSession();
  if (!ok) { window.location.href = '/admin.html'; return; }

  document.getElementById('title')?.addEventListener('input', (e) => {
    document.getElementById('slug').value = slugify(e.target.value);
  });
  document.getElementById('exportBtn')?.addEventListener('click', exportPackage);
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try { await account.deleteSession('current'); } catch {}
    window.location.href = '/admin.html';
  });

  beautifyEmbeddedEditor();
  connectUploaders();
}

document.addEventListener('DOMContentLoaded', () => {
  const mode = document.body.dataset.adminPage;
  if (mode === 'login') initLoginPage();
  if (mode === 'editor') initEditorPage();
});
