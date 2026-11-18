
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

// Allow multiple image uploads
app.use(express.json({ limit: "75mb" }));
app.use(express.static(__dirname));

// Convert database records to website format
function formatArticle(article) {
    const images =
        Array.isArray(article.image_urls) &&
        article.image_urls.length > 0
            ? article.image_urls
            : article.image_url
                ? [article.image_url]
                : [];

    return {
        id: article.id,
        author: article.author,
        title: article.title,
        subtitle: article.subtitle || "",
        image: images[0] || "",
        images: images,
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

// PUBLISH ARTICLE WITH MULTIPLE IMAGES
app.post("/api/articles", async (req, res) => {
    const uploadedPaths = [];

    try {
        const { author, title, subtitle, content } = req.body;

        // Support old single-image and new multiple-image formats
        const images = Array.isArray(req.body.images)
            ? req.body.images
            : req.body.image
                ? [req.body.image]
                : [];

        if (!author || !title || !content) {
            return res.status(400).json({
                error: "Author, title and content are required."
            });
        }

        if (images.length > 10) {
            return res.status(400).json({
                error: "You can upload a maximum of 10 pictures."
            });
        }

        const imageUrls = [];
        const imagePaths = [];

        // Upload each picture to Supabase Storage
        for (const image of images) {
            if (typeof image !== "string") {
                throw new Error("Invalid image data.");
            }

            const match = image.match(
                /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/
            );

            if (!match) {
                throw new Error("Invalid image format.");
            }

            const mimeType = match[1];
            const imageBuffer = Buffer.from(match[2], "base64");

            if (imageBuffer.length > 5 * 1024 * 1024) {
                throw new Error("Each picture must not exceed 5MB.");
            }

            const extension = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp",
                "image/gif": "gif"
            }[mimeType];

            const uploadedPath =
                `${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabase
                .storage
                .from("news-images")
                .upload(uploadedPath, imageBuffer, {
                    contentType: mimeType,
                    cacheControl: "31536000",
                    upsert: false
                });

            if (uploadError) throw uploadError;

            uploadedPaths.push(uploadedPath);

            const { data: publicData } = supabase
                .storage
                .from("news-images")
                .getPublicUrl(uploadedPath);

            imageUrls.push(publicData.publicUrl);
            imagePaths.push(uploadedPath);
        }

        // Save article and all picture information
        const { data, error } = await supabase
            .from("articles")
            .insert({
                author,
                title,
                subtitle: subtitle || "",
                content,

                // Keep old columns working
                image_url: imageUrls[0] || "",
                image_path: imagePaths[0] || null,

                // New multiple-image columns
                image_urls: imageUrls,
                image_paths: imagePaths
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(formatArticle(data));

    } catch (error) {
        console.error("Publishing error:", error);

        // Remove uploaded pictures if publishing fails
        if (uploadedPaths.length > 0) {
            const { error: cleanupError } = await supabase
                .storage
                .from("news-images")
                .remove(uploadedPaths);

            if (cleanupError) {
                console.error("Image cleanup error:", cleanupError);
            }
        }

        res.status(500).json({
            error: error.message || "Could not publish article."
        });
    }
});

// DELETE ARTICLE AND ALL ITS IMAGES
app.delete("/api/articles/:id", async (req, res) => {
    try {
        const { data: article, error: findError } = await supabase
            .from("articles")
            .select("*")
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

        // Collect all old and new picture paths
        const imagePaths = new Set([
            ...(Array.isArray(article.image_paths)
                ? article.image_paths
                : []),
            ...(article.image_path
                ? [article.image_path]
                : [])
        ]);

        if (imagePaths.size > 0) {
            const { error: imageError } = await supabase
                .storage
                .from("news-images")
                .remove([...imagePaths]);

            if (imageError) {
                console.error("Image cleanup error:", imageError);
            }
        }

        res.json({
            message: "Article and its pictures deleted successfully."
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
    console.log("Multiple image upload enabled.");
});
