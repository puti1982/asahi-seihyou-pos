# AUDIT_REGRESSION — 朝日製氷POS レイアウト圧縮回帰監査
監査者: Chansey (QA Engineer)
日時: 2026-04-26
対象: 直近のヘッダー/フッター/カート/品書き圧縮、3列化、html/body 完全拘束化

---

## 0. 監査結論

| 区分 | 件数 |
|------|------|
| FAIL | **1** |
| WARN | **5** |
| PASS | 22 |

**判定: 条件付きDEPLOY可。FAIL 1件 (sw.js VERSION 未bump) は出荷前に必須修正。**

### Top 3 問題 (150字)
**①FAIL: sw.js VERSION=22:59:21 が style.css/app.js (23:15) より古い→端末で旧キャッシュが残り3列化が反映されない。②WARN: quick-btn min-height:36px (line417) と receive-input 40px (line390) がWCAG 2.5.5 (44pt) 違反。③WARN: .brand 規則が二重定義 (line114/123)、後勝ちで動くが意図不明瞭。**

---

## A. POS基本フロー (機能回帰)

### A1. ✓PASS 味タップ→カート追加 (3列順序)
- `app.js:248-263` `FLAVORS.forEach((f, i) => ...)` で配列順に append
- CSS Grid `grid-auto-flow: row` (default) + `grid-template-columns: repeat(3, ...)` → 1,2,3 / 4,5,6 / ... の順序確定 (style.css:532)
- `cell.addEventListener('click', () => addToCart(f))` (app.js:261) が個別バインド維持
- リグレッション無し

### A2. ✓PASS トッピング切替
- `app.js:347-351` `toggleTopping()` で active 反転 → `renderCart()` 再描画
- `app.js:305-309` `calcItem()` で active トッピング合算
- レイアウト変更の影響なし

### A3. ✓PASS 削除ボタン
- `app.js:352-355` `removeItem(id)` 動作
- `.delete-btn { padding: 8px 14px; min-height: 36px }` (style.css:327-329) は変更なし

### A4. ✓PASS お預かり入力→釣銭計算
- `app.js:357-363` `updateChange()` 維持
- `receive-input` の高さ縮小 (44→40px) は機能影響なし
- `change-row .val` 18px 表示維持 (style.css:441)

### A5. ✓PASS クイック金額
- 5ボタン `+500/+1000/+5000/+10000/消去` (index.html:86-90)
- `quick-amounts` は `repeat(5, 1fr)` で5列維持 (style.css:403)
- `app.js:1099-1106` イベントハンドラ無変更

### A6. ✓PASS 会計完了→トースト+カートクリア
- `app.js:368-398` `doCheckout()` 動作
- `cta { min-height: 44px }` (52→44 圧縮) WCAG 2.5.5 OK
- トースト+seal SVG (style.css:1140-1146) 正常

---

## B. レイアウト健全性

### B1. ✓PASS 31味で 11行(2空セル)
- `Math.ceil(31/3)*3 = 33` → 空セル 2個追加 (app.js:266-273)
- `cols = 3` (app.js:243) と CSS `repeat(3, ...)` (style.css:532) 完全一致
- 順序: 1,2,3 / 4,5,6 / ... / 28,29,30 / 31,empty,empty

### B2. ✓PASS 50品時の縦スクロール
- `.flavor-grid` が `flex: 1 1 0; min-height: 0; overflow-y: auto` (style.css:529-548)
- 50品 → 17行 = 17 × 110px = 1,870px → スクロール発生
- `-webkit-overflow-scrolling: touch` で iPad慣性スクロール OK

### B3. ✓PASS 10品時の空セル
- `Math.ceil(10/3)*3 = 12` → 空2個のみ。3列で4行 (40-44em) → 上端寄せ `align-content: start` (style.css:546)

### B4. ⚠️WARN ヘッダー (52px) の収まり
- `.header { flex-wrap: nowrap; white-space: nowrap }` (style.css:110-111) で nowrap 強制
- ロゴ30 + brand-name 20px + clock 12px + ledger-link 13px×2 + gap 22+18 ≈ 360px
- 1280px幅では余裕あり OK
- **WARN**: 1024px 縦表示時 (旧iPad) は時計 (例: "2026年4月26日（土）13:45") 25文字 × 12px ≈ 300px → ロゴ+brandと合わせて 600px+ → ボタン余地縮む可能性。実機検証推奨

