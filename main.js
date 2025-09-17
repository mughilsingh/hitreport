// Example articles data
const articles = [
  {
    id: 1,
    title: "UFC 300 Recap: Biggest Moments",
    summary: "A breakdown of the most exciting fights and upsets at UFC 300.",
    url: "article1.html"
  },
  {
    id: 2,
    title: "Top 5 Knockouts of 2025",
    summary: "Highlighting the most brutal knockouts in MMA this year.",
    url: "article2.html"
  },
  {
    id: 3,
    title: "Martial Arts Training Tips",
    summary: "Improve your skills with these expert tips from pro fighters.",
    url: "article3.html"
  }
];

function renderArticles() {
  const list = document.getElementById('articles-list');
  if (!list) return;
  list.innerHTML = articles.map(article => `
    <div class="article-card">
      <h3>${article.title}</h3>
      <p>${article.summary}</p>
      <a href="${article.url}">Read More</a>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', renderArticles);
