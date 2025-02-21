const Tesseract = require("tesseract.js");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

async function extractTextFromReel(videoPath) {
    return new Promise((resolve, reject) => {
        const framePath = path.join(__dirname, "frame.jpg");

        // Extract a frame from the video
        ffmpeg(videoPath)
            .screenshots({
                timestamps: ["5%"], 
                filename: "frame.jpg",
                folder: __dirname,
                size: "640x?"
            })
            .on("end", async () => {
                console.log("🖼️ Frame extracted. Running OCR...");

                // Run OCR
                Tesseract.recognize(framePath, "eng")
                    .then(({ data: { text } }) => {
                        fs.unlinkSync(framePath);

                        let cleanText = text.replace(/[^a-zA-Z0-9\s!?'"#@]/g, "").trim();
                        if (!cleanText) cleanText = "🔥 Must Watch Funny Meme!";

                        // Catchy title (Ensure it's within 50 chars)
                        const title = cleanText.length > 50 ? cleanText.substring(0, 50) + "..." : cleanText;

                        // Engaging description
                        const description = `${cleanText}\n😂 Subscribe for more funny shorts!\n🎥 Watch till the end!\n#memes #funny #shorts #trend #viral`;

                        resolve({ title, description });
                    })
                    .catch(reject);
            })
            .on("error", reject);
    });
}

module.exports = extractTextFromReel;
