"""Наполняет базу стартовым каталогом (переносит текущие 10 позиций и теги советчика).

Запуск: python seed.py
Безопасно перезапускать — если товары уже есть, ничего не делает
(для полной пересборки удалите instance/italkofe.db и запустите заново).
"""

from app import app
from models import Product, db

PRODUCTS = [
    # ---------- Кофе ----------
    dict(
        category="coffee", advisor_type="coffee", group_name="Кофе в зёрнах и молотый", sort_order=1,
        name="FACE to FACE Speciale", description="100% арабика, средняя обжарка, зерно",
        price=1395, old_price=1895, unit="кг", badge="Хит",
        advisor_tags="мягк, без кислинк, кисл, эспрессо, фильтр, универс, хит, арабик, каждый день, основн",
        advisor_why="Мягкий сбалансированный купаж без кислинки — универсален для эспрессо и фильтра, хорош как основной кофе на каждый день.",
    ),
    dict(
        category="coffee", advisor_type="coffee", group_name="Кофе в зёрнах и молотый", sort_order=2,
        name="Бразилия Серрадо", description="100% арабика",
        price=1590, unit="кг", is_from_price=True,
        advisor_tags="мягк, орех, шоколад, низк кислот, кисл, молочн, капучино, латте, арабик",
        advisor_why="Мягкая арабика с ореховыми и шоколадными нотами и низкой кислотностью — хорошо раскрывается в молочных напитках.",
    ),
    dict(
        category="coffee", advisor_type="coffee", group_name="Кофе в зёрнах и молотый", sort_order=3,
        name="Дрип-кофе порционный", description="Для офиса и HoReCa, набор пакетиков",
        price_note="цена по объёму",
        advisor_tags="офис, удобн, без кофемашин, в дорог, путешеств, быстро, команд",
        advisor_why="Порционные пакетики без кофемашины — удобно в офис или в поездку, просто залить кипятком.",
    ),
    dict(
        category="coffee", advisor_type="coffee", group_name="Капсулы и чалды", sort_order=4,
        name="LB Caffe Crema Lungo", description="Капсулы, коробка",
        price=4490, unit="уп.",
        advisor_tags="капсул, лунго, крема, домашн кофемашин, nespresso, неспрессо",
        advisor_why="Капсулы формата лунго-крема для капсульных кофемашин — насыщенная увеличенная порция.",
    ),
    dict(
        category="coffee", advisor_type="coffee", group_name="Капсулы и чалды", sort_order=5,
        name="Aroma Classica", description="Чалды, 150 шт в упаковке",
        price=5350, unit="уп.",
        advisor_tags="чалд, домашн кофемашин, классическ эспрессо, крепк",
        advisor_why="Чалды для классического эспрессо на чалдовых кофемашинах — крепкий насыщенный вкус.",
    ),
    dict(
        category="coffee", advisor_type="coffee", group_name="Сиропы, топпинги и барные аксессуары", sort_order=6,
        name="Сироп 1883 Лайм", description="1 л",
        price=997, unit="л",
        advisor_tags="сироп, лайм, топпинг, бар",
        advisor_why="Освежающий сироп для лимонадов и бара.",
    ),
    dict(
        category="coffee", advisor_type="coffee", group_name="Сиропы, топпинги и барные аксессуары", sort_order=7,
        name="Сироп 1883 Роза", description="1 л",
        price=997, unit="л",
        advisor_tags="сироп, роза, топпинг, бар",
        advisor_why="Ароматный сироп для авторских напитков и раф-кофе.",
    ),
    dict(
        category="coffee", advisor_type="other", group_name="Сиропы, топпинги и барные аксессуары", sort_order=8,
        name="Горячий шоколад WTS?!", description="80% какао, основа для бара",
        price=1390, unit="уп.",
        advisor_tags="шоколад, не пью кофе, сладк, альтернатив, какао",
        advisor_why="Не пьёте кофе? Хороший сладкий вариант на основе какао 80%.",
    ),

    # ---------- Чай ----------
    dict(
        category="tea", advisor_type="tea", group_name="Чай пакетированный и весовой", sort_order=1,
        name="Mr.Brown, зелёный с жасмином", description="Пакетированный, 2 г × N",
        price=1190, unit="уп.",
        advisor_tags="зелен, жасмин, аромат, легк, освеж, вечер, некрепк",
        advisor_why="Зелёный чай с жасмином — лёгкий, ароматный, мягкий по крепости, хорошо освежает.",
    ),
    dict(
        category="tea", advisor_type="tea", group_name="Чай пакетированный и весовой", sort_order=2,
        name="Эрл Грей", description="Чёрный чай, 25 пакетиков",
        price=195, unit="уп.",
        advisor_tags="черн, бергамот, бодр, крепк, классическ, утр, тонизир",
        advisor_why="Чёрный чай с бергамотом — бодрящий классический вкус, хорош с утра.",
    ),
    dict(
        category="tea", advisor_type="tea", group_name="Чай пакетированный и весовой", sort_order=3,
        name="Крупнолистовой чай", description="Ассортимент сортов, развес на вынос",
        price_note="цена по весу",
        advisor_tags="лист, ценител, чайник, заварива, ассортимент, подарок, разн сорт",
        advisor_why="Ассортимент листового чая на развес — для тех, кто заваривает в чайнике и ценит вкус.",
    ),
    dict(
        category="tea", advisor_type="tea", group_name="Фильтр-пакеты и упаковка", sort_order=4,
        name="Фильтр-пакет с zip-lock", description="Металлизированный, 250 г",
        price=25, unit="шт",
        advisor_tags="фильтр-пакет, упаковка, хранение",
        advisor_why="Удобная фасовка для хранения листового чая на развес.",
    ),

    # ---------- Сервис ----------
    dict(
        category="service", advisor_type="other", group_name="Аренда и продажа кофемашин", sort_order=1,
        name="PROXIMA MiniBar S1", description="Суперавтомат, аренда в месяц",
        price=12000, old_price=15000, unit="мес", badge="Акция",
        advisor_tags="аренда, кофемашина, суперавтомат, офис",
        advisor_why="Суперавтоматическая кофемашина в аренду — без вложений в покупку, обслуживание включено.",
    ),
    dict(
        category="service", advisor_type="other", group_name="Обслуживание, ремонт и химия", sort_order=2,
        name="Ремонт и ТО кофемашин", description="Диагностика, чистка, оригинальные запчасти",
        price_note="по заявке",
        advisor_tags="ремонт, обслуживание, то, кофемашина, поломка",
        advisor_why="Диагностика, чистка и плановое ТО кофемашин и кофемолок.",
    ),
    dict(
        category="service", advisor_type="other", group_name="Обслуживание, ремонт и химия", sort_order=3,
        name="Средство от кофейных масел", description="Порошок для чистки, 1000 г",
        price=990, unit="уп.",
        advisor_tags="химия, чистка, кофемашина, масла",
        advisor_why="Порошок для удаления кофейных масел из кофемашины и кофемолки.",
    ),
    dict(
        category="service", advisor_type="other", group_name="Выездной кофейный бар", sort_order=4,
        name="Кофе-бар на мероприятие", description="Оборудование, зерно, бариста, логистика",
        price_note="расчёт по брифу",
        advisor_tags="выездной, мероприятие, бар, бариста, ивент",
        advisor_why="Кофе-бар под ключ на мероприятие: оборудование, зерно, бариста и логистика.",
    ),
]


def seed():
    with app.app_context():
        db.create_all()
        if Product.query.count() > 0:
            print(f"В базе уже {Product.query.count()} товаров — пропускаю сидинг.")
            return
        for data in PRODUCTS:
            db.session.add(Product(**data))
        db.session.commit()
        print(f"Добавлено {len(PRODUCTS)} товаров.")


if __name__ == "__main__":
    seed()
