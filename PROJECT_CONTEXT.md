# 朝日製氷 POS — プロジェクト総括コンテキスト

**最終更新**: 2026-04-28
**ステータス**: 本番稼働中（引渡し直前・販売履歴クリーン待ち）
**バージョン**: v20260428004212

---

## 1. プロジェクトの本質

| 項目 | 内容 |
|---|---|
| **クライアント** | カジゴリアさん（実会社名: 朝日製氷） |
| **業態** | かき氷店向けPOS（レジ計算・売上記録ツール） |
| **依頼の起点** | 「即売レジ」アプリの不満解消（後付けトッピングが削除→再追加の2手間になる問題） |
| **公開URL** | https://puti1982.github.io/asahi-seihyou-pos/ |
| **GitHubリポジトリ** | https://github.com/puti1982/asahi-seihyou-pos |
| **プロジェクトパス** | `/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos/` |

---

## 2. 絶対制約（変更不可）

1. **店舗にWi-Fi無し** → 完全オフライン動作必須
2. **タブレット**: Hitab OS Android 15（system version 20250317-V1.0）
3. **iPad/Androidネイティブ数字キーボード使用禁止** → アプリ内テンキー必須
4. **営業中の操作ミス対応** → 取引個別削除機能必須
5. **電源断でデータ消失禁止** → localStorage 同期書き込み

---

## 3. 技術スタック

| レイヤー | 採用 | 不採用 |
|---|---|---|
| フロント | 素のHTML/CSS/JavaScript | React/Vue/フレームワーク |
| ストレージ | localStorage（v1）| IndexedDB（v2予定） |
| Service Worker | cache-first + バージョン固定precache | network-first / SWR |
| ホスティング | GitHub Pages | Vercel/Netlify/独自ドメイン |
| ビルド | なし（単一ファイル直接） | webpack/vite |
| 言語 | 日本語専用 | i18n |

---

## 4. ファイル構成

```
projects/kajigoria-pos/
├── 本体 (5ファイル)
│   ├── index.html              # DOMシェル + PWAメタタグ + CSP
│   ├── app.js                  # 全アプリロジック (約1200行)
│   ├── style.css               # wa-modernデザインシステム (約1100行)
│   ├── sw.js                   # cache-first SW（VERSION自動bump）
│   └── manifest.webmanifest    # PWAマニフェスト
│
├── アイコン (icons/)
│   ├── source.svg              # 暖簾デザイン: 紺地+白円相+氷+純氷
│   ├── source-maskable.svg
│   ├── icon-1024.png           # 全サイズの元
│   ├── icon-{180,167,152,120}.png  # iOS apple-touch-icon
│   ├── icon-{192,512}.png      # PWA standard
│   └── icon-maskable-{192,512,1024}.png  # Android adaptive
│
├── 31味イラスト (images/)
│   └── 01-ichigo.svg ... 31-beni-imo.svg
│
├── 画像生成キット
│   ├── generate_placeholders.py  # SVGプレースホルダー生成
│   ├── generate_images.py        # DALL-E 3 バッチ生成
│   ├── update_prompts.py         # プロンプト更新
│   └── prompts.json              # 31味のDALL-E用完成プロンプト
│
├── 運用
│   ├── deploy.sh                  # ワンコマンドデプロイ（VERSION bump+push+確認）
│   └── INSTALL_GUIDE.md           # 店主向け運用ガイド
│
└── 設計・監査ドキュメント
    ├── PROJECT_CONTEXT.md         # 本ファイル（総括）
    ├── ARCHITECTURE.md            # Steelix PWA設計書
    ├── RESEARCH.md                # Espeon視覚研究（kinari-zen-overhead）
    ├── DESIGN_CRITIQUE.md         # Absol批評（25項目）
    ├── SECURITY_AUDIT.md          # Bastiodonセキュリティ
    ├── CODE_AUDIT.md              # Luxrayコード/A11y
    ├── QA_REPORT.md               # Chansey機能QA
    ├── README_IMAGES.md           # 画像生成手順（店主向け）
    └── AUDIT_*.md                 # 各イテレーションの監査履歴
```

---

## 5. デザインシステム

### 5.1 カラーパレット

