# Varsayımlar

Bu dosya, kodda kullandığımız ama gerçek iPhone’da henüz doğrulayamadığımız davranışları listeler. Doğrulanınca satır güncellenir. Doğrulanamayan yerler kodda `// TODO-VERIFY` ile işaretlenir.

## 1. adım

Bu adımda iPhone veya Safari’ye özel bir davranış varsayılmadı.

`HashRouter` bir iPhone kararı değildir. GitHub Pages gibi düz dosya barındırma, `/hatirlatmalar` isteğini `index.html` dosyasına yönlendirmez. Adres `#/hatirlatmalar` olursa sunucu yalnızca `index.html` ister; sayfa tarayıcıda seçilir. Bu, statik yayın için bilinen bir yöntemdir (React Router `HashRouter`).
