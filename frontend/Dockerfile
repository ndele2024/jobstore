# --- Etape 1 : construction Angular ------------------------------------------
FROM node:22-alpine AS build
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# --- Etape 2 : service statique ----------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/jobstore-frontend/browser /usr/share/nginx/html
EXPOSE 80
