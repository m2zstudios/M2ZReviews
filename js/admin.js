const fallbackOg = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80';
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
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

function beautifyEmbeddedEditor() {
  const frame = document.getElementById('editorFrame');
  if (!frame) return;
  frame.addEventListener('load', () => {
    try {
      const doc = frame.contentDocument;
      if (!doc || doc.getElementById('adminInjectedEditorStyle')) return;
      const style = doc.createElement('style');
      style.id = 'adminInjectedEditorStyle';
      style.textContent = `body{background:#edf2f9 !important;font-family:Inter,system-ui !important}.container{height:100vh !important}.left{width:40% !important;padding:20px !important;border-right:1px solid #dde3ef !important}.right{width:60% !important;padding:20px !important}.editor-box{border-radius:12px !important;border:1px solid #dde3ef !important}.image-grid.ipr-1{grid-template-columns:1fr !important}.image-grid.ipr-2{grid-template-columns:repeat(2,1fr) !important}input,textarea,select,button{border-radius:10px !important}.preview-wrapper{width:min(900px,100%) !important;border-radius:16px !important}`;
      doc.head.appendChild(style);
    } catch {}
  });
}

async function requireSession() {
  try { await account.get(); return true; } catch { return false; }
}

async function uploadToBucket(file) {
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
      if (w?.pageData) { w.pageData.heroImage = url; w.renderPreview?.(); }
      status.textContent = 'Hero image uploaded.';
    } catch (e) { status.textContent = `Hero upload failed: ${e.message || 'error'}`; }
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
      if (target) { target.s[slot] = url; w.renderEditor?.(); w.renderPreview?.(); }
      status.textContent = 'Grid image uploaded.';
    } catch (e) { status.textContent = `Grid upload failed: ${e.message || 'error'}`; }
  });
}

async function upsertPostInAppwrite(postEntry) {
  if (!databases || !cfg.databaseId || !cfg.postsCollectionId) return;
  try {
    const docs = await databases.listDocuments(cfg.databaseId, cfg.postsCollectionId, [sdk.Query.limit(100)]);
    const existing = (docs.documents || []).find((d) => d.slug === postEntry.slug);
    const payload = { ...postEntry, status: 'published', stats: JSON.stringify(postEntry.stats || { likes: 0, shares: 0, views: 0 }) };
    if (existing) await databases.updateDocument(cfg.databaseId, cfg.postsCollectionId, existing.$id, payload);
    else await databases.createDocument(cfg.databaseId, cfg.postsCollectionId, sdk.ID.unique(), payload);
  } catch {}
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

  const content = frame.contentWindow.document.getElementById('preview')?.innerHTML || '';
  const postEntry = {
    title,
    slug,
    description,
    publishDate,
    readingTime,
    category,
    author,
    ogImage,
    heroImage: editorData.heroImage || ogImage,
    heroAlt: `${title} hero image`,
    trending,
    content,
    stats: { likes: 0, shares: 0, views: 0 }
  };

  try {
    await upsertPostInAppwrite(postEntry);
    status.textContent = `Post saved to Appwrite. Live URL: /post/${slug}`;
  } catch (e) {
    status.textContent = `Publish failed: ${e.message || 'error'}`;
  }
}

async function listPostsDocs() {
  try {
    const docs = await databases.listDocuments(cfg.databaseId, cfg.postsCollectionId, [sdk.Query.limit(200)]);
    return docs.documents || [];
  } catch {
    return [];
  }
}

function parseStats(v) {
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return v || {};
}

