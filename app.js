'use strict';

/* ============================================================
   朝日製氷 POS — Application Logic
   PWA features: SW registration, update banner, cart draft,
                 capacity monitor, backup status, health check,
                 wake lock toggle.
   ============================================================ */

/* ===== Defaults ===== */
const DEFAULT_FLAVORS = [
  { name:'いちご', color:'#D67285', price:250, image:'01-ichigo' },
  { name:'メロン', color:'#9DBE7A', price:250, image:'02-melon' },
  { name:'レモン', color:'#E5C44A', price:250, image:'03-lemon' },
  { name:'ブルーハワイ', color:'#0288D1', price:250, image:'04-blue-hawaii' },
  { name:'ピーチ', color:'#E8A993', price:250, image:'05-peach' },
  { name:'グレープ', color:'#7B5A95', price:250, image:'06-grape' },
  { name:'マンゴー', color:'#E2A148', price:250, image:'07-mango' },
  { name:'コーラ', color:'#5C3A20', price:250, image:'08-cola' },
  { name:'ラムネ', color:'#A8D5E8', price:250, image:'09-ramune' },
  { name:'みぞれ', color:'#D9D0BD', price:250, image:'10-mizore' },
  { name:'青リンゴ', color:'#A6C25C', price:250, image:'11-green-apple' },
  { name:'真っ赤なリンゴ', color:'#B83A3A', price:250, image:'12-red-apple' },
  { name:'スイカ', color:'#C84545', price:250, image:'13-watermelon' },
  { name:'オレンジ', color:'#D88B47', price:250, image:'14-orange' },
  { name:'マスカット', color:'#92AC4A', price:250, image:'15-muscat' },
  { name:'ダブルベリー', color:'#7A325E', price:250, image:'16-double-berry' },
  { name:'日向夏', color:'#E5BE48', price:250, image:'17-hyuganatsu' },
  { name:'ソルティーライチ', color:'#D6BCC8', price:250, image:'18-salty-lychee' },
  { name:'エメラルドパイン', color:'#4E9A85', price:250, image:'19-emerald-pine' },
  { name:'カシスオレンジ', color:'#9A3D5C', price:250, image:'20-cassis-orange' },
  { name:'ヨーグルト', color:'#E8E0CC', price:250, image:'21-yogurt' },
  { name:'抹茶', color:'#5F7142', price:250, image:'22-matcha' },
  { name:'コーヒー', color:'#4A2E1E', price:250, image:'23-coffee' },
  { name:'紅茶', color:'#894528', price:250, image:'24-black-tea' },
  { name:'ドラキュラ', color:'#2E1F2E', price:250, image:'25-dracula' },
  { name:'エイリアン', color:'#6FAA52', price:250, image:'26-alien' },
  { name:'プリンセス', color:'#D688AC', price:250, image:'27-princess' },
  { name:'王子様', color:'#4868A8', price:250, image:'28-prince' },
  { name:'パワーエナジー', color:'#B83A3A', price:250, image:'29-power-energy' },
  { name:'イナズマジンジャー', color:'#D6A832', price:250, image:'30-thunder-ginger' },
  { name:'紅いも', color:'#5C2D5E', price:250, image:'31-beni-imo' },
  { name:'塩みかん', color:'#F2A23A', price:300, image:'32-shio-mikan' },
  { name:'巨峰＆ベリー', color:'#5C2C5C', price:300, image:'33-kyoho-berry' },
];
const DEFAULT_TOPPINGS = [
  { id:'milk',     name:'ミルク',     price:50  },
  { id:'spoon',    name:'スプーン',   price:10  },
  { id:'george',   name:'ジョージ',   price:200 },
  { id:'tomjerry', name:'トムジェリ', price:200 },
];

/* ===== Persistence keys ===== */
const SALES_KEY       = 'asahi_seihyou_sales_v1';
const FLAVORS_KEY     = 'asahi_seihyou_flavors_v1';
const TOPPINGS_KEY    = 'asahi_seihyou_toppings_v1';
const SEEDED_KEY      = 'asahi_seihyou_seeded_v1';
const CART_DRAFT_KEY  = 'asahi_seihyou_cart_draft_v1';
const LAST_BACKUP_KEY = 'asahi_seihyou_last_backup_v1';
const WAKELOCK_KEY    = 'asahi_seihyou_wakelock_v1';

/* ===== State ===== */
let FLAVORS  = loadJSON(FLAVORS_KEY, DEFAULT_FLAVORS.slice());
let TOPPINGS = loadJSON(TOPPINGS_KEY, DEFAULT_TOPPINGS.slice());
let cart = [];
let nextId = 1;

/* Migration: 既存FLAVORSの image補完 / 旧色更新 / 新商品追加 */
(function migrateFlavors() {
  let changed = false;
  // image フィールド補完
  FLAVORS.forEach(f => {
    if (!f.image) {
      const def = DEFAULT_FLAVORS.find(d => d.name === f.name);
      if (def && def.image) { f.image = def.image; changed = true; }
    }
  });
  // ブルーハワイの旧色 #5DA9C8 → 新色 #0288D1 へ
  FLAVORS.forEach(f => {
    if (f.name === 'ブルーハワイ' && f.color === '#5DA9C8') {
      f.color = '#0288D1';
      changed = true;
    }
  });
  /* DEFAULTに新規追加された味を既存ユーザーのFLAVORSにも追加
     (32:塩みかん, 33:巨峰＆ベリー など) */
  DEFAULT_FLAVORS.forEach(def => {
    if (!FLAVORS.find(f => f.name === def.name)) {
      FLAVORS.push({ ...def });
      changed = true;
    }
  });
  if (changed) {
    try { localStorage.setItem(FLAVORS_KEY, JSON.stringify(FLAVORS)); } catch {}
  }
})();

/* Migration: 既存TOPPINGSの旧'cup'(特製カップ)を'george'(ジョージ)へrename。
   tomjerry を未追加なら追加。価格は据え置き。
   2026-04-29 クライアント要望: トッピング3→4個化 */
(function migrateToppings() {
  let changed = false;
  TOPPINGS.forEach(t => {
    if (t.id === 'cup' || t.name === '特製カップ') {
      t.id = 'george';
      t.name = 'ジョージ';
      if (typeof t.price !== 'number') t.price = 200;
      changed = true;
    }
  });
  // tomjerry が無ければ追加
  if (!TOPPINGS.find(t => t.id === 'tomjerry')) {
    TOPPINGS.push({ id:'tomjerry', name:'トムジェリ', price:200 });
    changed = true;
  }
  if (changed) {
    try { localStorage.setItem(TOPPINGS_KEY, JSON.stringify(TOPPINGS)); } catch {}
  }
})();

