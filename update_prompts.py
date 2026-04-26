"""prompts.json を新方針に更新: 完成品ではなく素材を優しい水彩タッチで描く"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPTS = os.path.join(HERE, 'prompts.json')

NEW_TEMPLATE = (
    "Soft watercolor and ink wash illustration of [INGREDIENT_EN], in gentle "
    "Japanese yamato-e and traditional wagashi packaging design style, single "
    "subject placed in the right one-third of the frame, kinari off-white "
    "#FAF5E9 background with subtle washi paper texture, soft organic brush "
    "strokes with hand-drawn imperfection, low saturation 60 percent maximum, "
    "the natural color of the ingredient is the only chromatic element, no "
    "text, no logo, no patterns, no decorations, no plates or vessels, no "
    "finished dessert, museum-grade botanical illustration aesthetic, ultra "
    "clean composition, 1:1 square aspect ratio, the left two-thirds of the "
    "frame is empty kinari space"
)

INGREDIENTS = {
    '01': "a single ripe strawberry with green leafy crown, fresh and elegant",
    '02': "a whole round melon with subtle netted skin texture, stem and small leaf",
    '03': "a whole oval lemon citrus fruit with slight pointed ends, one small green leaf",
    '04': "a small Hawaiian palm tree silhouette with curved trunk and fanning fronds, with a few coconuts at the top, a vivid bright blue ocean wave below, and a soft sun in the upper background, in vivid Hawaiian blue tones",
    '05': "a whole round peach fruit with subtle cleft, soft fuzz suggestion, small leaf",
    '06': "a small cluster of dark grapes hanging in triangular bunch, one curled vine leaf",
    '07': "a whole oval mango fruit with elegant curved silhouette, small stem",
    '08': "a vintage glass cola bottle silhouette, simple and graphic",
    '09': "a Japanese ramune soda bottle silhouette with marble shape suggestion",
    '10': "a single delicate snowflake or ice crystal, geometric and minimal",
    '11': "a whole round green apple with single leaf and stem",
    '12': "a whole round bright red apple with single leaf and stem",
    '13': "a single watermelon wedge cross-section showing red flesh, white pith, green rind, few seeds",
    '14': "a whole round orange citrus fruit with one small leaf",
    '15': "a small cluster of green muscat grapes hanging in triangular bunch with leaf",
    '16': "a small handful of mixed berries, blackberries and raspberries clustered together",
    '17': "a whole round hyuganatsu Japanese citrus fruit, golden yellow, one leaf",
    '18': "a small cluster of fresh lychee fruits with delicate skin texture",
    '19': "a whole pineapple silhouette with crown leaves, simplified",
    '20': "a small cluster of dark cassis blackcurrant berries with leaves",
    '21': "a small wooden bowl filled with creamy white yogurt, a wooden spoon resting on the side with a drop of yogurt falling, the white yogurt is clearly visible against the warm wooden bowl",
    '22': "a single matcha tea leaf or two leaves arranged elegantly",
    '23': "a single roasted coffee bean with central crease, simplified",
    '24': "a single black tea leaf or pair of tea leaves arranged elegantly",
    '25': "a small minimal stylized bat silhouette with spread wings",
    '26': "a small minimal flying saucer UFO silhouette with subtle glow",
    '27': "a small elegant tiara or princess crown silhouette with one ruby",
    '28': "a small elegant prince's crown silhouette with one sapphire",
    '29': "a single stylized lightning bolt with glowing edge",
    '30': "a knobby fresh ginger root with a small lightning accent emerging from it",
    '31': "a whole oval purple sweet potato (beni-imo) with subtle skin texture",
}

def main():
    with open(PROMPTS, encoding='utf-8') as f:
        data = json.load(f)
    data['style_name'] = 'kinari-yamato-illustration'
    data['style_description'] = (
        "原料/素材を画面右1/3に配置した優しい水彩・墨彩風挿絵。"
        "完成したかき氷ではなく、素材そのものを描く。"
        "和菓子パッケージや日本画の文法。"
    )
    data['master_template'] = NEW_TEMPLATE
    for f in data['flavors']:
        ing = INGREDIENTS.get(f['id'])
        if ing:
            f['ingredient_en'] = ing
            f['prompt'] = NEW_TEMPLATE.replace('[INGREDIENT_EN]', ing)
    with open(PROMPTS, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated {len(data['flavors'])} flavor prompts to new ingredient-illustration direction.")

if __name__ == '__main__':
    main()
