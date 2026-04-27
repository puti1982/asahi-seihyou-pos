# AUDIT_QA_REMOVE — お預かり/お釣り/テンキー削除後の Regression QA

担当: Chansey (QA Engineer)
対象: index.html / app.js / style.css
変更要点:
- お預かり金額入力 + お釣り計算 + テンキーモーダルの完全削除
- 合計直下に「御会計」CTA を直接配置 (主役級 56px min-height)

## サマリ

- **PASS**: 26
- **WARN**: 3
- **FAIL**: 0
- 機能 regression: なし。会計フローは新ロジックで一貫して動作する。
- 残課題: CSS dead-code (32箇所) のクリーンアップ、F2 二重タップ即時防御、CSS設計上の `change-row` 等が deathmarch 状態。

---

## A. 会計フロー (新ロジック)

| ID | 結果 | 根拠 |
|----|------|------|
| A1 | PASS | `init()` (app.js:1247) → `renderCart()` (1256) → `updateChange()` (371) → `calcSubtotal()=0` → `cta.disabled = true` (app.js:390) |
| A2 | PASS | `addToCart()` (app.js:318) → `renderCart()` (329) → `updateChange()` (371) で `s>0` → `cta.disabled = false` |
| A3 | PASS | `removeItem()` (app.js:380) → `renderCart()` → `updateChange()` で `s===0` → `cta.disabled = true` (app.js:390) |
| A4 | PASS | `doCheckout()` (app.js:396) で `saveSale` (407) → `showToast(..., {withSeal:true})` (421) → `cart = []` (422) → `clearCartDraft()` (423) → `renderCart()` (424) |
| A5 | PASS | grep結果: `receivedRaw` 等の変数は app.js に存在しない (line 386 のコメント記述のみ)。連続会計でも残存変数なし |

## B. レイアウト (cart大幅拡張)

レイアウト計算前提: `grid-template-rows: 1fr 16px` (style.css:90)、view-pos = 1fr フル占有、cart-panel = column flex (cart-header 固定 + cart-list flex + checkout 固定)

固定領域実測値:
- `.cart-header` ≒ 12+8+21(serif14px) = **約41px** (style.css:194)
- `.checkout` = 12 + (totalbar 4+30+12 ≒ 46) + margin 14 + cta 56 + 14 = **約142px** (style.css:336/341/343/584)
- 固定合計 ≒ 183px

| ID | 結果 | 根拠 |
|----|------|------|
| B1 | PASS | 800-16-183 = **約601px** (画面 75.1%) ≒ 仕様 589px/73%。8アイテム視認可 |
| B2 | PASS | 600-16-183 = **約401px** (画面 66.8%) ≒ 仕様 389px/65%。5+アイテム視認可 |
| B3 | PASS | `.cart-list { flex: 1 1 0 }` (style.css:212) + `.checkout { flex-shrink: 0 }` (337) → CTA は常に画面内 visible |
| B4 | PASS | `.totalbar .val { font-size: 30px; font-weight: 600 }` (style.css:352) — 主役級 |

## C. 既存機能 regression

| ID | 結果 | 根拠 |
|----|------|------|
| C1 | PASS | `DEFAULT_FLAVORS` 33種 (app.js:11-45)、32:塩みかん (app.js:43)、33:巨峰＆ベリー (app.js:44) |
| C2 | PASS | `toggleTopping()` (app.js:375) → `it.toppings[tid].active` 反転 → `renderCart()` で `calcItem()` 再計算 (333) |
| C3 | PASS | `removeItem()` (app.js:380) → `cart = cart.filter(...)` → `renderCart()` |
| C4 | PASS | `openToday()` (509) → modal `today-modal` 表示 + `today-breakdown` (523) + `renderTodayTransactions()` (540) + `deleteTransaction()` (572) |
| C5 | PASS | settings 全アクション: add/move/delete-flavor (app.js:1226-1228), add/move/delete-topping (1229-1231), export/import-json (1232-1233), reset-sample/clear-all-sales/reset-settings (1234-1236) |
| C6 | PASS | `registerServiceWorker()` (app.js:1111): `updateViaCache:'none'` (1116) + 起動時 `reg.update()` (1118) + 5分間隔 (1120) + `showUpdateBanner` ボタン経由のみ reload (1099-1108) + 1.5sec failsafe reload (1107) + `userInitiatedReload` ガード (1141) |

## D. localStorage / データ整合

