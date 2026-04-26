# 朝日製氷POS 31味カード背景画像 — 生成手順書

このフォルダの `generate_images.py` を実行すると、AI（OpenAI DALL-E 3）が31味分のかき氷画像を自動で作って `images/` に保存します。

POS（タブレット注文画面）の各味カードの背景に表示する用の画像です。
和モダン・真俯瞰・余白広めの統一スタイル（コードネーム `kinari-zen-overhead`）で、31味すべてが「同じシリーズ」に見えるよう設計されています。

---

## 必要なもの

| 項目 | 内容 |
|---|---|
| **OpenAI API Key** | OpenAIのアカウントとAPIキー。1味あたり約6円（合計約185円）かかります |
| **インターネット接続** | 自宅のWi-Fiで十分。スマホテザリングでも可（生成中は切らないこと） |
| **Python 3.9以上** | macOSなら標準搭載済み。ターミナルで `python3 --version` で確認 |
| **作業時間** | セットアップ込みで初回20分程度。2回目以降は5分 |

---

## OpenAI API Keyの取得方法

1. ブラウザで https://platform.openai.com/api-keys を開く
2. OpenAIアカウントにログイン（無ければ無料登録）
3. 「**Create new secret key**」をクリック
4. 名前を「kajigoria-pos」など適当に入れて作成
5. 表示された `sk-...` で始まる長い文字列を**メモ帳などにコピー**（一度閉じると二度と表示されません）
6. お支払い情報の登録が必要です（クレジットカード）。最低$5入金しておけば31味全部生成できます

---

## セットアップ（最初の1回だけ）

ターミナル（Mac標準アプリ「ターミナル」）を開いて、以下を1行ずつコピペして実行してください。

```bash
cd "/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos"
pip3 install openai pillow requests
```

最後の行で「Successfully installed ...」と出れば成功です。

---

## 実行コマンド（毎回これだけ）

```bash
cd "/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos"
export OPENAI_API_KEY="sk-ここに自分のキーを貼り付け"
python3 generate_images.py
```

3行目を実行すると、進捗バーが表示されながら31枚を順番に生成していきます（約6〜10分）。
途中でターミナルを閉じないでください。最後に「全味の生成が完了しました」と出れば終わりです。

---

## 完了後の確認方法（30秒チェック）

`images/` フォルダを開いて、31枚を一気に並べて見てください（Finderで「アイコン表示」推奨）。
**1つでもNGがあれば全味やり直し**してください（部分修正は統一感を壊します）。

### ❶ 角度チェック
- 31枚すべてが**完全な真俯瞰**になっていますか？
- 皿のフチが**真円**に見えればOK。少しでも楕円・斜めから撮ったように見えたらNG

### ❷ 背景チェック
- 31枚すべての背景が**生成り（薄ベージュ）#FAF5E9 単色**ですか？
- 木目・グレー・真っ白が混ざっていればNG
- 並べた時に、背景が**1枚の和紙のように繋がって見える**のが正解

### ❸ 余白チェック
- 31枚すべてで**画面右1/3に皿・左2/3が空**になっていますか？
- 皿が真ん中にあったり左寄りだったらNG（POS画面の文字と重なります）

---

## やり直し方

### 全部やり直したい場合
```bash
cd "/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos"
python3 generate_images.py --force
```
`--force` を付けると既存の画像を上書きします。再びお金（約185円）がかかります。

### 一部の味だけやり直したい場合
1. やり直したい画像（例: `images/01-ichigo.png`）をゴミ箱に入れる
2. 通常通り `python3 generate_images.py` を実行（削除した分だけ再生成されます）

または、IDで指定して1味だけ生成：
```bash
python3 generate_images.py --only 01   # 01-いちご だけ生成
```

### プロンプト（生成指示文）を変えたい場合
`prompts.json` をテキストエディタで開いて、該当する味の `prompt` 欄を直接書き換えてから上記コマンドを実行してください。
全味の元になる骨格は `master_template` 欄にあります。

---

## コスト目安

| 項目 | 単価 | 合計 |
|---|---|---|
| DALL-E 3（standard 1024×1024） | $0.04 / 枚 | 31枚 = **$1.24（約185円）** |
| `--force` で全部作り直す | 同上 | 1回ごとに約185円 |
| `--only 01` で1味だけ | $0.04 | 約6円 |

予算は5ドル（約750円）入金しておけば、4回作り直しても余裕です。

---

## 所要時間目安

- 初回セットアップ込み: **約20分**
- 2回目以降の生成のみ: **約6〜10分**（API応答 + 5秒間隔のレート制限）
- やり直し1味のみ: **約30秒**

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `OPENAI_API_KEY が設定されていません` | `export OPENAI_API_KEY="sk-..."` を再実行 |
| `pip3: command not found` | `python3 -m pip install openai pillow requests` を試す |
| 途中で止まった / 一部失敗 | 普通に再実行すれば未生成分だけ補完されます |
| 画像の色が全部同じに見える | RESEARCH.mdの仕様通り「彩度上限60%」のため。実際は色帯の `--flavor-color` が主役なので問題なし |
| 文字が画像に入っている | DALL-E 3が誤って文字を入れた事故。その味だけ削除して再生成 |

---

## PWA組み込みヒント（技術担当向け）

画像生成完了後、POSアプリ（PWA）に背景反映するには、以下のCSSとJSを追加します。

**`style.css`**（追記）
```css
.flavor-cell {
  background-image: var(--flavor-bg, none);
  background-size: cover;
  background-position: right center;
  background-repeat: no-repeat;
}
```

**`app.js`** のFLAVORS配列にfilenameを紐付け、レンダリング時：
```js
cell.style.setProperty('--flavor-bg', f.filename ? `url('./images/${f.filename}')` : 'none');
```

filenameは `prompts.json` の各flavor.filename（例: `01-ichigo.png`）と一致させます。

> **注記**: この組み込み実装は別エージェント（Gardevoir）が担当します。本READMEは画像の生成までを対象とし、PWA本体への統合は本書の範囲外です。

---

## ファイル一覧

```
kajigoria-pos/
├── RESEARCH.md          ← 画像仕様の根拠（読み物）
├── prompts.json         ← 31味のプロンプト確定版
├── generate_images.py   ← 自動生成スクリプト
├── README_IMAGES.md     ← この手順書
└── images/              ← 生成された画像が入る（実行後に作成される）
    ├── 01-ichigo.png
    ├── 02-melon.png
    ├── ...
    └── 31-beni-imo.png
```
