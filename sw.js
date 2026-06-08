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
// v28 (2026-05-17): 味名を 20-28px に大胆拡大 (v26比+65%)、実機タブレットで確実体感。
//                    SW install を cache:'reload' に変更し、HTTPキャッシュをbypass。
//                    PWAキャッシュ残存問題を構造的に解消し「更新を押しても変わらない」を防止。
// v29 (2026-06-09): トッピング選択を項目別の和色ベタ塗りで識別化。
//                    ★更新配信の構造改善: install で self.skipWaiting() を呼び、新SWを
//                    即座に有効化(待機状態で止まらない)。activate の clients.claim() と
//                    app.js の controllerchange 自動reloadにより、「適用」タップ無しでも
//                    開き直すだけで最新が反映される(カート下書きはrestoreで保全=取引中も安全)。
//                    旧来「バナーを押さないと変わらない」問題を構造的に解消。
const VERSION = 'v20260609005143';
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
  // v29: 新SWを待機状態で止めず即座に有効化。これにより「更新があります」バナーを
  // 押し損ねても、アプリを開き直すだけで最新が配信される。reloadの是非(取引中事故防止)は
  // app.js 側の controllerchange ハンドラがカート復元前提で安全に判断する。
  self.skipWaiting();

  // v28 重要修正: cache.addAll() は内部で fetch() を呼ぶが、デフォルトでは
  // ブラウザの HTTP キャッシュを経由する。古い CSS/JS が HTTP キャッシュに
  // 残っていると、新 SW がそれを SW キャッシュに保存してしまう
  // (= 「更新」を押しても変化を感じない真因)。
  // cache: 'reload' で HTTP キャッシュを bypass し、必ず CDN から最新を取得する。
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((response) => {
              if (!response || response.status !== 200) {
                throw new Error(`Failed to fetch ${url}: ${response && response.status}`);
              }
              return cache.put(url, response);
            })
        )
      )
    )
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
