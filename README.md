# Parrot Pod - AI Voice Agent Builder

Parrot Pod is an AI Voice Agent Builder that includes a Vite frontend and a FastAPI Python backend.

## Quick Start (Recommended)

You can install and run the entire application (both frontend and backend) using `npm` commands directly from the root directory.

### 1. Install Root Tools
Run the following command in the project root. This will install the root development tool (`concurrently`).
```bash
npm install
```

### 2. Setup Services
Run the setup command to automatically:
- Install the frontend Node.js packages.
- Create a Python virtual environment (`venv`) for the backend.
- Install the backend python requirements (`requirements.txt`).
```bash
npm run setup:all
```

> **Note**: Make sure you have created your `.env` file in the `backend/` directory (`backend/.env`) based on the `.env.example` file before starting the application!

### 3. Run the Application
Start the frontend, backend, and voice agent worker concurrently in a single terminal. This will automatically open `http://localhost:3000` in your default browser.
```bash
npm run dev
```

To stop all services, simply press `Ctrl + C` in the terminal once, and it will shut down everything gracefully.

## Alternative Start
If you prefer not to use `npm` for starting, you can use the provided batch script on Windows:
```cmd
start.bat
```