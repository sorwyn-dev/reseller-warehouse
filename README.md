# Ресейл-склад

Простой онлайн-склад для ресейла: коробки, индивидуальная закупка вещей, доставка и учёт чистой прибыли.

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

1. Создайте проект в Supabase.
2. Скопируйте `.env.example` → `.env.local` и заполните ключи.
3. Выполните SQL из `supabase/migrations/001_initial.sql` в SQL Editor.
4. Перезапустите `npm run dev`.

Пока переменные не заданы, приложение автоматически сохраняет данные локально в `data/store.json`.

## Тесты

```bash
npm test
```

Проверяются распределение доставки, фиксация себестоимости при продаже и расчёт чистой прибыли.
