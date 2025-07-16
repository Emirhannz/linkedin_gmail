const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const Excel = require('exceljs');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { solveRecaptchaAudio } = require('./puppeteer_recaptcha_audio');
const { humanMove, naturalScroll, randomMouseMovements, humanLikeMouseMovements, advancedHumanMouseMovements, advancedSmoothMouseMovements, advancedSmoothMouseMovementsBackground } = require('./lib/helpers/human.mouse');
const installMouseHelper = require('./lib/helpers/show.mouse');


// Gelişmiş fingerprint enjeksiyonu
async function injectAdvancedFingerprints(page) {
    await page.evaluateOnNewDocument(() => {
        // WebGL fingerprint
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            switch(parameter) {
                case 37445: return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
                case 37446: return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
                default: return getParameter.call(this, parameter);
            }
        };

        // Canvas fingerprint
        const oldGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type) {
            const context = oldGetContext.apply(this, arguments);
            if (type === '2d') {
                const oldGetImageData = context.getImageData;
                context.getImageData = function() {
                    const imageData = oldGetImageData.apply(this, arguments);
                    return imageData;
                };
            }
            return context;
        };

        // Navigator ve sürekli değişen özellikler
        const randomDeviceMemory = [2,4,6,8,16][Math.floor(Math.random() * 5)];
        Object.defineProperties(navigator, {
            'deviceMemory': {get: () => randomDeviceMemory},
            'hardwareConcurrency': {get: () => [2,4,6,8][Math.floor(Math.random() * 4)]},
            'webdriver': {get: () => false},
            'plugins': {get: () => [1,2,3,4,5].map(() => ({name: 'Chrome PDF Plugin'}))},
            'languages': {get: () => ['tr-TR', 'tr', 'en-US', 'en']},
        });

        // Battery API
        if (navigator.getBattery) {
            navigator.getBattery = async () => ({
                charging: true,
                chargingTime: Infinity,
                dischargingTime: Infinity,
                level: 0.98
            });
        }

        // Timezone ve Dil
        Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
            value: function() { return { timeZone: 'Europe/Istanbul' }; }
        });

        // Screen ve Window özellikleri
        const screenProps = {
            width: 1920,
            height: 1080,
            availWidth: 1920,
            availHeight: 1040,
            colorDepth: 24,
            pixelDepth: 24
        };
        Object.defineProperties(screen, screenProps);
        Object.defineProperties(window, {
            'innerWidth': {get: () => screenProps.width},
            'innerHeight': {get: () => screenProps.height},
            'outerWidth': {get: () => screenProps.width},
            'outerHeight': {get: () => screenProps.height},
        });
    });
}

async function getCompanyNamesFromExcel(filePath, maxCount = 100) {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    let firmaCol = 1;
    // İlk satırda başlıkları bul
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        if (typeof cell.value === 'string' && cell.value.toLowerCase().includes('firma')) {
            firmaCol = colNumber;
        }
    });
    const names = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // başlık satırı atla
        const name = row.getCell(firmaCol).value;
        if (name && names.length < maxCount) names.push(name.toString().trim());
    });
    return names;
}

// Python ile reCAPTCHA çözümü fonksiyonu
async function solveRecaptchaWithPython(currentUrl) {
    return new Promise((resolve, reject) => {
        const pythonPath = 'python'; // Gerekirse tam path verilebilir
        const scriptPath = path.join(__dirname, 'recaptcha_audio_solver.py');
        const args = [scriptPath, currentUrl];
        const py = spawn(pythonPath, args, { stdio: 'inherit' });
        py.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error('Python reCAPTCHA solver failed.'));
        });
    });
}

// const KITAP1_PATH = path.join(__dirname, 'Kitap1.xlsx'); // ARTIK SABİT DEĞİL

const COLUMN_COMPANY = 'Firma Adı';
const COLUMN_LINKEDIN = 'Linkedin Adresi';

async function ensureLinkedinColumn(worksheet, filePath) {
    let hasLinkedin = false;
    worksheet.getRow(1).eachCell(cell => {
        if (cell.value === COLUMN_LINKEDIN) hasLinkedin = true;
    });
    if (!hasLinkedin) {
        worksheet.getRow(1).getCell(worksheet.columnCount + 1).value = COLUMN_LINKEDIN;
        await worksheet.workbook.xlsx.writeFile(filePath);
    }
}

function findFirstEmptyRow(worksheet) {
    const colIdx = worksheet.getRow(1).values.indexOf(COLUMN_LINKEDIN);
    for (let i = 2; i <= worksheet.rowCount; i++) {
        const cell = worksheet.getRow(i).getCell(colIdx);
        if (!cell.value) return i;
    }
    return -1;
}

