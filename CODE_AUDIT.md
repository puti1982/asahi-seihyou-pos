# 朝日製氷 POS — コード品質・アクセシビリティ・パフォーマンス監査

**監査者**: Luxray (検査官)
**監査日**: 2026-04-26
**対象**: index.html / app.js / style.css / sw.js / manifest.webmanifest
**監査項目**: 5カテゴリ / 47項目検査 → 28件指摘 (P0:6 / P1:13 / P2:9)

---

## P0 — 出荷不可（要即修正）

### P0-A1: SW更新適用時、現金会計中にreloadされる致命的レースコンディション

- **箇所**: `app.js:781-785`
- **問題**:
  ```js
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  ```
  `controllerchange` 検知時、cart に商品が積まれた状態でも無条件 reload される。`SKIP_WAITING` をユーザータップで送る設計（764行コメント「取引中事故防止」）と矛盾。`persistCartDraft()` で localStorage に保存してはいるが、`received`（お預かり金額）は input value のみで永続化されておらず消失する。POSとして致命的。
- **修正**:
  ```js
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    // cart 非空 / 釣銭計算中ならスキップ（次回起動で適用）
    if (cart.length > 0 || document.getElementById('received').value) {
      return;
    }
    refreshing = true;
    window.location.reload();
  });
  ```
  さらに `received` 値も `persistCartDraft()` に含める（後述 P0-A6）。

---

### P0-A2: SW `install` 内 `skipWaiting()` で旧版利用中に強制差し替え

- **箇所**: `sw.js:22-28`
- **問題**:
  ```js
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
        .then(() => self.skipWaiting())   // ← 即時waiting解除
    );
  });
  ```
  install中に `skipWaiting()` を呼ぶと、アプリ側の「ユーザータップで適用」設計（app.js:773-774）が機能しない。新版インストール直後に即 active 化 → controllerchange → 強制reload が走り、会計中事故を引き起こす。
- **修正**: install 側の skipWaiting を削除し、message ハンドラ（sw.js:58-60）経由のみで実行。
  ```js
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      // skipWaiting() 削除
    );
  });
  ```

---

### P0-A3: viewport `user-scalable=no` + `maximum-scale=1.0` がWCAG 1.4.4違反

- **箇所**: `index.html:6`
- **問題**:
  ```html
  <meta name="viewport" content="width=1366, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0">
  ```
  WCAG 2.1 SC 1.4.4 (Resize Text Level AA) は最低200%までの拡大を保証する必要がある。視覚障害をもつ店主・スタッフがピンチズームできず詰む。POSとはいえアクセシビリティ準拠が必要。さらに iOS Safari は `touch-action: manipulation`（style.css:41）でダブルタップズームは既に無効化されているため、`user-scalable=no` の必要性は低い。
- **修正**:
  ```html
  <meta name="viewport" content="width=1366, initial-scale=1.0, viewport-fit=cover">
  ```

---

### P0-A4: `aria-label` がボタンに不足、スクリーンリーダーで操作不能領域あり

- **箇所**: `index.html:84-88`, `index.html:226-227`, `app.js:511-513`
- **問題**:
  - クイック金額ボタン `+500 / +1,000 / +5,000 / +10,000` は数値表記のみで、VoiceOver読み上げで「プラス・ごひゃく」と読まれ操作目的が不明瞭。`aria-label="500円追加"` 等が必要。
  - 削除ボタン（cart-item削除）は `削 除` の文字だけで、どの商品の削除か文脈不明。`aria-label="${flavor}を削除"` 必須。
  - settingsの▲▼SVGアイコンは `aria-label="上へ"/"下へ"` ありで合格、削除ボタン（icon-btn.danger）は `aria-label` 無し。
- **修正**:
  ```html
  <button class="quick-btn" data-add="500" aria-label="お預かり金額に500円を追加">+500</button>
  ```
  ```js
  // app.js:288付近
  <button class="delete-btn" data-action="remove-item" data-item="${it.id}"
          aria-label="${escapeAttr(it.flavor)}を御注文から削除">削 除</button>
  ```

