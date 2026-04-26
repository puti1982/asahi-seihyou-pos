# 朝日製氷 POS — QAレポート

QA担当: Mei (Chansey)
検証日: 2026-04-26
検証方式: コードトレース（実コードを行番号で参照）
対象: index.html / app.js / style.css / sw.js / manifest.webmanifest

---

## A. POS基本フロー

### A1. 空カートで会計完了ボタンが disabled か
- 結果: ✓ PASS
- 根拠: index.html:96 `<button class="cta" id="checkout" disabled>` で初期disabled。app.js:313 `updateChange()` で `(s === 0 || r < s)` のとき disabled=true。空カート時 `calcSubtotal()=0` なので s===0 → disabled維持。

### A2. お預かり > 価格 → 会計完了ボタンenabledになる遷移
- 結果: ✓ PASS
- 根拠: app.js:792-793 `received.addEventListener('input', updateChange)`。app.js:308-314 で `r - s` 計算しdisabled更新。s>0かつr>=sならdisabled=false。

### A3. 同味3タップ → カート3行に分裂（B案維持）
- 結果: ✓ PASS
- 根拠: app.js:241-251 `addToCart` は `cart.push` で常に新規itemを追加（`nextId++`で別ID）。集約ロジックが存在しないためB案（同味も別行）を維持。

### A4. カート行ミルクトグルON → +50円反映、UI即時更新
- 結果: ✓ PASS
- 根拠: app.js:298-302 `toggleTopping` で `it.toppings[tid].active` を反転 → `renderCart()` で全描画 → app.js:256-259 `calcItem` で active な topping を加算 → app.js:277 で表示。app.js:822-833 のデリゲートで `data-action="toggle-topping"` を捕捉。

### A5. ミルク+スプーン+特製カップ全ON → +260円反映
- 結果: ✓ PASS
- 根拠: app.js:44-48 のDEFAULT_TOPPINGS は milk=50, spoon=10, cup=200。calcItemで全加算で +260。

### A6. カート行削除 → 削除後の合計即時更新
- 結果: ✓ PASS
- 根拠: app.js:303-306 `removeItem` で `cart = cart.filter` → `renderCart()` で subtotal/change を再計算。

### A7. 会計完了 → トースト → カート空 → お預かり空 → 合計0 → 履歴追記
- 結果: ✓ PASS
- 根拠: app.js:317-339 `doCheckout` で saveSale → showToast(角印付き) → `cart=[]` → `received.value=''` → clearCartDraft → renderCart。renderCartで empty-cart 表示。

### A8. お釣り計算 (お預かり 1000 - 合計 510 = 490)
- 結果: ✓ PASS
- 根拠: app.js:308-314 `updateChange` で `c = r - s`、c>=0 のとき c を表示。1000-510=490 を表示。

---

## B. 設定

### B1. 味の名前変更 → focusOutで保存 + POS反映
- 結果: ⚠ WARN
- 再現手順:
  1. 設定 → 「いちご」を「苺」に変更しfocusOut
  2. POSに戻り「苺」が表示されているか確認
- 期待挙動: changeイベント発火 → 即時POS反映
- 実際の挙動: app.js:851-868 `settingsView.addEventListener('change', ...)` を使用。`change`イベントは focus out（blur）時に発火するためテキスト編集ではOK。**ただし `input[type="color"]`** の change イベントはブラウザ実装によりピッカーを閉じた瞬間 or 値変更ごとに発火しタイミングが異なる。テキストはOK、色はWARN。
- 修正案: テキスト/数値は `input` イベント、色は `change` イベントで分岐。あるいは `change` でも実用上問題なし（保存タイミングが少し遅れるだけ）。

### B2. 味の価格変更 → POS反映 + 「全品 ¥250」表示の動的切替
- 結果: ✗ FAIL
- 再現手順:
  1. カートに「いちご(¥250)」を1つ入れる
  2. 設定で「いちご」の価格を300円に変更
  3. POSに戻る