async function main() {
    // Komut satırı argümanından dosya yolunu al
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Excel dosya yolu belirtilmedi!');
        process.exit(1);
    }
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    await ensureLinkedinColumn(worksheet, filePath);
    const colIdx = worksheet.getRow(1).values.indexOf(COLUMN_LINKEDIN);
    const companyColIdx = worksheet.getRow(1).values.indexOf(COLUMN_COMPANY);
    if (companyColIdx === -1) throw new Error('Firma Adı sütunu bulunamadı!');

    const results = [];

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            //'--disable-extensions-except=' + EXT_PATH,
            //'--load-extension=' + EXT_PATH,
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1920,1080',
            '--start-maximized'
        ]
    });
    
    const page = await browser.newPage();
    await installMouseHelper(page); // Mouse pointer görünümü
    await injectAdvancedFingerprints(page); // Fingerprint enjeksiyonu
    
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
    ];
    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
    
    // Yandex ana sayfasına git ve gelişmiş yumuşak mouse hareketleri uygula
    await page.goto('https://yandex.com', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(10000); // 10 saniye bekle
    // advancedSmoothMouseMovements(page, { width: 1200, height: 800 }); // KALDIRILDI
    // await page.waitForTimeout(3000); // 3 saniye bekle
    // DOM tabanlı scroll (sayfanın ortasına)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);

    // İlk başta CAPTCHA var mı kontrol et ve çöz
    // (Yandex'te CAPTCHA çok nadir çıkar, yine de kontrol bırakıldı)
    let hasCaptcha = await page.evaluate(() => {
        return !!document.querySelector('form[action*="showcaptcha"]') ||
               !!document.querySelector('img[src*="captcha"]') ||
               !!document.querySelector('input[name="rep"]');
    });
    if (hasCaptcha) {
        console.log('\n⚠️ İlk başta CAPTCHA tespit edildi!');
        // Burada Yandex için özel bir çözüm eklenebilir
    }

    // Kaldığı yerden devam et
    for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const companyName = row.getCell(companyColIdx).value;
        const linkedinCell = row.getCell(colIdx);
        if (!companyName) continue;
        if (linkedinCell.value) continue; // Zaten işlenmişse atla
        // Şirket ismini paranteze kadar al (varsa)
        const companyNameForQuery = companyName.split('(')[0].trim();
        // Şirket ismini + ile birleştir (her kelime arası + olacak)
        const companyQuery = companyNameForQuery.split(/\s+/).join('+');
        // Yandex arama URL'si
        const yandexUrl = `https://yandex.com/search/?text=site%3Awww.linkedin.com%2Fcompany+${companyQuery}`;
        console.log(`\n[${i-1}/${worksheet.rowCount-1}] Aranıyor: ${companyNameForQuery}`);
        await page.goto(yandexUrl, { waitUntil: 'networkidle2' });
        // Her arama sonrası gelişmiş yumuşak mouse hareketleri
        // advancedSmoothMouseMovements(page, { width: 1200, height: 800 }); // KALDIRILDI
        // await page.waitForTimeout(3000); // 3 saniye bekle
        // Doğal scroll ve mouse hareketi
        // await naturalScroll(page);
        // await randomMouseMovements(page, Math.floor(Math.random() * 2) + 1);
        // DOM tabanlı scroll (sonuçların ortasına)
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(1000);
        // Rastgele bekleme süresi (3-7 saniye)
        await page.waitForTimeout(Math.random() * 4000 + 3000);

        // CAPTCHA kontrolü ve çözümü (Yandex için)
        let hasCaptcha = await page.evaluate(() => {
            return !!document.querySelector('form[action*="showcaptcha"]') ||
                   !!document.querySelector('img[src*="captcha"]') ||
                   !!document.querySelector('input[name="rep"]');
        });
        if (hasCaptcha) {
            console.log('\n⚠️ Yandex CAPTCHA tespit edildi! Otomatik çözüm deneniyor...');
            try {
                // 1. "Ben robot değilim" kutusuna tıkla (ilk adımda ZORUNLU!)
                // const robotBtn = await page.$('input[type="checkbox"], button[aria-label*="robot"], button[role="checkbox"], .CheckboxCaptcha-Button');
                // if (robotBtn) {
                //     await robotBtn.click();
                //     await page.waitForTimeout(2500); // Tıklama sonrası yeni challenge gelmesi için bekle
                // } else {
                //     throw new Error('"Ben robot değilim" kutusu/butonu bulunamadı!');
                // }
                // DOM tabanlı tıklama
                const robotClicked = await page.evaluate(() => {
                    const el = document.querySelector('input[type="checkbox"], button[aria-label*="robot"], button[role="checkbox"], .CheckboxCaptcha-Button');
                    if (el) { el.click(); return true; } return false;
                });
                if (robotClicked) {
                    await page.waitForTimeout(2500);
                } else {
                    throw new Error('"Ben robot değilim" kutusu/butonu bulunamadı!');
                }
                // 2. Şimdi sesli doğrulama butonunu tekrar ara
                // const audioBtn = await page.$('button[aria-label*="audio"], button[aria-label*="sesli"], button[aria-label*="Sesli"], button[aria-label*="Sound"]');
                // if (audioBtn) {
                //     await audioBtn.click();
                //     await page.waitForTimeout(2000);
                // } else {
                //     throw new Error('Sesli doğrulama butonu bulunamadı!');
                // }
                // DOM tabanlı tıklama
                const audioClicked = await page.evaluate(() => {
                    const el = document.querySelector('button[aria-label*="audio"], button[aria-label*="sesli"], button[aria-label*="Sesli"], button[aria-label*="Sound"]');
                    if (el) { el.click(); return true; } return false;
                });
                if (audioClicked) {
                    await page.waitForTimeout(2000);
                    // 3. Ses dosyasının URL'sini bul
                    const audioSrc = await page.$eval('audio', el => el.src);
                    if (audioSrc) {
                        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
                        const res = await fetch(audioSrc);
                        const buffer = await res.arrayBuffer();
                        const audioPath = path.join(__dirname, 'yandex_audio.mp3');
                        fs.writeFileSync(audioPath, Buffer.from(buffer));
                        // 4. Whisper ile çözüm
                        const { execSync } = require('child_process');
                        const ffmpegPath = 'C:/Users/ASUS/Desktop/ffmpeg-7.0.2-essentials_build/bin/ffmpeg.exe';
                        const wavPath = path.join(__dirname, 'yandex_audio.wav');
                        execSync(`${ffmpegPath} -y -i "${audioPath}" "${wavPath}"`);
                        execSync(`whisper "${wavPath}" --language ru --model base --output_format txt`, { stdio: 'inherit' });
                        const transcript = fs.readFileSync(path.join(__dirname, 'yandex_audio.txt'), 'utf-8').trim();
                        console.log('Yandex CAPTCHA çözülen cevap:', transcript);
                        // 5. Cevabı inputa yaz
                        // const input = await page.$('input[type="text"]');
                        // if (input) {
                        //     await input.type(transcript, { delay: 50 });
                        //     await page.waitForTimeout(500);
                        //     // Onayla butonuna tıkla
                        //     const submitBtn = await page.$('button[type="submit"]');
                        //     if (submitBtn) await submitBtn.click();
                        //     await page.waitForTimeout(2000);
                        // }
                        // DOM tabanlı input doldurma ve submit
                        await page.evaluate((transcript) => {
                            const input = document.querySelector('input[type="text"]');
                            if (input) {
                                input.focus();
                                input.value = transcript;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                const submitBtn = document.querySelector('button[type="submit"]');
                                if (submitBtn) submitBtn.click();
                            }
                        }, transcript);
                        await page.waitForTimeout(2000);
                        // Temizlik
                        fs.unlinkSync(audioPath);
                        fs.unlinkSync(wavPath);
                        fs.unlinkSync(path.join(__dirname, 'yandex_audio.txt'));
                        console.log('✅ Yandex CAPTCHA otomatik çözüldü, devam ediliyor...');
                    } else {
                        throw new Error('Ses dosyası bulunamadı!');
                    }
                } else {
                    throw new Error('Sesli doğrulama butonu bulunamadı!');
                }
            } catch (err) {
                console.log('❌ Otomatik çözüm başarısız veya manuel çözüm gerekiyor:', err.message);
                // Manuel çözüm bekle
                while (true) {
                    await page.waitForTimeout(5000 + Math.floor(Math.random() * 5000));
                    const stillHasCaptcha = await page.evaluate(() => {
                        return !!document.querySelector('form[action*="showcaptcha"]') ||
                               !!document.querySelector('img[src*="captcha"]') ||
                               !!document.querySelector('input[name="rep"]');
                    });
                    if (!stillHasCaptcha) break;
                }
                console.log('✅ Yandex CAPTCHA manuel çözüldü, devam ediliyor...');
                // advancedSmoothMouseMovements(page, { width: 1200, height: 800 }); // KALDIRILDI
                // await page.waitForTimeout(3000); // 3 saniye bekle
                // DOM tabanlı scroll
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
                await page.waitForTimeout(1000);
            }
        }

        // LinkedIn linkini bul (Yandex sonuçlarında)
        const companyLink = await page.evaluate(() => {
            const aTags = Array.from(document.querySelectorAll('a'));
            for (const a of aTags) {
                if (a.href.includes('linkedin.com/company/')) {
                    return a.href;
                }
            }
            return null;
        });
        // Sonucu canlı olarak yaz
        row.getCell(colIdx).value = companyLink || 'BULUNAMIYOR';
        await workbook.xlsx.writeFile(filePath);
        // JSON'a da kaydet
        const fileBase = companyName.replace(/[^a-zA-Z0-9]/g, '_');
        const jsonDir = path.join(__dirname, 'JSONS');
        const jsonFile = path.join(jsonDir, `${fileBase}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify({ companyName, companyLink: companyLink || 'BULUNAMIYOR' }, null, 2));
        console.log(`${companyName} -> ${companyLink || 'BULUNAMIYOR'}`);
        // Sonraki aramadan önce bekle
        await page.waitForTimeout(Math.random() * 3000 + 2000);
    }
    await browser.close();
    console.log('Tüm şirketler işlendi ve dosya güncellendi.');
}

main();
