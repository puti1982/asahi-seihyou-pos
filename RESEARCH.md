# RESEARCH.md — 朝日製氷POS「31味カード背景画像」ビジュアルリサーチ

調査日: 2026-04-26
調査範囲: 国内外ハイエンドかき氷店5軒 + 和モダン総合ブランド5軒
目的: mock.html の `flavor-cell`（4列×8行グリッド・1セル約260×85px・最低高70px）の背景に挿入する31種統一画像の生成仕様を確定する。

---

## 0. 既存デザインからの制約（mock.htmlから抽出）

| 項目 | 値 | 出典 |
|---|---|---|
| ベース背景 | `#FAF5E9`（生成り） | `--bg` |
| 副背景 | `#F4EDDB` | `--bg-2` |
| 罫線 | `#E5DAC0`（細）/ `#CFC1A2`（太） | `--line` / `--line-2` |
| 主インク | `#1C1813`（墨）／副 `#4A4239` | `--ink` / `--ink-2` |
| アクセント | `#B43A2A`（朱）／藍 `#1F3A5F`／抹茶 `#5F7142` | `--shu`/`--ai`/`--matcha` |
| 文字 | ヒラギノ明朝 ProN（見出し）／ヒラギノ角ゴ ProN（本文） | `--serif` / `--sans` |
| セル横長比 | 約 **3:1**（260×85px） | `.flavor-grid` repeat(4,1fr) |
| セル上縁 | 3pxの色帯（`--flavor-color` 95%不透明） | `.flavor-cell::before` |
| セル内文字 | 番号（明朝・大）＋味名（明朝・600）＋価格 | `.flavor-num`/`.flavor-name` |

**重要な含意**:
- 画像は**3:1の極端な横長**で生成する必要がある（一般的な3:2/4:3では情報が圧縮されすぎる）。または、**正方形1:1で生成して `background-size: cover; background-position: right center;` で右側だけ見せる**運用が現実的。**後者を採用**する（理由: 1:1なら被写体面積比を最適化でき、生成AIの構図安定性が高く、将来の用途流用が効く）。
- セル上に**3pxの色帯**が乗る → 画像上端は装飾の干渉前提で**上端15%は背景色のベタ余白**を確保する仕様にする。
- セル左半分（番号＋味名）にテキストが乗る → 画像内の被写体は**右側1/3に配置**、左2/3は近似生成り単色のソフトグラデーションに留める（テキスト可読性をCSS側のオーバーレイなしで担保）。
- アクセシビリティ: 画像オン状態でも `--ink: #1C1813` 文字のコントラスト比 4.5以上を維持するため、画像の左側70%領域は**輝度L* > 88**（ほぼ生成り）に制限する。

---

## ① 参照ベンチマーク：ビジュアル文法の抽出

### A. ハイエンドかき氷店

#### A1. 埜庵（鵠沼海岸）— [@kohori_noan](https://www.instagram.com/kohori_noan/) / [公式](https://kohori-noan.com/)
- カメラ: **やや真俯瞰寄りの45度**（器の白が映え、氷山がそびえ立つ陰影を残す）
- 光: **自然光＋窓際**。直射ではなく障子越しのソフト。シャドウは長く出す
- 背景: 木目のテーブル、または**白い和紙風マット**。情報量を意図的に減らす
- 被写体面積比: 約 **55-65%**（器の高さで占有）
- 彩度: 中庸（シロップの色は出しつつ、背景は彩度ゼロ）
- 構図: **中央配置・1点豪華主義**
- ★抽出文法: 「**器（白磁/ガラス）の存在感 + 木のテクスチャ + 自然光の長い影**」

#### A2. ひみつ堂（日暮里）— [@himitsudo132](https://www.instagram.com/himitsudo132/) / [公式](http://himitsudo.com/)
- カメラ: **水平～やや見上げ**（氷山の高さを誇示）
- 光: 直射に近い強めの光、ハイコントラスト
- 背景: 店舗内装（昭和レトロ）。情報量多め
- 被写体面積比: 約 **70%**（被写体ドン）
- 彩度: 高い（果実そのものを盛るため）
- ★抽出文法: 「**情緒的・ライブ感重視**」→ 朝日製氷の wa-modern には**不適合**。トーンが合わない

