# 朝日製氷 POS — 徹底デザイン批評

**批評者**: Absol（DORU開発部門 批評家）
**日時**: 2026-04-26
**対象**: `/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos/mock.html`
**評価視点**: 原研哉 / 深澤直人 / 佐藤オオキ / Aesopインハウス / 仲條正義 / 杉浦康平
**総合スコア**: 64/100（A-下位 / 「悪くない和モダン」だが「日本のトップデザイナーが手掛けた」レベルには到達していない）

---

## 総評（前段）

パステル時代より明確に進化した。生成り×墨×朱の三色基調、ヒラギノ明朝、敬語UI、罫線の細さ、全体の落ち着き — この方向性自体は正しい。
しかし、**「方向は正しいが、craftの解像度がまだ二段階足りない」**。

具体的には、

1. **「和モダンの語彙を借りているだけで、和モダンの構造原理（間・余白の質・線の表情）に踏み込んでいない」**
2. **「ディテールが全体的に均質すぎて、見るべき焦点（焦点 = 客が最初に視線を止める一点）が設計されていない」**
3. **「老舗『製氷店』としての固有性（氷・水・冷・透明感・夏）が視覚言語として一切表現されていない」**

これら3点が改善されない限り、原研哉/深澤レベルからは「悪くないが、無印良品の量産和モダンテンプレ」と評価される。

以下、P0/P1/P2で全25項目を列挙する。

---

## P0 — 出荷前必修正（重大な品質欠落）

### P0-01. 「朝日製氷」の固有性ゼロ問題（ブランド整合性）

- **箇所**: 全体（特に header `.brand` line 59-79, `.sun-mark` line 60-65）
- **問題**:
  「朝日製氷」という商号は、(1)「朝日 = 太陽・赤・暖」と(2)「製氷 = 氷・水・冷・透明」という**真逆の温度感を孕んだ二項対立の屋号**である。これが視覚言語に1mmも反映されていない。
  現状の `.sun-mark`（朱の14px円 + 8% box-shadow）は「ただの赤い丸」であり、これが「朝日」だと初見で読み取れる人は皆無。氷を扱う店であることを示す要素は皆無。
  老舗の屋号ロゴは「商品の本質を一筆で表す」べきなのに、ここでは「朱の点」と「明朝の社名」が無関係に並んでいるだけ。
- **修正**:
  - `.sun-mark` をやめ、SVGロゴマークに置き換える。例: 「朝陽が昇る瞬間を、半円＋水平線＋極細の縦線（氷柱の暗示）で構成」した直径36-44pxのマーク。
  - 朱色は「朝日」の中央コア（直径8px）のみに使い、外周は墨グラデで「夜から朝への遷移」を示す。
  - ヘッダー右端、または品書きグリッドの隅に「氷文様（雪輪 / 結晶六角）」を極小（10×10px、line color）で配置し、製氷店の固有性を担保する。
  - 背景の radial-gradient（line 33）は「砂目」の擬態で意図不明。これを撤廃し、代わりに `.flavor-grid` の背後に超薄い氷の縦縞テクスチャ（opacity 0.03、SVG patternfill）を敷く。

### P0-02. 文字組み「漢字とカナ・英字の混植バランス」が崩壊

- **箇所**: line 73-78（`.brand-en` `letter-spacing: 0.32em`）、line 846 `Asahi&nbsp;&nbsp;Seihyō`、line 354 `.price-rule .word { letter-spacing: 0.32em; }`
- **問題**:
  和文と欧文のletter-spacingが**ほぼ同値（0.18em〜0.32em）で揃えられている**。これは和モダンタイポグラフィの初歩的な失敗。
  - 漢字は字面が大きいので tracking はむしろ詰める（-0.02em〜0.04em）、または「ベタ組み」が原則。
  - 和文カナ（ひらがな/カタカナ）は字面に揺らぎがあるので 0.05〜0.10em。
  - 欧文（特に大文字）は 0.15〜0.25em。
  - 数字（タビュラー）は tnum で詰めて整列。
  これらを**全部0.18〜0.32emで揃えてしまっている**ため、「letter-spacing で和の雰囲気を出す」というAI生成サイトの典型パターンに落ちている。原研哉なら絶対やらない。
  さらに `Asahi&nbsp;&nbsp;Seihyō` の `&nbsp;&nbsp;` は無理矢理2倍スペースで「英字も和風に間延びさせた」**最も恥ずかしいAI臭**。
