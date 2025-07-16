import pandas as pd
from urllib.parse import urlparse
from googlesearch import search
import time

def find_domain(company_name):
    try:
        print(f"[INFO] '{company_name}' için arama yapılıyor...")
        for url in search(company_name, num_results=1):
            domain = urlparse(url).netloc
            domain = domain.replace("www.", "")
            print(f"[OK] Bulundu: {domain}")
            return domain
        print(f"[WARN] Sonuç bulunamadı: {company_name}")
        return "YOK"
    except Exception as e:
        print(f"[ERROR] {company_name}: {e}")
        return "YOK"

# Excel dosyasını oku
print("[INFO] Excel dosyası yükleniyor: Kitap1.xlsx")
df = pd.read_excel("Kitap1.xlsx")

# Sonuçları yazmak için yeni sütun
domains = []
for idx, row in df.iterrows():
    firma_adi = str(row["Firma Adı"])
    domain = find_domain(firma_adi)
    domains.append(domain)
    time.sleep(2)  # Google bot engeline takılmamak için biraz bekle

df["Domain"] = domains

# Sonucu göster
print("\n[RESULT] Tüm sonuçlar:")
print(df[["Firma Adı", "Domain"]])

# Sonucu kaydet
output_file = "sonuc.xlsx"
df.to_excel(output_file, index=False)
print(f"\n[INFO] Sonuçlar '{output_file}' dosyasına kaydedildi.")
