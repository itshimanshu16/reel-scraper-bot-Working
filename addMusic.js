const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

const MUSIC_DIR = "music/"; 

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
        console.log("🎵 Adding music:", musicFile);

        const outputFilePath = `videos/final_${Date.now()}.mp4`;

        ffmpeg()
            .input(videoPath)
            .input(musicFile)
            .outputOptions([
                "-c:v libx264",
                "-preset ultrafast",
                "-c:a aac",
                "-b:a 192k",
                "-shortest",
            ])
            .output(outputFilePath)
            .on("end", () => {
                console.log("✅ Music added:", outputFilePath);
                resolve(outputFilePath);
            })
            .on("error", (err) => {
                console.error("❌ Error adding music:", err);
                reject(err);
            })
            .run();
    });
}

module.exports = addMusicToVideo;