/* ===== Persistence helpers ===== */
function loadJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      alert('データ容量が上限に達しました。設定→JSONバックアップを書き出してから古いデータを削除してください。');
    }
    throw e;
  }
}
function loadSales() {
  try { return JSON.parse(localStorage.getItem(SALES_KEY) || '[]'); }
  catch { return []; }
}

/* §8: localStorage 4MB 警告つき saveSale */
function saveSale(record) {
  const all = loadSales();
  all.push(record);
  const serialized = JSON.stringify(all);
  // UTF-16換算: 文字数 × 2 byte
  const sizeBytes = serialized.length * 2;
  if (sizeBytes > 4 * 1024 * 1024) {
    showToast('データ容量が満杯に近づいています。バックアップを推奨');
  }
  try {
    localStorage.setItem(SALES_KEY, serialized);
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      alert('データ容量が上限に達しました。設定→JSONバックアップを書き出してから古いデータを削除してください。');
    }
    throw e;
  }
}

function persistFlavors()  { saveJSON(FLAVORS_KEY, FLAVORS); refreshAfterChange(); }
function persistToppings() { saveJSON(TOPPINGS_KEY, TOPPINGS); refreshAfterChange(); }
function refreshAfterChange() {
  renderFlavors();
  renderCart();
  updatePriceRule();
}

