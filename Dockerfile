# ==============================================================================
# STAGE 1: Build the React client frontend
# ==============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependencies manifest and lockfile
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source files and compile static bundle
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# STAGE 2: Compile the Express backend server
# ==============================================================================
FROM node:22-alpine AS backend-builder
WORKDIR /app

# Install native build tools for compiling the 'usb' module via node-gyp on Alpine
RUN apk add --no-cache python3 make g++ libusb-dev linux-headers eudev-dev

# Copy dependencies manifest and lockfile
COPY package*.json ./
RUN npm ci

# Copy TypeScript configs and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# ==============================================================================
# STAGE 3: Final lightweight production runner image
# ==============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# Set production flags and environment defaults (runs in virtual mock mode in Docker by default)
ENV NODE_ENV=production
ENV NFC__MODE=mock

# Install native runtime dependencies for USB communication
RUN apk add --no-cache libusb eudev-libs

# Copy package manifests
COPY package*.json ./

# Install node-gyp compilation dependencies temporarily to build production packages, then clean up
RUN apk add --no-cache --virtual .build-deps python3 make g++ libusb-dev linux-headers eudev-dev \
    && npm ci --omit=dev \
    && apk del .build-deps

# Copy production compiled code from stage builders
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy default runtime JSON data files
COPY config.json ./config.json

# Expose standard NFC server port
EXPOSE 3000

# Start server using the compiled dist bundle
CMD ["node", "dist/index.js"]
