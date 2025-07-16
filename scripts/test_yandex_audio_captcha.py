import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service

# ChromeDriver yolunu ayarla
CHROMEDRIVER_PATH = os.path.join(os.path.dirname(__file__), 'chromedriver', 'chromedriver.exe')

# Yandex CAPTCHA test fonksiyonu

def test_yandex_audio_captcha():
    service = Service(CHROMEDRIVER_PATH)
    driver = webdriver.Chrome(service=service)
    # Yandex arama ile otomatik CAPTCHA'ya düşür
    try:
        driver.get('https://yandex.com/')
        time.sleep(2)
        search_box = driver.find_element(By.NAME, 'text')
        # Çok hızlı ve çok fazla arama yaparak CAPTCHA'ya düşür
        for i in range(100):  # Arama sayısını artırdım
            search_box.clear()
            search_box.send_keys(f'automated test {i} {os.urandom(8).hex()}')  # Her arama farklı olsun diye random ekledim
            search_box.submit()
            time.sleep(0.3)  # Daha hızlı spam
            # CAPTCHA ekranı geldi mi kontrol et
            if 'showcaptcha' in driver.current_url:
                print('CAPTCHA ekranı tespit edildi:', driver.current_url)
                break
            # Her 5 aramada bir ana sayfaya dönüp tekrar spam başlat
            if i % 5 == 0:
                driver.get('https://yandex.com/')
                time.sleep(0.5)
                search_box = driver.find_element(By.NAME, 'text')
        else:
            print('CAPTCHA ekranı otomatik olarak tetiklenemedi. Daha fazla arama deneyin.')
            input('Kapatmak için Enter...')
            driver.quit()
            return
        time.sleep(2)
        # Sesli doğrulama butonunu bul ve tıkla
        audio_btn = driver.find_element(By.CSS_SELECTOR, 'button[aria-label*="audio"]')
        audio_btn.click()
        time.sleep(2)
        # Ses dosyasının URL'sini bul
        audio = driver.find_element(By.TAG_NAME, 'audio')
        audio_src = audio.get_attribute('src')
        print('Ses dosyası:', audio_src)
        # İndir ve kaydet (örnek)
        import requests
        r = requests.get(audio_src, allow_redirects=True)
        with open('yandex_audio_test.mp3', 'wb') as f:
            f.write(r.content)
        print('Ses dosyası indirildi: yandex_audio_test.mp3')
        input('Kapatmak için Enter...')
    except Exception as e:
        print('Hata:', e)
        input('Kapatmak için Enter...')
    driver.quit()

if __name__ == "__main__":
    test_yandex_audio_captcha()
