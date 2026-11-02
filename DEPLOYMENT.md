# Развёртывание Italkofe на Vercel + Supabase

Приложение остаётся Flask-сайтом с каталогом, корзиной, заявками и админкой.
Vercel запускает app.py; PostgreSQL в Supabase хранит данные между запусками.
Локальный запуск без DATABASE_URL по-прежнему использует SQLite.

## 1. База данных

В своём Supabase-проекте открой Connect и скопируй URI пула в Transaction mode
(порт 6543). Используй серверную роль postgres из строки подключения;
она обходит RLS. Пароль с особыми символами должен быть URL-encoded.
Не передавай URI браузеру и не добавляй его в Git.

Установи локально переменные окружения DATABASE_URL, SECRET_KEY и ADMIN_PASSWORD.
SECRET_KEY — случайная строка от 32 символов; ADMIN_PASSWORD — уникальный пароль
от 12 символов. Для проверки конфигурации хостинга также задай APP_ENV=production.

Из корня проекта выполни:

```bash
python -m pip install -r requirements.txt
python -m flask --app app init-db
python seed.py
```

init-db создаёт недостающие таблицы без удаления данных и включает RLS для
products, orders, order_items. Политики доступа через Supabase Data API не
создаются: база используется только сервером через PostgreSQL. Не добавляй
публичные политики для таблиц заявок. seed.py наполняет пустой каталог и
пропускает наполнение, если товары уже есть. Автоматической миграции старой
SQLite-базы и изменений существующих столбцов эти команды не выполняют.

## 2. Vercel

Импортируй trima03/talkofe-redesign после слияния PR. Корень проекта — корень
репозитория; приложение Flask определяется по app.py и requirements.txt.
Build Command уже задан в vercel.json: python prepare_static.py.
Не задавай Output Directory: это серверное Flask-приложение.

Добавь через настройки Environment Variables:

| Переменная | Значение |
| --- | --- |
| DATABASE_URL | URI пула Supabase Transaction mode с портом 6543 |
| SECRET_KEY | Случайная строка от 32 символов |
| ADMIN_PASSWORD | Уникальный пароль от 12 символов |

Vercel задаёт VERCEL=1 сам. Настрой переменные отдельно для Production и Preview.
Для Preview используй отдельную тестовую базу и выполни init-db и seed для неё:
заявки и изменения каталога в Preview не должны попадать в рабочую базу.

Запусти Deploy. При следующих изменениях подключённой ветки Vercel создаёт
новое развёртывание. prepare_static.py копирует static/ в public/static/:
существующие ссылки /static/... сохраняются, ресурсы отдаёт CDN.

На хостинге приложение требует PostgreSQL и собственные секреты, включает
Secure/HttpOnly cookies, использует NullPool и отключает prepared statements
для совместимости с транзакционным пулом. Соединение требует SSL.
Создание таблиц при импорте приложения на хостинге отключено.

## 3. Проверка после публикации

Открой каталог, проверь CSS/JS, запрос /api/advisor?q=кофе и отправку тестовой
заявки. Войди в /admin/login заданным паролем, проверь заявку в /admin/orders.
После нового развёртывания проверь, что заявка сохранилась в базе.
Удаление тестовых данных выполняй через свою базу отдельно.

Без подключения аккаунтов Vercel/Supabase и заполнения переменных репозиторий
готов к развёртыванию, но работающий публичный адрес ещё не создан. Тариф и
лимиты проверяются в выбранных аккаунтах; бесплатность не гарантируется кодом.

Источники:
- https://vercel.com/docs/frameworks/backend/flask
- https://supabase.com/kb/troubleshooting/using-sqlalchemy-with-supabase-FUqebT
- https://supabase.com/docs/guides/database/connecting-to-postgres