function drawBarChart(canvas, labels, values, color = '#2456e8') {
  const ctx = canvas.getContext('2d');
  const cssW = canvas.clientWidth || 400;
  const cssH = canvas.clientHeight || 240;
  canvas.width = cssW * window.devicePixelRatio;
  canvas.height = cssH * window.devicePixelRatio;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 38;
  const chartW = cssW - padL - padR;
  const chartH = cssH - padT - padB;

  const max = Math.max(...values, 1);
  ctx.strokeStyle = '#c9d2e8';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padT + (chartH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(cssW - padR, y);
    ctx.stroke();
  }

  const barSpace = chartW / Math.max(values.length, 1);
  const barW = Math.max(14, Math.min(46, barSpace * 0.62));

  values.forEach((v, i) => {
    const x = padL + i * barSpace + (barSpace - barW) / 2;
    const h = (chartH * v) / max;
    const y = padT + chartH - h;

    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, color);
    grad.addColorStop(1, '#7ea0ff');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, h);

    ctx.fillStyle = '#6f7891';
    ctx.font = '11px Inter';
    ctx.fillText(String(labels[i]).slice(0, 10), x, cssH - 12);

    ctx.fillStyle = '#1e2433';
    ctx.font = '11px Inter';
    ctx.fillText(String(v), x, y - 4);
  });
}

async function loadSettingsDocument() {
  try {
    const docs = await databases.listDocuments(cfg.databaseId, cfg.settingsCollectionId, [sdk.Query.limit(1)]);
    return docs.documents?.[0] || null;
  } catch {
    return null;
  }
}

async function saveSettingsDocument(data) {
  const existing = await loadSettingsDocument();
  if (existing?.$id) {
    return databases.updateDocument(cfg.databaseId, cfg.settingsCollectionId, existing.$id, data);
  }
  return databases.createDocument(cfg.databaseId, cfg.settingsCollectionId, sdk.ID.unique(), data);
}

