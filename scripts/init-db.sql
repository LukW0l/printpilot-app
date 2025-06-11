-- PrintPilot Database Initialization Script
-- This script sets up the initial database configuration for PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create indexes for better performance (will be created after Prisma migration)
-- These are commented out as Prisma will handle the schema

-- Set timezone
SET timezone = 'Europe/Warsaw';

-- Configure connection settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Enable logging for development
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries longer than 1s

-- Reload configuration
SELECT pg_reload_conf();

-- Create database schema (Prisma will handle this)
-- This script mainly sets up the PostgreSQL instance configuration