import sys
import pandas as pd
import requests

def chunk(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

def main():
    if len(sys.argv) >= 7:
        excel_path = sys.argv[1].strip('"')
        subject = sys.argv[2]
        body = sys.argv[3]
        api_key = sys.argv[4]
        sender_name = sys.argv[5]
        sender_email = sys.argv[6]
    else:
        excel_path = input("Excel dosya yolunu girin: ")
        subject = input("Mail başlığı: ")
        body = input("Mail içeriği (HTML veya düz metin): ")
        api_key = input("Brevo API anahtarınızı girin: ")
        sender_name = input("Gönderen adı: ")
        sender_email = input("Gönderen e-posta (Brevo'da doğrulanmış): ")

    try:
        df = pd.read_excel(excel_path)
    except Exception as e:
        print(f"[HATA] Excel dosyası okunamadı: {e}")
        exit(1)

    if 'E-Mail' not in df.columns:
        print("[HATA] 'E-Mail' sütunu bulunamadı!")
        exit(1)

    all_emails = []
    for emails in df['E-Mail']:
        if pd.notna(emails):
            all_emails.extend([e.strip() for e in str(emails).split(',') if e.strip()])

    if not all_emails:
        print("[HATA] Hiç e-posta adresi bulunamadı!")
        exit(1)

    print(f"[INFO] Toplam {len(all_emails)} e-posta adresi bulundu.")

    for idx, group in enumerate(chunk(all_emails, 50)):
        data = {
            "sender": {"name": sender_name, "email": sender_email},
            "to": [{"email": e} for e in group],
            "subject": subject,
            "htmlContent": body
        }
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": api_key, "Content-Type": "application/json"},
            json=data
        )
        print(f"[{idx+1}. grup] Gönderim sonucu: {response.status_code} - {response.text}")

    print("Tüm mailler gönderildi.")

if __name__ == "__main__":
    main()
