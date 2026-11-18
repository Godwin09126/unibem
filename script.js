
// ======================================
// THE TEAL SPOTLIGHT
// CONNECTED TO NODE.JS + SUPABASE
// ======================================

// Get articles from backend
// SUPABASE CONNECTION REMAINS THROUGH NODE.JS

async function getArticles() {
    const response = await fetch("/api/articles");

    if (!response.ok) {
        throw new Error("Failed to load articles");
    }

    return await response.json();
}


// ======================================
// ESCAPE HTML
// ======================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// ======================================
// GET ARTICLE DATE
// ======================================

function getArticleDate(article) {
    const date = article.publishedAt
        ? new Date(article.publishedAt)
        : new Date(article.date);

    return isNaN(date.getTime()) ? new Date() : date;
}


// ======================================
// FORMAT DATE AND TIME
// ======================================

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


// ======================================
// GET MONDAY OF THE WEEK
// ======================================

function getWeekStart(date) {
    const monday = new Date(date);
    monday.setHours(0, 0, 0, 0);

    const day = monday.getDay();
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));

    return monday;
}


// ======================================
// FORMAT WEEKLY EDITION
// ======================================

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

        if (!articles.length) {
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


        // WEEKLY EDITION PRINT CENTRE

        const printCentre = `
            <section class="print-centre">

                <p class="eyebrow">THE TEAL SPOTLIGHT</p>

                <h2>Weekly Edition Print Centre</h2>

                <p>Select the weekly editions you want to print.</p>

                <div class="print-centre-actions">

                    <button
                        type="button"
                        onclick="toggleAllWeeks()"
                        class="select-weeks-button"
                        id="select-all-weeks">
                        SELECT ALL
                    </button>

                    <button
                        type="button"
                        onclick="printSelectedWeeks()"
                        class="print-selected-button">
                        PRINT SELECTED EDITIONS
                    </button>

                </div>

                <p class="selected-week-count"
                   id="selected-week-count">
                    0 editions selected
                </p>

                <div class="week-selection-list">

                    ${sortedWeeks.map(key => `
                        <label class="week-selection-item">

                            <input
                                type="checkbox"
                                class="week-checkbox"
                                value="${key}"
                                onchange="updateSelectedWeekCount()"
                            >

                            <span>
                                ${formatWeek(weeks[key].start)}
                            </span>

                            <small>
                                ${weeks[key].articles.length} stories
                            </small>

                        </label>
                    `).join("")}

                </div>

            </section>
        `;


        // CREATE WEEKLY NEWS SECTIONS

        const weeklySections = sortedWeeks.map(key => {

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

                        ${article.subtitle ? `
                            <p class="news-subtitle">
                                ${escapeHTML(article.subtitle)}
                            </p>
                        ` : ""}

                        <div class="news-meta">

                            <span class="by-line">
                                By ${escapeHTML(article.author)}
                            </span>

                            <span class="publish-date">
                                Published:
                                ${escapeHTML(formatDateTime(getArticleDate(article)))}
                            </span>

                        </div>

                        <div class="news-description">
                            <p>
                                ${escapeHTML((article.content || "").substring(0, 150))}
                                ${(article.content || "").length > 150 ? "..." : ""}
                            </p>
                        </div>

                        <div class="print-full-content">

                            ${article.subtitle ? `
                                <p class="print-article-subtitle">
                                    ${escapeHTML(article.subtitle)}
                                </p>
                            ` : ""}

                            ${escapeHTML(article.content || "").replace(/\n/g, "<br>")}

                        </div>

                        <a
                            class="read-more"
                            href="#"
                            onclick="readArticle('${escapeHTML(article.id)}'); return false;">
                            READ FULL STORY →
                        </a>

                    </div>

                </article>

            `).join("");

            return `

                <section
                    class="week-section"
                    id="week-${key}"
                    data-week-key="${key}"
                >

                    <div class="week-heading">

                        <div>
                            <p class="eyebrow">WEEKLY EDITION</p>

                            <h2>${formatWeek(week.start)}</h2>

                            <p>
                                ${week.articles.length} published stories
                            </p>
                        </div>

                        <button
                            type="button"
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

        container.innerHTML = printCentre + weeklySections;

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <p>Unable to load news. Please refresh the page.</p>
        `;
    }
}


// ======================================
// WEEKLY EDITION SELECTION
// ======================================

function updateSelectedWeekCount() {

    const checkboxes = document.querySelectorAll(
        ".week-checkbox"
    );

    const selected = document.querySelectorAll(
        ".week-checkbox:checked"
    );

    const count = document.getElementById(
        "selected-week-count"
    );

    const selectButton = document.getElementById(
        "select-all-weeks"
    );

    if (count) {
        count.textContent =
            `${selected.length} of ${checkboxes.length} editions selected`;
    }

    if (selectButton) {
        selectButton.textContent =
            selected.length === checkboxes.length
                ? "DESELECT ALL"
                : "SELECT ALL";
    }
}


// ======================================
// SELECT ALL / DESELECT ALL
// ======================================

function toggleAllWeeks() {

    const checkboxes = document.querySelectorAll(
        ".week-checkbox"
    );

    const selected = document.querySelectorAll(
        ".week-checkbox:checked"
    );

    const selectEverything =
        selected.length !== checkboxes.length;

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectEverything;
    });

    updateSelectedWeekCount();
}


// ======================================
// PRINT SELECTED WEEKS
// ======================================

function printSelectedWeeks() {

    const selected = Array.from(
        document.querySelectorAll(".week-checkbox:checked")
    ).map(checkbox => checkbox.value);

    if (selected.length === 0) {
        alert("Please select at least one weekly edition.");
        return;
    }

    startWeeklyPrint(selected);
}


// ======================================
// PRINT ONE WEEK
// ======================================

function printWeek(key) {
    startWeeklyPrint([key]);
}


// ======================================
// COMMON PRINT FUNCTION
// ======================================

function startWeeklyPrint(keys) {

    document.querySelectorAll(".week-section").forEach(section => {
        section.classList.remove("print-target");
    });

    const validKeys = keys.filter(key => {
        return document.getElementById("week-" + key);
    });

    if (validKeys.length === 0) {
        alert("No weekly editions found.");
        return;
    }

    validKeys.forEach(key => {

        const section = document.getElementById("week-" + key);

        section.classList.add("print-target");

    });

    document.body.classList.add("printing-week");

    window.addEventListener("afterprint", function cleanup() {

        document.body.classList.remove("printing-week");

        document.querySelectorAll(".week-section").forEach(section => {
            section.classList.remove("print-target");
        });

    }, { once: true });

    window.print();
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

                <button
                    onclick="displayArticles()"
                    class="back-button">
                    ← Back to Weekly Editions
                </button>

                ${article.image ? `
                    <img
                        src="${escapeHTML(article.image)}"
                        class="full-article-image"
                        alt="${escapeHTML(article.title)}">
                ` : ""}

                <p class="news-category">
                    Entertainment • Film • Popular Culture
                </p>

                <h1>${escapeHTML(article.title)}</h1>

                ${article.subtitle ? `
                    <p class="article-subtitle">
                        ${escapeHTML(article.subtitle)}
                    </p>
                ` : ""}

                <div class="article-meta">

                    <strong>
                        By ${escapeHTML(article.author)}
                    </strong>

                    <span>
                        Published:
                        ${escapeHTML(formatDateTime(getArticleDate(article)))}
                    </span>

                </div>

                <div class="article-body">
                    ${escapeHTML(article.content || "").replace(/\n/g, "<br>")}
                </div>

            </div>

        `;

        window.scrollTo(0, 0);

    } catch (error) {

        console.error(error);
        alert("Unable to open this article.");

    }
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

                resolve(
                    canvas.toDataURL("image/jpeg", 0.65)
                );

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

    const container = document.getElementById(
        "published-articles"
    );

    if (!container) return;

    try {

        const articles = await getArticles();

        if (articles.length === 0) {

            container.innerHTML = `
                <p class="empty-news">
                    No articles published yet.
                </p>
            `;

            return;
        }

        container.innerHTML = articles.map(article => `

            <div class="published-item">

                <div class="published-item-info">

                    <h3>${escapeHTML(article.title)}</h3>

                    ${article.subtitle ? `
                        <p class="published-item-subtitle">
                            ${escapeHTML(article.subtitle)}
                        </p>
                    ` : ""}

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

        container.innerHTML = `
            <p>Unable to load published articles.</p>
        `;

    }
}


// ======================================
// DELETE ARTICLE
// ======================================

document.addEventListener("click", async function(event) {

    const button = event.target.closest(
        ".delete-article-button"
    );

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

        console.error(error);
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

        const subtitleField = document.getElementById("subtitle");
        const subtitle = subtitleField ? subtitleField.value.trim() : "";

        const imageFile = document.getElementById("image").files[0];

        const content = document.getElementById("content").value.trim();

        const message = document.getElementById("publish-message");

        const button = publishForm.querySelector(".submit-button");

        if (!author || !title || !subtitle || !content) {

            message.textContent =
                "Please complete all required fields.";

            return;
        }

        if (imageFile && !imageFile.type.startsWith("image/")) {

            message.textContent =
                "Please select a valid image.";

            return;
        }

        if (imageFile && imageFile.size > 5 * 1024 * 1024) {

            message.textContent =
                "Choose an image smaller than 5MB.";

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
                subtitle,
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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Publishing failed");
            }

            message.textContent =
                "Article published successfully!";

            publishForm.reset();

            await displayArticles();

            await displayPublisherArticles();

        } catch (error) {

            console.error(error);

            message.textContent =
                error.message || "Publishing failed. Please try again.";

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
