# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# Stage 2: Serve
FROM nginx:alpine
# COPY THE CONFIG WE JUST MADE
COPY nginx-custom.conf /etc/nginx/conf.d/default.conf
# COPY THE ANGULAR BUILD (Check if your folder is 'browser' or just 'frontend')
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
