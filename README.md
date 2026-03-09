# RetinaDiet — Setup Guide

## Project Structure
```
retinadiet/
├── backend/               ← FastAPI + MongoDB
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/              ← React
    ├── public/index.html
    ├── src/
    │   ├── index.js
    │   └── App.jsx
    └── package.json
```

---

## Backend Setup (FastAPI)

### 1. Create virtual environment & install
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set MONGO_URI and a strong JWT_SECRET
```

### 3. Start MongoDB
```bash
# Local
mongod --dbpath /data/db

# OR use MongoDB Atlas — paste connection string into MONGO_URI in .env
```

### 4. Run the server
```bash
uvicorn main:app --reload --port 5000
```

Swagger UI available at: http://localhost:5000/docs

---

## Frontend Setup (React)

### 1. Install & start
```bash
cd frontend
npm install
npm start
```

App runs on: http://localhost:3000

---

## API Endpoints

| Method | Path                    | Auth | Description          |
|--------|-------------------------|------|----------------------|
| POST   | /api/auth/register      | No   | Create account       |
| POST   | /api/auth/login         | No   | Login                |
| GET    | /api/auth/me            | Yes  | Verify token         |
| POST   | /api/reports            | Yes  | Save meal plan       |
| GET    | /api/reports/latest     | Yes  | Get latest report    |
| GET    | /api/reports            | Yes  | List all reports     |
| GET    | /api/reports/{id}       | Yes  | Get single report    |

Auth header format: `Authorization: Bearer <token>`

---

## MongoDB Atlas (Cloud Option)
1. Create free cluster at https://cloud.mongodb.com
2. Whitelist your IP
3. Set in .env:
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/retinadiet
