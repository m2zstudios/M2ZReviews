const SITE_URL = 'https://example.com';

const state = { posts: [] };

async function loadPosts() {
  if (state.posts.length) return state.posts;
  const res = await fetch('/data/posts.json');
  state.posts = await res.json();
  state.posts.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
  return state.posts;
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

function initThemeToggle() {
  applyTheme(localStorage.getItem('theme') || 'light');
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}

function renderList(el, posts, opts = {}) {
  if (!el) return;
  el.innerHTML = posts.map((p) => `<li><a href="/posts/${p.slug}.html">${p.title}</a>${opts.meta ? `<div class="meta">${p.publishDate} • ${p.readingTime}</div>` : ''}</li>`).join('');
}

function postCard(post) {
  return `<article class="post-card">
    <a href="/posts/${post.slug}.html"><img loading="lazy" src="${post.heroImage || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80'}" alt="${post.heroAlt || post.title}"></a>
    <div class="copy">
      <span class="badge">${post.category}</span>
      <h3><a href="/posts/${post.slug}.html">${post.title}</a></h3>
      <p>${post.description}</p>
      <div class="meta">${post.publishDate} • ${post.readingTime}</div>
    </div>
  </article>`;
}

async function initHomepage() {
  const posts = await loadPosts();
  const latestGrid = document.querySelector('[data-latest-grid]');
  if (latestGrid) latestGrid.innerHTML = posts.slice(0, 6).map(postCard).join('');

  renderList(document.querySelector('[data-sidebar-latest]'), posts.slice(0, 5), { meta: true });
  renderList(document.querySelector('[data-sidebar-trending]'), posts.filter((p) => p.trending).slice(0, 5));

  const categories = [...new Set(posts.map((p) => p.category))];
  const categoriesEl = document.querySelector('[data-categories]');
  if (categoriesEl) categoriesEl.innerHTML = categories.map((c) => `<span class="badge">${c}</span>`).join(' ');

  const trendingEl = document.querySelector('[data-trending-block]');
  if (trendingEl) trendingEl.innerHTML = posts.filter((p) => p.trending).slice(0, 3).map((p) => `<li><a href="/posts/${p.slug}.html">${p.title}</a></li>`).join('');
}

async function initPostPage() {
  const slug = document.body.dataset.slug;
  if (!slug) return;
  const posts = await loadPosts();
  const current = posts.find((p) => p.slug === slug);
  if (!current) return;

  renderList(document.querySelector('[data-sidebar-latest]'), posts.slice(0, 5), { meta: true });
  renderList(document.querySelector('[data-sidebar-trending]'), posts.filter((p) => p.trending).slice(0, 5));

  const related = posts.filter((p) => p.slug !== slug && p.category === current.category).slice(0, 3);
  const relatedEl = document.querySelector('[data-related-posts]');
  if (relatedEl) relatedEl.innerHTML = related.map(postCard).join('');

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = `${SITE_URL}/posts/${slug}.html`;
}

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  const page = document.body.dataset.page;
  if (page === 'home' || page === 'listing') await initHomepage();
  if (page === 'post') await initPostPage();
  if (page !== 'home' && page !== 'listing' && page !== 'post') {
    const posts = await loadPosts();
    renderList(document.querySelector('[data-sidebar-latest]'), posts.slice(0, 5), { meta: true });
    renderList(document.querySelector('[data-sidebar-trending]'), posts.filter((p) => p.trending).slice(0, 5));
  }
});
