# Deployment & Administration Guide

Документ для разработчиков и администраторов, отвечающих за развертывание и эксплуатацию FinTrack.

## 1. Требования к среде

### 1.1 Локальная разработка

- Node.js >= 18
- npm >= 9
- Supabase проект (cloud или self-hosted)
- Docker (опционально для контейнерного запуска)

### 1.2 Production

- Веб-сервер для статической раздачи (например, Nginx)
- Доступ к Supabase и миграциям
- Среда секретов (GitHub Secrets, Vercel/Netlify env, Vault)

## 2. Конфигурация системы

### 2.1 Обязательные переменные

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUBSCRIPTIONS_PROVIDER=mock
```

### 2.2 Переменные для реального API подписок

```env
VITE_SUBSCRIPTIONS_PROVIDER=api
VITE_SUBSCRIPTIONS_API_BASE_URL=https://your-subscriptions-api.example.com
VITE_SUBSCRIPTIONS_API_TIMEOUT_MS=12000
VITE_SUBSCRIPTIONS_API_ACCESS_TOKEN=...
VITE_SUBSCRIPTIONS_API_REFRESH_TOKEN=...
VITE_SUBSCRIPTIONS_API_CLIENT_ID=...
VITE_SUBSCRIPTIONS_API_REFRESH_ENDPOINT=/v1/auth/refresh
VITE_SUBSCRIPTIONS_API_TOKEN_STORAGE_KEY=fintech.subscriptions.api.tokens
```

### 2.3 Правила безопасности

- Никогда не храните production secrets в репозитории.
- Ротация ключей минимум раз в 90 дней.
- Для разных окружений используйте разные Supabase проекты.

## 3. Инструкции по сборке и развертыванию

### 3.1 Локальная разработка

```bash
npm install
supabase db push
npm run dev
```

Дополнительно перед merge:

```bash
npm run typecheck
npm run lint
npm test
```

### 3.2 Production сборка

```bash
npm ci
npm run build
npm run preview
```

### 3.3 Docker развертывание

```bash
docker compose up --build -d
```

### 3.4 Порядок применения миграций

1. Проверить список в `supabase/migrations`.
2. Применять строго по timestamp.
3. Проверить наличие и работоспособность новых таблиц:

- `notification_preferences`
- `subscription_state_overrides`
- `subscription_usage_marks`

## 4. Инструкции для эксплуатации

### 4.1 Обязательный smoke после деплоя

1. Авторизация.
2. CRUD транзакций.
3. Создание и пересчет бюджета.
4. Центр уведомлений и алерты лимитов.
5. Экспорт CSV/Excel/PDF.
6. Страница подписок и действия со статусами.
7. Банковая интеграция (симуляция импорта).

### 4.2 CI/CD последовательность

1. `typecheck` + `lint` + `unit`.
2. `build`.
3. `e2e-smoke`.
4. Deploy.
5. Post-deploy smoke.

## 5. Мониторинг и логирование

### 5.1 Что мониторить

- Доступность frontend (uptime).
- Ошибки клиента (например, Sentry).
- Ошибки Supabase запросов/политик RLS.
- Время ответа ключевых экранов.

### 5.2 Минимальные алерты

- Резкий рост frontend ошибок.
- Повторяющиеся ошибки авторизации.
- Рост ошибок экспорта и импорта.

## 6. Резервное копирование и восстановление

### 6.1 Backup

- Ежедневный backup БД.
- Отдельное хранение backup-архива.

### 6.2 Recovery

1. Оценить момент восстановления.
2. Поднять копию БД.
3. Проверить целостность таблиц.
4. Провести smoke критичных пользовательских сценариев.

Рекомендуемые цели:

- RPO <= 24 часа
- RTO <= 4 часа

## 7. Rollback-процедура

1. Остановить rollout.
2. Вернуть последнюю стабильную сборку frontend.
3. При необходимости откатить миграции только подготовленным rollback-скриптом.
4. Повторить smoke.
5. Зафиксировать инцидент и corrective actions.

## 8. Известные ограничения

- Банковый API в проекте симулируется.
- Подписки по умолчанию работают через mock provider.
- Push-уведомления зависят от разрешений браузера.
