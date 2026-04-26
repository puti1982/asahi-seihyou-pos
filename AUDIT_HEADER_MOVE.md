# AUDIT — Header移動 / クイック金額削除 / flavor-grid末尾余白

**判定: DEPLOY可**
**対象**: index.html (293L), app.js (1299L), style.css (1337L)
**検査日時**: 2026-04-27

---

## 結果サマリ

| カテゴリ | 項目数 | PASS | FAIL | WARN |
|--|--|--|--|--|
| A. ヘッダー移動 | 5 | 5 | 0 | 0 |
| B. quick-amounts削除 | 3 | 3 | 0 | 0 |
| C. flavor-grid末尾 | 3 | 3 | 0 | 0 |
| D. cart上端拡張 | 3 | 3 | 0 | 0 |
| E. ledger/settings | 3 | 3 | 0 | 0 |
| F. 既存機能 | 3 | 3 | 0 | 0 |
| G. 高さ計算 | 3 | 3 | 0 | 0 |
| **合計** | **23** | **23** | **0** | **2 (注)** |

---

## A. ヘッダー移動の整合性

### A1: PASS — `<header class="header">` が `<main class="flavor-panel">` の最初の子
- `index.html:83` `<main class="flavor-panel">` 開始
- `index.html:85` `<header class="header">` 即直後に開始
- 兄弟は flavor-header (107), flavor-grid (116) のみ → header が筆頭

### A2: PASS — id 重複なし
- `index.html:100` `id="clock"` 1件のみ (grep -c=1)
- `index.html:101` `id="header-buttons"` 1件のみ (grep -c=1)

### A3: PASS — `.app` grid-template-rows が `1fr 16px`
- `style.css:88-98` `grid-template-rows: 1fr 16px;`
- コメント line:90 「ヘッダーは flavor-panel 内へ移動。最上段はviewが直接占有」と意図記載
- 旧 `52px 1fr 16px` が削除されている

### A4: PASS — `.header` に height:52px と flex-shrink:0
- `style.css:106` `height: 52px;`
- `style.css:111` `flex-shrink: 0;`
- 「グリッド外配置のため明示」コメント line:106 で根拠記載

### A5: PASS — flavor-panel が flex column で header→flavor-header→flavor-grid
- `style.css:542-546` `.flavor-panel { display: flex; flex-direction: column; }`
- DOM 順 (index.html:85→107→116) と一致

---

## B. クイック金額削除

### B1: PASS — .quick-amounts HTML 削除
- `grep "quick-amounts" index.html` ヒット 0
- `index.html:73` `</div>` で receive-block 直閉 → 旧 quick-amounts ブロック消失

### B2: PASS — quick-btn JS ハンドラ削除
- `bindEvents()` 内 (`app.js:1170-1276`) で quick-btn listener 完全削除
- `app.js:1198` 「クイック金額ボタンはユーザー要求により削除済」コメントで明示
- `npAddQuick(n)` (`app.js:398-401`) は declared but unused — 未呼び出しの dead code (削除推奨だが動作影響なし) **【WARN-1】**

### B3: PASS — CSS .quick-amounts/.quick-btn 残置
- `style.css:455-482` 残置 (使用箇所なし、無害な dead CSS) **【WARN-2】**
- 削除しても問題ないが残置によるバンドル増は ~480B のみ

---

## C. flavor-grid 最終行スクロール

### C1: PASS — `::after` 疑似要素
- `style.css:607-611` `.flavor-grid::after { content:''; grid-column:1/-1; height:32px; }`

### C2: PASS — 31味 + 2空セル + ::after 構成
- `style.css:589` `grid-auto-rows: 110px`、3列固定 → 31味で 11行 (最終行 1+2空) + ::after 32px
- 末尾 #31 の下に 32px の余白確保で視認可

### C3: PASS — scroll-padding-bottom: 24px
- `style.css:604` 機能維持

---

## D. cart-panel 上端拡張

### D1: PASS — view-pos が最上段から占有
- `.app` grid-template-rows (style.css:90) 1fr 16px → 最上段 = view-pos
- `.view-pos` (style.css:181) `grid-template-columns: clamp(340px,34vw,420px) 1fr` → 縦は親 row 全高を継承