- **修正**:
  ```css
  /* 漢字（社名・見出し） */
  .brand-name { letter-spacing: 0.04em; font-feature-settings: "palt" 1; }
  .doc-headline .ja, .flavor-title .ja { letter-spacing: 0.08em; font-feature-settings: "palt" 1; }
  /* カナ */
  .item-name, .flavor-name { letter-spacing: 0.02em; }
  /* 欧文 small caps */
  .brand-en, .section-en, .flavor-title .en { letter-spacing: 0.18em; }
  /* HTMLは `Asahi Seihyō` に戻す（&nbsp;&nbsp; 削除） */
  ```
  さらに `font-feature-settings: "palt" 1, "pkna" 1;` を `--serif` に追加し、明朝のプロポーショナルメトリクスを有効化する。

### P0-03. 余白が「均一すぎて間（ま）がない」

- **箇所**: `.cart-header` 22px 26px 16px / `.flavor-header` 22px 30px 18px / `.checkout` 18px 22px 22px / `.modal` 32px 36px / `.doc-wrap` 32px 48px 60px
- **問題**:
  和モダンの余白は「均一に取る」のではなく、「**意図的に偏らせる**」もの。茶室の床の間や掛け軸の表装が、左右非対称・上下非対称であることに学ぶべき。
  現状の余白は全て「上下＝左右」または「上＝下」で対称。これは西洋グリッド思考であって、和の余白ではない。
  特に `.flavor-grid` の `padding: 0 30px 24px` と `margin-top: 24px` は、上余白と下余白がほぼ同じで、グリッドが宙に浮いている。
- **修正**:
  - `.flavor-header` → `padding: 36px 40px 20px` （上を意図的に厚く＝「立ち上がりの間」）
  - `.flavor-grid` → `padding: 0 40px 48px; margin-top: 32px;`（下を厚く＝「呼吸の間」）
  - `.cart-header` → `padding: 32px 28px 18px` （上余白を増やし、見出しに権威を与える）
  - `.checkout` → 上 `border-top` のすぐ下に `padding-top: 28px` の呼吸を入れる
  - 全画面共通で「**8の倍数（8/16/24/32/48/64）でリズムを刻む**」グリッドに統一する。現状は 6/8/9/10/11/12/13/14/16/18/22/26/28/30/32/36/48 と無秩序。

### P0-04. 罫線が全部同じ「無表情の1px」

- **箇所**: `--line: #E5DAC0` `--line-2: #CFC1A2` を1px solid で全箇所に使用（30箇所以上）
- **問題**:
  和モダンの罫線は「太さ・濃度・長さ・端処理」で表情を作る。仲條正義の資生堂仕事や、原研哉の松屋銀座CIを見ればわかるが、**罫線こそが和の知性を最も雄弁に語る要素**。
  現状は全部 `1px solid var(--line)` で表情がない。「強調する罫線」「囲う罫線」「区切る罫線」が全部同じ太さ・同じ色で打たれているため、視線のヒエラルキーが消失している。
