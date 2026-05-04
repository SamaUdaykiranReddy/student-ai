FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
EXPOSE 5010
CMD ["pnpm", "dev"]