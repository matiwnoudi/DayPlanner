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

- `navigator.storage.persist()` çağrısı IndexedDB verilerinin kalıcılığını talep eder. MDN'ye göre bu çağrı tarayıcıdan, verilerin otomatik temizleme sırasında korunmasını ister. Ancak iOS Safari'de bu API'nin davranışı belirsizdir: (1) API destekleniyor mu? (2) `persist()` true/false döndürüyor mu? (3) Gerçekten kalıcılık garantisi veriyor mu yoksa iOS yine de düşük disk alanında IndexedDB'yi silebiliyor mu? Masaüstü Chrome'da `persist()` false döndürdü (izin verilmedi). iPhone'da test edilmedi. Kaynak: [MDN StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist). Kodda `TODO-VERIFY` notu var: `src/db/init.ts`. **NOT**: Bootstrap fonksiyonu artık uygulama başlangıcında `persist()` çağırıyor ve sonucu Kurulum sayfasında gösteriliyor. iOS'ta davranışı hala doğrulanması gerekiyor.

## 4. adım

- **iOS standalone modu**: Safari'de "Ana Ekrana Ekle" ile yüklenen uygulama, `display: standalone` manifest ayarıyla tam ekran modunda açılmalıdır. `navigator.standalone` veya `window.matchMedia('(display-mode: standalone)')` ile tespit edilebilir. Masaüstü tarayıcıda test edildi (false döndü). iPhone'da standalone modun tam ekran açılıp açmadığı, adres çubuğunu gizleyip gizlemediği ve Safari'den bağımsız bir pencerede çalışıp çalışmadığı doğrulanmadı. Kaynak: [MDN display-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/display-mode). Kodda `TODO-VERIFY` notu yok (henüz tespit kodu yazılmadı).

- **Manifest alanları iOS desteği**: PWA manifest içindeki bazı alanların iOS Safari'de ne kadar uygulandığı belirsizdir: (1) `theme_color`: iOS Safari standalone modda üst çubuk rengini etkiler mi? (2) `background_color`: Uygulama açılırken splash ekranda kullanılıyor mu? (3) `short_name` vs `name`: Ana ekran simgesi altında hangi isim görünüyor? (4) `scope` ve `start_url`: iOS bu alanları dikkate alıyor mu yoksa her zaman manifest URL'sinden mi başlıyor? (5) `id` alanı: iOS'ta uygulama tekil kimliği olarak işliyor mu? Masaüstü Chrome'da manifest Application sekmesinde görüntülendi. iPhone'da test edilmedi. Kaynak: [Apple Web App Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html), [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest). Kodda `TODO-VERIFY` notu yok (manifest tanımlandı, test bekliyor).

- **Service Worker çevrimdışı davranışı**: Service Worker `precacheAndRoute` ile uygulama kabuğunu (HTML, CSS, JS) önbelleğe alır. İlk ziyaretten sonra uygulama çevrimdışı (airplane mode) açılabilmelidir. Ancak iOS Safari standalone modda service worker'ın güvenilir çalışıp çalışmadığı belirsizdir: (1) İlk yüklemede precache tamamlanıyor mu? (2) Çevrimdışıyken önbellekten mi sunuluyor? (3) Uygulama günlerce açılmazsa iOS service worker'ı sonlandırıp önbelleği temizliyor mu? (4) Low Power Mode'da veya Storage tam olduğunda service worker çalışıyor mu? Masaüstü Chrome'da `npm run preview` ile test edildi (Network > Offline yapınca sayfa açıldı). iPhone'da test edilmedi. Kaynak: [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), [WebKit Service Workers](https://webkit.org/status/#specification-service-workers). Kodda `TODO-VERIFY` notu: `src/sw.ts` içinde henüz yok (çünkü basit precache kodu, iOS'a özel bir şey yok).

- **Service Worker güncelleme akışı**: `registerType: 'prompt'` ile yeni service worker tespit edilince kullanıcıya "Yenile" düğmesi gösterilir. Kullanıcı butona basınca `SKIP_WAITING` mesajı gönderilerek yeni SW aktif edilir ve sayfa yenilenir. iOS Safari standalone modda bu akışın çalışıp çalışmadığı belirsizdir: (1) Sayfa yenileme (`location.reload()`) çalışıyor mu? (2) `postMessage` ile SW'ye mesaj ulaşıyor mu? (3) Kullanıcı uygulamayı kapatıp tekrar açınca yeni versiyon yükleniyor mu? Masaüstü Chrome'da test edilmedi (iki build arasında fark yok). iPhone'da test edilmedi. Kaynak: [Workbox skipWaiting](https://developer.chrome.com/docs/workbox/modules/workbox-core/#skip-waiting-and-clients-claim). Kodda `TODO-VERIFY` notu yok (UpdatePrompt.tsx ve sw.ts'te kod var, test bekliyor).