- **修正**:
  4階層の罫線システムを導入する:
  ```css
  --hairline: #E5DAC0;        /* 0.5px - 区切り（行間、表のtd下） */
  --line:     #D4C8AB;        /* 1px   - 標準（カード境界、入力欄） */
  --rule:     #1C1813;        /* 1px - 強調（合計の上、見出し下） */
  --rule-thick: #1C1813;      /* 2px - 締め（最終合計の上のみ） */
  ```
  さらに重要な区切り罫線には**「両端の余白」を入れる**。例:
  ```css
  .totalbar { border-bottom: 1px solid var(--ink); margin: 0 8px; padding-left: 8px; padding-right: 8px; }
  ```
  これだけで「線が紙に沁みている」感が出る。現状は線がカード端まで突き抜けていて、ぶっきらぼう。

### P0-05. 「品書」グリッドが「ボタンの集合」に見える（craftの欠如）

- **箇所**: `.flavor-cell` line 368-410, `.flavor-grid` line 358-367
- **問題**:
  品書きは「メニュー（暖簾の中の世界観）」であるべきなのに、現状は「Excel 4×8セル」にしか見えない。原因:
  1. セル内のレイアウトが「番号上 / 名前下」で、視覚上の重力が下に張り付き、セル内の余白が死んでいる
  2. `::before` の3px色帯が「かき氷の色」を表しているはずだが、上端だけにあるため「色付きヘッダー付きカード」のWebUIテンプレに見える
  3. `flavor-name` が `font-weight: 600` で太すぎる。明朝の魅力は「細さの中の強さ」。
  4. 番号 `01〜31` が `var(--num)` （明朝Mincho）の10pxで色も `--ink-3`、ほぼ目に入らない。「品書きの通し番号」は和モダンの重要な装飾要素なのに、活かしきれていない。
- **修正**:
  ```css
  .flavor-cell {
    padding: 16px 14px 14px;
    min-height: 96px;
    border-right: 1px solid var(--hairline);  /* 縦罫線で「品書」感を出す */
    border-bottom: 1px solid var(--hairline);
  }
  .flavor-cell::before {
    /* 色帯を「左1.5px縦線」に変更 — 短冊の暗示 */
    top: 14px; bottom: 14px; left: 0; width: 1.5px; height: auto;
    opacity: 0.85;
  }
  .flavor-num {
    font-family: var(--num);
    font-size: 11px;
    font-style: italic;          /* 明朝のイタリックで「番付」感 */
    color: var(--ink-2);
    letter-spacing: 0.05em;
    /* 上ではなく右上に配置 */
    position: absolute; top: 12px; right: 12px;
  }
  .flavor-name {
    font-weight: 500;            /* 600 → 500 */
    font-size: 16px;
    letter-spacing: 0.04em;
    line-height: 1.4;
  }
  ```
  グリッドの `gap: 1px` + `background: var(--line)` で罫線を表現する手法は良いが、**外周の罫線が描かれていない**。`.flavor-grid` 自身に `border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);` を追加し、品書全体を一枚の紙として括る。

### P0-06. CTA「御 会 計」のletter-spacing 0.6em は壊れた組版

- **箇所**: `.cta` line 304-316, `letter-spacing: 0.6em; text-indent: 0.6em;`
- **問題**:
  「御 会 計」を `letter-spacing: 0.6em` で間延びさせるのは、**和モダンっぽさを出すために初心者がやる典型的失敗**。プロのデザイナーは「漢字3文字を間延びさせる」ことを絶対しない。代わりに、
  - 文字を大きくする
  - 細く優雅な明朝にする
  - 上下罫線で囲んで「印章」化する
  - サイズで権威を出す
  のいずれかをやる。letter-spacing で水増しするのは紙面で言えば「字間が空いた失敗組版」。
- **修正**:
  ```css
  .cta {
    font-size: 19px;
    font-weight: 400;            /* 600 → 400 細くしてエレガンスを出す */
    letter-spacing: 0.32em;      /* 0.6em → 0.32em */
    text-indent: 0.32em;
    padding: 18px;
    border-top: 1px solid var(--ink);
    border-bottom: 1px solid var(--ink);
    border-left: none; border-right: none;  /* 左右の縦罫線を消し、紙の上の印影に */
    background: var(--ink);
    position: relative;
  }
  /* 端に小さな三角の朱色アクセント（出陣の合図） */
  .cta::after {
    content: ''; position: absolute; right: 18px; top: 50%;
    width: 6px; height: 6px; background: var(--shu);
    transform: translateY(-50%) rotate(45deg);
  }
  ```

