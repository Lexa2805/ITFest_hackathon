-- Create health_exports table to store user health data from Apple Health exports
CREATE TABLE IF NOT EXISTS health_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parsed_metrics JSONB NOT NULL,
    physical_state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_health_exports_user_id ON health_exports(user_id);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_health_exports_updated_at ON health_exports(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE health_exports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own health data
CREATE POLICY "Users can view their own health data"
    ON health_exports
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own health data
CREATE POLICY "Users can insert their own health data"
    ON health_exports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own health data
CREATE POLICY "Users can update their own health data"
    ON health_exports
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own health data
CREATE POLICY "Users can delete their own health data"
    ON health_exports
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE health_exports IS 'Stores parsed health metrics and physical state scores from Apple Health exports';