#### A3. yelo（六本木）— [Yelp](https://www.yelp.com/biz/イエロ-港区) / [公式情報](https://www.timeout.com/tokyo/restaurants/kakigori-cafe-bar-yelo)
- カメラ: 真俯瞰または45度
- 光: スタジオ光、均質
- 背景: **コンクリート/黒石/白マット**などモード寄り
- 被写体面積比: 50-60%
- 彩度: 中。トッピング（オレオ/ポップロックス）の色が映える設計
- ★抽出文法: 「**洋スタジオ**」→ 和モダン軸では参考程度

### B. 和モダン総合ブランド（撮影文法の主参照源）

#### B1. HIGASHIYA Ginza — [公式](https://www.higashiya.com/) / [Instagram](https://www.instagram.com/higashiya_higashiya/)
- カメラ: **真俯瞰** または **水平やや低め**（一口菓子の高さを見せる）
- 光: **北窓光・左45度・ソフト**。ハードシャドウなし
- 背景: **和紙の質感がうっすら見える生成り～アイボリー単色**。木目併用も
- 被写体面積比: **35-45%**（余白多め）
- 彩度: **低め**（果実色は残しつつ、背景は完全モノトーン）
- 構図: **中央配置 or 黄金比オフセンター**
- 文字・装飾: 一切なし（小さなロゴが入る場合のみ右下角）
- ★ **朝日製氷POSの主参照ベンチマーク**

#### B2. 虎屋／とらや — [Instagram @toraya.confectionery](https://www.instagram.com/toraya.confectionery/)
- カメラ: 真俯瞰95%、水平5%
- 光: **拡散光・全方向均質**、影は薄く短い
- 背景: **和紙単色 or 黒漆塗りの盆**
- 被写体面積比: **30-40%**（余白の美）
- 彩度: 低～中
- ★抽出文法: 「**拡散光・余白広め・羊羹の艶**」

#### B3. nendo（プロダクトデザイン）— [Encyclopedia of Design](https://encyclopedia.design/2023/08/12/nendo-japanese-design-company/)
- 真俯瞰または完全水平。**陰影最小**
- 背景: **完全な単色or超ライトグレー**
- 被写体面積比: 25-40%（ma=間 を強調）
- ★抽出文法: 「**Ma（間）・拡散光・無重力感**」

#### B4. MUJI — 公式商品ページ
- 真俯瞰・拡散光・**白ホリゾント**
- 影はあるがエッジが極めて柔らかい
- ★抽出文法: 「**説明的・記録的**」→ 朝日製氷には少しドライすぎる。HIGASHIYAの方が適合

#### B5. 茶寮都路里 — [Instagram](https://www.instagram.com/giontsujiri_saryotsujiri/)
- 45度・店舗内装込み・抹茶緑が主役
- ★抽出文法: 「**素材主役・シングルカラーフォーカス**」→ 31味の色違いを統一する手法として応用可

### C. 結論：朝日製氷の採用文法

**HIGASHIYA Ginza × 虎屋 × nendo の三者交集合**を採用する。

具体的には：
1. **真俯瞰**（角度ブレ排除のため0度=完全垂直に固定）
2. **北窓光・左45度・ソフト**（影は短く・薄く・エッジ拡散）
3. **生成り単色背景（#FAF5E9）**＋ごく微細な和紙テクスチャ
4. **被写体面積比 30-35%**（mock.htmlの右1/3配置と整合）
5. **彩度上限60%**（カードの`--flavor-color`色帯で十分にカラフル、画像側は抑える）

---

## ② 31味統一のための「絶対ルール」（全味共通仕様）

### 仕様シート（生成時に1ピクセルも逸脱不可）

