# AUDIT_VISUAL_HEADER — 朝日製氷POS ヘッダー移動レイアウト 視覚審査

**審査者**: Absol（批評家）
**対象**: index.html / style.css（ヘッダー → flavor-panel 内移動構成）
**ユーザー絶対要求**: 「真ん中ぐらいまでは cart-list が見える」
**判定**: **修正必須**
**スコア**: **62 / 100**

---

## 結論（先出し）

ヘッダーを flavor-panel 内に移すアイデア自体は wa-modern として筋が良く、cart-panel が画面上端から立ち上がる構図は朝日製氷の老舗POSとして成立し得る。だが、**ユーザーの絶対要求「真ん中まで cart-list が見える」を物理的に達成できていない**。実数で計算すると cart-list は画面の **38〜380px（43.6%）しか占めず、画面中央 400px に到達していない**。

主犯は **numpad（テンキー）が 194px** を占有していること。3×4 の min-height 44px グリッド + gap + margin の積み上げが、checkout 全体を **404px（画面の 50.5%）** にまで肥大化させている。クイック金額を削った代わりに、numpad 自身の存在感が相対的に巨大化した形。

**「足すなら何かを引く」原則の適用が中途半端**。クイック金額を引いた分、numpad のセル高を縮める or 行数を減らすべきだった。

---

## 実数計算（1280×800 viewport）

### cart-panel 縦積み（cart 列幅 = clamp(340, 34vw=435, 420) = 420px）

| 領域 | 高さ | 累積 |
|---|---|---|
| cart-header（御注文 + 罫線）| 38px | 0 → 38 |
| **cart-list（注文表示）** | **342px (43.6%)** | 38 → **380** |
| checkout::totalbar（御会計）| 48px | 380 → 428 |
| checkout::receive-row（お預かりラベル）| 17px | 428 → 445 |
| checkout::receive-display（金額表示）| 40px | 445 → 485 |
| **checkout::numpad（テンキー）** | **194px** | 485 → **679** |
| checkout::receive-block margin-bottom | 6px | 679 → 685 |
| checkout::change-row（御釣銭）| 36px | 685 → 721 |
| checkout::cta（御 会 計）| 44px | 721 → **765** |
| checkout 余白 + footer | 19px | 765 → 784 |

- **画面中央 400px 時点 → checkout の totalbar 真上**。cart-list は既に終了している。
- **CTA は 765px（画面下端から19px）に visible**。これは合格。
- **cart-list 343px は 1〜2 件の注文なら十分。だが「中央まで見せる」要求は未達。**

### 600×800（狭い viewport）
- cart 列幅は 340px（min clamp）に収縮するが、checkout の縦積み構造は同一。
- CTA は同じく 765px に visible（合格）。
- ただし numpad の 1セル幅 ≈ 100px に縮小し、テンキーがやや窮屈に。

### flavor-panel 縦積み（残り 860px 幅）

| 領域 | 高さ |
|---|---|
| header（ブランド + 時計 + 売上帳/設定）| 52px |
| flavor-header（品書 + 全品¥250）| 47px |
| margin-top + flavor-grid 表示窓 | 685px（うち実表示 675px） |
| footer | 16px |

- flavor-grid コンテンツ総高 = 11行 × 110px + gap 10 + ::after 32 + pb 16 = **1268px**
- 表示窓 675px → スクロール量 593px
- **#31「紅いも」は ::after の 32px 余白付きで完全表示可能 → C1, C2 合格**

---

## 5軸スコア

### 1. ビジュアルインパクト 14/20
- cart-panel が画面上端から立ち上がる構図は、和の縦軸を強調できておりwa-modernとして筋が良い
- ただし checkout が画面の半分以上を占めることで「注文が見える上品なレジ」ではなく「テンキーが主役のレジ」になっている
- 朝日製氷の貫禄は brand mark + serif で保たれているが、密集感が出てしまった

### 2. タイポグラフィ 16/20
- 全数字の tabular-nums + lining-nums 適用、letter-spacing のスクリプト別調整は丁寧
- 「御会計」serif 13px + 数字 26px の階層は明朗
- brand-name 20px は新ヘッダーサイズ（52px）に対して適正
- 減点: brand-name と clock の line-height 整合がやや甘く、目視で 1px ズレる懸念

### 3. レイアウト・構図 9/20（最大の失点）
- **B1 「真ん中まで cart-list」要求未達 → -7**
- A3 左右非対称（cart=full / flavor=header+subheader+grid）は、上端ラインが揃わない欠落感あり -2
- A2 cart-header の「立ち上がりの間」padding 12+8=20 は最低限で、御注文という見出しの重みに対して余韻が足りない -2
- C1, C2 #31 完走は ::after 32px で確保、合格

