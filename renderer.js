const { ipcRenderer } = require('electron');

let selectedFindFilePath = null;
let selectedScrapeFilePath = null;
let selectedEmailFilePath = null;
let selectedBrevoFilePath = null;
let findLogs = '';
let scrapeLogs = '';
let emailLogs = '';
let brevoLogs = '';
let activeTab = 'find';

function showTab(tabName) {
  document.getElementById('findTab').classList.remove('active');
  document.getElementById('scrapeTab').classList.remove('active');
  document.getElementById('emailTab').classList.remove('active');
  document.getElementById('brevoTab').classList.remove('active');
  document.getElementById('tabFindBtn').classList.remove('active');
  document.getElementById('tabScrapeBtn').classList.remove('active');
  document.getElementById('tabEmailBtn').classList.remove('active');
  document.getElementById('tabBrevoBtn').classList.remove('active');
  if (tabName === 'find') {
    document.getElementById('findTab').classList.add('active');
    document.getElementById('tabFindBtn').classList.add('active');
  } else if (tabName === 'scrape') {
    document.getElementById('scrapeTab').classList.add('active');
    document.getElementById('tabScrapeBtn').classList.add('active');
  } else if (tabName === 'email') {
    document.getElementById('emailTab').classList.add('active');
    document.getElementById('tabEmailBtn').classList.add('active');
  } else if (tabName === 'brevo') {
    document.getElementById('brevoTab').classList.add('active');
    document.getElementById('tabBrevoBtn').classList.add('active');
  }
  activeTab = tabName;
  updateOutput();
}

function updateOutput() {
  if (activeTab === 'find') {
    document.getElementById('outputFind').innerText = findLogs;
  } else if (activeTab === 'scrape') {
    document.getElementById('outputScrape').innerText = scrapeLogs;
  } else if (activeTab === 'email') {
    document.getElementById('outputEmail').innerText = emailLogs;
  } else if (activeTab === 'brevo') {
    document.getElementById('outputBrevo').innerText = brevoLogs;
  }
}

function addFindFile() {
  ipcRenderer.invoke('open-file-dialog').then(filePath => {
    if (filePath) {
      selectedFindFilePath = filePath;
      localStorage.setItem('selectedFindFilePath', selectedFindFilePath);
      document.getElementById('findFileName').innerText = filePath;
      alert('Ekle butonu: Seçilen dosya yolu: ' + selectedFindFilePath);
    } else {
      selectedFindFilePath = null;
      localStorage.removeItem('selectedFindFilePath');
      document.getElementById('findFileName').innerText = 'Dosya seçilmedi';
    }
  });
}

function addScrapeFile() {
  ipcRenderer.invoke('open-file-dialog').then(filePath => {
    if (filePath) {
      selectedScrapeFilePath = filePath;
      localStorage.setItem('selectedScrapeFilePath', selectedScrapeFilePath);
      document.getElementById('scrapeFileName').innerText = filePath;
      alert('Ekle butonu: Seçilen scrape dosya yolu: ' + selectedScrapeFilePath);
    } else {
      selectedScrapeFilePath = null;
      localStorage.removeItem('selectedScrapeFilePath');
      document.getElementById('scrapeFileName').innerText = 'Dosya seçilmedi';
    }
  });
}

function addEmailFile() {
  ipcRenderer.invoke('open-file-dialog').then(filePath => {
    if (filePath) {
      selectedEmailFilePath = filePath;
      localStorage.setItem('selectedEmailFilePath', selectedEmailFilePath);
      document.getElementById('emailFileName').innerText = filePath;
      alert('Ekle butonu: Seçilen dosya yolu: ' + selectedEmailFilePath);
    } else {
      selectedEmailFilePath = null;
      localStorage.removeItem('selectedEmailFilePath');
      document.getElementById('emailFileName').innerText = 'Dosya seçilmedi';
    }
  });
}

function addBrevoFile() {
  ipcRenderer.invoke('open-file-dialog').then(filePath => {
    if (filePath) {
      selectedBrevoFilePath = filePath;
      localStorage.setItem('selectedBrevoFilePath', selectedBrevoFilePath);
      document.getElementById('brevoFileName').innerText = filePath;
      alert('Ekle butonu: Seçilen dosya yolu: ' + selectedBrevoFilePath);
    } else {
      selectedBrevoFilePath = null;
      localStorage.removeItem('selectedBrevoFilePath');
      document.getElementById('brevoFileName').innerText = 'Dosya seçilmedi';
    }
  });
}

