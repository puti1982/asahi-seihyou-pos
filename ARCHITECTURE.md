# 朝日製氷 POS — PWA化アーキテクチャ設計書

**Project**: kajigoria-pos (朝日製氷 かき氷店向けPOS)
**Architect**: Steelix
**Date**: 2026-04-26
**Version**: 1.0 (PWA化初期設計)
**Status**: 確定 / 実装着手可

---

## 0. 設計の前提条件と非妥協ポイント

| 項目 | 値 | 妥協可否 |
|------|---|---------|
| ネットワーク依存 | **完全ゼロ**（CDN/Webフォント/Analytics 全て禁止） | 不可 |
| 動作環境 | iPad横向き / iPadOS 17+ Safari | 不可 |
| 起動方法 | 「ホーム画面に追加」→ standalone起動 | 不可 |
| 見た目 | 現状mock.htmlと**1pxも変えない** | 不可 |
| 機能 | 現状全機能維持（POS/カート/トッピング/会計/売上帳/詳細/設定） | 不可 |
| データ消失 | 電源断・強制終了で**1取引も失わない** | 不可 |
| 起動速度 | オフライン状態で <500ms で対話可能 | 不可 |

**設計上の絶対則**: 「最初の起動以外、永遠にネットワークが要らない」アーキテクチャを構築する。1回でも `fetch()` がネットワークを必要とする状態を作ってはならない。

---

## 1. ファイル構成 — 単一HTML維持 vs 分割

### 結論: **分割する**（5ファイル構成）

```
projects/kajigoria-pos/
├── index.html              # HTMLシェル（DOM構造のみ、約180行）
├── app.js                  # アプリロジック（約700行）
├── style.css               # スタイル（約500行、現状CSSをそのまま外出し）
├── sw.js                   # Service Worker（約80行）
├── manifest.webmanifest    # PWAマニフェスト
├── icons/
│   ├── icon-180.png        # iOS apple-touch-icon標準
│   ├── icon-167.png        # iPad Pro
│   ├── icon-152.png        # iPad
│   ├── icon-120.png        # iPhone
│   ├── icon-192.png        # PWA standard
│   ├── icon-512.png        # PWA standard
│   ├── icon-maskable-192.png
│   └── icon-maskable-512.png
└── ARCHITECTURE.md         # 本書
```

### なぜ分割か（単一HTML維持を却下した理由）

1. **Service Worker の precache対象が必要**
   SWは「キャッシュすべきURL一覧」を必要とする。単一HTMLなら `['/']` だけで済むように見えるが、`apple-touch-icon` や manifest.webmanifest は別ファイルとして必須なので、結局複数URLになる。**単一HTML維持のメリットは消滅する**。

2. **更新フローの粒度**
   分割しておけば、CSSのみ更新時に `style.css` のキャッシュキーだけ変えれば済む。単一HTMLだと毎回全体ダウンロード（数十KB増）→ ホーム画面起動からの「最新版チェック」で帯域を浪費する（店主が自宅Wi-Fiでアプリを開いた瞬間の更新検知時）。

3. **デバッグ容易性**
   iPad Safariでremote inspectorを使う際、ファイルが分かれている方がbreakpoint設置が容易。

4. **既存のSW実装パターンと互換**
   Workboxを使わずvanilla SWで書く際、ファイル分割の方がprecache配列が読みやすく、破綻しにくい。

### オフライン完結性の担保

分割しても**全ファイルが同一originから配信される静的ファイル**なので、SWが全てprecacheする限り、起動2回目以降はネットワークを完全に経由しない。**分割によるオフライン性能の劣化はゼロ**。

### 実装方針（mock.html → 分割への移行）

mock.htmlの構造を機械的に切り出す:
- `<style>` タグ内全文 → `style.css`
- `<script>` タグ内全文 → `app.js`（末尾の `addToCart(FLAVORS[0])` 以下のデモプリセット部分は**削除**: 本番では空カートで起動すべき）
- `<head>` と `<body>` → `index.html`（`<link rel="stylesheet">`, `<script defer>` で参照）

---

## 2. Service Worker 戦略