### 4. カラー・質感 16/20
- 生成り × 墨 × 朱の三色維持は厳格、AIスロップなし
- numpad のセル背景が paper(#FFF) で、cart-panel 背景 bg(#FAF5E9) と1段階明るくなり層が立っている → 高評価
- 減点: numpad が 194px 占有することで、和紙トーンの「余白の美」が破壊されている -4

### 5. インタラクション・動き 7/20
- np-btn の :active 墨反転、np-fn の朱反転は意味のある状態設計、合格
- ただし quick-amounts 削除後、numpad が「お預かり入力」唯一の手段となるため、入力時のフィードバック設計がより重要になったのに、現状の :active 0.08s background 切替だけでは「打鍵感」が弱い
- A1 ヘッダー移動に対するトランジション設計なし（瞬間切り替え）-3
- numpad → CTA への視線誘導アニメーションなし -2
- 御釣銭が numpad の下にあるが、入力に応じて値が変わる際の数値カウントアップ等の演出なし -3

---

## 指摘事項（最低5項目）

### 致命傷

#### 1. 【ユーザー要求未達】cart-list が画面中央に届いていない
- **実測 cart-list: 38〜380px / 画面中央 400px に達せず**
- **対処**: numpad の min-height 44px → 40px に圧縮、gap 4 → 3 に圧縮で約 20px 削減できる。さらに numpad-row 4 → 3 にして「7 8 9 / 4 5 6 / 1 0(消⌫含む)」構成にすれば 50px 削減可能、cart-list を 392px まで拡張、画面中央到達。

#### 2. 【構造】checkout が画面の 50.5% を占有
- 404px / 800px = 50.5%
- 「御注文を見ながら会計する」というレジ本来の重力配分が崩れている
- 対処: receive-display + numpad を 1単位として「お預かり入力エリア」と捉え、totalbar との間に区切り罫線を強める一方、change-row + cta を別ブロックにして visual hierarchy を再構築

#### 3. 【非対称】左右上端の高さ不整合
- cart-panel: 上端 0px から cart-header 直起ち
- flavor-panel: 上端 0px から header 52px → flavor-header
- cart-header の高さ 38px と flavor-panel header 52px が **不一致**
- 対処: cart-header の padding を 12+8 → 18+16 に拡張し、合計 52px に揃えれば「上端ラインの韻律」が成立。「御注文」と「品書/朝日製氷」が同じ高さで響き合う

### 重要

#### 4. 【足し引きの不備】quick-amounts 削除の代償が numpad に転嫁
- 削除した 36px(min-height) + margin 4 = 40px は確かに削減
- だが numpad そのものを縮める努力がない
- 「足すなら何かを引く」原則の適用が表層的。**numpad min-height を 44 → 40px、gap 4 → 3px に詰めるだけで 20px 縮む**

#### 5. 【格】brand 配置の右半分単独配置
- 朝日製氷ロゴが右半分 860px の中で 125px しか占めず、視覚的重量が極端に偏在
- 「ロゴが flavor-panel に従属している」印象を与える
- 老舗POSの貫禄としては、ロゴは画面の主軸（中央〜左寄り）に置くか、もしくはもっと小さく・控えめに置くべき
- **ロゴが右半分だけにあると「ブランドが品書きの装飾」に降格**

### その他指摘

#### 6. 【可視性】画面中央 400px 時点に何があるか
- ちょうど totalbar の真上の罫線(border-bottom 1px ink)
- 「画面の中心線が罫線そのもの」になり、構図上の視線アンカーが弱い
- 中央には **金額や CTA の「重要なもの」を置く**のが POS デザインの原則

#### 7. 【接続】receive-display と numpad の視覚的結合
- receive-display 下に margin-top 6px の間が空き、numpad とが「別物」に見える
- お預かり金額入力という1つのインタラクションを「表示窓+テンキー」として一体化させるべき
- 提案: receive-display の border-bottom を消し、numpad の border-top と連結 → 1つの「電卓」に見せる

#### 8. 【インタラクション】釣銭の動的フィードバック欠如
- numpad 押下 → 御釣銭 即更新だが、数値変化のアニメーションなし
- 「打った瞬間に釣銭が確定する」喜びの演出がない
- 提案: change の値変化時に 200ms の opacity 0.6→1.0 トランジション

#### 9. 【ヘッダー】52px は wa-modern として薄すぎる懸念
- 朝日製氷の serif 20px ロゴが入る器として、52px は機能的最小値
- old-school POS の「重み」を出すなら 64px 欲しい
- ただし cart 側との上端揃えを優先するなら、cart-header を 52px に合わせるのが現実解

#### 10. 【スクロール】flavor-grid ::after 32px の余韻
- 合格範囲だが、和的美意識としては 32px は機能的すぎる
- 48px くらい取って「最後の品の下に呼吸の間」を作ると格が上がる

---

## 過去レビューとの比較

ファイル名から AUDIT_FINAL_ABSOL.md, AUDIT_VISUAL_FINAL.md, AUDIT_VISUAL_NUMPAD.md など複数の前審査が存在。本審査で **「numpad が cart-list 領域を侵食している問題」が新たに浮上した形**。前回までは quick-amounts と numpad が併存しており、これらを削った今、相対的に numpad の縦圧が顕在化した。

ユーザー要求「真ん中まで見える」は **構造的に numpad の縦サイズを下げない限り達成不可能**。次の改修で必達。

---

## 必達修正リスト（優先度順）

1. **numpad min-height 44 → 40px、gap 4 → 3px** → cart-list +20px 拡張
2. **cart-header padding 12+8 → 18+16** → flavor-panel header 52px と上端ライン整合
3. **receive-display と numpad の視覚的連結**（border-top共有 / margin削除）
4. **change の値変化 200ms フェード**追加 → numpad → 釣銭の認知ループを作る
5. **flavor-grid ::after 32 → 48px** → 和的余韻

修正後の cart-list 見込み: 38〜400px (50%) → **画面中央到達、ユーザー要求満たす**

---

## 出荷可否

**修正必須**

理由: ユーザーが明示した「真ん中まで cart-list が見える」要求を実数で未達成。1発100点要求で妥協ゼロの審査基準では、絶対要求未達はそれ単独で出荷不可。修正後再審査要。
