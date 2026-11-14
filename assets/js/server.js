// RealPict - Hugging Face Inference Server Script
// Menggunakan token Hugging Face untuk mendeteksi gambar AI
const fs = require("fs");
const path = require("path");

const HF_TOKEN = process.env.HF_TOKEN || "";
const MODEL_NAME = "umm-maybe/AI-image-detector";

async function runInference(imageRelativePath = "../img/ai.jpg") {
    const fullPath = path.resolve(__dirname, imageRelativePath);
    if (!fs.existsSync(fullPath)) {
        console.error("Gambar tidak ditemukan di:", fullPath);
        return;
    }

    const imageBuffer = fs.readFileSync(fullPath);
    console.log(`Mengirim file '${path.basename(fullPath)}' ke model ${MODEL_NAME}...`);

    try {
        const response = await fetch(
            `https://router.huggingface.co/hf-inference/models/${MODEL_NAME}`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HF_TOKEN}`,
                    "Content-Type": "image/jpeg"
                },
                body: imageBuffer
            }
        );

        const data = await response.json();
        console.log("Status respons:", response.status);
        console.log("Hasil analisis:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Gagal terhubung ke Hugging Face:", err.message);
    }
}

runInference();
