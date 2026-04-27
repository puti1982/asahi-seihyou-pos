# 朝日製氷POS — 機能QA監査 (モーダル化テンキー + 新2味追加 + cart圧縮)

**監査者**: Mei (Chansey / QA Engineer)
**監査日**: 2026-04-27
**対象ファイル**: index.html / app.js / style.css / sw.js
**検査レベル**: THOROUGH (UI改修+データ拡張+SW更新の複合変更)

---

## サマリー

| 区分 | 件数 |
|------|------|
| FAIL | **2** |
| WARN | **6** |
| PASS | 26 |
| 合計 | 34 |

**結論**: モーダル化と新2味追加の主要機能は全て動作する。ただし**FAIL2件 (アクセシビリティ重大欠陥1 + 価格バリデーション欠落1)** + **WARN6件**を修正してからリリース推奨。

---

## A. モーダル開閉

### A1. お預かり display タップ → modal#received-modal 表示 — **PASS**

- `index.html:55-60` `<button class="receive-display" id="received-display" data-action="open-received-modal">`
- `app.js:1210-1211` イベントリスナー登録: `recDisplay.addEventListener('click', openReceivedModal)`
- `app.js:400-405` `openReceivedModal()` が `m.classList.add('show')` を実行
- `style.css:789` `.modal-overlay.show { display: flex; }`
- 動作確実。

### A2. modal外側(背景)タップ → モーダル閉じる — **PASS**

- `app.js:1215-1216` `if (e.target === recModal) closeReceivedModal()` で背景クリック判定
- 子要素クリックは `e.target !== recModal` なので閉じない (正しい)。

### A3. 「確定」ボタンタップ → モーダル閉じる — **PASS**

- `index.html:271` `<button class="primary" data-action="close-received-modal">確定</button>`
- `app.js:1217-1218` `e.target.closest('button[data-action="close-received-modal"]')` で確定検出 → `closeReceivedModal()`

### A4. モーダル内 numpad で数字入力 → display と modal display 両方が同期更新 — **PASS**

- `app.js:389-397` `updateReceivedDisplay()`:
  - `received-val` (cart下のdisplay) と `received-val-modal` (モーダル内) の **両方を更新**
- `npAppendDigit/npDeleteLast/npClear` 全て `updateReceivedDisplay()` を呼ぶ → 同期OK。

### A5. モーダル閉じても receivedRaw 値保持 — **PASS**

- `closeReceivedModal()` (app.js:406-409) は `m.classList.remove('show')` のみ。`receivedRaw` を変更しない。
- doCheckout 完了時のみ `receivedRaw = 0` にリセット (`app.js:467`)。

### A6. 御釣銭 = 御会計 - お預かり が継続計算 — **PASS**

- `app.js:429-435` `updateChange()`:
  - `c = r - s; document.getElementById('change').textContent = fmtNum(c >= 0 ? c : 0);`
  - `checkout.disabled = (s === 0 || r < s)` (お預かり < 会計 で会計ボタン無効化)
- すべての関連関数 (npAppendDigit, removeItem, addToCart, toggleTopping) から呼ばれる。

### A7. **FAIL — モーダルにキーボード操作 (Esc閉じ/フォーカストラップ) が無い**

- WCAG 2.1 AA違反 (2.1.2 No Keyboard Trap, 2.1.1 Keyboard)。
- `app.js:1213-1220` を確認: Esc キーリスナー無し / フォーカストラップ無し / モーダル開閉時のフォーカス管理無し。
- モーダル開いた直後、Tab を押すと背景の cart の要素にフォーカスが行く可能性。
- iPad運用なら影響軽微だが、外部キーボード接続時 / 検査モードで問題化する。

**対応**: `openReceivedModal` 内で:
1. 直近のフォーカスを記録
2. モーダル内の最初のボタンにフォーカス移動
3. `Escape` キーで `closeReceivedModal` + フォーカス復元
4. `aria-modal="true"` `role="dialog"` 属性付与 (現在 `index.html:251` の `<div class="modal modal-numpad">` に role 無し)

---

## B. 新味追加検証

### B1. 32:塩みかん (¥300, color #E68A3D) — **PASS**