### P0-07. 朱色 `#B43A2A` の使い所が雑

- **箇所**: `--shu: #B43A2A` の使用箇所: `.sun-mark`(64), hover時の罫線色(101,224,533) 、 `:active::after` (393), `.change-row .val`(301), `.cta:hover`(317), `.modal-actions .primary:hover`(512)
- **問題**:
  和モダンの朱は「点の色」「印の色」「最重要アクセント1箇所だけの色」。現状は7箇所で使われており、**朱が安売りされている**。Aesopのオレンジ、原研哉のMUJI赤、いずれも「画面に1点だけ」が原則。
  特に致命的なのは:
  - `.change-row .val` （釣銭の数字）が朱色 — **釣銭は強調すべき情報ではない**。客に渡す数字なのでむしろ墨で十分。朱を使うべきは「合計金額」または「会計確定の瞬間」のみ。
  - hover時に「墨 → 朱」で色が変わる — これは「リンクが赤くなる」Web1.0の感覚で、和モダンに反する。和では hover は「**色を変える**のではなく**濃度を上げる/罫線を太らせる**」のが正解。
- **修正**:
  - 朱は **「合計金額の数字」「印章ロゴの中央コア」「会計完了トースト」** の3箇所のみに限定
  - `.totalbar .val` を朱の濃い方（`--shu-2: #8E2C1F`）にする — 客が一番気にする数字を朱に
  - `.change-row .val` を `var(--ink)` に戻す
  - hover時の朱色変更は全廃。代わりに `border-color: var(--ink)` と `background: var(--bg)` で表現
  - `.cta:hover` の朱反転は強烈すぎる。墨 → さらに濃い墨（`#0E0A06`）の方が「凛」として和に合う

### P0-08. 「Asahi Seihyō」「Order」「Shinagaki」の英字並記が安直

- **箇所**: `.brand-en`(73), `.section-en`(129), `.flavor-title .en`(344), `.modal-title-en`(443), `.doc-headline .en`(546)
- **問題**:
  和文の隣に淡色の小さな英字を並記する手法は、2010年代に流行ったあと**現在は「和モダンっぽさを出す手抜き」とみなされる手法**。Aesop、佐藤オオキ、KIGI、Studio Booth、いずれも今この手法は避けている。
  特に「Shinagaki」「Seihyō」のローマ字翻字は、海外向けでもなく日本人向けでもなく、**誰のためにも機能していない装飾**。
  「Order」「Settings」のような英単語並記は、レジを打つ店主にとって完全にノイズ。
- **修正**:
  以下のいずれかに統一:
  - **案A（推奨・潔い）**: 英字並記を全廃。和文だけで自立させる。代わりに見出しの前後に「| 」「品 — 書」のような細い罫線+全角空白の装飾で間を作る。
  - **案B**: 英字を残すが、配置を「見出しの右上に超小型（8px）」または「見出しの**真上**にcaps lock 7px tracking 0.4em」に統一。現状の「右に並べる」を全廃。
  - **案C（最も上級）**: 英字の代わりに「漢数字の一・二・三」または「いろは順（い・ろ・は・に）」で章立てし、純粋に和の語彙だけで構成する。

### P0-09. 「氷」の絵文字（`<span class="glyph">氷</span>`）が完全にAIテンプレ

