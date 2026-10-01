import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pehkabxxhivuuyrvpmmw.supabase.co', 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy');

async function test() {
  const payload = {
    email: null,
    department: null,
    nif: null,
    cc: null,
    niss: null,
    nationality: null,
    marital_status: null,
    address: null,
    birth_date: null,
    admission_date: null,
    phone: null,
    photo_url: null,
    work_start_time: null,
    work_end_time: null,
    lunch_start_time: null,
    lunch_end_time: null,
    attendance_config: null,
    onboarding_tasks: null,
    mobile_phone: null,
    whatsapp_enabled: false,
    documents: null,
    iban: null,
    vacation_days_yearly: null,
    vacation_days_carryover: null,
    vacation_adjustments: null,
    emergency_contact: null,
    bio: null,
    pin: null,
    requires_new_pin: false,
    location_id: null,
    location_ids: [],
    schedule_template_id: null,
    schedule_cycle_start_date: null
  };
  const { data, error } = await supabase.from('users').update(payload).eq('id', 73);
  console.log("Error:", error);
}
test();