## 5. adım

- **iOS 26 Paylaş düğmesi konumu**: iOS sürümlerine göre Safari'deki Paylaş düğmesinin yeri değişebiliyor. Eski sürümlerde alt çubukta ortada ↑ simgesi vardı. Yeni sürümlerde (iOS 15+) sağ üst köşede ⋯ menüsünde olabilir. iOS 26'da (henüz yayınlanmadı, 2026 Kasım tarihi itibariyle) hangi tasarımın kullanıldığı bilinmiyor. Kodda her iki konumdan da bahsedildi: "Altta ortada ↑ simgesi veya sağ üstte ⋯ menüsü". iPhone 16 Pro'da test edilmedi. Kaynak: [Apple HIG - Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars). Kodda `TODO-VERIFY` notu yok (metin her iki durumu da kapsıyor).

- **"Web uygulaması olarak aç" seçeneği**: "Ana Ekrana Ekle" penceresinde bazı iOS sürümlerinde (iOS 16.4+) "Web uygulaması olarak aç" (veya "Open as Web App") seçeneği gösteriliyor. Bu seçenek işaretliyken eklenen PWA, Safari yerine standalone modda açılıyor. Ancak bu seçeneğin her iOS sürümünde ve her sitede gösterilip gösterilmediği belirsiz: (1) Manifest'te `display: standalone` varsa mı gösteriliyor? (2) iOS 26'da bu seçenek hala var mı yoksa varsayılan davranış mı oldu? (3) Seçenek işaretli değilse uygulama Safari içinde mi açılıyor? Masaüstü'da test edilemez. iPhone'da test edilmedi. Kaynak: [iOS 16.4 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes), [WebKit Blog - Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). Kodda uyarı metni var: "Web uygulaması olarak aç seçeneğini işaretle (varsa)".

- **Uygulama içi tarayıcı algılama güvenilirliği**: `isSafariLike()` fonksiyonu userAgent string'ine bakarak Safari vs uygulama içi tarayıcı (Instagram, Facebook, Chrome iOS vb.) ayırt etmeye çalışıyor. Ancak bu yöntem %100 güvenilir DEĞİL: (1) Uygulama içi tarayıcılar userAgent'ı değiştirebilir veya Safari gibi davranabilir. (2) Yeni uygulama tarayıcıları (TikTok, Snapchat vb.) listede olmayabilir. (3) Bazı uygulamalar SFSafariViewController kullanıyor ve Safari ile aynı özelliklere sahip. Test edilen userAgent'lar: Instagram, Facebook (FBAN/FBAV), Line, WeChat (MicroMessenger), Chrome iOS (CriOS), Firefox iOS (FxiOS), Edge iOS (EdgiOS), Opera iOS (OPiOS). Masaüstü'da mock userAgent ile test edildi. Gerçek uygulamalarda test edilmedi. Kaynak: [MDN Navigator.userAgent](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent). Kodda yorum var: "Bu algılama %100 güvenilir DEĞİLDİR".

- **navigator.standalone API**: iOS Safari'de `navigator.standalone` boolean özelliği, uygulamanın standalone modda (ana ekrandan açıldığında) çalışıp çalışmadığını gösterir. Bu, Safari'ye özel bir API'dir (W3C standardı değil). iOS'un yeni sürümlerinde bu API'nin hala desteklenip desteklenmediği veya `matchMedia('(display-mode: standalone)')` ile tamamen değiştirilip değiştirilmediği belirsiz. Kodda her iki yöntem de kullanılıyor. Masaüstü Safari'de `navigator.standalone` tanımsız. iPhone'da test edilmedi. Kaynak: [Apple Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html). Kodda `TODO-VERIFY` notu var: `src/lib/install.ts` içinde `isStandalone()` fonksiyonu.

- **matchMedia display-mode standalone**: W3C Display Modes spec'e göre `window.matchMedia('(display-mode: standalone)')` ile uygulamanın standalone modda olup olmadığı sorgulanabilir. iOS Safari'nin bu standartı destekleyip desteklemediği ve `navigator.standalone` ile aynı sonucu verip vermediği belirsiz. Masaüstü Chrome'da test edildi (browser standalone modunu simüle etmek zor). iPhone'da test edilmedi. Kaynak: [MDN display-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/display-mode). Kodda `TODO-VERIFY` notu var: `src/lib/install.ts`.


## Gerçek iPhone Ölçümleri (Kullanıcı Testi)

**Tarih**: Kasım 2026 (iOS 18.7, Safari)
**Cihaz**: iPhone 16 Pro

