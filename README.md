# Laptop Collection & Sequential Room Allocation System

Production-ready web application for managing college laptop collection and sequential room allocation for **CSE (E Block — 420 capacity)** and **ECE (F Block — 141 capacity)** departments, totaling 561 laptops.

Built with **Next.js 16 (App Router), TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, Auth Sessions, and ExcelJS**.

---

## 1. Database Connection Setup

The application uses standard PostgreSQL connection strings formatted as:
```env
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require"
```

### Option A: Managed PostgreSQL via Neon (Recommended for Production & Vercel)

1. Go to [neon.tech](https://neon.tech) and sign up / create a project.
2. Under your Project Dashboard, copy the connection string:
   ```
   postgresql://neondb_owner:npg_xxxxxx@ep-cool-cloud-xxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Open [.env](file:///c:/Users/Mayif%20Shaik/Desktop/collect/.env) and set `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://neondb_owner:npg_xxxxxx@ep-cool-cloud-xxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
4. Deploy the schema migrations and seed the authoritative rooms:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

---

### Option B: Local PostgreSQL (Docker or Installed Service)

If you have a local PostgreSQL instance running:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/laptop_collect?sslmode=disable"
```
Run migrations and seed:
```bash
npx prisma migrate deploy
npm run db:seed
```

---

### Option C: Built-in Zero-Install Local PostgreSQL Server

If you do not have PostgreSQL installed locally, you can use the built-in local PostgreSQL engine:

1. In one terminal, start the local PostgreSQL service:
   ```bash
   npm run db:local
   ```
   *(Listens on `127.0.0.1:5433` and persists data to `./.pgdata`)*

2. In [.env](file:///c:/Users/Mayif%20Shaik/Desktop/collect/.env):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/laptop_collect?sslmode=disable"
   ```

3. Seed authoritative rooms and test users:
   ```bash
   npm run db:seed
   ```

---

## 2. Environment Variables Configuration

Copy [.env.example](file:///c:/Users/Mayif%20Shaik/Desktop/collect/.env.example) to `.env`:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://...` |
| `AUTH_SECRET` | 32+ character random secret for JWT sessions | `laptop-collection-secret-key-2026` |
| `ADMIN_USERNAME` | Initial administrator login username | `admin` |
| `ADMIN_PASSWORD` | Initial administrator password | `AdminPassword123!` |
| `ADMIN_NAME` | Initial administrator display name | `System Administrator` |
| `NEXT_PUBLIC_APP_URL` | Root application URL | `http://localhost:3000` |

---

## 3. Administrator Setup CLI

To securely configure or change the administrator credentials:
```bash
npm run setup:admin
```
Follow the interactive prompt to set a new password. Credentials are encrypted using bcrypt.

---

## 4. Default Seed Accounts

After running `npm run db:seed`:

| Role | Username | Password | Permitted Department / Block |
|---|---|---|---|
| **Administrator** | `admin` | `AdminPassword123!` | All Departments / All Blocks |
| **CSE Collector** | `cse_collector` | `Collector123!` | CSE Department / E Block Only |
| **ECE Collector** | `ece_collector` | `Collector123!` | ECE Department / F Block Only |

---

## 5. Authoritative Room Configuration

Seed sequence is strictly preserved:

### E Block — CSE primary allocation (420 capacity)
- E102 (28), E103 (28), E104 (28), E106 (28), E107 (28), E206 (28), E207 (28), E208 (28), E209 (28), LAB1 (42), LAB2 (42), LAB3 (42), LAB4 (ENG LAB) (42).

### F Block — ECE primary allocation (141 capacity)
- F203 (28), F204 (28), F207 (28), F310 (28), F305 (29).

Combined capacity: **561 laptops**.

---

## 6. Running Automated Tests

Run the comprehensive integration test suite verifying all 20 business rules:
```bash
npm test
```

Tests cover:
- Room order & capacity constraints (420 in E Block, 141 in F Block)
- Independent concurrent allocation
- Strict sequential numbering (1..capacity)
- Atomic room claims and race condition prevention
- Idempotency & duplicate student verification warnings
- Role-based department access boundaries
- Transactional cross-block overflow transfers
- Audited release and reassignment
- Valid Excel (.xlsx) register export generation

---

## 7. Starting the Application

Development mode:
```bash
npm run dev
```

Production build & start:
```bash
npm run build
npm start
```
Access the application at [http://localhost:3000](http://localhost:3000).

---

## 8. Deployment to Vercel

1. Push your repository to GitHub.
2. In the Vercel Dashboard, create a **New Project** and import the repository.
3. Add the following **Environment Variables** in Vercel:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (with `?sslmode=require`)
   - `AUTH_SECRET`: Random 32+ character string
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD`: Your strong admin password
   - `ADMIN_NAME`: `System Administrator`
4. Deploy! Vercel runs `npm run build` which automatically executes `prisma generate` via `postinstall`.
5. Run the one-time migration and seed on your Neon database:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