/* ===== Cart draft persistence (§9.1) ===== */
/* Wave3 #16: 失敗時はサイレント (cart 描画継続) — ただし Quota エラーはトースト警告 */
function persistCartDraft() {
  try {
    localStorage.setItem(CART_DRAFT_KEY, JSON.stringify({ cart, nextId, ts: Date.now() }));
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      // 警告は1回だけ (連打防止)
      if (!persistCartDraft._warned) {
        persistCartDraft._warned = true;
        showToast('容量不足: バックアップ後に古い履歴を削除してください');
      }
    }
    // それ以外はサイレント (cart は in-memory で動作継続)
  }
}
function restoreCartDraft() {
  try {
    const raw = localStorage.getItem(CART_DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (Date.now() - (d.ts || 0) > 30 * 60 * 1000) {
      localStorage.removeItem(CART_DRAFT_KEY);
      return;
    }
    if (Array.isArray(d.cart)) cart = d.cart;
    // Wave3 #12: nextId は cart 内 id の最大値+1 と保存値の最大を採用 (衝突防止)
    const cartMaxIdPlus1 = cart.length ? Math.max(...cart.map(c => (typeof c.id === 'number' ? c.id : 0))) + 1 : 1;
    const storedNextId = (typeof d.nextId === 'number' && isFinite(d.nextId)) ? d.nextId : 1;
    nextId = Math.max(cartMaxIdPlus1, storedNextId, 1);
  } catch {}
}
function clearCartDraft() {
  try { localStorage.removeItem(CART_DRAFT_KEY); } catch {}
}

/* ===== Sample data (first run only) ===== */
/* ★ ユーザー要求: モックデータ完全廃止。
   既存のサンプル(sample-* ID)を起動時に静かに削除し、再シードしない。
   実会計データ(タイムスタンプID)は完全保持。 */
function clearSampleSales() {
  try {
    const sales = loadSales();
    const real = sales.filter(s => !String(s.id || '').startsWith('sample-'));
    if (real.length !== sales.length) {
      localStorage.setItem(SALES_KEY, JSON.stringify(real));
    }
    /* 旧 SEEDED_KEY も除去して二度と seed されないように */
    localStorage.removeItem(SEEDED_KEY);
  } catch (e) {
    console.warn('[clearSampleSales] failed:', e && e.message);
  }
}

/* 旧シード関数: 残しているが init() からは呼ばない (デバッグ用にのみ参照可能) */
function seedIfEmpty() {
  if (localStorage.getItem(SEEDED_KEY)) return;
  const out = [];
  const now = Date.now();
  for (let day = 0; day < 30; day++) {
    const dayBase = now - day * 86400000;
    const tx = 6 + Math.floor(Math.random() * 14);
    for (let t = 0; t < tx; t++) {
      const items = [];
      const ic = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < ic; i++) {
        const f = DEFAULT_FLAVORS[Math.floor(Math.random() * DEFAULT_FLAVORS.length)];
        const tops = [];
        if (Math.random() < 0.45) tops.push('milk');
        if (Math.random() < 0.18) tops.push('spoon');
        if (Math.random() < 0.10) tops.push('cup');
        let price = f.price;
        DEFAULT_TOPPINGS.forEach(tp => { if (tops.includes(tp.id)) price += tp.price; });
        items.push({ flavor: f.name, basePrice: f.price, toppings: tops, price });
      }
      const total = items.reduce((s, it) => s + it.price, 0);
      const ts = dayBase - Math.floor(Math.random() * 86400000);
      out.push({ id: `sample-${day}-${t}`, ts, items, total });
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  // Wave3 #16: try/catch — シード失敗してもアプリは動作継続
  try {
    localStorage.setItem(SALES_KEY, JSON.stringify(out));
    localStorage.setItem(SEEDED_KEY, '1');
  } catch (e) {
    // シード失敗は致命でない (空のままで起動)
    console.warn('[seedIfEmpty] failed:', e && e.message);
  }
}

/* ===== Utility ===== */
function pad(n) { return String(n).padStart(2, '0'); }
function fmtNum(n) { return Number(n || 0).toLocaleString(); }
function fmtDateJP(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function getDayOfWeek(ts) { return '日月火水木金土'[new Date(ts).getDay()]; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }

/* P1-13: 時計を「2026年4月26日（土）13:45」明朝に */
function tickClock() {
  const d = new Date();
  const w = getDayOfWeek(d.getTime());
  const text = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${w}）${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const el = document.getElementById('clock');
  if (el) el.textContent = text;
}

/* ===== Flavor grid render ===== */
function renderFlavors() {
  const grid = document.getElementById('flavor-grid');
  // grid-template-rows / grid-auto-flow は CSS 側で完全に定義
  // (auto-rows + 行方向フロー + 縦スクロール)
  const allSamePrice = new Set(FLAVORS.map(f => f.price)).size === 1;
  const cellCount = FLAVORS.length;
  const cols = 3;        /* ユーザー要求: 3列固定 (4→3) row-fill で「いちご下＝ブルーハワイ」 */

  // perf: 一括 DocumentFragment で1回のreflowに
  const frag = document.createDocumentFragment();

  FLAVORS.forEach((f, i) => {
    const cell = document.createElement('button');
    cell.type = 'button';                       /* Luxray P1: form包含時のsubmit事故予防 */
    cell.className = 'flavor-cell';
    cell.style.setProperty('--flavor-color', f.color);
    if (f.image) {
      cell.style.setProperty('--flavor-bg', `url("./images/${f.image}.svg")`);
      cell.classList.add('has-image');
    }
    cell.innerHTML = `
      <span class="flavor-num">${pad(i + 1)}</span>
      <span class="flavor-name">${escapeHtml(f.name)}</span>
      ${allSamePrice ? '' : `<span class="flavor-priceTag"><span class="yen">¥</span>${fmtNum(f.price)}</span>`}`;
    cell.addEventListener('click', () => addToCart(f));
    frag.appendChild(cell);
  });

  // 最終行を埋めるため空セル追加 (cols 単位に揃える)
  const total = Math.ceil(cellCount / cols) * cols;
  for (let i = cellCount; i < total; i++) {
    const empty = document.createElement('div');
    empty.className = 'flavor-cell empty';
    empty.style.setProperty('--flavor-color', 'transparent');
    empty.setAttribute('aria-hidden', 'true');
    frag.appendChild(empty);
  }

  grid.replaceChildren(frag);
}

function updatePriceRule() {
  const prices = [...new Set(FLAVORS.map(f => f.price))];
  const rule = document.getElementById('price-rule');
  if (prices.length === 1) {
    document.getElementById('rule-price').textContent = fmtNum(prices[0]);
    rule.classList.remove('hidden');
  } else {
    rule.classList.add('hidden');
  }
}

/* ===== Cart logic ===== */
function addToCart(f) {
  cart.push({
    id: nextId++,
    flavor: f.name,
    color: f.color,
    basePrice: f.price,
    toppings: TOPPINGS.reduce((acc, t) => {
      acc[t.id] = { name: t.name, price: t.price, active: false };
      return acc;
    }, {}),
  });
  renderCart();
  const list = document.getElementById('cart-list');
  setTimeout(() => { list.scrollTop = list.scrollHeight; }, 30);
}
function calcItem(it) {
  let p = it.basePrice;
  Object.values(it.toppings).forEach(t => { if (t.active) p += t.price; });
  return p;
}
function calcSubtotal() { return cart.reduce((s, it) => s + calcItem(it), 0); }

function renderCart() {
  const list = document.getElementById('cart-list');
  if (cart.length === 0) {
    // P0-09: 「氷」漢字撤廃 → 32px 極細円 + 1×12px 墨線
    list.innerHTML = `
      <div class="empty-cart">
        <div class="empty-mark"></div>
        御品書きより<br>お選びくださいませ
      </div>`;
  } else {
    list.innerHTML = cart.map(it => `
      <div class="cart-item" style="--flavor-color:${it.color}">
        <div class="item-row">
          <div class="item-name">${escapeHtml(it.flavor)}</div>
          <div class="item-price"><span class="yen">¥</span>${fmtNum(calcItem(it))}</div>
        </div>
        <div class="toppings">
          ${Object.entries(it.toppings).map(([tid, t]) => `
            <button class="topping-chip ${t.active ? 'active' : ''}"
                    data-action="toggle-topping" data-item="${it.id}" data-topping="${escapeAttr(tid)}">
              ${escapeHtml(t.name)}
              <span class="topping-add">+¥${fmtNum(t.price)}</span>
            </button>`).join('')}
        </div>
        <div class="item-foot">
          <button class="delete-btn" data-action="remove-item" data-item="${it.id}">削 除</button>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('subtotal').textContent = fmtNum(calcSubtotal());
  updateChange();
  persistCartDraft();
}

function toggleTopping(id, tid) {
  const it = cart.find(x => x.id === id);
  if (it && it.toppings[tid]) it.toppings[tid].active = !it.toppings[tid].active;
  renderCart();
}
function removeItem(id) {
  cart = cart.filter(x => x.id !== id);
  renderCart();
}

/* お預かり/お釣り 機能廃止 (クライアント要望)。
 * → receivedRaw 関連の関数群削除。updateChange は CTA有効化判定のみ */
function updateChange() {
  const s = calcSubtotal();
  const cta = document.getElementById('checkout');
  if (cta) cta.disabled = (s === 0);
}

/* ===== Checkout ===== */
/* Wave3 #2: saveSale を try/catch で囲み、QuotaExceededError 時はカートを保持
   会計ボタン再有効化 (cart残存→ updateChange で disabled 自動再計算) */
function doCheckout() {
  const total = calcSubtotal();
  const items = cart.map(it => ({
    flavor: it.flavor,
    basePrice: it.basePrice,
    toppings: Object.entries(it.toppings)
      .filter(([_, t]) => t.active)
      .map(([tid, t]) => ({ id: tid, name: t.name, price: t.price })),
    price: calcItem(it),
  }));
  try {
    saveSale({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      items,
      total,
    });
  } catch (e) {
    // saveSale 内で alert は発火済み。カート保持・会計ボタン再有効化
    showToast('保存に失敗しました。バックアップ後に再試行してください。');
    // checkout ボタンを再評価 (cart は消さない)
    updateChange();
    return;
  }
  // P2-21: 完了トーストに角印 SVG 同梱
  showToast(`御会計 完了  ¥${fmtNum(total)}`, { withSeal: true });
  cart = [];
  clearCartDraft();
  renderCart();
}

/* ===== Toast ===== */
function showToast(msg, opts = {}) {
  const t = document.getElementById('toast');
  let html = '';
  if (opts.withSeal) {
    const tpl = document.getElementById('seal-svg');
    const sealHTML = tpl ? tpl.innerHTML : '';
    html = `<span class="toast-msg">${escapeHtml(msg)}</span>${sealHTML}`;
  } else {
    html = `<span class="toast-msg">${escapeHtml(msg)}</span>`;
  }
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ===== View routing ===== */
function setView(name) {
  ['pos', 'ledger', 'settings'].forEach(n => {
    document.getElementById('view-' + n).classList.toggle('active', n === name);
  });
  document.getElementById('header-buttons').style.display = name === 'pos' ? '' : 'none';
}

/* ===== Today modal ===== */
/* Wave3 #14: 戻り値に削除済みトッピング情報 (deletedToppings) を含める。
   - 履歴に出てくる tid のうち、現在の TOPPINGS に無いものを delete 済として返す
   - 名前は履歴から最後に見えた name + price を使う (取引時のスナップショット) */
function aggregateRange(fromTs, toTs) {
  const all = loadSales().filter(s => s.ts >= fromTs && s.ts <= toTs);
  let kakigori = 0, kakigoriRevenue = 0, total = 0;
  /* ★v19: かき氷を basePrice 別に分けて集計 (¥250 / ¥300 が同時並存) */
  const kakigoriByPrice = {}; // { '250': qty, '300': qty }
  const toppingCounts = {};
  const toppingRevenue = {};
  const toppingMeta = {};
  const byDate = {};
  all.forEach(s => {
    const k = dateKey(s.ts);
    if (!byDate[k]) byDate[k] = {
      kakigori: 0, kakigoriRevenue: 0,
      kakigoriByPrice: {},
      toppings: {}, total: 0, tx: 0
    };
    byDate[k].tx++;
    byDate[k].total += s.total;
    s.items.forEach(it => {
      kakigori++; byDate[k].kakigori++;
      const bp = it.basePrice || 250;
      kakigoriRevenue += bp;
      byDate[k].kakigoriRevenue += bp;
      const bpKey = String(bp);
      kakigoriByPrice[bpKey] = (kakigoriByPrice[bpKey] || 0) + 1;
      byDate[k].kakigoriByPrice[bpKey] = (byDate[k].kakigoriByPrice[bpKey] || 0) + 1;
      (it.toppings || []).forEach(tp => {
        const tid = typeof tp === 'string' ? tp : tp.id;
        toppingCounts[tid] = (toppingCounts[tid] || 0) + 1;
        byDate[k].toppings[tid] = (byDate[k].toppings[tid] || 0) + 1;
        if (typeof tp === 'object' && tp !== null) {
          toppingMeta[tid] = { name: tp.name || tid, price: typeof tp.price === 'number' ? tp.price : 0 };
          toppingRevenue[tid] = (toppingRevenue[tid] || 0) + (typeof tp.price === 'number' ? tp.price : 0);
        } else {
          if (!toppingMeta[tid]) {
            const def = DEFAULT_TOPPINGS.find(t => t.id === tid);
            if (def) toppingMeta[tid] = { name: def.name, price: def.price };
          }
          if (toppingMeta[tid]) {
            toppingRevenue[tid] = (toppingRevenue[tid] || 0) + toppingMeta[tid].price;
          }
        }
      });
    });
    total += s.total;
  });
  const liveIds = new Set(TOPPINGS.map(t => t.id));
  const deletedToppings = Object.keys(toppingCounts)
    .filter(tid => !liveIds.has(tid))
    .map(tid => ({
      id: tid,
      name: (toppingMeta[tid] && toppingMeta[tid].name) || tid,
      price: (toppingMeta[tid] && toppingMeta[tid].price) || 0,
      qty: toppingCounts[tid] || 0,
      revenue: toppingRevenue[tid] || 0,
    }));
  return {
    kakigori, kakigoriRevenue, kakigoriByPrice,
    toppingCounts, toppingRevenue, toppingMeta, deletedToppings,
    total, transactions: all.length, byDate
  };
}

/* 価格キー昇順で並んだ [price, qty] の配列を返すヘルパー */
function sortedKakigoriPrices(kakigoriByPrice) {
  return Object.entries(kakigoriByPrice || {})
    .map(([p, q]) => [parseInt(p, 10), q])
    .filter(([p, q]) => q > 0)
    .sort((a, b) => a[0] - b[0]);
}

function openToday() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const end = start + 86400000 - 1;
  const a = aggregateRange(start, end);
  document.getElementById('today-date').textContent = `本日 ${fmtDateJP(start)}（${getDayOfWeek(start)}）`;
  /* ★v19: かき氷を価格別に分けて表示 (¥250 / ¥300) */
  const kakigoriRows = sortedKakigoriPrices(a.kakigoriByPrice).map(([price, qty]) => ({
    name: 'かき氷',
    unit: price,
    qty,
    revenue: price * qty,
  }));
  /* 売上ゼロでも常に「かき氷」一行を残す */
  const lines = [
    ...(kakigoriRows.length ? kakigoriRows : [{ name: 'かき氷', unit: null, qty: 0, revenue: 0 }]),
    ...TOPPINGS.map(t => ({
      name: t.name, unit: t.price,
      qty: a.toppingCounts[t.id] || 0,
      revenue: (a.toppingCounts[t.id] || 0) * t.price,
    })),
  ];
  document.getElementById('today-breakdown').innerHTML = lines.map(l => `
    <div class="bd-row">
      <div class="name">${escapeHtml(l.name)}</div>
      <div class="unit">${l.unit !== null ? `¥${fmtNum(l.unit)}` : '−'}</div>
      <div class="qty"><span class="x">×</span>${l.qty}</div>
      <div class="sum"><span class="yen">¥</span>${fmtNum(l.revenue)}</div>
    </div>`).join('');
  document.getElementById('today-total').textContent = fmtNum(a.total);
  document.getElementById('today-meta').textContent =
    `取引 ${a.transactions} 件 / 平均 ¥${a.transactions ? fmtNum(Math.round(a.total / a.transactions)) : 0}`;
  /* 取引一覧 (削除可) */
  renderTodayTransactions(start, end);
  document.getElementById('today-modal').classList.add('show');
}
function closeToday() { document.getElementById('today-modal').classList.remove('show'); }

/* 本日の取引リストを描画。各取引に [削除] ボタン付き (会計ミス時の修正用) */
function renderTodayTransactions(startTs, endTs) {
  const cont = document.getElementById('today-transactions');
  if (!cont) return;
  const sales = loadSales()
    .filter(s => s.ts >= startTs && s.ts <= endTs)
    .sort((a, b) => b.ts - a.ts);   // 新しい順
  if (sales.length === 0) {
    cont.innerHTML = '<div class="tx-empty">本日の取引はまだありません</div>';
    return;
  }
  cont.innerHTML = sales.map(s => {
    const dt = new Date(s.ts);
    const time = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    const itemsSummary = (s.items || []).map(it => {
      let part = escapeHtml(it.flavor || '');
      const tops = (it.toppings || []).map(t => typeof t === 'string'
        ? (TOPPINGS.find(x => x.id === t)?.name || t)
        : (t.name || t.id || '')).filter(Boolean);
      if (tops.length) part += '<span class="tx-tops">+' + tops.map(escapeHtml).join('+') + '</span>';
      return part;
    }).join('・');
    return `
      <div class="tx-row" data-tx-id="${escapeAttr(s.id)}">
        <div class="tx-time">${time}</div>
        <div class="tx-items">${itemsSummary || '(空)'}</div>
        <div class="tx-total">¥${fmtNum(s.total || 0)}</div>
        <button class="tx-delete" type="button" data-action="delete-tx" data-id="${escapeAttr(s.id)}">削除</button>
      </div>`;
  }).join('');
}

/* 取引削除 (誤会計の取消) */
function deleteTransaction(id) {
  if (!confirm('この取引を削除します。よろしいですか？\n（売上集計から取り除かれます）')) return;
  try {
    const sales = loadSales().filter(s => s.id !== id);
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    showToast('取引を削除しました');
    openToday();   /* 再描画 */
  } catch (e) {
    alert('削除に失敗しました: ' + (e && e.message));
  }
}

/* ===== Ledger view ===== */
function setPreset(kind) {
  const today = new Date();
  let from;
  if (kind === 7 || kind === 30 || kind === 90) {
    from = new Date(today.getTime() - (kind - 1) * 86400000);
  } else if (kind === 'month') {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (kind === 'all') {
    const all = loadSales();
    from = all.length ? new Date(all[0].ts) : today;
  } else {
    from = today;
  }
  document.getElementById('ledger-from').value = dateKey(from.getTime());
  document.getElementById('ledger-to').value   = dateKey(today.getTime());
  renderLedger();
}

function renderLedger() {
  const fromVal = document.getElementById('ledger-from').value;
  const toVal   = document.getElementById('ledger-to').value;
  if (!fromVal || !toVal) return;
  const fromTs = new Date(fromVal + 'T00:00:00').getTime();
  const toTs   = new Date(toVal + 'T23:59:59').getTime();
  const a = aggregateRange(fromTs, toTs);

  document.getElementById('ledger-total').textContent = fmtNum(a.total);
  document.getElementById('ledger-meta').textContent =
    `取引 ${a.transactions} 件 / 平均 ¥${a.transactions ? fmtNum(Math.round(a.total / a.transactions)) : 0}`;

  /* ★v19: かき氷を価格別に分けて行表示 (¥250 / ¥300) */
  const kakigoriRowsLedger = sortedKakigoriPrices(a.kakigoriByPrice).map(([price, qty]) => ({
    name: 'かき氷', unit: price, qty, revenue: price * qty, deleted: false,
  }));
  // Wave3 #14: 削除済みトッピングを「（削除済）」表示で含める
  const lines = [
    ...(kakigoriRowsLedger.length ? kakigoriRowsLedger : [{ name: 'かき氷', unit: null, qty: 0, revenue: 0, deleted: false }]),
    ...TOPPINGS.map(t => ({
      name: t.name, unit: t.price,
      qty: a.toppingCounts[t.id] || 0,
      revenue: (a.toppingCounts[t.id] || 0) * t.price,
      deleted: false,
    })),
    ...a.deletedToppings.map(d => ({
      name: `${d.name}（削除済）`,
      unit: d.price,
      qty: d.qty,
      revenue: d.revenue,
      deleted: true,
    })),
  ];
  document.getElementById('breakdown-body').innerHTML = lines.map(l => `
    <tr${l.deleted ? ' style="opacity:0.6;"' : ''}>
      <td>${escapeHtml(l.name)}</td>
      <td>${l.unit !== null ? `<span class="yen">¥</span>${fmtNum(l.unit)}` : '−'}</td>
      <td>${fmtNum(l.qty)}</td>
      <td><span class="yen">¥</span>${fmtNum(l.revenue)}</td>
    </tr>`).join('');

  // Daily table
  const headers = ['日付', 'かき氷', ...TOPPINGS.map(t => t.name), '取引', '売上'];
  document.getElementById('daily-thead').innerHTML =
    `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;

  const dates = Object.keys(a.byDate).sort((x, y) => y.localeCompare(x));
  if (dates.length === 0) {
    document.getElementById('daily-body').innerHTML =
      `<tr><td colspan="${headers.length}" style="text-align:center; color:var(--ink-3); padding:24px;">該当期間にデータがありません</td></tr>`;
  } else {
    document.getElementById('daily-body').innerHTML = dates.map(k => {
      const r = a.byDate[k];
      const [y, m, d] = k.split('-');
      const cells = [
        `${y}.${m}.${d}`,
        r.kakigori,
        ...TOPPINGS.map(t => r.toppings[t.id] || 0),
        r.tx,
        `<span class="yen">¥</span>${fmtNum(r.total)}`,
      ];
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    }).join('');
  }
}

/* ===== Settings view ===== */
/* P1-20: ▲▼ を SVG に置換 */
const ARROW_UP_SVG   = '<svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M5 0 L10 6 L0 6 Z" fill="currentColor"/></svg>';
const ARROW_DOWN_SVG = '<svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M0 0 L10 0 L5 6 Z" fill="currentColor"/></svg>';

function renderSettings() {
  document.getElementById('flavor-count').textContent = `${FLAVORS.length} 品`;
  document.getElementById('topping-count').textContent = `${TOPPINGS.length} 種`;

  const fbody = document.getElementById('settings-flavors');
  fbody.innerHTML = FLAVORS.map((f, i) => `
    <tr data-flavor-idx="${i}">
      <td class="col-num">${pad(i + 1)}</td>
      <td class="col-color"><input type="color" value="${f.color}" data-action="update-flavor" data-idx="${i}" data-field="color"></td>
      <td><input type="text" class="name-input" value="${escapeAttr(f.name)}" data-action="update-flavor" data-idx="${i}" data-field="name"></td>
      <td class="col-price"><input type="number" class="price-input" value="${f.price}" data-action="update-flavor" data-idx="${i}" data-field="price" inputmode="numeric" min="0" step="10"></td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="icon-btn arrow" data-action="move-flavor" data-idx="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="上へ">${ARROW_UP_SVG}</button>
          <button class="icon-btn arrow" data-action="move-flavor" data-idx="${i}" data-dir="1" ${i === FLAVORS.length - 1 ? 'disabled' : ''} aria-label="下へ">${ARROW_DOWN_SVG}</button>
          <button class="icon-btn danger" data-action="delete-flavor" data-idx="${i}">削除</button>
        </div>
      </td>
    </tr>`).join('');

  const tbody = document.getElementById('settings-toppings');
  tbody.innerHTML = TOPPINGS.map((t, i) => `
    <tr data-topping-idx="${i}">
      <td><input type="text" class="name-input" value="${escapeAttr(t.name)}" data-action="update-topping" data-idx="${i}" data-field="name"></td>
      <td class="col-price"><input type="number" class="price-input" value="${t.price}" data-action="update-topping" data-idx="${i}" data-field="price" inputmode="numeric" min="0" step="10"></td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="icon-btn arrow" data-action="move-topping" data-idx="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="上へ">${ARROW_UP_SVG}</button>
          <button class="icon-btn arrow" data-action="move-topping" data-idx="${i}" data-dir="1" ${i === TOPPINGS.length - 1 ? 'disabled' : ''} aria-label="下へ">${ARROW_DOWN_SVG}</button>
          <button class="icon-btn danger" data-action="delete-topping" data-idx="${i}">削除</button>
        </div>
      </td>
    </tr>`).join('');

  renderBackupStatus();
  renderWakeLockToggle();
}

function flashRow(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.remove('saved-flash'); void el.offsetWidth;
  el.classList.add('saved-flash');
}

function updateFlavor(idx, field, value) {
  if (!FLAVORS[idx]) return;
  // Wave3 #4: 価格は負数禁止 + NaN 防御
  if (field === 'price') value = Math.max(0, parseInt(value, 10) || 0);
  FLAVORS[idx][field] = value;
  persistFlavors();
  flashRow(`tr[data-flavor-idx="${idx}"]`);
}
function moveFlavor(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= FLAVORS.length) return;
  [FLAVORS[idx], FLAVORS[j]] = [FLAVORS[j], FLAVORS[idx]];
  persistFlavors();
  renderSettings();
}
function deleteFlavor(idx) {
  if (!confirm(`「${FLAVORS[idx].name}」を品書きから削除します。よろしいですか？`)) return;
  FLAVORS.splice(idx, 1);
  persistFlavors();
  renderSettings();
}
function addFlavor() {
  FLAVORS.push({ name: '新しい品', color: '#999999', price: FLAVORS[0]?.price || 250 });
  persistFlavors();
  renderSettings();
  setTimeout(() => {
    const last = document.querySelector(`tr[data-flavor-idx="${FLAVORS.length - 1}"] .name-input`);
    if (last) { last.focus(); last.select(); }
  }, 50);
}

function updateTopping(idx, field, value) {
  if (!TOPPINGS[idx]) return;
  // Wave3 #4: 価格は負数禁止 + NaN 防御
  if (field === 'price') value = Math.max(0, parseInt(value, 10) || 0);
  TOPPINGS[idx][field] = value;
  persistToppings();
  flashRow(`tr[data-topping-idx="${idx}"]`);
}
function moveTopping(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= TOPPINGS.length) return;
  [TOPPINGS[idx], TOPPINGS[j]] = [TOPPINGS[j], TOPPINGS[idx]];
  persistToppings();
  renderSettings();
}
function deleteTopping(idx) {
  if (!confirm(`「${TOPPINGS[idx].name}」をトッピングから削除します。よろしいですか？`)) return;
  TOPPINGS.splice(idx, 1);
  persistToppings();
  renderSettings();
}
function addTopping() {
  let n = 1;
  while (TOPPINGS.find(t => t.id === `t_${n}`)) n++;
  TOPPINGS.push({ id: `t_${n}`, name: '新しいトッピング', price: 50 });
  persistToppings();
  renderSettings();
  setTimeout(() => {
    const last = document.querySelector(`tr[data-topping-idx="${TOPPINGS.length - 1}"] .name-input`);
    if (last) { last.focus(); last.select(); }
  }, 50);
}

/* ===== Data management ===== */
function exportJSON() {
  const data = {
    brand: '朝日製氷',
    exportedAt: new Date().toISOString(),
    flavors: FLAVORS,
    toppings: TOPPINGS,
    sales: loadSales(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asahi-seihyou-backup-${dateKey(Date.now())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  // §9.3: 最終バックアップ日時記録 (Wave3 #16: try/catch)
  try { localStorage.setItem(LAST_BACKUP_KEY, String(Date.now())); } catch {}
  renderBackupStatus();
  showToast('バックアップを書き出しました');
}

/* Wave3 #3: importJSON 型検証 — 信頼境界の入口。プロトタイプ汚染・不正型を弾く */
function validateImport(data) {
  if (!data || typeof data !== 'object') return '不正な形式: オブジェクトではありません';
  // 各セクションは存在する場合は配列であること (省略可)
  if ('flavors' in data && !Array.isArray(data.flavors)) return '不正な形式: flavors が配列ではありません';
  if ('toppings' in data && !Array.isArray(data.toppings)) return '不正な形式: toppings が配列ではありません';
  if ('sales' in data && !Array.isArray(data.sales)) return '不正な形式: sales が配列ではありません';
  // flavors 必須フィールド: name(string), color(string), price(number>=0)
  if (Array.isArray(data.flavors)) {
    for (let i = 0; i < data.flavors.length; i++) {
      const f = data.flavors[i];
      if (!f || typeof f !== 'object') return `不正な形式: flavors[${i}] がオブジェクトではありません`;
      if (typeof f.name !== 'string' || !f.name) return `不正な形式: flavors[${i}].name`;
      if (typeof f.color !== 'string') return `不正な形式: flavors[${i}].color`;
      if (typeof f.price !== 'number' || !isFinite(f.price) || f.price < 0) return `不正な形式: flavors[${i}].price`;
    }
  }
  // toppings 必須フィールド: id(string), name(string), price(number>=0)
  if (Array.isArray(data.toppings)) {
    for (let i = 0; i < data.toppings.length; i++) {
      const t = data.toppings[i];
      if (!t || typeof t !== 'object') return `不正な形式: toppings[${i}] がオブジェクトではありません`;
      if (typeof t.id !== 'string' || !t.id) return `不正な形式: toppings[${i}].id`;
      if (typeof t.name !== 'string' || !t.name) return `不正な形式: toppings[${i}].name`;
      if (typeof t.price !== 'number' || !isFinite(t.price) || t.price < 0) return `不正な形式: toppings[${i}].price`;
    }
  }
  // sales 必須フィールド: id, ts(number), items(array), total(number)
  if (Array.isArray(data.sales)) {
    for (let i = 0; i < data.sales.length; i++) {
      const s = data.sales[i];
      if (!s || typeof s !== 'object') return `不正な形式: sales[${i}] がオブジェクトではありません`;
      if (typeof s.id === 'undefined') return `不正な形式: sales[${i}].id`;
      if (typeof s.ts !== 'number' || !isFinite(s.ts)) return `不正な形式: sales[${i}].ts`;
      if (!Array.isArray(s.items)) return `不正な形式: sales[${i}].items`;
      if (typeof s.total !== 'number' || !isFinite(s.total)) return `不正な形式: sales[${i}].total`;
    }
  }
  return null; // OK
}

function importJSON() {
  const input = document.getElementById('import-file');
  input.value = '';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        const err = validateImport(data);
        if (err) {
          alert(err + '\nバックアップファイルを確認してください。');
          return;
        }
        if (!confirm('現在のデータを上書きします。よろしいですか？')) return;
        if (data.flavors)  { FLAVORS = data.flavors;   saveJSON(FLAVORS_KEY, FLAVORS); }
        if (data.toppings) { TOPPINGS = data.toppings; saveJSON(TOPPINGS_KEY, TOPPINGS); }
        if (data.sales)    {
          try { localStorage.setItem(SALES_KEY, JSON.stringify(data.sales)); }
          catch (e) {
            alert('販売履歴の保存に失敗しました。容量不足の可能性があります。');
            return;
          }
        }
        renderSettings();
        refreshAfterChange();
        showToast('復元しました');
      } catch (e) {
        alert('読み込みに失敗しました: ' + e.message);
      }
    };
    r.readAsText(file);
  };
  input.click();
}

function resetSampleData() {
  if (!confirm('サンプル取引履歴のみを削除します（実際の販売記録は保持）。よろしいですか？')) return;
  const real = loadSales().filter(s => !String(s.id).startsWith('sample-'));
  try { localStorage.setItem(SALES_KEY, JSON.stringify(real)); }
  catch (e) { alert('保存に失敗しました: ' + e.message); return; }
  showToast('サンプルを削除しました');
}

/* Wave3 #8: 破壊系クールダウン ダイアログ
   confirm 後にカウントダウン (3→2→1) が完了するまで「削除」ボタンを enable しない。
   キャンセル可能。 */
function destructiveCooldownDialog(title, body, onConfirm) {
  // 既存の overlay があれば除去
  const existing = document.getElementById('destructive-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'destructive-overlay';
  overlay.className = 'modal-overlay show';
  overlay.style.zIndex = '300';
  overlay.innerHTML = `
    <div class="modal" role="alertdialog" aria-labelledby="dco-title">
      <div class="modal-title" id="dco-title">${escapeHtml(title)}</div>
      <div class="today-date" style="margin-top:18px; line-height:1.8;">${escapeHtml(body)}</div>
      <div class="modal-actions">
        <button data-dco="cancel">キャンセル</button>
        <button class="primary" data-dco="confirm" disabled>3</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const confirmBtn = overlay.querySelector('[data-dco="confirm"]');
  const cancelBtn = overlay.querySelector('[data-dco="cancel"]');

  let secs = 3;
  confirmBtn.textContent = `${secs}...`;
  const timer = setInterval(() => {
    secs--;
    if (secs > 0) {
      confirmBtn.textContent = `${secs}...`;
    } else {
      clearInterval(timer);
      confirmBtn.textContent = '削除';
      confirmBtn.disabled = false;
    }
  }, 1000);

  function close() {
    clearInterval(timer);
    overlay.remove();
  }
  cancelBtn.addEventListener('click', close, { once: true });
  confirmBtn.addEventListener('click', () => {
    close();
    onConfirm();
  }, { once: true });
  // 背景クリックでキャンセル
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

function clearAllSales() {
  if (!confirm('全ての販売履歴を消去します。この操作は元に戻せません。')) return;
  // Wave3 #8: 二段目を 3秒クールダウン付きカスタムダイアログに置換
  destructiveCooldownDialog(
    '本当によろしいですか？',
    'すべての売上データが消えます。元に戻せません。3秒後に「削除」ボタンが押せるようになります。',
    () => {
      try { localStorage.setItem(SALES_KEY, '[]'); }
      catch (e) { alert('保存に失敗しました: ' + e.message); return; }
      showToast('販売履歴を全消去しました');
    }
  );
}

function resetSettings() {
  // Wave3 #13: confirm 文言にカートリセットも明記
  if (!confirm('カートと設定（品書き・トッピング）が初期値にリセットされます。販売履歴は保持されます。よろしいですか？')) return;
  // Wave3 #8: 二段目クールダウン
  destructiveCooldownDialog(
    '初期値に戻しますか？',
    'カート内の商品も消去され、品書き・トッピングが工場出荷時に戻ります。3秒後に「削除」ボタンが押せるようになります。',
    () => {
      FLAVORS  = DEFAULT_FLAVORS.slice();
      TOPPINGS = DEFAULT_TOPPINGS.slice();
      try {
        saveJSON(FLAVORS_KEY, FLAVORS);
        saveJSON(TOPPINGS_KEY, TOPPINGS);
      } catch (e) { alert('保存に失敗しました: ' + e.message); return; }
      // Wave3 #13: cart クリア
      cart = [];
      nextId = 1;
      clearCartDraft();
      renderSettings();
      refreshAfterChange();
      showToast('初期値に戻しました');
    }
  );
}

/* §9.3: 最終バックアップ日時表示 */
function renderBackupStatus() {
  const el = document.getElementById('backup-status');
  if (!el) return;
  const ts = parseInt(localStorage.getItem(LAST_BACKUP_KEY) || '0', 10);
  if (!ts) {
    el.textContent = '最終バックアップ: 未取得';
    return;
  }
  const days = Math.floor((Date.now() - ts) / 86400000);
  el.textContent = `最終バックアップ: ${fmtDateJP(ts)}（${days === 0 ? '本日' : days + '日前'}）`;
}

/* 初回起動時にFLAVORS_KEY/TOPPINGS_KEYが空でも、デフォルトを必ず書き込む。
 * これがないと「サンプル販売は seed されたが、味設定は書かれていない」状態になり、
 * healthCheck() が「設定データが失われています」と毎回誤警告する。*/
function ensureDefaultsInitialized() {
  try {
    if (localStorage.getItem(FLAVORS_KEY) === null) {
      localStorage.setItem(FLAVORS_KEY, JSON.stringify(FLAVORS));
    }
    if (localStorage.getItem(TOPPINGS_KEY) === null) {
      localStorage.setItem(TOPPINGS_KEY, JSON.stringify(TOPPINGS));
    }
  } catch (e) {
    console.warn('[ensureDefaultsInitialized] failed:', e && e.message);
  }
}

/* §9.4: 起動時整合性チェック (false-positive 修正版)
 * 以前: flavors/toppings が null → 即アラート → 初回起動でも誤発火
 * 今: ensureDefaultsInitialized() で常にキーを保証してからチェック
 *     → 真の異常 (サンプル後にユーザー操作で書き込まれた設定が消えた等) のみアラート */
function healthCheck() {
  // この時点で ensureDefaultsInitialized() が走っているので、
  // FLAVORS_KEY/TOPPINGS_KEY は必ず存在する。
  // localStorage.setItem 自体が失敗するレベルの異常時のみアラートする。
  try {
    const flavorsRaw = localStorage.getItem(FLAVORS_KEY);
    const toppingsRaw = localStorage.getItem(TOPPINGS_KEY);
    if (flavorsRaw === null || toppingsRaw === null) {
      // ensureDefaultsInitialized 後でも null = ストレージが書き込み拒否されている
      // (例: iOS ITP, ストレージ無効化、quota exceeded)
      console.warn('[healthCheck] localStorage write seems blocked');
    }
    // ユーザー操作起点のリストアは設定画面の「JSONバックアップから復元」ボタン経由のみ。
    // 起動時の自動 confirm() は廃止 (false-positive と UX阻害の両面で有害)。
  } catch (e) {
    console.warn('[healthCheck] failed:', e && e.message);
  }
}

/* §10: Wake Lock */
let wakeLock = null;
let wakeLockEnabled = false;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return false;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { /* visibilitychange で再取得 */ });
    return true;
  } catch (e) {
    return false;
  }
}
function releaseWakeLock() {
  if (wakeLock) {
    try { wakeLock.release(); } catch {}
    wakeLock = null;
  }
}
async function toggleWakeLock() {
  wakeLockEnabled = !wakeLockEnabled;
  // Wave3 #16: try/catch
  try { localStorage.setItem(WAKELOCK_KEY, wakeLockEnabled ? '1' : '0'); } catch {}
  if (wakeLockEnabled) {
    const ok = await acquireWakeLock();
    if (!ok) {
      showToast('スリープ防止が有効化できませんでした');
      wakeLockEnabled = false;
      try { localStorage.setItem(WAKELOCK_KEY, '0'); } catch {}
    } else {
      showToast('営業中はスリープしません');
    }
  } else {
    releaseWakeLock();
    showToast('スリープ防止を解除しました');
  }
  renderWakeLockToggle();
}
function renderWakeLockToggle() {
  const el = document.getElementById('wakelock-toggle');
  if (!el) return;
  el.textContent = `スリープ防止: ${wakeLockEnabled ? 'ON' : 'OFF'}`;
}
function initWakeLock() {
  wakeLockEnabled = localStorage.getItem(WAKELOCK_KEY) === '1';
  // 起動時自動取得は iOS では失敗する可能性が高いが試みる (visibilitychange でフォロー)
  if (wakeLockEnabled) acquireWakeLock();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wakeLockEnabled && !wakeLock) {
    acquireWakeLock();
  }
});

/* ===== Service Worker registration + update banner ===== */
/* Wave3 #1: 「適用」ボタンタップ時のみ reload。controllerchange での自動 reload は廃止
   (取引中の controllerchange 事故防止: 別タブ更新で勝手にreloadさせない) */
let userInitiatedReload = false;
function showUpdateBanner(onAccept) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span class="toast-msg">更新があります</span><button data-action="apply-update" type="button">適用</button>`;
  t.classList.add('show');
  // 自動 hide キャンセル
  clearTimeout(t._hideTimer);
  const btn = t.querySelector('[data-action="apply-update"]');
  if (btn) btn.addEventListener('click', () => {
    userInitiatedReload = true;
    btn.disabled = true;
    btn.textContent = '更新中…';
    try { onAccept(); } catch (_) {}
    /* フェイルセーフ: controllerchangeが来なくても 1.5秒後に必ず reload
     * (新SWが既にactive状態 / postMessage失敗 / SW未登録環境 などの救済)
     * controllerchange側でも reload するが、location.reload は idempotent */
    setTimeout(() => { window.location.reload(); }, 1500);
  }, { once: true });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    /* updateViaCache:'none' → ブラウザのHTTPキャッシュをバイパスして毎回sw.jsを fetch。
     * これがないと max-age に従い 24h 古いSWが残り続ける。 */
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
      /* 起動時に明示的に update チェック (auto checkに依存しない) */
      try { reg.update(); } catch {}
      /* 5分ごとに再チェック (常駐POSでも更新を逃さない) */
      setInterval(() => { try { reg.update(); } catch {} }, 5 * 60 * 1000);

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // 新版スタンバイ完了 → 必ずユーザータップで適用 (取引中事故防止)
            showUpdateBanner(() => newSW.postMessage('SKIP_WAITING'));
          }
        });
      });

      /* 既に waiting 状態の SW がある場合 (前回 update中にアプリ閉じた等) も検知 */
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(() => reg.waiting.postMessage('SKIP_WAITING'));
      }
    }).catch(() => { /* 登録失敗してもアプリは動作 */ });

    // ユーザーが「適用」を押した場合のみ reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!userInitiatedReload) return;
      window.location.reload();
    });
  });
}