| 項目 | 確定値 | 理由 |
|---|---|---|
| **カメラアングル** | **真俯瞰（top-down, 90°垂直）** | 31味で角度がブレるとAI臭の最大要因。完全固定で統一感最大化 |
| **被写体距離** | **中距離（被写体が画面の30-35%を占める）** | 余白でMaを作る。HIGASHIYA文法 |
| **光源** | **北窓光、左上45°、ソフトボックス相当の拡散光、影の濃度20%以下** | 自然光の和を演出しつつ、影でブレない |
| **背景色** | **生成り単色 #FAF5E9（mock.htmlの`--bg`と完全一致）** | カード境界が消え、背景が自然にカードに溶ける |
| **背景テクスチャ** | **和紙の繊維感を5%だけ重ねる（grain noise 5%）** | ベタ単色だとデジタル臭。和紙感で wa-modern に寄せる |
| **構図** | **画面右側1/3エリアに被写体中央配置、左2/3は背景余白** | mock.html左側のテキスト（番号・味名）と干渉しない |
| **被写体** | **白磁の小皿 or ガラス猪口に盛られた色つきかき氷の山（高さ低め=皿から3-4cm程度の小盛り）** | 31味の差を「色」で見せ、形は統一 |
| **質感** | **マットフィルム調、被写界深度浅め、被写体エッジは軽くソフト** | 報道写真感を消し、絵画的に |
| **彩度上限** | **彩度60%（HSL基準）／彩度100%の原色は禁止** | カラフルすぎると31枚並びでカオス。色帯`--flavor-color`に主役を譲る |
| **コントラスト** | **中庸（白点95%、黒点20%、中央1.0gamma）** | 全カード並べた時のリズム維持 |
| **縦横比** | **1:1（1024×1024px）で生成 → CSS側で `background-size: cover; background-position: right center;` で右側だけ表示** | 生成AIの構図安定性確保＋将来の流用性 |
| **文字・装飾** | **一切なし**（皿の模様、ロゴ、銘も禁止） | テキストは全てHTMLが担当 |
| **小道具** | **皿のみ。スプーン・葉・果実の実物配置は禁止** | 31味で小道具がバラつくとAI臭の温床 |
| **スタイル名** | **kinari-zen-overhead（生成り禅・真俯瞰）** | チーム内共通呼称 |

### NGリスト（31味で必ず排除）

- ❌ 木のテーブル背景（HIGASHIYAは使うが、31枚並ぶと木目方向が揃わずノイズになる）
- ❌ 自然光の窓枠が映り込む構図
- ❌ 手・人物・店内・実店舗環境の写り込み
- ❌ 葉・花・氷塊・果実カット等の装飾小物
- ❌ レンズフレア、ボケ前景、グレイン以外のフィルター
- ❌ 文字、ロゴ、銘、シール、メニュー番号
- ❌ 黒・濃紺の器（背景生成りに対しコントラストが立ちすぎる）
- ❌ 真俯瞰以外の角度（45度や水平は禁止）

---

## ③ プロンプトテンプレート骨格

### DALL-E 3 / Midjourney 共通の英語マスタープロンプト

`[FLAVOR_EN]` と `[SYRUP_COLOR_HEX]` の2箇所だけ差し替え。それ以外は1文字も変更しない。

```
Top-down overhead studio still life photograph of a small mound of [FLAVOR_EN] kakigori
(Japanese shaved ice) served in a plain matte white porcelain shallow saucer, syrup color
matching [SYRUP_COLOR_HEX], camera perfectly perpendicular at 90 degrees vertical,
soft diffused north window light from upper-left at 45 degrees, drop shadow density 20 percent,
background is solid kinari off-white #FAF5E9 washi paper with subtle 5 percent fiber grain,
subject occupies right one-third of frame and is centered vertically, left two-thirds is
empty kinari background with no objects, low saturation 60 percent maximum, matte film
look, shallow depth of field with soft subject edges, no text, no logo, no leaves, no fruit
slices, no spoons, no hands, no decorations, no patterns on the saucer, no other props,
museum-grade minimal Japanese wa-modern aesthetic referencing HIGASHIYA Ginza and Toraya,
1:1 square aspect ratio, ultra clean composition, the only color is the syrup color
```

### Midjourney用（v7想定）

```
top-down overhead still life of [FLAVOR_EN] kakigori on plain matte white porcelain shallow
saucer, syrup [SYRUP_COLOR_HEX], 90 degree vertical camera, soft north window light from
upper-left 45 deg, drop shadow 20 percent, kinari off-white #FAF5E9 washi paper background
with 5 percent fiber grain, subject in right third, left two thirds empty, max saturation
60 percent, matte film, shallow DoF, no text no logo no props no leaves no fruit no spoon
no hands no plate pattern, HIGASHIYA Toraya wa-modern minimalism --ar 1:1 --style raw
--stylize 150 --chaos 0
```

**重要**: 31味すべてで `--sref [固定SREF番号]` を使う。最初に「いちご」で生成した1枚をMidjourneyにアップロード→そのURLを `--sref` で全味流用すると統一感が劇的に向上する（Midjourney公式推奨手法）。

### 31味の `[FLAVOR_EN]` と `[SYRUP_COLOR_HEX]` 対応表

