-- ============================================================
-- HR Policy Assistant — Supabase Migration 001
-- Includes: pgvector, all tables, RLS policies, indexes,
--           and the match_policy_chunks RPC function
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ── ENUM Types ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('employee', 'hr_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE access_level AS ENUM ('global', 'manager');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Table: users ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  department    TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'employee',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: policies ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: policy_versions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_versions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id    UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  valid_from   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_level access_level NOT NULL DEFAULT 'global',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: policy_chunks (with pgvector embedding) ────────────────────────────
CREATE TABLE IF NOT EXISTS policy_chunks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id  UUID NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  chunk_text  TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding   VECTOR(3072),              -- gemini-embedding-001 output dimension
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: interactions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_prompt          TEXT NOT NULL,
  llm_response        TEXT NOT NULL,
  cited_chunk_ids     UUID[] DEFAULT '{}',
  requires_escalation BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- HNSW index for fast approximate nearest-neighbor vector search
CREATE INDEX IF NOT EXISTS idx_policy_chunks_embedding
  ON policy_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions (user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_escalation ON interactions (requires_escalation);
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy_id ON policy_versions (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_chunks_version_id ON policy_chunks (version_id);

-- ── Updated_at Trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS: Enable Row Level Security ───────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies: users ───────────────────────────────────────────────────────
-- Users can only read their own profile
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid()::TEXT = id::TEXT);

-- Service role can do everything (used by backend with service key)
CREATE POLICY "users_service_all" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- ── RLS Policies: policy_chunks ───────────────────────────────────────────────
-- Employees: can only read global access_level chunks
CREATE POLICY "chunks_employee_read_global" ON policy_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM policy_versions pv
      WHERE pv.id = policy_chunks.version_id
      AND pv.access_level = 'global'
    )
  );

-- Service role (HR admin backend calls): unrestricted
CREATE POLICY "chunks_service_all" ON policy_chunks
  FOR ALL USING (auth.role() = 'service_role');

-- ── RLS Policies: interactions ────────────────────────────────────────────────
-- Users can only see their own interactions
CREATE POLICY "interactions_read_own" ON interactions
  FOR SELECT USING (auth.uid()::TEXT = user_id::TEXT);

-- Service role can do everything
CREATE POLICY "interactions_service_all" ON interactions
  FOR ALL USING (auth.role() = 'service_role');

-- ── RLS Policies: policies & policy_versions ──────────────────────────────────
-- All authenticated users can read policies/versions metadata
CREATE POLICY "policies_authenticated_read" ON policies
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "policy_versions_authenticated_read" ON policy_versions
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

-- Service role can write
CREATE POLICY "policies_service_write" ON policies
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "policy_versions_service_write" ON policy_versions
  FOR ALL USING (auth.role() = 'service_role');

-- ── RPC Function: match_policy_chunks ─────────────────────────────────────────
-- Performs cosine similarity search on policy_chunks.
-- Executes under the CALLING USER'S RLS context (SECURITY INVOKER).
-- This means RLS policies on policy_chunks are enforced automatically.
CREATE OR REPLACE FUNCTION match_policy_chunks(
  query_embedding VECTOR(3072),
  match_threshold FLOAT DEFAULT 0.6,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  chunk_text  TEXT,
  chunk_index INTEGER,
  version_id  UUID,
  similarity  FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER  -- CRITICAL: runs as the calling user, RLS is enforced
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.chunk_text,
    pc.chunk_index,
    pc.version_id,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM policy_chunks pc
  WHERE 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── Seed Data (Optional — remove before production) ─────────────────────────
-- INSERT INTO users (email, password_hash, name, department, role)
-- VALUES ('admin@company.com', '<bcrypt_hash>', 'HR Admin', 'Human Resources', 'hr_admin');
