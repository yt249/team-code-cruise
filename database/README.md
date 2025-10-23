# Database

This directory contains all database-related files for the ride-sharing application.

## Structure

```
database/
└── prisma/
    └── schema.prisma    # Prisma schema definition
```

## Prisma Schema

The application uses PostgreSQL as the primary database with Prisma as the ORM. The schema defines:

- **User**: Rider accounts with authentication
- **Driver**: Driver profiles and availability
- **Vehicle**: Driver vehicle information
- **Ride**: Ride requests and tracking
- **PaymentIntent**: Payment processing
- **AdSession**: Advertisement viewing sessions
- **DiscountToken**: Discount tokens from ad completion

## Setup

### Prerequisites
- PostgreSQL database instance
- Node.js and pnpm installed

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb rb
```

2. Configure the database URL in `backend/.env`:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/rb?schema=public"
```

3. Generate Prisma client (from backend directory):
```bash
cd backend
pnpm run prisma:gen
```

4. Push the schema to the database:
```bash
pnpm run prisma:push
```

Or run migrations:
```bash
pnpm run prisma:migrate
```

## Development Mode

The backend supports running with an in-memory database for development and testing:

```bash
cd backend
pnpm run dev:memory
```

This mode does not require a PostgreSQL database and is useful for:
- Quick testing
- Running tests
- Development without database setup

## Schema Modifications

When modifying the schema:

1. Edit `database/prisma/schema.prisma`
2. Generate new Prisma client: `pnpm run prisma:gen`
3. Create migration: `pnpm run prisma:migrate`
4. Apply to database: `pnpm run prisma:push`

## Prisma Commands

All Prisma commands should be run from the `backend/` directory:

```bash
# Generate Prisma client
pnpm run prisma:gen

# Push schema changes to DB
pnpm run prisma:push

# Create and apply migrations
pnpm run prisma:migrate

# Open Prisma Studio (database GUI)
npx prisma studio --schema=../database/prisma/schema.prisma
```
