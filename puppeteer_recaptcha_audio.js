const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// ffmpeg yolunu otomatik bul veya elle belirt
let ffmpegPath = 'C:\\Users\\ASUS\\Desktop\\ffmpeg-7.0.2-essentials_build\\bin\\ffmpeg.exe';
if (!process.env.PATH.toLowerCase().includes('ffmpeg')) {
    // Eğer ffmpeg.exe'nin tam yolunu biliyorsan buraya yaz:
    // ffmpegPath = 'C:/ffmpeg/bin/ffmpeg.exe';
}

async function downloadAudio(url, filePath) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
}

async function mp3ToWav(mp3Path, wavPath) {
    try {
        execSync(`${ffmpegPath} -y -i "${mp3Path}" "${wavPath}"`);
    } catch (err) {
        console.error('\n[HATA] ffmpeg çalıştırılamadı. ffmpegPath ayarını ve PATH değişkenini kontrol et!\n');
        throw err;
    }
}

async function solveRecaptchaAudio(page, maxTries = 3, maxLoops = 5) {
    try {
        // reCAPTCHA anchor'a tıkla
        let frames = page.frames();
        let anchorFrame = frames.find(f => f.url().includes('api2/anchor'));
        await anchorFrame.click('#recaptcha-anchor');
        await page.waitForTimeout(1500);

        let solved = false;
        let lastError = null;
        let loopCount = 0;
        while (!solved && loopCount < maxLoops) {
            loopCount++;
            let challengeSolved = false;
            for (let attempt = 1; attempt <= maxTries; attempt++) {
                try {
                    // Her denemede güncel frame'leri tekrar bul
                    frames = page.frames();
                    let challengeFrame = frames.find(f => f.url().includes('api2/bframe'));
                    if (!challengeFrame) {
                        // Eğer daha önce transcript yazıldıysa, çözüm başarılıdır, loop'u kır
                        const logs = fs.existsSync(path.join(__dirname, 'transcript_log.txt')) ? fs.readFileSync(path.join(__dirname, 'transcript_log.txt'), 'utf-8') : '';
                        if (logs && logs.includes('Çözülen cevap:')) {
                            console.log('[reCAPTCHA] Çözülen cevap bulundu, loop sonlandırılıyor.');
                            solved = true;
                            challengeSolved = true;
                            break;
                        }
                        throw new Error('Challenge frame bulunamadı.');
                    }
                    // Eğer audio butonu görünmüyorsa tekrar anchor'a tıkla
                    const audioBtn = await challengeFrame.$('#recaptcha-audio-button');
                    if (!audioBtn) {
                        // Bazı durumlarda yeni challenge için anchor'a tekrar tıklamak gerekebilir
                        anchorFrame = page.frames().find(f => f.url().includes('api2/anchor'));
                        if (anchorFrame) {
                            await anchorFrame.click('#recaptcha-anchor');
                            await page.waitForTimeout(1000);
                        }
                        throw new Error('Audio butonu bulunamadı.');
                    }
                    // Kulaklık simgesi bulunduktan sonra insansı bekleme
                    await page.waitForTimeout(3000 + Math.random() * 2000); // 3-5 saniye arası bekle
                    await audioBtn.click();
                    await page.waitForTimeout(1500);

                    // Ses dosyasını indir
                    const audioSrc = await challengeFrame.$eval('#audio-source', el => el.src);
                    const mp3Path = path.join(__dirname, 'audio.mp3');
                    const wavPath = path.join(__dirname, 'audio.wav');
                    await downloadAudio(audioSrc, mp3Path);
                    await mp3ToWav(mp3Path, wavPath);

                    // Whisper ile çözüm
                    try {
                        const ffmpegDir = path.dirname(ffmpegPath);
                        const env = Object.assign({}, process.env, { PATH: ffmpegDir + path.delimiter + process.env.PATH });
                        execSync(`whisper "${wavPath}" --language en --model base --output_format txt`, { stdio: 'inherit', env });
                    } catch (err) {
                        console.error('\n[HATA] Whisper ile çözüm başarısız. whisper kurulumunu ve PATH ayarını kontrol et!\n');
                        throw err;
                    }
                    const transcript = fs.readFileSync(path.join(__dirname, 'audio.txt'), 'utf-8').trim();
                    console.log('Çözülen cevap:', transcript);
                    fs.appendFileSync(path.join(__dirname, 'transcript_log.txt'), 'Çözülen cevap: ' + transcript + '\n');

                    // Cevabı inputa yaz
                    await challengeFrame.type('#audio-response', transcript, { delay: 50 });
                    await challengeFrame.click('#recaptcha-verify-button');
                    await page.waitForTimeout(2000);

                    // Temizlik
                    fs.unlinkSync(mp3Path);
                    fs.unlinkSync(wavPath);
                    fs.unlinkSync(path.join(__dirname, 'audio.txt'));

                    // Doğru çözülüp çözülmediğini kontrol et
                    const stillHasAudio = await challengeFrame.$('#audio-source');
                    const errorMsg = await challengeFrame.$eval('.rc-audiochallenge-error-message', el => el.innerText).catch(() => '');
                    if (!stillHasAudio && !errorMsg) {
                        solved = true;
                        challengeSolved = true;
                        break;
                    }
                    if (errorMsg && errorMsg.trim()) {
                        console.log(`[reCAPTCHA] Hata mesajı: ${errorMsg.trim()}`);
                    }
                } catch (err) {
                    lastError = err;
                    // Eğer çözülen cevap loglandıysa, loop'u bitir
                    const logs = fs.existsSync(path.join(__dirname, 'transcript_log.txt')) ? fs.readFileSync(path.join(__dirname, 'transcript_log.txt'), 'utf-8') : '';
                    if (logs && logs.includes('Çözülen cevap:')) {
                        console.log('[reCAPTCHA] Çözülen cevap bulundu, loop sonlandırılıyor.');
                        solved = true;
                        challengeSolved = true;
                        break;
                    }
                    console.log(`[reCAPTCHA] Sesli çözüm denemesi başarısız (deneme ${attempt}):`, err.message);
                    await page.waitForTimeout(1500);
                }
            }
            if (!challengeSolved) {
                // Yeni bir challenge gelmiş olabilir, tekrar başa dön
                // Yine de çözülen cevap varsa loop'u bitir
                const logs = fs.existsSync(path.join(__dirname, 'transcript_log.txt')) ? fs.readFileSync(path.join(__dirname, 'transcript_log.txt'), 'utf-8') : '';
                if (logs && logs.includes('Çözülen cevap:')) {
                    console.log('[reCAPTCHA] Çözülen cevap bulundu, loop sonlandırılıyor.');
                    solved = true;
                    break;
                }
                console.log(`[reCAPTCHA] Yeni challenge veya hata, tekrar denenecek (loop ${loopCount})`);
                await page.waitForTimeout(2000);
            }
        }
        if (!solved) throw lastError || new Error('Sesli reCAPTCHA çözülemedi.');
    } catch (err) {
        console.error('\n[HATA] Sesli reCAPTCHA çözümü sırasında hata oluştu. Manuel müdahale gerekebilir.\n');
        throw err;
    }
}

// (async () => {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();
//     await page.goto('https://www.google.com/recaptcha/api2/demo', { waitUntil: 'networkidle2' });
//     await page.waitForTimeout(2000);
//     await solveRecaptchaAudio(page);
//     await page.waitForTimeout(5000);
//     await browser.close();
// })();

module.exports = { solveRecaptchaAudio };