---

### P0-A5: タッチターゲット 44pt 未満のヒット領域あり（WCAG 2.5.5）

- **箇所**: `style.css:248-266` (`.topping-chip`)
- **問題**:
  ```css
  .topping-chip {
    flex: 1 1 calc(33.333% - 4px);
    padding: 7px 4px;
    min-height: 44px;        /* 高さは44pt確保 */
  }
  ```
  `min-height: 44px` 宣言ありで縦は合格。しかし cart-panel 幅 480px（style.css:159）− padding 36px = 444px から 3列均等分割 → 各148px幅 → padding 引いた実ヒット領域は約140px幅で横は問題なし。
  **ただし**：`.preset-btn` (`min-height: 36px`, `style.css:763`)、`.icon-btn` (`min-height: 36px`, `style.css:961`)、`.delete-btn` (`min-height: 32px`, `style.css:304`)、`.doc-back` (`min-height: 32px`, `style.css:712`)、`.toast button` (`min-height: 32px`, `style.css:1088`) が44pt未満。WCAG 2.5.5 Level AAA だが、Level AA でも 24×24 推奨で iPad の指タップを考えると44pt厳守すべき。
- **修正**: 全タッチ可能要素を `min-height: 44px` 統一。
  ```css
  .preset-btn, .icon-btn, .delete-btn, .doc-back, .toast button {
    min-height: 44px;
  }
  ```

---

### P0-A6: お預かり金額（`received`）がドラフト保存対象外 → SW更新/クラッシュで消失

- **箇所**: `app.js:116-120`, `app.js:317-339`
- **問題**:
  ```js
  function persistCartDraft() {
    localStorage.setItem(CART_DRAFT_KEY, JSON.stringify({ cart, nextId, ts: Date.now() }));
  }
  ```
  cart と nextId のみ保存し、`received` input の値は永続化されない。会計途中（お預かり入力後・チェックアウト前）にSW更新やページ復帰が発生すると預かり金額が0に戻り、店主が金額を手動再入力するハメになる。30分間ドラフト保持のメリットが半減。
- **修正**:
  ```js
  function persistCartDraft() {
    const received = document.getElementById('received')?.value || '';
    localStorage.setItem(CART_DRAFT_KEY, JSON.stringify({ cart, nextId, received, ts: Date.now() }));
  }
  function restoreCartDraft() {
    // ...既存処理...
    if (typeof d.received === 'string') {
      const r = document.getElementById('received');
      if (r) r.value = d.received;
    }
  }
  // received input の input イベント listener (app.js:793) からも persistCartDraft() を呼ぶ
  received.addEventListener('input', () => { updateChange(); persistCartDraft(); });
  ```

---

## P1 — 磨き込み（要修正）

### P1-A1: 売上1万件時の集計性能 — `aggregateRange` が O(N×items×toppings) で全件走査

- **箇所**: `app.js:367-391`
- **問題**: `loadSales()` は localStorage を毎回 `JSON.parse` して全件返す。1万件 × 平均3アイテム × 3トッピング = 9万ループ。さらに `aggregateRange` は `renderLedger` から呼ばれるたびに実行され、ベンチマーク的に1回100-300ms（M1 iPad想定）。集計UIで毎タップ300ms待たされる。
- **修正**:
  1. `loadSales()` の結果をモジュール内で memoize し、`saveSale` 時のみ無効化:
     ```js
     let _salesCache = null;
     function loadSales() {
       if (_salesCache) return _salesCache;
       try { _salesCache = JSON.parse(localStorage.getItem(SALES_KEY) || '[]'); }
       catch { _salesCache = []; }
       return _salesCache;
     }
     function saveSale(record) {
       _salesCache = null; // invalidate
       // ...既存処理...
     }
     ```
  2. 売上は ts 昇順で挿入されているので（`seedIfEmpty` の sort）、二分探索で範囲絞り込み:
     ```js
     function aggregateRange(fromTs, toTs) {
       const all = loadSales();
       const lo = bsearchGE(all, fromTs);  // 最初の ts >= fromTs
       const hi = bsearchGT(all, toTs);    // 最初の ts > toTs
       const slice = all.slice(lo, hi);
       // 以降 slice をループ
     }
     ```

