# Buvijon — Запуск проекта

## 1. Установить Node.js
Скачайте LTS версию: https://nodejs.org

## 2. Установить зависимости
```bash
cd Desktop/BUVIJON
npm install
```

## 3. Запустить
```bash
npm start
```

Откроется QR-код. Установите **Expo Go** на телефон и отсканируйте.

## 4. Для Android эмулятора
```bash
npm run android
```

## Структура проекта

```
BUVIJON/
├── app/
│   ├── (auth)/          # Вход / Регистрация
│   ├── (tabs)/          # Главные вкладки
│   │   ├── index.tsx    # 🌸 Сад (главный экран)
│   │   ├── children.tsx # 👨‍👩‍👧 Список детей
│   │   ├── reports.tsx  # 📊 Отчёты
│   │   └── settings.tsx # ⚙️  Настройки
│   └── child/[id].tsx   # Детальный экран ребёнка
├── components/
│   ├── flower/          # SVG цветки + анимации
│   └── ui/              # Button, Card, ProgressBar
├── store/               # Zustand (auth, children, settings)
├── constants/           # Цвета, тема
├── types/               # TypeScript типы
└── utils/               # Утилиты экранного времени
```

## Логика состояния цветка
- 🌸 **Цветёт** (blooming) — ≤ 75% лимита
- 🌼 **Внимание** (warning) — 76–100% лимита
- 🥀 **Увядает** (wilting) — > 100% лимита
