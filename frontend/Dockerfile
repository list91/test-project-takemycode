# Используем официальный образ Node.js для сборки приложения
FROM node:18-alpine as build

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Можно передать переменную окружения REACT_APP_API_URL для адреса backend
ARG REACT_APP_API_URL=http://localhost:8081
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Копируем остальные исходники
COPY . .

# Собираем production-версию фронтенда
RUN npm run build

# Production stage: только статические файлы + nginx
FROM nginx:1.25-alpine as production

# Копируем собранные файлы React из build-слоя
COPY --from=build /app/build /usr/share/nginx/html

# Копируем кастомный конфиг nginx (если есть)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
