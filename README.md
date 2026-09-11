# myAssignments

A grade tracker for college students. Add courses with syllabus weights, track every assignment, and see your live grade — all in one place instead of hunting through Blackboard.

## Features

- **Dashboard** — See today's due assignments and the upcoming week at a glance
- **Grade Calculator** — Live grade per course based on syllabus weights, drop policies, and your scores
- **Syllabus Parser** — Paste text or upload a PDF and AI extracts your grade categories automatically
- **Assignment Importer** — Paste your course schedule or upload a PDF and AI extracts every deadline in bulk
- **Full assignment editing** — Edit name, score, due date, recurrence, notes inline
- **Recurring Assignments** — Mark assignments as weekly/biweekly/monthly so they show up every time
- **AI Assistant** — Chat to ask about grades and add/update assignments
- **User Accounts** — Each person has their own private data

---

## Requirements

- Python 3.11 or newer (NOT 3.13 — see note below)
- Node.js LTS (download from https://nodejs.org, install with all default options)
- An Anthropic API key (https://console.anthropic.com) — only needed for AI features

> **Python version note:** Python 3.13 has issues building some packages from source. If you run into errors during `pip install`, use Python 3.11 or 3.12 instead.

---

## First-Time Setup (do this once)

### 1. Backend setup

Open PowerShell and run each command one at a time:

```powershell
cd "C:\Users\satys\OneDrive\Documents\Guru\Claude Agents\First Agent\output\myAssignments\backend"
```

Allow scripts to run (required on Windows, one-time only):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Create and activate the virtual environment:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Your prompt should now show `(venv)` at the start. Then install dependencies:
```powershell
pip install -r requirements.txt
```

Copy the example env file:
```powershell
copy .env.example .env
```

Open `.env` in any text editor and fill in your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

Create the database:
```powershell
alembic upgrade head
```

Start the backend server:
```powershell
uvicorn app.main:app --reload
```

You should see: `Uvicorn running on http://127.0.0.1:8000` — leave this window open.

---

### 2. Frontend setup

Open a **second** PowerShell window:

```powershell
cd "C:\Users\satys\OneDrive\Documents\Guru\Claude Agents\First Agent\output\myAssignments\frontend"
npm install
npm run dev
```

Go to **http://localhost:5173** in your browser and register an account.

> **If npm is not recognized:** Close PowerShell and open a new window after installing Node.js. Node only updates PATH when a new terminal is opened.

---

## Running the App (every time after setup)

You only need two commands each time. Open two PowerShell windows:

**Window 1 — Backend:**
```powershell
cd "C:\Users\satys\OneDrive\Documents\Guru\Claude Agents\First Agent\output\myAssignments\backend"
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

**Window 2 — Frontend:**
```powershell
cd "C:\Users\satys\OneDrive\Documents\Guru\Claude Agents\First Agent\output\myAssignments\frontend"
npm run dev
```

Then go to **http://localhost:5173**.

---

## Sharing With Someone Else

Zip the entire `myAssignments` folder (make sure `.env` is included — it starts with a dot so may be hidden) and send it. They follow the same First-Time Setup steps above. Their data is stored locally on their own machine and is completely separate from yours.

---

## Troubleshooting

**"source is not recognized" or "&&" errors**
- You're on Windows PowerShell. Run commands one at a time, not chained with `&&`.
- Use `.\venv\Scripts\Activate.ps1` not `source venv/bin/activate`.

**"running scripts is disabled on this system"**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then try `.\venv\Scripts\Activate.ps1` again.

**"npm is not recognized"**
- Node.js is not installed or PATH hasn't updated.
- Install Node from https://nodejs.org (LTS version, all default options).
- Close and reopen PowerShell after installing.

**"psycopg2-binary" fails to install**
- You don't need it for local use (it's for PostgreSQL). It should not be in requirements.txt. If it appears, remove that line.

**"passlib" / bcrypt error on register**
- The app uses `bcrypt` directly, not passlib. If you see a passlib error, run:
```powershell
pip install bcrypt
```

**"pydantic-core" fails to build (Rust error)**
- This happens on Python 3.13. Use Python 3.11 or 3.12 instead, or the requirements.txt uses flexible version ranges that should resolve automatically.

**Registration fails / 500 error**
- Check the backend PowerShell window for the error message.
- Most common cause: bcrypt compatibility. Run `pip install bcrypt` in the venv.

**AI features say "invalid x-api-key"**
- Open `.env` and make sure your Anthropic API key is filled in correctly.
- Restart the backend after editing `.env` (Ctrl+C then `uvicorn app.main:app --reload`).

**Dashboard shows no upcoming assignments**
- Assignments with past due dates don't appear on the dashboard — check the course page directly.

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login, get JWT |
| GET | /api/auth/me | Get current user |
| GET | /api/courses | List all courses |
| POST | /api/courses | Create course |
| GET | /api/courses/{id}/categories | List grade categories |
| POST | /api/courses/{id}/categories | Add grade category |
| GET | /api/courses/{id}/assignments | List assignments |
| POST | /api/assignments | Add assignment |
| PUT | /api/assignments/{id} | Update assignment |
| GET | /api/grades/course/{id} | Full grade breakdown |
| GET | /api/grades/summary | Grade for every course |
| GET | /api/dashboard | Today's + next 7 days due |
| POST | /api/syllabus/parse-text | AI extracts grade categories from text |
| POST | /api/syllabus/parse-pdf | AI extracts grade categories from PDF |
| POST | /api/syllabus/apply | Bulk-create grade categories |
| POST | /api/syllabus/parse-assignments-text | AI extracts assignments from schedule text |
| POST | /api/syllabus/parse-assignments-pdf | AI extracts assignments from PDF |
| POST | /api/syllabus/apply-assignments | Bulk-create assignments |
| POST | /api/ai/chat | AI chatbot |
| POST | /api/ai/confirm | Confirm or cancel an AI action |

---

## Deployment (to share via link instead of zip)

- **Backend:** Railway (railway.app) — free tier, add PostgreSQL plugin
- **Frontend:** Vercel (vercel.com) — completely free
- Set `VITE_API_URL` on Vercel and `ALLOWED_ORIGINS` + `ANTHROPIC_API_KEY` + `SECRET_KEY` on Railway
- Railway uses the `Procfile` to run migrations automatically on deploy
