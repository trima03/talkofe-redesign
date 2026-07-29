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

/* ---------- CTA lead form (general callback request, no items) ---------- */
const ctaForm = document.getElementById('ctaForm');
const ctaSuccess = document.getElementById('formSuccess');
ctaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(ctaForm);
  const payload = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    comment: formData.get('comment'),
    items: [],
  };
  const submitBtn = ctaForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('request failed');
    ctaForm.querySelectorAll('input, textarea').forEach(el => el.disabled = true);
    ctaSuccess.hidden = false;
  } catch (err) {
    submitBtn.disabled = false;
    alert('Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам напрямую.');
  }
});
