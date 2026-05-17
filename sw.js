// 朝日製氷 POS - Service Worker
// 戦略: cache-first + バージョン固定precache (店舗にWi-Fi無し前提)
// v22 (2026-05-13): 文字視認性強化 + 品書きrename後の幽霊復活バグ修正
// v23 (2026-05-17): 会計確定ボタンの構造的可視保証 + 縦持ち時の長味名 wrap 対応
// v24 (2026-05-17): disabled CTAの視覚的存在感を確保 (bg-2塗り+1.5px濃枠)、position:sticky撤去
// v25 (2026-05-17): CTAを物理的に消えない構造に。clamp/flex-wrap撤去、!important多重防御、
//                    disabledでも濃グレー+白文字+opacity1で屋外日差し下でも確実視認
// v26 (2026-05-17): CTAをさらに太字・大型化 (font 19px/800、border 2px、min 56×130)
//                    .lbl と .val も太字800化。全機能E2E 30/30 PASS で回帰なし確認
// v27 (2026-05-17): 味名(いちご/メロン等)を 17→22px に拡大、カードのスペースをフル活用
//                    カード高さ 110px・grid 3列・padding は完全維持、文字サイズのみ拡大
const VERSION = 'v20260517171747';
const CACHE = `asahi-seihyou-${VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-167.png',
  './icons/icon-152.png',
  './icons/icon-120.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  // 味背景SVG (Wi-Fi無しオフライン起動時に画像欠落しないよう全部precache)
  './images/01-ichigo.svg',
  './images/02-melon.svg',
  './images/03-lemon.svg',
  './images/04-blue-hawaii.svg',
  './images/05-peach.svg',
  './images/06-grape.svg',
  './images/07-mango.svg',
  './images/08-cola.svg',
  './images/09-ramune.svg',
  './images/10-mizore.svg',
  './images/11-green-apple.svg',
  './images/12-red-apple.svg',
  './images/13-watermelon.svg',
  './images/14-orange.svg',
  './images/15-muscat.svg',
  './images/16-double-berry.svg',
  './images/17-hyuganatsu.svg',
  './images/18-salty-lychee.svg',
  './images/19-emerald-pine.svg',
  './images/20-cassis-orange.svg',
  './images/21-yogurt.svg',
  './images/22-matcha.svg',
  './images/23-coffee.svg',
  './images/24-black-tea.svg',
  './images/25-dracula.svg',
  './images/26-alien.svg',
  './images/27-princess.svg',
  './images/28-prince.svg',
  './images/29-power-energy.svg',
  './images/30-thunder-ginger.svg',
  './images/31-beni-imo.svg',
  './images/32-shio-mikan.svg',
  './images/33-kyoho-berry.svg',
];

self.addEventListener('install', (event) => {
  // auto-skipWaiting 削除: ユーザーが「適用」タップするまでwaiting状態を維持
  // (これがないと新SWが即座にactive化し、postMessage('SKIP_WAITING')が no-op になる)
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
