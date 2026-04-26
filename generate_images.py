#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_images.py — 朝日製氷POS 31味カード背景画像 自動生成スクリプト

【使用方法】
    cd "/Volumes/Extreme SSD/自動自走エージェント/projects/kajigoria-pos"
    export OPENAI_API_KEY="sk-..."
    python3 generate_images.py            # 既存スキップで生成
    python3 generate_images.py --force    # 全画像を再生成（上書き）
    python3 generate_images.py --only 01  # 1味だけ生成（デバッグ用、IDで指定）

【コスト目安】
    DALL-E 3 standard 1024x1024 = $0.04 / 枚
    31味 全生成 = $1.24 ≒ 約185円（為替150円/USD想定）

【所要時間目安】
    1枚 約7-15秒（API応答 + ダウンロード）+ 5秒インターバル
    31味 全生成 = 約 6-10分

【リトライ方法】
    途中で失敗した味は images/ に保存されないため、再実行すれば未生成分のみ補完される。
    特定の味だけ作り直したい場合: images/01-ichigo.png を削除してから再実行、
    または --only 01 を指定。

【依存パッケージ】
    pip install openai>=1.0 pillow requests

【出力】
    images/01-ichigo.png 〜 images/31-beni-imo.png（合計31ファイル）
    1024x1024 PNG / standard quality / RGB
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: requests がインストールされていません。実行: pip install requests", file=sys.stderr)
    sys.exit(1)

try:
    from PIL import Image
    _ = Image  # 利用可能性チェック用
except ImportError:
    print("ERROR: pillow がインストールされていません。実行: pip install pillow", file=sys.stderr)
    sys.exit(1)

try:
    from openai import OpenAI
except ImportError:
    print("ERROR: openai がインストールされていません。実行: pip install openai>=1.0", file=sys.stderr)
    sys.exit(1)


# ===== 定数 =====
SCRIPT_DIR = Path(__file__).resolve().parent
PROMPTS_PATH = SCRIPT_DIR / "prompts.json"
IMAGES_DIR = SCRIPT_DIR / "images"
RATE_LIMIT_INTERVAL_SEC = 5
DOWNLOAD_TIMEOUT_SEC = 60
MAX_DOWNLOAD_RETRIES = 3


def load_prompts():
    if not PROMPTS_PATH.exists():
        print(f"ERROR: prompts.json が見つかりません: {PROMPTS_PATH}", file=sys.stderr)
        sys.exit(1)
    with PROMPTS_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if "flavors" not in data or not isinstance(data["flavors"], list):
        print("ERROR: prompts.json に flavors[] が存在しません", file=sys.stderr)
        sys.exit(1)
    return data


def download_image(url: str, dest: Path) -> bool:
    """DALL-E 3 が返す一時URLをダウンロードしてローカル保存。リトライ最大3回。"""
    for attempt in range(1, MAX_DOWNLOAD_RETRIES + 1):
        try:
            resp = requests.get(url, timeout=DOWNLOAD_TIMEOUT_SEC)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
            return True
        except Exception as e:
            if attempt == MAX_DOWNLOAD_RETRIES:
                print(f"  ダウンロード失敗（{MAX_DOWNLOAD_RETRIES}回試行）: {e}", file=sys.stderr)
                return False
            print(f"  ダウンロード再試行 {attempt}/{MAX_DOWNLOAD_RETRIES}: {e}")
            time.sleep(2)
    return False


def generate_one(client: OpenAI, flavor: dict, force: bool) -> tuple[str, str]:
    """1味分の生成。戻り値: (status, message)。status は 'success' / 'skip' / 'fail'"""
    fid = flavor.get("id", "??")
    name_ja = flavor.get("name_ja", "?")
    filename = flavor.get("filename")
    prompt = flavor.get("prompt")

    if not filename or not prompt:
        return ("fail", f"[{fid}] {name_ja}: filename または prompt が空")

    out_path = IMAGES_DIR / filename

    if out_path.exists() and not force:
        return ("skip", f"[{fid}] {name_ja}: 既存スキップ ({filename})")

    try:
        result = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
            response_format="url",
        )
        image_url = result.data[0].url
    except Exception as e:
        return ("fail", f"[{fid}] {name_ja}: API呼び出し失敗 — {e}")

    if not image_url:
        return ("fail", f"[{fid}] {name_ja}: APIから画像URLが返されませんでした")

    if not download_image(image_url, out_path):
        return ("fail", f"[{fid}] {name_ja}: 画像ダウンロード失敗")

    return ("success", f"[{fid}] {name_ja}: 保存完了 ({filename})")


def progress_bar(current: int, total: int, width: int = 30) -> str:
    pct = current / total if total else 0
    filled = int(width * pct)
    bar = "#" * filled + "-" * (width - filled)
    return f"[{bar}] {current}/{total} ({pct*100:.0f}%)"


def main():
    parser = argparse.ArgumentParser(description="朝日製氷POS 31味カード背景画像 自動生成")
    parser.add_argument("--force", action="store_true", help="既存ファイルを上書きする")
    parser.add_argument("--only", type=str, default=None, help="特定の味IDだけ生成（例: 01）")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: 環境変数 OPENAI_API_KEY が設定されていません。", file=sys.stderr)
        print("       export OPENAI_API_KEY='sk-...' を実行してから再度お試しください。", file=sys.stderr)
        sys.exit(1)

    data = load_prompts()
    flavors = data["flavors"]

    if args.only:
        flavors = [f for f in flavors if f.get("id") == args.only]
        if not flavors:
            print(f"ERROR: ID '{args.only}' に該当する味が見つかりません。", file=sys.stderr)
            sys.exit(1)

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    client = OpenAI(api_key=api_key)

    total = len(flavors)
    success_list, skip_list, fail_list = [], [], []

    print("=" * 60)
    print(f"朝日製氷POS 画像生成 開始")
    print(f"対象: {total}味 / モード: {'force(上書き)' if args.force else 'skip(既存温存)'}")
    print(f"出力先: {IMAGES_DIR}")
    print("=" * 60)

    for idx, flavor in enumerate(flavors, start=1):
        print(f"\n{progress_bar(idx, total)}  処理中: [{flavor.get('id')}] {flavor.get('name_ja')}")
        status, msg = generate_one(client, flavor, args.force)
        print(f"  -> {msg}")

        if status == "success":
            success_list.append(flavor.get("id"))
            # 成功時のみレート制限待機（最終味の後は不要）
            if idx < total:
                time.sleep(RATE_LIMIT_INTERVAL_SEC)
        elif status == "skip":
            skip_list.append(flavor.get("id"))
        else:
            fail_list.append((flavor.get("id"), msg))

    print("\n" + "=" * 60)
    print("生成完了サマリ")
    print("=" * 60)
    print(f"  成功     : {len(success_list)} 味  {success_list if success_list else ''}")
    print(f"  既存スキップ: {len(skip_list)} 味  {skip_list if skip_list else ''}")
    print(f"  失敗     : {len(fail_list)} 味")
    for fid, msg in fail_list:
        print(f"    - {msg}")

    if fail_list:
        print("\n失敗した味は再実行で再試行されます（成功分はスキップ）。")
        sys.exit(2)

    print("\n全味の生成が完了しました。images/ を確認してください。")
    print("次のステップ: RESEARCH.md §④の30秒チェック（角度・背景・余白）を実施してください。")


if __name__ == "__main__":
    main()