### B5. ✓PASS flavor-header 1行収まり
- `display: flex; justify-content: space-between` (style.css:493)
- 左 "品書" 16px + 右 price-rule "全品 ¥250" 4px+10px padding → 余裕

### B6. ⚠️WARN checkout 全要素の visible 確認 (高さ概算)
左カートの内部高さ計算 (iPad縦 800px想定):
- view-pos利用可: 800 - 52(header) - 16(footer) = **732px**
- cart-header: padding 12+8 + section-label ≈ **35px**
- checkout内部:
  - padding 8+10 = 18
  - totalbar 2+8+26+border1+margin6 ≈ 43
  - receive-row label 11+3 ≈ 14
  - receive-input 40
  - quick-amounts 36+margin4 ≈ 40
  - change-row 6+8+18 ≈ 32
  - cta 44
  - **計 231px**
- cart-list 残: 732 - 35 - 231 = **466px** ✓
- **WARN**: 1024×600 などのコンパクト Android 端末では 600 - 52 - 16 - 35 - 231 = **266px** とギリギリ。空カート時は問題ないが、5商品以上で内部スクロール発動

---

## C. 設定機能

### C1. ✓PASS 味追加/削除→3列レイアウト反映
- `addFlavor()` → `persistFlavors()` → `refreshAfterChange()` → `renderFlavors()` (app.js:131-135)
- 追加後 `cols=3` で再計算 (app.js:266)

### C2. ✓PASS 価格変更
- `updateFlavor(idx, 'price', value)` (app.js:641-648) で `Math.max(0, ...)` ガード維持

### C3. ✓PASS トッピング編集
- `updateTopping/moveTopping/deleteTopping/addTopping` (app.js:672-703) 無変更

### C4. ✓PASS JSONエクスポート/インポート
- `validateImport()` (app.js:728-766) スキーマ検証維持
- `exportJSON()` も無変更 (app.js:706-725)

---

## D. 売上帳

### D1. ✓PASS 売上帳ボタン→モーダル
- `openToday()` (app.js:482-507) で `aggregateRange` 集計 → `today-modal.classList.add('show')`
- `position: fixed; inset: 0; z-index: 100` の overlay は html/body 拘束影響なし

### D2. ✓PASS 詳細を見る→ledger view
- `setView('ledger')` + `setPreset(30)` (app.js:1132-1134)
- `.view-ledger { grid-template-columns: 1fr }` (style.css:182) で1カラム

### D3. ✓PASS 期間プリセット
- `setPreset(7|30|90|'month'|'all')` (app.js:511-527) 維持

---

## E. オフライン/PWA

### E1. ❌**FAIL** SW VERSION 未bump
- `sw.js:3` `VERSION = 'v20260426225921'` → 22:59:21
- `style.css` mtime: **23:15:52** (改修後)
- `app.js` mtime: **23:15:41** (改修後)
- → **新CSS/JSを書き換えたが sw.js を bump していない**
- 結果: 既存PWAインストール済端末は `caches.match(req)` (sw.js:78) で **旧4列レイアウトのまま起動**
- 修正: `VERSION = 'v20260426231600'` 等に bump 必須
- `updateViaCache:'none'` (app.js:1044) があるので bump すれば次回起動で適用される

### E2. ✓PASS 5分ごと reg.update()
- `setInterval(() => { reg.update(); }, 5 * 60 * 1000)` (app.js:1048) 維持

### E3. ✓PASS 起動順序 ensureDefaultsInitialized → seedIfEmpty → healthCheck
- `init()` 内 line 1186-1196 で順序保持
- false-positive アラート問題解決済 (Wave3)

### E4. ✓PASS localStorage 設定保持
- `FLAVORS_KEY/TOPPINGS_KEY/SALES_KEY` 維持 (app.js:51-57)

---

## F. エッジケース

### F1. ✓PASS cart空状態
- `app.js:314-320` `empty-cart` 表示
- `.empty-cart { padding: 64px 20px 24px }` (style.css:219) は変更なし

### F2. ✓PASS cart 20アイテム時の cart-list スクロール
- `.cart-list { flex: 1 1 0; min-height: 0; overflow-y: auto }` (style.css:212)
- `cart-panel` 自体は `display: flex; flex-direction: column; min-height: 0` (style.css:185-189) で外側スクロールしない
- 圧縮後も論理同じ

