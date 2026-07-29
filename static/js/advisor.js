/* ---------- Advisor (retrieval over the real DB catalog via /api/advisor, no LLM) ---------- */
const ADVISOR_CHIPS = [
  'Люблю мягкий кофе без кислинки',
  'Нужен бодрящий чёрный чай',
  'Кофе для капсульной кофемашины',
  'Хочу лёгкий зелёный чай',
  'Кофе для офиса без кофемашины',
];

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
        addToCart(String(item.id), item.name, item.price, item.unit);
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

async function askAdvisor(query) {
  addUserMessage(query);
  try {
    const res = await fetch('/api/advisor?q=' + encodeURIComponent(query));
    if (!res.ok) throw new Error('request failed');
    const data = await res.json();
    if (data.items.length === 0) {
      addBotMessage('Пока не нашла подходящий вариант в каталоге по этому описанию. Расскажите чуть подробнее о вкусе (мягкий/крепкий, с кислинкой или без) или выберите пример ниже:');
    } else if (data.fallback) {
      addBotMessage('Точного совпадения не нашла, но вот популярные варианты из этой категории:', data.items);
    } else {
      const intro = data.items.length === 1 ? 'Вот, что подойдёт:' : 'Вот несколько вариантов из каталога:';
      addBotMessage(intro, data.items);
    }
  } catch (err) {
    addBotMessage('Не получилось получить рекомендации — попробуйте ещё раз чуть позже.');
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
