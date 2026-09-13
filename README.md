# SkillChain – Credit-Based Skill Exchange Platform

## Overview
SkillChain is a full-stack web application that enables users to learn and teach skills without using money. The platform operates on a credit-based system where participants earn credits by contributing educational content and spend those credits to enroll in courses.

## Technology Stack
- **Frontend:** React.js, CSS3, JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **Database:** Oracle Database
- **Build Tool:** Vite

## Prerequisites
- Node.js (v16 or higher)
- Oracle Database (XE or Enterprise Edition)
- Oracle Client Libraries (for oracledb npm package)

## Project Structure
```
SkillChain/
├── client/                 # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── cotext/         # Auth Context
│   │   ├── layouts/        # Admin & Participant Layouts
│   │   │   ├── AdminLayout/
│   │   │   └── ParticipantLayout/
│   │   ├── routes/         # App Routes
│   │   ├── services/       # API Service Layer
│   │   ├── views/          # All Page Components
│   │   │   ├── AdminView/
│   │   │   ├── Auth/
│   │   │   ├── ParticipantView/
│   │   │   └── QueryStudio/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css       # Global Styles & Variables
│   │   ├── main.jsx        # Entry Point
│   │   └── ScrollToTop.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Node.js Backend
│   ├── config/
│   │   └── database.js     # Oracle DB Connection
│   ├── database/
│   │   ├── 01_schema.sql   # Table Definitions
│   │   ├── 02_dummy_data.sql
│   │   ├── 03_advanced_queries_and_plsql.sql
│   │   └── setup_all.sql
│   ├── routes/
│   │   └── api.js          # REST API Routes
│   ├── services/
│   │   └── queryService.js # Query Execution & Mock Data
│   ├── .env                # Environment Variables
│   ├── package.json
│   └── server.js           # Express Server Entry
│
└── README.md
```

## Setup Instructions

### 1. Database Setup (Oracle)

1. Open **Oracle SQL Developer** or **SQL*Plus**
2. Connect as SYS or SYSTEM user
3. Create the SkillChain user:
```sql
CREATE USER SKILLCHAIN IDENTIFIED BY Skillchain123
DEFAULT TABLESPACE USERS
TEMPORARY TABLESPACE TEMP
QUOTA UNLIMITED ON USERS;

GRANT CREATE SESSION TO SKILLCHAIN;
GRANT CREATE TABLE TO SKILLCHAIN;
GRANT CREATE SEQUENCE TO SKILLCHAIN;
GRANT CREATE TRIGGER TO SKILLCHAIN;
GRANT CREATE PROCEDURE TO SKILLCHAIN;
GRANT CREATE VIEW TO SKILLCHAIN;
GRANT CREATE TYPE TO SKILLCHAIN;
```

4. Connect as SKILLCHAIN user
5. Run the schema script: `@D:\SkillChain\server\database\01_schema.sql`
6. Run the dummy data script: `@D:\SkillChain\server\database\02_dummy_data.sql`
7. Run the advanced queries script: `@D:\SkillChain\server\database\03_advanced_queries_and_plsql.sql`

### 2. Backend Setup

1. Navigate to the server directory:
```bash
cd D:\SkillChain\server
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```
DB_USER=SKILLCHAIN
DB_PASSWORD=Skillchain123
DB_CONNECT_STRING=localhost:1521/XE
PORT=5000
```

4. Start the server:
```bash
npm start
```

The server will start on `http://localhost:5000`

### 3. Frontend Setup

1. Navigate to the client directory:
```bash
cd D:\SkillChain\client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## Demo Credentials

### Admin Login
- **Email:** admin1@gmail.com
- **Password:** Admin@123

### Participant Login
- **Email:** rahim@gmail.com
- **Password:** Rahim@123

## Features

### Admin Features
- Dashboard with platform statistics
- Approve/Reject submitted courses
- Verify participant certificates
- Monitor and manage users
- View course reports and feedback
- Manage skills catalog

### Participant Features
- Browse and enroll in courses
- Track learning progress
- Take exams
- Upload teaching content
- Earn and spend credits
- View notifications
- Manage profile
- Submit feedback

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create new course
- `POST /api/courses/enroll` - Enroll in a course
- `POST /api/courses/approve` - Approve a course
- `POST /api/courses/reject` - Reject a course

### Skills
- `GET /api/skills` - Get all skills
- `POST /api/skills/add` - Add new skill

### Certificates
- `GET /api/certificates` - Get all certificates
- `POST /api/certificates/verify` - Verify a certificate
- `POST /api/certificates/upload` - Upload certificate

### Participants
- `GET /api/participants` - Get all participants
- `GET /api/participants/:id` - Get participant profile
- `PUT /api/participants/update` - Update participant
- `DELETE /api/participants/:id` - Remove participant

### Other
- `GET /api/notifications` - Get notifications
- `GET /api/exams` - Get exams
- `GET /api/monitor` - Get monitored users
- `GET /api/reports` - Get course reports

## Business Rules
1. No monetary transactions - credits only
2. First free learning for new participants
3. Certificate verification required for teaching
4. Content approval required before publication
5. Credit rewards for approved contributions
6. Participant removal for non-contribution