---

### P1-A2: `renderCart` が cart 全件を `innerHTML` 再構築 — 30会計連続でDOMノード捨て続ける

- **箇所**: `app.js:263-296`
- **問題**: トッピング1個押すたびに cart 全体が `innerHTML = ...` で再描画される。3商品×3トッピング = 9イベントリスナーが毎回破棄→生成。GC圧で iPad の体感がカクつく。1万会計後のメモリ実測でheap 50MB超想定。
- **修正**: cart-itemレベルの差分更新へ移行。最小限の改修案:
  ```js
  function renderCartItem(it) {
    const existing = document.querySelector(`.cart-item[data-id="${it.id}"]`);
    if (existing) {
      // active class とprice のみ更新
      existing.querySelector('.item-price').innerHTML = `<span class="yen">¥</span>${fmtNum(calcItem(it))}`;
      Object.entries(it.toppings).forEach(([tid, t]) => {
        const chip = existing.querySelector(`[data-topping="${tid}"]`);
        if (chip) chip.classList.toggle('active', t.active);
      });
      return;
    }
    // 新規追加時のみappendChild
  }
  ```

---

### P1-A3: `setTimeout` でスクロール調整は フリッカ発生

- **箇所**: `app.js:254`
- **問題**:
  ```js
  setTimeout(() => { list.scrollTop = list.scrollHeight; }, 30);
  ```
  30msマジックナンバー。レンダ完了を保証しない。renderCart→DOM反映前にスクロール位置取得→失敗するケースあり。
- **修正**:
  ```js
  requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
  ```

---

### P1-A4: `prefers-reduced-motion` 未対応

- **箇所**: `style.css:541-548`, `style.css:1022-1028`, `style.css:1062`
- **問題**: `@keyframes pulse` (flavor-cell 押下時)、`@keyframes flashSaved` (saved-flash)、toast の `transition: transform 0.6s cubic-bezier(...)` が、前庭障害をもつユーザーに対し抑制されない。WCAG 2.3.3 (Animation from Interactions Level AAA) 推奨。
- **修正**:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

---

### P1-A5: フォーカスインジケーターが多くの要素で `outline: none` のまま不可視

- **箇所**: `style.css:371-375`, `style.css:932-937`
- **問題**:
  ```css
  .receive-input:focus { outline: none; border-color: var(--ink); ... }
  .settings-table input.name-input:focus,
  .settings-table input.price-input:focus { outline: none; border-color: var(--ink); ... }
  ```
  border-color変更で代替しているが、ボタン類（`.flavor-cell`, `.cta`, `.quick-btn`, `.preset-btn`, `.modal-actions button`, `.data-actions button`, `.icon-btn`）には `:focus-visible` の専用スタイルが**一切定義されていない**。外付けキーボード/ハードウェアSwitch Controlユーザーが現在位置を視認できない。WCAG 2.4.7 (Focus Visible) 違反。
- **修正**:
  ```css
  button:focus-visible,
  input:focus-visible,
  .flavor-cell:focus-visible {
    outline: 2px solid var(--shu);
    outline-offset: 2px;
  }
  ```

---

### P1-A6: `parseInt` でラジックス未指定 — `quick-btn` 親要素クリックバグ予備

- **箇所**: `app.js:309`, `app.js:817`
- **問題**:
  ```js
  const r = parseInt(document.getElementById('received').value) || 0;
  inp.value = (parseInt(inp.value) || 0) + parseInt(btn.dataset.add);
  ```
  全ての `parseInt` でラジックス省略。`'08'` 等を 0 と誤読する歴史的バグ（モダンブラウザは10進扱いだが strict-mode警告レベル）。
- **修正**: 全 `parseInt(x)` → `parseInt(x, 10)` に統一。app.js全体で 7箇所該当。

---

### P1-A7: `confirm()`/`alert()` ブロッキングで PWA UX 阻害

