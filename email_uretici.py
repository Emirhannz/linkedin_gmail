import pandas as pd
import os
import re
from urllib.parse import urlparse
from googlesearch import search
import time

def turkce_to_ascii(s):
    replacements = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ı': 'i', 'İ': 'i',
        'ö': 'o', 'Ö': 'o',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u',
    }
    for turk, eng in replacements.items():
        s = s.replace(turk, eng)
    s = s.lower()
    s = re.sub(r'[^a-z0-9 ]', '', s)
    return s

def find_domain(company_name):
    try:
        print(f"[INFO] '{company_name}' için domain aranıyor...")
        for url in search(company_name, num_results=1):
            domain = urlparse(url).netloc
            domain = domain.replace("www.", "")
            print(f"[OK] Bulundu: {domain}")
            return domain
        print(f"[WARN] Sonuç bulunamadı: {company_name}")
        return None
    except Exception as e:
        print(f"[ERROR] {company_name}: {e}")
        return None

def isimden_email_uret(isim, domain=None):
    isim = turkce_to_ascii(isim)
    kelimeler = isim.split()
    if len(kelimeler) < 2:
        return ''
    ad = '.'.join(kelimeler[:-1])
    soyad = kelimeler[-1]
    email = f"{ad}.{soyad}"
    if domain:
        email += f"@{domain}"
    return email

def isimden_email_turevleri(isim, domain=None):
    isim = turkce_to_ascii(isim)
    kelimeler = isim.split()
    if len(kelimeler) < 2:
        return []
    adlar = kelimeler[:-1]
    soyad = kelimeler[-1]
    result = []
    # 1. Tüm adlar ve soyad noktalı: ad1.ad2.soyad
    result.append('.'.join(adlar + [soyad]))
    # 2. İlk ad ve soyad: ad1.soyad
    result.append(f"{adlar[0]}.{soyad}")
    # 3. Son ad ve soyad: adN.soyad (eğer 2'den fazla ad varsa)
    if len(adlar) > 1:
        result.append(f"{adlar[-1]}.{soyad}")
    # 4. İlk ad ve son ad: ad1.adN (eğer 2'den fazla ad varsa)
    if len(adlar) > 1:
        result.append(f"{adlar[0]}.{adlar[-1]}")
    # 5. Alt tireli versiyonlar
    result.append('_'.join(adlar + [soyad]))
    result.append(f"{adlar[0]}_{soyad}")
    if len(adlar) > 1:
        result.append(f"{adlar[-1]}_{soyad}")
        result.append(f"{adlar[0]}_{adlar[-1]}")
    # 6. Baş harfli: f.soyad
    result.append(f"{adlar[0][0]}.{soyad}")
    # 7. f.adN.soyad (eğer 2'den fazla ad varsa)
    if len(adlar) > 1:
        result.append(f"{adlar[0][0]}.{adlar[-1]}.{soyad}")
    # 8. f.soyad (alt tireli)
    result.append(f"{adlar[0][0]}_{soyad}")
    # Tekrarları çıkar
    result = list(dict.fromkeys(result))
    # Sadece domainli versiyonları döndür
    if domain:
        result = [f"{r}@{domain}" for r in result]
    return result

def main(excel_path):
    print(f"[INFO] Script başlatıldı. Dosya: {excel_path}", flush=True)
    if not os.path.exists(excel_path):
        print(f"[ERROR] Dosya bulunamadı: {excel_path}", flush=True)
        print("[ERROR] Sistem başlatılamadı.", flush=True)
        return
    # Şirket adı dosya adından alınır
    sirket_adi = os.path.splitext(os.path.basename(excel_path))[0]
    print(f"[INFO] Şirket adı: {sirket_adi}", flush=True)
    domain = find_domain(sirket_adi)
    print(f"[INFO] Domain: {domain}", flush=True)
    try:
        df = pd.read_excel(excel_path)
        print(f"[INFO] Excel dosyası okundu. Satır sayısı: {len(df)}", flush=True)
    except Exception as e:
        print(f"[ERROR] Excel dosyası okunamadı: {e}", flush=True)
        print("[ERROR] Sistem başlatılamadı.", flush=True)
        return
    if 'İsim Soyisim' not in df.columns:
        print("[ERROR] 'İsim Soyisim' sütunu bulunamadı!", flush=True)
        print("[ERROR] Sistem başlatılamadı.", flush=True)
        return
    emails = []
    for i, isim in enumerate(df['İsim Soyisim']):
        print(f"[INFO] {i+1}. isim işleniyor: {isim}", flush=True)
        turevler = set(isimden_email_turevleri(str(isim), domain))
        # Sadece sistemin ürettiği türevler kalsın
        mevcut = set()
        if 'E-Mail' in df.columns and pd.notna(df.loc[i, 'E-Mail']):
            mevcut = set([e.strip() for e in str(df.loc[i, 'E-Mail']).split(',') if e.strip()])
        # Sadece sistemin ürettikleriyle kesişim alınır
        guncel = turevler
        email_str = ', '.join(sorted(guncel))
        print(f"[INFO] Üretilen e-mail türevleri: {email_str}", flush=True)
        emails.append(email_str)
        time.sleep(0.5)
    df['E-Mail'] = emails
    # Aynı dosyayı güncelle
    try:
        df.to_excel(excel_path, index=False)
        print(f"[INFO] Sonuç '{excel_path}' dosyasına kaydedildi.", flush=True)
    except Exception as e:
        print(f"[ERROR] Sonuç kaydedilemedi: {e}", flush=True)
        print("[ERROR] Sistem tamamlanamadı.", flush=True)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Kullanım: python email_uretici.py <Bosch Rexroth AG.xlsx>")
    else:
        main(sys.argv[1])
