const Linkout = require("./lib/linkedin.service");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require('fs').promises;
const path = require('path');
const timer = require("./lib/helpers/timer");
const jsonToExcel = require('./lib/helpers/jsonToExcel');
const xlsx = require('xlsx');

// Add stealth plugin
puppeteer.use(StealthPlugin());

const yandexPath = "C:\\Program Files (x86)\\Yandex\\YandexBrowser\\Application\\browser.exe";
const calisanlarDir = path.join(__dirname, 'CALISANLAR');
const calisanlarJsonDir = path.join(__dirname, 'CALISANLAR-JSON');
const kitapPath = path.join(__dirname, 'Kitap1.xlsx');

(async () => {
    try {
        // Komut satırı argümanlarından email ve password al
        const filePathArg = process.argv[2];
        const email = process.argv[3];
        const password = process.argv[4];
        if (!email || !password) {
            console.error('LinkedIn email ve şifre gereklidir!');
            process.exit(1);
        }
        // CALISANLAR ve CALISANLAR-JSON klasörleri yoksa oluştur
        try { await fs.access(calisanlarDir); } catch { await fs.mkdir(calisanlarDir); }
        try { await fs.access(calisanlarJsonDir); } catch { await fs.mkdir(calisanlarJsonDir); }

        // Kitap1.xlsx oku
        const workbook = xlsx.readFile(kitapPath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

        for (const row of rows) {
            const companyName = row["Firma Adı"] || row["firma adı"] || row["FirmaAdı"] || row[Object.keys(row)[0]]; // Öncelik: Firma Adı sütunu
            const companyUrl = row["Linkedin Adresi"] || row["LinkedIn Adresi"] || row["linkedin adresi"];
            if (!companyName || !companyUrl) continue;
            const excelPath = path.join(calisanlarDir, `${companyName}.xlsx`);
            try { await fs.access(excelPath); console.log(`${companyName} zaten var, atlanıyor.`); continue; } catch {}

            // Tarayıcıyı başlat
            const browser = await puppeteer.launch({
                headless: false,
                executablePath: yandexPath,
                defaultViewport: { width: 1280, height: 800 }
            });
            const page = await browser.newPage();
            const cdp = await page.target().createCDPSession();
            await Linkout.tools.loadCursor(page, false);
            await page.evaluateOnNewDocument(() => { delete navigator.__proto__.webdriver; });
            await Linkout.tools.setUserAgent(page, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

            // LinkedIn'e giriş
            const loginResult = await Linkout.services.loginWithEmail(page, cdp, { user: email, password: password });
            if (!loginResult || !loginResult.token) {
                console.error('Giriş başarısız!');
                await browser.close();
                continue;
            }

            // People sekmesine git ve scraping yap
            const { goToPeopleTab, scrapeAllPagesVisibleProfiles } = require('./lib/linkedin/linkedin.company.employees.scraper');
            await goToPeopleTab(page, companyUrl);
            console.log(`${companyName} için People sekmesine girildi. Profiller toplanıyor...`);
            await timer(2000);
            let jsonFilePath;
            try {
                // Artık json dosyasını şirket ismiyle ve CALISANLAR-JSON klasörüne kaydet
                const jsonSavePath = path.join(calisanlarJsonDir, `${companyName}.json`);
                jsonFilePath = await scrapeAllPagesVisibleProfiles(page, 10, jsonSavePath);
            } catch (err) {
                console.error(`${companyName} scraping sırasında hata oluştu, yine de kaydedilecek:`, err);
            }
            await new Promise(res => setTimeout(res, 10000));
            await browser.close();

            // Excel dosyasını otomatik oluştur ve CALISANLAR klasörüne kaydet
            try {
                const newExcelPath = path.join(calisanlarDir, `${companyName}.xlsx`);
                if (jsonFilePath) {
                    await jsonToExcel(jsonFilePath, newExcelPath);
                    console.log(`${companyName} için Excel dosyası oluşturuldu: ${newExcelPath}`);
                } else {
                    console.log(`${companyName} için JSON dosyası bulunamadı, Excel oluşturulamadı.`);
                }
            } catch (err) {
                console.error(`${companyName} için Excel dosyası oluşturulurken hata oluştu:`, err);
            }
        }
        console.log('Tüm şirketler için işlem tamamlandı.');
        process.exit(0);
    } catch (error) {
        console.error('Bir hata oluştu:', error);
        process.exit(1);
    }
})();