- **箇所**: `app.js:557, 586, 635, 652, 658-659, 664, 693, 643`
- **問題**: 8箇所で `confirm()`/`alert()` 使用。iOSの`confirm`は OS ダイアログでアプリのフルスクリーンを破る。POSとして「サンプル削除しますか？」程度なら、アプリ内モーダルが標準。
- **修正**: 既存 `.modal-overlay` を流用した `confirmModal(message, onConfirm)` を実装。

---

### P1-A8: `alert(e.message)` で例外内容を直接ユーザーに露出

- **箇所**: `app.js:643`
- **問題**:
  ```js
  catch (e) { alert('読み込みに失敗しました: ' + e.message); }
  ```
  `JSON.parse` の `SyntaxError: Unexpected token...` 等が直に表示。素人店主は何のことか不明、かつメッセージ内に PII を含む可能性（不正なJSONに含まれていれば）。
- **修正**:
  ```js
  catch (e) {
    console.error('Import failed:', e);
    alert('バックアップファイルが壊れているか、形式が違います。別のファイルをお試しください。');
  }
  ```

---

### P1-A9: SW `fetch` ハンドラがネットワークレスポンスをcacheに無条件 put

- **箇所**: `sw.js:38-56`
- **問題**:
  ```js
  return fetch(req).then((res) => {
    if (res && res.status === 200 && res.type === 'basic') {
      const clone = res.clone();
      caches.open(CACHE).then((c) => c.put(req, clone));  // ← 失敗時のerror handlingなし
    }
    return res;
  });
  ```
  `caches.open(CACHE).then((c) => c.put(req, clone))` の Promise が unhandled。put失敗（quota exceededなど）時、Promise rejection を握り潰し、開発者ツールに警告のみ残る。
- **修正**:
  ```js
  caches.open(CACHE).then((c) => c.put(req, clone))
    .catch((err) => console.warn('SW cache put failed:', err));
  ```

---

### P1-A10: SWバージョン文字列がハードコード — リリース時の更新漏れリスク

- **箇所**: `sw.js:3` (`const VERSION = 'v1.0.0';`)
- **問題**: コードを変更しても VERSION を上げ忘れると古い CACHE が活き続け、新版が永遠に反映されない。実ビルド時はビルドツールでハッシュ注入が定石だが、生PWAなのでビルド時刻ベースが現実解。
- **修正**:
  ```js
  // ビルド時にfind+sed等で置換、または ./sw.js?v=YYYYMMDDhhmm を index.html 側で付与
  const VERSION = 'v1.0.0-202604261135';
  ```

---

### P1-A11: 色コントラスト比が `--ink-3` テキスト (`#8A8175`) で不足の可能性

- **箇所**: `style.css:13`, `style.css:643` (`.bd-row .unit { color: var(--ink-3); }`), `style.css:660` (`.bd-meta`), `style.css:830-838` (`.total-card .meta`)
- **問題**: `--ink-3 #8A8175` on `--paper #FFFFFF` のコントラスト比は **3.96:1**（要 4.5:1 標準テキスト）で WCAG 1.4.3 Level AA 違反。`.bd-meta` (font-size 11px) は標準テキスト扱い。`.bd-row .unit` (12px) も同様。
- **修正**: `--ink-3` を `#7A6F60` (約 4.7:1) に調整。または当該テキストを `var(--ink-2) #4A4239` に変更（コントラスト比 9:1 で十分）。

---

### P1-A12: input[type=color] iPad Safari は OS カラーピッカー未対応

- **箇所**: `index.html` (settings画面), `app.js:506`
- **問題**: iPad Safari は `<input type="color">` を **テキスト入力** として描画する（hex文字列を直入力）。タップしても色選択UIは出ない。店主が「色を変えたいだけ」なのに16進文字列を入れろと言われる構造。
- **修正**: 31色プリセットパレットモーダルを実装し、`input[type="color"]` の代わりに `<button class="color-swatch" style="background:${f.color}" data-action="open-palette">` で代替。

---

