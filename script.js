const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

const burger = document.getElementById('burger');
const nav = document.getElementById('mainNav');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
}));

const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

const form = document.getElementById('ctaForm');
const success = document.getElementById('formSuccess');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
  success.hidden = false;
});

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => btn.addEventListener('click', () => {
  const target = btn.dataset.tab;
  tabBtns.forEach(b => {
    b.classList.toggle('active', b === btn);
    b.setAttribute('aria-selected', String(b === btn));
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.hidden = panel.id !== `panel-${target}`;
    panel.classList.toggle('active', panel.id === `panel-${target}`);
  });
}));

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
  return n.toLocaleString('ru-RU') + ' ₽';
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

checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  cart = [];
  renderCart();
  checkoutForm.reset();
  showView(checkoutSuccessView);
});

document.getElementById('cartSuccessClose').addEventListener('click', closeCart);

renderCart();

/* ---------- Advisor (retrieval over the real catalog, no LLM) ---------- */
const ADVISOR_KB = [
  {
    id: 'face-to-face', name: 'FACE to FACE Speciale', type: 'coffee', price: 1395, unit: 'кг',
    tags: ['мягк', 'без кислинк', 'кисл', 'эспрессо', 'фильтр', 'универс', 'хит', 'арабик', 'каждый день', 'основн'],
    why: 'Мягкий сбалансированный купаж без кислинки — универсален для эспрессо и фильтра, хорош как основной кофе на каждый день.'
  },
  {
    id: 'brazil-serrado', name: 'Бразилия Серрадо', type: 'coffee', price: 1590, unit: 'кг',
    tags: ['мягк', 'орех', 'шоколад', 'низк кислот', 'кисл', 'молочн', 'капучино', 'латте', 'арабик'],
    why: 'Мягкая арабика с ореховыми и шоколадными нотами и низкой кислотностью — хорошо раскрывается в молочных напитках.'
  },
  {
    id: null, name: 'Дрип-кофе порционный', type: 'coffee', quote: true,
    tags: ['офис', 'удобн', 'без кофемашин', 'в дорог', 'путешеств', 'быстро', 'команд'],
    why: 'Порционные пакетики без кофемашины — удобно в офис или в поездку, просто залить кипятком.'
  },
  {
    id: 'lb-crema-lungo', name: 'LB Caffe Crema Lungo', type: 'coffee', price: 4490, unit: 'уп.',
    tags: ['капсул', 'лунго', 'крема', 'домашн кофемашин', 'nespresso', 'неспрессо'],
    why: 'Капсулы формата лунго-крема для капсульных кофемашин — насыщенная увеличенная порция.'
  },
  {
    id: 'aroma-classica', name: 'Aroma Classica', type: 'coffee', price: 5350, unit: 'уп.',
    tags: ['чалд', 'домашн кофемашин', 'классическ эспрессо', 'крепк'],
    why: 'Чалды для классического эспрессо на чалдовых кофемашинах — крепкий насыщенный вкус.'
  },
  {
    id: 'tea-mrbrown', name: 'Mr.Brown, зелёный с жасмином', type: 'tea', price: 1190, unit: 'уп.',
    tags: ['зелен', 'жасмин', 'аромат', 'легк', 'освеж', 'вечер', 'некрепк'],
    why: 'Зелёный чай с жасмином — лёгкий, ароматный, мягкий по крепости, хорошо освежает.'
  },
  {
    id: 'tea-earlgrey', name: 'Эрл Грей', type: 'tea', price: 195, unit: 'уп.',
    tags: ['черн', 'бергамот', 'бодр', 'крепк', 'классическ', 'утр', 'тонизир'],
    why: 'Чёрный чай с бергамотом — бодрящий классический вкус, хорош с утра.'
  },
  {
    id: null, name: 'Крупнолистовой чай', type: 'tea', quote: true,
    tags: ['лист', 'ценител', 'чайник', 'заварива', 'ассортимент', 'подарок', 'разн сорт'],
    why: 'Ассортимент листового чая на развес — для тех, кто заваривает в чайнике и ценит вкус.'
  },
  {
    id: 'hot-chocolate', name: 'Горячий шоколад WTS?!', type: 'other', price: 1390, unit: 'уп.',
    tags: ['шоколад', 'не пью кофе', 'сладк', 'альтернатив', 'какао'],
    why: 'Не пьёте кофе? Хороший сладкий вариант на основе какао 80%.'
  }
];

const ADVISOR_CHIPS = [
  'Люблю мягкий кофе без кислинки',
  'Нужен бодрящий чёрный чай',
  'Кофе для капсульной кофемашины',
  'Хочу лёгкий зелёный чай',
  'Кофе для офиса без кофемашины'
];

