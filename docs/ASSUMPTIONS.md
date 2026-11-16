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