- **箇所**: line 1237, `.empty-cart .glyph` line 148-154
- **問題**:
  空カート時に「氷」という漢字を1文字、明朝36pxで真ん中に配置 — これは**ChatGPTが「和モダンの空状態UI」と聞いて返す回答そのもの**。深澤直人なら絶対やらない。なぜなら:
  - 「氷」という漢字を巨大に置いた瞬間、それは「文字」ではなく「ロゴ」になる。だがロゴとして練られていない。
  - empty stateは「空である美しさ」を演出するのが理想。文字を1つ置くのは引き算ではなく足し算。
- **修正**:
  ```html
  <div class="empty-cart">
    <div class="empty-mark"></div>
    <p>御品書きより<br>お選びくださいませ</p>
  </div>
  ```
  ```css
  .empty-mark {
    width: 32px; height: 32px;
    margin: 64px auto 24px;
    border: 1px solid var(--line-2);
    border-radius: 50%;
    position: relative;
  }
  .empty-mark::after {
    /* 中央に1px×8pxの極細い線 — 氷柱の暗示。または何も置かない */
    content: ''; position: absolute;
    top: 50%; left: 50%;
    width: 1px; height: 12px;
    background: var(--line-2);
    transform: translate(-50%, -50%);
  }
  ```
  あるいは**究極案**: empty状態は本当に何もテキストを置かない。中央に直径2pxの墨点を1つ置くだけ。これが原研哉の引き算。

---

## P1 — 磨き込み（一流レベルとの差を埋める）

### P1-10. 数字の組版が「-feature-settings: tnum」未指定

- **箇所**: `.item-price`, `.totalbar .val`, `.flavor-priceTag`, `.bd-row`, `.total-card .val` 全て
- **問題**:
  明朝の数字は美しいが、**プロポーショナル数字のままだとレジ画面では揃わない**。`333` と `111` の幅が違って桁が縦に揃わない。会計画面で桁が揃わないのは老舗のレジとしてあり得ない。
- **修正**:
  ```css
  :root { --num: "Hiragino Mincho ProN", Georgia, serif; }
  .item-price, .totalbar .val, .flavor-priceTag, .bd-row, .total-card .val,
  .receive-input, .change-row .val, #ledger-total, #today-total {
    font-feature-settings: "tnum" 1, "lnum" 1;
    font-variant-numeric: tabular-nums lining-nums;
  }
  ```

### P1-11. 「¥」記号の扱いがWeb的すぎる

- **箇所**: 全ての `<span class="yen">¥</span>` （28箇所）
- **問題**:
  「¥」はラテン文字。明朝の和文の中に混ぜると違和感が残る。`opacity: 0.6` で薄くする処理はしているが、**位置とサイズが本数字と揃っていない**。
  また `¥1,234` のように「¥」「数字」「カンマ」が単純並記になっており、組版的に粗い。
- **修正案A（最も正しい）**: 「¥」を廃止し、数字の右に「**円**」（明朝、サイズ0.65、ベースライン揃え）を置く。これが**和の組版の原理に最も忠実**。`御会計 1,234 円` の方が「¥1,234」より遥かに気品がある。
  ```html
  <div class="val"><span id="subtotal">1,234</span><span class="yen-suffix">円</span></div>
  ```
  ```css
  .yen-suffix {
    font-family: var(--serif);
    font-size: 0.55em;
    margin-left: 0.3em;
    letter-spacing: 0.05em;
    color: var(--ink-2);
  }
  ```
- **修正案B（¥を残す場合）**: `font-feature-settings` で「¥」のメトリクスを揃え、`vertical-align: 0.1em` で微調整。`opacity` ではなく `color` で制御。

### P1-12. `box-shadow: 0 0 0 4px rgba(180,58,42,0.08)` のhalo効果が陳腐

- **箇所**: `.sun-mark` line 64
- **問題**:
  「赤い円の周りに薄い赤のグロー」はBootstrap時代のbutton focusスタイル。和モダンに最も合わない。
- **修正**: halo削除。代わりに `.sun-mark` 自体を SVG 化し、墨の極細罫線で外周を囲む（茶碗の口縁のような表現）。

