"""
ИТАЛКОФЕ — сайт на Flask с каталогом из БД, корзиной, заявками и админкой.

Как запустить:
    pip install -r requirements.txt
    python seed.py     # один раз — наполняет базу стартовым каталогом
    python app.py

Затем открыть в браузере: http://127.0.0.1:5000
Админка: http://127.0.0.1:5000/admin/login (пароль — ADMIN_PASSWORD, по умолчанию "italkofe-admin")
"""

import os
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for

from models import Order, OrderItem, Product, db

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
app.config["ADMIN_PASSWORD"] = os.environ.get("ADMIN_PASSWORD", "italkofe-admin")
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 60 * 60 * 24 * 30

db_url = os.environ.get("DATABASE_URL")
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
if not db_url:
    (BASE_DIR / "instance").mkdir(exist_ok=True)
    db_url = f"sqlite:///{BASE_DIR / 'instance' / 'italkofe.db'}"
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()


@app.template_filter("rub")
def rub_filter(value):
    if value is None:
        return ""
    return f"{value:,}".replace(",", " ") + " ₽"


# ---------- Storefront ----------

@app.get("/")
def index():
    products = (
        Product.query.filter_by(is_active=True)
        .order_by(Product.category, Product.sort_order, Product.id)
        .all()
    )
    catalog = {"coffee": {}, "tea": {}, "service": {}}
    for product in products:
        catalog.setdefault(product.category, {}).setdefault(product.group_name, []).append(product)
    return render_template("index.html", catalog=catalog)


# ---------- Advisor (retrieval over the real catalog, no LLM) ----------

CHEAP_WORDS = ("недорог", "дешев", "бюджет")


def normalize(text):
    return (text or "").lower().replace("ё", "е")


def advisor_match(query, products):
    q = normalize(query)
    scored = []
    for product in products:
        tags = product.tag_list()
        tag_score = sum(2 for tag in tags if tag in q)
        if tag_score == 0:
            continue
        score = tag_score
        if "кофе" in q and product.advisor_type == "coffee":
            score += 1
        if "чай" in q and product.advisor_type == "tea":
            score += 1
        scored.append({"product": product, "score": score})

    mentions_coffee = "кофе" in q
    mentions_tea = "чай" in q
    if mentions_tea and not mentions_coffee:
        narrowed = [r for r in scored if r["product"].advisor_type != "coffee"]
        if narrowed:
            scored = narrowed
    elif mentions_coffee and not mentions_tea:
        narrowed = [r for r in scored if r["product"].advisor_type != "tea"]
        if narrowed:
            scored = narrowed

    is_cheap = any(word in q for word in CHEAP_WORDS)
    if is_cheap:
        scored.sort(key=lambda r: r["product"].price if r["product"].price is not None else 99999)
    else:
        scored.sort(key=lambda r: -r["score"])

    if not scored:
        if mentions_coffee or mentions_tea:
            fallback = [
                p for p in products
                if (mentions_coffee and p.advisor_type == "coffee")
                or (mentions_tea and p.advisor_type == "tea")
            ]
            if is_cheap:
                fallback.sort(key=lambda p: p.price if p.price is not None else 99999)
            return {"items": fallback[:2], "fallback": True}
        return {"items": [], "fallback": False}

    return {"items": [r["product"] for r in scored[:3]], "fallback": False}


@app.get("/api/advisor")
def api_advisor():
    query = request.args.get("q", "")
    products = Product.query.filter_by(is_active=True).all()
    result = advisor_match(query, products)
    return jsonify({
        "items": [p.to_advisor_dict() for p in result["items"]],
        "fallback": result["fallback"],
    })


# ---------- Orders ----------

