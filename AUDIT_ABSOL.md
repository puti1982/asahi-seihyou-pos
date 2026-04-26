# Absol 批評監査 — 朝日製氷POS レイアウト圧縮レビュー

**監査日**: 2026-04-26
**対象**: style.css / app.js (renderFlavors) / index.html / images/*.svg
**観点**: 「圧縮しすぎたら品が落ちる」を最優先軸に、wa-modern (生成り×墨×朱、明朝、ヘアライン罫線、敬語UI) の品格毀損を冷徹に審査

---

## 総合評価

**スコア: 71/100 (ランクA — 良質なスタートアップレベル)**

| 軸 | 配点 | 得点 | コメント |
|---|---|---|---|
| ビジュアルインパクト | /20 | **13** | wa-modernのトーンは保たれているが、grain削除でテクスチャの「呼吸」が消え、サンプル2枚の白抹茶碗が浮く |
| タイポグラフィ | /20 | **15** | 明朝×letter-spacingの規律は見事。しかし圧縮で「御注文」section-label 16px が左パネル幅480pxに対して軽くなった |
| レイアウト・構図 | /20 | **14** | 100px固定行高さは判断として正しい。ただし8/16/24/32の縦リズムが12/14/22の「中途半端値」で部分的に破綻 |
| カラー・質感 | /20 | **15** | 朱を3箇所に絞った戒律は健在。grain削除の代償が質感に直撃 |
| インタラクション・動き | /20 | **14** | content-visibility は妥当。pulse 0.3s、toast cubic-bezier(0.16,1,0.3,1) は上品 |

---

## 結論先出し: 出荷判定

**条件付き出荷可** — P0が3件、P1が6件、P2が4件。P0の3件は本日中に修正すべき。とくに「御会計 totalbar 26px」と「checkout 全体 padding 12」は wa-modern の「礼儀正しさ」を直接損なっており、原研哉ならまず最初に指摘する箇所。

---

## P0 — 出荷不可（本日中に修正）

### P0-A1: `totalbar .val` 26px は「御会計」の威厳を喪失している
- **箇所**: style.css 340行 `.totalbar .val { font-size: 26px; }`
- **問題**:
  「御会計」は POS で**最も視覚的重みを持つべき情報**。32px → 26px は **18.75%減**。明朝の0.04em letter-spacing は大きい字で初めて生きる。26pxでは「金額」というより「数値ラベル」になり下がる。隣の「change-row .val 20px」との差が**わずか6px**しかなく、ヒエラルキーが崩壊している（御会計と御釣銭が同格に見える）。
- **修正**:
  ```css
  .totalbar .val { font-size: 30px; font-weight: 600; }
  /* 26 → 30 (元32から-2pxの妥協点)。change-rowとの差を10px確保 */
  .change-row .val { font-size: 19px; }  /* 20→19 で差を11pxに */
  ```
  もしくは checkoutセクション全体の padding を `12 18 14` → `14 20 16` に戻し、total を `font-size: 32px` を堅持する。**金額表示は神聖領域、ここで妥協してはいけない。**

### P0-A2: `cart-header padding 14/22/10` で「御注文」見出しが立ち上がらない
- **箇所**: style.css 181行 `.cart-header { padding: 14px 22px 10px; }`
- **問題**:
  上端 14px は wa-modernの「立ち上がりの間」哲学に反する。和の組版において、見出し上部の白は「呼気」であり、14pxは「息継ぎなし」に等しい。section-label 16px に対してパディング上下14/10は文字高比1.0以下で、見出しが**カードの縁にこびりついて見える**。1px罫線の border-bottom が「区切り」として機能せず、ただの線になる。
- **修正**:
  ```css
  .cart-header {
    padding: 22px 22px 14px;  /* 上を厚く、下は呼吸を残す */
  }
  ```
  これでヘッダー高さは +12px だが、下の cart-list は flex で吸収する。圧縮は cart-list と checkout の中で完結させ、**section-label の上の余白は wa-modernの命**として死守すべき。

### P0-A3: SVGからの feTurbulence 削除で 31味並んだ時の「紙の呼吸」が完全に消失
- **箇所**: images/01-ichigo.svg 10行コメント、images/22-matcha.svg 同、おそらく全31味同様
- **問題**:
  生成り `#FAF5E9` 単色 + radial-gradient だけでは、4列×8行のグリッドで**並べた時に「印刷物のスキャンPDF」感**が出る。wa-modernの本質は「紙の質感」であり、grainはそのコア。31枚並んだ時の白抹茶碗 (22-matcha) が**完全に浮いて見える**（背景が完全に均質な生成りのため、被写体が「コラージュ」っぽくなる）。
  perf削除の判断は妥当だが、**完全削除ではなく「CSS で grid 全体に1枚だけ grain overlay」にすべき**だった。
