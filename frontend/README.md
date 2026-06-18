# Mini HCM

A lightweight Human Capital Management (HCM) web app for tracking employee attendance, computing work hours, overtime, night differential, late, and undertime — built with React, Node/Express, and Firebase.

---

## Tech Stack

- **Frontend:** React + Vite, deployed on Firebase Hosting
- **Backend:** Node.js + Express, deployed on Render
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication

---

## Project Structure

```
mini-hcm/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── admin.js
│   │   │   └── attendance.js
│   │   ├── services/
│   │   │   └── computeHours.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── index.js
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── services/
    │   │   └── api.js
    │   ├── AdminPanel.jsx
    │   └── App.jsx
    ├── .env.production
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- Firebase project with Firestore and Authentication enabled
- A Render account (for backend hosting)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/mini-hcm.git
cd mini-hcm
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:

```env
PORT=4000
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FRONTEND_URL=http://localhost:5173
```

> Get these values from your Firebase project → Project Settings → Service Accounts → Generate New Private Key.

Start the backend:

```bash
npm start
```

Backend runs at `http://localhost:4000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

This installs all dependencies including `date-fns` and `date-fns-tz` automatically.

#### For Local Development
Create a `.env` file inside the `frontend/` folder:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=http://localhost:4000
```

> ⚠️ Important: If `VITE_API_URL` is not set, the app will default to the production Render backend (`https://mini-hcm-lg6y.onrender.com`). For local development, always set `VITE_API_URL=http://localhost:4000` so your frontend points to your local backend.

#### For Production (Firebase Hosting)
Create a `.env.production` file inside the `frontend/` folder:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=https://mini-hcm-lg6y.onrender.com
```

> Get these values from your Firebase project → Project Settings → General → Your Apps.

Start the frontend:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Test Credentials

### Admin Account
```
Email:    napayjakem@gmail.com
Password: admin123
```

### Employee Account
```
Email:    juandelacruz@gmail.com
Password: user123
```

> The admin account has access to the Admin Panel (View/Edit Punches, Daily Report, Weekly Report).
> The employee account can punch in/out and view their own attendance history.

---

## Features

- **Punch In / Punch Out** — employees clock in and out via the app
- **Auto-computation** — on punch out, the system automatically computes:
  - Regular Hours
  - Overtime Hours (beyond shift end)
  - Night Differential Hours (10:00 PM – 6:00 AM)
  - Late Minutes (after shift start)
  - Undertime Minutes (before shift end)
- **Admin Panel**
  - View and edit any employee's punch records
  - Recomputes all metrics automatically on edit
  - Daily and Weekly reports
- **Timezone-aware** — all timestamps stored in UTC, computed in Philippine Time (PHT, UTC+8)

---

## Deployment

### Backend (Render)

1. Push your code to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Set root directory to `backend`
4. Set build command: `npm install`
5. Set start command: `node src/index.js`
6. Add all `.env` variables in Render's Environment settings

### Frontend (Firebase Hosting)

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## Key Notes

- All punch timestamps are stored as **UTC** in Firestore
- Schedule times (e.g. `09:00–17:00`) are always in **Philippine Time (PHT)**
- The `date` field on each punch record is saved in PHT to avoid midnight rollover issues
- Do **not** commit `.env` files — they are listed in `.gitignore`