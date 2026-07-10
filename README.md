# NeraLens React/TypeScript

Исходный React + TypeScript проект для внутреннего аналитического дашборда NeraLens.

## Команды

```bash
npm run dev
npm run build
npm run preview
npm test
```

## Поддерживаемые данные

- CSV-логи с алиасами колонок из текущей сборки.
- XLSX/Excel-файлы, внутри которых фактически лежит CSV-поток с заголовком в `A1`.
- Несколько `sitemap.xml`.
- Один `robots.txt`.

Состояние файлов хранится в IndexedDB `ai-analytics-dashboard`, store `state`.
