/* ---------- Cart ---------- */
const CART_KEY = 'italkofe-cart';
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }

const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartOverlay = document.getElementById('cartOverlay');
const cartDrawer = document.getElementById('cartDrawer');
const cartClose = document.getElementById('cartClose');
const cartItemsEl = document.getElementById('cartItems');
const cartEmptyEl = document.getElementById('cartEmpty');
const cartFootEl = document.getElementById('cartFoot');
const cartTotalEl = document.getElementById('cartTotal');
const cartView = document.getElementById('cartView');
const checkoutView = document.getElementById('checkoutView');
const checkoutSuccessView = document.getElementById('checkoutSuccessView');
const checkoutSummary = document.getElementById('checkoutSummary');
const checkoutForm = document.getElementById('checkoutForm');

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function money(n) {
  return Number(n).toLocaleString('ru-RU') + ' ₽';
}

function renderCart() {
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  cartCount.textContent = totalQty;
  cartCount.hidden = totalQty === 0;

  cartItemsEl.innerHTML = '';
  if (cart.length === 0) {
    cartEmptyEl.hidden = false;
    cartFootEl.hidden = true;
  } else {
    cartEmptyEl.hidden = true;
    cartFootEl.hidden = false;
    cart.forEach(item => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-unit">за ${item.unit}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-qty="-1">−</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-qty="1">+</button>
          </div>
          <div class="cart-item-price">${money(item.price * item.qty)}</div>
        </div>
        <button class="cart-item-remove" data-remove>✕</button>
      `;
      row.querySelector('[data-qty="-1"]').addEventListener('click', () => changeQty(item.id, -1));
      row.querySelector('[data-qty="1"]').addEventListener('click', () => changeQty(item.id, 1));
      row.querySelector('[data-remove]').addEventListener('click', () => removeItem(item.id));
      cartItemsEl.appendChild(row);
    });
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    cartTotalEl.textContent = money(total);
  }
  saveCart();
}

function addToCart(id, name, price, unit) {
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, name, price, unit, qty: 1 });
  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeItem(id);
  else renderCart();
}

function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  renderCart();
}

document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.prod-card');
    addToCart(card.dataset.id, card.dataset.name, Number(card.dataset.price), card.dataset.unit);
    btn.textContent = 'Добавлено ✓';
    btn.classList.add('added');
    setTimeout(() => { btn.textContent = 'В корзину'; btn.classList.remove('added'); }, 1400);
    openCart();
  });
});

function openCart() {
  cartOverlay.classList.add('open');
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  showView(cartView);
}
function closeCart() {
  cartOverlay.classList.remove('open');
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', 'true');
}
function showView(view) {
  [cartView, checkoutView, checkoutSuccessView].forEach(v => v.hidden = v !== view);
}

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
document.getElementById('checkoutClose').addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

document.getElementById('cartCheckoutBtn').addEventListener('click', () => {
  if (cart.length === 0) return;
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  checkoutSummary.innerHTML = `${cart.length} поз. · <strong>${money(total)}</strong>`;
  showView(checkoutView);
});

document.getElementById('checkoutBack').addEventListener('click', () => showView(cartView));

checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(checkoutForm);
  const payload = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    comment: formData.get('comment'),
    items: cart.map(i => ({ product_id: Number(i.id), qty: i.qty })),
  };
  const submitBtn = checkoutForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('request failed');
    cart = [];
    renderCart();
    checkoutForm.reset();
    showView(checkoutSuccessView);
  } catch (err) {
    alert('Не удалось отправить заказ. Попробуйте ещё раз или позвоните нам напрямую.');
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById('cartSuccessClose').addEventListener('click', closeCart);

renderCart();