function advisorMatch(query) {
  const q = query.toLowerCase().replace(/ё/g, 'е');
  let scored = ADVISOR_KB.map(item => {
    const tagScore = item.tags.reduce((s, t) => s + (q.includes(t) ? 2 : 0), 0);
    let score = tagScore;
    if (q.includes('кофе') && item.type === 'coffee') score += 1;
    if (q.includes('чай') && item.type === 'tea') score += 1;
    return { item, score, tagScore };
  }).filter(r => r.tagScore > 0);

  const mentionsCoffee = q.includes('кофе');
  const mentionsTea = q.includes('чай');
  if (mentionsTea && !mentionsCoffee) {
    const teaOnly = scored.filter(r => r.item.type !== 'coffee');
    if (teaOnly.length > 0) scored = teaOnly;
  } else if (mentionsCoffee && !mentionsTea) {
    const coffeeOnly = scored.filter(r => r.item.type !== 'tea');
    if (coffeeOnly.length > 0) scored = coffeeOnly;
  }

  if (q.includes('недорог') || q.includes('дешев') || q.includes('бюджет')) {
    scored.sort((a, b) => (a.item.price || 99999) - (b.item.price || 99999));
  } else {
    scored.sort((a, b) => b.score - a.score);
  }

  if (scored.length === 0) {
    const wantsCoffee = q.includes('кофе');
    const wantsTea = q.includes('чай');
    if (wantsCoffee || wantsTea) {
      const fallback = ADVISOR_KB.filter(i =>
        (wantsCoffee && i.type === 'coffee') || (wantsTea && i.type === 'tea')
      );
      if (q.includes('недорог') || q.includes('дешев') || q.includes('бюджет')) {
        fallback.sort((a, b) => (a.price || 99999) - (b.price || 99999));
      }
      return { items: fallback.slice(0, 2), fallback: true };
    }
    return { items: [], fallback: false };
  }
  return { items: scored.slice(0, 3).map(r => r.item), fallback: false };
}

const advisorBtn = document.getElementById('advisorBtn');
const advisorPanel = document.getElementById('advisorPanel');
const advisorClose = document.getElementById('advisorClose');
const advisorMessages = document.getElementById('advisorMessages');
const advisorChips = document.getElementById('advisorChips');
const advisorForm = document.getElementById('advisorForm');
const advisorInput = document.getElementById('advisorInput');
let advisorGreeted = false;

function advisorScroll() {
  advisorMessages.scrollTop = advisorMessages.scrollHeight;
}

function addBotMessage(text, products) {
  const wrap = document.createElement('div');
  wrap.className = 'msg msg-bot';
  wrap.innerHTML = `<div>${text}</div>`;
  (products || []).forEach(item => {
    const card = document.createElement('div');
    card.className = 'msg-product';
    const priceLabel = item.price ? money(item.price) + ' / ' + item.unit : 'цена по запросу';
    card.innerHTML = `
      <div class="msg-product-name">${item.name}</div>
      <div class="msg-product-why">${item.why}</div>
      <div class="msg-product-row">
        <span class="msg-product-price">${priceLabel}</span>
        ${item.id && item.price
          ? '<button class="msg-product-btn" data-advisor-add>В корзину</button>'
          : '<a href="#cta" class="msg-product-btn quote">Узнать цену</a>'}
      </div>
    `;
    if (item.id && item.price) {
      card.querySelector('[data-advisor-add]').addEventListener('click', (e) => {
        addToCart(item.id, item.name, item.price, item.unit);
        e.target.textContent = 'Добавлено ✓';
        e.target.classList.add('added');
        setTimeout(() => { e.target.textContent = 'В корзину'; e.target.classList.remove('added'); }, 1400);
      });
    }
    wrap.appendChild(card);
  });
  advisorMessages.appendChild(wrap);
  advisorScroll();
}

function addUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-user';
  el.textContent = text;
  advisorMessages.appendChild(el);
  advisorScroll();
}

function renderChips() {
  advisorChips.innerHTML = '';
  ADVISOR_CHIPS.forEach(q => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = q;
    chip.addEventListener('click', () => askAdvisor(q));
    advisorChips.appendChild(chip);
  });
}

function askAdvisor(query) {
  addUserMessage(query);
  const { items, fallback } = advisorMatch(query);
  if (items.length === 0) {
    addBotMessage('Пока не нашла подходящий вариант в каталоге по этому описанию. Расскажите чуть подробнее о вкусе (мягкий/крепкий, с кислинкой или без) или выберите пример ниже:');
  } else if (fallback) {
    addBotMessage('Точного совпадения не нашла, но вот популярные варианты из этой категории:', items);
  } else {
    const intro = items.length === 1 ? 'Вот, что подойдёт:' : 'Вот несколько вариантов из каталога:';
    addBotMessage(intro, items);
  }
}

function openAdvisor() {
  advisorPanel.classList.add('open');
  advisorPanel.setAttribute('aria-hidden', 'false');
  if (!advisorGreeted) {
    advisorGreeted = true;
    addBotMessage('Здравствуйте! Помогу подобрать кофе или чай из каталога ИТАЛКОФЕ. Расскажите о вкусе — например, «люблю мягкий кофе без кислинки» — или выберите вариант ниже.');
    renderChips();
  }
  advisorInput.focus();
}
function closeAdvisor() {
  advisorPanel.classList.remove('open');
  advisorPanel.setAttribute('aria-hidden', 'true');
}

advisorBtn.addEventListener('click', () => {
  advisorPanel.classList.contains('open') ? closeAdvisor() : openAdvisor();
});
advisorClose.addEventListener('click', closeAdvisor);

advisorForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = advisorInput.value.trim();
  if (!val) return;
  askAdvisor(val);
  advisorInput.value = '';
});
