import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { User, UserStatus, Company } from '../../types';
import { DEFAULT_ATTENDANCE_CONFIG, DEFAULT_ONBOARDING_TASKS } from '../../constants';

/**
 * Hook to fetch all active users
 *
 * Features:
 * - Caches users for 2 minutes (rarely change)
 * - Background refetch on window focus
 * - Persisted to IndexedDB
 *
 * Usage:
 * const { data: users, isLoading, error } = useUsers();
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('[useUsers] Fetching users from Supabase...');

      const { data, error } = await supabase
        .from('users')
        .select('id, name, role, email, pin, status, company, department, work_start_time, work_end_time, photo_url, attendance_config, created_at, birth_date, admission_date, phone, emergency_contact, bio, iban, nif, cc, address, lunch_start_time, lunch_end_time, vacation_days_yearly, vacation_days_carryover, vacation_adjustments, niss, nationality, marital_status, mobile_phone, whatsapp_enabled, location_id, location_ids, schedule_cycle_start_date, requires_new_pin')
        .eq('status', 'ACTIVE')
        .order('id', { ascending: true });

      if (error) {
        console.error('[useUsers] ❌ Supabase error:', error);
        throw error;
      }

      const users: User[] = data.map((u: any) => ({
        // Essential fields
        id: u.id,
        name: u.name || '',
        role: u.role || '',
        company: u.company as Company || Company.SEMRUMO,
        email: u.email || '',
        department: u.department || '',
        status: u.status as UserStatus || UserStatus.ACTIVE,
        photoUrl: u.photo_url || 'https://picsum.photos/200/200',
        attendanceConfig: u.attendance_config || DEFAULT_ATTENDANCE_CONFIG,
        workStartTime: u.work_start_time || '09:00',
        workEndTime: u.work_end_time || '18:00',
        pin: u.pin,
        requiresNewPin: u.requires_new_pin || false,
        created_at: u.created_at || new Date().toISOString(),

        // Optional fields with defaults
        iban: u.iban || '',
        nif: u.nif || '',
        cc: u.cc || '',
        address: u.address || '',
        birthDate: u.birth_date || '',
        admissionDate: u.admission_date || new Date().toISOString().split('T')[0],
        phone: u.phone || '',
        emergencyContact: u.emergency_contact,
        bio: u.bio,
        onboardingTasks: DEFAULT_ONBOARDING_TASKS,
        documents: [],
        lunchStartTime: u.lunch_start_time || '13:00',
        lunchEndTime: u.lunch_end_time || '14:00',
        vacationDaysYearly: u.vacation_days_yearly || 0,
        vacationDaysCarryover: u.vacation_days_carryover || 0,
        vacationAdjustments: u.vacation_adjustments || 0,
        niss: u.niss || '',
        nationality: u.nationality || '',
        maritalStatus: u.marital_status,
        mobilePhone: u.mobile_phone || '',
        whatsappEnabled: u.whatsapp_enabled || false,
        locationId: u.location_id,
        locationIds: u.location_ids || [],
        scheduleCycleStartDate: u.schedule_cycle_start_date
      }));

      console.log(`[useUsers] ✅ Loaded ${users.length} users`);
      return users;
    },

    // Users rarely change, keep them fresh for 2 minutes
    staleTime: 1000 * 60 * 2,

    // Keep in cache for 5 minutes even if not used
    gcTime: 1000 * 60 * 5,

    // Refetch stale data when user returns to app
    refetchOnWindowFocus: true,

    // Retry on failure
    retry: 2,
  });
}