### P1-13. ヘッダーの時計が「YYYY.MM.DD | HH:mm」フォーマット

- **箇所**: line 1158-1160
- **問題**:
  「2026.04.26 | 13:45」は**完全にデジタル時計UI**。和モダンPOSとして筋が通らない。
- **修正**: 「**令和八年 四月二十六日（日）十三時四十五分**」または最低でも「**2026年4月26日（日）13:45**」にする。和暦表示は老舗の権威を示すのに最適。
  さらにフォントは `var(--serif)`、letter-spacing: 0.1em、色は `--ink-2`。

### P1-14. トッピングチップ active時の `background: var(--ink)` がベタ塗り

- **箇所**: `.topping-chip.active` line 200-204
- **問題**:
  墨ベタ塗りに生成り文字 — コントラストは出るがエレガンスがない。「選択された」状態を「**塗り潰し**」で表現するのは西洋UIのデフォルト。
- **修正案**: 選択は「**朱の極細1.5px罫線 + 文字色 var(--ink) のまま + 左下に小さな朱の三角▸印**」で表現。これは「印を捺す」の比喩で、和モダンの選択状態として圧倒的に上品。
  ```css
  .topping-chip.active {
    background: var(--paper);
    border-color: var(--shu);
    color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--shu);  /* 1.5px相当の二重罫 */
  }
  .topping-chip.active::after {
    content: ''; position: absolute; top: 4px; right: 4px;
    width: 5px; height: 5px;
    background: var(--shu);
    transform: rotate(45deg);
  }
  ```

### P1-15. 「+500 / +1,000 / +5,000 / +10,000 / 消去」のクイック金額ボタン

- **箇所**: `.quick-amounts` line 268-292
- **問題**:
  - 「**+**」記号が機械的。和の感覚なら「**五百円・千円・五千円・一万円**」の漢数字表記が圧倒的に正しい。
  - 5列等幅は「Excelっぽい」。間隔をリズムさせるべき。
  - 「消去」だけ明朝で他は数字 — 揃えるか、明確に分離するかどちらか。今は中途半端。
- **修正**:
  - 表記: `五百 / 千 / 五千 / 一万 / 消す`（漢数字 + 円省略）
  - レイアウト: `grid-template-columns: 1fr 1fr 1fr 1fr 0.8fr; gap: 1px; background: var(--line);`（罫線grid同様の手法でセル感を強化）
  - 全ボタンを `var(--serif)`、文字色 `--ink-2`、境界 `--line` で統一

### P1-16. `.toast` の transitionタイミング

- **箇所**: line 821-834, `cubic-bezier(0.22,1,0.36,1)` 0.4s
- **問題**:
  cubic-bezier(0.22,1,0.36,1) は**Material Designのstandard easing**。和モダンに使うと違和感。
- **修正**: `cubic-bezier(0.4, 0.0, 0.2, 1)` ではなく、和の所作に合う「**ゆっくり立ち上がり、すっと止まる**」 `cubic-bezier(0.16, 1, 0.3, 1)` にする。さらに duration を 0.6s に伸ばす。
  色も `var(--ink)` ベタ塗りではなく、`background: var(--paper); color: var(--ink); border: 1px solid var(--ink); box-shadow: 0 1px 0 var(--ink), 0 8px 24px rgba(28,24,19,0.08);` で「紙が浮いた」表現に。

### P1-17. モーダルoverlay が `rgba(28,24,19,0.55)` ベタ

- **箇所**: line 422
- **問題**:
  ベタの暗黒overlayは西洋UI。和モダンなら「**生成りに墨を一滴落とした**」ような淡い濁り。
- **修正**: `background: rgba(250, 245, 233, 0.85); backdrop-filter: blur(4px) saturate(0.9);` （生成り側を強くする半透明 + 軽いブラー）。
  これだけでmodalが「障子の向こう」のような佇まいになる。

