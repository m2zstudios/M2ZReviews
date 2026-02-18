document.addEventListener("DOMContentLoaded", () => {

  // Dark Mode Toggle
  const toggle = document.getElementById("themeToggle");
  const currentTheme = localStorage.getItem("theme");

  if (currentTheme === "dark") {
    document.body.classList.add("dark");
  }

  toggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      localStorage.setItem("theme", "dark");
    } else {
      localStorage.setItem("theme", "light");
    }
  });

  // Load Posts
  fetch("/data/posts.json")
    .then(res => res.json())
    .then(posts => {

      posts.sort((a,b) => new Date(b.date) - new Date(a.date));

      // Featured
      const featured = posts.find(p => p.featured);
      if (featured) {
        const featuredDiv = document.getElementById("featuredPost");
        featuredDiv.innerHTML = `
          <div class="featured-card">
            <img src="${featured.thumbnail}" />
            <div>
              <h3><a href="/posts/${featured.id}.html">${featured.title}</a></h3>
              <p>${featured.description}</p>
            </div>
          </div>
        `;
      }

      // Latest Grid
      const grid = document.getElementById("postGrid");
      posts.forEach(post => {
        const card = document.createElement("div");
        card.className = "post-card";

        card.innerHTML = `
          <img src="${post.thumbnail}" />
          <h3><a href="/posts/${post.id}.html">${post.title}</a></h3>
          <p>${post.description}</p>
        `;

        grid.appendChild(card);
      });

      // Sidebar Latest
      const sidebar = document.getElementById("sidebarPosts");
      posts.slice(0, 5).forEach(post => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="/posts/${post.id}.html">${post.title}</a>`;
        sidebar.appendChild(li);
      });

    });

});
