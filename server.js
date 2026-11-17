
require("dotenv").config();

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.error("Supabase credentials are missing.");
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

// Convert database records to the format used by your website
function formatArticle(article) {
    return {
        id: article.id,
        author: article.author,
        title: article.title,
        image: article.image_url || "",
        content: article.content,
        publishedAt: article.created_at
    };
}

// GET ALL ARTICLES
app.get("/api/articles", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("articles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json(data.map(formatArticle));

    } catch (error) {
        console.error("Loading error:", error);
        res.status(500).json({
            error: "Could not load articles."
        });
    }
});

// PUBLISH ARTICLE AND UPLOAD IMAGE
app.post("/api/articles", async (req, res) => {
    let uploadedPath = null;

    try {
        const { author, title, image, content } = req.body;

        if (!author || !title || !content) {
            return res.status(400).json({
                error: "Author, title and content are required."
            });
        }

        let imageUrl = "";

        if (image) {
            const match = image.match(
                /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/
            );

            if (!match) {
                return res.status(400).json({
                    error: "Invalid image format."
                });
            }

            const mimeType = match[1];
            const imageBuffer = Buffer.from(match[2], "base64");

            if (imageBuffer.length > 5 * 1024 * 1024) {
                return res.status(400).json({
                    error: "Image must not exceed 5MB."
                });
            }

            const extension = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp",
                "image/gif": "gif"
            }[mimeType];

            uploadedPath = `${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabase
                .storage
                .from("news-images")
                .upload(uploadedPath, imageBuffer, {
                    contentType: mimeType,
                    cacheControl: "31536000",
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase
                .storage
                .from("news-images")
                .getPublicUrl(uploadedPath);

            imageUrl = publicData.publicUrl;
        }

        const { data, error } = await supabase
            .from("articles")
            .insert({
                author,
                title,
                content,
                image_url: imageUrl,
                image_path: uploadedPath
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(formatArticle(data));

    } catch (error) {
        console.error("Publishing error:", error);

        // Remove uploaded image if article saving fails
        if (uploadedPath) {
            await supabase.storage
                .from("news-images")
                .remove([uploadedPath]);
        }

        res.status(500).json({
            error: "Could not publish article."
        });
    }
});

// DELETE ARTICLE AND ITS IMAGE
app.delete("/api/articles/:id", async (req, res) => {
    try {
        const { data: article, error: findError } = await supabase
            .from("articles")
            .select("id, image_path")
            .eq("id", req.params.id)
            .maybeSingle();

        if (findError) throw findError;

        if (!article) {
            return res.status(404).json({
                error: "Article not found."
            });
        }

        const { error: deleteError } = await supabase
            .from("articles")
            .delete()
            .eq("id", req.params.id);

        if (deleteError) throw deleteError;

        if (article.image_path) {
            const { error: imageError } = await supabase
                .storage
                .from("news-images")
                .remove([article.image_path]);

            if (imageError) {
                console.error("Image cleanup error:", imageError);
            }
        }

        res.json({
            message: "Article and image deleted successfully."
        });

    } catch (error) {
        console.error("Delete error:", error);

        res.status(500).json({
            error: "Could not delete article."
        });
    }
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Teal Spotlight running on port ${PORT}`);
    console.log("Supabase backend configured.");
});
