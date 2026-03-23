import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read env from .env file
const envFile = fs.readFileSync('.env.local', 'utf-8');
const envConfig: Record<string, string> = {};
envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length) {
        envConfig[key.trim()] = values.join('=').trim();
    }
});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE keys in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log("=== CHECKING SCHEDULE TABLES ===\n");
    console.log("Connecting to:", supabaseUrl);
    console.log("Using key type:", envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON_KEY');
    console.log("");

    // Check schedule_templates table
    console.log("1. Checking 'schedule_templates' table...");
    const { data: templates, error: templatesError } = await supabase
        .from('schedule_templates')
        .select('*')
        .limit(5);

    if (templatesError) {
        console.error("   ❌ ERROR:", templatesError.message);
        console.error("   Code:", templatesError.code);
        if (templatesError.message.includes('does not exist')) {
            console.log("\n   ➡️  TABLE DOES NOT EXIST! Run supabase_scheduling_setup.sql in Supabase SQL Editor.");
        }
    } else {
        console.log("   ✅ Table exists! Found", templates?.length || 0, "records.");
    }

    // Check leave_types table
    console.log("\n2. Checking 'leave_types' table...");
    const { data: leaveTypes, error: leaveTypesError } = await supabase
        .from('leave_types')
        .select('*')
        .limit(5);

    if (leaveTypesError) {
        console.error("   ❌ ERROR:", leaveTypesError.message);
    } else {
        console.log("   ✅ Table exists! Found", leaveTypes?.length || 0, "records.");
    }

    // Check leaves table
    console.log("\n3. Checking 'leaves' table...");
    const { data: leaves, error: leavesError } = await supabase
        .from('leaves')
        .select('*')
        .limit(5);

    if (leavesError) {
        console.error("   ❌ ERROR:", leavesError.message);
    } else {
        console.log("   ✅ Table exists! Found", leaves?.length || 0, "records.");
    }

    // Try to insert a test template
    console.log("\n4. Testing INSERT into 'schedule_templates'...");
    const testTemplate = {
        name: 'TEST_DELETE_ME_' + Date.now(),
        weekly_pattern: [],
        total_weekly_hours: 40.00
    };

    const { data: insertedData, error: insertError } = await supabase
        .from('schedule_templates')
        .insert(testTemplate)
        .select()
        .single();

    if (insertError) {
        console.error("   ❌ INSERT FAILED:", insertError.message);
        console.error("   Code:", insertError.code);
        console.error("   Hint:", insertError.hint || 'N/A');

        if (insertError.code === '42501') {
            console.log("\n   ➡️  RLS POLICY BLOCKING INSERT! Need to update insert policy.");
        } else if (insertError.message.includes('does not exist')) {
            console.log("\n   ➡️  TABLE DOES NOT EXIST! Run supabase_scheduling_setup.sql");
        }
    } else {
        console.log("   ✅ INSERT SUCCESS! ID:", insertedData?.id);

        // Clean up test record
        if (insertedData?.id) {
            await supabase.from('schedule_templates').delete().eq('id', insertedData.id);
            console.log("   🧹 Test record cleaned up.");
        }
    }

    console.log("\n=== CHECK COMPLETE ===");
}

checkTables().catch(console.error);
