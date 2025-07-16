import requests
import time

def test_http_proxy(ip, port):
    proxy_url = f"http://{ip}:{port}"
    proxies = {
        "http": proxy_url,
        "https": proxy_url,
    }

    try:
        start = time.time()
        response = requests.get("http://httpbin.org/ip", proxies=proxies, timeout=5)
        elapsed = time.time() - start
        if response.status_code == 200:
            print(f"✅ ÇALIŞIYOR: {ip}:{port} - {round(elapsed, 2)}s")
            return True
    except Exception as e:
        print(f"❌ HATA: {ip}:{port} - {e}")
    return False


def main():
    filename = input("Proxy listesinin dosya adını gir (örn: ipler.txt): ").strip()

    try:
        with open(filename, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except FileNotFoundError:
        print("❌ Dosya bulunamadı!")
        return

    aktif_list = []

    for line in lines:
        if len(aktif_list) >= 30:
            break

        line = line.strip()
        if not line or ":" not in line:
            continue

        parts = line.split(":")
        ip = parts[0].strip()
        port = parts[1].strip()

        if test_http_proxy(ip, port):
            aktif_list.append(f"{ip}:{port}")

    with open("aktif_proxyler.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(aktif_list))

    print(f"\n✅ {len(aktif_list)} aktif HTTP proxy bulundu ve 'aktif_proxyler.txt' dosyasına kaydedildi.")

if __name__ == "__main__":
    main()