- 期待挙動: 既存カートの「いちご」も300円で計算される、または古い250円のまま明示
- 実際の挙動: app.js:241-251 `addToCart` で `basePrice: f.price` をスナップショットしているため、設定変更しても**既存カート行の basePrice は変わらない**。calcItem も古い basePrice を使う。app.js:107-113 `refreshAfterChange` は `renderCart()` を呼ぶが、cart内の basePrice は更新しないので価格変動が画面上反映されない（subtotalも古い額）。
- 「全品 ¥250」切替自体: app.js:229-238 `updatePriceRule` は機能する → ✓
- 修正案: 設定変更時に `cart.forEach(it => { const cur = FLAVORS.find(f => f.name === it.flavor); if (cur) it.basePrice = cur.price; })` を refreshAfterChange に追加。または「設定変更は次回新規入力から有効」と明示UI表示。

### B3. 味の色変更 → POS反映
- 結果: ⚠ WARN
- 期待挙動: 既存カート行の左帯色も新色に追従 or スナップショットで固定
- 実際の挙動: app.js:241-251 `color: f.color` をスナップショット。既存カート行の `--flavor-color` は古いまま。flavor-grid側は `renderFlavors` で再描画されるので新色反映 → 一部反映、一部固定の不整合。
- 修正案: 上記B2と同じく cart行の color を再同期するか、明示的に「カート内の品はその時の価格・色で確定」と仕様化。

### B4. 味を削除 → 過去取引履歴破壊しない
- 結果: ✓ PASS
- 根拠: app.js:556-561 `deleteFlavor` は `FLAVORS.splice` のみ。SALES_KEY には触れない。app.js:367-391 `aggregateRange` は `it.flavor` 文字列を使うが、kakigoriカウントは flavor 名に依存しないため履歴は壊れない。

### B5. 新規追加 → POSに出現、Storage永続化
- 結果: ✓ PASS
- 根拠: app.js:562-570 `addFlavor` で push → persistFlavors → saveJSON(FLAVORS_KEY) で永続化 → renderFlavors で品書きグリッドに表示。

### B6. 味の▲▼並び替え
- 結果: ✓ PASS
- 根拠: app.js:549-555 `moveFlavor` で配列スワップ → persist → renderSettings。app.js:511-512 で先頭/末尾は disabled 設定済み。

### B7. トッピング追加 → 全カート行にチップ追加（既存カート復活時の挙動含む）
- 結果: ✗ FAIL（重大）
- 再現手順:
  1. カートに「いちご」を追加
  2. 設定でトッピング「シロップ大盛り(+¥30)」を追加
  3. POSに戻る
- 期待挙動: 既存「いちご」行に「シロップ大盛り」チップが追加表示される
- 実際の挙動: app.js:241-251 `addToCart` で `TOPPINGS.reduce(...)` をスナップショット。**追加後にrenderCartが呼ばれても、既存 cart item の `it.toppings` には新トッピングのキーが存在しない**ため chip は表示されない。新規追加の品だけが新トッピング対応。
- 修正案: `persistToppings()` 内で既存カート行を再同期：
  ```js
  cart.forEach(it => {
    TOPPINGS.forEach(t => {
      if (!it.toppings[t.id]) {
        it.toppings[t.id] = { name: t.name, price: t.price, active: false };
      } else {
        it.toppings[t.id].name = t.name;
        it.toppings[t.id].price = t.price;
      }
    });
  });
  ```

### B8. トッピング削除 → 過去取引のtopping参照が壊れない
- 結果: ⚠ WARN
- 過去取引について: ✓ PASS。app.js:382-386 で `it.toppings || []` の各 `tp.id` を `toppingCounts[tid]` にカウント。aggregateRange の lines 生成は app.js:454-458 で現在の TOPPINGS のみ集計。**削除されたトッピングのカウントは集計から脱落するが、過去取引の total には含まれる**ため total と 内訳の合計が一致しない（要確認）。
- 計算チェック: かき氷収益 + 各トッピング(現存のみ)収益 ≠ total（削除済みトッピング分の差額が出る）。aggregateRange の return は total/transactions/kakigoriRevenue だけ単独で正しいが、UI上「内訳」と「合計」の差はユーザーから見ると不可解。
- 既存カート: B7同様、削除されたトッピングのキーは cart item に残り続け chip も表示される。トッピングをdeleteしてもカートからは消えない。
- 修正案: deleteTopping時に `cart.forEach(it => delete it.toppings[deletedId])` を実行 + ledger表示で「(廃止) ○○」行を別途表示。