### P1-18. ledger画面の `.total-card` が「カード」すぎる

- **箇所**: line 620-647
- **問題**:
  生成り背景に墨罫線で囲った巨大カード — Webテンプレで見た。和モダンなら**カードではなく「**揚げ底の枠**」**。背景色を変えず、上下罫線のみで区切る方が和。
- **修正**:
  ```css
  .total-card {
    background: transparent;
    border: none;
    border-top: 2px solid var(--ink);
    border-bottom: 1px solid var(--line);
    padding: 32px 8px 24px;
  }
  ```
  これで「巻物の見出し」のような佇まいになる。

### P1-19. 売上帳テーブルのhover `tr:hover td { background: var(--bg) }` が全行ベタ

- **箇所**: line 672
- **問題**:
  和の表は「ある行を強調する」より「**罫線そのものに表情を付ける**」のが流儀。hoverで背景全部が色変わるのは、Excelの行ハイライト。
- **修正**: hoverは `border-bottom: 1px solid var(--ink);` （罫線のみが濃くなる）に変更。

### P1-20. settings画面の▲▼アイコンが「文字」のまま

- **箇所**: line 1470-1471
- **問題**:
  Unicode三角形の▲▼を `font-family: var(--num);` で表示している — フォントによってグリフが違う。プロのデザイナーは絶対にUnicode絵文字/記号で UIを作らない。
- **修正**: SVGに置換。
  ```html
  <button class="icon-btn arrow"><svg width="10" height="6" viewBox="0 0 10 6"><path d="M5 0 L10 6 L0 6 Z" fill="currentColor"/></svg></button>
  ```

---

## P2 — 任意（さらに上を目指すなら）

### P2-21. 印章（落款）の不在

- **箇所**: 全画面
- **問題**:
  和モダンPOSなのに「店の印（落款）」がどこにもない。会計完了レシート、トースト、フッターなどに**「朝日製氷 印」の朱の角印を15×15pxで一点だけ置く**だけで品格が劇的に上がる。
- **修正**: SVGの正方形枠（朱）+ 中に「朝日」の篆書風テキスト or 単純な「朝」の一文字を配置。`opacity: 0.85` で控えめに。

### P2-22. 季節感の不在

- **問題**:
  「製氷店」は夏が本番。日付に応じて header の sun-mark の位置/形が微変化する（夏至=最高、冬至=低い）等の**季節の気配**を仕込むと、原研哉的「気配のデザイン」になる。
- **修正**: 任意だが、`Date.now()` から season を計算し、`--season-accent` を切り替える仕組みを実装する。

### P2-23. フッター/縁の処理が皆無

- **箇所**: `.app` line 39-48
- **問題**:
  画面の最下端が `1fr` で終わるだけで、紙としての「下小口」処理がない。和モダンでは「フッターに極細の罫線 + 中央に印 or テキスト」を置くと締まる。
- **修正**: POSメイン画面の最下端に `border-top: 1px solid var(--hairline);` の細帯（高さ24px）を追加し、中央右に「朝日製氷 © 令和八年」をmin font-sizeで配置。

### P2-24. 「品書」グリッドの空セル処理

- **箇所**: line 1187-1195
- **問題**:
  `disabled` の空セルが `--flavor-color: transparent` で残っている。空セルが本当に何もないなら**1pxの極細十字線のみ表示**にすると、和の「無の空間」が成立する。現状は空白のボタンが残るだけで意図不明。
- **修正**: 空セルに `.flavor-cell.empty::before { content: '·'; color: var(--line); display: block; text-align: center; }` で中央点のみ配置、または完全に何も描画しない（borderだけ残す）。

### P2-25. 縦書きの不採用

- **問題**:
  和モダンPOSの最高峰を目指すなら、`.section-label`（御注文）や `.flavor-title .ja`（品書）を **`writing-mode: vertical-rl;`** で縦書きにする選択肢もある。現状は全部横書きで安全寄り。