### ✅ Doğrulanan Davranışlar:

1. **Ana ekran uygulaması çalışıyor**: Safari'den "Ana Ekrana Ekle" ile eklendi, standalone modda (tam ekran) açıldı. URL çubuğu görünmüyor, durum çubuğu (saat/pil) görünüyor.

2. **Service Worker aktif**: `navigator.serviceWorker.controller` mevcut, precache çalışıyor, cache'te 8 dosya var.

3. **Offline açılış GÖZLENDİ (Kullanıcı Testi 1)**: Uçak modunda uygulama açıldı. Tüm sayfa açılış testleri Playwright (Chromium ve WebKit) ile geçti.

4. **storage.persisted() = false**: iOS'ta kalıcılık garantisi verilmiyor. Uygulama verisi düşük disk alanında iOS tarafından silinebilir.

5. **UserAgent'ta iOS sürümü sabitlenmiş**: `iPhone OS 18_7` gerçek iOS sürümünü göstermiyor. Gerçek sürüm `Version/26.6` kısmından okunuyor (iOS 18.7 → Version 26.6 mapping). Bu davranış iOS 18+ için doğrulandı.

### ⏳ Henüz Test Edilmedi:

- Push bildirimleri (Web Push API)
- Sessiz mod, Focus Mode, Low Power Mode'da bildirim davranışı
- Uygulama günlerce açılmazsa SW'nin sonlandırılıp sonlandırılmadığı
- Quota exceeded hatası (düşük disk)
- İran bağlantı testi (VPN'siz/VPN'li erişim)


## Bilinen Sorunlar

### Seed Verisi Davranışı
- Seed fonksiyonu uygulama ilk açılışında 3 örnek hatırlatma (Su İç, Öğün Zamanı, Takviye) ekler
- Meta tablosunda bayrak varsa seed tekrar çalışmaz
- Mevcut kullanıcıların elle eklediği hatırlatmaları korunur (seed sabit ID'ler kullanır, çakışma olmaz)
- Kullanıcı seed hatırlatmalarını silerse bayrak yüzünden geri gelmez
- **Önemli**: İlk kurulumda seed EKLEME yapar, mevcut verileri SİLMEZ


## Açılış Ağ İsteği (Doğrulanmadı)

### Service Worker Güncelleme Kontrolü
- `useRegisterSW` hook'u uygulama açılışında otomatik güncelleme kontrolü yapar
- iOS'ta offline durumdayken "Turn Off Airplane Mode or Use WLAN" uyarısı gösterilebilir
- **Düzeltme**: Güncelleme kontrolü sadece `navigator.onLine === true` ise yapılıyor
- **Durum**: Gerçek iPhone'da henüz doğrulanmadı
- Periyodik kontrol (1 saatte bir) de aynı şekilde online kontrolü yapıyor


## Takvim (.ics) İndirme/Paylaşma (iOS PWA Standalone)

### Teslim Yöntemleri
Takvim dosyası üç yolla teslim edilmeye çalışılır:

1. **Web Share API (File paylaşımı)**
   - `navigator.canShare({files: [...]})` ile kontrol edilir
   - File objesi: `text/calendar` MIME type
   - iOS Safari standalone'da çalışıyor mu? → **TODO-VERIFY**
   - AbortError (kullanıcı vazgeçti) hata sayılmaz
   - Kaynak: [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)

2. **Blob URL + download attribute**
   - `<a href="blob:..." download="rutin-deneme.ics">` ile indirilir
   - Safari'de download attribute çalışıyor mu? → **TODO-VERIFY**
   - .ics dosyası doğru MIME type ile sunuluyor mu?
   - Takvim uygulaması otomatik açılıyor mu? → **TODO-VERIFY**

3. **Metin gösterimi (kopyala-yapıştır)**
   - `<textarea>` içinde seçilebilir metin
   - Kullanıcı kopyalayıp Takvim uygulamasına manuel yapıştırabilir
   - En güvenilir yöntem ama manuel → **TODO-VERIFY**

### X-WR-CALNAME Davranışı
- `X-WR-CALNAME: Rutin Deneme` takvim adını belirtir
- iOS Takvim uygulaması bu alanı yok sayabilir
- Kullanıcı içe aktarırken takvim adını manuel seçer → **TODO-VERIFY**
- Kaynak: [Apple Calendar .ics](https://support.apple.com/guide/calendar/welcome/mac)

### Kod Referansları
- `src/lib/ics.ts` - buildIcs() fonksiyonu: // TODO-VERIFY: iOS teslim davranışı
- `src/pages/Takvim.tsx` - Teslim yöntemleri: // TODO-VERIFY: Web Share, Blob download, textarea