| # | 和名 | FLAVOR_EN | SYRUP_COLOR_HEX |
|---|---|---|---|
| 01 | いちご | strawberry | #D67285 |
| 02 | メロン | melon | #9DBE7A |
| 03 | レモン | lemon | #E5C44A |
| 04 | ブルーハワイ | blue hawaii (cyan blue) | #5DA9C8 |
| 05 | ピーチ | peach | #E8A993 |
| 06 | グレープ | grape | #7B5A95 |
| 07 | マンゴー | mango | #E2A148 |
| 08 | コーラ | cola (dark caramel brown) | #5C3A20 |
| 09 | ラムネ | ramune (pale sky blue) | #A8D5E8 |
| 10 | みぞれ | mizore (translucent off-white sugar syrup) | #D9D0BD |
| 11 | 青リンゴ | green apple | #A6C25C |
| 12 | 真っ赤なリンゴ | red apple | #B83A3A |
| 13 | スイカ | watermelon | #C84545 |
| 14 | オレンジ | orange | #D88B47 |
| 15 | マスカット | muscat green grape | #92AC4A |
| 16 | ダブルベリー | double berry (deep wine red) | #7A325E |
| 17 | 日向夏 | hyuganatsu citrus (golden yellow) | #E5BE48 |
| 18 | ソルティーライチ | salty lychee (pale dusty pink) | #D6BCC8 |
| 19 | エメラルドパイン | emerald pineapple (teal green) | #4E9A85 |
| 20 | カシスオレンジ | cassis orange (deep magenta) | #9A3D5C |
| 21 | ヨーグルト | yogurt (warm cream) | #E8E0CC |
| 22 | 抹茶 | matcha green tea | #5F7142 |
| 23 | コーヒー | coffee (espresso brown) | #4A2E1E |
| 24 | 紅茶 | black tea (amber brown) | #894528 |
| 25 | ドラキュラ | dracula (almost black with crimson hint) | #2E1F2E |
| 26 | エイリアン | alien (chartreuse neon green muted) | #6FAA52 |
| 27 | プリンセス | princess (rose pink) | #D688AC |
| 28 | 王子様 | prince (royal blue) | #4868A8 |
| 29 | パワーエナジー | power energy (vivid red) | #B83A3A |
| 30 | イナズマジンジャー | thunder ginger (golden amber) | #D6A832 |
| 31 | 紅いも | beni-imo purple sweet potato | #5C2D5E |

**ファネル味（ドラキュラ/エイリアン/プリンセス/王子様等）について**: ファンタジー名前であっても、皿・氷の山・光・背景・構図は**他の30味と完全に同じ**にする。色だけ変える。これにより「ふざけた味も真面目に出す」朝日製氷のキャラが立つ。

---

## ④ 合格基準（30秒チェック）

スタッフがiPad画面に並んだ31枚を見て30秒で判定する3項目。**1つでもNGがあれば全味再生成**（部分修正は禁止。統一感を壊すリスクが高い）。

### チェックリスト（印刷推奨）

- [ ] **❶ 角度チェック**: 31枚すべてが**完全な真俯瞰**になっているか？ 1枚でも斜めや見下ろしがあれば即NG。皿のフチが**真円**に見えるか確認
- [ ] **❷ 背景チェック**: 31枚すべての背景が**生成り #FAF5E9 単色**か？ 木目・グレー・白が混ざっていればNG。31枚を並べた時、背景が**1枚の和紙のように繋がって見える**か
- [ ] **❸ 余白チェック**: 31枚すべてで**画面右1/3に皿・左2/3が空**になっているか？ 中央配置や左寄りがあれば即NG。POS画面のテキストと衝突する

**判定の運用**:
- 5秒×31枚で全項目チェック可能
- 1枚でもNG → そのバッチは破棄、プロンプト見直し→再生成
- 「だいたい合ってる」は許容しない。AI臭の最大要因は「だいたい」の許容
- スマホで31枚を1画面に4×8グリッドで並べて目視（最終確認はPOSモック上で実機確認）

---

## ⑤ オフライン日本語フォント保証

### 結論

