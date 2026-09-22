# Kurumsal görseller

- **`about/`** — Hakkımızda sayfası hero ve bölüm fotoğrafları (`about-hero-truck.jpg`, `about-mission-team.jpg`, `about-vision-corridor.jpg`). AI üretimi; projeye özel kullanım.
- **`press/`** — Basın sayfası görselleri (`press-hero-briefing.jpg`, `press-release-logistics.jpg`, `press-media-kit.jpg`). AI üretimi; projeye özel kullanım.

# Arka plan videosu

- **`corridor-bg.mp4`** — (Arşiv) Eski tam sayfa arka plan videosu; kurumsal temada kullanılmıyor.
- **`corridor-bg-poster.jpg`** — Video poster karesi; arşiv.

## Kaynak & lisans

Ham klip: [Mixkit #52447](https://mixkit.co/free-stock-video/from-an-aerial-viiew-several-freightliners-travers-the-black-asphalt-52447/) — *Mixkit Stock Video Free License* (ticari kullanım).

Renk derecelendirme ve sıkıştırma projede `ffmpeg` ile yapıldı (mavi ton / düşük bitrate).

Yenilemek için:

```bash
curl -L -A "Mozilla/5.0" -e "https://mixkit.co/" -o /tmp/src.mp4 \
  "https://assets.mixkit.co/videos/52447/52447-720.mp4"
ffmpeg -i /tmp/src.mp4 -t 12 -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,eq=saturation=1.18,colorbalance=bs=0.08:bm=0.05" \
  -an -c:v libx264 -crf 26 -movflags +faststart corridor-bg.mp4
```

Alternatif (liman / mavi su): Mixkit #25274, #30406.
