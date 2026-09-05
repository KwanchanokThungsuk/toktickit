# TokTickIT - IT Service Desk Application

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests.

## Developer Information

- **Name:** Kwanchanok Thungsuk
- **Student ID:** 67070501006

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Bootstrap
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma
- **Testing:** Vitest, React Testing Library, Supertest, and Playwright

## Project Structure
```text
toktickit/
├── client/              # React frontend application
│   ├── src/             # Frontend source code
│   └── tests/           # Frontend tests
├── server/              # Express backend application
│   ├── prisma/          # Database schema and migrations
│   ├── src/             # Backend source code
│   └── tests/           # Backend tests
├── e2e/                 # End-to-end and responsive tests
├── docs/                # Lab documentation and reports
├── artifacts/           # Lab evidence and screenshots
├── .gitignore
└── README.md
```

## Getting Started

Follow these steps to set up and run the project locally.

### 1. Prerequisites
- Node.js installed
- PostgreSQL installed and database server running

### 2. Clone the Repository
```markdown
git clone https://github.com/KwanchanokThungsuk/toktickit.git
cd toktickit
```
### 3. Backend Setup
```markdown
cd server
npm install
```
### 4. Database Configuration
1. Create a `.env` file in the `server` directory.
2. Add your PostgreSQL connection string:
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/toktickit?schema=public"
3. Run Prisma migrations and seed the database:
   npm run prisma:migrate
   npm run prisma:seed

### 5. Frontend Setup
Open a new terminal:
```markdown
cd client
npm install
```
### 6. Run the Application

**Backend:**
```markdown
cd server
npm run dev
```
**Frontend:**
```markdown
cd client
npm run dev
```
## Lab 2 Requester Features

Lab 2 provides a Requester-facing ticketing workflow with the following capabilities:

- Select an active Requester
- Create an IT support ticket
- Select Category and Related System
- Upload permitted attachments
- Receive a unique Ticket Number
- View owned tickets in **My Tickets**
- Search, filter, sort, and paginate tickets
- View Ticket Detail in read-only mode
- Download active attachments
- Soft-remove attachments with a removal reason
- Prevent access to tickets and attachments owned by another Requester
- Responsive layout for desktop, tablet, and mobile
- Keyboard-accessible interactions
- Safe error handling without exposing technical details

> **Note:** Authentication and IT Staff workflow are outside the scope of Lab 2.

## Testing Instructions

### Server Tests
```markdown
cd server
npm test
```

### Server Build
```markdown
cd server
npm run build
```
### Client Build
```markdown
cd client
npm run build
```
### Database
```markdown
cd server
npm run prisma:migrate
npm run prisma:seed
```
### Client Tests
```markdown
cd client
npm test
```
### End-to-End and Responsive Tests
```markdown
cd client
npm run test:e2e
```
## Database Access

### Prisma Studio
```markdown
Run from the `server` directory:
npx prisma studio
```
### PostgreSQL CLI
```markdown
psql -U postgres -d toktickit
```
## Lab 2 Documentation

Detailed Lab 2 specifications, API contracts, UI specifications, test plans, review records, and AI-use documentation are available in:

- `docs/lab-02/specification.md`
- `docs/lab-02/api-spec.md`
- `docs/lab-02/ui-spec.md`
- `docs/lab-02/tests.md`
- `docs/lab-02/reviewer.md`
- `docs/lab-02/ai-use.md`

## Lab 2 Evidence

Screenshots and other Lab 2 evidence are stored under `artifacts/lab-02/`. 

The evidence includes responsive screenshots for desktop, tablet, and mobile layouts, together with other required Lab 2 test evidence.