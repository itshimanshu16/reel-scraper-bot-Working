const extractTextFromReel = require("./extractTitle");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function uploadToYouTube(videoPath) {
    if (!fs.existsSync(videoPath)) {
        console.error("❌ Video file not found!");
        return;
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        "http://localhost:3000/auth/google/callback"
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    });

    const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
    });

    try {
        const { title, description } = await extractTextFromReel(videoPath);

        // ✅ Function to sanitize & limit description length
        function sanitizeDescription(text) {
            return text
                .replace(/[^a-zA-Z0-9.,!? \n]/g, "") // Remove special characters
                .replace(/\s+/g, " ") // Remove excessive spaces
                .trim()
                .slice(0, 4900); // Keep under YouTube's limit
        }

        const sanitizedTitle = title || "🔥 Funny Meme Shorts #shorts";
        const sanitizedDescription = sanitizeDescription(description || "😂 Subscribe for more funny shorts! #memes #funny #shorts");

        console.log("🔹 Final Video Title:", sanitizedTitle);
        console.log("🔹 Final Video Description:", sanitizedDescription);

        const response = await youtube.videos.insert({
            part: "snippet,status",
            requestBody: {
                snippet: {
                    title: sanitizedTitle,
                    description: sanitizedDescription,
                    tags: ["meme", "shorts", "funny", "trending", "viral"],
                    categoryId: "23",
                },
                status: {
                    privacyStatus: "public",
                },
            },
            media: {
                body: fs.createReadStream(videoPath),
            },
        });

        console.log("✅ Video uploaded successfully! Video ID:", response.data.id);

        // 🗑️ Clean up temporary files
        await deleteFiles(videoPath);

    } catch (error) {
        console.error("❌ Error uploading video:", error.response ? error.response.data : error);
    }
}

// 🗑️ Function to delete files & clean folders
async function deleteFiles(videoPath) {
    try {
        // Delete uploaded video
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
            console.log(`🗑️ Deleted file: ${videoPath}`);
        }

        // Clean up "downloads" and "videos" directories
        const directories = ["downloads", "videos"];
        directories.forEach((dir) => {
            const dirPath = path.join(__dirname, dir);
            if (fs.existsSync(dirPath)) {
                fs.readdirSync(dirPath).forEach((file) => {
                    const filePath = path.join(dirPath, file);
                    if (fs.lstatSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Deleted temp file: ${filePath}`);
                    }
                });
            }
        });

        console.log("✅ All temporary files deleted.");

    } catch (error) {
        console.error("❌ Error deleting files:", error);
    }
}

module.exports = uploadToYouTube;
