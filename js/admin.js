const PASSCODE_KEY = 'm2z-admin-auth';
const PASSCODE = 'm2z-secure';
const fallbackOg = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80';

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

function buildPostHtml(meta, editorData) {
  const heroImage = editorData.heroImage || meta.ogImage || fallbackOg;
  const ogImage = meta.ogImage || heroImage;
  const sections = (editorData.sections || []).map((s) => {
    if (s.type === 'text') return `<section><p>${(s.content || '').replace(/\n/g, '<br>')}</p></section>`;
    if (s.type === 'grid') return `<section class="posts-grid"><img loading="lazy" src="${s.img1}" alt="${meta.title} gallery image one"><img loading="lazy" src="${s.img2}" alt="${meta.title} gallery image two"></section>`;
    if (s.type === 'button') return `<p><a class="btn" href="${s.link}">${s.text}</a></p>`;
    return '';
  }).join('\n');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${meta.title}</title><meta name="description" content="${meta.description}"><link rel="canonical" href="https://example.com/posts/${meta.slug}.html"><meta property="og:title" content="${meta.title}"><meta property="og:description" content="${meta.description}"><meta property="og:type" content="article"><meta property="og:url" content="https://example.com/posts/${meta.slug}.html"><meta property="og:image" content="${ogImage}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${ogImage}"><link rel="stylesheet" href="/css/style.css"><script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"${meta.title.replace(/"/g, '\\"')}","description":"${meta.description.replace(/"/g, '\\"')}","image":"${ogImage}","datePublished":"${meta.publishDate}","author":{"@type":"Person","name":"${meta.author.replace(/"/g, '\\"')}"},"publisher":{"@type":"Organization","name":"M2Z Reviews"}}</script></head><body data-page="post" data-slug="${meta.slug}"><header class="site-header"><a class="logo" href="/">M2Z Reviews</a><nav class="nav"><a href="/reviews.html">Reviews</a><a href="/compare.html">Compare</a><a href="/about.html">About</a><button class="theme-toggle" data-theme-toggle>Theme</button></nav></header><main class="layout"><article class="content article"><p class="meta">Published ${meta.publishDate} • ${meta.readingTime} • by ${meta.author}</p><h1>${meta.title}</h1><img class="hero-image" src="${heroImage}" alt="${meta.title} hero image">${sections}<section class="related"><h2>Related posts</h2><div class="posts-grid" data-related-posts></div></section></article><aside class="sidebar"><section class="card"><h3>Latest posts</h3><ul class="list" data-sidebar-latest></ul></section><section class="card"><h3>Trending</h3><ul class="list" data-sidebar-trending></ul></section></aside></main><footer class="site-footer">© 2026 M2Z Reviews.</footer><script src="/js/global.js" defer></script></body></html>`;
}

async function exportPackage() {
  const status = document.getElementById('exportState');
  const frame = document.getElementById('editorFrame');
  let editorData;
  try {
    editorData = frame.contentWindow.eval('pageData');
  } catch {
    status.textContent = 'Unable to read editor data. Ensure /editor is loaded.';
    return;
  }

  const title = document.getElementById('title').value.trim();
  const slug = slugify(document.getElementById('slug').value || title);
  const description = document.getElementById('description').value.trim();
  const publishDate = document.getElementById('publishDate').value || new Date().toISOString().slice(0, 10);
  const readingTime = document.getElementById('readingTime').value.trim() || `${Math.max(1, Math.ceil((frame.contentWindow.document.getElementById('preview')?.innerText.split(/\s+/).length || 200) / 200))} min read`;
  const category = document.getElementById('category').value.trim() || 'General';
  const author = document.getElementById('author').value.trim() || 'M2Z Reviews Team';
  const ogImage = document.getElementById('ogImage').value.trim() || editorData.heroImage || fallbackOg;

  const meta = { title, slug, description, publishDate, readingTime, category, author, ogImage };
  const heroImage = editorData.heroImage || ogImage;
  const heroAlt = `${title} hero image`;

  const postEntry = { ...meta, heroImage, heroAlt, trending: false };
  const html = buildPostHtml(meta, editorData);

  const postsRes = await fetch('/data/posts.json');
  const posts = await postsRes.json();
  const updated = [postEntry, ...posts.filter((p) => p.slug !== slug)];

  if ('showDirectoryPicker' in window) {
    const dir = await window.showDirectoryPicker();
    await writeFileHandle(dir, `posts/${slug}.html`, html);
    await writeFileHandle(dir, 'data/posts.json', JSON.stringify(updated, null, 2));
    status.textContent = `Exported posts/${slug}.html and updated data/posts.json`;
    return;
  }

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug}.html`;
  a.click();

  const b = document.createElement('a');
  b.href = URL.createObjectURL(new Blob([JSON.stringify(updated, null, 2)], { type: 'application/json' }));
  b.download = 'posts.json';
  b.click();
  status.textContent = 'Browser does not support direct folder write. Downloaded HTML + posts.json for manual placement.';
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
        .left { width:42% !important; padding:24px !important; border-right:1px solid #dde3ef !important; }
        .right { width:58% !important; padding:24px !important; }
        .editor-box { border-radius:12px !important; border:1px solid #dde3ef !important; }
        input, textarea, select { border-radius:10px !important; }
        button { border-radius:10px !important; }
        .preview-wrapper { width:min(860px, 100%) !important; border-radius:16px !important; }
      `;
      doc.head.appendChild(style);
    } catch {
      // ignore iframe styling errors
    }
  });
}

function initAdmin() {
  const auth = localStorage.getItem(PASSCODE_KEY) === '1';
  const authBox = document.getElementById('authBox');
  const cmsBox = document.getElementById('cmsBox');

  const unlock = () => {
    authBox.hidden = true;
    cmsBox.hidden = false;
  };
  if (auth) unlock();

  document.getElementById('unlockBtn').addEventListener('click', () => {
    if (document.getElementById('adminPass').value === PASSCODE) {
      localStorage.setItem(PASSCODE_KEY, '1');
      unlock();
    }
  });

  document.getElementById('title').addEventListener('input', (e) => {
    document.getElementById('slug').value = slugify(e.target.value);
  });
  document.getElementById('exportBtn').addEventListener('click', exportPackage);
  beautifyEmbeddedEditor();
}

document.addEventListener('DOMContentLoaded', initAdmin);
