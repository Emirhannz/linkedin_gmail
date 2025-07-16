// excel-linkedin-updater.js
// Şirket isimlerini Kitap1.xlsx'ten okuyup, Linkedin adreslerini canlı olarak ekleyen ve kaydeden script

const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../Kitap1.xlsx');
const SHEET_NAME = null; // ilk sayfa
const COLUMN_COMPANY = 'Şirket İsmi'; // Şirket ismi sütunu
const COLUMN_LINKEDIN = 'Linkedin Adresi';

function loadWorkbook() {
  return XLSX.readFile(EXCEL_PATH);
}

function saveWorkbook(wb) {
  XLSX.writeFile(wb, EXCEL_PATH);
}

function getSheet(wb) {
  const sheetName = SHEET_NAME || wb.SheetNames[0];
  return wb.Sheets[sheetName];
}

function getRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function updateSheet(sheet, rows) {
  const newSheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  Object.keys(sheet).forEach(k => delete sheet[k]);
  Object.assign(sheet, newSheet);
}

function ensureLinkedinColumn(rows) {
  if (!rows[0] || !(COLUMN_LINKEDIN in rows[0])) {
    rows.forEach(row => { row[COLUMN_LINKEDIN] = ''; });
  }
}

function findFirstEmptyIndex(rows) {
  return rows.findIndex(row => !row[COLUMN_LINKEDIN]);
}

// Linkedin adresini bulma fonksiyonunu burada async olarak bağlayacaksın
async function findLinkedinUrl(companyName) {
  // Burada LinkedIn arama kodunu entegre et
  // Örnek: return await searchLinkedin(companyName);
  return 'https://linkedin.com/company/' + encodeURIComponent(companyName.toLowerCase().replace(/ /g, '-'));
}

async function main() {
  const wb = loadWorkbook();
  const sheet = getSheet(wb);
  const rows = getRows(sheet);
  ensureLinkedinColumn(rows);

  let startIdx = findFirstEmptyIndex(rows);
  if (startIdx === -1) {
    console.log('Tüm şirketler işlenmiş.');
    return;
  }

  for (let i = startIdx; i < rows.length; i++) {
    const company = rows[i][COLUMN_COMPANY];
    if (!company) continue;
    console.log(`${i+1}. ${company} için LinkedIn aranıyor...`);
    let url;
    try {
      url = await findLinkedinUrl(company);
      if (!url) url = 'BULUNAMIYOR';
    } catch (e) {
      url = 'BULUNAMIYOR';
    }
    rows[i][COLUMN_LINKEDIN] = url;
    updateSheet(sheet, rows);
    saveWorkbook(wb);
    console.log(`${company} -> ${url}`);
    // Burada istersen await ile bekleyebilirsin (ör. 1 sn)
  }
  console.log('Tüm şirketler işlendi.');
}

if (require.main === module) {
  main();
}
