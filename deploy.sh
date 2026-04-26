#!/bin/bash
# 朝日製氷 POS auto-deploy
# 使い方: ./deploy.sh "コミットメッセージ"
set -e
cd "$(dirname "$0")"

MSG="${1:-Update}"
TS=$(date +%Y%m%d%H%M%S)

# sw.js VERSION 自動bump (タイムスタンプ)
sed -i "" "s/const VERSION = 'v[0-9]*';/const VERSION = 'v$TS';/" sw.js
echo "→ SW VERSION bumped to v$TS"

git add -A
git -c commit.gpgsign=false commit -m "$MSG (v$TS)" || echo "(no changes to commit)"
git push origin main

echo ""
echo "GitHub Pages デプロイ待機..."
for i in $(seq 1 36); do
  STATUS=$(gh api /repos/puti1982/asahi-seihyou-pos/pages --jq .status 2>/dev/null)
  echo "  [$((i*5))s] status=$STATUS"
  [ "$STATUS" = "built" ] && break
  sleep 5
done

URL="https://puti1982.github.io/asahi-seihyou-pos/"
sleep 5
echo ""
curl -sL -o /dev/null -w "確認: %{http_code} - $URL\n" "$URL"
echo "✓ デプロイ完了"
