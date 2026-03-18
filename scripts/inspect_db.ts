
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Connecting to:", supabaseUrl);
    // Try to list rows
    const { data, error } = await supabase.from('locations').select('*').limit(1);

    if (error) {
        console.error('Error selecting:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No data in locations table. Trying to insert a dummy to see schema error if possible context allows? No, better just report empty.');
        // If empty, we can't see columns via select result keys. 
        // But we can try to RPC or just fail gracefully.
        return;
    }

    const keys = Object.keys(data[0]);
    console.log('Columns found:', keys.join(', '));
}

inspect();