function startFind() {
  selectedFindFilePath = localStorage.getItem('selectedFindFilePath');
  alert('Start butonu: localStorage\'dan okunan dosya yolu: ' + selectedFindFilePath);
  if (selectedFindFilePath) {
    ipcRenderer.send('start-find', selectedFindFilePath);
  } else {
    log("Lütfen önce dosya seçip 'Ekle' butonuna basın.");
  }
}

function startScrape() {
  selectedScrapeFilePath = localStorage.getItem('selectedScrapeFilePath');
  const email = document.getElementById('linkedinEmail').value;
  const password = document.getElementById('linkedinPassword').value;
  if (!email || !password) {
    log("Lütfen LinkedIn email ve şifrenizi girin.");
    return;
  }
  if (selectedScrapeFilePath) {
    ipcRenderer.send('start-scrape', { filePath: selectedScrapeFilePath, email, password });
  } else {
    log("Lütfen önce dosya seçip 'Ekle' butonuna basın.");
  }
}

function startEmail() {
  selectedEmailFilePath = localStorage.getItem('selectedEmailFilePath');
  alert('Start butonu: localStorage\'dan okunan dosya yolu: ' + selectedEmailFilePath);
  if (selectedEmailFilePath) {
    ipcRenderer.send('start-email', selectedEmailFilePath);
  } else {
    logEmail("Lütfen önce dosya seçip 'Ekle' butonuna basın.");
  }
}

function startBrevoMail() {
  selectedBrevoFilePath = localStorage.getItem('selectedBrevoFilePath');
  const subject = document.getElementById('brevoSubject').value;
  const body = document.getElementById('brevoBody').value;
  const apiKey = document.getElementById('brevoApiKey').value;
  const senderName = document.getElementById('brevoSenderName').value;
  const senderEmail = document.getElementById('brevoSenderEmail').value;
  if (!selectedBrevoFilePath || !subject || !body || !apiKey || !senderName || !senderEmail) {
    logBrevo('Lütfen tüm alanları doldurun ve dosya seçin.');
    return;
  }
  ipcRenderer.send('start-brevo', {
    filePath: selectedBrevoFilePath,
    subject,
    body,
    apiKey,
    senderName,
    senderEmail
  });
}

function logEmail(msg) {
  emailLogs += msg + '\n';
  if (activeTab === 'email') updateOutput();
}

function logBrevo(msg) {
  brevoLogs += msg + '\n';
  if (activeTab === 'brevo') updateOutput();
}

ipcRenderer.on('log', (event, data) => {
  if (data.type === 'find') {
    findLogs += data.message;
    if (activeTab === 'find') updateOutput();
  } else if (data.type === 'scrape') {
    scrapeLogs += data.message;
    if (activeTab === 'scrape') updateOutput();
  } else if (data.type === 'email') {
    emailLogs += data.message;
    if (activeTab === 'email') updateOutput();
  } else if (data.type === 'brevo') {
    brevoLogs += data.message;
    if (activeTab === 'brevo') updateOutput();
  }
});

function clearOutputFind() {
  findLogs = '';
  updateOutput();
}

function clearOutputScrape() {
  scrapeLogs = '';
  updateOutput();
}

function clearOutputEmail() {
  emailLogs = '';
  updateOutput();
}

function clearOutputBrevo() {
  brevoLogs = '';
  updateOutput();
}

function toggleBrevoTips() {
  const hiddenTips = document.querySelectorAll('.brevo-tip-hidden');
  const btn = document.getElementById('brevoTipsToggleBtn');
  let anyHidden = false;
  hiddenTips.forEach(li => { if (li.style.display === 'none') anyHidden = true; });
  if (anyHidden) {
    hiddenTips.forEach(li => li.style.display = 'list-item');
    btn.innerHTML = '▲';
  } else {
    hiddenTips.forEach(li => li.style.display = 'none');
    btn.innerHTML = '▼';
  }
}

// Output başlığının sağ üstüne bir yenileme (refresh) butonu ekle
// index.html dosyasında Output başlığının hemen yanına aşağıdaki HTML eklenmeli:
// <button id="clearOutputBtn" title="Çıktıyı Temizle" style="float:right; background:none; border:none; cursor:pointer; font-size:20px; margin-top:-4px;" onclick="clearOutput()">&#x21bb;</button>