async function initDashboardPage() {
  if (!initAppwriteClients()) return;
  const ok = await requireSession();
  if (!ok) { window.location.href = '/admin.html'; return; }

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try { await account.deleteSession('current'); } catch {}
    window.location.href = '/admin.html';
  });

  // side-nav tabs
  document.querySelectorAll('[data-tab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('.admin-side-nav a[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
      document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab; });
    });
  });

  document.getElementById('projectName').textContent = cfg.projectId || '-';
  document.getElementById('projectEndpoint').textContent = cfg.endpoint || '-';

  const docs = await listPostsDocs();
  const posts = docs.map((d) => ({ ...d, _stats: parseStats(d.stats) }));

  const totalPosts = posts.length;
  const totalLikes = posts.reduce((n, p) => n + Number(p._stats.likes || 0), 0);
  const totalShares = posts.reduce((n, p) => n + Number(p._stats.shares || 0), 0);
  const mostViewed = posts.slice().sort((a, b) => Number(b._stats.views || 0) - Number(a._stats.views || 0))[0];

  const categoryCounts = {};
  posts.forEach((p) => { categoryCounts[p.category || 'General'] = (categoryCounts[p.category || 'General'] || 0) + 1; });

  const kpis = document.getElementById('kpis');
  kpis.innerHTML = `
    <article class="admin-kpi"><h4>Total Posts</h4><strong>${totalPosts}</strong></article>
    <article class="admin-kpi"><h4>Total Likes</h4><strong>${totalLikes}</strong></article>
    <article class="admin-kpi"><h4>Total Shares</h4><strong>${totalShares}</strong></article>
    <article class="admin-kpi"><h4>Most Viewed Post</h4><strong>${mostViewed ? `${mostViewed.title} (${mostViewed._stats.views || 0})` : '-'}</strong></article>
  `;

  const top = posts.slice().sort((a, b) => (Number(b._stats.likes || 0) + Number(b._stats.shares || 0) + Number(b._stats.views || 0)) - (Number(a._stats.likes || 0) + Number(a._stats.shares || 0) + Number(a._stats.views || 0))).slice(0, 8);
  document.getElementById('topPosts').innerHTML = top.map((p) => `<li><a href="/post/${p.slug}">${p.title}</a><div class="meta">Views: ${p._stats.views || 0} • Likes: ${p._stats.likes || 0} • Shares: ${p._stats.shares || 0}</div></li>`).join('') || '<li class="meta">No post stats yet.</li>';

  drawBarChart(document.getElementById('categoryChart'), Object.keys(categoryCounts), Object.values(categoryCounts), '#2456e8');
  drawBarChart(document.getElementById('engagementChart'), top.map((p) => p.slug || 'post'), top.map((p) => Number(p._stats.likes || 0) + Number(p._stats.shares || 0) + Number(p._stats.views || 0)), '#0ea5a4');
  drawBarChart(
    document.getElementById('viewsChart'),
    top.map((p) => p.slug || 'post'),
    top.map((p) => Number(p._stats.views || 0)),
    '#7c3aed'
  );

  const subsList = document.getElementById('subscriberList');
  try {
    const subs = await databases.listDocuments(cfg.databaseId, cfg.newsletterSubscribersCollectionId, [sdk.Query.limit(200)]);
    subsList.innerHTML = (subs.documents || []).map((d, i) => `<li><span>${i+1}. ${d.email || '-'}</span><a class="btn btn-anim" target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(d.email || '')}">💌</a></li>`).join('') || '<li class="meta">No subscribers yet.</li>';
  } catch {
    subsList.innerHTML = '<li class="meta">Unable to load subscribers.</li>';
  }

  // unified settings panel
  const homeAdUrl = document.getElementById('homeAdUrl');
  const homeAdRedUrl = document.getElementById('homeAdRedUrl');
  const postAdUrl = document.getElementById('postAdUrl');
  const postAdRedUrl = document.getElementById('postAdRedUrl');
  const siteTitle = document.getElementById('siteTitle');
  const siteMetaDesc = document.getElementById('siteMetaDesc');
  const siteOgImage = document.getElementById('siteOgImage');
  const siteHeroImage = document.getElementById('siteHeroImage');
  const settingsState = document.getElementById('settingsState');

  try {
    const st = await loadSettingsDocument();
    if (st) {
      homeAdUrl.value = st.HPAdURL || '';
      homeAdRedUrl.value = st.HPAdRedURL || '';
      postAdUrl.value = st.PPAdURL || '';
      postAdRedUrl.value = st.PPAdRedURL || '';
      siteTitle.value = st.SiteTitle || '';
      siteMetaDesc.value = st.MetaDesc || '';
      siteOgImage.value = st.OGImage || '';
      siteHeroImage.value = st.HomeHeroImage || '';
    }
  } catch {}

  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    try {
      const payload = {
        HPAdURL: homeAdUrl.value.trim(),
        HPAdRedURL: homeAdRedUrl.value.trim(),
        PPAdURL: postAdUrl.value.trim(),
        PPAdRedURL: postAdRedUrl.value.trim(),
        SiteTitle: siteTitle.value.trim(),
        MetaDesc: siteMetaDesc.value.trim(),
        OGImage: siteOgImage.value.trim(),
        HomeHeroImage: siteHeroImage.value.trim()
      };
      await saveSettingsDocument(payload);
      localStorage.setItem('m2z-home-ad-url', payload.HPAdURL || '');
      localStorage.setItem('m2z-home-ad-red-url', payload.HPAdRedURL || '');
      localStorage.setItem('m2z-post-ad-url', payload.PPAdURL || '');
      localStorage.setItem('m2z-post-ad-red-url', payload.PPAdRedURL || '');
      settingsState.textContent = 'Settings updated successfully.';
    } catch (e) {
      settingsState.textContent = `Settings update failed: ${e.message || 'error'}`;
    }
  });
}

async function initLoginPage() {
  if (!initAppwriteClients()) return;
  try {
    await account.get();
    window.location.href = '/admin-dashboard.html';
    return;
  } catch {}

  const email = document.getElementById('adminEmail');
  const password = document.getElementById('adminPassword');
  const errorEl = document.getElementById('authError');
  const setError = (msg) => { errorEl.hidden = !msg; errorEl.textContent = msg || ''; };

  document.getElementById('loginBtn')?.addEventListener('click', async () => {
    try {
      setError('');
      await account.createEmailPasswordSession(email.value.trim(), password.value);
      window.location.href = '/admin-dashboard.html';
    } catch (e) {
      setError(e.message || 'Login failed');
    }
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
  if (mode === 'dashboard') initDashboardPage();
  if (mode === 'editor') initEditorPage();
});