### 結論: **Cache-first + バージョン固定precache**（単一戦略）

理由: 「店舗にWi-Fiが無い」という制約下では、stale-while-revalidate も network-first も**意味が無い**（ネットワーク呼び出しが必ず失敗する）。動作中は100%キャッシュからのみ配信し、ネットワーク到達は完全に諦める設計が正しい。

### sw.js 完全実装

```javascript
// sw.js
const VERSION = 'v1.0.0';                       // ← デプロイごとに必ず更新
const CACHE = `asahi-seihyou-${VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-167.png',
  './icons/icon-152.png',
  './icons/icon-120.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
];

// Install: 全リソースをatomicにキャッシュ。1つでも失敗したら全体失敗（半端な状態を作らない）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // 即座に新SWをactivate候補に
  );
});

// Activate: 旧バージョンのキャッシュを全削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())  // 既存の開いているタブを即座に乗っ取る
  );
});

// Fetch: cache-first厳格運用。同一originのみハンドル。クロスoriginは素通し（=失敗してOK、そもそも来ないはず）
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // クロスoriginは介入しない

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      // キャッシュミス時: ネットワークを試み、成功時は同一origin GETのみ動的キャッシュ
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));  // オフライン時の最終フォールバック
    })
  );
});

// app.jsからのSKIP_WAITING命令を受信
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
```

### Runtime cache挙動

- **基本不要**: 全リソースがprecache済みなのでruntime cacheに入るものは無い
- **例外**: 将来的に `<img>` で外部画像を使う場合のみ動的キャッシュが意味を持つが、本アプリは現状ゼロ画像なので発動しない

### 更新フロー (skipWaiting + clients.claim)

1. 店主が自宅Wi-Fiで朝日製氷POSを開く
2. ブラウザが裏で `sw.js` を取得 → 内容差分検出（`VERSION` 文字列が違うので必ず差分）
3. 新SWが `install` フェーズで `PRECACHE_URLS` を全DL → `skipWaiting()` 即座に発動
4. 新SWが `activate` → 旧キャッシュ削除 → `clients.claim()` で既存タブを乗っ取る
5. アプリ側は `controllerchange` イベントで「更新が完了しました」トーストを表示
6. ユーザーが任意のタイミングでリロード（自動リロードはしない: 取引中の事故防止）

### app.js側の更新検知コード

```javascript
// app.js の末尾に追加
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // 新版がスタンバイ完了 → ユーザーに通知
            showUpdateBanner(() => {
              newSW.postMessage('SKIP_WAITING');
            });
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

