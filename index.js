require("dotenv").config();
const { scrapeReels } = require("./scrapeMemes");
const addMusicToVideo = require("./addMusic");
const uploadToYouTube = require("./uploadToYouTube");

async function runBot() {
    try {
        console.log("🚀 Bot Started...");

        const videoPath = await scrapeReels();
        if (!videoPath) {
            console.error("❌ Failed to download reel.");
            return;
        }

        const finalVideoPath = await addMusicToVideo(videoPath);

        await uploadToYouTube(finalVideoPath);

        console.log("✅ Bot Completed Successfully!");
    } catch (error) {
        console.error("❌ Error running bot:", error);
    }
}

runBot();
