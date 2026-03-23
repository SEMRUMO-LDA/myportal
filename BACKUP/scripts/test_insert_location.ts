
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("Attempting to insert test location...");

    const payload = {
        name: "Test Location " + Date.now(),
        status: "active",
        // Field that often causes issues if missing in DB
        coordinates: { "lat": 0, "lng": 0 },
        notification_emails: { "email": "test@test.com" },
        tolerance_entry: 10,
        address: "Test Address"
    };

    const { data, error } = await supabase.from('locations').insert(payload).select();

    if (error) {
        console.error("❌ INSERT FAILED!");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
    } else {
        console.log("✅ INSERT SUCCESS!");
        console.log("Inserted ID:", data[0]?.id);

        // Clean up
        if (data[0]?.id) {
            await supabase.from('locations').delete().eq('id', data[0].id);
            console.log("Cleaned up test row.");
        }
    }
}

testInsert();
