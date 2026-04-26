"""
朝日製氷POS — 31味プレースホルダーSVG v3
完成品ではなく素材を、優しい水彩タッチで、しかし即座に判別できるレベルまで
描き込んで生成する。
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPTS = os.path.join(HERE, 'prompts.json')
OUT_DIR = os.path.join(HERE, 'images')
os.makedirs(OUT_DIR, exist_ok=True)

LEAF       = '#7B9560'
LEAF_DARK  = '#5F7142'
LEAF_LIGHT = '#9BC75F'
STEM       = '#7A4F2E'
STEM_GREEN = '#5C7A3F'
INK        = '#1C1813'

PRE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="light" cx="35%" cy="32%" r="85%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#FAF5E9" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="softer"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <!-- perf: feTurbulence(grain noise) 廃止 - GPU重く31枚並ぶと致命的 -->
  <rect width="1024" height="1024" fill="#FAF5E9"/>
  <rect width="1024" height="1024" fill="url(#light)"/>
'''
POST = '\n</svg>'

def w(c, a):
    return f'fill="{c}" opacity="{a}"'

def watercolor(path_d, color, deep=0.62, mid=0.4):
    return (
        f'<path d="{path_d}" fill="{color}" opacity="0.25" filter="url(#softer)" transform="translate(2 3)"/>\n'
        f'<path d="{path_d}" fill="{color}" opacity="{deep}"/>\n'
        f'<path d="{path_d}" fill="{color}" opacity="{mid}"/>'
    )

def hl(cx, cy, rx, ry, op=0.5, rot=-15):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#FFFFFF" opacity="{op}" transform="rotate({rot} {cx} {cy})"/>'


# ============ FRUIT SHAPES ============

def strawberry(color):
    """いちご: 逆三角ボディ + 5本の萼 + 種"""
    body = "M 720 608 C 678 600 654 555 654 490 C 654 438 676 408 702 405 C 712 404 718 412 720 422 C 722 412 728 404 738 405 C 764 408 786 438 786 490 C 786 555 762 600 720 608 Z"
    return f'''
  <g>
    {watercolor(body, color)}
    <!-- seeds -->
    <g fill="#6B2820" opacity="0.7">
      <ellipse cx="688" cy="450" rx="2.2" ry="4" transform="rotate(-25 688 450)"/>
      <ellipse cx="710" cy="442" rx="2.2" ry="4" transform="rotate(-10 710 442)"/>
      <ellipse cx="734" cy="445" rx="2.2" ry="4" transform="rotate(8 734 445)"/>
      <ellipse cx="754" cy="455" rx="2.2" ry="4" transform="rotate(20 754 455)"/>
      <ellipse cx="678" cy="488" rx="2.2" ry="4" transform="rotate(-25 678 488)"/>
      <ellipse cx="703" cy="478" rx="2.2" ry="4" transform="rotate(-8 703 478)"/>
      <ellipse cx="730" cy="478" rx="2.2" ry="4" transform="rotate(8 730 478)"/>
      <ellipse cx="756" cy="490" rx="2.2" ry="4" transform="rotate(22 756 490)"/>
      <ellipse cx="685" cy="525" rx="2.2" ry="4" transform="rotate(-15 685 525)"/>
      <ellipse cx="715" cy="518" rx="2.2" ry="4"/>
      <ellipse cx="745" cy="525" rx="2.2" ry="4" transform="rotate(15 745 525)"/>
      <ellipse cx="700" cy="558" rx="2.2" ry="4" transform="rotate(-10 700 558)"/>
      <ellipse cx="730" cy="558" rx="2.2" ry="4" transform="rotate(10 730 558)"/>
    </g>
    <!-- 5 sepals (calyx) radiating from top center (720,410) -->
    <g fill="{LEAF}" opacity="0.92">
      <path d="M 718 416 L 678 396 L 716 408 Z"/>
      <path d="M 712 414 L 695 372 L 720 410 Z"/>
      <path d="M 716 410 L 720 358 L 724 410 Z"/>
      <path d="M 728 414 L 745 372 L 720 410 Z"/>
      <path d="M 722 416 L 762 396 L 724 408 Z"/>
    </g>
    <g fill="{LEAF_DARK}" opacity="0.6">
      <path d="M 716 410 L 720 365 L 722 410 Z"/>
    </g>
    <!-- stem -->
    <path d="M 720 360 L 720 342" stroke="{STEM}" stroke-width="3" stroke-linecap="round"/>
    <!-- highlights -->
    {hl(685, 470, 11, 22, 0.45)}
    {hl(680, 458, 5, 10, 0.8)}
  </g>'''


def round_apple(color, leaf_dir='right'):
    """リンゴ: 上に凹みのある球体 + 茎 + 葉"""
    body = "M 720 600 C 670 600 638 558 638 502 C 638 450 660 415 700 412 C 712 411 716 422 720 432 C 724 422 728 411 740 412 C 780 415 802 450 802 502 C 802 558 770 600 720 600 Z"
    leaf = (
        "M 720 415 Q 745 395 770 400 Q 760 422 735 425 Q 722 425 720 418 Z" if leaf_dir == 'right'
        else "M 720 415 Q 695 395 670 400 Q 680 422 705 425 Q 718 425 720 418 Z"
    )
    return f'''
  <g>
    {watercolor(body, color)}
    <!-- top indent (subtle) -->
    <path d="M 700 420 Q 720 432 740 420" stroke="{INK}" stroke-width="1.5" fill="none" opacity="0.18"/>
    <!-- stem -->
    <path d="M 720 425 Q 718 405 722 392" stroke="{STEM}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.82"/>
    <!-- leaf -->
    <path d="{leaf}" fill="{LEAF}" opacity="0.88"/>
    <path d="M {'742 405 L 760 412' if leaf_dir == 'right' else '698 405 L 680 412'}" stroke="{LEAF_DARK}" stroke-width="0.8" opacity="0.55"/>
    <!-- highlights -->
    {hl(680, 470, 14, 22, 0.5, -12)}
    {hl(672, 460, 5, 10, 0.85, -12)}
  </g>'''


def melon(color):
    """メロン: 球体 + 網目模様 + ヘタ"""
    body = "M 720 605 C 658 605 620 558 620 510 C 620 450 660 412 720 412 C 780 412 820 450 820 510 C 820 558 782 605 720 605 Z"
    return f'''
  <g>
    {watercolor(body, color)}
    <!-- net pattern: criss-cross creases -->
    <g stroke="#FFFFFF" stroke-width="1.3" fill="none" opacity="0.55" stroke-linecap="round">
      <path d="M 640 470 Q 720 458 800 470"/>
      <path d="M 628 510 Q 720 498 812 510"/>
      <path d="M 640 550 Q 720 538 800 550"/>
      <path d="M 685 425 Q 690 510 685 595"/>
      <path d="M 720 418 Q 720 510 720 600"/>
      <path d="M 755 425 Q 750 510 755 595"/>
    </g>
    <g stroke="{LEAF_DARK}" stroke-width="0.5" fill="none" opacity="0.3">
      <path d="M 660 488 Q 720 478 778 488"/>
      <path d="M 660 530 Q 720 520 778 530"/>
    </g>
    <!-- stem + leaf -->
    <path d="M 720 420 Q 716 400 724 384" stroke="{STEM}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85"/>
    <path d="M 722 388 Q 745 380 760 396 Q 745 404 728 400 Z" fill="{LEAF}" opacity="0.88"/>
    {hl(680, 478, 16, 12, 0.5)}
  </g>'''


def lemon(color):
    """レモン: 両端の尖ったオーバル + 葉"""
    return f'''
  <g transform="translate(720 510) rotate(-20)">
    <!-- main oval body -->
    <path d="M -110 0 C -110 -50 -65 -75 0 -75 C 65 -75 110 -50 110 0 C 110 50 65 75 0 75 C -65 75 -110 50 -110 0 Z"
          {w(color, 0.28)} filter="url(#softer)" transform="translate(2 3)"/>
    <path d="M -110 0 C -110 -50 -65 -75 0 -75 C 65 -75 110 -50 110 0 C 110 50 65 75 0 75 C -65 75 -110 50 -110 0 Z"
          {w(color, 0.65)}/>
    <path d="M -100 -2 C -100 -45 -60 -68 0 -68 C 60 -68 100 -45 100 -2 C 100 45 60 65 0 65 C -60 65 -100 45 -100 -2 Z"
          {w(color, 0.42)}/>
    <!-- pointed tips -->
    <path d="M -108 -3 L -130 0 L -108 3 Z" {w(color, 0.65)}/>
    <path d="M 108 -3 L 130 0 L 108 3 Z" {w(color, 0.65)}/>
    <!-- highlight -->
    <ellipse cx="-30" cy="-25" rx="22" ry="10" fill="#FFFFFF" opacity="0.55"/>
    <ellipse cx="-25" cy="-22" rx="9" ry="4" fill="#FFFFFF" opacity="0.85"/>
    <!-- subtle dimples for citrus texture -->
    <g fill="{INK}" opacity="0.1">
      <circle cx="-50" cy="20" r="2"/>
      <circle cx="20" cy="-30" r="2"/>
      <circle cx="50" cy="15" r="2"/>
      <circle cx="-20" cy="40" r="2"/>
    </g>
  </g>
  <!-- leaf -->
  <path d="M 700 426 Q 690 405 668 408 Q 678 428 698 432 Q 710 432 720 426 Z" fill="{LEAF}" opacity="0.85"/>
  <path d="M 700 426 Q 690 415 678 414" stroke="{LEAF_DARK}" stroke-width="0.8" fill="none" opacity="0.55"/>'''


def peach(color):
    """ピーチ: 中心に切れ込みのある桃"""
    body = "M 720 605 C 658 605 620 558 620 502 C 620 442 668 410 720 410 C 772 410 820 442 820 502 C 820 558 782 605 720 605 Z"
    return f'''
  <g>
    {watercolor(body, color)}
    <!-- cleft (vertical groove down center) -->
    <path d="M 720 420 Q 718 510 720 595" stroke="#A85040" stroke-width="3" fill="none" opacity="0.32" stroke-linecap="round"/>
    <path d="M 720 420 Q 716 510 720 595" stroke="#A85040" stroke-width="1.5" fill="none" opacity="0.55" stroke-linecap="round"/>
    <!-- stem + leaf -->
    <path d="M 720 422 Q 716 400 724 380" stroke="{STEM}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.82"/>
    <path d="M 724 384 Q 750 374 768 392 Q 752 402 732 398 Z" fill="{LEAF}" opacity="0.88"/>
    <path d="M 728 388 Q 740 388 750 392" stroke="{LEAF_DARK}" stroke-width="0.7" fill="none" opacity="0.55"/>
    <!-- soft fuzz suggestion (tiny dots) -->
    <g fill="#FFFFFF" opacity="0.35">
      <circle cx="660" cy="450" r="1"/>
      <circle cx="675" cy="495" r="1"/>
      <circle cx="700" cy="540" r="1"/>
      <circle cx="780" cy="455" r="1"/>
      <circle cx="775" cy="510" r="1"/>
      <circle cx="755" cy="560" r="1"/>
    </g>
    {hl(680, 470, 14, 22, 0.5, -10)}
    {hl(672, 460, 5, 10, 0.85, -10)}
  </g>'''


def grape_bunch(color, light_color=None):
    """ぶどう: 三角房 + 茎 + 葉"""
    if not light_color:
        light_color = color
    # 12 berries in triangular bunch
    berries = [
        # row 1 (top, 3 berries)
        (700, 422), (720, 412), (740, 422),
        # row 2 (4 berries)
        (684, 460), (708, 452), (732, 452), (756, 460),
        # row 3 (3 berries)
        (696, 495), (720, 488), (744, 495),
        # row 4 (2 berries)
        (708, 528), (732, 528),
        # bottom point
        (720, 560),
    ]
    out = '\n  <g>\n    <!-- vine + leaf -->'
    out += f'\n    <path d="M 720 410 Q 712 388 720 365" stroke="{STEM_GREEN}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>'
    out += f'\n    <path d="M 720 372 Q 750 360 770 378 Q 762 393 745 388 Q 728 384 720 378 Z" fill="{LEAF}" opacity="0.88"/>'
    out += f'\n    <path d="M 730 378 Q 745 378 758 380" stroke="{LEAF_DARK}" stroke-width="0.6" fill="none" opacity="0.55"/>'
    out += '\n    <!-- berries (each in 3 layers) -->'
    for i, (x, y) in enumerate(berries):
        a_outer = 0.22
        a_main = 0.78 if i % 3 == 0 else 0.65
        a_mid = 0.45
        out += f'\n    <circle cx="{x+1}" cy="{y+2}" r="22" fill="{color}" opacity="{a_outer}" filter="url(#soft)"/>'
        out += f'\n    <circle cx="{x}" cy="{y}" r="20" fill="{color}" opacity="{a_main}"/>'
        out += f'\n    <circle cx="{x-1}" cy="{y-1}" r="17" fill="{color}" opacity="{a_mid}"/>'
        out += f'\n    <circle cx="{x-5}" cy="{y-6}" r="5" fill="#FFFFFF" opacity="0.5"/>'
        out += f'\n    <circle cx="{x-5}" cy="{y-7}" r="2" fill="#FFFFFF" opacity="0.85"/>'
    out += '\n  </g>'
    return out


def watermelon():
    """スイカ: 三層楔 + 種"""
    return f'''
  <g transform="translate(720 510) rotate(-15)">
    <!-- outer rind dark -->
    <path d="M -135 90 Q -120 -130 130 -130 Q 145 -50 145 90 Z" fill="#3F6B3A" opacity="0.85" filter="url(#soft)"/>
    <!-- rind light/mid -->
    <path d="M -120 80 Q -107 -118 122 -118 Q 132 -50 132 80 Z" fill="{LEAF_LIGHT}" opacity="0.85"/>
    <!-- white pith -->
    <path d="M -110 72 Q -100 -100 110 -100 Q 118 -50 118 72 Z" fill="#F5F0DC" opacity="0.95"/>
    <!-- red flesh -->
    <path d="M -98 65 Q -90 -85 95 -85 Q 102 -50 102 65 Z" fill="#D44545" opacity="0.7" filter="url(#soft)"/>
    <path d="M -90 60 Q -82 -75 88 -75 Q 95 -50 95 60 Z" fill="#C8453A" opacity="0.55"/>
    <!-- seeds -->
    <g fill="{INK}" opacity="0.78">
      <ellipse cx="-50" cy="-30" rx="3" ry="6" transform="rotate(20 -50 -30)"/>
      <ellipse cx="20" cy="-40" rx="3" ry="6"/>
      <ellipse cx="60" cy="-15" rx="3" ry="6" transform="rotate(-15 60 -15)"/>
      <ellipse cx="-30" cy="20" rx="3" ry="6"/>
      <ellipse cx="40" cy="30" rx="3" ry="6" transform="rotate(10 40 30)"/>
      <ellipse cx="-65" cy="40" rx="3" ry="6" transform="rotate(-20 -65 40)"/>
    </g>
    <!-- highlight -->
    <ellipse cx="-50" cy="-50" rx="30" ry="8" fill="#FFFFFF" opacity="0.4"/>
  </g>'''


def orange_citrus(color):
    """オレンジ: 球体 + 葉 + 凹凸テクスチャ"""
    body = "M 720 600 C 660 600 622 555 622 505 C 622 450 662 412 720 412 C 778 412 818 450 818 505 C 818 555 780 600 720 600 Z"
    return f'''
  <g>
    {watercolor(body, color)}
    <!-- citrus texture: subtle small dots all over -->
    <g fill="{INK}" opacity="0.1">
      <circle cx="660" cy="460" r="1.5"/>
      <circle cx="678" cy="490" r="1.5"/>
      <circle cx="660" cy="525" r="1.5"/>
      <circle cx="690" cy="555" r="1.5"/>
      <circle cx="700" cy="475" r="1.5"/>
      <circle cx="730" cy="445" r="1.5"/>
      <circle cx="745" cy="475" r="1.5"/>
      <circle cx="765" cy="510" r="1.5"/>
      <circle cx="755" cy="550" r="1.5"/>
      <circle cx="725" cy="585" r="1.5"/>
      <circle cx="775" cy="465" r="1.5"/>
      <circle cx="785" cy="525" r="1.5"/>
      <circle cx="710" cy="510" r="1.5"/>
      <circle cx="735" cy="535" r="1.5"/>
    </g>
    <!-- top pit/dimple -->
    <ellipse cx="720" cy="425" rx="6" ry="4" fill="{INK}" opacity="0.2"/>
    <!-- leaf -->
    <path d="M 720 420 Q 752 400 776 410 Q 766 432 740 432 Q 728 430 720 425 Z" fill="{LEAF}" opacity="0.88"/>
    <path d="M 730 425 Q 748 420 765 420" stroke="{LEAF_DARK}" stroke-width="0.7" fill="none" opacity="0.55"/>
    <!-- stem -->
    <path d="M 720 420 Q 720 410 718 400" stroke="{STEM}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7"/>
    {hl(680, 470, 14, 22, 0.5, -10)}
    {hl(672, 460, 5, 10, 0.85, -10)}
  </g>'''


def mango(color):
    """マンゴー: 楕円・キドニー型"""
    body = "M 660 500 C 660 432 700 405 740 408 C 798 412 818 470 815 510 C 810 565 768 608 712 605 C 670 602 658 555 660 500 Z"
    return f'''
  <g>
    {watercolor(body, color)}
    <!-- subtle blush curve -->
    <path d="M 695 440 Q 740 440 780 470" stroke="#D44545" stroke-width="6" fill="none" opacity="0.18" stroke-linecap="round"/>
    <!-- small stem -->
    <path d="M 720 410 Q 718 398 724 388" stroke="{STEM}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.78"/>
    {hl(692, 470, 14, 22, 0.5, -20)}
    {hl(685, 460, 5, 10, 0.85, -20)}
  </g>'''


def hyuga_citrus(color):
    """日向夏: 球体 + 厚皮 + 葉"""
    body = "M 720 600 C 660 600 622 555 622 505 C 622 450 662 412 720 412 C 778 412 818 450 818 505 C 818 555 780 600 720 600 Z"
    return f'''
  <g>
    {watercolor(body, color)}
    <!-- thicker pith hint: inner ring -->
    <ellipse cx="720" cy="510" rx="78" ry="78" fill="none" stroke="#F8F0D8" stroke-width="3" opacity="0.5"/>
    <!-- citrus dimples -->
    <g fill="{INK}" opacity="0.1">
      <circle cx="660" cy="470" r="1.3"/>
      <circle cx="690" cy="500" r="1.3"/>
      <circle cx="730" cy="450" r="1.3"/>
      <circle cx="760" cy="490" r="1.3"/>
      <circle cx="700" cy="540" r="1.3"/>
      <circle cx="755" cy="555" r="1.3"/>
    </g>
    <!-- leaf -->
    <path d="M 720 420 Q 696 402 672 410 Q 682 430 706 432 Q 718 430 720 425 Z" fill="{LEAF}" opacity="0.88"/>
    <path d="M 720 420 Q 720 410 716 400" stroke="{STEM}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7"/>
    {hl(680, 470, 14, 22, 0.5, -10)}
  </g>'''


def lychee_cluster(color):
    """ライチ: 凹凸ある球体3つの集合"""
    centers = [(700, 470), (745, 480), (720, 540)]
    out = '\n  <g>'
    for cx, cy in centers:
        out += f'\n    <circle cx="{cx+2}" cy="{cy+3}" r="40" fill="{color}" opacity="0.22" filter="url(#softer)"/>'
        out += f'\n    <circle cx="{cx}" cy="{cy}" r="38" fill="{color}" opacity="0.65"/>'
        # bumpy texture - small triangular protrusions all over
        out += f'\n    <g fill="{color}" opacity="0.5">'
        for i, (dx, dy) in enumerate([(-25, -20), (-10, -30), (10, -28), (25, -18), (32, 0), (28, 18), (15, 28), (-5, 32), (-22, 25), (-32, 8), (-32, -5), (5, -10), (-15, 5), (12, 15), (22, -8), (-18, -10)]):
            out += f'<circle cx="{cx+dx}" cy="{cy+dy}" r="5" />'
        out += '</g>'
        out += f'\n    <ellipse cx="{cx-12}" cy="{cy-12}" r="6" fill="#FFFFFF" opacity="0.5"/>'
    # stem at top
    out += f'\n    <path d="M 700 440 Q 695 425 700 410" stroke="{STEM_GREEN}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>'
    out += f'\n    <path d="M 700 415 Q 715 408 728 418 Q 715 425 705 422 Z" fill="{LEAF}" opacity="0.85"/>'
    out += '\n  </g>'
    return out


def pineapple(color):
    """パイナップル: 鋭い葉冠 + ダイヤ模様の本体"""
    return f'''
  <g>
    <!-- crown leaves (spiky) -->
    <g fill="{LEAF}" opacity="0.88">
      <path d="M 720 420 L 700 360 L 712 415 Z"/>
      <path d="M 720 420 L 685 350 L 705 412 Z"/>
      <path d="M 720 420 L 720 340 L 728 418 Z"/>
      <path d="M 720 420 L 740 350 L 728 415 Z"/>
      <path d="M 720 420 L 755 360 L 738 412 Z"/>
      <path d="M 720 420 L 668 380 L 695 415 Z"/>
      <path d="M 720 420 L 772 380 L 748 415 Z"/>
    </g>
    <g fill="{LEAF_DARK}" opacity="0.7">
      <path d="M 720 420 L 712 365 L 720 410 Z"/>
      <path d="M 720 420 L 728 365 L 720 410 Z"/>
    </g>
    <!-- body -->
    <ellipse cx="722" cy="535" rx="80" ry="105" {w(color, 0.25)} filter="url(#softer)"/>
    <ellipse cx="720" cy="532" rx="74" ry="100" {w(color, 0.62)}/>
    <ellipse cx="717" cy="529" rx="62" ry="88" {w(color, 0.4)}/>
    <!-- diamond pattern grid -->
    <g stroke="{LEAF_DARK}" stroke-width="1.4" fill="none" opacity="0.55">
      <path d="M 660 460 L 720 480 L 780 460"/>
      <path d="M 660 495 L 720 515 L 780 495"/>
      <path d="M 660 530 L 720 550 L 780 530"/>
      <path d="M 660 565 L 720 585 L 780 565"/>
      <path d="M 660 600 L 720 620 L 780 600"/>
    </g>
    <g stroke="{LEAF_DARK}" stroke-width="1" fill="none" opacity="0.45">
      <path d="M 660 460 L 720 440 L 780 460"/>
      <path d="M 660 495 L 720 478 L 780 495"/>
      <path d="M 660 530 L 720 513 L 780 530"/>
      <path d="M 660 565 L 720 548 L 780 565"/>
      <path d="M 660 600 L 720 583 L 780 600"/>
    </g>
    {hl(682, 510, 14, 30, 0.4)}
  </g>'''


def cherry_berry_cluster(color):
    """ベリー類: 5-7個の小さな実 + 葉"""
    centers = [(696, 480), (730, 470), (760, 488), (700, 525), (740, 530), (720, 560)]
    out = '\n  <g>'
    # leaves first (at top)
    out += f'\n    <path d="M 700 460 Q 680 440 670 415 Q 690 425 700 460 Z" fill="{LEAF}" opacity="0.85"/>'
    out += f'\n    <path d="M 740 460 Q 760 440 770 415 Q 750 425 740 460 Z" fill="{LEAF}" opacity="0.85"/>'
    # stem
    out += f'\n    <path d="M 720 470 Q 720 440 720 410" stroke="{STEM_GREEN}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.65"/>'
    # berries
    for i, (cx, cy) in enumerate(centers):
        a = 0.78 if i % 2 == 0 else 0.65
        out += f'\n    <circle cx="{cx+1}" cy="{cy+2}" r="24" fill="{color}" opacity="0.22" filter="url(#soft)"/>'
        out += f'\n    <circle cx="{cx}" cy="{cy}" r="22" fill="{color}" opacity="{a}"/>'
        out += f'\n    <circle cx="{cx-2}" cy="{cy-2}" r="18" fill="{color}" opacity="0.45"/>'
        out += f'\n    <circle cx="{cx-5}" cy="{cy-6}" r="5" fill="#FFFFFF" opacity="0.55"/>'
        out += f'\n    <circle cx="{cx-5}" cy="{cy-7}" r="2" fill="#FFFFFF" opacity="0.9"/>'
    out += '\n  </g>'
    return out


# ============ NON-FRUIT SHAPES ============

def cola_bottle(color):
    """コーラ: コカ・コーラ風コンター瓶"""
    return f'''
  <g>
    <!-- bottle body shadow -->
    <path d="M 678 605 Q 670 555 680 510 Q 685 470 670 440 Q 660 420 670 405 Q 680 396 690 396 L 750 396 Q 762 396 770 405 Q 780 420 770 440 Q 755 470 760 510 Q 770 555 762 605 Z"
          fill="{color}" opacity="0.25" filter="url(#softer)" transform="translate(2 3)"/>
    <!-- bottle main -->
    <path d="M 678 605 Q 670 555 680 510 Q 685 470 670 440 Q 660 420 670 405 Q 680 396 690 396 L 750 396 Q 762 396 770 405 Q 780 420 770 440 Q 755 470 760 510 Q 770 555 762 605 Z"
          fill="{color}" opacity="0.78"/>
    <!-- inner lighter middle -->
    <path d="M 690 595 Q 685 555 695 515 Q 700 475 685 445 Q 678 425 685 410 Q 692 405 698 405 L 742 405 Q 748 405 755 410 Q 762 425 755 445 Q 740 475 745 515 Q 755 555 750 595 Z"
          fill="{color}" opacity="0.55"/>
    <!-- highlight stripe -->
    <path d="M 692 580 Q 690 550 700 510 Q 705 480 692 450 Q 685 432 692 418 Q 698 412 702 412"
          stroke="#FFFFFF" stroke-width="6" fill="none" opacity="0.4" stroke-linecap="round"/>
    <!-- cap (red) -->
    <rect x="685" y="370" width="70" height="22" rx="2" fill="#A8302A" opacity="0.85"/>
    <rect x="685" y="370" width="70" height="6" rx="1" fill="#7A2018" opacity="0.7"/>
    <line x1="690" y1="378" x2="750" y2="378" stroke="#5A1810" stroke-width="0.5" opacity="0.6"/>
    <!-- label hint (horizontal band) -->
    <rect x="680" y="490" width="80" height="40" fill="#FFFFFF" opacity="0.35"/>
    <line x1="680" y1="500" x2="760" y2="500" stroke="{INK}" stroke-width="0.6" opacity="0.4"/>
    <line x1="680" y1="520" x2="760" y2="520" stroke="{INK}" stroke-width="0.6" opacity="0.4"/>
  </g>'''


def ramune_bottle(color):
    """ラムネ: コッドネック瓶（ビー玉が入る独特の首形）"""
    return f'''
  <g>
    <!-- main body -->
    <path d="M 680 605 L 680 470 Q 680 458 685 452 L 685 432 Q 680 425 680 415 Q 680 408 690 405 L 695 392 L 745 392 L 750 405 Q 760 408 760 415 Q 760 425 755 432 L 755 452 Q 760 458 760 470 L 760 605 Z"
          fill="{color}" opacity="0.32" filter="url(#softer)" transform="translate(2 3)"/>
    <path d="M 680 605 L 680 470 Q 680 458 685 452 L 685 432 Q 680 425 680 415 Q 680 408 690 405 L 695 392 L 745 392 L 750 405 Q 760 408 760 415 Q 760 425 755 432 L 755 452 Q 760 458 760 470 L 760 605 Z"
          fill="{color}" opacity="0.5"/>
    <!-- inner lighter -->
    <path d="M 690 595 L 690 470 Q 690 462 695 458 L 695 435 Q 692 430 692 422 Q 692 415 698 412 L 700 400 L 740 400 L 742 412 Q 748 415 748 422 Q 748 430 745 435 L 745 458 Q 750 462 750 470 L 750 595 Z"
          fill="#E0F0F8" opacity="0.55"/>
    <!-- marble in neck -->
    <circle cx="720" cy="430" r="9" fill="{color}" opacity="0.7"/>
    <circle cx="720" cy="430" r="9" fill="none" stroke="{INK}" stroke-width="0.8" opacity="0.45"/>
    <ellipse cx="717" cy="427" rx="3" ry="2" fill="#FFFFFF" opacity="0.7"/>
    <!-- highlight stripe -->
    <path d="M 692 580 L 692 480 Q 692 465 700 458 L 700 432 Q 696 425 698 418"
          stroke="#FFFFFF" stroke-width="6" fill="none" opacity="0.45" stroke-linecap="round"/>
    <!-- cap (light blue) -->
    <rect x="693" y="375" width="54" height="20" rx="2" fill="#5DA9C8" opacity="0.85"/>
    <rect x="693" y="375" width="54" height="5" rx="1" fill="#3F8AAA" opacity="0.7"/>
  </g>'''


def snowflake_motif(color):
    """みぞれ: 雪の結晶"""
    return f'''
  <g transform="translate(720 510)">
    <g stroke="{color}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.32" filter="url(#soft)">
      <line x1="0" y1="-100" x2="0" y2="100"/>
      <line x1="-87" y1="-50" x2="87" y2="50"/>
      <line x1="-87" y1="50" x2="87" y2="-50"/>
    </g>
    <g stroke="{color}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.85">
      <line x1="0" y1="-100" x2="0" y2="100"/>
      <line x1="-87" y1="-50" x2="87" y2="50"/>
      <line x1="-87" y1="50" x2="87" y2="-50"/>
    </g>
    <g stroke="{color}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.85">
      <!-- ornaments at 6 tips -->
      <path d="M 0 -100 L -10 -90 M 0 -100 L 10 -90"/>
      <path d="M 0 100 L -10 90 M 0 100 L 10 90"/>
      <path d="M -87 -50 L -82 -62 M -87 -50 L -75 -47"/>
      <path d="M 87 50 L 82 62 M 87 50 L 75 47"/>
      <path d="M -87 50 L -82 62 M -87 50 L -75 47"/>
      <path d="M 87 -50 L 82 -62 M 87 -50 L 75 -47"/>
      <!-- inner branches -->
      <path d="M 0 -55 L -16 -68 M 0 -55 L 16 -68"/>
      <path d="M 0 55 L -16 68 M 0 55 L 16 68"/>
      <path d="M -48 -28 L -62 -25 M -48 -28 L -50 -42"/>
      <path d="M 48 28 L 62 25 M 48 28 L 50 42"/>
      <path d="M -48 28 L -62 25 M -48 28 L -50 42"/>
      <path d="M 48 -28 L 62 -25 M 48 -28 L 50 -42"/>
    </g>
    <!-- center hexagon -->
    <circle cx="0" cy="0" r="8" fill="{color}" opacity="0.7"/>
  </g>'''


def wave_motif(color):
    """ブルーハワイ: ヤシの木 + 太陽 + 海 (ハワイアン要素を強調)"""
    deep = '#01579B'   # 深い青(ハワイの空・海)
    mid = '#0288D1'    # 主青
    light = '#4FC3F7'  # 明るい青(太陽周りの空)
    return f'''
  <g>
    <!-- 空のグラデ(太陽の周りに薄く拡散) -->
    <ellipse cx="815" cy="445" rx="120" ry="70" fill="{light}" opacity="0.22" filter="url(#softer)"/>

    <!-- 太陽 -->
    <circle cx="820" cy="425" r="32" fill="{light}" opacity="0.4"/>
    <circle cx="820" cy="425" r="24" fill="{light}" opacity="0.85"/>
    <circle cx="820" cy="425" r="16" fill="#FFFCEC" opacity="0.85"/>
    <!-- 太陽の光線 -->
    <g stroke="{light}" stroke-width="3" stroke-linecap="round" opacity="0.55">
      <line x1="820" y1="378" x2="820" y2="388"/>
      <line x1="787" y1="392" x2="794" y2="399"/>
      <line x1="853" y1="392" x2="846" y2="399"/>
      <line x1="773" y1="425" x2="783" y2="425"/>
      <line x1="867" y1="425" x2="857" y2="425"/>
      <line x1="787" y1="458" x2="794" y2="451"/>
      <line x1="853" y1="458" x2="846" y2="451"/>
    </g>

    <!-- ヤシの木の幹 (ベースから上へ湾曲) -->
    <path d="M 700 600 Q 718 555 706 510 Q 692 460 712 425 Q 722 412 730 408"
          stroke="#5C3A20" stroke-width="20" fill="none" opacity="0.4" filter="url(#soft)" stroke-linecap="round"/>
    <path d="M 700 600 Q 718 555 706 510 Q 692 460 712 425 Q 722 412 730 408"
          stroke="#7A4F2E" stroke-width="14" fill="none" opacity="0.95" stroke-linecap="round"/>
    <!-- 幹の節(横線で椰子の樹皮感) -->
    <g stroke="#3A2515" stroke-width="1.4" fill="none" opacity="0.6">
      <path d="M 698 580 Q 706 578 712 583"/>
      <path d="M 706 545 Q 714 543 720 548"/>
      <path d="M 700 510 Q 708 507 714 513"/>
      <path d="M 696 478 Q 704 475 710 481"/>
      <path d="M 704 450 Q 712 448 718 453"/>
      <path d="M 716 425 Q 723 422 730 428"/>
    </g>

    <!-- ヤシの葉(6枚扇状に展開) -->
    <g fill="{deep}" opacity="0.88">
      <path d="M 730 408 Q 660 386 615 360 Q 645 378 678 392 Q 710 405 730 415 Z"/>
      <path d="M 728 412 Q 645 408 595 422 Q 638 410 680 408 Q 712 410 730 415 Z"/>
      <path d="M 730 415 Q 660 442 615 478 Q 660 426 700 418 Q 720 418 732 420 Z"/>
      <path d="M 730 408 Q 800 378 855 354 Q 820 380 788 395 Q 754 408 732 412 Z"/>
      <path d="M 732 412 Q 815 408 860 422 Q 815 410 770 408 Q 740 408 730 412 Z"/>
      <path d="M 730 415 Q 800 442 855 478 Q 800 425 762 418 Q 740 418 732 420 Z"/>
    </g>
    <!-- 葉のハイライト(明るい青) -->
    <g fill="{light}" opacity="0.5">
      <path d="M 730 410 Q 695 396 660 386"/>
      <path d="M 730 410 Q 768 396 802 386"/>
    </g>
    <!-- 葉の中心線 -->
    <g stroke="{deep}" stroke-width="1.4" fill="none" opacity="0.85">
      <path d="M 730 410 Q 678 390 615 360"/>
      <path d="M 730 412 Q 680 412 595 422"/>
      <path d="M 730 415 Q 680 425 615 478"/>
      <path d="M 730 410 Q 782 390 855 354"/>
      <path d="M 732 412 Q 785 412 860 422"/>
      <path d="M 730 415 Q 782 425 855 478"/>
    </g>

    <!-- ココナッツ(幹の上部に房) -->
    <circle cx="713" cy="422" r="9" fill="#3A2515" opacity="0.95"/>
    <circle cx="725" cy="418" r="8" fill="#3A2515" opacity="0.95"/>
    <circle cx="722" cy="430" r="7" fill="#3A2515" opacity="0.95"/>
    <circle cx="711" cy="420" r="2.5" fill="#FFFFFF" opacity="0.55"/>
    <circle cx="723" cy="416" r="2" fill="#FFFFFF" opacity="0.55"/>
    <circle cx="720" cy="428" r="2" fill="#FFFFFF" opacity="0.55"/>

    <!-- 海(下部に多層の波) -->
    <path d="M 575 580 Q 630 555 690 580 Q 750 605 815 580 Q 870 558 905 580"
          stroke="{deep}" stroke-width="24" fill="none" stroke-linecap="round" opacity="0.42" filter="url(#soft)"/>
    <path d="M 575 580 Q 630 555 690 580 Q 750 605 815 580 Q 870 558 905 580"
          stroke="{mid}" stroke-width="16" fill="none" stroke-linecap="round" opacity="0.92"/>
    <path d="M 575 585 Q 630 565 690 585 Q 750 608 815 585 Q 870 565 905 585"
          stroke="{light}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.8"/>
    <!-- もう一段下の波 -->
    <path d="M 580 612 Q 640 600 700 615 Q 760 628 820 612"
          stroke="{deep}" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.55"/>

    <!-- 波頭の白いしぶき -->
    <circle cx="640" cy="568" r="6" fill="#FFFFFF" opacity="0.95"/>
    <circle cx="635" cy="558" r="3" fill="#FFFFFF" opacity="0.7"/>
    <circle cx="700" cy="588" r="4" fill="#FFFFFF" opacity="0.85"/>
    <circle cx="775" cy="595" r="4" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="830" cy="572" r="6" fill="#FFFFFF" opacity="0.95"/>
    <circle cx="838" cy="562" r="3" fill="#FFFFFF" opacity="0.7"/>
    <circle cx="880" cy="568" r="3" fill="#FFFFFF" opacity="0.7"/>
  </g>'''


def yogurt_jar(color):
    """ヨーグルト: 木の器 + 白いヨーグルト + 木のスプーン (生成り背景でも視認できるように茶系の器)"""
    return f'''
  <g>
    <!-- 接地影 -->
    <ellipse cx="722" cy="610" rx="108" ry="14" fill="{INK}" opacity="0.18" filter="url(#softer)"/>

    <!-- 木の器 外側ボディ -->
    <path d="M 622 515 Q 612 595 720 605 Q 828 595 818 515 Z" fill="#8B5E32" opacity="0.95"/>
    <!-- 木目テクスチャ -->
    <g stroke="#5C3A20" stroke-width="0.9" fill="none" opacity="0.5">
      <path d="M 638 540 Q 720 558 802 540"/>
      <path d="M 640 568 Q 720 583 800 568"/>
      <path d="M 650 593 Q 720 602 790 593"/>
    </g>
    <!-- 器の左側ハイライト(立体感) -->
    <path d="M 632 525 Q 624 590 700 600" stroke="#A87D52" stroke-width="6" fill="none" opacity="0.7" stroke-linecap="round"/>
    <!-- 器の輪郭線(濃い茶) -->
    <path d="M 622 515 Q 612 595 720 605 Q 828 595 818 515" stroke="#3A2515" stroke-width="2.6" fill="none" opacity="0.78"/>

    <!-- 器の内側(縁を超えて見える奥の影) -->
    <path d="M 638 525 Q 632 588 720 598 Q 808 588 802 525 Z" fill="#3A2515" opacity="0.55"/>

    <!-- 器の上縁(ウッドリム) -->
    <ellipse cx="720" cy="515" rx="100" ry="15" fill="#A87D52" opacity="0.95"/>
    <ellipse cx="720" cy="515" rx="100" ry="15" fill="none" stroke="#3A2515" stroke-width="2.4" opacity="0.78"/>
    <ellipse cx="720" cy="513" rx="93" ry="11" fill="none" stroke="#5C3A20" stroke-width="1.2" opacity="0.55"/>

    <!-- ヨーグルト表面(白く広く見える) -->
    <ellipse cx="720" cy="515" rx="88" ry="11.5" fill="#FFFFFF" opacity="0.98"/>

    <!-- ヨーグルト本体(器内の白) -->
    <path d="M 642 525 Q 638 580 720 590 Q 802 580 798 525 Z" fill="#FAF7EE" opacity="0.85"/>

    <!-- ヨーグルト表面の微妙な層感 -->
    <ellipse cx="720" cy="515" rx="74" ry="9" fill="#F5F0DC" opacity="0.55"/>
    <ellipse cx="715" cy="513" rx="48" ry="5" fill="#FFFFFF" opacity="0.95"/>
    <ellipse cx="710" cy="511" rx="28" ry="2.5" fill="#FFFFFF" opacity="1"/>

    <!-- 中央のへこみ(輪) -->
    <ellipse cx="720" cy="514" rx="55" ry="6" fill="none" stroke="#E5DAC0" stroke-width="0.7" opacity="0.55"/>

    <!-- 木のスプーン(左に飛び出す) -->
    <g transform="translate(625 478) rotate(-32)">
      <rect x="-3.5" y="0" width="7" height="70" fill="#A87D52" opacity="0.95" rx="2"/>
      <line x1="-2" y1="3" x2="-2" y2="67" stroke="#7A4F2E" stroke-width="1" opacity="0.65"/>
      <ellipse cx="0" cy="-15" rx="16" ry="23" fill="#A87D52" opacity="0.95"/>
      <ellipse cx="0" cy="-15" rx="16" ry="23" fill="none" stroke="#3A2515" stroke-width="1.4" opacity="0.78"/>
      <!-- スプーン上の白いヨーグルト -->
      <ellipse cx="0" cy="-13" rx="11.5" ry="18" fill="#FFFFFF" opacity="0.98"/>
      <ellipse cx="-3" cy="-18" rx="3" ry="7" fill="#FFFFFF" opacity="0.85"/>
    </g>

    <!-- スプーンから垂れる滴 -->
    <path d="M 612 522 Q 614 535 618 545" stroke="#FFFFFF" stroke-width="3.5" fill="none" opacity="0.95" stroke-linecap="round"/>
    <ellipse cx="618" cy="548" rx="4" ry="5.5" fill="#FFFFFF" opacity="0.95"/>

    <!-- 器の下部に追加の影で重みを出す -->
    <path d="M 660 595 Q 720 605 780 595" stroke="#3A2515" stroke-width="2.5" fill="none" opacity="0.55"/>
  </g>'''


def matcha_motif(color):
    """抹茶: 茶碗 + 茶筅(ちゃせん)"""
    return f'''
  <g>
    <!-- matcha bowl shadow -->
    <path d="M 642 510 Q 642 580 720 590 Q 798 580 798 510 L 642 510 Z"
          fill="{INK}" opacity="0.1" filter="url(#softer)" transform="translate(2 3)"/>
    <!-- bowl outer -->
    <path d="M 642 510 Q 642 580 720 590 Q 798 580 798 510 L 642 510 Z"
          fill="#E5DCC2" opacity="0.95"/>
    <path d="M 642 510 Q 642 580 720 590 Q 798 580 798 510"
          stroke="#8B7556" stroke-width="1.5" fill="none" opacity="0.6"/>
    <!-- matcha inside (top ellipse) -->
    <ellipse cx="720" cy="510" rx="78" ry="14" fill="{color}" opacity="0.85"/>
    <ellipse cx="720" cy="508" rx="72" ry="11" fill="{color}" opacity="0.5"/>
    <!-- foam on top -->
    <ellipse cx="700" cy="505" rx="14" ry="3" fill="#FFFFFF" opacity="0.5"/>
    <ellipse cx="730" cy="510" rx="10" ry="2.5" fill="#FFFFFF" opacity="0.4"/>
    <!-- bowl base -->
    <ellipse cx="720" cy="590" rx="35" ry="6" fill="#A89274" opacity="0.7"/>
    <rect x="700" y="585" width="40" height="14" fill="#C2AC8A" opacity="0.85"/>
    <ellipse cx="720" cy="600" rx="20" ry="4" fill="#8B7556" opacity="0.85"/>
    <!-- chasen (bamboo whisk) standing in bowl -->
    <g transform="translate(770 460) rotate(20)">
      <!-- handle -->
      <rect x="-3" y="0" width="6" height="50" fill="#C9B687" opacity="0.95"/>
      <!-- bristles fanning out -->
      <g stroke="#C9B687" stroke-width="1.4" stroke-linecap="round" opacity="0.85">
        <path d="M 0 50 L -16 80"/>
        <path d="M 0 50 L -10 82"/>
        <path d="M 0 50 L -4 84"/>
        <path d="M 0 50 L 4 84"/>
        <path d="M 0 50 L 10 82"/>
        <path d="M 0 50 L 16 80"/>
        <path d="M 0 50 L -13 78"/>
        <path d="M 0 50 L 13 78"/>
      </g>
      <!-- binding -->
      <rect x="-3" y="48" width="6" height="6" fill="#8B7556"/>
    </g>
  </g>'''


def coffee_bean(color):
    """コーヒー豆: 中央に溝のある楕円"""
    return f'''
  <g transform="translate(720 510) rotate(-25)">
    <!-- shadow -->
    <ellipse cx="3" cy="4" rx="100" ry="65" {w(color, 0.28)} filter="url(#softer)"/>
    <!-- main body -->
    <ellipse cx="0" cy="0" rx="92" ry="58" {w(color, 0.78)}/>
    <!-- inner darker -->
    <ellipse cx="-2" cy="-2" rx="80" ry="48" {w(color, 0.55)}/>
    <!-- center crease (deep groove) -->
    <path d="M -85 0 Q -55 12 0 0 Q 55 -12 85 0"
          stroke="#0E0907" stroke-width="9" fill="none" opacity="0.5" stroke-linecap="round"/>
    <path d="M -85 0 Q -55 12 0 0 Q 55 -12 85 0"
          stroke="#0E0907" stroke-width="3" fill="none" opacity="0.9" stroke-linecap="round"/>
    <!-- subtle texture lines -->
    <g stroke="#FFFFFF" stroke-width="0.5" fill="none" opacity="0.25">
      <path d="M -70 -20 Q -40 -8 -10 -15"/>
      <path d="M 10 15 Q 40 8 70 18"/>
    </g>
    <!-- highlights -->
    <ellipse cx="-30" cy="-25" rx="22" ry="9" fill="#FFFFFF" opacity="0.35"/>
    <ellipse cx="-25" cy="-22" rx="9" ry="3.5" fill="#FFFFFF" opacity="0.65"/>
  </g>'''


def tea_leaf_pair(color):
    """紅茶/抹茶 葉: 葉脈付きの2枚葉"""
    return f'''
  <g>
    <!-- left leaf -->
    <g transform="translate(685 510) rotate(-25)">
      <path d="M -55 0 Q -40 -55 0 -75 Q 40 -55 55 0 Q 40 55 0 75 Q -40 55 -55 0 Z"
            {w(color, 0.32)} filter="url(#soft)"/>
      <path d="M -50 0 Q -36 -50 0 -70 Q 36 -50 50 0 Q 36 50 0 70 Q -36 50 -50 0 Z"
            {w(color, 0.6)}/>
      <line x1="0" y1="-68" x2="0" y2="68" stroke="{LEAF_DARK}" stroke-width="1.6" opacity="0.65"/>
      <path d="M 0 -45 Q 14 -38 25 -25" stroke="{LEAF_DARK}" stroke-width="1" fill="none" opacity="0.55"/>
      <path d="M 0 -15 Q 18 -8 32 5" stroke="{LEAF_DARK}" stroke-width="1" fill="none" opacity="0.55"/>
      <path d="M 0 15 Q 16 22 28 32" stroke="{LEAF_DARK}" stroke-width="1" fill="none" opacity="0.55"/>
      <path d="M 0 -45 Q -14 -38 -25 -25" stroke="{LEAF_DARK}" stroke-width="1" fill="none" opacity="0.55"/>
      <path d="M 0 -15 Q -18 -8 -32 5" stroke="{LEAF_DARK}" stroke-width="1" fill="none" opacity="0.55"/>
      <path d="M 0 15 Q -16 22 -28 32" stroke="{LEAF_DARK}" stroke-width="1" fill="none" opacity="0.55"/>
    </g>
    <!-- right leaf (smaller, behind) -->
    <g transform="translate(750 535) rotate(20)">
      <path d="M -45 0 Q -32 -42 0 -58 Q 32 -42 45 0 Q 32 42 0 58 Q -32 42 -45 0 Z"
            {w(color, 0.55)}/>
      <line x1="0" y1="-55" x2="0" y2="55" stroke="{LEAF_DARK}" stroke-width="1.4" opacity="0.6"/>
      <path d="M 0 -30 Q 12 -22 22 -10" stroke="{LEAF_DARK}" stroke-width="0.8" fill="none" opacity="0.5"/>
      <path d="M 0 0 Q 14 8 24 18" stroke="{LEAF_DARK}" stroke-width="0.8" fill="none" opacity="0.5"/>
      <path d="M 0 -30 Q -12 -22 -22 -10" stroke="{LEAF_DARK}" stroke-width="0.8" fill="none" opacity="0.5"/>
      <path d="M 0 0 Q -14 8 -24 18" stroke="{LEAF_DARK}" stroke-width="0.8" fill="none" opacity="0.5"/>
    </g>
  </g>'''


def beni_imo(color):
    """紅いも: 細長い楕円・先端が尖る"""
    body = "M 615 510 Q 600 470 640 458 Q 700 442 760 460 Q 815 478 822 510 Q 822 542 760 558 Q 700 575 640 562 Q 605 552 615 510 Z"
    return f'''
  <g>
    {watercolor(body, color)}
    <!-- stripes/skin texture -->
    <g stroke="{INK}" stroke-width="1" fill="none" opacity="0.18" stroke-linecap="round">
      <path d="M 640 488 Q 720 478 800 488"/>
      <path d="M 635 510 Q 720 502 805 510"/>
      <path d="M 640 532 Q 720 525 800 532"/>
    </g>
    <!-- small "eyes" (skin marks) -->
    <g fill="{INK}" opacity="0.4">
      <ellipse cx="660" cy="498" rx="3" ry="2"/>
      <ellipse cx="700" cy="478" rx="3" ry="2"/>
      <ellipse cx="745" cy="500" rx="3" ry="2"/>
      <ellipse cx="780" cy="525" rx="3" ry="2"/>
      <ellipse cx="690" cy="540" rx="3" ry="2"/>
      <ellipse cx="725" cy="555" rx="3" ry="2"/>
    </g>
    <!-- highlights -->
    <ellipse cx="680" cy="478" rx="22" ry="6" fill="#FFFFFF" opacity="0.4"/>
    <ellipse cx="675" cy="475" rx="9" ry="2.5" fill="#FFFFFF" opacity="0.7"/>
  </g>'''


def ginger_root(color):
    """イナズマジンジャー: 節のある根 + 雷光"""
    body = "M 610 530 Q 600 478 645 462 Q 690 450 720 478 Q 745 460 780 470 Q 820 482 825 530 Q 825 575 780 588 Q 740 595 720 575 Q 695 595 660 590 Q 615 580 610 530 Z"
    return f'''
  <g>
    {watercolor(body, color)}
    <!-- node creases -->
    <g stroke="{INK}" stroke-width="1.4" fill="none" opacity="0.32" stroke-linecap="round">
      <path d="M 660 475 Q 670 510 660 555"/>
      <path d="M 720 462 Q 728 510 720 580"/>
      <path d="M 770 478 Q 778 520 770 575"/>
    </g>
    <!-- lightning above root -->
    <path d="M 770 425 L 745 470 L 770 470 L 740 525"
          stroke="#E8C440" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.4" filter="url(#soft)"/>
    <path d="M 770 425 L 745 470 L 770 470 L 740 525"
          stroke="#E8C440" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
    <!-- highlight -->
    <ellipse cx="668" cy="500" rx="18" ry="6" fill="#FFFFFF" opacity="0.4"/>
  </g>'''


def lightning_bolt(color):
    """パワーエナジー: 純粋な雷光"""
    bolt = "M 760 410 L 692 510 L 738 510 L 678 615 L 718 520 L 685 520 Z"
    return f'''
  <g>
    <path d="{bolt}" fill="{color}" opacity="0.32" filter="url(#softer)" transform="translate(3 4)"/>
    <path d="{bolt}" fill="{color}" opacity="0.85"/>
    <path d="{bolt}" fill="{color}" opacity="0.55"/>
    <path d="{bolt}" stroke="{INK}" stroke-width="1.5" fill="none" opacity="0.45" stroke-linejoin="round"/>
    <!-- inner highlight on bolt -->
    <path d="M 754 416 L 710 510" stroke="#FFFFFF" stroke-width="3" fill="none" opacity="0.55" stroke-linecap="round"/>
    <path d="M 728 525 L 692 590" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
    <!-- spark dots -->
    <circle cx="690" cy="380" r="3" fill="{color}" opacity="0.7"/>
    <circle cx="800" cy="450" r="4" fill="{color}" opacity="0.7"/>
    <circle cx="660" cy="540" r="3" fill="{color}" opacity="0.7"/>
  </g>'''


def princess_crown(color):
    """プリンセス: 宝石付き優美な王冠"""
    return f'''
  <g>
    <!-- main crown band shadow -->
    <path d="M 632 540 L 808 540 L 808 588 L 632 588 Z" fill="{color}" opacity="0.25" filter="url(#softer)" transform="translate(2 3)"/>
    <!-- crown band -->
    <path d="M 632 540 L 808 540 L 808 588 L 632 588 Z" fill="{color}" opacity="0.7"/>
    <!-- spikes (curved princess style) -->
    <path d="M 632 540 Q 656 478 672 530 Q 696 470 720 528 Q 744 470 768 530 Q 784 478 808 540 Z"
          fill="{color}" opacity="0.78"/>
    <!-- swirl decorations between spikes -->
    <g stroke="{color}" stroke-width="2" fill="none" opacity="0.55">
      <path d="M 660 510 Q 670 500 678 510"/>
      <path d="M 706 510 Q 720 498 734 510"/>
      <path d="M 762 510 Q 772 500 780 510"/>
    </g>
    <!-- jewels (heart-shaped center, round sides) -->
    <path d="M 720 502 Q 712 488 720 480 Q 728 488 720 502 Z" fill="#B43A2A" opacity="0.92"/>
    <circle cx="660" cy="498" r="6" fill="#B43A2A" opacity="0.85"/>
    <circle cx="780" cy="498" r="6" fill="#B43A2A" opacity="0.85"/>
    <!-- band detail line -->
    <line x1="632" y1="556" x2="808" y2="556" stroke="{INK}" stroke-width="0.8" opacity="0.4"/>
    <!-- pearl row on band -->
    <g fill="#F8F0E8" opacity="0.85">
      <circle cx="648" cy="568" r="3"/>
      <circle cx="672" cy="568" r="3"/>
      <circle cx="696" cy="568" r="3"/>
      <circle cx="720" cy="568" r="3"/>
      <circle cx="744" cy="568" r="3"/>
      <circle cx="768" cy="568" r="3"/>
      <circle cx="792" cy="568" r="3"/>
    </g>
    <!-- highlight -->
    <ellipse cx="690" cy="488" rx="20" ry="6" fill="#FFFFFF" opacity="0.45"/>
  </g>'''


def prince_crown(color):
    """王子様: 角張った男性的王冠"""
    return f'''
  <g>
    <!-- band shadow -->
    <path d="M 632 540 L 808 540 L 808 588 L 632 588 Z" fill="{color}" opacity="0.25" filter="url(#softer)" transform="translate(2 3)"/>
    <!-- band -->
    <path d="M 632 540 L 808 540 L 808 588 L 632 588 Z" fill="{color}" opacity="0.78"/>
    <!-- spikes (sharp triangular) -->
    <path d="M 632 540 L 660 470 L 690 530 L 720 460 L 750 530 L 780 470 L 808 540 Z"
          fill="{color}" opacity="0.88"/>
    <!-- jewels: square/diamond shapes -->
    <path d="M 720 488 L 728 478 L 720 468 L 712 478 Z" fill="#5DA9C8" opacity="0.92"/>
    <path d="M 660 502 L 666 496 L 660 490 L 654 496 Z" fill="#5DA9C8" opacity="0.85"/>
    <path d="M 780 502 L 786 496 L 780 490 L 774 496 Z" fill="#5DA9C8" opacity="0.85"/>
    <!-- band cross-pattern -->
    <g stroke="{INK}" stroke-width="1" fill="none" opacity="0.4">
      <line x1="640" y1="558" x2="800" y2="558"/>
      <line x1="640" y1="572" x2="800" y2="572"/>
    </g>
    <!-- gem base markers -->
    <g fill="#B43A2A" opacity="0.78">
      <circle cx="660" cy="565" r="3"/>
      <circle cx="690" cy="565" r="3"/>
      <circle cx="720" cy="565" r="3"/>
      <circle cx="750" cy="565" r="3"/>
      <circle cx="780" cy="565" r="3"/>
    </g>
    <ellipse cx="690" cy="488" rx="20" ry="6" fill="#FFFFFF" opacity="0.45"/>
  </g>'''


def bat_silhouette(color):
    """ドラキュラ: 蝙蝠のシルエット"""
    return f'''
  <g transform="translate(720 510)">
    <!-- bat shadow -->
    <path d="M 0 -8 Q -45 -52 -100 -32 Q -138 -8 -130 32 Q -98 8 -72 24 Q -48 36 -22 18 Q -8 38 0 60 Q 8 38 22 18 Q 48 36 72 24 Q 98 8 130 32 Q 138 -8 100 -32 Q 45 -52 0 -8 Z"
          fill="{color}" opacity="0.32" filter="url(#softer)" transform="translate(3 4)"/>
    <!-- main bat body -->
    <path d="M 0 -8 Q -45 -52 -100 -32 Q -138 -8 -130 32 Q -98 8 -72 24 Q -48 36 -22 18 Q -8 38 0 60 Q 8 38 22 18 Q 48 36 72 24 Q 98 8 130 32 Q 138 -8 100 -32 Q 45 -52 0 -8 Z"
          fill="{color}" opacity="0.88"/>
    <!-- wing veining -->
    <g stroke="{INK}" stroke-width="0.8" fill="none" opacity="0.4">
      <path d="M -10 -5 Q -50 -25 -85 -25"/>
      <path d="M -10 -5 Q -55 0 -100 5"/>
      <path d="M -10 -5 Q -55 25 -85 35"/>
      <path d="M 10 -5 Q 50 -25 85 -25"/>
      <path d="M 10 -5 Q 55 0 100 5"/>
      <path d="M 10 -5 Q 55 25 85 35"/>
    </g>
    <!-- ears (pointed up) -->
    <path d="M -12 -22 L -18 -50 L -4 -28 Z" fill="{color}" opacity="0.92"/>
    <path d="M 12 -22 L 18 -50 L 4 -28 Z" fill="{color}" opacity="0.92"/>
    <!-- head -->
    <ellipse cx="0" cy="-5" rx="14" ry="12" fill="{color}" opacity="0.95"/>
    <!-- eyes (red glow) -->
    <ellipse cx="-6" cy="-8" rx="2.5" ry="3" fill="#B43A2A" opacity="0.95"/>
    <ellipse cx="6" cy="-8" rx="2.5" ry="3" fill="#B43A2A" opacity="0.95"/>
    <!-- fangs -->
    <path d="M -3 0 L -2 6 L -1 0 Z" fill="#FFFFFF" opacity="0.85"/>
    <path d="M 3 0 L 2 6 L 1 0 Z" fill="#FFFFFF" opacity="0.85"/>
  </g>'''


def ufo_motif(color):
    """エイリアン: UFO + ビーム + 星"""
    return f'''
  <g>
    <!-- saucer shadow -->
    <ellipse cx="722" cy="550" rx="125" ry="22" fill="{color}" opacity="0.28" filter="url(#softer)"/>
    <!-- saucer disk -->
    <ellipse cx="720" cy="545" rx="118" ry="20" fill="{color}" opacity="0.78"/>
    <!-- bottom darker rim -->
    <ellipse cx="720" cy="552" rx="108" ry="13" fill="{INK}" opacity="0.5"/>
    <!-- top dome -->
    <path d="M 660 540 Q 660 480 720 478 Q 780 480 780 540 Z" fill="{color}" opacity="0.55"/>
    <path d="M 670 538 Q 670 488 720 486 Q 770 488 770 538 Z" fill="#FFFFFF" opacity="0.4"/>
    <!-- alien head silhouette inside dome -->
    <ellipse cx="720" cy="510" rx="16" ry="20" fill="{LEAF_DARK}" opacity="0.55"/>
    <ellipse cx="713" cy="506" rx="3" ry="5" fill="{INK}" opacity="0.85"/>
    <ellipse cx="727" cy="506" rx="3" ry="5" fill="{INK}" opacity="0.85"/>
    <!-- lights on saucer -->
    <circle cx="678" cy="552" r="4" fill="#E8C440" opacity="0.95"/>
    <circle cx="700" cy="556" r="4" fill="#E8C440" opacity="0.95"/>
    <circle cx="720" cy="558" r="4" fill="#E8C440" opacity="0.95"/>
    <circle cx="740" cy="556" r="4" fill="#E8C440" opacity="0.95"/>
    <circle cx="762" cy="552" r="4" fill="#E8C440" opacity="0.95"/>
    <!-- abduction beam -->
    <path d="M 685 565 L 660 625 L 780 625 L 755 565 Z" fill="{color}" opacity="0.18"/>
    <path d="M 695 567 L 680 615 L 760 615 L 745 567 Z" fill="{color}" opacity="0.12"/>
    <!-- stars -->
    <g fill="#FFFFFF" opacity="0.85">
      <path d="M 640 425 L 642 432 L 649 432 L 643 437 L 645 444 L 640 440 L 635 444 L 637 437 L 631 432 L 638 432 Z"/>
      <circle cx="800" cy="440" r="2"/>
      <circle cx="660" cy="478" r="1.5"/>
      <circle cx="780" cy="465" r="1.5"/>
    </g>
  </g>'''


# ============ MAPPING ============

def render_for(slug, hex_color):
    fn_map = {
        '01-ichigo':           lambda: strawberry(hex_color),
        '02-melon':            lambda: melon(hex_color),
        '03-lemon':            lambda: lemon(hex_color),
        '04-blue-hawaii':      lambda: wave_motif(hex_color),
        '05-peach':            lambda: peach(hex_color),
        '06-grape':            lambda: grape_bunch(hex_color),
        '07-mango':            lambda: mango(hex_color),
        '08-cola':             lambda: cola_bottle(hex_color),
        '09-ramune':           lambda: ramune_bottle(hex_color),
        '10-mizore':           lambda: snowflake_motif('#7BA8C8'),
        '11-green-apple':      lambda: round_apple(hex_color, leaf_dir='right'),
        '12-red-apple':        lambda: round_apple(hex_color, leaf_dir='right'),
        '13-watermelon':       lambda: watermelon(),
        '14-orange':           lambda: orange_citrus(hex_color),
        '15-muscat':           lambda: grape_bunch(hex_color),
        '16-double-berry':     lambda: cherry_berry_cluster(hex_color),
        '17-hyuganatsu':       lambda: hyuga_citrus(hex_color),
        '18-salty-lychee':     lambda: lychee_cluster(hex_color),
        '19-emerald-pine':     lambda: pineapple(hex_color),
        '20-cassis-orange':    lambda: cherry_berry_cluster(hex_color),
        '21-yogurt':           lambda: yogurt_jar(hex_color),
        '22-matcha':           lambda: matcha_motif(hex_color),
        '23-coffee':           lambda: coffee_bean(hex_color),
        '24-black-tea':        lambda: tea_leaf_pair(hex_color),
        '25-dracula':          lambda: bat_silhouette(hex_color),
        '26-alien':            lambda: ufo_motif(hex_color),
        '27-princess':         lambda: princess_crown(hex_color),
        '28-prince':           lambda: prince_crown(hex_color),
        '29-power-energy':     lambda: lightning_bolt(hex_color),
        '30-thunder-ginger':   lambda: ginger_root(hex_color),
        '31-beni-imo':         lambda: beni_imo(hex_color),
    }
    fn = fn_map.get(slug)
    return fn() if fn else round_apple(hex_color)


def main():
    with open(PROMPTS, encoding='utf-8') as f:
        data = json.load(f)
    n = 0
    for fl in data['flavors']:
        slug_base = fl['filename'].rsplit('.', 1)[0]
        body = render_for(slug_base, fl['syrup_hex'])
        svg = PRE + body + POST
        out = os.path.join(OUT_DIR, f'{slug_base}.svg')
        with open(out, 'w', encoding='utf-8') as o:
            o.write(svg)
        n += 1
    print(f'Generated {n} ingredient illustrations (v3) in {OUT_DIR}')


if __name__ == '__main__':
    main()
