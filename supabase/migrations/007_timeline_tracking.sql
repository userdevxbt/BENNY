-- Add timeline tracking columns to opportunities table
-- These columns track when each target/zone/stop was hit

-- Zone Hit tracking
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS zone_hit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS zone_hit_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS zone_hit_price DECIMAL(20, 8);

-- TP1 Hit tracking
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS tp_hit_1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tp_hit_1_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tp_hit_1_price DECIMAL(20, 8);

-- TP2 Hit tracking
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS tp_hit_2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tp_hit_2_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tp_hit_2_price DECIMAL(20, 8);

-- TP3 Hit tracking
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS tp_hit_3 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tp_hit_3_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tp_hit_3_price DECIMAL(20, 8);

-- Stop Loss Hit tracking
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS sl_hit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sl_hit_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sl_hit_price DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS is_stopped BOOLEAN DEFAULT FALSE;

-- Opportunity completion tracking
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS close_reason VARCHAR(50);

-- Optional: Create events table for detailed history
CREATE TABLE IF NOT EXISTS opportunity_events (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    hit_price DECIMAL(20, 8),
    direction VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Index for faster event lookups
CREATE INDEX IF NOT EXISTS idx_opportunity_events_symbol ON opportunity_events(symbol);
CREATE INDEX IF NOT EXISTS idx_opportunity_events_type ON opportunity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_opportunity_events_created ON opportunity_events(created_at DESC);

-- RLS for events table
ALTER TABLE opportunity_events ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then create them
DROP POLICY IF EXISTS "Allow read opportunity_events" ON opportunity_events;
DROP POLICY IF EXISTS "Allow insert opportunity_events" ON opportunity_events;

-- Allow read access to authenticated users
CREATE POLICY "Allow read opportunity_events" 
ON opportunity_events FOR SELECT 
TO authenticated, anon
USING (true);

-- Allow insert for service role
CREATE POLICY "Allow insert opportunity_events" 
ON opportunity_events FOR INSERT 
TO authenticated, anon
WITH CHECK (true);

COMMENT ON COLUMN opportunities.zone_hit IS 'True when price entered the entry zone';
COMMENT ON COLUMN opportunities.tp_hit_1 IS 'True when TP1 target was hit';
COMMENT ON COLUMN opportunities.tp_hit_2 IS 'True when TP2 target was hit';
COMMENT ON COLUMN opportunities.tp_hit_3 IS 'True when TP3 target was hit';
COMMENT ON COLUMN opportunities.sl_hit IS 'True when Stop Loss was hit';
COMMENT ON COLUMN opportunities.is_stopped IS 'True if opportunity was stopped out';
COMMENT ON COLUMN opportunities.is_completed IS 'True if all targets were hit';
COMMENT ON COLUMN opportunities.close_reason IS 'Reason for closing: stop_loss, all_targets, manual';
