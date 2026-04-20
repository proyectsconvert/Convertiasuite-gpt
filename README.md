# Suite Convert-ia

This project is a managed suite containing both the frontend and backend services.

## Prerequisites
- Node.js (v18+)
- Python (v3.10+)

## Quick Start (Root Directory)

You can manage both frontend and backend from this root directory using the following commands:

### Setup
- `npm run install:front`: Install frontend dependencies.
- `npm run install:back`: Set up Python virtual environment and install backend dependencies.
- `npm run install:all`: Run both of the above.

### Running the Services
- **Frontend**: `npm run dev:front` (or simply `npm run dev`)
- **Backend**: `npm run dev:back`

---

## Technical Details

### Frontend
- **Location**: `/front`
- **Tech Stack**: Vite, React, TypeScript, TailwindCSS, Shadcn/UI.
- **Scripts**:
  - `npm run dev`: Starts the development server.
  - `npm run build`: Builds for production.

### Backend
- **Location**: `/back`
- **Tech Stack**: Python, FastAPI.
- **Structure**:
  - `venv/`: Local virtual environment (created on first install).
  - `app/main.py`: Main entry point.
