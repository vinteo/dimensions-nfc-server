# LEGO Dimensions Toypad Interface & Server

A high-performance, modular Node.js Express server combined with a modern React + Vite + Tailwind CSS frontend dashboard. This application is designed to interface with the LEGO Dimensions USB Toypad hardware (VID `0x0e6f`, PID `0x0241`) and simulate NFC/RFID scans under mock environments.

The project features a sleek, responsive, glassmorphic dark-theme user interface conforming to premium design aesthetics and UK English styling conventions.

---

> [!WARNING]
> This project is 100% vibe coded and is provided "as is". Use at your own risk!

## ✨ Features

- **Physical & Mock NFC Reader**: Accesses physical LEGO Toypad scan events over USB via native `libusb` integration, or operates seamlessly in a lightweight `mock` mode with a custom diagnostic console.
- **Dynamic LED Controls**: Instantly command the Toypad's three distinct lighting pads (Center, Left, and Right) with solid colors, speed-adjustable flash rates, and custom durations.
- **Tag Customiser & Profiles**:
  - Manage unique custom profiles for physical or simulated tags.
  - Customise independent Pad LED colors for tag **Arrival** and **Departure** actions.
  - Assign beautiful vectors using a Lucide icon catalog or upload transparent custom PNG icons.
- **Configurable Webhook Dispatches**:
  - Trigger webhook POST requests individually for Arrival and Departure events on Pads 1, 2, and 3.
  - Forward editable, freeform JSON values through a custom `"payload"` property inside the webhook request body.
- **SSE Activity History**: A low-latency, real-time activity stream populated dynamically via Server-Sent Events (SSE). History cards feature pulsing status badges representing live in-flight (`Calling` 🟡), completed (`Dispatched` 🟢), and failed (`Failed` 🔴) webhook requests.

---

## 🛠️ Project Architecture

The application is structured into two main subprojects:

1. **Backend Server (`/src`)**:
   - Built on **Node.js**, **TypeScript**, **Express**, and **nconf**.
   - Leverages native `usb` binding dynamically, with automatic silent fallback to `mock` mode if drivers are missing.
   - Includes a full Vitest test suite for routes, mock NFC services, and schema serialization.

2. **Frontend Dashboard (`/frontend`)**:
   - Crafted using **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS**.
   - Interfaces with the backend SSE stream to update the system state, lights, and cards with high-frequency responsive transitions.

---

## 🚀 Getting Started

### 📋 Prerequisites

