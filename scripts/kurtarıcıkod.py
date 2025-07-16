import pandas as pd
import time
from duckduckgo_search import DDGS
from pathlib import Path

# === AYARLAR ===
ANA_EXCEL = "Kitap1.xlsx"
CIKTI_EXCEL = "linkedin_kayitlari.xlsx"
BLOK_BOYUTU = 50
BEKLEME_SN = 10


# === AŞAMA 1: Dosyaları oku ===
df_ana = pd.read_excel(ANA_EXCEL)
tum_firmalar = df_ana["Firma Adı"].dropna().unique()

if Path(CIKTI_EXCEL).exists():
    df_kayitli = pd.read_excel(CIKTI_EXCEL)
    islenen_firmalar = df_kayitli["Firma Adı"].dropna().unique()
else:
    df_kayitli = pd.DataFrame(columns=["Firma Adı", "LinkedIn Adresi"])
    islenen_firmalar = []

# === AŞAMA 2: Henüz işlenmemiş firmaları bul ===
kalan_firmalar = [f for f in tum_firmalar if f not in islenen_firmalar]
print(f"✅ Kalan firma sayısı: {len(kalan_firmalar)}")

# === AŞAMA 3: 50'lik blokla işleme başla ===
blok = kalan_firmalar[:BLOK_BOYUTU]
yeni_kayitlar = []

with DDGS() as ddgs:
    for firma in blok:
        query = f'site:linkedin.com/company "{firma}"'
        print(f"🔍 Aranıyor: {firma}")
        try:
            results = ddgs.text(query, max_results=1)
            link = next((r["href"] for r in results if "linkedin.com/company/" in r["href"]), None)
        except Exception as e:
            link = None
            print(f"⚠️ HATA: {firma} → {e}")
        yeni_kayitlar.append({"Firma Adı": firma, "LinkedIn Adresi": link if link else "Bulunamadı"})
        time.sleep(BEKLEME_SN)

# === AŞAMA 4: Sonuçları kaydet ===
df_yeni = pd.DataFrame(yeni_kayitlar)
df_birlesik = pd.concat([df_kayitli, df_yeni], ignore_index=True)
df_birlesik.to_excel(CIKTI_EXCEL, index=False)

print(f"✅ Yeni kayıtlar eklendi: {len(df_yeni)} adet")
print(f"📁 Dosya güncellendi: {CIKTI_EXCEL}")
