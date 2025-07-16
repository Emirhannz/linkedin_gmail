import time
import requests
import os
import sys
import speech_recognition as sr
from pydub import AudioSegment
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
import random

# ChromeDriver yolunu ayarla
CHROMEDRIVER_PATH = os.path.join(os.path.dirname(__file__), 'chromedriver', 'chromedriver.exe')
# Eğer ffmpeg sistem PATH'inde yoksa, aşağıdaki satırı açıp yolunu belirt:
# AudioSegment.converter = r"C:\\full\\path\\to\\ffmpeg.exe"

def move_mouse_to_element(driver, element):
    # Selenium'da ActionChains ile mouse hareketi simüle et
    from selenium.webdriver.common.action_chains import ActionChains
    actions = ActionChains(driver)
    actions.move_to_element(element).pause(0.5).perform()
    time.sleep(0.5)

def random_wait(min_sec=3, max_sec=5):
    time.sleep(random.uniform(min_sec, max_sec))

def solve_recaptcha_audio(driver):
    random_wait()
    # reCAPTCHA kutusuna tıkla
    frames = driver.find_elements(By.TAG_NAME, "iframe")
    driver.switch_to.frame(frames[0])
    anchor = driver.find_element(By.ID, "recaptcha-anchor")
    move_mouse_to_element(driver, anchor)
    random_wait()
    anchor.click()
    random_wait()
    driver.switch_to.default_content()
    random_wait()

    # Görsel test ekranı gelirse bekle
    frames = driver.find_elements(By.TAG_NAME, "iframe")
    driver.switch_to.frame(frames[1])
    random_wait()
    # Eğer görsel test ekranı geldiyse, 2-3 saniye bekle
    try:
        audio_btn = driver.find_element(By.ID, "recaptcha-audio-button")
        random_wait()  # Kulaklık simgesi göründükten sonra bekle
    except:
        random_wait()
    random_wait()
    # Sesli doğrulama aç
    move_mouse_to_element(driver, audio_btn)
    random_wait()
    audio_btn.click()
    random_wait()

    # Ses dosyasını indir
    src = driver.find_element(By.ID, "audio-source").get_attribute("src")
    random_wait()
    r = requests.get(src, allow_redirects=True)
    with open("audio.mp3", "wb") as f:
        f.write(r.content)
    random_wait()

    # MP3'ü WAV'a çevir
    sound = AudioSegment.from_mp3("audio.mp3")
    random_wait()
    sound.export("audio.wav", format="wav")
    random_wait()

    # Speech-to-text ile çöz
    recognizer = sr.Recognizer()
    with sr.AudioFile("audio.wav") as source:
        audio = recognizer.record(source)
        random_wait()
        key = recognizer.recognize_google(audio)
        print(f"Cevap: {key}")
        random_wait()

    # Cevabı inputa yaz
    input_field = driver.find_element(By.ID, "audio-response")
    move_mouse_to_element(driver, input_field)
    random_wait()
    input_field.send_keys(key)
    random_wait()
    input_field.send_keys(Keys.ENTER)
    random_wait()

    # Temizlik
    os.remove("audio.mp3")
    os.remove("audio.wav")

if __name__ == "__main__":
    try:
        url = sys.argv[1] if len(sys.argv) > 1 else 'https://www.google.com/recaptcha/api2/demo'
        service = Service(CHROMEDRIVER_PATH)
        driver = webdriver.Chrome(service=service)
        driver.get(url)
        solve_recaptcha_audio(driver)
        driver.quit()
        print("[PYTHON] reCAPTCHA başarıyla çözüldü.")
        sys.exit(0)
    except Exception as e:
        print(f"[PYTHON] reCAPTCHA çözümünde hata: {e}")
        sys.exit(1)
