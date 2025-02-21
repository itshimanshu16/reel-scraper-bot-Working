require("dotenv").config();
const Apify = require("apify");
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

// Set the FFmpeg path to use the installed binary
ffmpeg.setFfmpegPath(ffmpegPath);

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const INSTAGRAM_SESSION_ID = process.env.INSTAGRAM_SESSION_ID;

// List of Instagram pages to scrape memes from
const INSTAGRAM_USERNAMES = [
    "dank.memes", "sarcasm_only", "fuckjerry"
];

// ✅ Scrape Instagram Reels
async function scrapeInstagramReels(username, resultsLimit = 1) {
    if (!APIFY_TOKEN || !INSTAGRAM_SESSION_ID) {
        console.error("❌ Missing APIFY_TOKEN or INSTAGRAM_SESSION_ID in .env file!");
        return [];
    }

    try {
        console.log(`🔍 Scraping Instagram Reels from: https://www.instagram.com/${username}/`);

        const client = new Apify.ApifyClient({ token: APIFY_TOKEN });

        const run = await client.actor("apify/instagram-scraper").call({
            directUrls: [`https://www.instagram.com/${username}/`],
            resultsLimit,
            sessionId: INSTAGRAM_SESSION_ID,
            scrapePosts: true,
            scrapeReels: true,
            proxyConfig: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log("📦 Raw Scraped Items:", items.length);

        const reelVideos = items
            .filter(item => item.videoUrl)
            .slice(0, resultsLimit)
            .map(item => ({
                videoUrl: item.videoUrl,
                title: item.caption || "Untitled",
            }));

        if (!reelVideos.length) {
            console.log("❌ No valid reels found!");
            return [];
        }

        console.log(`✅ Found ${reelVideos.length} reel(s) to download.`);
        return reelVideos;

    } catch (error) {
        console.error("❌ Error scraping reels:", error.response ? error.response.data : error);
        return [];
    }
}

// ✅ Download Reels
async function downloadReels(reels) {
    if (!reels.length) {
        console.log("❌ No reels to download.");
        return null;
    }

    const downloadFolder = path.join(__dirname, "downloads");
    if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder, { recursive: true });
    }

    const reel = reels[0]; // Download only one reel
    try {
        console.log(`⬇️ Downloading: ${reel.title}`);

        const response = await axios({
            url: reel.videoUrl,
            method: "GET",
            responseType: "stream",
        });

        const originalFilePath = path.join(downloadFolder, `reel_${Date.now()}.mp4`);
        const writer = fs.createWriteStream(originalFilePath);

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log(`✅ Downloaded: ${originalFilePath}`);

        // 🎯 Mute the downloaded video
        const mutedFilePath = await muteAudio(originalFilePath);
        return mutedFilePath; // Return muted video path

    } catch (error) {
        console.error(`❌ Error downloading reel: ${reel.videoUrl}`, error);
        return null;
    }
}

// 🔇 Mute Audio Function
async function muteAudio(videoPath) {
    return new Promise((resolve, reject) => {
        const mutedFilePath = videoPath.replace(".mp4", "_muted.mp4");

        ffmpeg(videoPath.replace(/\\/g, "/")) // Normalize path
            .noAudio()
            .output(mutedFilePath)
            .on("end", () => {
                console.log("🔇 Audio muted successfully:", mutedFilePath);
                resolve(mutedFilePath);
            })
            .on("error", (err) => {
                console.error("❌ Error muting audio:", err);
                reject(err);
            })
            .run();
    });
}

// ✅ Export function to scrape & download reels
async function scrapeReels() {
    const randomUsername = INSTAGRAM_USERNAMES[Math.floor(Math.random() * INSTAGRAM_USERNAMES.length)];
    console.log(`🎯 Selected Random Account: ${randomUsername}`);

    const reels = await scrapeInstagramReels(randomUsername, 1);
    return await downloadReels(reels);
}

module.exports = { scrapeReels };
