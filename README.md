# toktickit
# TokTickIT - IT Service Desk Application

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests.

## Developer Information
- **Name:** Kwanchanok Thungsuk
- **Student ID:** 67070501006

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Bootstrap
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma
- **Testing:** Vitest and Supertest

## Project Structure

    toktickit/
    ├── client/          # React frontend application
    ├── server/          # Express backend application
    │   ├── prisma/      # Database schema and migrations
    │   ├── src/         # Backend source code
    │   └── tests/       # Backend tests
    ├── docs/            # Lab documentation and reports
    ├── .gitignore
    └── README.md

## Getting Started

Follow these steps to set up and run the project locally.

### 1. Prerequisites
- Node.js installed
- PostgreSQL installed and database server running

### 2. Clone the repository

    git clone [https://github.com/KwanchanokThungsuk/toktickit.git](https://github.com/KwanchanokThungsuk/toktickit.git)
    cd toktickit

### 3. Backend Setup

    cd server
    npm install

### 4. Database Configuration
1. Create a `.env` file in the `server` directory.
2. Add your PostgreSQL connection string. Example:
   
       DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/toktickit?schema=public"

3. Run Prisma migrations and seed the database:
   
       npx prisma migrate dev
       npx prisma db seed

### 5. Frontend Setup
Open a new terminal window:

    cd client
    npm install

### 6. Run Both Servers
- **Backend:** `npm run dev` (in the `server` directory)
- **Frontend:** `npm run dev` (in the `client` directory)

## How to Access PostgreSQL

You can access and view your database using several methods:

1. **Prisma Studio (Recommended & Easiest):**
   Run the following command in the `server` directory to open a web-based database GUI:
   
       npx prisma studio

2. **Database GUI Tools (e.g., pgAdmin, DBeaver, TablePlus):**
   Create a new connection using the credentials specified in your `.env` file (Host: localhost, Port: 5432, Username/Password as configured).

3. **Command Line (psql):**
   
       psql -U postgres -d toktickit

## Testing Instructions

To run the automated tests for the Lab 1 requirements:

**Run server tests:**

    cd server
    npm test

**Run client tests:**

    cd client
    npm test