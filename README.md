# Rutin Test (Phase 0.5)

Bu, iPhone ana ekranına eklenecek bir hatırlatma uygulamasının **deneme** sürümüdür. Yerel veritabanı (IndexedDB), PWA kabuğu (çevrimdışı çalışma) hazır. Bildirim ve push henüz eklenmedi.

## Bu bilgisayarda gerekenler

- Windows 10
- [Node.js LTS](https://nodejs.org/) (bu projede Node 22 ile denendi)

## İlk kurulum

PowerShell'i açın, proje klasörüne gidin:

```powershell
cd D:\DayPlanner
npm install
```

## Günlük komutlar

### Geliştirme sunucusu

Tarayıcıda `http://localhost:5173/` açılır:

```powershell
npm run dev
```

**ÖNEMLİ**: Geliştirme sunucusunda (`npm run dev`) Service Worker **KAPALIDIR**. Çevrimdışı çalışmayı test etmek için aşağıdaki "Production Test" bölümüne bakın.

Durdurmak için pencerede `Ctrl+C`.

### Production test (Service Worker ile)

Service Worker yalnızca build edilmiş uygulamada çalışır. Test etmek için:

```powershell
npm run build
npm run preview
```

Tarayıcıda `http://localhost:4173/` açılır. Service Worker burada aktif olur.

**Chrome DevTools ile kontrol etme**:

1. **Application > Manifest**:
   - `name`: "Rutin Test"
   - `start_url` ve `scope` değerlerini kontrol edin
   - İkonların görüntülendiğini kontrol edin

2. **Application > Service Workers**:
   - Service Worker "activated" durumunda olmalı
   - "Offline" seçeneğini işaretleyin veya "Update on reload" ile test edin

3. **Network sekmesi**:
   - "Offline" seçeneğini açın
   - Sayfayı yenileyin (`F5`)
   - Sayfa açılıyorsa çevrimdışı çalışma başarılı demektir

4. **İlk açılış mesajı**:
   - İlk kez yüklendiğinde altta "✓ Çevrimdışı kullanıma hazır" mesajı görünmelidir
   - "Tamam" ile kapatabilirsiniz

### Diğer komutlar

Kontrol komutları:

```powershell
npm run build      # TypeScript + Vite build
npm run lint       # ESLint kontrolü
npm test           # Vitest testleri
npm run generate-icons  # PWA ikonlarını yeniden oluştur
```

Hepsi hatasız bitmelidir. `npm run build` sonucu `dist` klasörüne yazar. Bu klasör git'e eklenmez.

## Sayfalar

Adresler kare işaretinden sonra gelir (`HashRouter`). Örnek: `http://localhost:5173/#/hatirlatmalar`

| Sayfa | Adres |
| --- | --- |
| Kurulum | `#/` |
| Bildirimler | `#/bildirimler` |
| Hatırlatmalar | `#/hatirlatmalar` |
| Test günlüğü | `#/gunluk` |
| Takvim | `#/takvim` |
| Kontrol listesi | `#/kontrol` |

## Site adresi (base)

`.env.example` dosyasını kopyalayıp `.env` yapın:

```powershell
Copy-Item .env.example .env
```

- Cloudflare Pages için `VITE_BASE=/` kalsın.
- GitHub Pages siteyi `https://kullanici.github.io/DayPlanner/` gibi bir alt yoldan açar. O zaman `.env` içinde `VITE_BASE=/DayPlanner/` yazın (depo adınız neyse onu yazın, başında ve sonunda `/` olsun).

`.env` dosyası git'e girmez. Gizli anahtar yalnızca `.env` içine yazılır.

## Görünüm

Uygulama dar ekrana göre çizilir. Altta 6 büyük düğme vardır. Yazı rengi, telefonun veya Windows'un açık/koyu ayarını izler (`prefers-color-scheme`).

Boşluklar `margin-inline` gibi mantıksal özelliklerle yazıldı. İleride Farsça ve sağdan sola düzen eklendiğinde satırlar ters döner. Şu an sayfa `dir="ltr"` (soldan sağa).

iPhone'da çentik ve alt çizgi için `viewport-fit=cover` ve `safe-area` boşluğu var. Bu boşluk gerçek telefonda henüz denenmedi.

## PWA ve çevrimdışı çalışma

Uygulama bir Progressive Web App (PWA) olarak yapılandırılmıştır:

- İlk yüklemeden sonra uygulama kabuğu (HTML, CSS, JS) tarayıcı önbelleğine alınır
- İnternet bağlantısı olmasa bile uygulama açılır
- Service Worker arka planda çalışır ve önbellekleme işlerini yönetir

**Service Worker test edilmesi gerekenler**:

- ✓ İlk yüklemede "Çevrimdışı kullanıma hazır" mesajı göründü mü?
- ✓ Network > Offline yapınca sayfa hala açılıyor mu?
- ✓ Application > Service Workers'da "activated" durumda mı?

## Henüz yapılmayanlar

- Web Push bildirimleri (9. adımda eklenecek)
- Bildirim izni ve subscription
- Hatırlatma yönetimi sayfaları (içerik boş)
- .ics takvim export
- Test kontrol listesi
- iPhone'a ana ekran ekleme testi

Bu halde uygulamayı ana ekrana ekleyebilirsiniz ama bildirimler henüz çalışmaz.