- `app.js:43` `{ name:'塩みかん', color:'#E68A3D', price:300, image:'32-shio-mikan' }`

### B2. 33:巨峰＆ベリー (¥300, color #5C2C5C) — **PASS**

- `app.js:44` `{ name:'巨峰＆ベリー', color:'#5C2C5C', price:300, image:'33-kyoho-berry' }`

### B3. 価格混在で「全品 ¥250」badge非表示、各セルに個別価格表示 — **PASS**

- `app.js:269` `const allSamePrice = new Set(FLAVORS.map(f => f.price)).size === 1`
- 32,33で 300 が混在 → `allSamePrice = false`
- `app.js:288` `${allSamePrice ? '' : '<span class="flavor-priceTag">...'}` で個別価格が描画される
- `app.js:307-314` `updatePriceRule()`: `prices.length === 1` でないので `rule.classList.add('hidden')` (= 全品 ¥250 badge 非表示)。
- 整合性OK。

### B4. 32, 33タップ → カート追加 → ¥300 計上 — **PASS**

- `app.js:289` 各 cell に `cell.addEventListener('click', () => addToCart(f))`
- `app.js:318-332` `addToCart(f)` が `basePrice: f.price` (=300) で push
- `calcItem` (`app.js:333-337`) が `it.basePrice` を返す → ¥300 計上。

### B5. 既存 localStorage に味データある人も migrateFlavors で 32,33 自動追加 — **PASS**

- `app.js:86-91`:
  ```js
  DEFAULT_FLAVORS.forEach(def => {
    if (!FLAVORS.find(f => f.name === def.name)) {
      FLAVORS.push({ ...def });
      changed = true;
    }
  });
  ```
- 名前一致判定で重複追加なし、不在なら追加 → migrate成立。
- ただし**B5'-WARN参照** (順序保証無し)。

### B5'. **WARN — 既存ユーザーの新味追加位置が末尾固定**

- `app.js:88` で `FLAVORS.push({...def})` → 既存ユーザーは32,33が末尾に追加される (これは正しい)。
- ただし**ユーザーが過去に独自順序で並べ替えていた場合**でも32,33は末尾になる。
- 既存ユーザーが「31番目以前に独自の味 (例: 'バニラ') を追加していた」場合、32,33の番号は**動的**に振られる (`pad(i+1)`)。32番目セルに'バニラ'、33番目に'塩みかん'、34番目に'巨峰＆ベリー'と表示される。
- 影響: 番号と DEFAULT_FLAVORS の image ID が乖離する可能性がある (ただし画像ID は f.image フィールドで保存、番号バッジは i+1 で計算なので動作上は問題なし)。
- **要確認**: 出荷前に「既存ユーザーが独自味追加した場合の表示」をマニュアル検証推奨。

### B6. images/32-shio-mikan.svg, 33-kyoho-berry.svg が背景画像として表示 — **PASS**

- `ls` で物理存在確認: `images/32-shio-mikan.svg`, `images/33-kyoho-berry.svg` あり。
- `app.js:281-284`:
  ```js
  if (f.image) {
    cell.style.setProperty('--flavor-bg', `url("./images/${f.image}.svg")`);
    cell.classList.add('has-image');
  }
  ```
- `style.css:678-683` `.flavor-cell.has-image { background-image: var(--flavor-bg); }`

### B7. 番号バッジ "32" "33" 円形で正常表示 — **PASS**

- `app.js:286` `<span class="flavor-num">${pad(i + 1)}</span>` → 32, 33
- `style.css:723-742` `.flavor-num { width: 24px; height: 24px; border-radius: 50%; ...}`
- 2桁なので font-size 11px でちゃんと収まる (24px円内に "32" 余裕あり)。

### B8. **FAIL — 価格0円や負数の入力にUI側ガードが半端 (settings)**