---

## C. 売上帳

### C1. 売上帳タップ → 当日モーダル
- 結果: ✓ PASS
- 根拠: index.html:58 `data-action="open-today"` → app.js:803 `if (action === 'open-today') openToday()` → app.js:393-418 `openToday` でモーダル表示。

### C2. 当日0件 → 全項目0
- 結果: ✓ PASS
- 根拠: 当日範囲で `loadSales().filter` が空 → kakigori=0, total=0, transactions=0。app.js:415-416 で 平均は `transactions ? ... : 0` のため 0 件のときは ¥0 表示。lines も qty=0、revenue=0。

### C3. 当日n件取引後 → 内訳正しい（かき氷count = items総数）
- 結果: ✓ PASS
- 根拠: app.js:377-389 で `s.items.forEach(it => { kakigori++ ... })` のため、かき氷count は **items 総数**（取引数ではない）になる。仕様一致。

### C4. 「詳細を見る」 → 詳細ビュー遷移
- 結果: ✓ PASS
- 根拠: app.js:846-848 で `closeToday(); setView('ledger'); setPreset(30);` を実行。ledgerビューに遷移し直近30日プリセットが自動適用。

### C5. プリセット 直近7/30/90/今月/全期間 全て期待値
- 結果: ⚠ WARN
- 根拠: app.js:422-438 `setPreset`:
  - 7/30/90: `today - (kind-1) * 86400000` で from を生成 → ✓
  - month: `new Date(year, month, 1)` で月初 → ✓
  - all: `loadSales()` の最初の取引のtsをfromに → ✓ ただしsalesが ts でソートされている前提（`seedIfEmpty`はソート済み app.js:164、本番取引は`Date.now()`なので昇順保証されるが、importJSONでimportされたsalesが**ソートされていない可能性あり**）。
- 修正案: `setPreset('all')` で `Math.min(...all.map(s => s.ts))` を使う方が堅牢。

### C6. 不正期間（from > to） → エラー or 0件
- 結果: ⚠ WARN
- 根拠: app.js:440-446 `renderLedger` で `fromTs > toTs` の場合、aggregateRangeのfilter `s.ts >= fromTs && s.ts <= toTs` は常にfalse → 0件表示（"該当期間にデータがありません"）。
- 期待挙動: ユーザーに「期間が逆順です」と注意喚起すべき
- 実際の挙動: 黙って0件表示されるためユーザーが原因に気づきにくい
- 修正案: `if (fromTs > toTs) { showToast('期間の指定順が逆です'); return; }` を renderLedger 冒頭に追加。

### C7. データ無し期間 → 「該当データなし」表示
- 結果: ✓ PASS
- 根拠: app.js:474-477 `dates.length === 0` のとき `<tr><td colspan="..." ...>該当期間にデータがありません</td></tr>` を表示。

---

## D. データ管理

### D1. JSONエクスポート → 正しいJSON ダウンロード
- 結果: ✓ PASS
- 根拠: app.js:604-623 `exportJSON` で `{ brand, exportedAt, flavors, toppings, sales }` を Blob 化してダウンロード。LAST_BACKUP_KEY 更新。

### D2. JSONインポート → 復元成功
- 結果: ⚠ WARN
- 根拠: app.js:625-649 `importJSON` で FileReader → JSON.parse → confirm → 各キー保存。
- 問題: `if (!confirm(...)) return;` のあと、関数末尾で何もしない。**しかし confirm でキャンセルすると、すでにファイル選択済みでファイル参照が残るので副作用なし** → OK。
- 隠れた問題: `data.flavors` が配列でない場合（オブジェクトなど）の検証なし。`if (data.flavors) { FLAVORS = data.flavors }` で型チェックしないので不正構造を受け入れる。
- 修正案: `if (Array.isArray(data.flavors)) ...` で型ガード追加。

### D3. 不正JSON → エラー表示
- 結果: ✓ PASS
- 根拠: app.js:642-644 `catch (e) { alert('読み込みに失敗しました: ' + e.message); }`。JSON.parse失敗で alert 表示。

