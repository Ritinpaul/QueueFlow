-- PostgreSQL initialization script
-- This runs once when the container is first created

-- Enable UUID extension (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for future text search capabilities  
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Log that init completed
DO $$
BEGIN
  RAISE NOTICE 'Database initialized successfully';
END $$;
