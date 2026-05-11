# NCPProject

A full-stack application consisting of a FastAPI backend and a Next.js frontend.

## Project Structure

- **`backend/`**: FastAPI server handling document processing, metadata extraction, and recommendations.
- **`frontend/`**: Next.js (TypeScript) dashboard for interacting with documents and viewing insights.

## Getting Started

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment: `python -m venv .venv`.
3. Activate the environment: `source .venv/bin/activate`.
4. Install dependencies: `pip install -r requirements.txt`.
5. Set up environment variables in `.env` (see `.env.example`).
6. Run the server: `uvicorn app.main:app --reload`.

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`.
3. Set up environment variables in `.env.local` (see `.env.example`).
4. Run the development server: `npm run dev`.

## Features
- Document Upload and Management
- Automated Metadata Extraction
- AI-powered Recommendations
- Real-time Health Monitoring
