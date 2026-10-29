#!/usr/bin/env bash
# winlrt- monorepo iskeleti — Cursor kurulu olmadan Mac/Linux terminalinden.
# Kullanım: cd ~/winlrt- && bash bootstrap-winlrt-repo.sh
set -euo pipefail

ROOT="${1:-$(pwd)}"
cd "$ROOT"

if [[ ! -d .git ]]; then
  echo "Hata: $ROOT içinde .git yok. Önce: git clone https://github.com/kutluhanakinci8-ux/winlrt-.git"
  exit 1
fi

mkdir -p apps/web/public/downloads apps/web/scripts apps/desktop docs releases

cat > .gitignore <<'EOF'
node_modules/
dist/
target/
.tauri/
*.log
.env
.env.*
!.env.example
.DS_Store
Thumbs.db
*.exe
*.msi
*.dmg
*.AppImage
releases/*.zip
!releases/.gitkeep
EOF

cat > .env.example <<'EOF'
# İleride Lerta API entegrasyonu (isteğe bağlı)
# LERTA_API_BASE=https://u88.lerta.com.tr/api/v1
EOF

cat > package.json <<'EOF'
{
  "name": "winlrt",
  "version": "0.1.0",
  "private": true,
  "description": "winlrt — sıkıştırma ve açma programı (Windows, macOS; mobil yol haritası)",
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:web": "npm run dev -w @winlrt/web",
    "build:web": "npm run build -w @winlrt/web"
  },
  "engines": { "node": ">=20" }
}
EOF

cat > apps/web/package.json <<'EOF'
{
  "name": "@winlrt/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "npx --yes serve public -p 3020",
    "build": "node scripts/sync-public.js"
  }
}
EOF

cat > apps/web/scripts/sync-public.js <<'EOF'
#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "public");
const out = path.join(__dirname, "..", "dist");
fs.mkdirSync(out, { recursive: true });
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(root, out);
console.log("OK: apps/web/dist hazır");
EOF

cat > apps/web/public/styles.css <<'EOF'
:root {
  color-scheme: light dark;
  --bg: #0f172a;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --accent: #38bdf8;
  --border: #334155;
  font-family: system-ui, sans-serif;
}
body { margin: 0; background: var(--bg); color: var(--text); line-height: 1.5; }
.hero { max-width: 720px; margin: 0 auto; padding: 4rem 1.5rem 2rem; text-align: center; }
.eyebrow { letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); font-size: 0.85rem; }
h1 { font-size: clamp(2rem, 5vw, 3rem); margin: 0.25rem 0 1rem; }
.lead { color: var(--muted); max-width: 540px; margin: 0 auto 1.5rem; }
.actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn { display: inline-block; padding: 0.65rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; }
.btn-primary { background: var(--accent); color: #0f172a; }
.btn-ghost { border: 1px solid var(--border); color: var(--text); }
.grid { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; display: grid; gap: 1.5rem; }
section { border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; }
footer { text-align: center; padding: 2rem; color: var(--muted); font-size: 0.9rem; }
footer a { color: var(--accent); }
EOF

cat > apps/web/public/index.html <<'EOF'
<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>winlrt — Sıkıştırma ve açma</title>
    <meta name="description" content="winlrt: Windows ve macOS için modern arşiv programı." />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="hero">
      <p class="eyebrow">winlrt</p>
      <h1>Sıkıştır. Aç. Taşı.</h1>
      <p class="lead">Windows ve macOS için winlrt. Google Play ve App Store yol haritasında.</p>
      <div class="actions">
        <a class="btn btn-primary" href="/downloads/">İndir</a>
        <a class="btn btn-ghost" href="https://github.com/kutluhanakinci8-ux/winlrt-">GitHub</a>
      </div>
    </header>
    <main class="grid">
      <section>
        <h2>Platformlar</h2>
        <ul>
          <li>Windows 10+ (yakında)</li>
          <li>macOS 12+ (yakında)</li>
          <li>Android / iOS — mağaza aşamasında</li>
        </ul>
      </section>
      <section>
        <h2>Geliştirme</h2>
        <p>Kaynak kod GitHub’da. Turhost VPS hazır olunca deploy eklenecek.</p>
      </section>
    </main>
    <footer><p>© winlrt</p></footer>
  </body>
</html>
EOF

cat > apps/web/public/downloads/index.html <<'EOF'
<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>winlrt — İndir</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="hero">
      <h1>İndirme</h1>
      <p class="lead">İlk sürüm build edildiğinde dosyalar burada listelenecek.</p>
      <p><a class="btn btn-ghost" href="/">← Ana sayfa</a></p>
    </header>
    <main class="grid">
      <section><h2>Windows</h2><p class="lead">Henüz yayınlanmadı.</p></section>
      <section><h2>macOS</h2><p class="lead">Henüz yayınlanmadı.</p></section>
    </main>
  </body>
</html>
EOF

cat > apps/desktop/README.md <<'EOF'
# winlrt masaüstü

Tauri 2 + TypeScript/React (yakında). CI ile `.exe` / `.dmg` → `releases/` veya vitrin `/downloads/`.
EOF

cat > docs/WINLRT_VPS.md <<'EOF'
# Turhost VPS — winlrt

Sunucu **Aktif** + IP sonrası: `git clone`, `npm install`, `npm run build:web`, nginx → `apps/web/dist`, certbot.
EOF

cat > docs/TERMINAL_GITHUB.md <<'EOF'
# GitHub push (Cursor olmadan)

```bash
cd ~/winlrt-
git add -A
git commit -m "chore: monorepo iskelet"
git push origin main
```

Push şifre isteminde GitHub **Personal Access Token** kullanın (Settings → Developer settings → PAT, repo scope).
EOF

touch releases/.gitkeep

cat > README.md <<'EOF'
# winlrt

winlrt bir **sıkıştırma ve açma** programıdır (Windows, macOS; Android / iOS yol haritasında).

## Yerel

```bash
npm install
npm run dev:web
npm run build:web
```

Bkz. `docs/WINLRT_VPS.md`, `docs/TERMINAL_GITHUB.md`.
EOF

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  npm install
  npm run build:web
else
  echo "Not: node/npm yok — dosyalar oluşturuldu; build atlandı. VPS veya node kurunca: npm install && npm run build:web"
fi

git add -A
if git diff --cached --quiet; then
  echo "Değişiklik yok (zaten kurulu?)."
else
  git commit -m "chore: winlrt monorepo iskelet — vitrin ve docs"
fi

echo ""
echo "Son adım (sizin GitHub hesabınızla):"
echo "  git push origin main"
echo "GitHub repo: https://github.com/kutluhanakinci8-ux/winlrt-"
