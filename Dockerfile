# Aşama 1: Build Aşaması
FROM node:20-alpine as build

WORKDIR /app

# NPM bağımlılıklarını yükle
COPY package.json package-lock.json ./
RUN npm ci

# Kodları kopyala ve production için derle
COPY . .
RUN npm run build


# Aşama 2: Sunum Aşaması (NGINX)
FROM nginx:alpine

# Nginx varsayılan konfigürasyonunu temizle ve build edilmiş statik dosyaları aktar
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html

# İsteğe bağlı: React Router veya Vite yönlendirmeleri için Nginx ayarı eklenebilir
# Biz varsayılan Nginx davranışıyla (index.html fallback) çalışmasını sağlayacağız.
RUN echo "server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files \$uri \$uri/ /index.html; \
    } \
    location /api/ { \
    proxy_pass http://backend:8000/; \
    proxy_set_header Host \$host; \
    proxy_set_header X-Real-IP \$remote_addr; \
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; \
    } \
    }" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
