const fs = require("fs");
const path = require("path");

async function jalankanDeteksi() {
    try {
        const imagePath = path.join(__dirname, "../img/ai.jpg");
        if (!fs.existsSync(imagePath)) {
            console.error("File gambar tidak ditemukan:", imagePath);
            return;
        }

        const dataGambar = fs.readFileSync(imagePath);
        console.log("Sedang mengirim gambar ke Hugging Face (umm-maybe/AI-image-detector)...");

        const response = await fetch(
            "https://router.huggingface.co/hf-inference/models/umm-maybe/AI-image-detector",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + (process.env.HF_TOKEN || ""),
                    "Content-Type": "image/jpeg"
                },
                body: dataGambar,
            }
        );

        // Cek response status
        if (!response.ok) {
            const teksError = await response.text();
            console.log(`\n⚠️ Server merespons status ${response.status}:`);
            console.log(teksError);
            if (response.status === 402) {
                console.log("\n💡 Catatan Token Hugging Face:");
                console.log("Token Anda (RP) berjenis Fine-Grained tanpa 'Global permissions'.");
                console.log("Agar bisa mengakses model komunitas gratis, buat token baru di https://huggingface.co/settings/tokens");
                console.log("dan centang 'Make calls to the serverless Inference API' di bagian Global permissions.");
            }
            return;
        }

        const hasil = await response.json();

        if (hasil.error && hasil.error.includes("loading")) {
            console.log(`\n⏳ Model sedang bersiap di server Hugging Face (${Math.round(hasil.estimated_time || 15)} detik). Silakan coba lagi.`);
            return;
        }

        console.log("\n--- HASIL DETEKSI HUGGING FACE ---");
        console.log(JSON.stringify(hasil, null, 2));

        if (Array.isArray(hasil)) {
            let aiScore = 0;
            let realScore = 0;
            hasil.forEach(item => {
                const label = (item.label || '').toLowerCase();
                if (['artificial', 'ai', 'fake'].includes(label)) aiScore = item.score;
                if (['human', 'real'].includes(label)) realScore = item.score;
            });
            console.log("\nRingkasan Hasil:");
            console.log(`- Kemungkinan AI: ${(aiScore * 100).toFixed(1)}%`);
            console.log(`- Kemungkinan Asli: ${(realScore * 100).toFixed(1)}%`);
        }

    } catch (error) {
        console.error("\nTerjadi kesalahan teknis:", error.message);
    }
}

jalankanDeteksi();