```css
--bg:        #FAF5E9    /* 生成り (背景) */
--paper:     #FFFFFF    /* 紙白 */
--ink:       #1C1813    /* 墨 (主テキスト) */
--ink-2:     #4A4239    /* 副テキスト */
--ink-3:     #8A8175    /* 補助テキスト */
--line:      #E5DAC0    /* ヘアライン */
--line-2:    #CFC1A2    /* やや濃い罫線 */
--shu:       #B43A2A    /* 朱 (アクセント) */
--shu-2:     #8E2C1F    /* 深い朱 (合計金額用) */
--ai:        #1F3A5F    /* 藍 (補助色) */

/* ロゴ専用 */
ロゴ紺地:     #142852    /* 暖簾の藍色 */
```

### 5.2 朱色の使用場所（3箇所限定原則）

1. **合計金額** (.checkout-bar .val) — 朱色 #8E2C1F
2. **ロゴ中央コア** (icons/source.svg の 円相内側に部分的に)
3. **会計完了トースト** (showToast withSeal=true 時の角印 SVG)

### 5.3 タイポグラフィ

```css
--serif: 'Hiragino Mincho ProN', 'YuMincho', 'Yu Mincho', serif;
--sans:  'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', system-ui;
--num:   'Hiragino Mincho ProN', Georgia, serif;
```

- **見出し・金額**: 明朝（var(--serif) / var(--num)）
- **UI ラベル**: ヒラギノ角ゴ（var(--sans)）
- **数字**: tabular-nums + lining-nums（桁揃え）
- **letter-spacing**: 漢字 0.04em / カナ 0.02em / 欧文 0.18em

### 5.4 敬語UI（重要・変更不可）

| 表記 | 意味 |
|---|---|
| 御注文 | カート見出し |
| 御会計 | 合計金額バー左ラベル |
| 品書 | 商品一覧 |
| 売上帳 | 売上集計 |
| 会計確定 (CTA) | 会計確定ボタン（横一列バー右端） |

**注**: お預かり / 御釣銭 は v15 で機能廃止（クライアント要望: 釣銭計算を頭の中で行うため不要）。

---

## 6. ロゴデザイン（暖簾）

### 6.1 デザイン仕様

クライアント提供のかき氷店暖簾画像をベースに再現:

```
┌─────────────────┐
│ 紺地 #142852    │
│   ╭────╮       │
│   │  氷  │     │ ← 白の円相 (enso) + 氷の毛筆書
│   ╰────╯       │
│           純氷  │ ← 右下に「純氷」小書
└─────────────────┘
```

### 6.2 適用箇所