### P1-A13: `flavor-cell` は `<button>` だが button 用のARIA roleが暗黙のみ

- **箇所**: `app.js:207-216`
- **問題**: `<button>` はネイティブにrole=button だが、cart に追加された瞬間 VoiceOver は無音。状態変化のフィードバックなし。
- **修正**:
  ```js
  cell.setAttribute('aria-label', `${f.name} ${fmtNum(f.price)}円 を御注文に追加`);
  // 追加成功時:
  cell.setAttribute('aria-live', 'polite');  // または cart-list に role="status"
  ```
  cart-list に `role="status" aria-live="polite"` を付与すると、追加・削除時にスクリーンリーダー読み上げ。

---

## P2 — 任意（磨き込み余地）

### P2-A1: グローバル変数汚染（`FLAVORS`, `TOPPINGS`, `cart`, `nextId`, `wakeLock`, `wakeLockEnabled`）

- **箇所**: `app.js:60-63, 700-701`
- **問題**: 6つのモジュールスコープ可変変数。テスト不可・複数インスタンス不可・デバッガで意図せず書き換え可能。
- **修正**: IIFEまたは`const App = (() => { ... })();` パターンで namespacing。本案件は単一PWAなので必須ではない。

---

### P2-A2: マジックナンバー散在（`30 * 60 * 1000`, `86400000`, `2200`, `30000`, `4 * 1024 * 1024`）

- **箇所**: `app.js:126, 144, 355, 903, 94`
- **問題**: 30分・86400000ms・2200ms・30秒・4MB等が直書き。
- **修正**:
  ```js
  const CART_DRAFT_TTL_MS = 30 * 60 * 1000;
  const DAY_MS = 86400000;
  const TOAST_DURATION_MS = 2200;
  const CLOCK_TICK_MS = 30000;
  const STORAGE_WARN_BYTES = 4 * 1024 * 1024;
  ```

---

### P2-A3: `escapeHtml` のregex内negationが冗長

- **箇所**: `app.js:181-183`
- **問題**: 機能上は問題ないが、`Map.get` 形式のほうが将来の文字追加時にメンテしやすい。
- **修正**: 任意。

---

### P2-A4: `flavor-cell:active` の `::after` で animation を要素全面に張る — レイアウトスラッシング

- **箇所**: `style.css:540-548`
- **問題**: `position: absolute; inset: 0` で全面pseudo-element + opacity アニメーション。`will-change: opacity` 未指定で iPad Safari は CPU合成にfallbackする可能性。
- **修正**:
  ```css
  .flavor-cell::after { will-change: opacity; }
  /* GPU化保証 */
  ```

---

### P2-A5: `backdrop-filter` iPad Safari 9-13 で未対応

- **箇所**: `style.css:598-599`
- **問題**: `-webkit-backdrop-filter` で fallback はしているが、iPadOS 14未満では効かない。設計意図の "生成り側を強くした overlay" が崩れる。背景 rgba 0.85 で読みやすさ自体は確保されているので致命ではない。
- **修正**: `@supports not (backdrop-filter: blur(4px))` 内で `background: rgba(250,245,233,0.96)` に上げる。

---

### P2-A6: WakeLock 失敗時のユーザー説明が薄い

- **箇所**: `app.js:703-712, 723-727`
- **問題**:
  ```js
  if (!('wakeLock' in navigator)) return false;
  ```
  iOS Safari は16.4+ でしか対応しない。古いiPadだと永遠に「有効化できません」と出るだけで原因不明。
- **修正**: `acquireWakeLock` 失敗時に「お使いのiPadのSafariが対応していない可能性があります（iPadOS 16.4以上が必要）」をtoastに表示。

---

### P2-A7: `localStorage` quota は iOS Safari で 5MB前後 — 4MBで警告は妥当だが文字数換算ミス

- **箇所**: `app.js:91-95`
- **問題**:
  ```js
  const sizeBytes = serialized.length * 2;  // UTF-16換算
  ```
  コメント正しいが、実際の localStorage 上限は **iOS Safari 5MB 制限内のキー全合計**。SALES_KEY 単体4MBで警告、他キーが1MB食ってるとquota直撃。