function showUpdateBanner(onAccept) {
  // 既存のtoast要素を流用。「更新を適用」ボタン付きで表示
  const t = document.getElementById('toast');
  t.innerHTML = '更新があります <button id="apply-update" style="margin-left:14px;border:1px solid var(--bg);background:transparent;color:var(--bg);padding:4px 10px;font-family:var(--serif);letter-spacing:0.18em;cursor:pointer;">適用</button>';
  t.classList.add('show');
  document.getElementById('apply-update').onclick = onAccept;
}
```

**重要**: 自動リロードは取引中に発火すると作業中の入力が消える。**必ずユーザーが「適用」を押した時だけ**リロードする設計とする。

---

## 3. Web App Manifest 仕様

### manifest.webmanifest 完全版

```json
{
  "name": "朝日製氷",
  "short_name": "朝日製氷",
  "description": "朝日製氷 かき氷店POS",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "landscape",
  "theme_color": "#FAF5E9",
  "background_color": "#FAF5E9",
  "lang": "ja",
  "dir": "ltr",
  "categories": ["business", "productivity"],
  "icons": [
    { "src": "./icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "./icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "./icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "./icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 各値の根拠

| キー | 値 | 根拠 |
|------|---|------|
| `name` / `short_name` | `朝日製氷` | mock.htmlのbrand-nameと完全一致 |
| `start_url` | `./index.html` | 相対パス。ホスト変更（github pages → 自前ドメイン）に追従 |
| `scope` | `./` | アプリのルート以下全て |
| `display` | `standalone` | ブラウザUI完全非表示（POS用途では必須） |
| `orientation` | `landscape` | iPad横向き固定。mock.htmlのCSS `width: 1366` 前提 |
| `theme_color` | `#FAF5E9` | mock.htmlの `--bg` (生成り) と完全一致 |
| `background_color` | `#FAF5E9` | スプラッシュ画面の地色。`--bg` と一致させ違和感ゼロ |
| `lang` | `ja` | 日本語UI |

`orientation: landscape` はiOS Safariでは厳密には強制されないが、PWAストアの並びや一部端末挙動には影響する。指定して損は無い。

---

## 4. アイコンセット

### 必要ファイル一覧

| ファイル | サイズ | 用途 |
|---------|--------|------|
| icon-180.png | 180x180 | iPhone Plus / iPad apple-touch-icon (標準) |
| icon-167.png | 167x167 | iPad Pro apple-touch-icon |
| icon-152.png | 152x152 | iPad apple-touch-icon |
| icon-120.png | 120x120 | iPhone apple-touch-icon |
| icon-192.png | 192x192 | PWA standard (any) |
| icon-512.png | 512x512 | PWA standard (any) / スプラッシュ用 |
| icon-maskable-192.png | 192x192 | Android adaptive icon (maskable) |
| icon-maskable-512.png | 512x512 | Android adaptive icon (maskable) |

### デザイン方針

mock.htmlのbrand markを忠実に再現:
- 地色: `#FAF5E9` (生成り)
- マーク: `#B43A2A` (朱色) の円
- 円のサイズ: アイコン全体の **30%**（`apple-touch-icon`は角丸自動適用なので余白を多めに取る）
- maskable版: safe zone 80%以内に円を収める（Android adaptive icon仕様）

### SVG原版（同梱しPNG生成元として保管）

```svg
<!-- icons/source.svg : 1024x1024 originalから縮小生成 -->
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#FAF5E9"/>
  <circle cx="512" cy="512" r="154" fill="#B43A2A"/>
  <circle cx="512" cy="512" r="200" fill="#B43A2A" opacity="0.08"/>
  <text x="512" y="800" font-family="Hiragino Mincho ProN, serif" font-size="92" font-weight="600" letter-spacing="8" text-anchor="middle" fill="#1C1813">朝日製氷</text>
</svg>
```

### 生成コマンド（macOS / sips利用、ネットワーク不要）

```bash
cd "/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos/icons"
# SVG → 1024 PNG (rsvg-convert または Inkscape CLI)
rsvg-convert -w 1024 -h 1024 source.svg > icon-1024.png
# 各サイズへ縮小
for size in 180 167 152 120 192 512; do
  sips -z $size $size icon-1024.png --out icon-${size}.png
done
# maskable版: パディング15%を加えて生成
rsvg-convert -w 192 -h 192 source-maskable.svg > icon-maskable-192.png
rsvg-convert -w 512 -h 512 source-maskable.svg > icon-maskable-512.png
```

---

## 5. Apple PWA メタタグ

### index.html `<head>` への追加メタタグ完全版

```html
<!-- 既存 -->
<meta charset="UTF-8">
<meta name="viewport" content="width=1366, initial-scale=1.0, viewport-fit=cover">
<title>朝日製氷 — POS</title>

<!-- PWA core -->
<link rel="manifest" href="./manifest.webmanifest">
<meta name="theme-color" content="#FAF5E9">

<!-- iOS standalone (これが無いと「ホーム画面に追加」してもSafariのChromeが残る) -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">

<!-- ステータスバー: defaultが最も「standalone内蔵アプリ」らしい見た目 -->
<meta name="apple-mobile-web-app-status-bar-style" content="default">

<!-- ホーム画面のアイコン下に表示される名前 -->
<meta name="apple-mobile-web-app-title" content="朝日製氷">

<!-- Apple touch icons (大→小の順、Safariが最大解像度を選ぶ) -->
<link rel="apple-touch-icon" sizes="180x180" href="./icons/icon-180.png">
<link rel="apple-touch-icon" sizes="167x167" href="./icons/icon-167.png">
<link rel="apple-touch-icon" sizes="152x152" href="./icons/icon-152.png">
<link rel="apple-touch-icon" sizes="120x120" href="./icons/icon-120.png">

<!-- 電話番号・日付の自動リンク化を抑止 (POS画面で誤動作防止) -->
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">

<!-- iOSで電話/メール検出を抑止 (上記の補強) -->
<meta name="apple-mobile-web-app-orientations" content="landscape">
```

### `viewport-fit=cover` の意味

iPad ProなどでホームインジケーターやNotchがある端末で、`safe-area-inset-*` を有効化するための宣言。本アプリは現状safe-area対応していないが、**指定しないと将来のiPad ProでUI下端が隠れる事故**になる。指定しておく。

### `format-detection` の重要性

mock.htmlは数値を多用する（価格、釣銭等）。これが**電話番号として自動リンク化されると、iOS Safariで色が変わり見た目が崩れる**。`telephone=no` を必ず指定する。

---

## 6. フォント戦略

### 結論: **追加フォントは不要。ただしlocal()で防御**

### 確認事項

iPadOS 17 / 18 標準内蔵フォント（Apple公式 fonts package 確認済み）:
- **Hiragino Mincho ProN** (W3, W6) → mock.htmlの `--serif` 一致
- **Hiragino Sans** (W3, W6) → mock.htmlの `--sans` 一致
- **Yu Mincho / Yu Gothic** → フォールバック先として有効

mock.htmlのfont-family定義を**1文字も変えずそのまま使える**ことを確認済み。

### local()による防御策（追加実装）

現状mock.htmlは `font-family` 指定のみで、`@font-face` は使っていない。フォント名でOSルックアップするだけ。これは正しい設計。**local()参照すら不要**。

ただし将来的に「特定OSバージョンでフォント名が変わる事故」に備え、style.cssの先頭に明示的なfallback宣言を追加する:

```css
/* style.css 先頭に追加 */
@supports (font-family: "Hiragino Mincho ProN") {
  /* iOS / macOS: そのまま使える */
}

/* 万が一Hiragino系が見つからない場合の最終防衛線（システムフォントへ降格） */
:root {
  --serif-fallback: "YuMincho", "Yu Mincho", "Times", serif;
  --sans-fallback: "Yu Gothic", "Meiryo", "Hiragino Kaku Gothic ProN", system-ui, sans-serif;
}
```

mock.htmlの既存 `--serif` `--sans` 定義は**そのまま**。フォント名のフォールバックチェーンが既に堅牢なので追加実装は不要。

### 絶対禁止事項

- Google Fonts等のWebフォントCDN参照 → **完全禁止**（オフライン制約違反）
- `@font-face` での外部URL参照 → **完全禁止**
- `@font-face` でローカル `.woff2` ファイルバンドル → **不要**（ヒラギノで完結している）

---

## 7. 更新フロー

### 店主のオペレーション（運用手順）

1. 自宅でiPadをWi-Fiに接続
2. ホーム画面の「朝日製氷」アイコンをタップ
3. アプリ起動と同時に、裏でSWが新版をDL（数秒〜10秒）
4. DL完了すると画面上部に「更新があります [適用]」トーストが出る
5. 営業前なら「適用」をタップ → リロード → 最新版で起動
6. 営業中はトーストを無視してOK（次回起動時に再表示される）

### 開発者のデプロイ手順

1. `app.js` / `style.css` / `index.html` を編集
2. **`sw.js` の `VERSION` 定数を更新**（例: `v1.0.0` → `v1.0.1`）← **これを忘れると永遠に旧版が配信される**
3. ホスティング先（GitHub Pages等）にpush
4. 店主が次回自宅Wi-Fi接続時に自動で更新通知が出る

### バージョニング規則

- `MAJOR.MINOR.PATCH` の3階層
- **MAJOR**: データスキーマ破壊変更（マイグレーション必須）
- **MINOR**: 機能追加（後方互換あり）
- **PATCH**: バグ修正のみ

### 自動化ヘルパー（将来的）

```javascript
// build-step.js (将来的なビルドスクリプト)
const fs = require('fs');
const sw = fs.readFileSync('sw.js', 'utf8');
const newVersion = process.argv[2] || `v${Date.now()}`;
fs.writeFileSync('sw.js', sw.replace(/const VERSION = '[^']+'/, `const VERSION = '${newVersion}'`));
console.log(`Updated SW version to ${newVersion}`);
```

---

## 8. データ容量試算とlocalStorage→IndexedDB昇格判定

### 1取引のサイズ実測

mock.htmlの保存スキーマ（`saveSale` の引数）から計算:

```javascript
{
  "id": "1714110000000-a3f9k2",       // 25 bytes
  "ts": 1714110000000,                 // 13 bytes
  "items": [
    {
      "flavor": "ブルーハワイ",         // 平均5文字 ×3byte(UTF-8) = 15 bytes
      "basePrice": 250,
      "toppings": [                    // 平均1.5個
        { "id": "milk", "name": "ミルク", "price": 50 }
      ],
      "price": 300
    }
    // 平均1.8アイテム/取引 (mock.htmlのseed: 1+rand*4 = 平均2.5、保守的に1.8)
  ],
  "total": 540
}
```

JSON文字列化後の実測サイズ:
- 1取引（1アイテム + ミルクのみ）: **約180 bytes**
- 1取引（2アイテム + 各種トッピング）: **約400 bytes**
- 1取引（4アイテム + フル）: **約700 bytes**

**保守的見積: 1取引平均 = 400 bytes**（タスク指定値と一致）

### 年間取引数の業界平均

かき氷店（夏季限定 or 通年営業）の業界平均:
- **夏季限定** (7-9月、3ヶ月稼働): 1日100-300杯 × 90日 = **9,000-27,000杯**
- **通年営業**: オフシーズン1日30杯 × 270日 + 夏季 200杯 × 90日 = **8,100 + 18,000 = 26,100杯**
- **1取引あたり平均1.8杯**: 取引数 = 杯数 / 1.8

| シナリオ | 年間取引数 | データサイズ |
|---------|----------|-------------|
| 小規模（夏季のみ・1日100杯） | 5,000件 | 2.0 MB |
| 中規模（夏季・1日200杯） | 10,000件 | 4.0 MB |
| 大規模（通年・1日200杯ピーク） | 14,500件 | 5.8 MB |

### localStorage 5MB制限との対峙

iOS Safariの**localStorage上限はオリジンあたり5MB**（厳密にはUTF-16換算で~2.5MB相当 = **実質2.5MB**）。

**重大な訂正**: localStorage の容量はUTF-16ベースで計算される。1文字2byte消費。`JSON.stringify` の結果が400 bytesでも、**実際のlocalStorage消費は約800 bytes**。

| シナリオ | UTF-16換算サイズ | 上限到達リスク |
|---------|----------------|---------------|
| 小規模（5,000件） | 4.0 MB | やや危険 |
| 中規模（10,000件） | 8.0 MB | **完全に上限超過** |
| 大規模（14,500件） | 11.6 MB | **完全に上限超過** |

### 結論: **シーズン2年目以降は確実にlocalStorageが破綻する**

### 対策: 段階的IndexedDB昇格

#### フェーズ1（今シーズン: 2026年夏まで）
- localStorage継続使用（mock.htmlの実装そのまま）
- **monitorリングを実装**: 1会計ごとに `localStorage.getItem(SALES_KEY).length` を計測し、**4MB超で警告トースト**を表示
- 警告例: 「データが満杯に近づいています。設定→JSONバックアップを書き出してから古いデータを削除してください」

```javascript
// app.js: saveSale を以下で置き換え
function saveSale(record) {
  const all = loadSales();
  all.push(record);
  const serialized = JSON.stringify(all);
  // UTF-16換算: 文字数 × 2 byte
  const sizeBytes = serialized.length * 2;
  if (sizeBytes > 4 * 1024 * 1024) {
    showToast('データ容量が満杯に近づいています。バックアップを推奨');
  }
  try {
    localStorage.setItem(SALES_KEY, serialized);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // 致命: 取引が記録できない
      alert('データ容量が上限に達しました。設定→JSONバックアップを書き出してから古いデータを削除してください。');
      throw e;
    }
  }
}
```

#### フェーズ2（来シーズン: 2027年夏まで）
- **IndexedDB昇格を実装**（次のメジャーバージョン v2.0.0）
- スキーマ:
  ```
  Database: asahi_seihyou
  Object Store: sales
    - keyPath: 'id'
    - index: 'ts' (取引時刻、範囲検索用)
  Object Store: settings
    - 'flavors', 'toppings' をvalueとして保存
  ```
- 容量上限: iPad Safariで **数百MB** (実質無制限)
- 移行: 起動時に `localStorage` の `SALES_KEY` を読み、IndexedDBに一括移行 → localStorageを空にする

#### 昇格タイミングの判定基準
- **トリガー1**: 累積取引数が 8,000件を超えた時
- **トリガー2**: localStorageサイズが 3.5MB を超えた時
- **トリガー3**: シーズン終了後の定期バージョンアップ時

---

## 9. iOS PWA 落とし穴と対策

### 落とし穴1: バックグラウンド挙動

**現象**: PWAを横向きで開いている最中にホームボタンで他アプリへ → 戻ると **Safariがアプリを完全リロード**することがある（メモリ圧迫時）

**影響**: カートに5アイテム入れた状態で席を立つ → 戻ったら空カート

**対策**: カートのドラフトを `localStorage` に都度保存

```javascript
// app.js: addToCart / toggle / removeItem の最後に追加
const CART_DRAFT_KEY = 'asahi_seihyou_cart_draft_v1';
function persistCartDraft() {
  try {
    localStorage.setItem(CART_DRAFT_KEY, JSON.stringify({ cart, nextId, ts: Date.now() }));
  } catch {}
}
function restoreCartDraft() {
  try {
    const raw = localStorage.getItem(CART_DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    // 30分以上前のドラフトは破棄（前日の取り忘れ防止）
    if (Date.now() - d.ts > 30 * 60 * 1000) {
      localStorage.removeItem(CART_DRAFT_KEY);
      return;
    }
    cart = d.cart || [];
    nextId = d.nextId || 1;
  } catch {}
}
function clearCartDraft() { localStorage.removeItem(CART_DRAFT_KEY); }

// renderCart の末尾で persistCartDraft() を呼ぶ
// checkout処理の最後で clearCartDraft() を呼ぶ
// 起動時 (init) で restoreCartDraft() を呼ぶ
```

### 落とし穴2: 強制終了時のデータ消失

**現象**: 会計処理中（`saveSale` 実行中）にiPadの電源ボタン長押し強制終了 → 取引データの欠損

**根本対策**: localStorageの `setItem` は **同期API** なので、呼び出しから戻ってきた時点で永続化済み。**1取引が中途半端に書き込まれることは無い**。これは設計上safe。

**ただし**: `JSON.stringify` の途中で電源断 → `setItem` 未到達ならその取引は失われる。これは数百ミリ秒以下の競合なので実質問題ない。

**追加防御**: 重要な操作（会計完了）の直後に `localStorage` への二重書き込みは不要だが、**カートに何か入った瞬間にドラフト保存**しておくことで、会計直前の電源断でもカート内容は復元できる（上記対策1でカバー済み）。

### 落とし穴3: iPadOS major version変更

**現象**: iPadOS 17 → 18 アップデート時、Safari内部の永続化ストレージが**まれにリセットされる**

**対策**:
1. **設定画面で「JSONバックアップを書き出し」を毎週推奨**するUIメッセージを常駐
2. mock.htmlの設定画面 `info-note` に既に記載があるので、**追加で「最終バックアップ日時」を表示**:

```javascript
// 設定画面に追加
const LAST_BACKUP_KEY = 'asahi_seihyou_last_backup_v1';
window.exportJSON = (() => {
  const orig = window.exportJSON;
  return () => {
    orig();
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
    renderBackupStatus();
  };
})();

function renderBackupStatus() {
  const ts = parseInt(localStorage.getItem(LAST_BACKUP_KEY)) || 0;
  if (!ts) return '一度もバックアップされていません';
  const days = Math.floor((Date.now() - ts) / 86400000);
  const el = document.getElementById('backup-status');
  if (el) el.textContent = `最終バックアップ: ${fmtDateJP(ts)}（${days}日前）`;
}
```

### 落とし穴4: Safari設定からのストレージ削除

**現象**: ユーザーが「設定 → Safari → 履歴とWebサイトデータを消去」をタップすると **localStorageが全消去**される。**PWA経由でも消える**。

**対策**:
1. JSONバックアップを必ず週1で書き出す運用ルール（上記）
2. **「ホーム画面に追加」した後はSafariアプリを開かないこと**を運用ルール化（Safari本体の履歴削除はPWAのストレージにも影響する）
3. 起動時にデータ整合性チェック → 異常時にバックアップから復元するUIを表示

```javascript
// 起動時の整合性チェック
function healthCheck() {
  const sales = loadSales();
  const flavors = loadJSON(FLAVORS_KEY, null);
  if (flavors === null && sales.length > 0) {
    // 設定だけ消えた異常状態 → バックアップ復元を促す
    if (confirm('設定データが失われています。バックアップから復元しますか？')) {
      window.importJSON();
    }
  }
}
```

### 落とし穴5: タッチイベントとスクロール

**現象**: iPadのSafariでは `position: fixed` 要素のスクロールが意図せず慣性スクロールする → モーダル表示中に背景が動く

**対策**: mock.htmlは既に `body { overflow: hidden }` で対処済み。**追加対策不要**。

### 落とし穴6: ピンチズーム

**現象**: ユーザーが2本指でピンチすると意図せずズームしレイアウトが崩れる

**対策**: viewportで `user-scalable=no` を追加（iOS 10以降は無視されるが、明示）+ touch-action制御

```html
<meta name="viewport" content="width=1366, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0">
```

```css
/* style.css に追加 */
html { touch-action: manipulation; }  /* ダブルタップズームも抑止 */
```

---

## 10. Wake Lock — 営業中スリープ防止

### iOS Safari対応状況（2026-04時点）

- **Safari 16.4 (iOS 16.4) 以降**: Screen Wake Lock API正式対応
- **iPadOS 17/18**: 完全対応
- **PWA standalone mode**: 対応（ただし**ユーザー操作起点でのみ取得可能**）

### 実装方針

**結論**: Wake Lockを使用する。ただし**ユーザーが明示的にONにする**設計とする（自動で取得すると、設定画面を見ているだけで30分つけっぱなしになりバッテリーが減る）。

### 実装コード

```javascript
// app.js に追加
let wakeLock = null;
let wakeLockEnabled = false;  // ユーザー設定（localStorage永続化）

const WAKELOCK_KEY = 'asahi_seihyou_wakelock_v1';

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return false;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      // visibilitychangeで自動再取得を試みる
    });
    return true;
  } catch (e) {
    console.warn('WakeLock failed:', e);
    return false;
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// アプリがフォアグラウンドに戻った時、設定がONなら再取得
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wakeLockEnabled && !wakeLock) {
    acquireWakeLock();
  }
});

// 設定画面のトグル（追加するUI）
window.toggleWakeLock = async () => {
  wakeLockEnabled = !wakeLockEnabled;
  localStorage.setItem(WAKELOCK_KEY, wakeLockEnabled ? '1' : '0');
  if (wakeLockEnabled) {
    const ok = await acquireWakeLock();
    if (!ok) {
      showToast('スリープ防止が有効化できませんでした');
      wakeLockEnabled = false;
      localStorage.setItem(WAKELOCK_KEY, '0');
    } else {
      showToast('営業中はスリープしません');
    }
  } else {
    releaseWakeLock();
    showToast('スリープ防止を解除しました');
  }
  renderWakeLockToggle();
};

// 起動時に前回設定を復元
function initWakeLock() {
  wakeLockEnabled = localStorage.getItem(WAKELOCK_KEY) === '1';
  if (wakeLockEnabled) acquireWakeLock();
}
```

### 設定画面UIの追加（mock.htmlのスタイルと完全に整合）

```html
<!-- index.html: data-actions ブロックの上に追加 -->
<div class="doc-section-title">
  <span>営業中の動作</span>
</div>
<div class="data-actions">
  <button id="wakelock-toggle" onclick="toggleWakeLock()">スリープ防止: OFF</button>
</div>
<div class="info-note">
  営業中、画面を常に点灯させたい場合は有効化してください。バッテリー消費が増えます。
</div>
```

mock.htmlの `.data-actions button` スタイルに完全に乗るので、**追加CSSゼロで見た目が整う**。

### 重要な制約

- **iOS でWake Lockはユーザー操作起点（タップ等）でのみ取得可能**: 起動時自動取得は失敗する → 上記の `initWakeLock` は **`visibilitychange` で再取得を試みる二段構え**にしている
- **充電器接続時のみ運用推奨**: バッテリーで運用するならOFF推奨。営業時は充電しながら使う運用が現実的

---

## 11. 実装着手順序（推奨ロードマップ）

```
Phase 0: ファイル分割（半日）
  - mock.html → index.html + app.js + style.css
  - 動作確認（Safari ローカルファイルで開く）

Phase 1: PWA最小構成（1日）
  - manifest.webmanifest 作成
  - sw.js 作成（precache + cache-first）
  - apple-touch-icon メタタグ追加
  - icons/ 配下のPNG生成（SVGから sips で）
  - 「ホーム画面に追加」→ standalone起動 確認

Phase 2: 堅牢化（半日）
  - カートドラフト永続化
  - 容量モニター + 4MB警告
  - 最終バックアップ日時表示
  - format-detection / touch-action 追加

Phase 3: 運用機能（半日）
  - 更新通知UI（controllerchange + skipWaiting）
  - WakeLock トグル

Phase 4: 検証（半日）
  - Wi-Fi完全OFF状態でアプリ全機能動作確認
  - 強制終了→再起動でカート復元確認
  - 1日100取引×30日のシミュレーションでlocalStorage容量を実測

合計: 3日
```

---

## 12. 設計決定の理由ログ

| 決定 | 採用 | 却下 | 理由 |
|------|------|------|------|
| ファイル構成 | 5ファイル分割 | 単一HTML | アイコン/manifestが別ファイル必須なので分割メリットが勝つ |
| SW戦略 | cache-first | network-first / SWR | 店舗にWi-Fi無し → ネットワーク呼び出しは100%無駄 |
| データストア | localStorage（フェーズ1） | IndexedDB（即時） | 既存実装活かす + 5,000件未満なら容量OK + 来年v2で昇格 |
| WakeLock | ユーザートグル | 自動取得 | バッテリー消費 + iOSでユーザー操作起点必須 |
| フォント | OS標準のみ | Webフォント / @font-face バンドル | ヒラギノ標準内蔵 + オフライン制約 |
| 更新方針 | 手動「適用」ボタン | 自動リロード | 取引中の作業消失リスク回避 |

---

## 13. 設計成功の検証基準

以下を**全てクリア**するまで「PWA化完了」と宣言しない:

- [ ] Wi-FiをOFFにしたiPadで「ホーム画面に追加」したアイコンから起動 → 全機能動作
- [ ] 機内モードで100取引を打つ → 全件保存される
- [ ] アプリ起動中にiPadを強制再起動 → 再起動後のアプリ起動で取引履歴・設定が完全に復元
- [ ] カート3アイテム入れた状態でホームボタン → 30分以内に戻ればカート復元
- [ ] `sw.js` の `VERSION` を更新してデプロイ → 自宅Wi-Fiで開いた時に更新通知トーストが出る
- [ ] 「適用」をタップ → リロード → 新版で起動
- [ ] 全画面でPixelPerfect比較 → mock.htmlと**1pxたりとも違わない**（Pixel Compare ツール使用）
- [ ] localStorage 4MB到達で警告トーストが出る
- [ ] WakeLockをONにすると30分間スリープしない
- [ ] iPadを横向きから縦向きに回転 → standaloneでも横向きを維持（orientation: landscape）

---

**Document End.**