**iPadOS 17 / 18 / 19 すべてに `Hiragino Mincho ProN` と `Hiragino Sans / Hiragino Kaku Gothic ProN` はOSプリインストール済み**。ネット接続なし・追加ダウンロード不要で確実に使用できる。出典: [Hiragino - Wikipedia](https://en.wikipedia.org/wiki/Hiragino) および [Apple Developer フォント仕様](https://developer.apple.com/fonts/) 系の公式資料。

iOS/iPadOSには Hiragino 系フォントが標準搭載されており、Web/アプリ両方で `font-family` 指定だけで利用可能。

### 検証済みのウェイト

| フォント | 利用可能ウェイト | 用途 |
|---|---|---|
| Hiragino Mincho ProN | W3 / W6 | 見出し・ブランド名・数字（明朝） |
| Hiragino Sans | W0/W1/W2/W3/W4/W5/W6/W7/W8/W9 | 本文（角ゴ） |
| Hiragino Kaku Gothic ProN | W3 / W6 | 旧命名互換（同じ字形） |

### 確定フォールバックチェーン（mock.htmlに既に記載・正しい）

```css
--serif: "Hiragino Mincho ProN", "YuMincho", "Yu Mincho", serif;
--sans:  "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif;
--num:   "Hiragino Mincho ProN", Georgia, "Times New Roman", serif;
```

**この順序で問題なし**。理由:
1. 1番手 `Hiragino Mincho ProN` / `Hiragino Sans` が iPadOS 標準で必ずヒット → 99%のケースでここで決まる
2. 2番手 `YuMincho` / `Hiragino Kaku Gothic ProN` は macOS互換のため（iPadからエクスポート時）
3. 3番手 `Yu Gothic` / `Georgia` は Windows ブラウザでの確認用フォールバック
4. 最終 `serif` / `sans-serif` / `system-ui` で最低限の崩壊回避

### 追加推奨（リリース前に1度だけ実施）

機内モードのiPadで `mock.html` を開き、見出しが**明朝で表示されているか**を目視確認。`Times New Roman` 風の英字セリフになっていたら `Hiragino Mincho ProN` の指定文字列が間違っている可能性があるため再確認。

---

## 採用すべき統一スタイル名（1行）

**`kinari-zen-overhead` — 生成り和紙背景・真俯瞰90度・北窓ソフト光・被写体右1/3配置・彩度60%上限・装飾ゼロの和モダン静物画法（HIGASHIYA Ginza × 虎屋 × nendo の交集合）**

## 合格基準3項目（30秒チェック・1つでもNGなら全味再生成）

1. **❶ 角度**: 31枚すべて真俯瞰（皿のフチが真円）。斜め・見下ろし1枚でもあれば即NG
2. **❷ 背景**: 31枚すべての背景が生成り #FAF5E9 単色。並べた時に和紙1枚のように繋がる
3. **❸ 余白**: 31枚すべてで皿が画面右1/3に配置・左2/3が空（POSのテキストと干渉しない）

---

## 出典

- [かき氷の店 埜庵 公式](https://kohori-noan.com/) / [Instagram @kohori_noan](https://www.instagram.com/kohori_noan/?hl=ja)
- [ひみつ堂 公式](http://himitsudo.com/) / [Instagram @himitsudo132](https://www.instagram.com/himitsudo132/)
- [Yelo Roppongi - Time Out Tokyo](https://www.timeout.com/tokyo/restaurants/kakigori-cafe-bar-yelo) / [Yelp](https://www.yelp.com/biz/イエロ-港区)
- [HIGASHIYA 公式](https://www.higashiya.com/) / [HIGASHIYA GINZA](https://www.higashiya.com/shop/ginza/) / [Instagram @higashiya_higashiya](https://www.instagram.com/higashiya_higashiya/)
- [株式会社 虎屋](https://www.toraya-group.co.jp/products/) / [Instagram @toraya.confectionery](https://www.instagram.com/toraya.confectionery/)
- [Nendo: The Epitome of Japanese Minimalist Design - Encyclopedia of Design](https://encyclopedia.design/2023/08/12/nendo-japanese-design-company/)
- [Nendo Wikipedia](https://en.wikipedia.org/wiki/Nendo_(design_firm))
- [茶寮都路里 公式Instagram](https://www.instagram.com/giontsujiri_saryotsujiri/)
- [Hiragino - Wikipedia](https://en.wikipedia.org/wiki/Hiragino)
- [Hiragino Mincho ProN - Adobe Fonts](https://fonts.adobe.com/fonts/hiragino-mincho-pron)
- [Midjourney Style Reference 公式](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference)
- [Midjourney --sref for Photographers - Midlibrary](https://midlibrary.io/midguide/midjourney-style-reference-sref-for-photographers)
- [DALL-E 3 Photorealism Prompt Guide](https://freeaipromptmaker.com/blog/2025-11-28-dall-e-3-photorealism-prompt-guide)
- [DALL·E 3 Prompts for Consistent Styles - Data Studios](https://www.datastudios.org/post/dall-e-3-prompts-for-blog-images-consistent-styles-quality-and-workflow)