### F3. ⚠️WARN 入力フィールド タッチ40-44pt保証
- `.receive-input { min-height: 40px }` (style.css:390) — **44未満**、WCAG 2.5.5 (Target Size 44×44) 微違反
- `.quick-btn { min-height: 36px }` (style.css:417) — **明確に違反**
- コメント「タッチ確保はindexで維持」とあるが、index.html 側に追加クラスや height 指定はない
- 影響: iPad/Hitabタブレットでの誤タップ増加リスク
- 過去監査 AUDIT_FINAL_LUXRAY.md A-3 では quick-btn 44px だった可能性 → 圧縮で退行

### F4. ⚠️WARN ピンチズーム抑止 vs `user-scalable=yes`
- `index.html:6` viewport `user-scalable=yes, maximum-scale=5` (WCAG準拠)
- `style.css:50` html `touch-action: manipulation` (ダブルタップだけ抑止、ピンチ可)
- `style.css:51-53` html `position:fixed; inset:0; overscroll-behavior:none`
- body も同等 (style.css:67-69)
- 矛盾なくは動作するが、Android Chrome PWA 全画面モードでピンチズーム後の `position:fixed` 挙動 (ズーム解除前にレイアウト再計算でガクつき) が出る可能性
- 実機検証推奨

---

## G. その他検出

### G1. ⚠️WARN `.brand` 二重定義
- `style.css:114` `.brand { display: flex; align-items: center; gap: 16px; }`
- `style.css:123` `.brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }`
- 後勝ちで gap:12px / flex-shrink:0 適用 → 機能影響なし
- 修正: 1行目を削除して意図明示

### G2. ⚠️WARN `.flavor-cell` の `min-height: 110px` と `grid-auto-rows: 110px` の二重指定
- `style.css:533` grid-auto-rows: 110px
- `style.css:564` flavor-cell min-height: 110px
- 両方 110px で整合だが、片方変更時に同期忘れ防止のため CSS 変数化推奨
- 例: `--flavor-row-h: 110px` に統合

### G3. ✓PASS contain-intrinsic-size 整合
- `style.css:569` `contain-intrinsic-size: auto 110px` ← grid-auto-rows と一致
- 過去監査 (100px) からの変更が3箇所 (line 533/564/569) すべて 110px で統一済

### G4. ✓PASS app-footer 16px 内のテキスト visibility
- `.app-footer-mark { font-size: 9px }` (style.css:173)
- line-height 1 と仮定して 9px → 16px height 内に収まる
- ただし 14px 以下は読みにくい (WARN ではなくデザイン判断)

### G5. ✓PASS sw.js fetch ハンドラ未変更
- cache-first 戦略維持 (sw.js:71-89)
- index.html フォールバック維持 (sw.js:86)

---

## 修正推奨 (優先度順)

### P0 (出荷前必須)
1. **sw.js VERSION bump**
   - `sw.js:3` `'v20260426225921'` → `'v20260426231600'` 以降に更新
   - これがないと既存ユーザは旧4列レイアウトのまま

### P1 (次リリースで対応)
2. **quick-btn min-height: 36px → 44px**
   - `style.css:417` 修正
   - 5ボタンが 1fr × 5 で並ぶため、高さ追加で全体縦増は8px のみ
3. **receive-input min-height: 40px → 44px**
   - `style.css:390` 修正
   - WCAG 2.5.5 準拠

### P2 (磨き込み)
4. **`.brand` 重複削除** (style.css:114 削除)
5. **CSS変数化** `--flavor-row-h: 110px`

---

## 受入基準 (Verify チェック)

- [x] 3列固定 row-fill 順序確認 (app.js + style.css 一致)
- [x] 31味+空2セルで33セル
- [x] cart-list / flavor-grid 内部スクロールが効く
- [x] checkout 全要素 800px 縦に収まる
- [ ] **sw.js bump → 既存端末で更新通知**
- [x] localStorage 永続維持
- [x] saveSale Quota ハンドリング維持
- [x] importJSON スキーマ検証維持
- [x] WakeLock 動作維持
- [ ] **quick-btn / receive-input 44pt 化** (P1)

---

## 結論

直近のレイアウト圧縮は機能リグレッションを起こしていない。データ層・状態管理・PWA登録ロジックには一切手が入っておらず、健全。

ただし **sw.js VERSION 未bump** が致命的。これだけは出荷前に必ず修正すること。bump しないとユーザの端末で **古いキャッシュが永続的に保持され、レイアウト修正が「実機で表示されない」** 事故が起きる。

WCAG 2.5.5 (タッチターゲット 44×44) は P1 で次回バッチに含めること。