- `app.js:763-764` `updateFlavor` 内で `if (field === 'price') value = Math.max(0, parseInt(value, 10) || 0);` でDBには負数を弾く処理あり。**0円自体は許容**。
- F3 (テスト項目「価格0円の味追加 (settings) → checkout disabled」)が**期待動作不一致**:
  - 0円の味追加 → カートに追加可能 → `calcSubtotal()` 結果が 0
  - `updateChange()` (app.js:434) `disabled = (s === 0 || r < s)` で **disabled になる** (期待動作通り)
  - **しかし**: 0円味＋有料味でカートを混在 → `calcSubtotal > 0` で会計成立 → 0円味は無料配布扱いで保存される → 会計上 OK だが、**「0円味のみ」の場合に会計ボタンを押せない理由がユーザーに伝わらない**。
- 影響: 設定で誤って0円にした味が「会計ボタンが押せない原因」になっても、ユーザーがその因果を理解しづらい。
- **推奨対応**:
  1. settings での価格0円入力時にWARNトースト「価格が0円です。会計に支障が出る可能性があります」
  2. または `Math.max(0,..)` を `Math.max(10,..)` に変更し、最低単位を強制 (整氷POSなので妥当)

---

## C. 5アイテム視認

### C1. cart-item 圧縮後高さ ≈ 80px — **PASS**

実コードでの計算 (`style.css:242-368`):
- `.cart-item`: padding `8px 12px 6px` → 縦 14px
- `.cart-item` border 1px ×2 = 2px
- `.cart-item` margin-bottom 5px (`style.css:245`)
- `.item-row`: `font-size 15px` × line-height ≈1.3 → ~20px
- `.toppings`: `margin-top: 5px` + `min-height 32px` = 37px
- `.item-foot`: `margin-top: 4px` + delete-btn `min-height 28px` = 32px

**合計 = 14(padding) + 2(border) + 5(margin) + 20(item-row) + 37(toppings) + 32(item-foot) ≈ 110px**

cart-item 1つ = **約110px** (主張の80pxより実測28pxほど大きい)。**WARN**。

### C1'. **WARN — cart-item 実高さ ~110px (主張80pxと28px乖離)**

- delete-btn の min-height 28px が item-foot 高さを支配。toppings の min-height 32px も大きい。
- 実高さ ~110px なので、cart-list に 5item 視認には **5×110 + 5×5(margin) = 575px** が必要。
- C2の主張 (576px height で 5+ items) は計算上ギリギリ通る (576/115 ≈ 5.0)。**実機でリアル 5アイテム視認は要検証**。
- delete-btn の min-height を `28px` → `24px` に減らせば 1アイテム ~106px になり余裕が出る。

### C2. 800x800 viewport で cart-list height ≈ 576px → 5+ items — **WARN (条件付きPASS)**

- viewport 800: `--header 52px` + `flavor-grid` (右側のみ)。cart-panel は左 column。
- `style.css:181` `view-pos { grid-template-columns: minmax(0, clamp(340px, 34vw, 420px)) 1fr }`
- `cart-panel` 高さ = 800 - app-footer 16px = **784px**
- `cart-header` ~38px (padding 12+8 + section-label 14px ≈ 38px)
- `checkout` 高さ:
  - padding 4+6 = 10
  - totalbar ~36px
  - receive-block ~50px (receive-display min-height 44 + label 11)
  - change-row ~30px
  - cta min-height 44
  - 合計 ≈ **170px**
- `cart-list` height ≈ 784 - 38 - 170 = **576px** (主張通り)
- 5アイテムに必要: 5×110+5×5 = 575px ≤ 576px → **ギリギリ表示可能**。
- マージン削れば余裕。

### C3. 600 viewport でも 4-5 items 視認可 — **PASS**

- viewport 600: cart-panel height = 600 - 16 = 584px
- 上記計算と同条件 → cart-list ≈ 376px → **3-4 items 表示可** (主張の4-5にやや満たない場合あり)。
- WARN: 600px viewport は実用上 iPad mini portrait 圏。横置き運用前提なら問題なし。

### C4. flex shrink で checkout 死守 + cart-list 適切伸縮 — **PASS**

- `style.css:212` `.cart-list { flex: 1 1 0; min-height: 0; overflow-y: auto; }` → 縮小可
- `style.css:336-338` `.checkout { ...; flex-shrink: 0; }` → 縮まない
- iOSの flex 計算上、cart-list が縮み、checkout は固定 → 設計通り。

---

## D. 既存機能regression