### D2: PASS — cart-header 上端一致
- `index.html:38-39` `.cart-panel > .cart-header` が view-pos 直下の最上端
- 旧グローバルヘッダー 52px がなくなり、cart-header が画面最上端

### D3: PASS — cart-list flex:1 1 0 で伸長
- `style.css:212` `.cart-list { flex:1 1 0; min-height:0; overflow-y:auto; }`
- cart-header と checkout が flex-shrink:0 で固定、cart-list が残余領域を全占有 → 旧版より +52px の余裕

---

## E. ledger / settings ビュー

### E1: PASS — header 非表示
- `<header class="header">` は view-pos 内にネスト (index.html:85)
- view-ledger (121) / view-settings (166) は別 view、`.view { display:none }` (style.css:178) でview-pos が非アクティブ時はheader含めて全消去
- 加えて `setView()` (app.js:469) で `#header-buttons.style.display='none'` を冗長設定 (動作影響なし)

### E2: PASS — doc-back + doc-headline 代替ナビ
- `index.html:123` (ledger) `<button class="doc-back" data-action="go-pos">← レジに戻る</button>`
- `index.html:168` (settings) 同上
- `app.js:1184-1186` `go-pos` listener 健在

### E3: PASS — レイアウト破綻なし
- view-ledger / view-settings の grid-template-columns: 1fr (style.css:182) → 単一列で `.doc-wrap` (style.css:923) max-width 1040px 中央配置
- header 非表示でも doc-headline がページタイトル機能を担保

---

## F. 既存機能

### F1: PASS — header-buttons 委譲リスナー動作
- `app.js:1175-1181` event delegation (`#header-buttons` click) は ID 一意性が保たれているため正常動作

### F2: PASS — numpad / receivedRaw 変更なし
- `app.js:376-401` `receivedRaw` state、`npAppendDigit/npDeleteLast/npClear` 未変更
- `app.js:1189-1196` numpad delegation 維持

### F3: PASS — 取引削除 / SW更新 / 設定機能
- `app.js:1228-1232` deleteTransaction
- `app.js:1297` registerServiceWorker
- `app.js:1234-1270` settings table delegation
- いずれも構造変更の影響を受けない

---

## G. 高さ計算

想定: 100dvh - 16(footer) = 利用可

### G1: 1280×800 (iPad 横) — PASS
- 利用可 = 784px
- cart-panel: header(38) + checkout(~360 quick削除後) → cart-list flex:1 → **~386px** (旧版 +52px)
- flavor-panel: header(52) + flavor-header(~36) + flavor-grid(flex) → **~696px** (グリッド可視 ~6行)
- 31味 11行スクロール可、::after 32px で最終行視認可

### G2: 800×800 — PASS
- 利用可 = 784px (G1と同等)
- view-pos columns: clamp(340,34vw,420) → 800w で 340px 採用、cart-panel 最小幅維持

### G3: 600×800 (狭画面) — PASS (タイト)
- 利用可 = 784px
- cart-panel 340px、flavor-panel 残 260px → 3列 grid 内に味名 clamp(13px,1.4vw,16px) で適応
- checkout ブロック高さ ~360px で cart-list flex:1 → ~386px (許容範囲、空カート時の empty-cart も収まる)

---

## 注意事項 (WARN — DEPLOY阻害なし)

- **WARN-1** `npAddQuick(n)` (app.js:398-401) が呼び出し元なし → 次回クリーンアップで削除推奨 (約4行)
- **WARN-2** `.quick-amounts` / `.quick-btn` CSS (style.css:455-482) 約 480B の dead style → 同上

---

## DEPLOY判定根拠 Top3 (150字)

A1〜A5全合格(index.html:83-106/style.css:88-112): header が flavor-panel 内に正しくネスト、grid-template-rows:1fr 16px で52px行削除。B2合格(app.js:1198): quick-btn ハンドラ完全除去、numpad は無傷。C1合格(style.css:607-611): ::after 32pxで#31視認可。dead code 2点はWARN扱い、機能影響ゼロ。**DEPLOY可**。
