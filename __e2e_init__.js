/* E2E視覚検証用: 実アプリにかき氷2点を投入し、各トッピングを選択状態にして再描画する。
   本番には含めない一時ファイル（検証後に削除）。 */
window.addEventListener('load', function () {
  setTimeout(function () {
    try {
      addToCart(FLAVORS[0]);            // 1点目
      addToCart(FLAVORS[1]);            // 2点目
      // 1点目: ミルク(藍) + ジョージ(朱)
      if (cart[0]) { cart[0].toppings.milk.active = true; cart[0].toppings.george.active = true; }
      // 2点目: スプーン(苔) + トムジェリ(琥珀)
      if (cart[1]) { cart[1].toppings.spoon.active = true; cart[1].toppings.tomjerry.active = true; }
      renderCart();
    } catch (e) {
      document.title = 'E2E_ERROR: ' + e.message;
      var d = document.createElement('div');
      d.id = 'e2e-error';
      d.textContent = 'E2E_ERROR: ' + e.message;
      document.body.appendChild(d);
    }
  }, 400);
});
