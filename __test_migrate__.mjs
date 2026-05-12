/* ============================================================
   v22 migrateFlavors / migrateToppings の動作検証スクリプト
   各シナリオで「次回起動時の品書き/トッピング」がどう変わるかを
   localStorage モックで再現してチェック。
   ============================================================ */

const DEFAULT_FLAVORS = [
  { name:'いちご', color:'#D67285', price:250, image:'01-ichigo' },
  { name:'メロン', color:'#9DBE7A', price:250, image:'02-melon' },
  { name:'レモン', color:'#E5C44A', price:250, image:'03-lemon' },
  { name:'ブルーハワイ', color:'#0288D1', price:250, image:'04-blue-hawaii' },
  { name:'ピーチ', color:'#E8A993', price:250, image:'05-peach' },
  { name:'ダブルベリー', color:'#7A325E', price:250, image:'16-double-berry' },
  { name:'塩みかん', color:'#F2A23A', price:300, image:'32-shio-mikan' },
  { name:'巨峰＆ベリー', color:'#5C2C5C', price:300, image:'33-kyoho-berry' },
];

const DEFAULT_TOPPINGS = [
  { id:'milk',     name:'ミルク',     price:50  },
  { id:'spoon',    name:'スプーン',   price:10  },
  { id:'george',   name:'ジョージ',   price:200 },
  { id:'tomjerry', name:'トムジェリ', price:200 },
];

const FLAVORS_KEY            = 'asahi_seihyou_flavors_v1';
const TOPPINGS_KEY           = 'asahi_seihyou_toppings_v1';
const INTRODUCED_FLAVORS_KEY = 'asahi_seihyou_introduced_flavor_images_v1';
const INTRODUCED_TOPPINGS_KEY = 'asahi_seihyou_introduced_topping_ids_v1';

/* ====== localStorage モック ====== */
function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    dump: () => Object.fromEntries(store),
  };
}