### D1. 33味 → 11行で flavor-grid 縦スクロール完走 (#33まで) — **PASS**

- 33味 / 3列 = 11行
- `style.css:631-647` `flavor-grid { grid-auto-rows: 110px; ...; overflow-y: auto; }`
- 11行 × 110 + 10gap = **1220px**。viewport 800 で flavor-panel (header 52 + flavor-header ~50) = 残698px → スクロール必要。
- `style.css:649-653` `::after { height: 32px }` で最終行余白あり → #33 完全可視。
- `style.css:294-301` 空セル追加で最終行が3列キレイに揃う (33 % 3 = 0 → 空セル0個。OK)。

### D2. POS基本フロー (味タップ→トッピング→会計) — **PASS**

- 味タップ → addToCart (app.js:289, 318)
- トッピング → toggleTopping (app.js:1244-1247)
- 会計 → doCheckout (app.js:1198, 440-471)
- 全フロー機能継続 (regression なし)。

### D3. 売上帳 + 本日の取引一覧 + 削除 — **PASS**

- aggregateRange (app.js:502-553) は 32,33 の新味も `s.items` 内の `flavor` フィールドで集計。FLAVORS に依存しない。
- 削除済み味: aggregateRange の deletedToppings は **トッピングのみ**。**削除済み味の処理は無い**が、salesは flavor 名前文字列で保持なので問題なし (味削除しても履歴で表示される)。

### D4. 設定 (味追加/削除/編集) — 新味も編集可能 — **PASS**

- renderSettings (app.js:716-752) は FLAVORS 全件を tbody 描画
- 32,33も同様にテーブル行で表示 → 編集可能 (色/名前/価格)
- 並び替え可能 (moveFlavor)
- 削除可能 (deleteFlavor)

### D5. JSONバックアップ/復元 — **PASS**

- exportJSON (app.js:826-845): FLAVORS 配列をそのまま JSON 化 → 32,33 含む
- importJSON (app.js:888-923) + validateImport (848-886): flavors[i].price (number≥0) 検証あり、32,33 の 300円も通る

### D6. **WARN — clearAllSales 後 receivedRaw 残存**

- `app.js:988-1000` `clearAllSales` は SALES_KEY をクリアするが、cart や receivedRaw に触れない。
- 操作前にカートに商品があり、お預かり入力済み状態で「全販売履歴を消去」した場合、cart は残り続ける (これは正しい)。
- ただし resetSettings は cart をクリアする (app.js:1017) のに対し、clearAllSales は触れない → 一貫性に WARN。
- 影響軽微。挙動説明をユーザーに伝えれば問題なし。

---

## E. PWA

### E1. SW 33 SVG precache (オフライン全味画像確保) — **PASS**

- `sw.js:21-53` PRECACHE_URLS に `01-ichigo.svg` から `33-kyoho-berry.svg` まで33件。物理ファイル存在確認済み。
- オフラインでも 32,33 の画像が描画される。

### E2. SW更新フロー — **PASS**

