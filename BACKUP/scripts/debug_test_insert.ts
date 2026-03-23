
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env validation
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envConfig: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInsert() {
    console.log("Attempting debug insert...");
    // Attempt to insert with ALL fields mapped in App.tsx to provoke the specific column error
    const testPayload = {
        name: 'DEBUG_TEST_LOCATION_' + Date.now(),
        address: 'Debug Address',
        observations: 'Debug Obs',
        locality: 'Debug City',
        // postal_code: '1234-567', // Try snake_case
        // coordinates: { lat: 0, lng: 0, radius: 100 },
        // extra_hours_start: 10,
        // missing_hours_start: 10,
        // count_extra_after_exit: false,
        // timezone: 'Europe/Lisbon',
        status: 'active'
    };

    // We try to insert what App.tsx inserts to fail exactly same way
    const appTsxPayload = {
        name: 'DEBUG_FULL_' + Date.now(),
        address: 'Test Addr',
        observations: '',
        locality: 'Test Loc',
        postal_code: '4000-000',
        mobile: '910000000',
        phone: '220000000',
        email: 'test@example.com',
        tolerance_entry: 10,
        tolerance_exit: 10,
        block_entry: false,
        block_exit: false,
        allowed_ips: '',
        // notification_emails: { email1: '', email2: '' }, // JSONB often tricky, leave for now 
        status: 'active',
        // The suspicious ones:
        coordinates: { lat: 41.1, lng: -8.6, radius: 100 },
        extra_hours_start: 0,
        missing_hours_start: 0,
        count_extra_after_exit: false,
        timezone: 'Europe/Lisbon'
    };

    const { data, error } = await supabase.from('locations').insert(appTsxPayload).select().single();

    if (error) {
        console.error("INSERT ERROR FULL:", JSON.stringify(error, null, 2));
    } else {
        console.log("INSERT SUCCESS! ID:", data.id);
        // Cleanup
        await supabase.from('locations').delete().eq('id', data.id);
    }
}

debugInsert();
