#!/usr/bin/env bash
# TR kantar + tır parkı POI — Overpass → logistics_poi (API çalışırken veya seed ile).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
cd "$INSTALL_DIR"

if [[ ! -f .env ]]; then
  echo "HATA: .env yok" >&2
  exit 1
fi

export LOGISTICS_POI_SEED_OVERPASS=true
export LOGISTICS_POI_SKIP_SAMPLE=true

echo "=== logistics_poi Overpass ingest (tablo boşsa) ==="
node -e "
require('dotenv').config({ path: '.env' });
const { DataSource } = require('typeorm');
const path = require('path');
(async () => {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [path.join('apps/api/dist/infrastructure/database/entities/LogisticsPoiEntity.js')],
    synchronize: false,
  });
  await ds.initialize();
  const repo = ds.getRepository('LogisticsPoiEntity');
  const count = await repo.count();
  console.log('existing', count);
  await ds.destroy();
})();
" 2>/dev/null || true

echo "Öneri: LOGISTICS_POI_SEED_OVERPASS=true ile API bir kez başlatın veya seed runner kullanın."
echo "VPS: pm2 restart nakliyeborsasi-api ( .env içinde LOGISTICS_POI_SEED_OVERPASS=true )"
