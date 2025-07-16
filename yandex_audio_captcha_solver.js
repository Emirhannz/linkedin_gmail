// Yandex SmartCaptcha sesli doğrulama otomatik çözüm örneği
// Not: Yandex'in CAPTCHA DOM yapısı değişirse, selector'lar güncellenmelidir.
// Bu kod, sesli doğrulama (audio challenge) çıktığında otomatik çözüm dener.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');

// ffmpeg ve whisper ayarları
defaultFfmpegPath = 'C:/Users/ASUS/Desktop/ffmpeg-7.0.2-essentials_build/bin/ffmpeg.exe';

async function downloadAudio(url, filePath) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
}

async function mp3ToWav(mp3Path, wavPath, ffmpegPath = defaultFfmpegPath) {
    execSync(`${ffmpegPath} -y -i "${mp3Path}" "${wavPath}"`);
}

async function solveYandexAudioCaptcha(page) {
    // 1. Sesli doğrulama butonunu bul ve tıkla
    const audioBtn = await page.$('button[aria-label*="audio"]');
    if (!audioBtn) throw new Error('Sesli doğrulama butonu bulunamadı!');
    await audioBtn.click();
    await page.waitForTimeout(2000);

    // 2. Ses dosyasının URL'sini bul
    const audioSrc = await page.$eval('audio', el => el.src);
    if (!audioSrc) throw new Error('Ses dosyası bulunamadı!');
    const mp3Path = path.join(__dirname, 'yandex_audio.mp3');
    const wavPath = path.join(__dirname, 'yandex_audio.wav');
    await downloadAudio(audioSrc, mp3Path);
    await mp3ToWav(mp3Path, wavPath);

    // 3. Whisper ile çözüm
    execSync(`whisper "${wavPath}" --language ru --model base --output_format txt`, { stdio: 'inherit' });
    const transcript = fs.readFileSync(path.join(__dirname, 'yandex_audio.txt'), 'utf-8').trim();
    console.log('Yandex CAPTCHA çözülen cevap:', transcript);

    // 4. Cevabı inputa yaz
    const input = await page.$('input[type="text"]');
    if (!input) throw new Error('Cevap inputu bulunamadı!');
    await input.type(transcript, { delay: 50 });
    await page.waitForTimeout(500);
    // Onayla butonuna tıkla
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await page.waitForTimeout(2000);

    // Temizlik
    fs.unlinkSync(mp3Path);
    fs.unlinkSync(wavPath);
    fs.unlinkSync(path.join(__dirname, 'yandex_audio.txt'));
}

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // Test için örnek bir Yandex CAPTCHA sayfası aç
    await page.goto('https://yandex.com/showcaptcha?...', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    try {
        await solveYandexAudioCaptcha(page);
        console.log('Yandex CAPTCHA otomatik çözüldü!');
    } catch (err) {
        console.error('Yandex CAPTCHA çözümünde hata:', err);
    }
    await browser.close();
})();
