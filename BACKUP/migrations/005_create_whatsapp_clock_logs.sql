-- Create table to log WhatsApp clock attempts
CREATE TABLE IF NOT EXISTS whatsapp_clock_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- clock_in, clock_out, pause, return, status
    result VARCHAR(50) NOT NULL, -- success, invalid_pin, error
    message_id VARCHAR(255),
    message_body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes for queries
    INDEX idx_whatsapp_logs_user (user_id),
    INDEX idx_whatsapp_logs_phone (phone),
    INDEX idx_whatsapp_logs_created (created_at)
);

-- Add phone field to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Grant permissions
GRANT SELECT, INSERT ON whatsapp_clock_logs TO authenticated;
GRANT SELECT, UPDATE ON users TO authenticated;