- **Node.js**: `v22.x.x` or later (tested on `v22.17.1`)
- **NPM**: `v10.x.x` or later
- **Libusb Drivers** *(Optional, required for physical USB mode)*:
  - **Linux / WSL**: Ensure you have read/write access to the raw USB device. You may need to create a custom udev rule.
  - **Windows**: Install the WinUSB driver for the Toypad using [Zadig](https://zadig.akeo.ie/).

---

### 📥 Installation & Setup

1. **Clone & Install Backend Dependencies**:
   Navigate to the root directory and install dependencies:

   ```bash
   npm install
   ```

2. **Install Frontend Dependencies**:
   Navigate to the `/frontend` directory and install dependencies:

   ```bash
   cd frontend
   npm install
   ```

---

### ⚙️ Configuration

System parameters are managed hierarchically using `nconf`. By default, the application looks for a `config.json` in the root directory:

```json
{
  "nfc": {
    "mode": "mock",
    "vid": "0x0e6f",
    "pid": "0x0241"
  },
  "port": 3000
}
```

- **`nfc.mode`**: Set to `"usb"` to connect to the physical Toypad hardware, or `"mock"` to run in virtual simulation mode.
- **`nfc.vid` / `nfc.pid`**: Custom USB Vendor ID and Product ID configuration (defaults match standard LEGO Toypad hardware).
- **`port`**: The port that the backend Express server listens on.

---

### 💻 Running the Application

You can run the application in two ways: **Development Mode** (independent watchers) or **Production Mode** (pre-compiled bundle).

#### Option A: Development Mode (Recommended for testing)

1. **Start the Backend watcher** (from the root folder):

   ```bash
   npm run dev
   ```

   *The server starts up at `http://localhost:3000`.*

2. **Start the Frontend development server** (from the `/frontend` folder):

   ```bash
   cd frontend
   npm run dev
   ```

   *The Vite client starts up (usually on `http://localhost:5173`) and automatically proxies API / SSE requests to the backend.*

#### Option B: Production Mode

1. **Build the Frontend Assets**:

   ```bash
   cd frontend
   npm run build
   ```

   *This compiles assets into `/frontend/dist` which are statically served by the Express backend.*

2. **Compile the Backend Server**:
   From the root folder:

   ```bash
   npm run build
   ```

3. **Start the Compiled Production Server**:

   ```bash
   npm start
   ```

   *The application is fully running on `http://localhost:3000`.*

#### Option C: Running with Docker

To build and run the application in a lightweight production container:

1. **Build the Docker Image**:

   ```bash
   docker build -t dimensions-nfc-server .
   ```

2. **Run the Container (Mock Mode)**:

   ```bash
   docker run -d -p 3000:3000 --name nfc-server dimensions-nfc-server
   ```

   *The application is now accessible at `http://localhost:3000` running in simulated NFC mode.*

3. **Run the Container (Physical USB Mode)**:
   To run in physical hardware mode on Linux/WSL, make sure to mount the raw USB device (e.g. using `--privileged` or mounting `/dev/bus/usb`):

   ```bash
   docker run -d \
     -p 3000:3000 \
     --privileged \
     -v /dev/bus/usb:/dev/bus/usb \
     -v $(pwd)/config.json:/app/config.json \
     -v $(pwd)/database.db:/app/database.db \
     --name nfc-server \
     dimensions-nfc-server
   ```

   *Note: Ensure `nfc:mode` inside `config.json` is set to `"usb"`.*

---

## 🧪 Testing

The backend includes 24 comprehensive integration, mock hardware, and route test cases executed via Vitest. To run tests in mock mode safely:

```bash
nfc__mode=mock npm test
```

For continuous test-driven development:

```bash
nfc__mode=mock npm run test:watch
```

---

## 📂 Project Structure Directory Map

```text
├── config.json            # Main config settings (mode, USB IDs, port)
├── database.db            # SQLite storage for custom tag profiles and webhooks
├── package.json           # Backend dependencies and build scripts
├── tsconfig.json          # TypeScript server config
├── src/
│   ├── index.ts           # Server bootstrap
│   ├── app.ts             # Express application, routes, and SSE endpoints
│   ├── config.ts          # nconf registry initialization
│   ├── db/
│   │   └── database.ts    # SQLite database store operations
│   ├── services/
│   │   └── nfc-reader.ts  # USB Toypad controller & mock scan processor
│   └── state/
│       └── nfc-store.ts   # History logging and SSE event dispatching
└── frontend/
    ├── index.html         # Main client viewport entry
    ├── package.json       # Frontend dependencies (React, Vite, Tailwind)
    ├── src/
    │   ├── main.tsx       # React bootstrapper
    │   ├── App.tsx        # Dashboard shell, SSE handler, and state coordinator
    │   ├── types.ts       # Shared UI type definitions
    │   ├── constants.ts   # Built-in character and colour presets
    │   └── components/    # Glassmorphic UI modular components
    │       ├── Header.tsx           # Status indicators and title banner
    │       ├── PadVisualiser.tsx    # Toypad graphic rendering & scan triggers
    │       ├── TagSimulator.tsx     # Custom mock scanner input form
    │       ├── TagCustomiser.tsx    # Modal configuration (profiles, webhooks, icons)
    │       └── ActivityHistory.tsx  # Scrollable logs with live status badges
```