- **修正**: 全キー合計を確認:
  ```js
  function getTotalStorageBytes() {
    let total = 0;
    for (const k in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
        total += (localStorage[k].length + k.length) * 2;
      }
    }
    return total;
  }
  ```

---

### P2-A8: `manifest.webmanifest` の icons配列が purpose=any のみ重複表現

- **箇所**: `manifest.webmanifest:14-19`
- **問題**: 192/512のpurpose=any と maskable版の合計4つ。Chrome/Safari は purpose=any を要求するが、より厳密には `purpose="any maskable"` 一本化で1ファイルにまとめると iOS のアイコン問題が減る。**ただし** Apple touch icons は別系統（index.html:21-24）なので影響限定的。
- **修正**: 任意（現状でも動作する）。

---

### P2-A9: SW `fetch` キャッチオール `caches.match('./index.html')` がAPIリクエスト等にも返る

- **箇所**: `sw.js:53`
- **問題**: 同一オリジンのGETリクエストが失敗した場合、何でも index.html を返す。POSは外部API無しなので実害ないが、将来的にリスク。
- **修正**: navigation request のみ index.html fallback:
  ```js
  .catch(() => {
    if (req.mode === 'navigate') return caches.match('./index.html');
    return new Response('', { status: 503 });
  });
  ```

---

## 検査総括

### 検査項目数: 47 / PASS: 19 / FAIL: 6 / WARNING: 22

### 良い点（合格項目）

- `'use strict'` 宣言あり (`app.js:1`)
- HTMLエスケープ関数 `escapeHtml`/`escapeAttr` 定義済みで全innerHTML経路で使用
- async/await の try/catch 適切（acquireWakeLock）
- `localStorage` QuotaExceededError ハンドリング有
- SW precache に必要な全アセット網羅
- viewport `width=1366` で横向きiPad最適化
- 30件分のサンプルデータseedで初回起動UX良好
- cart draft 30分TTLで誤復元防止
- iOS standalone meta 完備
- 関数長が概ね50行以下に抑制（ただし `renderLedger` 51行、`aggregateRange` 25行で合格）
- `'use strict'` モードで暗黙globalを排除
- 命名一貫性良好（`render*`, `persist*`, `loadJSON`/`saveJSON`）
- DRY: cart/topping/flavor 操作にパターン重複あるがリファクタ余地小
- メモリリーク: イベントリスナーは `addEventListener` 1回登録で増えない

### パターン認識

- **POS固有のクリティカル設計が複数箇所で未完**: SW更新×会計中（P0-A1, P0-A2, P0-A6）、入力永続化、quota管理が連動して破綻するリスク。**根本原因**: 「会計トランザクション」を1つの状態機械として扱っていない。`cart` 配列・`received` input・SW更新フラグが独立管理されており、整合性保証がない。
- **アクセシビリティが視覚デザイン優先で犠牲**: 「朱の3箇所縛り」「英字並記廃止」等の美意識ルール遵守は徹底（design lint合格）の一方、ARIA/focus-visible/コントラスト比は後回し（P0-A4, P1-A5, P1-A11）。**根本原因**: DESIGN_CRITIQUE.md は視覚P0/P1/P2を明示するが、A11y用の同等チェックリストが存在しない。
- **iPad Safari 互換テストが机上**: WakeLock/input[type=color]/backdrop-filter の挙動が実機未確認のまま実装（P1-A12, P2-A5, P2-A6）。

---

## Top 3 P0問題（150字）

1. **SW更新でreload→会計データ消失**（app.js:781-785, sw.js:22-28）: install内skipWaiting+controllerchange無条件reloadでcart/received消失。
2. **viewport user-scalable=no がWCAG 1.4.4違反**（index.html:6）: 200%拡大不可。視覚障害者操作不能。
3. **タッチターゲット44pt未満多発**（preset/icon/delete/doc-back/toast btn）: iPad指タップ誤操作多発、WCAG 2.5.5違反。
