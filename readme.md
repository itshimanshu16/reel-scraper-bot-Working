addMusic.js
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

const MUSIC_DIR = "music/"; // Folder containing music files
const OUTPUT_VIDEO = "videos/final_shorts.mp4"; // Final video with music

function getRandomMusic() {
    const files = fs.readdirSync(MUSIC_DIR).filter((file) => file.endsWith(".mp3"));
    if (files.length === 0) {
        throw new Error("❌ No music files found in the 'music/' directory!");
    }
    return path.join(MUSIC_DIR, files[Math.floor(Math.random() * files.length)]);
}

async function addMusicToVideo(videoPath) {
    return new Promise((resolve, reject) => {
        const musicFile = getRandomMusic();
        console.log("🎵 Adding background music:", musicFile);

        ffmpeg()
            .input(videoPath)
            .input(musicFile)
            .outputOptions([
                "-c:v libx264",
                "-preset ultrafast",
                "-c:a aac",
                "-b:a 192k",
                "-shortest", // Ensures music doesn't extend past video length
            ])
            .output(OUTPUT_VIDEO)
            .on("end", () => {
                console.log("✅ Music added successfully:", OUTPUT_VIDEO);
                resolve(OUTPUT_VIDEO);
            })
            .on("error", (err) => {
                console.error("❌ Error adding music:", err);
                reject(err);
            })
            .run();
    });
}

module.exports = addMusicToVideo;




this is my client_secret.json
{"installed":{"client_id":"554511595862-ofsnsd2ipph34aql3m1ld9pqdo3j9g7p.apps.googleusercontent.com","project_id":"ringed-bond-450714-c0","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"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","redirect_uris":["http://localhost"]}}






createVideo.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

async function createVideo(memePath) {
    try {
        console.log("🎥 Processing video...");

        const outputPath = path.join(__dirname, 'output', `short_${Date.now()}.mp4`);
        
        return new Promise((resolve, reject) => {
            ffmpeg(memePath)
                .input('./track1.mp3') // Add background music
                .outputOptions([
                    '-c:v libx264',
                    '-preset fast',
                    '-c:a aac',
                    '-b:a 192k',
                    '-shortest'
                ])
                .save(outputPath)
                .on('end', () => {
                    console.log(`✅ Video created: ${outputPath}`);
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error("❌ Error processing video:", err);
                    reject(err);
                });
        });

    } catch (error) {
        console.error("❌ Error in createVideo:", error);
        return null;
    }
}

module.exports = createVideo;




extractTitle.js
const Tesseract = require("tesseract.js");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

// Extract text from first frame of the video
async function extractTextFromReel(videoPath) {
    return new Promise((resolve, reject) => {
        const framePath = path.join(__dirname, "frame.jpg");

        // Extract a frame from the video
        ffmpeg(videoPath)
            .screenshots({
                timestamps: ["5%"], // Capture a frame from the start of the video
                filename: "frame.jpg",
                folder: __dirname,
                size: "640x?"
            })
            .on("end", async () => {
                console.log("🖼️ Frame extracted. Running OCR...");

                // Run OCR on the extracted frame
                Tesseract.recognize(framePath, "eng")
                    .then(({ data: { text } }) => {
                        console.log("📜 Extracted Text:", text);
                        fs.unlinkSync(framePath); // Delete frame after processing

                        const cleanText = text.trim() || "🔥 Funny Meme Shorts #shorts";
                        
                        // Dynamic Title & Description
                        const title = cleanText.length > 50 ? cleanText.substring(0, 50) + "..." : cleanText;
                        const description = `${cleanText}\n😂 Subscribe for more funny shorts!\n#memes #funny #shorts`;

                        resolve({ title, description });
                    })
                    .catch(reject);
            })
            .on("error", reject);
    });
}

module.exports = extractTextFromReel;





index.js
require("dotenv").config();
const { scrapeReels } = require("./scrapeMemes");
const addMusicToVideo = require("./addMusic");
const uploadToYouTube = require("./uploadToYouTube");

async function runBot() {
    try {
        console.log("🚀 Bot Started...");

        // Step 1: Scrape and download Reels
        const videoPath = await scrapeReels();
        if (!videoPath) {
            console.error("❌ Failed to download reel.");
            return;
        }

        // Step 2: Add Background Music
        const finalVideoPath = await addMusicToVideo(videoPath);

        // Step 3: Upload to YouTube Shorts
        await uploadToYouTube(finalVideoPath);

        console.log("✅ Bot Completed Successfully!");
    } catch (error) {
        console.error("❌ Error running bot:", error);
    }
}

// Run the bot
runBot();






scrapeMemes.js


require("dotenv").config();
const Apify = require("apify");
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const INSTAGRAM_SESSION_ID = process.env.INSTAGRAM_SESSION_ID;

// List of Instagram pages to scrape memes from
const INSTAGRAM_USERNAMES = [
    "dank.memes", "funnyvids", "epicfunnypage", "sarcasm_only",
    "pubity", "thelaughplanet", "fuckjerry", "9gag", "memebase"
];

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
            resultsLimit: resultsLimit,
            sessionId: INSTAGRAM_SESSION_ID,
            scrapePosts: true,
            scrapeReels: true,
            proxyConfig: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log("📦 Raw Scraped Items:", items);

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
        console.error("❌ Error scraping reels:", error);
        return [];
    }
}

