# AUDIT_LUXRAY — 朝日製氷POS 直近修正監査
監査者: Luxray (Inspector)
日時: 2026-04-26
対象コミット: cart-panel checkout圧縮 / flavor-grid 横overflow防止 / SVG perf最適化
対象環境: Hitabタブレット (Android 15 Chrome) 1280x800〜1920x1200

---

## エグゼクティブサマリー

3つの修正方針は全て妥当。実装も大半は正しい。ただし**P0級の機能不全リスクが2件**、P1磨き込みが3件、P2が2件。
`grid-auto-rows: 100px` + `flex-shrink:0` の制御は正しく入っており、レイアウト構造は健全。
ただし sw.js の precache に SVG画像31枚が含まれていない、content-visibility と contain の重複指定など、見過ごされた罠が複数残存。

---

## A. レイアウト崩れリスク

### A-1. `.app` 100dvh フォールバック
- **判定**: PASS
- **箇所**: style.css:84-85
- **検証**: `height: 100vh` を先に書き、`height: 100dvh` で上書き。100dvh非対応ブラウザ（iOS 15.3以下、Chrome 107以下）は100vhを使う。Hitab Android 15 Chromeは100%サポート。正しい二段書き。

### A-2. cart-panel の flex-shrink制御
- **判定**: PASS
- **箇所**: style.css:172-177, 183, 199, 326
- **検証**:
  - `.cart-panel` = display:flex, column, min-height:0 ✓
  - `.cart-header` = flex-shrink:0 ✓ (line 183)
  - `.cart-list` = flex:1 1 0, min-height:0, overflow-y:auto ✓ (line 199)
  - `.checkout` = flex-shrink:0 ✓ (line 326)
- **結論**: cart-listだけが縮み、checkoutは固定。設計どおり。Hitab 1280x800縦余裕計算:
  - body高 = 800 - 60(header) - 20(footer) = 720px
  - cart-header ≈ 41px / checkout ≈ 286px / cart-list = 393px → 余裕あり

### A-3. cart-header 圧縮（14/22/10 padding）
- **判定**: PASS
- **箇所**: style.css:181
- **検証**: section-label は font-size 16px / letter-spacing 0.18em。padding 14+10=24 + line-height ≈ 41px。視認性問題なし。

### A-4. checkout 圧縮（12/18/14）で全要素見える
- **判定**: P1（磨き込み推奨）
- **箇所**: style.css:324, 376
- **問題**: receive-input は min-height:44px 明示でOKだが、padding 9+12 + font 19 + border 2 = 計算上39pxで、ブラウザ次第で44pxに達するか曖昧。`box-sizing: border-box` 適用済(*セレクタ)なので問題なし。ただし receive-input の type="number" は **iOSとAndroidでスピンボタンが浮き出る** ので、実機タップ領域が狭く見える可能性。
- **修正案**:
```css
.receive-input {
  /* スピンボタン削除でタップ面積を均一化 */
  -webkit-appearance: none;
  -moz-appearance: textfield;
  appearance: textfield;
}
.receive-input::-webkit-outer-spin-button,
.receive-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
```

### A-5. flavor-grid grid-auto-rows: 100px + overflow-y:auto
- **判定**: PASS
- **箇所**: style.css:512-528
- **検証**: `grid-auto-rows: 100px` で行高さ固定、`overflow-y: auto` / `overflow-x: hidden` / `align-content: start` で上から詰める。31味で 8行 × 4列 = 32セル → スクロール可能。Hitab 800高では右パネル可視高 ≈ 720 - 16(margin-top) - 12-16(flavor-header) ≈ 600px → 6行表示、2行スクロールで残2味+1空セル閲覧。

### A-6. minmax(0, 1fr) で横overflow防止
- **判定**: PASS
- **箇所**: style.css:516
- **検証**: `repeat(4, minmax(0, 1fr))` で各列min-content制約をオーバーライド。長い品名「ソルティーライチ」「真っ赤なリンゴ」「イナズマジンジャー」「パワーエナジー」が来ても列幅が0まで縮みうるので overflow-x 発生不能。`overflow-x:hidden` の二重防御も入っている。完璧。