- **修正**:
  SVG内の feTurbulence は復活させない（perf判断は正しい）。代わりに `.flavor-grid` に1枚だけ生成りグレインを敷く:
  ```css
  .flavor-grid {
    background: var(--line);
    background-image:
      linear-gradient(0deg, var(--line), var(--line)),
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence baseFrequency="0.85" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.11  0 0 0 0 0.09  0 0 0 0 0.07  0 0 0 0.04 0"/></filter><rect width="160" height="160" filter="url(%23n)"/></svg>');
    background-size: auto, 160px 160px;
    background-blend-mode: normal, multiply;
  }
  ```
  単一レイヤーなので perf 影響は最小。grain は**全体に1枚あるだけでwa-modern感が3倍になる**。

---

## P1 — 磨き（リリース後1週間以内に修正）

### P1-B1: `flavor-grid grid-auto-rows: 100px` 固定で最終行が中途半端に切れる
- **箇所**: style.css 518行
- **問題**:
  100px固定 × 縦スクロールで、コンテナ高さが (例えば) 540px のとき、5.4行表示 → **6行目が40pxだけ顔を出す**。これが「品書」として最も品がない見え方（一覧の途中で物理的に切断されて見える）。snapping もないため、スクロール停止位置がランダム。
- **修正**:
  ```css
  .flavor-grid {
    scroll-snap-type: y proximity;
    scroll-padding-block: 12px;
  }
  .flavor-cell { scroll-snap-align: start; }
  ```
  snap proximity で行頭に吸い込み。もしくは grid-auto-rows を `minmax(96px, 100px)` にして、コンテナ高さに応じて微調整させる。

### P1-B2: `flavor-grid::-webkit-scrollbar 6px var(--line-2)` は wa-modernには太い
- **箇所**: style.css 529-530行
- **問題**:
  6pxは「WebアプリのSaaSデフォルト」。wa-modernでは2-3pxのヘアラインが正解。`--line-2 #CFC1A2` は明度が高く、生成り背景に対して**コントラスト不足で「もやもや」して見える**。原研哉は罫線のフレーバー濃度を絶対に間違えない。
- **修正**:
  ```css
  .flavor-grid::-webkit-scrollbar { width: 3px; }
  .flavor-grid::-webkit-scrollbar-track { background: transparent; }
  .flavor-grid::-webkit-scrollbar-thumb {
    background: var(--ink-3);  /* #8A8175 で十分なコントラスト */
    border-radius: 0;           /* wa-modern なので角を立てる */
  }
  ```

### P1-B3: `.cta padding: 14, font: 17px, min-height: 48px` でクリック誘導力低下
- **箇所**: style.css 440-449行
- **問題**:
  「御 会 計」CTA は会計成立の儀式ボタン。56px → 48px は **タッチ快適圏 (Apple HIG 44pt) の下限ぎりぎり**。letter-spacing 0.32em は 17px だと「御 会 計」の漢字3文字でボタン幅の約45%しか占めず、**朱三角::after が孤立して見える**（ボタン中央のテキストとボタン右端の朱三角が「離れすぎ」）。
- **修正**:
  ```css
  .cta {
    padding: 16px;          /* 14→16 */
    font-size: 18px;        /* 17→18 */
    min-height: 52px;       /* 48→52 */
    letter-spacing: 0.36em; /* 0.32→0.36 で「御 会 計」を中央寄せ */
  }
  .cta::after { right: 22px; }  /* 18→22 で三角を内側に */
  ```

