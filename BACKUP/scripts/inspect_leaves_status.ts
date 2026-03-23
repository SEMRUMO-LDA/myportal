
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase URL or Anon Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
    console.log("Checking leaves status values...");
    const { data, error } = await supabase.from('leaves').select('status');

    if (error) {
        console.error("Error:", error);
    } else {
        const statuses = [...new Set(data?.map(r => r.status))];
        console.log("Distinct statuses found:", statuses);
        console.log("Total records:", data?.length);
    }
}

inspect();