1. **アプリ内ヘッダー**（index.html 内インラインSVG）
2. **PWAホーム画面アイコン**（icons/*.png 全サイズ）

### 6.3 ロゴ変更時の手順

```bash
# 1. icons/source.svg を編集
# 2. アイコン再生成
cd "/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos/icons"
mkdir -p /tmp/asahi-icon-out
qlmanage -t -s 1024 -o /tmp/asahi-icon-out source.svg
cp /tmp/asahi-icon-out/source.svg.png icon-1024.png
for size in 180 167 152 120 192 512; do
  sips -z $size $size icon-1024.png --out icon-${size}.png
done
cp icon-1024.png icon-maskable-1024.png
sips -z 192 192 icon-maskable-1024.png --out icon-maskable-192.png
sips -z 512 512 icon-maskable-1024.png --out icon-maskable-512.png

# 3. index.html の brand-mark インラインSVGを同期
# 4. デプロイ
cd ..
./deploy.sh "ロゴ更新"
```

---

## 7. レイアウト構造（最終形・v18）

```
┌────────────────────────┬────────────────────────────────┐
│                        │ ロゴ朝日製氷 / clock / 売上帳 / 設定 │ 52px ヘッダー
│ ─ 御注文                ├────────────────────────────────┤
│                        │ 品書 / 全品 ¥250                │ flavor-header
│                        ├────────────────────────────────┤
│ ┌────────────────────┐ │ ┌─────┬─────┬─────┐         │
│ │  カートリスト       │ │ │① いちご│② メロン│③ レモン │         │
│ │  (上端~bottom-bar) │ │ │④ ブルー │⑤ ピーチ│⑥ グレープ│         │
│ │                    │ │ │  ハワイ│       │         │         │
│ │                    │ │ │ ...                       │         │
│ │                    │ │ │㉝ 巨峰&ベリー              │         │
│ │                    │ │ └─────┴─────┴─────┘         │
│ ├────────────────────┤ │                                │
│ │御会計 ¥1,250 [会計確定]│ │  ← 横一列バー (v17)           │
│ └────────────────────┘ │                                │
└────────────────────────┴────────────────────────────────┘
   ↑ padding-bottom: max(24px, safe-area-inset-bottom) ↑
   (Hitab Android ナビバー回避)
```

### 7.1 主要寸法

| 要素 | 寸法 |
|---|---|
| .app | grid-template-rows: **1fr** / height: 100dvh / padding-bottom: max(24px, env(safe-area-inset-bottom)) |
| **.view.active** | **display: grid; grid-template-rows: 1fr; min-height: 0** ★v18でバグ修正必須化 |
| view-pos | grid-template-columns: clamp(340px, 34vw, 420px) minmax(0, 1fr) |
| cart-panel | flex column / **height: 100% / overflow: hidden** ★v18 |
| flavor-panel | flex column / **height: 100% / overflow: hidden** ★v18 |
| 商品グリッド | repeat(3, minmax(0, 1fr)) + grid-auto-rows: 110px |
| 番号バッジ | 24×24 円形 (border-radius:50%) |
| .checkout-bar (v17) | flex / gap:10px / padding:10px 12px / min-height:64px / border-top:1px ink |
| .checkout-bar .lbl | 12px serif / 0.22em letter-spacing |
| .checkout-bar .val | 28px num / 0.02em / 朱赤(#8E2C1F) / text-align:center / flex:1 |
| .cta（会計確定） | 黒地白字 / 15px serif / padding:12px 18px / **min-height:48px** (Apple HIG) |

---

## 8. 機能仕様

### 8.1 POS入力フロー（v15以降・簡素化）

1. 右パネル（品書）から味タップ → カート追加（1タップ=1行）
2. カート内アイテムでトッピング切替（後付け変更のワンタップ操作）
3. 横一列バー右端「**会計確定**」タップで売上記録 + カートクリア

**注**: お預かり / 御釣銭 / テンキーは v15 で全廃止（クライアント要望）。
釣銭計算は店主が頭で行うため、合計金額表示のみで十分。

### 8.2 商品データ

- **33味**（ALL ¥250 統一価格）
  - いちご, メロン, レモン, ブルーハワイ, ピーチ, グレープ, マンゴー, コーラ, ラムネ, みぞれ
  - 青リンゴ, 真っ赤なリンゴ, スイカ, オレンジ, マスカット, ダブルベリー
  - 日向夏, ソルティーライチ, エメラルドパイン, カシスオレンジ, ヨーグルト
  - 抹茶, コーヒー, 紅茶, ドラキュラ, エイリアン, プリンセス, 王子様
  - パワーエナジー, イナズマジンジャー, 紅いも, 塩みかん, 巨峰＆ベリー

- **トッピング3種**
  - ミルク +¥50
  - スプーン +¥10
  - 特製カップ +¥200

- **価格設定**: 設定画面から個別価格変更可能。一律変更/部分変更どちらも可。

### 8.3 売上記録

- **保存時**: 「会計確定」タップで `localStorage.asahi_seihyou_sales_v1` に同期書き込み
- **保存内容**:
  - id (タイムスタンプ + ランダム)
  - ts (Unix時刻)
  - items[] (各アイテムの flavor / basePrice / toppings / price)
  - total (合計)

### 8.4 売上帳

- **当日売上モーダル**: ヘッダー右の「売上帳」タップ
  - 価格項目別集計（かき氷/ミルク/スプーン/特製カップ）
  - 合計金額・取引件数・平均単価
  - **本日の取引一覧**（HH:MM時刻 + 内容 + 金額 + 削除ボタン）
- **詳細ビュー**: モーダル内「詳細を見る →」
  - 期間プリセット（直近7/30/90/今月/全期間）
  - カスタム期間ピッカー
  - 日別表（味/トッピング/取引/売上）

### 8.5 取引修正（誤会計の取消）

- 売上帳モーダル下部「本日の取引」リスト
- 各取引の「削除」ボタン → 確認ダイアログ → localStorage から該当取引削除
- 集計が即時再描画される

### 8.6 設定画面（スタッフ全員アクセス可・PIN無し）

- **品書き管理**: 追加/削除/編集/▲▼並び替え/色変更
- **トッピング管理**: 追加/削除/編集/並び替え
- **データ管理**:
  - JSONバックアップ書き出し
  - JSONバックアップから復元
  - 全販売履歴消去（3秒クールダウン+二重確認）
  - 品書き・トッピング初期値復元
- **営業中スリープ防止**（WakeLockトグル）

---

## 9. PWA仕様（オフライン）

### 9.1 Service Worker

- **戦略**: cache-first + バージョン固定precache
- **VERSION**: deploy.sh 実行時にタイムスタンプ自動bump
- **PRECACHE対象**: index.html, app.js, style.css, sw.js, manifest, アイコン全サイズ, 31味SVG
- **更新フロー**:
  - install で `cache.addAll`（auto-skipWaiting なし → ユーザータップ必須）
  - statechange='installed' で「更新があります」トースト表示
  - 「適用」タップ → `postMessage('SKIP_WAITING')` → activate → controllerchange → reload
  - **1.5秒timeout fallback** で確実にreload

### 9.2 更新検知の堅牢性（4重防御）

1. `navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })` — HTTPキャッシュバイパス
2. 起動時 `reg.update()` 明示
3. 5分ごと `reg.update()` 自動
4. 既存 `reg.waiting` 検知時に即トースト

### 9.3 永続化

- **localStorage キー**:
  - `asahi_seihyou_sales_v1` — 取引履歴
  - `asahi_seihyou_flavors_v1` — 味設定
  - `asahi_seihyou_toppings_v1` — トッピング設定
  - `asahi_seihyou_cart_draft_v1` — カートドラフト（30分expiry）
  - `asahi_seihyou_seeded_v1` — シードフラグ（廃止予定、起動時削除）
  - `asahi_seihyou_wakelock_v1` — WakeLock設定
  - `asahi_seihyou_last_backup_v1` — 最終バックアップ日時

- **容量管理**:
  - 4MB到達で警告トースト
  - QuotaExceededError catchで取引保護
  - 来シーズンv2でIndexedDB昇格予定

### 9.4 viewport設定（実画面追従）

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5, user-scalable=yes">
```

- `width=device-width` で実画面幅に追従（旧width=1366固定でoverflow発生 → 修正済）
- `maximum-scale=5` でWCAG 1.4.4準拠（200%拡大OK）

---

## 10. 開発・運用フロー

### 10.1 デプロイ（ワンコマンド）

```bash
cd "/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos"
./deploy.sh "コミットメッセージ"
```

deploy.sh は以下を自動実行:
1. sw.js の VERSION をタイムスタンプで bump
2. git add -A → commit → push origin main
3. GitHub Pages のビルド完了待機（最大3分）
4. 公開URLへの応答確認（HTTP 200）

### 10.2 タブレット側更新フロー

1. タブレットを Wi-Fi接続
2. ホーム画面の朝日製氷アイコン起動
3. 「**更新があります [適用]**」トースト表示
4. 「適用」タップ → 1.5秒以内にreload → 最新版

### 10.3 完全リセット（緊急時のみ）

1. ホーム画面アイコン長押し → 削除
2. Chrome「設定 → プライバシー → 閲覧履歴データの削除」
3. ChromeでURL再アクセス → 「ホーム画面に追加」

---

## 11. クライアント要望対応の早見表

### 11.1 商品関連

| 要望 | 変更箇所 | 方法 |
|---|---|---|
| 味の追加 | 設定画面 OR app.js DEFAULT_FLAVORS | 設定UIから新規追加（推奨）or DEFAULT配列にエントリ追加 |
| 味の削除 | 設定画面 | 設定UIの「削除」ボタン |
| 味の価格変更 | 設定画面 | 価格欄を直接編集（focusOutで保存） |
| 味の並び替え | 設定画面 | ▲▼ ボタン |
| トッピング追加 | 設定画面 OR app.js DEFAULT_TOPPINGS | 設定UI |
| トッピング金額変更 | 設定画面 | 金額欄を直接編集 |
| 一律価格変更 | 設定画面で各味を編集 | 設定UI（一括変更機能は将来追加可） |

### 11.2 デザイン関連

| 要望 | 変更箇所 | 方法 |
|---|---|---|
| 配色変更 | style.css の :root CSS変数 | --bg / --ink / --shu などを書き換え |
| ロゴ変更 | icons/source.svg + index.html brand-mark | source.svg編集→PNG再生成→deploy |
| 番号スタイル | style.css の .flavor-num | 円形・ピル・サイズ等を変更 |
| フォントサイズ | style.css 各セレクタ | clamp() の値を調整 |
| カート幅 | style.css .view-pos | clamp(340px, 34vw, 420px) を調整 |

### 11.3 機能関連

| 要望 | 変更箇所 | 方法 |
|---|---|---|
| 過去日付の取引も削除可に | app.js renderTodayTransactions / 売上詳細ビュー | 詳細ビューに削除ボタン追加 |
| レシート印刷機能 | 新規実装が必要（Bluetooth プリンタ連携） | スター精密SM-T300i等のWeb Bluetooth API |
| 一律値上げ機能 | 設定画面に新規ボタン | UIとロジック追加 |
| 売上のCSV出力 | 設定→データ管理 | exportJSON を改造 or 別ボタン |
| 顧客向け表示画面分離 | 大きな変更（2画面構成） | 別途相談 |

### 11.4 トラブル対応の早見表

| 症状 | 原因 | 対処 |
|---|---|---|
| 「更新があります」適用しても変わらない | 古いSW固着（過去のauto-skipWaiting bug） | 完全リセット（11.5節） |
| 横にスクロールが必要 | viewport meta width=固定値（過去のbug） | width=device-width確認、deploy済みver か検証 |
| **会計確定ボタンが消える/見えない** ★v18 | `.view.active` に `grid-template-rows` 未指定 → カート品数増加で底部クリップ | `style.css` の `.view.active { display: grid; grid-template-rows: 1fr; min-height: 0 }` を**絶対削除しない** |
| 御会計バー全体が見えない | .app の grid-template-rows / padding-bottom 異常 | grid-template-rows:1fr / padding-bottom: max(24px, env(safe-area-inset-bottom)) を確認 |
| 「設定データが失われています」毎回 | healthCheck false-positive（過去bug） | ensureDefaultsInitialized確認、修正済 |
| ホーム画面アイコンが古い | PWA icon キャッシュ | 完全リセットで反映 |

---

## 12. イテレーション履歴（直近）

| バージョン | 主要変更 |
|---|---|
| v1（初期） | パステル「カジゴリア」デザイン |
| v2 | wa-modern再設計、ブランド名「朝日製氷」 |
| v3 | 売上帳 = 当日のみ + 詳細別画面 + 価格項目別集計 |
| v4 | 設定画面（味/トッピング/データ管理）追加 |
| v5 | PWA化（5ファイル分割 + SW + アイコン8サイズ） |
| v6 | 監査3波（Steelix/Espeon/Absol → Bastiodon/Luxray/Chansey）+ 31SVG生成 |
| v7 | レイアウト整流 100dvh + 縦スクロール |
| v8 | viewport=device-width + clamp adaptive |
| v9 | SW更新フロー修正（auto-skipWaiting削除 + timeout fallback） |
| v10 | 設定データ毎回失われる誤警告 → ensureDefaultsInitialized で解消 |
| v11 | テンキーUI（iPadネイティブKB完全排除） |
| v12 | モックデータ廃止 + 取引個別削除機能 |
| v13 | 番号円形バッジ + クイック金額削除 + ヘッダー右側移動 |
| v14 | checkout 354→296px + 暖簾デザインロゴ（紺地+円相+氷） |
| **v15** | **お預かり/お釣り/テンキー全廃止**（クライアント要望: 釣銭計算は頭で） |
| **v16** | **app-footer廃止 + .app の grid-template-rows: 1fr 化 + padding-bottom: max(24px, safe-area)** |
| **v17** | **横一列バー化 .checkout-bar [御会計][¥金額][会計確定]を1バー統合**。CTA見切れ問題の構造的解消 |
| **v18（最新）** | **`.view.active { grid-template-rows: 1fr; min-height: 0 }` 追加（会計確定ボタン消失バグの根本修正） + cart-panel/flavor-panel に height:100% / overflow:hidden 多層防御** |

---

## 13. 既知の技術的負債

| 項目 | 影響 | 対応予定 |
|---|---|---|
| `.quick-amounts` / `.quick-btn` / `.numpad` / `.receive-row` / `.change-row` CSS残置 | 実害なし、約2KB死コード（v15のお預かり廃止で発生） | 次回大型修正時に掃除 |
| `npAddQuick()` / お預かり関連JS関数群残置 | 実害なし、未使用 | 同上 |
| localStorage 5MB上限 | 来シーズン超過の可能性 | 2027シーズンv2でIndexedDB昇格 |
| aggregateRange 線形スキャン | 5000取引超で集計遅延の可能性 | 必要時にキャッシュ機構追加 |
| `LAST_BACKUP_KEY` 残置（v15で実バックアップフロー簡素化後も日時表示が残る） | 実害なし、表示のみ | データ管理UIの整理時に対応 |

---

## 14. オーケストレーション履歴（参考）

このプロジェクトは**並列複数エージェント**で構築:

```
Wave 1（並列3名）— リサーチ&設計
  ├─ Steelix: ARCHITECTURE.md（PWA 11章）
  ├─ Espeon:  RESEARCH.md（kinari-zen-overhead）
  └─ Absol:   DESIGN_CRITIQUE.md（25項目）

Wave 2（並列2名）— 実装
  ├─ Gardevoir: PWA化全面実装
  └─ Alakazam:  31味プロンプト + 生成スクリプト

Wave 3（並列3名）— 品質審査
  ├─ Bastiodon: SECURITY_AUDIT.md
  ├─ Luxray:    CODE_AUDIT.md
  └─ Chansey:   QA_REPORT.md

Wave 4以降 — L統合 + Gardevoir修正パス（複数回）
```

各イテレーションで毎回 Luxray + Chansey + Absol の3エージェント並列で audit してから deploy する運用。

---

## 15. 重要な過去判断（変更しないこと）

以下はクライアント明示要求で確定。**変更時は必ず確認**：

1. **「カジゴリア」表記禁止** → 「朝日製氷」のみ
2. **クイック金額（+500等）削除済** → 復活させない（テンキーで足りる…と言いつつテンキー自体も廃止）
3. **iPadネイティブ数字キーボード呼び出し禁止** → 設定画面の価格入力以外で数値入力UIを出さない
4. **お預かり/お釣り/テンキー機能を復活させない** ★v15確定（釣銭は店主が暗算）
5. **設定画面のPIN保護なし** → スタッフ全員変更可能（誤タップ対策は3秒クールダウン）
6. **モックデータ自動投入禁止** → 起動時に sample-* 自動削除
7. **3列固定の品書き** → 4列以上にしない（横overflow防止）
8. **ヘッダーは flavor-panel 内のみ** → cart側は上端まで拡張
9. **暖簾デザインのロゴ** → 紺地+白円相+氷+純氷（変更時はクライアント確認必須）
10. **横一列checkout-barを縦積みに戻さない** ★v17確定（CTA見切れ問題の構造的解消）
11. **`.view.active { grid-template-rows: 1fr; min-height: 0 }` を絶対削除しない** ★v18確定（未指定だとカート品数増加で会計確定ボタンが消える）
12. **app-footer を復活させない** ★v16確定（`.app { grid-template-rows: 1fr }` のままに保つ）
13. **app の `padding-bottom: max(24px, env(safe-area-inset-bottom))` を維持** ★Hitab Android ナビバー回避必須

---

## 16. 連絡・引き継ぎ

- **デプロイ実行者**: 統括AI（L）
- **GitHub アカウント**: puti1982
- **ホスティング**: GitHub Pages（無料、独自ドメイン未設定）
- **タブレット側オペレーター**: クライアント店主

クライアントから新たな修正依頼があった場合:
1. 本ドキュメントの「11. クライアント要望対応の早見表」を参照
2. 該当箇所を変更
3. `./deploy.sh "メッセージ"` 実行
4. クライアントに「Wi-Fi接続で更新→適用タップ」を案内

---

**朝日製氷** © 令和八年