### P1-B4: `receive-input 19px` と `quick-btn 13px` の落差が大きすぎる
- **箇所**: style.css 373行 / 398行
- **問題**:
  入力欄 19px → クイックボタン 13px は **比 1:0.68**。wa-modernの数字組版では「主×従」を 1:0.75 程度に保つのが基本。19/13 は「メインとサブ」というより「巨人と小人」になっている。
- **修正**:
  ```css
  .receive-input { font-size: 18px; }   /* 19→18 */
  .quick-btn { font-size: 14px; }       /* 13→14 */
  /* 比 18:14 = 1:0.78 で wa-modern の規律に回帰 */
  ```

### P1-B5: 縦リズムが「12/14/22/10」で 8基準グリッドから逸脱
- **箇所**: style.css 全般 (`.cart-header 14/22/10`, `.checkout 12/18/14`, `.totalbar 4/6/10`)
- **問題**:
  8の倍数 (8/16/24/32/48/64) を絶対基準にする原研哉の流儀から見ると、12/14/22/10 はすべて**中途半端値**。視覚的には1〜2px の差は「気づかれない」が、ピクセルパーフェクト指向の審美眼を持つデザイナー（佐藤オオキレベル）には**必ずバレる**。
- **修正**:
  ```css
  .cart-header { padding: 16px 24px 12px; }  /* 8基準 */
  .checkout { padding: 16px 16px 16px; }     /* もしくは 16/24/16 */
  .totalbar { padding: 4px 8px 12px; margin: 0 0 12px; }
  .receive-input { padding: 10px 12px; }
  .change-row { padding: 12px 0 16px; }
  ```

### P1-B6: `change-row .lbl 13px` と `receive-row .lbl 12px` が**御釣銭と御預かりの格を逆転**させている
- **箇所**: style.css 363行 / 422行
- **問題**:
  「お預かり」12px、「御釣銭」13px。日本の会計儀礼では **預かり (お客様の行為) > 釣銭 (店側の返礼)** が格として正しい。両方とも明朝なら、**お預かり 13px、御釣銭 12px** が正しい上下関係。
- **修正**:
  ```css
  .receive-row .lbl { font-size: 13px; }  /* 12→13 */
  .change-row .lbl { font-size: 12px; }   /* 13→12 */
  ```

---

## P2 — 任意（次のスプリント）

### P2-C1: `backdrop-filter: blur(2px)` で「障子越し」感が薄い
- **箇所**: style.css 646-647行
- **問題**:
  4px → 2px の半減は、perf的には正解。しかし2pxは**ぼかしというより「ピントが合っていないだけ」**に見える。障子越しは 3-4px が必要。
- **修正**:
  ```css
  backdrop-filter: blur(3px) saturate(1.05);
  /* 3pxにしつつ saturate でほんのり生成りを濃くして「越し感」を補う */
  ```

### P2-C2: `flavor-cell padding 12/12/10` で `flavor-num 11px` (右上) と `flavor-name 16px` の干渉懸念
- **箇所**: style.css 537行 / 598-606行
- **問題**:
  右上 12px の位置に flavor-num (11px italic) を絶対配置している。背景画像の「右寄せ」と重なる味（特に 22-matcha のように chasen が右側にある）で、**番号が抹茶碗の柄に被って読めない**ケースが発生する可能性。背景グラデで救われているが、グラデの濃度 0.92 は `top: 12px, right: 12px` には届かない（グラデは左寄せのため）。
- **修正**:
  ```css
  .flavor-cell.has-image::after {
    background: linear-gradient(135deg,
      var(--paper) 0%,
      rgba(255,255,255,0.92) 22%,
      rgba(255,255,255,0.55) 48%,
      rgba(255,255,255,0) 78%);
    /* 90deg → 135deg で右上にも生成りを回す */
  }
  ```