### D4. サンプル削除 → sample-*のみ削除
- 結果: ✓ PASS
- 根拠: app.js:651-656 `resetSampleData` で `loadSales().filter(s => !String(s.id).startsWith('sample-'))`。本番取引（IDは `${Date.now()}-${random}` 形式 app.js:328）は保持される。

### D5. 全履歴消去 → 二重confirm後実行
- 結果: ✓ PASS
- 根拠: app.js:657-662 `clearAllSales` で confirm を2回直列実行。両方Yesでのみ `localStorage.setItem(SALES_KEY, '[]')`。

### D6. 設定初期化 → DEFAULT_*に戻る、履歴は維持
- 結果: ⚠ WARN
- 根拠: app.js:663-672 `resetSettings` で DEFAULT_FLAVORS / DEFAULT_TOPPINGS にリセット。SALES_KEY には触れない → 履歴維持 ✓
- 問題: **既存カートに残っている item の `it.toppings` は古いトッピング設定のスナップショット**のまま（B7同様の問題）。リセット後にカートと表示が不整合になる。
- 修正案: resetSettingsの最後に `cart = []; clearCartDraft();` を追加し、設定リセット時はカートも空にする（または上書き同期）。

---

## E. PWA / オフライン

### E1. SW登録（HTTPS必須前提を確認）
- 結果: ✓ PASS
- 根拠: app.js:764-787 `registerServiceWorker` で `'serviceWorker' in navigator` を判定し `navigator.serviceWorker.register('./sw.js')`。HTTP/file:// では登録自体スキップされる（Chrome/Safari は localhost か HTTPS のみ許可）。catch で握り潰しているのでアプリは継続動作。

### E2. オフライン再起動 → 全機能動作
- 結果: ✓ PASS
- 根拠: sw.js:6-20 で index/app.js/style.css/manifest/icons をプリキャッシュ。sw.js:38-55 fetch ハンドラは cache-first で、オフライン時もキャッシュから返却。アプリは外部APIを使わず localStorage のみで完結する設計のためオフライン全機能動作。

### E3. SW更新時 → 「更新あり」トースト → 適用→reload
- 結果: ✓ PASS
- 根拠: app.js:768-776 `updatefound` → newSW の `statechange` で `installed` かつ `controller` ありなら showUpdateBanner。app.js:760-762 で適用ボタンに `newSW.postMessage('SKIP_WAITING')` → sw.js:58-60 で `self.skipWaiting()` 実行 → activate → app.js:781-785 `controllerchange` で `window.location.reload()`。
- 補足: メッセージは新SWに直接送るので、新SWのmessageハンドラで自身が skipWaiting する設計になっており正しい。

### E4. 強制終了→再起動 → カートドラフト30分以内なら復元
- 結果: ✓ PASS
- 根拠: app.js:115-136 `persistCartDraft / restoreCartDraft / clearCartDraft`。renderCartが呼ばれるたびにpersist (app.js:295)。restoreCartDraft (app.js:121-133) で `Date.now() - ts > 30*60*1000` ならドラフト破棄、それ以下なら `cart = d.cart`, `nextId = d.nextId` を復元。init (app.js:895-908) で `restoreCartDraft()` → `renderCart()` が走る。

### E5. localStorage 4MB近接 → 警告
- 結果: ✓ PASS
- 根拠: app.js:88-105 `saveSale` 内で `serialized.length * 2 > 4 * 1024 * 1024` のとき showToast。会計のたびに容量チェック。

### E6. 最終バックアップ日時表示
- 結果: ✓ PASS
- 根拠: app.js:675-685 `renderBackupStatus` で LAST_BACKUP_KEY を読み込み「最終バックアップ: YYYY年M月D日（X日前）」を表示。未取得時は「未取得」表示。

---

## F. WakeLock

### F1. ON → スクリーンスリープ防止
- 結果: ⚠ WARN
- 根拠: app.js:703-712 `acquireWakeLock` で `navigator.wakeLock.request('screen')` を呼ぶ。toggleWakeLock (app.js:719-736) でユーザー操作起点で acquire。**iOS Safariは Wake Lock APIを未サポート（2024時点で限定的）** → app.js:704 `if (!('wakeLock' in navigator)) return false;` で false 返却し「有効化できませんでした」トースト。
- 注意: 動作するブラウザではユーザータップ→acquireが必須（自動取得は失敗する）。app.js:744-746 `initWakeLock` で起動時に有効化済みの状態だと自動acquireを試みるが、ユーザー操作起点でないため失敗する可能性あり。