### A-7. flex-shrink:0 の付与漏れ
- **判定**: PASS
- **検証**:
  - `.cart-header` ✓ line 183
  - `.checkout` ✓ line 326
  - `.flavor-header` ✓ line 483
- **見落としリスク**: `.flavor-grid` には flex:1 1 0 のみ。これは正しい（縮んでよい唯一の領域）。

---

## B. パフォーマンス

### B-1. content-visibility:auto + contain-intrinsic-size: 200px 100px
- **判定**: P1（磨き込み推奨）
- **箇所**: style.css:548-549
- **問題**: 実際のセル幅は1280px時で**約188px**、1920px時で**約228px**。`contain-intrinsic-size` の幅200pxとはズレるが、grid-template-columns が幅を決定するため、`contain-intrinsic-size` の**幅成分は実質無視される**。高さ100pxは grid-auto-rows と一致して正しい。実害なし、但し記述として誤解を招く。
- **修正案**: 高さのみ指定する書式に変更
```css
.flavor-cell {
  content-visibility: auto;
  contain-intrinsic-size: auto 100px;   /* widthはauto、heightのみ予約 */
  /* contain: layout style paint; ← B-2参照、この行は外す */
}
```

### B-2. contain: layout style paint の副作用
- **判定**: P1（磨き込み推奨、メモリリスク）
- **箇所**: style.css:550
- **問題**: `contain:paint` は要素を**独立コンポジットレイヤに昇格**させる強い指定。31セル × 独立レイヤ = GPU メモリ食う。Hitab Android 15のChromeでメモリプレッシャー時にレイヤがdiscardされて再描画コストが発生する可能性。
- **追加リスク**: `.flavor-cell.has-image::after` で linear-gradient（半透明）を重ねる。`contain:paint` 下で擬似要素のz-index/positioning がスコープ閉じ込められるが、これは設計通り(z-index:0 / 1) なので機能はする。
- **検証**: `content-visibility: auto` は内部で `contain: layout paint style; size` 相当を自動付与する（W3C spec）。**`contain:` を別途明示するのは冗長**。
- **修正案**:
```css
.flavor-cell {
  content-visibility: auto;
  contain-intrinsic-size: auto 100px;
  /* contain は content-visibility:auto に内包されるため削除 */
}
```

