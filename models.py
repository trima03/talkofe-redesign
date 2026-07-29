from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(20), nullable=False)  # coffee | tea | service — вкладка на витрине
    advisor_type = db.Column(db.String(20), nullable=False)  # coffee | tea | other — для подбора советчиком
    group_name = db.Column(db.String(120), nullable=False)  # подраздел внутри вкладки
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(300), default="")

    price = db.Column(db.Integer, nullable=True)  # null = «цена по запросу»
    old_price = db.Column(db.Integer, nullable=True)
    unit = db.Column(db.String(20), nullable=True)  # кг / уп. / шт / мес — показывается как "/unit"
    is_from_price = db.Column(db.Boolean, default=False)  # префикс «от »
    price_note = db.Column(db.String(60), nullable=True)  # текст вместо цены, если price is None

    badge = db.Column(db.String(30), nullable=True)  # "Хит" / "Акция"
    advisor_tags = db.Column(db.Text, default="")  # ключевые слова через запятую
    advisor_why = db.Column(db.Text, default="")  # короткое обоснование рекомендации

    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)

    def tag_list(self):
        return [t.strip() for t in (self.advisor_tags or "").split(",") if t.strip()]

    def to_advisor_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "unit": self.unit,
            "why": self.advisor_why,
        }


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(40), nullable=False)
    comment = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="new")  # new | contacted | done
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("OrderItem", backref="order", cascade="all, delete-orphan")

    @property
    def total(self):
        return sum(item.price_snapshot * item.qty for item in self.items)


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)

    # снимок на момент заказа — история заявок не меняется задним числом при правке каталога
    product_name_snapshot = db.Column(db.String(200), nullable=False)
    price_snapshot = db.Column(db.Integer, nullable=False)
    unit_snapshot = db.Column(db.String(20), nullable=True)
    qty = db.Column(db.Integer, default=1)