- **修正**: 任意。ただし「品書」見出しを左サイドに縦書き 22px 明朝で配置すると、メニューが「献立帳」に化ける。リスクあるがハマれば化ける選択肢。

---

## 評価サマリ（5軸）

| 軸 | スコア | コメント |
|---|---|---|
| ビジュアルインパクト | 13/20 | 三色基調と明朝で「方向は和モダン」と即わかるが、初見の引きが弱い。「朝日製氷」の固有性ゼロが致命的 |
| タイポグラフィ | 12/20 | ヒラギノ明朝採用は正解だが、letter-spacing均一化、tnum/palt未指定、漢字とカナのバランス未調整、6/9/10/11/13/14...のサイズ階層が無秩序 |
| レイアウト・構図 | 13/20 | 480px+1fr+grid自体は機能的。しかし余白が均一で「間」がない。視線の焦点が設計されていない |
| カラー・質感 | 14/20 | 生成り×墨×朱の選定は良い。しかし朱の濫用、線の表情の単調さ、グレースケール段階の少なさ（ink/ink-2/ink-3の3段だけ）が問題 |
| インタラクション・動き | 12/20 | hover時の朱色変更がWeb1.0的。toastのeasingがMaterial。pulse animationがCSS3チュートリアル的。和の所作に合わせた細やかな演出が皆無 |
| **総合** | **64/100** | **A-下位（プロのデザイン事務所の入口レベル）** |

---

## 参照すべきサイト/作品

このデザインを「原研哉/深澤直人レベル」に持ち上げるには、以下を心の中の物差しにして全要素を再調整する:

1. **MUJI（無印良品）公式サイト** — 罫線の細さ、余白の取り方、文字の引き算
2. **Aesop store locator / product page** — 単色基調×明朝×罫線の世界基準
3. **虎屋 とらや工房 公式サイト** — 老舗の品格、和暦表記、印章の使い方
4. **資生堂ギャラリー（仲條正義時代）** — 朱と墨の極限の使い分け
5. **nendo.jp（佐藤オオキ）** — シンプルな構造の中に1点だけ仕込まれる遊び
6. **HARA DESIGN INSTITUTE 公式** — 「白」の哲学、空白の設計
7. **D&DEPARTMENT長く続くデザイン** — 製造業ブランドの正しい現代化

---

## 蓄積記録（critic_reviews用）

```
### レビュー #朝日製氷POS-01: mock.html 2026-04-26
- 総合: 64/100 (ランクA-)
- ビジュアル: 13/20
- タイポ: 12/20
- レイアウト: 13/20
- カラー: 14/20
- インタラクション: 12/20
- 良い点:
  - パステル時代から「和モダン基調」への大幅な方向転換に成功
  - ヒラギノ明朝×生成り×墨×朱の語彙選定は正しい
  - 敬語UI（御注文/御会計/御釣銭/品書/売上帳）の世界観統一
  - 罫線grid（gap:1px+背景色）でグリッドを表現する手法は機能的
- 改善点:
  - 「朝日製氷」の固有性が皆無（屋号と視覚言語の断絶）
  - letter-spacing均一化による文字組み崩壊
  - 余白の均一性（間がない）
  - 罫線が全部1px solid同色で表情ゼロ
  - 朱色の濫用（7箇所→3箇所に絞るべき）
  - CTA letter-spacing 0.6em による壊れた組版
  - 「氷」絵文字、英字並記、Web1.0 hover遷移などのAIテンプレ残滓
- 参照すべきサイト:
  - MUJI公式（罫線と余白の引き算）
  - Aesop（単色×明朝×罫線の世界基準）
  - 虎屋（老舗の権威表現）
  - 資生堂ギャラリー仲條時代（朱と墨）
  - nendo.jp（一点豪華主義）
```
