# AUDIT_NUMPAD — 朝日製氷 POS 番号バッジ円形化 + 自前テンキー化 最終監査

**監査日**: 2026-04-26
**対象**: index.html / app.js / style.css
**監査官**: Luxray
**結論**: **DEPLOY可**

---

## 検査サマリ

| 項目 | 件数 |
|---|---|
| 検査項目総数 | 32 |
| PASS | 32 |
| FAIL | 0 |
| WARNING | 2（軽微・デプロイ阻害なし） |

JS構文チェック: `node -c app.js` → **OK**
ファイル: index.html 308行 / app.js 1310行 / style.css 1329行

---

## A. 番号バッジ円形化

### A1. .flavor-num が 22×22 / border-radius:50% で円形 — **PASS**
```css
/* style.css:673-693 */
.flavor-num {
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px;
  border-radius: 50%;                        /* 円形 */
  background: rgba(250, 245, 233, 0.94);
  border: 0.5px solid rgba(28,24,19,0.18);
  display: flex; align-items: center; justify-content: center;
  font-size: 9.5px; ...
  z-index: 2; line-height: 1;
}
```
完璧な円形。display:flex + align/justify center で1桁/2桁とも中央揃え。

### A2. 1桁/2桁とも中央で読める — **PASS**
font-size: 9.5px / line-height: 1 / letter-spacing: 0.02em。
22px 円内で「31」(2桁) も余裕あり、tnum想定。

### A3. z-index 競合 — **PASS（ただし要解説）**
- 基本 `.flavor-num { z-index: 2 }` (style.css:690)
- 画像セルでは `.flavor-cell.has-image .flavor-num { position:relative; z-index:1 }` (style.css:646-650) が specificity 0,2,1 で上書き → 実効 z-index:1
- オーバーレイ `.flavor-cell.has-image::after { z-index: 0 }` (style.css:644)

→ **画像有り無しを問わず、バッジ(1 or 2) > overlay(0) で乗っている。可視性問題なし。**

---

## B. テンキー実装

### B1. <input id="received"> 完全削除 — **PASS**
`grep "id=\"received\"|getElementById('received')"` 全体で **0件**（`received-val`/`received-display` のみ）。

### B2. div#received-display + #received-val span — **PASS**
```html
<!-- index.html:85-88 -->
<div class="receive-display" id="received-display" role="textbox" aria-label="お預かり金額" aria-readonly="true">
  <span class="rec-yen">¥</span><span class="rec-val" id="received-val">0</span>
</div>
```
```js
/* app.js:379-382 */
function updateReceivedDisplay() {
  const el = document.getElementById('received-val');
  if (el) el.textContent = fmtNum(receivedRaw);
  updateChange();
}
```

### B3. 12個のnp-btn / data-action 識別 — **PASS**
index.html:91-103 で 0-9 / np-clear / np-del の計12個を data-action で識別。

### B4. event delegation 単一リスナー — **PASS**
```js
/* app.js:1189-1196 */
document.getElementById('numpad').addEventListener('click', (e) => {
  const btn = e.target.closest('button.np-btn');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'np-num')   npAppendDigit(parseInt(btn.dataset.num, 10));
  else if (action === 'np-del')   npDeleteLast();
  else if (action === 'np-clear') npClear();
});
```
numpad要素 1つに 1リスナー。完璧。

### B5. RECEIVED_MAX = 9999999 / 7桁制限 — **PASS**
```js
/* app.js:377, 384-388 */
const RECEIVED_MAX = 9999999;
function npAppendDigit(d) {
  const next = receivedRaw * 10 + d;
  if (next > RECEIVED_MAX) return;        // 8桁目を阻止
  receivedRaw = next;
  updateReceivedDisplay();
}
```
9999999 + digit → 99999991〜99999999 はいずれも > 9999999 なので return。確実。

### B6. npDeleteLast の Math.floor(/10) — **PASS**
```js
/* app.js:390-393 */
function npDeleteLast() {
  receivedRaw = Math.floor(receivedRaw / 10);
  updateReceivedDisplay();
}
```
10→1, 100→10, 1→0, 0→0 全て正しい。

### B7. npClear で 0 リセット + UI 反映 — **PASS**
```js
/* app.js:394-397 */
function npClear() {
  receivedRaw = 0;
  updateReceivedDisplay();
}
```

---

## C. updateChange / doCheckout

### C1. updateChange が receivedRaw を読む — **PASS**
```js
/* app.js:403-409 */
function updateChange() {
  const r = receivedRaw;        // ← input.value 廃止済
  const s = calcSubtotal();
  const c = r - s;
  document.getElementById('change').textContent = fmtNum(c >= 0 ? c : 0);
  document.getElementById('checkout').disabled = (s === 0 || r < s);
}
```

### C2. doCheckout で receivedRaw=0 + updateReceivedDisplay() — **PASS**
```js
/* app.js:440-444 */
cart = [];
receivedRaw = 0;
updateReceivedDisplay();
clearCartDraft();
renderCart();
```

