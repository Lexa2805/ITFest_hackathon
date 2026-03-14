# Database Migrations

This directory contains SQL migration files for setting up the Supabase database schema.

## Setup Instructions

### 1. Create the health_exports table

Run the following SQL in your Supabase SQL Editor:

```sql
-- See create_health_exports_table.sql
```

Or execute directly:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `create_health_exports_table.sql`
4. Click "Run" to execute

### 2. Verify the table was created

```sql
SELECT * FROM health_exports LIMIT 1;
```

### 3. Test the RLS policies

The table has Row Level Security (RLS) enabled, which means:
- Users can only access their own health data
- The service role key (used by the backend) bypasses RLS
- Direct client access would be restricted to the authenticated user's data

## Table Schema

### health_exports

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| parsed_metrics | JSONB | Health metrics from Apple Health export |
| physical_state | JSONB | Calculated physical state score and factors |
| created_at | TIMESTAMPTZ | When the record was first created |
| updated_at | TIMESTAMPTZ | When the record was last updated |

### Indexes

- `idx_health_exports_user_id`: Fast lookups by user
- `idx_health_exports_updated_at`: Sorting by most recent

### Constraints

- `UNIQUE(user_id)`: Each user can only have one health export record (upsert behavior)
- `ON DELETE CASCADE`: Health data is deleted when user is deleted

## API Endpoints

### POST /upload-health-export
- Uploads and parses Apple Health ZIP file
- Saves parsed data to database (upserts if exists)
- Requires authentication

### GET /health-data
- Retrieves the latest health export data for the authenticated user
- Returns 404 if no data exists
- Requires authentication