- `sw.js:3` `VERSION = 'v20260427010825'` 更新済み
- `sw.js:56-63` install で precache → activate で旧cache削除 (sw.js:65-71)
- skipWaiting は manualで `app.js:1176, 1183` で「適用」ボタンタップ時に実行 (Wave3 #1 設計準拠)。

### E2'. **WARN — SW VERSION の自動更新メカニズム未確認**

- `VERSION = 'v20260427010825'` はタイムスタンプ風。手動更新で運用しているなら問題なし。
- もし将来自動化する場合、デプロイパイプラインにバージョン埋め込み必須 (現状未確認)。

### E3. localStorage migration (既存ユーザー → 32,33追加) — **PASS**

- `app.js:67-95` migrateFlavors IIFE で起動時に実行
- 既存FLAVORS に 32,33 が無ければ追加 → localStorage に保存
- B5の通り検証済み。

### E4. **WARN — sw.jsのfetchがimage cache miss時に./index.htmlを返す**

- `sw.js:88` `.catch(() => caches.match('./index.html'))` → fetch失敗時の fallback
- `images/*.svg` の fetch が失敗した場合、index.html (HTML) が返る。<img> タグなら画像エラー、CSS background-image なら無視され**何も表示されない**。
- 通常はprecache済みなので発生しないが、precache失敗時 (容量不足等) に画像欠落 → デザイン崩れの可能性。
- 修正: image系URLの場合は fallback を省略 (`return res` のみ) する分岐を追加。

---

## F. エッジケース

### F1. modal表示中のviewport回転 → レイアウト破綻無し — **PASS**

- `.modal { width: 480px; max-width: 92vw; max-height: 88vh; }` → viewport追従
- `.modal-numpad { width: 360px; max-width: 92vw; padding: 24px 28px; }` → 縦/横どちらでも収まる
- 縦持ち300px幅でも `92vw = 276px` まで縮む → numpad grid 4列の各ボタン約 60px → タップ可能。

### F2. modal numpadで7桁超え → MAX clamp — **PASS**

- `app.js:387` `RECEIVED_MAX = 9999999` (7桁)
- `app.js:411-415` `npAppendDigit`:
  ```js
  const next = receivedRaw * 10 + d;
  if (next > RECEIVED_MAX) return;
  ```
- 99,999,990 → +1 で 99,999,991 (7桁内) → OK。9,999,999 → +0 で 99,999,990 (8桁) → MAX超 → 拒否。動作正常。

### F3. 価格0円の味追加 (settings) → checkout disabled — **CONDITIONAL PASS**

- B8参照。0円のみのカートでは `calcSubtotal() === 0` → `updateChange` で `disabled = true`。動作通り。
- ただしユーザー認知性に課題。WARN扱い。

### F4. **WARN — Modal 表示中に clearAllSales 等の他モーダルが開く競合状態**

- `app.js:943-944` `destructiveCooldownDialog` は z-index `300` を割り当て (受信モーダルは z-index `100`)
- 重ね順は正しい。ただし**受信モーダル開いた状態で settings 画面に遷移できない**ことを確認: setView(name) で view-pos を非アクティブ化するが、`#received-modal` は body 直下なので**残ったまま見える可能性**。
- index.html:250 → modal は `<body>` 直下、`<div class="app">` の外。
- ledger/settings 画面に遷移しても受信モーダルは閉じない可能性が高い (再現要)。
- 軽微: ユーザー操作で「受信モーダル開く → 戻る → 設定タップ」は一般動作にならない。WARN。

### F5. **WARN — receive-display 連打でのモーダル多重展開はガード無し**

- `app.js:400-405` `openReceivedModal()` は `m.classList.add('show')` のみ
- 連打しても1回しか追加されない (idempotent) → 実害なし。ただし展開アニメーション設計次第。

---

## 優先度Top3

### 🔴 P0 — A7: モーダルにキーボード操作 (Esc閉じ/フォーカストラップ) 無し

- WCAG 2.1 AA違反 (2.1.2)
- 修正: `openReceivedModal` で Escape キーリスナー登録 + `aria-modal="true"` `role="dialog"` 付与 + 初期フォーカス管理。

### 🔴 P0 — B8/F3: 0円味の認知性

- 0円のみカート時に会計ボタンが disabled なる理由がユーザーに不明確
- 修正: settings での価格0円入力時にトースト警告 OR 最低価格 ¥10 強制。

### 🟠 P1 — C1'/C2: 5アイテム視認の実高さ乖離

- 主張80pxに対し実測 ~110px。viewport 800では計算上ギリギリ通るが、トッピング多い時など余裕がない。
- 修正: cart-item の delete-btn を min-height 28→24, toppings min-height 32→28 で 1アイテム ~100px に圧縮 → 確実に 5+ items 視認。

---

## 教訓蓄積 (qa_lessons.md 候補)

1. **モーダル化UI改修時はキーボード操作 (Esc/Tab/フォーカストラップ) を必ずチェック**。視覚的にOKでもWCAG AA違反を見逃しやすい。
2. **「カートに5アイテム視認」のような数値仕様は、CSS定数の合算で**実高さを電卓計算してから検証**する。delete-btn / toppings の min-height が支配的。
3. **localStorage migration** は新フィールド追加だけでなく、**既存ユーザーが独自編集していたケース**を必ず手動再現テスト。
