// Article search and rendering for articles.html
function renderFilteredArticles(articles, query) {
  const articlesList = document.getElementById('articles-list');
  if (!articlesList) return;
  const filtered = articles.filter(article => {
    return article.title.toLowerCase().includes(query) || article.summary.toLowerCase().includes(query);
  });
  articlesList.innerHTML = filtered.map(article => `
    <div class="article-card">
      <div class="article-img-wrap">
        <a href="${article.url}"><img src="${article.image}" alt="${article.title}" class="article-img" /></a>
      </div>
      <div class="article-content">
        <h3><a href="${article.url}">${article.title}</a></h3>
        <p>${article.summary}</p>
        <div class="article-meta">
          <span class="article-date">${article.date}</span> | <span class="article-author">${article.author}</span> | <span class="article-updated">Last updated: ${article.lastUpdated}</span>
        </div>
        <a href="${article.url}" class="app-btn">Read More</a>
      </div>
    </div>
  `).join('');
}

function setupArticleSearch(articles) {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      renderFilteredArticles(articles, query);
    });
  }
}

// On articles.html, use search and filtered rendering
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('search-input')) {
    fetch('articles.json')
      .then(response => response.json())
      .then(function(articles) {
        renderFilteredArticles(articles, "");
        setupArticleSearch(articles);
      });
  }
});

function renderArticles(articles) {
  const list = document.getElementById('articles-list');
  if (!list) return;
  list.innerHTML = articles.map(article => `
    <div class="article-card">
      <div class="article-img-wrap">
        <a href="${article.url}"><img src="${article.image}" alt="${article.title}" class="article-img" /></a>
      </div>
      <div class="article-content">
        <h3><a href="${article.url}">${article.title}</a></h3>
        <p>${article.summary}</p>
        <a href="${article.url}" class="app-btn">Read More</a>
      </div>
    </div>
  `).join('');
}

function fetchArticlesAndRender() {
  fetch('articles.json')
    .then(response => response.json())
    .then(data => {
      window.articles = data;
      renderArticles(data);
    })
    .catch(() => {
      renderArticles([]);
    });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchArticlesAndRender();
  // Burger menu functionality
  const burger = document.querySelector('.burger');
  const navList = document.querySelector('.nav-list');
  const header = document.querySelector('header');
  if (burger && navList && header) {
    burger.addEventListener('click', () => {
      navList.classList.toggle('open');
      setTimeout(() => {
        if (navList.classList.contains('open')) {
          header.classList.add('banner-push');
        } else {
          header.classList.remove('banner-push');
        }
      }, 10);
    });
    // Auto-close dropdown on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && navList.classList.contains('open')) {
        navList.classList.remove('open');
        header.classList.remove('banner-push');
      }
    });
  }
});
