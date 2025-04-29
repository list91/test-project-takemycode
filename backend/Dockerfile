FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Устанавливаем tsc-alias для корректной работы алиасов после сборки
RUN npm install tsc-alias --save-dev

# Копируем исходный код и конфиги
COPY . .

# Добавим отдельный шаг для вывода ошибок сборки
RUN npm run build || (echo "\n===== ОШИБКА СБОРКИ ====="; cat npm-debug.log || true; exit 1)

# Собираем приложение (alias)
RUN npm prune --production

# Диагностика: выводим содержимое dist и корня
RUN echo "\n=== dist ==="; ls -l dist; echo "\n=== корень ==="; ls -l

# Открываем порт
EXPOSE 8081

# Устанавливаем переменные окружения по умолчанию
ENV NODE_ENV=production
ENV PORT=8081

# Запускаем сервис через index.js (корректная точка входа)
CMD ["node", "dist/src/index.js"]