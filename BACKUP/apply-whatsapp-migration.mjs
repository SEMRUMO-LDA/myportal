#!/usr/bin/env node

/**
 * Apply WhatsApp Clock Migration
 * Safe migration that adds WhatsApp support without breaking existing system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runMigration() {
    console.log('🚀 Starting WhatsApp Clock Migration...\n');

    try {
        // Step 1: Create whatsapp_clock_logs table
        console.log('📋 Creating whatsapp_clock_logs table...');

        const { error: tableError } = await supabase.rpc('exec_sql', {
            sql: `
                -- Create table to log WhatsApp clock attempts
                CREATE TABLE IF NOT EXISTS whatsapp_clock_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    phone VARCHAR(50) NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    result VARCHAR(50) NOT NULL,
                    message_id VARCHAR(255),
                    message_body TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );

                -- Create indexes for performance
                CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user ON whatsapp_clock_logs(user_id);
                CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone ON whatsapp_clock_logs(phone);
                CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_clock_logs(created_at);
            `
        });

        if (tableError) {
            // Try alternative approach without exec_sql
            console.log('⚠️  exec_sql not available, trying direct query...');

            // Since we can't create tables directly via RPC, we'll check if it exists
            const { data: tables } = await supabase
                .from('whatsapp_clock_logs')
                .select('id')
                .limit(1);

            if (!tables) {
                console.log('✅ Table will need to be created manually in Supabase dashboard');
                console.log('\n📝 SQL to run in Supabase SQL Editor:\n');
                console.log(`
CREATE TABLE IF NOT EXISTS whatsapp_clock_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    result VARCHAR(50) NOT NULL,
    message_id VARCHAR(255),
    message_body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user ON whatsapp_clock_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone ON whatsapp_clock_logs(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_clock_logs(created_at);
                `);
            } else {
                console.log('✅ Table whatsapp_clock_logs already exists');
            }
        } else {
            console.log('✅ Table whatsapp_clock_logs created/verified');
        }

        // Step 2: Add phone column to users table
        console.log('\n📱 Adding phone column to users table...');

        // Check if column exists first
        const { data: userSample } = await supabase
            .from('users')
            .select('*')
            .limit(1)
            .single();

        if (userSample && !userSample.hasOwnProperty('phone')) {
            console.log('⚠️  Phone column needs to be added manually');
            console.log('\n📝 SQL to run in Supabase SQL Editor:\n');
            console.log(`
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
            `);
        } else if (userSample && userSample.hasOwnProperty('phone')) {
            console.log('✅ Phone column already exists in users table');
        }

        // Step 3: Add test phone number to user 73
        console.log('\n📞 Adding test phone to user 73...');

        const { data: user73, error: userError } = await supabase
            .from('users')
            .select('id, name, phone')
            .eq('id', 73)
            .single();

        if (user73) {
            if (!user73.phone || user73.phone === '') {
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ phone: '912345678' }) // Portuguese mobile format
                    .eq('id', 73);

                if (updateError) {
                    console.log(`⚠️  Could not update phone: ${updateError.message}`);
                    console.log('\n📝 SQL to run manually:');
                    console.log(`UPDATE users SET phone = '912345678' WHERE id = 73;`);
                } else {
                    console.log(`✅ Added test phone to user 73`);
                }
            } else {
                console.log(`✅ User 73 already has phone: ${user73.phone}`);
            }
        } else {
            console.log('⚠️  User 73 not found');
        }

        // Step 4: Check time_logs structure
        console.log('\n🔍 Checking time_logs table structure...');

        const { data: timeLogs } = await supabase
            .from('time_logs')
            .select('*')
            .limit(1);

        if (timeLogs) {
            const sample = timeLogs[0] || {};
            console.log('✅ time_logs columns found:', Object.keys(sample).join(', '));

            // Check if we need to add action column
            if (!sample.hasOwnProperty('action')) {
                console.log('\n⚠️  Missing "action" column in time_logs');
                console.log('📝 SQL to add action column:');
                console.log(`
ALTER TABLE time_logs
ADD COLUMN IF NOT EXISTS action VARCHAR(50);

-- Update existing records based on check_in/check_out
UPDATE time_logs
SET action = CASE
    WHEN check_in IS NOT NULL THEN 'clock_in'
    WHEN check_out IS NOT NULL THEN 'clock_out'
    ELSE 'unknown'
END
WHERE action IS NULL;
                `);
            }

            if (!sample.hasOwnProperty('source')) {
                console.log('\n📝 SQL to add source column (optional):');
                console.log(`
ALTER TABLE time_logs
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'kiosk';
                `);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 Migration Check Complete!');
        console.log('='.repeat(50));

        console.log(`
📋 Next Steps:

1. ✅ Review any SQL commands shown above
2. ✅ Run them in Supabase SQL Editor if needed
3. ✅ Test with: node test-whatsapp-clock.mjs
4. ✅ Configure webhook in Wassenger

🔗 Supabase SQL Editor:
   ${supabaseUrl.replace('.supabase.co', '.supabase.com')}/project/${supabaseUrl.match(/https:\/\/(.+?)\.supabase/)[1]}/sql

📱 Wassenger Webhook Settings:
   - URL: https://semrumo.eu/api/whatsapp-webhook
   - Method: POST
   - Events: message:in
   - Secret: ${process.env.WASSENGER_WEBHOOK_SECRET || 'Set in .env.local'}
        `);

    } catch (error) {
        console.error('❌ Migration error:', error);
    }
}

// Run migration
runMigration();