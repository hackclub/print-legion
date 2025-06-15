# Use official Node.js image as the base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend files
COPY backend ./backend

# Copy site (frontend) files
COPY site ./site

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --production || yarn install --production || pnpm install --prod

# Build frontend
WORKDIR /app/site
RUN npm install || yarn install || pnpm install
RUN npm run build

# Serve built frontend with backend
WORKDIR /app/backend

# Copy built frontend to backend's public directory (if needed)
# RUN mkdir -p ./public && cp -r /app/site/dist/* ./public/

# Expose port (Express default)
EXPOSE 3000

# Start the backend server
CMD ["node", "index.js"]