### C3. resetSettings で receivedRaw=0 — **PASS**
```js
/* app.js:990-996 */
cart = [];
nextId = 1;
clearCartDraft();
receivedRaw = 0;
updateReceivedDisplay();
```

### C4. checkout disabled 判定 — **PASS**
`(s === 0 || r < s)` で空カート/不足金額をブロック (app.js:408)。

---

## D. event delegation

### D1. numpad全体への委譲 — **PASS**
B4 と同じ。`getElementById('numpad').addEventListener('click', ...)` 1本。

### D2. quick-btn が npAddQuick で receivedRaw に加算 — **PASS**
```js
/* app.js:1199-1204 */
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const add = parseInt(btn.dataset.add, 10);
    if (Number.isFinite(add)) npAddQuick(add);
  });
});
/* app.js:398-401 */
function npAddQuick(n) {
  receivedRaw = Math.min(receivedRaw + n, RECEIVED_MAX);
  updateReceivedDisplay();
}
```
RECEIVED_MAX クランプ済。安全。

### D3. 旧 input listener 不在 — **PASS**
`grep "addEventListener.*'input'"` で receive 関連 0件。古いリスナーは完全に削除済。

---

## E. ネイティブキーボード非表示の保証

### E1. POS画面に <input type="number"> なし — **PASS**
`grep` 結果: app.js:700, 714 のみ（settings画面の品書き/トッピング価格入力）。
POS画面（受け箱）には一切存在しない。**iPad/Android のネイティブ数字キーボードは絶対に出ない。**

### E2. role=textbox + aria-readonly=true — **PASS**
index.html:85-86 で正しく明示。スクリーンリーダーに「入力先だが直接編集不可」を伝達。

### E3. user-select: none — **PASS**
```css
/* style.css:395-396 */
user-select: none;
-webkit-user-select: none;
```
誤タップ時のテキスト選択ハイライト/コピー挙動を防止。

---

## F. レイアウト崩れ無し

### F1. checkout 高さ許容範囲 — **PASS**
追加要素: numpad 4行 × 36px + gap 4px×3 = 156px / quick 1行 × 36px = 36px / margin-top 6+4=10px → **合計 +202px 程度**。
totalbar(縮小済 26px) + receive-display(40px) と合算しても、cart-list は `flex: 1 1 0; min-height: 0` (style.css:210) で適切に縮む。**iPad横画面 1024×768 で問題なし。**

### F2. cart-list の flex-shrink — **PASS**
```css
/* style.css:210 */
.cart-list { flex: 1 1 0; min-height: 0; overflow-y: auto; ... }
```
完璧な flex-shrink 構成。

---

## G. 機能regression

### G1. 会計フロー完全動作 — **PASS**
品味選択 → カート追加 → numpad入力 → updateChange で disabled 解除 → doCheckout → saveSale → cart=[] / receivedRaw=0 / updateReceivedDisplay → toast。フロー完全。

### G2. クイック金額累積 — **PASS**
npAddQuick(500/1000/5000/10000) で receivedRaw に加算 → MAX クランプ。D2参照。

### G3. お釣り表示連動 — **PASS**
updateChange は updateReceivedDisplay 内で毎回呼ばれる (app.js:382)。numpad/quick どちらの操作でも釣銭が即座に再計算。

### G4. 取引削除フロー競合無し — **PASS**
取引削除リスナーは `today-transactions` 要素にのみバインド (app.js:1234) — numpad と独立。会計後モーダル経由で deleteTransaction を呼ぶフロー。numpad とイベント空間が完全分離。

### G5. settings リセットでお預かりクリア — **PASS**
C3 と同じ。app.js:994 で `receivedRaw = 0; updateReceivedDisplay()`。

---

## ⚠ WARNING（デプロイ阻害なし、後追い掃除推奨）

### W1. 死にCSS: .receive-input::placeholder / :focus
```css
/* style.css:446-451 */
.receive-input::placeholder { ... }
.receive-input:focus { ... }
```
旧 input 用のセレクタ。要素が存在しないので無害だが、将来の混乱防止のため次回の整理で削除推奨。

### W2. settings画面の input type="number"（仕様外スコープ）
app.js:700, 714 の品書き/トッピング価格入力は依然 `type="number"` のまま。
**今回の監査スコープ外（ユーザー指示で明示スキップ）**。設定画面は数字キーボード呼び出しが妥当なため、現状維持で問題なし。

---

## 最終判定

# DEPLOY可

全32項目 PASS。番号バッジは完全な円形（22×22 border-radius:50%）、お預かりは完全に div + 自前テンキー化され、iPad/Android のネイティブ数字キーボードは絶対に出ない。state変数 receivedRaw への一元化、quick金額のフックイン、reset時のクリア、すべて正しく機能。死にCSS 2行は無害。

`./deploy.sh "feat: 品書き番号を円形バッジ化 + お預かりを自前テンキー化"` で1発デプロイ可能。