async function downloadReels(reels) {
    if (!reels.length) {
        console.log("❌ No reels to download.");
        return null;
    }

    const downloadFolder = path.join(__dirname, "downloads");
    if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder);
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

        ffmpeg(videoPath.replace(/\\/g, "/")) // Ensure path format works for FFmpeg
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

// Export function
async function scrapeReels() {
    const randomUsername = INSTAGRAM_USERNAMES[Math.floor(Math.random() * INSTAGRAM_USERNAMES.length)];
    console.log(`🎯 Selected Random Account: ${randomUsername}`);

    const reels = await scrapeInstagramReels(randomUsername, 1);
    return await downloadReels(reels);
}

module.exports = { scrapeReels };






uploadToYouTube.js
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

        // ✅ Sanitize and limit description length
        function sanitizeDescription(text) {
            return text
                .replace(/[^a-zA-Z0-9.,!? \n]/g, "") // Remove special characters
                .replace(/\s+/g, " ") // Remove excessive spaces
                .trim()
                .slice(0, 4900); // Keep under YouTube's limit
        }

        const sanitizedDescription = sanitizeDescription(description || "😂 Subscribe for more funny shorts! #memes #funny #shorts");

        console.log("🔹 Final Video Description:", sanitizedDescription); // Debugging

        const response = await youtube.videos.insert({
            part: "snippet,status",
            requestBody: {
                snippet: {
                    title: title || "🔥 Funny Meme Shorts #shorts",
                    description: sanitizedDescription, // ✅ Use sanitized description
                    tags: ["meme", "shorts", "funny"],
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

        console.log("✅ Video uploaded:", response.data.id);

        // 🗑️ Delete files after successful upload
        await deleteFiles(videoPath);

    } catch (error) {
        console.error("❌ Error uploading video:", error);
    }
}

// 🗑️ Function to delete files and folders
async function deleteFiles(videoPath) {
    try {
        // Delete the uploaded video file
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
            console.log(`🗑️ Deleted file: ${videoPath}`);
        }

        // Define directories to clean
        const directories = ["downloads", "videos"];

        directories.forEach((dir) => {
            const dirPath = path.join(__dirname, dir);
            if (fs.existsSync(dirPath)) {
                fs.readdirSync(dirPath).forEach((file) => {
                    const filePath = path.join(dirPath, file);
                    if (fs.lstatSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Deleted file: ${filePath}`);
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



package.json
{
  "name": "bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "apify": "^3.2.6",
    "apify-client": "^2.12.0",
    "axios": "^1.7.9",
    "cron": "^3.5.0",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "fluent-ffmpeg": "^2.1.3",
    "fs": "^0.0.1-security",
    "fs-extra": "^11.3.0",
    "google-auth-library": "^9.15.1",
    "googleapis": "^144.0.0",
    "node-cron": "^3.0.3",
    "opn": "^6.0.0",
    "path": "^0.12.7",
    "puppeteer": "^24.1.1",
    "tesseract.js": "^6.0.0"
  },
  "description": ""
}








My bot is working well but i want that 
1- i can change the youtube channel easily on which the video gets uploaded 
2- also wants that It fetch one latest reel from 4-5 Instagram users (which i give) and upload 5 videos per day
3- give code with filename and structure of it 
4- I also want to upload it to aws afterwards so it runs 24/7 even my laptop is off and it uploads reels daily without manually doing 