/* ===== Event delegation ===== */
function bindEvents() {
  // checkout
  document.getElementById('checkout').addEventListener('click', doCheckout);

  // header
  document.getElementById('header-buttons').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'open-today') openToday();
    else if (action === 'go-settings') { setView('settings'); renderSettings(); }
  });

  // back buttons
  document.querySelectorAll('button[data-action="go-pos"]').forEach(b =>
    b.addEventListener('click', () => setView('pos'))
  );

  /* お預かり/お釣り/テンキー UI 全廃止のため、関連 listener 削除済 */

  // cart list (delegation)
  document.getElementById('cart-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'toggle-topping') {
      const id = parseInt(btn.dataset.item, 10);
      toggleTopping(id, btn.dataset.topping);
    } else if (action === 'remove-item') {
      removeItem(parseInt(btn.dataset.item, 10));
    }
  });

  // ledger
  document.querySelectorAll('.preset-btn').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.preset;
      setPreset(v === 'all' || v === 'month' ? v : parseInt(v, 10));
    });
  });
  document.querySelector('button[data-action="render-ledger"]').addEventListener('click', renderLedger);

  // today modal
  document.querySelector('button[data-action="close-today"]').addEventListener('click', closeToday);
  document.querySelector('button[data-action="go-ledger"]').addEventListener('click', () => {
    closeToday(); setView('ledger'); setPreset(30);
  });
  /* 取引削除ボタン (動的生成のため delegation) */
  document.getElementById('today-transactions').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="delete-tx"]');
    if (!btn) return;
    deleteTransaction(btn.dataset.id);
  });

  // settings: tables (delegation for input change + button click)
  const settingsView = document.getElementById('view-settings');
  settingsView.addEventListener('change', (e) => {
    const t = e.target;
    const action = t.dataset.action;
    if (action === 'update-flavor') {
      const idx = parseInt(t.dataset.idx, 10);
      const field = t.dataset.field;
      let value = t.value;
      if (field === 'price') value = parseInt(value, 10) || 0;
      updateFlavor(idx, field, value);
    } else if (action === 'update-topping') {
      const idx = parseInt(t.dataset.idx, 10);
      const field = t.dataset.field;
      let value = t.value;
      if (field === 'price') value = parseInt(value, 10) || 0;
      updateTopping(idx, field, value);
    }
  });
  settingsView.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const idx = btn.dataset.idx !== undefined ? parseInt(btn.dataset.idx, 10) : undefined;
    if (action === 'add-flavor') addFlavor();
    else if (action === 'move-flavor') moveFlavor(idx, parseInt(btn.dataset.dir, 10));
    else if (action === 'delete-flavor') deleteFlavor(idx);
    else if (action === 'add-topping') addTopping();
    else if (action === 'move-topping') moveTopping(idx, parseInt(btn.dataset.dir, 10));
    else if (action === 'delete-topping') deleteTopping(idx);
    else if (action === 'export-json') exportJSON();
    else if (action === 'import-json') importJSON();
    else if (action === 'reset-sample') resetSampleData();
    else if (action === 'clear-all-sales') clearAllSales();
    else if (action === 'reset-settings') resetSettings();
    else if (action === 'toggle-wakelock') toggleWakeLock();
  });

  // overlay click closes today modal
  document.getElementById('today-modal').addEventListener('click', (e) => {
    if (e.target.id === 'today-modal') closeToday();
  });
}

/* ===== Init ===== */
function init() {
  // Wave3 #6: Storage Persistence — iOS 7日エビクション対策。失敗OK
  if (navigator.storage && typeof navigator.storage.persist === 'function') {
    navigator.storage.persist().catch(() => {});
  }
  ensureDefaultsInitialized();   /* ★必ず healthCheck より前。FLAVORS_KEY/TOPPINGS_KEY を保証 */
  clearSampleSales();            /* ★ ユーザー要求: モックデータを起動時に削除 (実会計は保持) */
  restoreCartDraft();
  renderFlavors();
  renderCart();
  updatePriceRule();
  setView('pos');
  tickClock();
  setInterval(tickClock, 30000);
  bindEvents();
  healthCheck();
  initWakeLock();
  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