### B-3. SVG feTurbulence 削除
- **判定**: PASS（実ファイル確認済）
- **箇所**: generate_placeholders.py:30, images/*.svg
- **検証**:
  - PRE template (line 21-33): `<feTurbulence>` 要素なし。`<filter id="grain">` なし。コメント「perf: feTurbulence(grain noise) 廃止」のみ記載。
  - 全31枚のSVG実ファイルを `grep -l "<feTurbulence"` でチェック → 0件。
  - `url(#grain)` 参照も0件。
  - 平均ファイルサイズ 2.6KB / 計82KB。軽量。
- **結論**: 完全削除確認。

### B-4. backdrop-filter blur 4→2
- **判定**: PASS
- **箇所**: style.css:646-647
- **検証**: blur(2px) で十分な擦り効果。modal表示中に背景の31枚SVG cellがblurされるのでGPUコスト軽減は実測効く。Android Chrome の backdrop-filter サポートは Chrome 76+で問題なし。

### B-5. その他の重い処理
- **判定**: PASS
- **検証**:
  - `transition: background 0.12s` × 31cell。短時間だが同時発火しないので問題なし。
  - `.flavor-cell:active::after` の pulse animation は0.3sで瞬時。
  - app.js の renderFlavors は DocumentFragment + replaceChildren で1回reflow。良い。

---

## C. 機能の壊れリスク

### C-1. renderFlavors の DocumentFragment + replaceChildren
- **判定**: PASS
- **箇所**: app.js:237-275
- **検証**: 旧実装でも grid.innerHTML を組み立てる方式と等価。`replaceChildren(frag)` は子要素全削除後にfragの子をappend。eventListenerは新しいbutton要素に都度bind されるので前回の参照が残らない（メモリリーク無し）。
- **副作用なし**: cart内アイテムは別state(cart array)、影響無し。

### C-2. 空セル計算 Math.ceil(31/4)*4 = 32
- **判定**: PASS
- **箇所**: app.js:265-272
- **検証**:
  - 31味 → ceil(31/4)=8, 8*4=32, 空セル=1 ✓
  - 30味 → ceil(30/4)=8, 32, 空セル=2 ✓
  - 28味 → ceil(28/4)=7, 28, 空セル=0 ✓
  - 1味 → ceil(1/4)=1, 4, 空セル=3 ✓
- **結論**: 数学的に正しい。

### C-3. 設定画面で味増減時の対応
- **判定**: PASS
- **検証**: persistFlavors() → refreshAfterChange() → renderFlavors()。FLAVORS.length が動的に変わってもceil式が再計算される。問題なし。

### C-4. ★P0★ SW precache に SVG 31枚が無い
- **判定**: **P0（出荷不可）**
- **箇所**: sw.js:6-20
- **問題**: PRECACHE_URLS に `./images/*.svg` が**含まれていない**。
  - 「Wi-Fi無し前提のPOS」設計だが、初回アクセスがオンライン状態でない場合（タブレット渡し直後の店舗、店舗Wi-Fi死亡時の再起動）、品書きセルが**画像なしで表示される**。
  - fetchハンドラがruntime cacheに put するため、一度オンラインで全SVGが視野内に入れば次回以降はキャッシュされる。だが**初回起動の信頼性が落ちる**ため、precacheに入れるのが正解。
  - 82KB増加で済む。
- **修正案**:
```javascript
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
  // ★追加: 品書き画像 31枚（オフライン初回起動の保険）
  './images/01-ichigo.svg',
  './images/02-melon.svg',
  './images/03-lemon.svg',
  './images/04-blue-hawaii.svg',
  './images/05-peach.svg',
  './images/06-grape.svg',
  './images/07-mango.svg',
  './images/08-cola.svg',
  './images/09-ramune.svg',
  './images/10-mizore.svg',
  './images/11-green-apple.svg',
  './images/12-red-apple.svg',
  './images/13-watermelon.svg',
  './images/14-orange.svg',
  './images/15-muscat.svg',
  './images/16-double-berry.svg',
  './images/17-hyuganatsu.svg',
  './images/18-salty-lychee.svg',
  './images/19-emerald-pine.svg',
  './images/20-cassis-orange.svg',
  './images/21-yogurt.svg',
  './images/22-matcha.svg',
  './images/23-coffee.svg',
  './images/24-black-tea.svg',
  './images/25-dracula.svg',
  './images/26-alien.svg',
  './images/27-princess.svg',
  './images/28-prince.svg',
  './images/29-power-energy.svg',
  './images/30-thunder-ginger.svg',
  './images/31-beni-imo.svg',
];
```
**さらに、SW VERSION も `v1.0.0` → `v1.1.0` にbumpして旧キャッシュを破棄させる必要あり**（line 3）。bumpしないと既存ユーザーは古いprecacheを使い続け、新規追加URLが反映されない。

### C-5. ★P0★ SW VERSION を bump し忘れリスク
- **判定**: **P0（出荷不可、C-4とセット）**
- **箇所**: sw.js:3
- **問題**: style.css/app.js/index.htmlを修正しているのに `VERSION = 'v1.0.0'` のまま。Service Workerは**install eventでバージョンが変わったときだけ新キャッシュを作る**。バージョンを上げないと、ユーザーのブラウザが**古いstyle.css/app.jsをcache hitで返し続ける** = 修正がユーザーに届かない致命的バグ。
- **修正案**:
```javascript
const VERSION = 'v1.1.0';   // ← cart圧縮+flavor-grid+SVG最適化リリース
```

### C-6. localStorage への影響
- **判定**: PASS
- **検証**: 今回の修正は**全て描画/CSSレベル**。FLAVORS_KEY / TOPPINGS_KEY / SALES_KEY / CART_DRAFT_KEY のスキーマ無変更。データ消失リスクゼロ。

---

## D. アクセシビリティ

### D-1. タッチターゲット 44pt
- **判定**: PASS
- **検証**:
  - quick-btn: min-height:44px ✓ line 403
  - receive-input: min-height:44px ✓ line 376
  - cta: min-height:48px ✓ line 449
  - flavor-cell: min-height:100px ✓ line 544
  - topping-chip: min-height:44px ✓ line 274
  - 全要素クリア。

### D-2. focus-visible
- **判定**: PASS
- **箇所**: style.css:38-42
- **検証**: `outline: 2px solid var(--shu) / outline-offset: 2px`。キーボード操作時のみ朱の輪郭。Wave3 #11準拠。

### D-3. WCAG準拠
- **判定**: P2（任意）
- **問題**: `.flavor-cell.empty` に `aria-hidden="true"` 付与（app.js:270）✓ だが、`<button>` ではなく `<div>` で生成しており、tab indexから外れる。これは正しい（空セルは操作対象外）。一方、 `.flavor-cell` 本体は `<button>` で生成されており、品名がbutton textとしてaria-label相当に。OK。
- **磨き込み**: `<button>` のtype属性が指定されていない。デフォルトで `submit` 扱いされる仕様だが、現プロジェクトは `<form>` 包含なしなので無害。但し明示推奨:
```javascript
const cell = document.createElement('button');
cell.type = 'button';   // ← 明示
cell.className = 'flavor-cell';
```

---

## E. iOS/Android Safari/Chrome 互換性

### E-1. 100dvh サポート
- **判定**: PASS
- **検証**: iOS 15.4+ / Chrome 108+ サポート。Hitab Android 15は十分新しい。100vhフォールバック併記済。

### E-2. content-visibility サポート
- **判定**: PASS
- **検証**: Chrome 85+ ✓ / Safari 18+（2024年9月リリース）✓。Hitab Android 15のChromeはサポート。iOS Safari 17以下は無視されるだけで害なし（ただしオフスクリーン描画スキップ恩恵が無くなる）。

### E-3. minmax() サポート
- **判定**: PASS
- **検証**: 全モダンブラウザ対応（IE除く）。

### E-4. -webkit-overflow-scrolling: touch
- **判定**: PASS（残存・無害）
- **箇所**: style.css:199, 527, 748
- **検証**: iOS 13以降は不要だがdeprecatedではない。残しておいて害なし。

---

## 追加発見

### F-1. ★P1★ button要素のtype属性未指定
- **箇所**: app.js:249, 1144（renderFlavors内）
- **問題**: `document.createElement('button')` 後、`cell.type = 'button'` の指定なし。今回の構造では実害ないが、将来 `<form>` で囲む場合に submit動作してしまう。明示推奨。

### F-2. ★P2★ generate_placeholders.py コメントの「31枚並ぶと致命的」が残っているが対策が verbose
- **箇所**: generate_placeholders.py:30
- **検証**: コメントは残し正解。教訓ログとして機能。

### F-3. flavor-cell の `transition: background 0.12s` と content-visibility:autoの相互作用
- **判定**: PASS（要観察）
- **検証**: content-visibility:autoでスキップされた要素はtransitionが発火しないが、可視範囲に入ってからのhover/activeは正常動作する。実機テストでHitab指タップのactive::afterパルスがカクつかないか確認推奨。

---

## 検査結果サマリー

| 優先度 | 件数 | 項目 |
|---|---|---|
| **P0（出荷不可）** | **2** | C-4 SW precache に SVG31枚追加、C-5 SW VERSION bump |
| **P1（磨き込み推奨）** | **3** | A-4 input spinner抑制、B-1/B-2 contain記述整理、F-1 button type明示 |
| **P2（任意）** | **2** | D-3 button type明示の徹底、F-3 active時の挙動実機確認 |
| **PASS** | **17** | レイアウト/機能/A11y/互換性の本体は健全 |

---

## 総評

3つの主要修正（cart圧縮、flavor-grid横overflow解消、SVG perf）はそれ自体は的確に実装されている。
ただしService Workerのバージョン更新と画像precache追加を**リリース前に必ず実施**すること。これを怠ると、ユーザーのブラウザに修正が届かないか、オフライン初回起動で品書き画像が表示されない事故になる。

レイアウト構造は健全。flex-shrink制御、minmax(0, 1fr)、grid-auto-rows、100dvhフォールバックの全てが正しく入っている。Hitab 1280x800〜1920x1200で動作するはず。

content-visibility と contain の重複指定は機能的に害はないが、コードの意図が曖昧になるため整理推奨。
