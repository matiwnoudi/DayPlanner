# Varsayımlar

Bu dosya, kodda kullandığımız ama gerçek iPhone’da henüz doğrulayamadığımız davranışları listeler. Doğrulanınca satır güncellenir. Doğrulanamayan yerler kodda `// TODO-VERIFY` ile işaretlenir.

## 1. adım

Bu adımda iPhone veya Safari’ye özel bir davranış varsayılmadı.

`HashRouter` bir iPhone kararı değildir. GitHub Pages gibi düz dosya barındırma, `/hatirlatmalar` isteğini `index.html` dosyasına yönlendirmez. Adres `#/hatirlatmalar` olursa sunucu yalnızca `index.html` ister; sayfa tarayıcıda seçilir. Bu, statik yayın için bilinen bir yöntemdir (React Router `HashRouter`).

## 2. adım

- `prefers-color-scheme` açık ve koyu rengi seçer. Masaüstü tarayıcıda denendi. iPhone ana ekran uygulamasında (standalone) sistem koyu modunu izlediği doğrulanmadı. Kaynak: [MDN prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme).
- `viewport-fit=cover` ve `env(safe-area-inset-*)` çentik ile alt çubuk için boşluk bırakır. Masaüstünde bu değerler 0’dır. iPhone 16 Pro’da, özellikle ana ekrandan açılınca, boşluğun yeterli olduğu doğrulanmadı. Kaynak: [MDN env()](https://developer.mozilla.org/en-US/docs/Web/CSS/env). `src/styles.css` içinde `TODO-VERIFY` notu var.
- Dokunma alanı en az 48px. Bu bir yerleşim kuralıdır, iPhone’da parmakla denenmedi.
- Mantıksal CSS (`padding-inline`, `margin-inline`) sağdan sola düzende döner. Masaüstü tarayıcıda `dir="rtl"` denendi: menü sağa geçti, yatay taşma olmadı. iOS Safari’de doğrulanmadı.

## 3. adım

- `navigator.storage.persist()` çağrısı IndexedDB verilerinin kalıcılığını talep eder. MDN'ye göre bu çağrı tarayıcıdan, verilerin otomatik temizleme sırasında korunmasını ister. Ancak iOS Safari'de bu API'nin davranışı belirsizdir: (1) API destekleniyor mu? (2) `persist()` true/false döndürüyor mu? (3) Gerçekten kalıcılık garantisi veriyor mu yoksa iOS yine de düşük disk alanında IndexedDB'yi silebiliyor mu? Masaüstü Chrome'da `persist()` false döndürdü (izin verilmedi). iPhone'da test edilmedi. Kaynak: [MDN StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist). Kodda `TODO-VERIFY` notu var: `src/db/init.ts`.

## 4. adım

- **iOS standalone modu**: Safari'de "Ana Ekrana Ekle" ile yüklenen uygulama, `display: standalone` manifest ayarıyla tam ekran modunda açılmalıdır. `navigator.standalone` veya `window.matchMedia('(display-mode: standalone)')` ile tespit edilebilir. Masaüstü tarayıcıda test edildi (false döndü). iPhone'da standalone modun tam ekran açılıp açmadığı, adres çubuğunu gizleyip gizlemediği ve Safari'den bağımsız bir pencerede çalışıp çalışmadığı doğrulanmadı. Kaynak: [MDN display-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/display-mode). Kodda `TODO-VERIFY` notu yok (henüz tespit kodu yazılmadı).

- **Manifest alanları iOS desteği**: PWA manifest içindeki bazı alanların iOS Safari'de ne kadar uygulandığı belirsizdir: (1) `theme_color`: iOS Safari standalone modda üst çubuk rengini etkiler mi? (2) `background_color`: Uygulama açılırken splash ekranda kullanılıyor mu? (3) `short_name` vs `name`: Ana ekran simgesi altında hangi isim görünüyor? (4) `scope` ve `start_url`: iOS bu alanları dikkate alıyor mu yoksa her zaman manifest URL'sinden mi başlıyor? (5) `id` alanı: iOS'ta uygulama tekil kimliği olarak işliyor mu? Masaüstü Chrome'da manifest Application sekmesinde görüntülendi. iPhone'da test edilmedi. Kaynak: [Apple Web App Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html), [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest). Kodda `TODO-VERIFY` notu yok (manifest tanımlandı, test bekliyor).

- **Service Worker çevrimdışı davranışı**: Service Worker `precacheAndRoute` ile uygulama kabuğunu (HTML, CSS, JS) önbelleğe alır. İlk ziyaretten sonra uygulama çevrimdışı (airplane mode) açılabilmelidir. Ancak iOS Safari standalone modda service worker'ın güvenilir çalışıp çalışmadığı belirsizdir: (1) İlk yüklemede precache tamamlanıyor mu? (2) Çevrimdışıyken önbellekten mi sunuluyor? (3) Uygulama günlerce açılmazsa iOS service worker'ı sonlandırıp önbelleği temizliyor mu? (4) Low Power Mode'da veya Storage tam olduğunda service worker çalışıyor mu? Masaüstü Chrome'da `npm run preview` ile test edildi (Network > Offline yapınca sayfa açıldı). iPhone'da test edilmedi. Kaynak: [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), [WebKit Service Workers](https://webkit.org/status/#specification-service-workers). Kodda `TODO-VERIFY` notu: `src/sw.ts` içinde henüz yok (çünkü basit precache kodu, iOS'a özel bir şey yok).

- **Service Worker güncelleme akışı**: `registerType: 'prompt'` ile yeni service worker tespit edilince kullanıcıya "Yenile" düğmesi gösterilir. Kullanıcı butona basınca `SKIP_WAITING` mesajı gönderilerek yeni SW aktif edilir ve sayfa yenilenir. iOS Safari standalone modda bu akışın çalışıp çalışmadığı belirsizdir: (1) Sayfa yenileme (`location.reload()`) çalışıyor mu? (2) `postMessage` ile SW'ye mesaj ulaşıyor mu? (3) Kullanıcı uygulamayı kapatıp tekrar açınca yeni versiyon yükleniyor mu? Masaüstü Chrome'da test edilmedi (iki build arasında fark yok). iPhone'da test edilmedi. Kaynak: [Workbox skipWaiting](https://developer.chrome.com/docs/workbox/modules/workbox-core/#skip-waiting-and-clients-claim). Kodda `TODO-VERIFY` notu yok (UpdatePrompt.tsx ve sw.ts'te kod var, test bekliyor).