/* ====== migrate ロジック (app.js v22 から複写) ====== */
function runMigrate(ls) {
  function loadJSON(key, fallback) {
    try {
      const v = ls.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  let FLAVORS  = loadJSON(FLAVORS_KEY, DEFAULT_FLAVORS.slice());
  let TOPPINGS = loadJSON(TOPPINGS_KEY, DEFAULT_TOPPINGS.slice());

  // === migrateFlavors ===
  (function migrateFlavors() {
    let changed = false;
    let introChanged = false;
    FLAVORS.forEach(f => {
      if (!f.image) {
        const def = DEFAULT_FLAVORS.find(d => d.name === f.name);
        if (def && def.image) { f.image = def.image; changed = true; }
      }
    });
    FLAVORS.forEach(f => {
      if (f.name === 'ブルーハワイ' && f.color === '#5DA9C8') {
        f.color = '#0288D1';
        changed = true;
      }
    });
    const introducedRaw = loadJSON(INTRODUCED_FLAVORS_KEY, null);
    const introSet = new Set(Array.isArray(introducedRaw) ? introducedRaw : []);
    FLAVORS.forEach(f => { if (f.image) introSet.add(f.image); });
    DEFAULT_FLAVORS.forEach(def => {
      if (def.image && !introSet.has(def.image)) {
        FLAVORS.push({ ...def });
        introSet.add(def.image);
        changed = true;
      }
    });
    const newIntro = Array.from(introSet).sort();
    const oldIntro = (Array.isArray(introducedRaw) ? introducedRaw.slice() : []).sort();
    if (JSON.stringify(newIntro) !== JSON.stringify(oldIntro)) {
      introChanged = true;
    }
    if (changed) {
      ls.setItem(FLAVORS_KEY, JSON.stringify(FLAVORS));
    }
    if (introChanged) {
      ls.setItem(INTRODUCED_FLAVORS_KEY, JSON.stringify(newIntro));
    }
  })();

  // === migrateToppings ===
  (function migrateToppings() {
    let changed = false;
    let introChanged = false;
    TOPPINGS.forEach(t => {
      if (t.id === 'cup' || t.name === '特製カップ') {
        t.id = 'george';
        t.name = 'ジョージ';
        if (typeof t.price !== 'number') t.price = 200;
        changed = true;
      }
    });
    const introducedRaw = loadJSON(INTRODUCED_TOPPINGS_KEY, null);
    const introSet = new Set(Array.isArray(introducedRaw) ? introducedRaw : []);
    TOPPINGS.forEach(t => { if (t.id) introSet.add(t.id); });
    if (introducedRaw === null) {
      DEFAULT_TOPPINGS.forEach(def => {
        if (TOPPINGS.find(t => t.id === def.id)) introSet.add(def.id);
      });
    }
    DEFAULT_TOPPINGS.forEach(def => {
      if (def.id && !introSet.has(def.id)) {
        TOPPINGS.push({ ...def });
        introSet.add(def.id);
        changed = true;
      }
    });
    const newIntro = Array.from(introSet).sort();
    const oldIntro = (Array.isArray(introducedRaw) ? introducedRaw.slice() : []).sort();
    if (JSON.stringify(newIntro) !== JSON.stringify(oldIntro)) {
      introChanged = true;
    }
    if (changed) {
      ls.setItem(TOPPINGS_KEY, JSON.stringify(TOPPINGS));
    }
    if (introChanged) {
      ls.setItem(INTRODUCED_TOPPINGS_KEY, JSON.stringify(newIntro));
    }
  })();

  return { FLAVORS, TOPPINGS };
}

/* ====== テストヘルパー ====== */
let pass = 0, fail = 0;
function assert(cond, name) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}

function freshLS(initialFlavors, initialToppings, initialIntroFlavors, initialIntroToppings) {
  const ls = makeStorage();
  if (initialFlavors !== undefined) ls.setItem(FLAVORS_KEY, JSON.stringify(initialFlavors));
  if (initialToppings !== undefined) ls.setItem(TOPPINGS_KEY, JSON.stringify(initialToppings));
  if (initialIntroFlavors !== undefined) ls.setItem(INTRODUCED_FLAVORS_KEY, JSON.stringify(initialIntroFlavors));
  if (initialIntroToppings !== undefined) ls.setItem(INTRODUCED_TOPPINGS_KEY, JSON.stringify(initialIntroToppings));
  return ls;
}

/* ====== シナリオテスト ====== */

console.log('\n=== シナリオ1: 新規端末 (FLAVORS_KEY 未保存) ===');
{
  const ls = freshLS();
  const r1 = runMigrate(ls);
  assert(r1.FLAVORS.length === DEFAULT_FLAVORS.length, `味数=${r1.FLAVORS.length} (DEFAULT全件)`);
  assert(r1.TOPPINGS.length === DEFAULT_TOPPINGS.length, `トッピング数=${r1.TOPPINGS.length}`);
  // 2回目起動
  const r2 = runMigrate(ls);
  assert(r2.FLAVORS.length === DEFAULT_FLAVORS.length, '2回目起動: 味数変わらず');
  assert(r2.TOPPINGS.length === DEFAULT_TOPPINGS.length, '2回目起動: トッピング数変わらず');
}

console.log('\n=== シナリオ2: 「ダブルベリー」→「ダブル」rename ===');
{
  // 既存端末: 全DEFAULT入りの状態でアプリ起動 (FLAVORS_KEY 保存済み)
  const existing = DEFAULT_FLAVORS.slice();
  const ls = freshLS(existing);
  runMigrate(ls);  // v22 初回マイグレーション
  // ユーザーが「ダブルベリー」を「ダブル」にrename
  const flavors = JSON.parse(ls.getItem(FLAVORS_KEY));
  const idx = flavors.findIndex(f => f.name === 'ダブルベリー');
  flavors[idx].name = 'ダブル';
  ls.setItem(FLAVORS_KEY, JSON.stringify(flavors));
  // 翌日起動
  const r = runMigrate(ls);
  const namesNext = r.FLAVORS.map(f => f.name);
  assert(namesNext.includes('ダブル'), '「ダブル」が存在');
  assert(!namesNext.includes('ダブルベリー'), '「ダブルベリー」幽霊復活していない');
  assert(r.FLAVORS.length === DEFAULT_FLAVORS.length, `味数=${r.FLAVORS.length} (重複なし)`);
}

console.log('\n=== シナリオ3: 既に幽霊復活している既存端末 (ダブル + ダブルベリー両存) ===');
{
  // 旧バグ環境を再現: FLAVORS に「ダブル」と「ダブルベリー」が共存
  const existing = DEFAULT_FLAVORS.slice().map(f =>
    f.name === 'ダブルベリー' ? { ...f, name: 'ダブル' } : f
  );
  // 末尾に幽霊「ダブルベリー」も追加
  existing.push({ name: 'ダブルベリー', color: '#7A325E', price: 250, image: '16-double-berry' });
  const ls = freshLS(existing);
  runMigrate(ls); // v22 初回
  // ユーザーが手動で「ダブルベリー」を削除
  let flavors = JSON.parse(ls.getItem(FLAVORS_KEY));
  flavors = flavors.filter((f, i) => !(f.name === 'ダブルベリー' && i === flavors.length - 1));
  ls.setItem(FLAVORS_KEY, JSON.stringify(flavors));
  // 翌日起動
  const r = runMigrate(ls);
  const namesNext = r.FLAVORS.map(f => f.name);
  const dupCount = namesNext.filter(n => n === 'ダブルベリー').length;
  assert(dupCount === 0, '手動削除後、ダブルベリー復活しない');
  assert(namesNext.includes('ダブル'), '「ダブル」は残っている');
}

console.log('\n=== シナリオ4: ピーチを削除 → 次回起動で復活しない ===');
{
  const existing = DEFAULT_FLAVORS.slice();
  const ls = freshLS(existing);
  runMigrate(ls); // v22 初回 (introducedにすべての image を記録)
  // ピーチ削除
  let flavors = JSON.parse(ls.getItem(FLAVORS_KEY)).filter(f => f.name !== 'ピーチ');
  ls.setItem(FLAVORS_KEY, JSON.stringify(flavors));
  // 翌日起動
  const r = runMigrate(ls);
  const namesNext = r.FLAVORS.map(f => f.name);
  assert(!namesNext.includes('ピーチ'), 'ピーチが削除されたまま (復活しない)');
  assert(r.FLAVORS.length === DEFAULT_FLAVORS.length - 1, `味数=${r.FLAVORS.length}`);
}

console.log('\n=== シナリオ5: 将来 DORU が新規DEFAULT追加 → 既存端末にも導入 ===');
{
  const existing = DEFAULT_FLAVORS.slice();
  const ls = freshLS(existing);
  runMigrate(ls); // v22 初回
  // 将来 DEFAULT に「ストロベリー」が追加されたと仮定
  DEFAULT_FLAVORS.push({ name: 'ストロベリー', color: '#FF6680', price: 300, image: '99-strawberry' });
  // 翌日起動
  const r = runMigrate(ls);
  const namesNext = r.FLAVORS.map(f => f.name);
  assert(namesNext.includes('ストロベリー'), '新DEFAULT「ストロベリー」が導入された');
  assert(r.FLAVORS.length === DEFAULT_FLAVORS.length, `味数=${r.FLAVORS.length} (新規含む)`);
  // 元に戻す
  DEFAULT_FLAVORS.pop();
}

console.log('\n=== シナリオ6: トッピング「ジョージ」rename → 復活しない ===');
{
  const existing = DEFAULT_TOPPINGS.slice();
  const ls = freshLS(undefined, existing);
  runMigrate(ls); // v22 初回
  // 「ジョージ」を「ジョージ二号」にrename
  let toppings = JSON.parse(ls.getItem(TOPPINGS_KEY));
  toppings.find(t => t.id === 'george').name = 'ジョージ二号';
  ls.setItem(TOPPINGS_KEY, JSON.stringify(toppings));
  // 翌日起動
  const r = runMigrate(ls);
  const namesNext = r.TOPPINGS.map(t => t.name);
  assert(namesNext.includes('ジョージ二号'), 'rename済みの「ジョージ二号」が存在');
  assert(!namesNext.includes('ジョージ'), '元の「ジョージ」復活していない');
  assert(r.TOPPINGS.length === DEFAULT_TOPPINGS.length, `トッピング数=${r.TOPPINGS.length}`);
}

console.log('\n=== シナリオ7: 旧 cup → george マイグレーション ===');
{
  const existing = [
    { id:'milk',  name:'ミルク',   price:50 },
    { id:'spoon', name:'スプーン', price:10 },
    { id:'cup',   name:'特製カップ', price:200 },
  ];
  const ls = freshLS(undefined, existing);
  const r = runMigrate(ls);
  assert(r.TOPPINGS.find(t => t.id === 'george' && t.name === 'ジョージ'), 'cup → george rename 成功');
  assert(!r.TOPPINGS.find(t => t.id === 'cup'), '旧 cup id が消えた');
  assert(r.TOPPINGS.find(t => t.id === 'tomjerry'), 'tomjerry が新規追加された');
}

console.log('\n=== シナリオ8: 5日連続でアプリ再起動 (idempotency) ===');
{
  const existing = DEFAULT_FLAVORS.slice().map(f =>
    f.name === 'ダブルベリー' ? { ...f, name: 'ダブル' } : f
  );
  const ls = freshLS(existing);
  let r;
  for (let day = 1; day <= 5; day++) {
    r = runMigrate(ls);
  }
  const namesFinal = r.FLAVORS.map(f => f.name);
  const dupCount = namesFinal.filter(n => n === 'ダブルベリー').length;
  assert(dupCount === 0, '5日後でもダブルベリー復活せず');
  assert(namesFinal.includes('ダブル'), 'ダブル維持');
  assert(r.FLAVORS.length === DEFAULT_FLAVORS.length, `味数固定=${r.FLAVORS.length}`);
}

console.log('\n=== シナリオ9: 削除→翌日→改名→翌日 の組合せ ===');
{
  const existing = DEFAULT_FLAVORS.slice();
  const ls = freshLS(existing);
  runMigrate(ls); // 初回
  // Day1: ピーチ削除
  let flavors = JSON.parse(ls.getItem(FLAVORS_KEY)).filter(f => f.name !== 'ピーチ');
  ls.setItem(FLAVORS_KEY, JSON.stringify(flavors));
  runMigrate(ls); // Day2 起動
  // Day2: ダブルベリー → ダブル
  flavors = JSON.parse(ls.getItem(FLAVORS_KEY));
  flavors.find(f => f.name === 'ダブルベリー').name = 'ダブル';
  ls.setItem(FLAVORS_KEY, JSON.stringify(flavors));
  const r = runMigrate(ls); // Day3 起動
  const names = r.FLAVORS.map(f => f.name);
  assert(!names.includes('ピーチ'), 'ピーチ削除維持');
  assert(!names.includes('ダブルベリー'), 'ダブルベリー復活せず');
  assert(names.includes('ダブル'), 'ダブル維持');
  assert(r.FLAVORS.length === DEFAULT_FLAVORS.length - 1, `味数=${r.FLAVORS.length} (ピーチ-1)`);
}

console.log('\n=== シナリオ10: 旧バックアップ (introducedなし) のインポート相当 ===');
{
  // 旧バックアップを想定: FLAVORSのみ存在し、INTRODUCED_FLAVORS_KEY は未保存
  // = importJSON 後 + INTRODUCED_FLAVORS_KEY なしの状態と等価
  const existing = DEFAULT_FLAVORS.slice().map(f =>
    f.name === 'ダブルベリー' ? { ...f, name: 'ダブル' } : f
  );
  const ls = freshLS(existing);
  const r = runMigrate(ls);
  const names = r.FLAVORS.map(f => f.name);
  // 旧バックアップ復元直後でも、ダブルベリーは復活しない
  // (現FLAVORS の image='16-double-berry' が introSet に入るため)
  assert(!names.includes('ダブルベリー'), '旧バックアップ復元後もダブルベリー復活せず');
  assert(names.includes('ダブル'), 'ダブル維持');
}

console.log(`\n=== 結果: ${pass} pass / ${fail} fail ===`);
process.exit(fail === 0 ? 0 : 1);
