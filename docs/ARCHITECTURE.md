# Архитектурные схемы FinTrack

Документ описывает архитектуру системы на уровне модулей, взаимодействий и данных.

## 1. Высокоуровневая архитектура

### 1.1 Диаграмма компонентов

```mermaid
flowchart LR
    U[Пользователь] --> FE[React Frontend]

    subgraph FE_STACK[Frontend]
      P[Pages]
      C[UI Components]
      H[Custom Hooks]
      S[Service Layer]
      I18N[i18n]
    end

    FE --> FE_STACK
    P --> C
    C --> H
    H --> S
    H --> I18N

    S --> SB[(Supabase PostgreSQL)]
    S --> AUTH[Supabase Auth]
    S --> RT[Supabase Realtime]
    S --> BANKSIM[Bank API Simulation]
    S --> SUBAPI[Subscriptions External API]

    SUBAPI -. optional .- S
```

### 1.2 Диаграмма развертывания

```mermaid
flowchart TB
    DEV[Developer/CI] --> VITE[Vite Build]
    VITE --> DIST[dist/ static assets]
    DIST --> NGINX[Nginx Container]
    NGINX --> BROWSER[User Browser]

    BROWSER --> SUPA[Supabase Cloud]
    SUPA --> DB[(PostgreSQL + RLS)]
    SUPA --> AUTH[Auth]
    SUPA --> REALTIME[Realtime]
```

## 2. Детальная архитектура

### 2.1 Основные frontend-модули

- `Dashboard`: мультивалютные счета, быстрая операция, сводка, последние транзакции.
- `Transactions`: CRUD транзакций, расширенные фильтры, управление категориями.
- `Budgets`: бюджеты по категориям, периодический расчет, визуальные алерты.
- `Analytics`: аналитические графики и список рекомендаций.
- `Reports`: генерация отчета и экспорт CSV/Excel/PDF.
- `Goals`: финансовые цели и прогресс.
- `Subscriptions`: регулярные списания, действия (pause/resume/cancel/mark_used), инсайты.
- `BankIntegration`: симулированное подключение банка и массовый импорт операций.
- `Settings`: язык и расширенные настройки уведомлений (threshold/cadence/channels).

### 2.2 Диаграмма классов (ключевые сущности)

```mermaid
classDiagram
  class Transaction {
    +id: uuid
    +user_id: uuid
    +category_id: uuid
    +amount: number
    +type: income|expense
    +date: date
    +is_imported: boolean
    +bank_account_id: uuid?
    +merchant: string?
  }

  class Budget {
    +id: uuid
    +user_id: uuid
    +category_id: uuid
    +limit_amount: number
    +month: date
  }

  class Notification {
    +id: uuid
    +user_id: uuid
    +budget_id: uuid
    +type: warning|alert
    +is_read: boolean
    +threshold_percent: number
  }

  class NotificationPreferences {
    +user_id: uuid
    +warning_threshold_percent: number
    +alert_threshold_percent: number
    +cadence_minutes: number
    +push_enabled: boolean
    +sound_enabled: boolean
    +vibration_enabled: boolean
    +notifications_paused_until: timestamptz?
  }

  class FinancialGoal {
    +id: uuid
    +user_id: uuid
    +goal_name: string
    +target_amount: number
    +current_amount: number
    +priority: low|medium|high
    +is_achieved: boolean
  }

  class SubscriptionOverride {
    +user_id: uuid
    +subscription_id: string
    +status: active|paused|cancelled
    +usage_state: active|rarely_used|unused
  }

  Transaction --> Budget : affects
  Budget --> Notification : triggers
  NotificationPreferences --> Notification : controls cadence/thresholds
```

### 2.3 Диаграммы последовательности

