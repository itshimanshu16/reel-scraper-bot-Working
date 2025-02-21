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