### P2-C3: SVG画像の `radialGradient cx=35% cy=32% r=85%` が 31枚共通で「光源の同一性」が単調
- **箇所**: 全 SVG ファイル
- **問題**:
  味によって光源が変わらないため、グリッドで並べると「印刷物の連刷」感が出る（これは長所でもあるが、4×8で並んだ時に**全セルの左上が同じだけ明るい**ので機械的）。
- **修正**:
  10味ごとに光源 cx/cy を ±5% 程度ずらすバリエーション3種を作る（手作業 or スクリプトで）。

### P2-C4: `flavor-cell::before` の 1.5px 縦線が左端に寄りすぎ
- **箇所**: style.css 579-586行
- **問題**:
  `top: 14px; bottom: 14px; left: 0;` で、padding 12px との関係で**縦線とテキスト先頭の距離が14px** （セルパディング 12 + 縦線分 1.5 + 補正 ≒ 13px）。1.5px の縦線は**色マーカーとして機能する**が、左端密着はwa-modernには「ベタ付き」過ぎる。
- **修正**:
  ```css
  .flavor-cell::before {
    top: 16px; bottom: 16px; left: 4px;  /* 0→4 で「呼気」を入れる */
    width: 1.5px;
  }
  .flavor-cell { padding: 12px 12px 10px 16px; }  /* 左パディングのみ +4 */
  ```

---

## 全体所感（一流デザイナーの視点）

### 原研哉なら最初に指摘するもの
**「圧縮の方向が間違っている。圧縮すべきは余白ではなく**情報密度**だ」** — wa-modernの本質は**余白が情報の格を決める**こと。今回の修正は余白を削って情報量を維持する方向だが、本来は **情報の取捨選択（クイックボタン5個 → 4個）と密度低減で対応すべき**。

### 深澤直人なら指摘するもの
**「金額表示が会計の儀式から数値処理に降格している」** — 御会計 26px、御釣銭 20px。明朝の数字は大きさそのものが「敬意の濃度」。32px と 26px は touch operation 上は同じだが、**心理的儀礼性が18%損なわれた**。

### 佐藤オオキなら指摘するもの
**「グリッドが破綻している」** — 8基準グリッドが部分的に守られていない（12/14/22）。プロの目には**すぐバレる**。本人達は「気づかれない」と思っているが、**ピクセル単位の規律こそが wa-modern と「和風SaaS」を分ける唯一の境界線**。

### 過去レビューとの比較
P0/P1/P2修正（朝日ロゴSVG、letter-spacing スクリプト別、罫線4階層、CTA朱三角、印章、フッター）は**全て健在**。これらは圧縮で破壊されていない。**ベース品質は守られた**。

しかし、レイアウト圧縮は wa-modernの「余白 = 格」哲学と直接衝突する施策。本来であれば**「左カート幅 480 → 520」「画面下端の余白を削る」「checkoutセクションを独立スクロール」など別解があった**。今回の選択は実務的だが、デザイン的には**妥協の産物**。

### 本当に大事な一言
**圧縮は「動作を成立させる」ことには成功した。しかし、wa-modernの「品」を一段階下げた。出荷は可能。ただし P0-A1 (totalbar 26→30) と P0-A3 (grain layer 復活) は本日中に修正すべき。** これらを治せば、品格は元のラインに復旧する。

---

## 参照すべきサイト
- **Linear.app** — 圧縮しても情報密度が下がらないグリッド設計の手本
- **muji.com (旧版)** — 余白で格を決める日本的タイポグラフィ
- **kuon.tokyo** — wa-modern × 商業POS の到達点（明朝、生成り、ヘアライン）
- **takashimaya.co.jp/store/** — 御 (敬語) の使い分けと数字の格

---

## 次回レビュー時の追跡項目
1. P0-A1 totalbar font-size 修正済か
2. P0-A2 cart-header padding 22/22/14 に戻したか
3. P0-A3 grain layer を CSS で復活させたか
4. 8基準グリッドへの回帰
5. snap proximity 導入で最終行切れが解消されたか

---

**監査者**: Absol (批評家)
**蓄積先**: skills/operations/dev-team/critic_reviews.md (#要追記)
