@echo off
echo Starting AlgoPilot AI MVP...

echo Installing frontend dependencies if missing...
cd frontend
call npm install
cd ..

echo Starting Backend Server...
start cmd /k "cd backend && call .\venv\Scripts\activate && pip install python-dotenv && .\venv\Scripts\uvicorn.exe main:app --reload --host 0.0.0.0 --port 8000"

echo Starting Frontend Server...
cd frontend
call npm run dev