### F2. visibilitychange で再取得
- 結果: ✓ PASS
- 根拠: app.js:747-751 `document.addEventListener('visibilitychange', ...)` で `visible` かつ `wakeLockEnabled` かつ `!wakeLock` のとき `acquireWakeLock()`。OS仕様でタブ切替時にWakeLockがreleaseされた後、復帰時に再取得する。

---

## G. エッジケース

### G1. お預かり 999,999,999 巨大値
- 結果: ⚠ WARN
- 根拠: app.js:309 `parseInt(document.getElementById('received').value) || 0`。`parseInt` は実質Number.MAX_SAFE_INTEGER (9.007e15) まで安全。999,999,999 は問題なし。
- 注意: input[type="number"] 自体は max 属性なし → ユーザーが極端な値を入れた場合表示が崩れる可能性。
- 修正案: `<input ... max="9999999">` を追加。

### G2. 価格 0円の味
- 結果: ⚠ WARN
- 根拠: 価格0でも calcItem は通る。subtotal=0 のとき app.js:313 で `disabled = (s === 0 || ...)` となり**0円のかき氷だけのカートでは会計ボタンが無効**。
- 期待挙動: 0円取引は不可（仕様上妥当）または「無料」として処理可能
- 実際の挙動: 0円カートは会計不可
- 修正案: 仕様を明示（無料品禁止）、または `s === 0` 条件を `cart.length === 0` に変更。

### G3. マイナス価格設定
- 結果: ✗ FAIL
- 再現手順: 設定で価格欄に `-100` を入力
- 期待挙動: マイナスは拒否、または絶対値化
- 実際の挙動: app.js:859 `parseInt(value, 10) || 0`。マイナスはそのまま保存される → カート合計がマイナス値になりうる、subtotalも負数表示。会計時 `r >= s` で `r=0, s=-100` だと `0 >= -100` true でenabled。
- 修正案: `Math.max(0, parseInt(value, 10) || 0)` または input[type="number"] に `min="0"` 追加 + 検証。

### G4. 31味全削除 → POS空グリッド
- 結果: ✓ PASS
- 根拠: app.js:196-227 `renderFlavors` で cellCount=0、cols=4、rows=Math.max(8, 0)=8。32個の空セル生成（empty class）→ クリック不可（pointer-events:none style.css:577-579）。
- 副作用: `updatePriceRule` は `prices.length === 1` 判定で空配列だと length=0 → else 分岐で hidden になる ✓

### G5. 同名味の重複追加
- 結果: ⚠ WARN
- 根拠: 設定で「いちご」を2件作成可能。`FLAVORS` は配列で重複許可。POSグリッドに2セル表示される。
- 履歴集計: aggregateRange はトッピングのみ id ベースで、かき氷は basePrice を加算するだけなので重複名でも問題ない。
- カート: 名前で識別する箇所なし（オブジェクト参照で渡る）→ 機能的には動く。
- 注意: ユーザー混乱を招く。バリデーション無し。
- 修正案: addFlavor / updateFlavor で同名チェック → 警告。

### G6. 1日1000取引でID衝突
- 結果: ✓ PASS
- 根拠: app.js:328 `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`。Date.now()がms単位 + 6文字ランダム(36^6 ≈ 21億通り)。1msに同時2件発生してもランダム部で衝突確率は 1/21億。1日1000取引(86,400秒に1000) → 86秒/件で完全に衝突しない。

### G7. 設定画面で `<script>` 入れた時のXSS
- 結果: ✓ PASS
- 根拠:
  - 品書グリッド: app.js:212 `${escapeHtml(f.name)}` ✓
  - カート品名: app.js:276 `${escapeHtml(it.flavor)}` ✓
  - カートtopping名: app.js:283 `${escapeHtml(t.name)}` ✓
  - 売上帳の名前: app.js:409, 462 `${escapeHtml(l.name)}` ✓
  - 設定画面のinput value: app.js:507 `value="${escapeAttr(f.name)}"` で `"` のみエスケープ → 属性値内では十分安全（ダブルクォートで括られているため `<>` をブレイクできない）
  - 値: `<script>alert(1)</script>` を入力しても、name表示では `&lt;script&gt;...` 化、input valueでは `<` がそのまま入るが onclickなど属性外への脱出は不可
