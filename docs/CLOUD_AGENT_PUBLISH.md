# Cloud Agent: merge + deploy (otomatik akış)

Her kod değişikliği turunun **sonunda** (test/build sonrası):

```bash
git add -A && git commit -m "..."   # feature dalında
git push -u origin cursor/<ad>-8521
bash scripts/agent-merge-deploy-main.sh
```

Script sırasıyla:

1. `origin/main` günceller  
2. Feature dalını **main**’e merge eder (zaten merge’lü ise atlar)  
3. `main` push  
4. `VPS_SSH_PASSWORD` veya `VPS_SSH_PRIVATE_KEY` varsa `scripts/deploy-vps-ssh.sh`  

## GitHub Actions (yedek)

`main`’e her push’ta `.github/workflows/deploy-vps.yml` çalışır (`VPS_HOST`, `VPS_SSH_KEY` secrets gerekli).  
Agent VPS’e SSH ile deploy ettiyse aynı commit tekrar deploy edilir; zararsızdır.

## Sadece deploy (main zaten güncel)

```bash
FEATURE_BRANCH=main bash scripts/agent-merge-deploy-main.sh
```

## VPS secrets olmadan

```bash
SKIP_VPS_DEPLOY=1 bash scripts/agent-merge-deploy-main.sh
```