@app.post("/api/orders")
def api_create_order():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    comment = (data.get("comment") or "").strip()
    items_in = data.get("items") or []

    if not name or not phone:
        return jsonify({"ok": False, "error": "Укажите имя и телефон"}), 400

    order = Order(name=name, phone=phone, comment=comment)
    for raw_item in items_in:
        product = Product.query.get(raw_item.get("product_id"))
        if not product or not product.is_active or product.price is None:
            continue
        try:
            qty = max(1, int(raw_item.get("qty", 1)))
        except (TypeError, ValueError):
            qty = 1
        order.items.append(OrderItem(
            product_id=product.id,
            product_name_snapshot=product.name,
            price_snapshot=product.price,
            unit_snapshot=product.unit,
            qty=qty,
        ))

    db.session.add(order)
    db.session.commit()
    return jsonify({"ok": True, "order_id": order.id})


# ---------- Admin ----------

def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("is_admin"):
            return redirect(url_for("admin_login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    error = None
    if request.method == "POST":
        password = request.form.get("password", "")
        if password and password == app.config["ADMIN_PASSWORD"]:
            session["is_admin"] = True
            return redirect(request.args.get("next") or url_for("admin_products"))
        error = "Неверный пароль"
    return render_template("admin/login.html", error=error)


@app.get("/admin/logout")
def admin_logout():
    session.pop("is_admin", None)
    return redirect(url_for("admin_login"))


PRODUCT_FORM_FIELDS = (
    "category", "advisor_type", "group_name", "name", "description",
    "unit", "badge", "advisor_tags", "advisor_why", "price_note",
)


def _apply_product_form(product, form):
    for field in PRODUCT_FORM_FIELDS:
        setattr(product, field, (form.get(field) or "").strip() or None)
    product.group_name = product.group_name or "Без раздела"
    product.name = product.name or "Без названия"
    product.description = product.description or ""
    product.advisor_tags = product.advisor_tags or ""
    product.advisor_why = product.advisor_why or ""

    price = (form.get("price") or "").strip()
    old_price = (form.get("old_price") or "").strip()
    sort_order = (form.get("sort_order") or "0").strip()
    product.price = int(price) if price else None
    product.old_price = int(old_price) if old_price else None
    product.sort_order = int(sort_order) if sort_order else 0
    product.is_from_price = form.get("is_from_price") == "on"


@app.get("/admin/products")
@admin_required
def admin_products():
    products = Product.query.order_by(Product.is_active.desc(), Product.category, Product.sort_order).all()
    return render_template("admin/products.html", products=products)


@app.route("/admin/products/new", methods=["GET", "POST"])
@admin_required
def admin_product_new():
    if request.method == "POST":
        product = Product(category="coffee", advisor_type="coffee", group_name="", name="")
        _apply_product_form(product, request.form)
        db.session.add(product)
        db.session.commit()
        return redirect(url_for("admin_products"))
    return render_template("admin/product_form.html", product=None)


@app.route("/admin/products/<int:product_id>/edit", methods=["GET", "POST"])
@admin_required
def admin_product_edit(product_id):
    product = Product.query.get_or_404(product_id)
    if request.method == "POST":
        _apply_product_form(product, request.form)
        db.session.commit()
        return redirect(url_for("admin_products"))
    return render_template("admin/product_form.html", product=product)


@app.post("/admin/products/<int:product_id>/delete")
@admin_required
def admin_product_delete(product_id):
    product = Product.query.get_or_404(product_id)
    product.is_active = False
    db.session.commit()
    return redirect(url_for("admin_products"))


@app.post("/admin/products/<int:product_id>/restore")
@admin_required
def admin_product_restore(product_id):
    product = Product.query.get_or_404(product_id)
    product.is_active = True
    db.session.commit()
    return redirect(url_for("admin_products"))


@app.get("/admin/orders")
@admin_required
def admin_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return render_template("admin/orders.html", orders=orders)


@app.post("/admin/orders/<int:order_id>/status")
@admin_required
def admin_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    status = request.form.get("status")
    if status in ("new", "contacted", "done"):
        order.status = status
        db.session.commit()
    return redirect(url_for("admin_orders"))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