- escapeHtml: app.js:181-183 で `& < > " '` 全エスケープ ✓
- 注意: `escapeAttr` は `"` のみ → ダブルクォート属性内専用。シングルクォート属性で使うと脆弱だが、本コードはすべて `value="..."` で使用しているためOK。
- color input: app.js:506 `value="${f.color}"` は escape なし。color値はカラーピッカーでしか入らないが、importJSON経由で `"><script>` を仕込まれた場合脆弱。
- 修正案: color値も `escapeAttr` でラップ（多層防御）。

### G8. localStorage破損時の起動
- 結果: ⚠ WARN
- 根拠:
  - loadJSON (app.js:66-71): try/catch で fallback 返却 ✓
  - loadSales (app.js:82-85): try/catch で `[]` 返却 ✓
  - healthCheck (app.js:687-697): FLAVORS_KEY/TOPPINGS_KEY が null かつ sales が空でないとき復元提案
- 問題: SALES_KEY が破損JSONの場合、loadSales は `[]` を返すが**破損データはlocalStorageに残ったまま**。次回 saveSale で loadSales→push で破損データを上書きするため自動復旧する。
- ただし healthCheck は flavors/toppings の null のみチェック。SALES破損は検知しない。
- 修正案: healthCheck で `localStorage.getItem(SALES_KEY)` が非nullかつJSON.parse失敗するケースもチェック。

---

## 追加発見事項

### Z1. addFlavor の重複名チェックなし
- app.js:562-570 で 「新しい品」 を連打すると同名の品が増殖する。
- 修正案: 連番付与（「新しい品 2」「新しい品 3」）。

### Z2. importJSONのconfirm順序
- app.js:633-641: 先に JSON.parse 成功してから confirm → confirm キャンセル時に何も保存しないのは正しい挙動。ただし `showToast('復元しました')` も confirm 後にあるためキャンセル時はトーストも出ない ✓

### Z3. SW updatefound のレースコンディション
- app.js:781-785 controllerchange で reload するが、refreshing フラグで多重防止 ✓
- ただし、ユーザーが「適用」を押す前に新しいタブで開いてSWが activate した場合、現在のセッションでも reload される → 取引中の事故防止のため、cart にアイテムがあるときは reload 抑止すべき。
- 修正案: `if (cart.length > 0) { showToast('取引終了後に再読込してください'); return; }` を controllerchange に追加。

### Z4. saveSaleのcatchで例外re-throw
- app.js:99-104 で QuotaExceededError 時 alert して **throw e**。これにより doCheckout 内で例外伝播 → cart クリアが実行されない。**取引データは保存失敗するが UI 上は会計画面にとどまるため、取引の二重処理を防ぐ**意味で正しい。
- 注意: ユーザーには「保存失敗した。バックアップしてください」と alert は出るが、cart は残ったままなのでもう一度押せば再試行可能 ✓

### Z5. healthCheck内のimportJSON呼び出し
- app.js:692-695: `flavors null && sales > 0` で復元確認。confirmYesで importJSON()。しかし importJSON は `input.click()` でファイル選択ダイアログを開くが、**healthCheck は init 内 (app.js:905) から呼ばれるため、ユーザー操作起点でないファイルダイアログはブロックされる**ブラウザがある（特にSafari）。
- 修正案: ファイル選択を要するなら、トーストで「設定→JSONバックアップから復元」を案内する方式に変更。

---

## 重大問題 Top 3 サマリー (150字)

1. B7: 設定でトッピング追加しても既存カート行に反映されず、新トッピングが選べない構造的バグ。
2. B2: 味の価格を変更しても既存カート行は古い価格のまま、表示と実価格が乖離する。
3. G3: 設定でマイナス価格を保存可能。バリデーション皆無で会計合計が負数化する致命的脆弱性。
