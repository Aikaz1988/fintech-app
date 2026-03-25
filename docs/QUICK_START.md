# Быстрый старт FinTrack

Короткий сценарий запуска проекта для разработчика и тестировщика.

## 1. Требования

- Node.js 18+
- npm 9+
- Аккаунт Supabase

## 2. Установка зависимостей

```bash
npm install
```

## 3. Настройка окружения

Создайте `.env` в корне проекта:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Провайдер подписок: mock (по умолчанию) или api
VITE_SUBSCRIPTIONS_PROVIDER=mock
```

Если используете реальный API подписок, добавьте:

```env
VITE_SUBSCRIPTIONS_PROVIDER=api
VITE_SUBSCRIPTIONS_API_BASE_URL=https://your-subscriptions-api.example.com
VITE_SUBSCRIPTIONS_API_ACCESS_TOKEN=...
VITE_SUBSCRIPTIONS_API_REFRESH_TOKEN=...
VITE_SUBSCRIPTIONS_API_CLIENT_ID=...
```

## 4. Применение миграций Supabase

Рекомендуемый путь:

```bash
supabase db push
```

Или выполните SQL-файлы из `supabase/migrations` по порядку timestamp.

Критично применить все миграции, включая:

- `20260316190000_consolidated_recommendations_and_security.sql`
- `20260322150000_consolidated_subscriptions_categories_notifications.sql`

## 5. Запуск

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`.

## 6. Базовая проверка

```bash
npm run typecheck
npm run lint
npm test
```

Для smoke E2E:

```bash
npm run test:e2e:smoke
```

## 7. Что проверить вручную после первого запуска

1. Регистрация/вход.
2. Создание счета на дашборде.
3. Добавление транзакции.
4. Создание бюджета и появление алертов в центре уведомлений.
5. Генерация отчета и экспорт CSV/Excel/PDF.
6. Раздел подписок (mock или api в зависимости от `VITE_SUBSCRIPTIONS_PROVIDER`).

## 8. Полезные документы

- `docs/USER_GUIDE.md` - руководство пользователя.
- `docs/ARCHITECTURE.md` - архитектурные схемы.
- `docs/DEPLOYMENT_ADMIN_GUIDE.md` - запуск и эксплуатация.
- `docs/SUPPORT_AND_MAINTENANCE.md` - поддержка и сопровождение.