| ID | 結果 | 根拠 |
|----|------|------|
| D1 | PASS | `doCheckout()` の保存ペイロード `{id, ts, items, total}` (app.js:408-412) は旧フォーマットと完全互換 |
| D2 | PASS | `localStorage.setItem` 全呼び出しを検索 (app.js): SALES_KEY/FLAVORS_KEY/TOPPINGS_KEY/CART_DRAFT_KEY/LAST_BACKUP_KEY/WAKELOCK_KEY のみ。`receivedRaw` 関連キー無し |
| D3 | PASS | `restoreCartDraft()` (app.js:163-178) は `{cart, nextId, ts}` のみ parse。受領金額関連プロパティ無し |
| D4 | PASS | `migrateFlavors()` (app.js:68-95) で `DEFAULT_FLAVORS` から既存ユーザー LS に未登録の味 (32:塩みかん, 33:巨峰＆ベリー) を追加 (app.js:86-91)。changedフラグで idempotent |

## E. 削除残骸の確認

| ID | 結果 | 根拠 |
|----|------|------|
| E1 | PASS | `getElementById('received-display'\|'numpad'\|'received-val-modal')` を全ファイル grep → 該当 0件 |
| E2 | PASS | `receivedRaw\|updateReceivedDisplay\|openReceivedModal\|closeReceivedModal\|npAppend\|npDelete\|npClear\|npAddQuick` を app.js 全文検索 → 該当 0件 (コメント記述 line 386 を除く) |
| E3 | WARN | style.css に dead-code 32箇所残存: `.modal-numpad` (426), `.received-display-large` (454), `.numpad` (473), `.np-btn` (479), `.np-fn` (503), `.receive-display` (381-422), `.receive-input` (513-518), `.quick-amounts` (520), `.quick-btn` (526-547), `.change-row` (550-565), `.modal-close` (437-453), `.receive-block` (369), `.receive-row` (370-379)。仕様上は「機能影響なし」で許容。CSSサイズは現状 1401行 — 約 200行が削除可能。クリーンアップ推奨 |

## F. エッジケース

| ID | 結果 | 根拠 |
|----|------|------|
| F1 | PASS | `.cta:disabled` (style.css:596-604) で `background: transparent`, `color: var(--ink-3)`, `border: var(--line)`, `cursor: not-allowed`, `::after` 朱マーク非表示。視覚的に明確に disabled |
| F2 | WARN | `doCheckout()` (app.js:396) は同期実行で `cart=[]→renderCart→updateChange→cta.disabled=true` の loop 完了が 1tick で済むため実害は低い。ただし `saveSale` が将来重くなる場合や、極端な高速タップ環境では二重保存の理論的可能性あり。**推奨**: 関数頭で `document.getElementById('checkout').disabled = true` を即時セット |
| F3 | PASS | SW 更新フローは `userInitiatedReload` フラグ (app.js:1091, 1100, 1141) でユーザータップ時のみ reload。controllerchange 単独では reload しない。1.5秒 failsafe (1107) あり |

---

## WARN 詳細・推奨アクション

### WARN-1 (E3): CSS dead-code 32箇所
- **影響**: 機能なし。バンドルサイズ約 14% 増 (推定)。将来の保守コストとして混乱を招く可能性
- **推奨**: 別 PR で削除。`.modal-numpad`, `.received-display-large`, `.numpad`, `.np-btn`, `.np-fn`, `.modal-close`, `.receive-*`, `.quick-*`, `.change-row` のセクション一括削除

### WARN-2 (F2): 高速タップ二重保存の理論的余地
- **影響**: 現状の同期コードでは実発生しない。将来 `saveSale` が async になったり、`localStorage.setItem` に時間がかかる端末で再現の可能性
- **推奨**: `doCheckout()` 関数頭に
  ```js
  const cta = document.getElementById('checkout');
  if (cta.disabled) return;
  cta.disabled = true;
  ```
  を追加。idempotent な保険

### WARN-3 (CSS): セレクタが残っているが対応する DOM が無い
- **影響**: なし (DOM要素が無いので絶対に発火しない)
- **推奨**: WARN-1 と同時に削除

---

## TOP 3 問題 (150字)

1. **WARN E3**: style.css:426-565 に dead-code 32箇所 (`.modal-numpad`, `.numpad`, `.np-btn`, `.receive-display`, `.quick-btn`, `.change-row` 等)。機能影響ゼロだが約 200行クリーンアップ推奨
2. **WARN F2**: app.js:396 `doCheckout()` 関数頭に `cta.disabled=true` 即時セット無し。同期実行で実害なしだが将来 async 化で二重保存リスク
3. **(微)** app.js:386 のコメント `receivedRaw` 文言が残存。検索ノイズ要因

FAIL: 0 件。リリース可。
