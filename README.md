# secretwr

Онлайн-склад магазина secretwr: коробки, индивидуальная закупка вещей, доставка и учёт чистой прибыли.

## Стек

- Next.js + TypeScript
- Tailwind CSS
- UI-компоненты в стиле shadcn/ui
- Supabase (или локальный `data/store.json`, если Supabase не настроен)

## Быстрый старт

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Supabase

1. Скопируйте `.env.example` → `.env.local` и укажите:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
2. В [SQL Editor](https://supabase.com/dashboard/project/_/sql/new) выполните файл
   `supabase/migrations/001_initial.sql`.
3. Перезапустите `npm run dev`.

Клиенты находятся в `src/utils/supabase/` (browser / server / middleware).
Пока таблицы не созданы, запросы к Supabase вернут ошибку — сначала примените миграцию.

## Тесты

```bash
npm test
```

Проверяются распределение доставки, фиксация себестоимости при продаже и расчёт чистой прибыли.
