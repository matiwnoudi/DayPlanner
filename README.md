# Rutin Test (Phase 0.5)

Bu, iPhone ana ekranına eklenecek bir hatırlatma uygulamasının **deneme** sürümüdür. Henüz hatırlatma, bildirim veya çevrimdışı çalışma yok. Bu adımda yalnızca boş sayfalar ve proje iskeleti var.

## Bu bilgisayarda gerekenler

- Windows 10
- [Node.js LTS](https://nodejs.org/) (bu projede Node 22 ile denendi)

## İlk kurulum

PowerShell’i açın, proje klasörüne gidin:

```powershell
cd D:\DayPlanner
npm install
```

## Günlük komutlar

Geliştirme sunucusu (tarayıcıda `http://localhost:5173/`):

```powershell
npm run dev
```

Durdurmak için pencerede `Ctrl+C`.

Kontrol komutları:

```powershell
npm run build
npm run lint
npm test
```

Üçü de hatasız bitmelidir. `npm run build` sonucu `dist` klasörüne yazar. Bu klasör git’e eklenmez.

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

`.env` dosyası git’e girmez. Gizli anahtar yalnızca `.env` içine yazılır.

## Henüz yapılmayanlar

iPhone’a ekleme, çevrimdışı açılma ve yayın adımları sonraki adımda anlatılacak. Bu adımda uygulamayı iPhone’da denemeyin; henüz ana ekran uygulaması değil.