#### Сценарий: создание транзакции

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Transactions UI
    participant H as useTransactions
    participant S as transactions.service
    participant DB as Supabase DB

    U->>UI: Заполняет форму
    UI->>H: onSubmit(formData)
    H->>S: createTransaction(userId, formData)
    S->>DB: insert into transactions
    DB-->>S: created row
    S-->>H: OperationResult(success)
    H-->>UI: refresh list
    UI-->>U: Обновленный список
```

#### Сценарий: бюджетный алерт

```mermaid
sequenceDiagram
    participant TX as New Transaction
    participant DB as PostgreSQL Trigger
    participant NF as notifications table
    participant RT as Supabase Realtime
    participant H as useNotifications
    participant UI as NotificationCenter

    TX->>DB: INSERT transactions
    DB->>DB: check_budget_limit()
    DB->>NF: INSERT warning/alert
    NF->>RT: change event
    RT->>H: postgres_changes
    H->>UI: loadNotifications()
    UI-->>User: toast/push/sound/vibration
```

### 2.4 Диаграмма состояний (подписка)

```mermaid
stateDiagram-v2
  [*] --> active
  active --> paused: pause
  paused --> active: resume
  active --> cancelled: cancel
  paused --> cancelled: cancel
  cancelled --> [*]
```

## 3. Схема базы данных (ER)

```mermaid
erDiagram
    users_profile ||--o{ categories : owns
    users_profile ||--o{ transactions : creates
    users_profile ||--o{ budgets : manages
    users_profile ||--o{ notifications : receives
    users_profile ||--o{ financial_goals : sets
    users_profile ||--o{ bank_accounts : owns
    users_profile ||--o{ recommendations : receives
    users_profile ||--|| notification_preferences : configures
    users_profile ||--o{ subscription_state_overrides : overrides
    users_profile ||--o{ subscription_usage_marks : marks

    categories ||--o{ transactions : groups
    categories ||--o{ budgets : limits
    budgets ||--o{ notifications : raises
    bank_accounts ||--o{ transactions : source
```

## 4. Схема API и контрактов

Приложение использует Supabase как BaaS, поэтому основной API состоит из:

- Auth API (Supabase Auth).
- PostgREST-доступа к таблицам.
- RPC функций PostgreSQL.
- Realtime подписок.

### 4.1 RPC (ключевые)

- `generate_recommendations(user_id)` - автоматическая генерация рекомендаций.
- `generate_recommendations_manual(user_id)` - ручной запуск генерации (для authenticated).
- `check_budget_limit()` - триггерная функция лимитов бюджета.

### 4.2 Frontend service -> backend mapping

| Service | Основные методы | Backend target |
|---|---|---|
| `transactions.service.ts` | `getTransactions`, `createTransaction`, `createTransactionsBulk` | `transactions`, `categories`, `bank_accounts` |
| `budgets.service.ts` | `getBudgets`, `createBudget` | `budgets`, `transactions`, `categories` |
| `analytics.service.ts` | `getSummaryStats`, `getCategoryStats`, `getMonthlyTrend`, `getRecommendations` | `transactions`, `recommendations` |
| `goals.service.ts` | `getGoals`, `createGoal`, `toggleGoalAchieved` | `financial_goals` |
| `subscriptions.service.ts` | `getSubscriptions`, `applySubscriptionAction` | `subscription_state_overrides`, `subscription_usage_marks` или внешний API |
| `export.service.ts` | `exportTransactionsToCSV`, `exportReportToExcel`, `generatePDFReport` | client-side export |

### 4.3 Форматы запросов/ответов

Базовый контракт сервисов в коде:

```ts
type OperationResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

Пагинированные выборки:

```ts
type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
```

## 5. Технические ограничения

- Банковская интеграция в `bankApi.service.ts` - симуляция.
- Подписки по умолчанию работают через `mock` провайдер.
- Браузерные push-уведомления зависят от разрешений Notification API.
- Реальный backend для подписок включается только при `VITE_SUBSCRIPTIONS_PROVIDER=api` и корректном наборе токенов/URL.
