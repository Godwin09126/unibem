
// ======================================
// THE TEAL SPOTLIGHT
// CONNECTED TO NODE.JS BACKEND
// ======================================

// Get articles from backend
async function getArticles() {
    const response = await fetch("/api/articles");

    if (!response.ok) {
        throw new Error("Failed to load articles");
    }

    return await response.json();
}

// Escape HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Get article date
function getArticleDate(article) {
    const date = article.publishedAt
        ? new Date(article.publishedAt)
        : new Date(article.date);

    return isNaN(date.getTime()) ? new Date() : date;
}

// Format date and time
function formatDateTime(date) {
    return new Intl.DateTimeFormat("en-NG", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    }).format(date);
}

// Get Monday of the week
function getWeekStart(date) {
    const monday = new Date(date);
    monday.setHours(0, 0, 0, 0);

    const day = monday.getDay();
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));

    return monday;
}

// Format weekly edition
function formatWeek(start) {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const first = start.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short"
    });

    const last = end.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    return `Week of ${first} – ${last}`;
}

// ======================================
// DISPLAY HOMEPAGE ARTICLES
// ======================================

async function displayArticles() {
    const container = document.getElementById("news-container");

    if (!container) return;

    try {
        const articles = await getArticles();

        if (articles.length === 0) {
            container.innerHTML = `
                <div class="empty-news">
                    <h2>No stories published yet.</h2>
                    <p>Check back soon for the latest news.</p>
                </div>
            `;
            return;
        }

        const weeks = {};

        articles.forEach(article => {
            const date = getArticleDate(article);
            const monday = getWeekStart(date);
            const key = monday.toISOString().slice(0, 10);

            if (!weeks[key]) {
                weeks[key] = {
                    start: monday,
                    articles: []
                };
            }

            weeks[key].articles.push(article);
        });

        const sortedWeeks = Object.keys(weeks).sort().reverse();

        container.innerHTML = sortedWeeks.map(key => {
            const week = weeks[key];

            const cards = week.articles.map(article => `
                <article class="news-card">

                    ${article.image ? `
                        <img
                            src="${escapeHTML(article.image)}"
                            alt="${escapeHTML(article.title)}"
                            class="news-image"
                            onerror="this.style.display='none'"
                        >
                    ` : ""}

                    <div class="news-content">

                        <div class="news-category">
                            Entertainment • Film • Popular Culture
                        </div>

                        <h3>${escapeHTML(article.title)}</h3>

                        <div class="news-meta">
                            <span class="by-line">
                                By ${escapeHTML(article.author)}
                            </span>

                            <span class="publish-date">
                                Published: ${escapeHTML(formatDateTime(getArticleDate(article)))}
                            </span>
                        </div>

                        <div class="news-description">
                            <p>
                                ${escapeHTML((article.content || "").substring(0, 150))}
                                ${(article.content || "").length > 150 ? "..." : ""}
                            </p>
                        </div>

                        <a class="read-more"
                           href="#"
                           onclick="readArticle('${escapeHTML(article.id)}'); return false;">
                           READ FULL STORY →
                        </a>

                    </div>
                </article>
            `).join("");

            return `
                <section class="week-section" id="week-${key}">

                    <div class="week-heading">
                        <div>
                            <p class="eyebrow">WEEKLY EDITION</p>
                            <h2>${formatWeek(week.start)}</h2>
                            <p>${week.articles.length} published stories</p>
                        </div>

                        <button
                            class="print-week-button"
                            onclick="printWeek('${key}')">
                            PRINT THIS WEEK
                        </button>
                    </div>

                    <div class="news-grid">
                        ${cards}
                    </div>

                </section>
            `;
        }).join("");

    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <p>Unable to load news. Please refresh the page.</p>
        `;
    }
}

// ======================================
// READ FULL ARTICLE
// ======================================

async function readArticle(id) {
    try {
        const articles = await getArticles();

        const article = articles.find(
            item => String(item.id) === String(id)
        );

        if (!article) return;

        const container = document.getElementById("news-container");

        if (!container) return;

        container.innerHTML = `
            <div class="full-article">

                <button onclick="displayArticles()" class="back-button">
                    ← Back to Weekly Editions
                </button>

                ${article.image ? `
                    <img src="${escapeHTML(article.image)}"
                         class="full-article-image"
                         alt="${escapeHTML(article.title)}">
                ` : ""}

                <p class="news-category">
                    Entertainment • Film • Popular Culture
                </p>

                <h1>${escapeHTML(article.title)}</h1>

                <div class="article-meta">
                    <strong>By ${escapeHTML(article.author)}</strong>
                    <span>
                        Published: ${escapeHTML(formatDateTime(getArticleDate(article)))}
                    </span>
                </div>

                <div class="article-body">
                    ${escapeHTML(article.content).replace(/\n/g, "<br>")}
                </div>

            </div>
        `;

        window.scrollTo(0, 0);

    } catch (error) {
        alert("Unable to open this article.");
    }
}

// ======================================
// PRINT WEEKLY EDITION
// ======================================

function printWeek(key) {
    const section = document.getElementById("week-" + key);

    if (!section) return;

    document.querySelectorAll(".week-section").forEach(item => {
        item.classList.remove("print-target");
    });

    section.classList.add("print-target");
    document.body.classList.add("printing-week");

    window.print();

    document.body.classList.remove("printing-week");
    section.classList.remove("print-target");
}

// ======================================
// COMPRESS NEWS IMAGE
// ======================================

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(event) {
            const image = new Image();

            image.onload = function() {
                const canvas = document.createElement("canvas");

                const maxWidth = 1200;
                const maxHeight = 900;

                let width = image.width;
                let height = image.height;

                const scale = Math.min(
                    1,
                    maxWidth / width,
                    maxHeight / height
                );

                width = Math.round(width * scale);
                height = Math.round(height * scale);

                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext("2d");

                context.drawImage(image, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", 0.65));
            };

            image.onerror = () => reject(
                new Error("Unable to load image.")
            );

            image.src = event.target.result;
        };

        reader.onerror = () => reject(
            new Error("Unable to read image.")
        );

        reader.readAsDataURL(file);
    });
}

// ======================================
// PUBLISHER PAGE ARTICLES
// ======================================

async function displayPublisherArticles() {
    const container = document.getElementById("published-articles");

    if (!container) return;

    try {
        const articles = await getArticles();

        if (articles.length === 0) {
            container.innerHTML = `
                <p class="empty-news">No articles published yet.</p>
            `;
            return;
        }

        container.innerHTML = articles.map(article => `
            <div class="published-item">

                <div class="published-item-info">
                    <h3>${escapeHTML(article.title)}</h3>
                    <p>By ${escapeHTML(article.author)}</p>

                    <small>
                        ${escapeHTML(formatDateTime(getArticleDate(article)))}
                    </small>
                </div>

                <button
                    type="button"
                    class="delete-article-button"
                    data-delete-id="${escapeHTML(article.id)}">
                    DELETE
                </button>

            </div>
        `).join("");

    } catch (error) {
        console.error(error);
        container.innerHTML = "<p>Unable to load published articles.</p>";
    }
}

// ======================================
// DELETE ARTICLE
// ======================================

document.addEventListener("click", async function(event) {
    const button = event.target.closest(".delete-article-button");

    if (!button) return;

    const articleId = button.dataset.deleteId;

    if (!confirm("Are you sure you want to delete this article?")) {
        return;
    }

    button.disabled = true;

    try {
        const response = await fetch(
            `/api/articles/${encodeURIComponent(articleId)}`,
            { method: "DELETE" }
        );

        if (!response.ok) {
            throw new Error("Delete failed");
        }

        await displayArticles();
        await displayPublisherArticles();

        alert("Article deleted successfully!");

    } catch (error) {
        alert("Unable to delete article. Please try again.");
        button.disabled = false;
    }
});

// ======================================
// PUBLISH ARTICLE
// ======================================

const publishForm = document.getElementById("publish-form");

if (publishForm) {
    publishForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const author = document.getElementById("author").value.trim();
        const title = document.getElementById("title").value.trim();
        const imageFile = document.getElementById("image").files[0];
        const content = document.getElementById("content").value.trim();

        const message = document.getElementById("publish-message");
        const button = publishForm.querySelector(".submit-button");

        if (!author || !title || !content) {
            message.textContent = "Please complete all required fields.";
            return;
        }

        if (imageFile && !imageFile.type.startsWith("image/")) {
            message.textContent = "Please select a valid image.";
            return;
        }

        if (imageFile && imageFile.size > 5 * 1024 * 1024) {
            message.textContent = "Choose an image smaller than 5MB.";
            return;
        }

        button.disabled = true;
        button.textContent = "PUBLISHING...";

        try {
            let imageData = "";

            if (imageFile) {
                imageData = await compressImage(imageFile);
            }

            const newArticle = {
                author,
                title,
                image: imageData,
                content
            };

            const response = await fetch("/api/articles", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newArticle)
            });

            if (!response.ok) {
                throw new Error("Publishing failed");
            }

            message.textContent = "Article published successfully!";

            publishForm.reset();

            await displayArticles();
            await displayPublisherArticles();

        } catch (error) {
            console.error(error);
            message.textContent =
                "Publishing failed. Please try again.";
        } finally {
            button.disabled = false;
            button.textContent = "PUBLISH ARTICLE";
        }
    });
}

// ======================================
// LOAD ARTICLES WHEN PAGE OPENS
// ======================================

displayArticles();
displayPublisherArticles();
