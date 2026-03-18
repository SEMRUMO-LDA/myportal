import { supabase } from './supabaseClient';
import { Vehicle, Trip, VehicleExpense, MaintenanceRecord, VehicleStatus, TripStatus, VehicleBooking, BookingStatus } from '../types';

// ============================================
// VEHICLE OPERATIONS
// ============================================

export async function fetchVehicles(): Promise<Vehicle[]> {
    const { data, error } = await supabase
        .from('vehicles')
        .select(`
            *,
            assigned_user:users(id, name, company)
        `)
        .order('plate', { ascending: true });

    if (error) {
        console.error('Error fetching vehicles:', error);
        throw error;
    }

    return (data || []).map(mapVehicleFromDb);
}

export async function fetchVehiclesByCompany(company: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
        .from('vehicles')
        .select(`
      *,
      assigned_user:users(id, name, company)
    `)
        .eq('company', company)
        .order('plate', { ascending: true });

    if (error) {
        console.error('Error fetching vehicles by company:', error);
        return [];
    }

    return (data || []).map(mapVehicleFromDb);
}

export async function fetchVehicleByUserId(userId: number): Promise<Vehicle | null> {
    const { data, error } = await supabase
        .from('vehicles')
        .select(`
            *,
            assigned_user:users(id, name, company)
        `)
        .eq('assigned_user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        console.error('Error fetching vehicle by user:', error);
        return null;
    }

    return data ? mapVehicleFromDb(data) : null;
}

export async function fetchVehicleById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
        .from('vehicles')
        .select(`
            *,
            assigned_user:users(id, name, company)
        `)
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching vehicle by id:', error);
        return null;
    }

    return data ? mapVehicleFromDb(data) : null;
}

export async function createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at'>): Promise<Vehicle | null> {
    const { data, error } = await supabase
        .from('vehicles')
        .insert(mapVehicleToDb(vehicle))
        .select(`
            *,
            assigned_user:users(id, name, company)
        `)
        .single();

    if (error) {
        console.error('Error creating vehicle:', error);
        throw error;
    }

    return data ? mapVehicleFromDb(data) : null;
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
    const { data: updatedVeh, error } = await supabase
        .from('vehicles')
        .update(mapVehicleToDb(updates))
        .eq('id', id)
        .select(`
            *,
            assigned_user:users(id, name, company)
        `)
        .single();

    if (error) {
        console.error('Error updating vehicle:', error);
        throw new Error(error.message); // Explicitly throw so frontend catches it
    }

    return updatedVeh ? mapVehicleFromDb(updatedVeh) : null;
}

export async function deleteVehicle(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting vehicle:', error);
        throw error;
    }

    return true;
}

// ============================================
// TRIP OPERATIONS
// ============================================

export async function fetchTrips(vehicleId?: string, userId?: number): Promise<Trip[]> {
    let query = supabase
        .from('trips')
        .select(`
      *,
      vehicle:vehicles(*),
      user:users(id, name, company)
    `)
        .order('start_date', { ascending: false });

    if (vehicleId) query = query.eq('vehicle_id', vehicleId);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching trips:', error);
        return [];
    }

    return (data || []).map(mapTripFromDb);
}

/**
 * Fetch all trips for a specific month, with vehicle and user data populated.
 * Used for monthly trip reports.
 */
export async function fetchTripsForMonth(year: number, month: number): Promise<Trip[]> {
    // Month is 1-indexed (1 = January)
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString(); // Start of next month

    const { data, error } = await supabase
        .from('trips')
        .select(`
            *,
            vehicle:vehicles(*),
            user:users(id, name, company)
        `)
        .gte('start_date', startDate)
        .lt('start_date', endDate)
        .order('vehicle_id', { ascending: true })
        .order('start_date', { ascending: true });

    if (error) {
        console.error('Error fetching trips for month:', error);
        return [];
    }

    return (data || []).map(mapTripFromDb);
}

export async function fetchLastTrip(vehicleId: string): Promise<Trip | null> {
    const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          vehicle:vehicles(*),
          user:users(id, name, company)
        `)
        .eq('vehicle_id', vehicleId)
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching last trip:', error);
        return null;
    }
    return data ? mapTripFromDb(data) : null;
}

export async function fetchUserTopVehicles(userId: number, limit: number = 3): Promise<Vehicle[]> {
    const { data: trips, error } = await supabase
        .from('trips')
        .select(`
            vehicle:vehicles(*)
        `)
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching user top vehicles:', error);
        return [];
    }

    if (!trips) return [];

    const counts: Record<string, number> = {};
    const vehicleMap: Record<string, Vehicle> = {};

    trips.forEach((t) => {
        // Explicitly check if vehicle exists and matches our Vehicle type structure
        if (!t.vehicle) return;
        const v = t.vehicle as unknown as Vehicle; // Safe cast since we selected (*)
        const vId = v.id;

        counts[vId] = (counts[vId] || 0) + 1;
        vehicleMap[vId] = mapVehicleFromDb(v);
    });

    const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return sortedIds.slice(0, limit).map(id => vehicleMap[id]);
}

// 2.3 Get Active Trip
export async function fetchActiveTrip(userId: number): Promise<Trip | null> {
    const { data, error } = await supabase
        .from('trips')
        .select(`
            *,
            vehicle:vehicles(*)
        `)
        .eq('user_id', userId)
        .is('end_km', null)
        .order('start_date', { ascending: false })
        .limit(1);

    if (error) {
        console.warn('Numeric filter failed, retrying with string:', error.message);
        const { data: retryData, error: retryError } = await supabase
            .from('trips')
            .select(`
                *,
                vehicle:vehicles(*)
            `)
            .eq('user_id', String(userId))
            .is('end_km', null)
            .order('start_date', { ascending: false })
            .limit(1);

        if (retryError) {
            console.error('Error fetching active trip:', retryError);
            return null;
        }
        return (retryData && retryData.length > 0) ? mapTripFromDb(retryData[0]) : null;
    }

    return (data && data.length > 0) ? mapTripFromDb(data[0]) : null;
}

export async function fetchActiveTripByVehicle(vehicleId: string): Promise<Trip | null> {
    const { data, error } = await supabase
        .from('trips')
        .select(`
            *,
            vehicle:vehicles(*)
        `)
        .eq('vehicle_id', vehicleId)
        .is('end_km', null)
        .order('start_date', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching active trip by vehicle:', error);
        return null;
    }

    return (data && data.length > 0) ? mapTripFromDb(data[0]) : null;
}

export async function startTrip(vehicleId: string, userId: number, startKm: number, purpose?: string, destination?: string, location?: string): Promise<Trip | null> {
    if (!vehicleId || !userId || startKm === undefined || startKm === null) {
        console.error('Invalid parameters for startTrip:', { vehicleId, userId, startKm });
        throw new Error('Parâmetros inválidos para iniciar viagem.');
    }

    const payload = {
        p_vehicle_id: vehicleId,
        p_user_id: userId,
        p_start_km: Number(startKm),
        p_purpose: purpose || null,
        p_destination: destination || null,
        p_location: location || null
    };

    const { data, error } = await supabase.rpc('start_trip_rpc', payload);

    if (error) {
        console.error('Error starting trip (RPC):', error);
        throw error;
    }

    // The RPC returns { ...trip, vehicle: { ... } } structure but keys might be raw DB keys
    // We need to ensure mapping is correct if RPC returns raw snake_case JSON
    // mapTripFromDb handles snake_case, so it should be fine if we pass the object.
    return data ? mapTripFromDb(data) : null;
}

export async function endTrip(tripId: number | string, endKm: number, location?: string): Promise<Trip | null> {
    const { data, error } = await supabase.rpc('end_trip_rpc', {
        p_trip_id: typeof tripId === 'string' ? parseInt(tripId) : tripId, // Assuming trip ID in DB is bigint. If it's UUID, remove parseInt. Based on previous code it seemed numeric.
        p_end_km: endKm,
        p_location: location || null
    });

    if (error) {
        console.error('Error ending trip (RPC):', error);
        throw error;
    }

    return data ? mapTripFromDb(data) : null;
}

// ============================================
// VEHICLE EXPENSE OPERATIONS
// ============================================

export async function fetchVehicleExpenses(vehicleId?: string, userId?: number): Promise<VehicleExpense[]> {
    let query = supabase
        .from('vehicle_expenses')
        .select(`
      *,
      vehicle:vehicles(id, plate, brand, model),
      user:users(id, name),
      trip:trips(id, start_date, destination)
    `)
        .order('date', { ascending: false });

    if (vehicleId) query = query.eq('vehicle_id', vehicleId);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching vehicle expenses:', error);
        return [];
    }

    return (data || []).map(mapVehicleExpenseFromDb);
}

export async function createVehicleExpense(expense: Omit<VehicleExpense, 'id' | 'created_at'>): Promise<VehicleExpense | null> {
    const { data, error } = await supabase
        .from('vehicle_expenses')
        .insert(mapVehicleExpenseToDb(expense))
        .select()
        .single();

    if (error) {
        console.error('Error creating vehicle expense:', error);
        return null;
    }

    return data ? mapVehicleExpenseFromDb(data) : null;
}

// ============================================
// MAINTENANCE OPERATIONS
// ============================================

export async function fetchMaintenanceRecords(vehicleId?: string): Promise<MaintenanceRecord[]> {
    let query = supabase
        .from('maintenance_records')
        .select(`
      *,
      vehicle:vehicles(id, plate, brand, model)
    `)
        .order('date', { ascending: false });

    if (vehicleId) query = query.eq('vehicle_id', vehicleId);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching maintenance records:', error);
        return [];
    }

    return (data || []).map(mapMaintenanceFromDb);
}

export async function createMaintenanceRecord(record: Omit<MaintenanceRecord, 'id' | 'created_at'>): Promise<MaintenanceRecord | null> {
    const { data, error } = await supabase
        .from('maintenance_records')
        .insert(mapMaintenanceToDb(record))
        .select()
        .single();

    if (error) {
        console.error('Error creating maintenance record:', error);
        return null;
    }

    return data ? mapMaintenanceFromDb(data) : null;
}

// ============================================
// MAINTENANCE CHECKLIST OPERATIONS
// ============================================

export async function fetchMaintenanceChecklists(vehicleId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('vehicle_maintenance_checklists')
        .select(`
            *,
            user:users(id, name)
        `)
        .eq('vehicle_id', vehicleId)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching maintenance checklists:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        vehicleId: row.vehicle_id,
        userId: row.user_id,
        user: row.user,
        date: row.date,
        items: row.items,
        generalNotes: row.general_notes,
        created_at: row.created_at
    }));
}

export async function createMaintenanceChecklist(checklist: {
    vehicleId: string;
    userId: number;
    date: string;
    items: Record<string, { status: string; notes?: string }>;
    generalNotes?: string;
}): Promise<any | null> {
    const { data, error } = await supabase
        .from('vehicle_maintenance_checklists')
        .insert({
            vehicle_id: checklist.vehicleId,
            user_id: checklist.userId,
            date: checklist.date,
            items: checklist.items,
            general_notes: checklist.generalNotes
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating maintenance checklist:', error);
        return null;
    }

    return data;
}

// ============================================
// HELPER FOR DEMO/TESTING
// ============================================

export async function assignFreeVehicleToUser(userId: number): Promise<Vehicle | null> {
    // 1. Find a vehicle without assigned user
    const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*')
        .is('assigned_user_id', null)
        .limit(1);

    if (!vehicles || vehicles.length === 0) return null;

    const vehicle = vehicles[0];

    // 2. Assign to user
    const { data, error } = await supabase
        .from('vehicles')
        .update({ assigned_user_id: userId })
        .eq('id', vehicle.id)
        .select()
        .single();

    if (error) {
        console.error('Error assigning vehicle:', error);
        return null;
    }

    return data ? mapVehicleFromDb(data) : null;
}

// ============================================
// MAPPERS (DB <-> App)
// ============================================

function mapVehicleFromDb(row: any): Vehicle {
    return {
        id: row.id,
        plate: row.plate,
        brand: row.brand || '',
        model: row.model || '',
        year: row.year,
        company: row.company || '',
        status: (row.status === 'AVALIABLE' ? VehicleStatus.AVAILABLE : row.status) as VehicleStatus || VehicleStatus.AVAILABLE,
        currentKm: row.current_kms || 0,
        assignedUserId: row.assigned_user_id,
        assignedUser: row.assigned_user,
        inspectionDate: row.inspection_date,
        nextInspection: row.next_inspection,
        insuranceExpiry: row.insurance_expiry,
        photoUrl: row.photo_url,
        notes: row.notes,
        created_at: row.created_at
    };
}

function mapVehicleToDb(vehicle: Partial<Vehicle>): any {
    const result: any = {};
    if (vehicle.plate !== undefined) result.plate = vehicle.plate;
    if (vehicle.brand !== undefined) result.brand = vehicle.brand;
    if (vehicle.model !== undefined) result.model = vehicle.model;
    if (vehicle.year !== undefined) result.year = vehicle.year;
    if (vehicle.company !== undefined) result.company = vehicle.company;
    if (vehicle.status !== undefined) result.status = vehicle.status;
    if (vehicle.currentKm !== undefined) result.current_kms = vehicle.currentKm;
    if (vehicle.assignedUserId !== undefined) result.assigned_user_id = vehicle.assignedUserId;
    if (vehicle.inspectionDate !== undefined) result.inspection_date = vehicle.inspectionDate;
    if (vehicle.nextInspection !== undefined) result.next_inspection = vehicle.nextInspection;
    if (vehicle.insuranceExpiry !== undefined) result.insurance_expiry = vehicle.insuranceExpiry;
    if (vehicle.photoUrl !== undefined) result.photo_url = vehicle.photoUrl;
    if (vehicle.notes !== undefined) result.notes = vehicle.notes;
    return result;
}

function mapTripFromDb(row: any): Trip {
    return {
        id: row.id,
        vehicleId: row.vehicle_id,
        vehicle: row.vehicle ? mapVehicleFromDb(row.vehicle) : undefined,
        userId: row.user_id,
        user: row.user,
        startDate: row.start_date,
        endDate: row.end_date,
        startKm: row.start_km,
        endKm: row.end_km,
        purpose: row.purpose,
        destination: row.destination,
        status: row.status as TripStatus,
        created_at: row.created_at
    };
}

function mapVehicleExpenseFromDb(row: any): VehicleExpense {
    return {
        id: row.id,
        vehicleId: row.vehicle_id,
        vehicle: row.vehicle ? mapVehicleFromDb(row.vehicle) : undefined,
        userId: row.user_id,
        user: row.user,
        tripId: row.trip_id,
        trip: row.trip,
        date: row.date,
        category: row.category,
        amount: parseFloat(row.amount) || 0,
        description: row.description,
        receiptUrl: row.receipt_url,
        liters: row.liters ? parseFloat(row.liters) : undefined,
        kmAtFuel: row.km_at_fuel,
        created_at: row.created_at
    };
}

function mapVehicleExpenseToDb(expense: Partial<VehicleExpense>): any {
    const result: any = {};
    if (expense.vehicleId !== undefined) result.vehicle_id = expense.vehicleId;
    if (expense.userId !== undefined) result.user_id = expense.userId;
    if (expense.tripId !== undefined) result.trip_id = expense.tripId;
    if (expense.date !== undefined) result.date = expense.date;
    if (expense.category !== undefined) result.category = expense.category;
    if (expense.amount !== undefined) result.amount = expense.amount;
    if (expense.description !== undefined) result.description = expense.description;
    if (expense.receiptUrl !== undefined) result.receipt_url = expense.receiptUrl;
    if (expense.liters !== undefined) result.liters = expense.liters;
    if (expense.kmAtFuel !== undefined) result.km_at_fuel = expense.kmAtFuel;
    return result;
}

function mapMaintenanceFromDb(row: any): MaintenanceRecord {
    return {
        id: row.id,
        vehicleId: row.vehicle_id,
        vehicle: row.vehicle ? mapVehicleFromDb(row.vehicle) : undefined,
        type: row.type,
        date: row.date,
        km: row.km || 0,
        cost: row.cost ? parseFloat(row.cost) : undefined,
        description: row.description,
        nextDueDate: row.next_due_date,
        nextDueKm: row.next_due_km,
        provider: row.provider,
        invoiceUrl: row.invoice_url,
        created_at: row.created_at
    };
}

function mapMaintenanceToDb(record: Partial<MaintenanceRecord>): any {
    const result: any = {};
    if (record.vehicleId !== undefined) result.vehicle_id = record.vehicleId;
    if (record.type !== undefined) result.type = record.type;
    if (record.date !== undefined) result.date = record.date;
    if (record.km !== undefined) result.km = record.km;
    if (record.cost !== undefined) result.cost = record.cost;
    if (record.description !== undefined) result.description = record.description;
    if (record.nextDueDate !== undefined) result.next_due_date = record.nextDueDate;
    if (record.nextDueKm !== undefined) result.next_due_km = record.nextDueKm;
    if (record.provider !== undefined) result.provider = record.provider;
    if (record.invoiceUrl !== undefined) result.invoice_url = record.invoiceUrl;
    return result;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getInspectionStatus(nextInspection?: string): 'OK' | 'UPCOMING' | 'EXPIRED' | undefined {
    if (!nextInspection) return undefined;

    const today = new Date();
    const inspDate = new Date(nextInspection);
    const diffDays = Math.ceil((inspDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'EXPIRED';
    if (diffDays <= 30) return 'UPCOMING';
    return 'OK';
}

export function calculateTripDistance(startKm: number, endKm?: number): number {
    if (!endKm) return 0;
    return endKm - startKm;
}

// ============================================
// STORAGE OPERATIONS
// ============================================

export async function uploadReceiptImage(file: File): Promise<string | null> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('receipts') // Ensure this bucket exists in Supabase
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading receipt:', uploadError);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error in uploadReceiptImage:', error);
        return null;
    }
}
// ============================================
// BOOKING OPERATIONS
// ============================================

export async function fetchBookings(startDate: string, endDate: string): Promise<VehicleBooking[]> {
    const { data, error } = await supabase
        .from('vehicle_bookings')
        .select(`
            *,
            vehicle:vehicles(id, plate, brand, model, photo_url),
            user:users(id, name, company)
        `)
        .gte('end_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }

    return (data || []).map(mapBookingFromDb);
}

export async function createBooking(booking: Omit<VehicleBooking, 'id' | 'createdAt' | 'status'>): Promise<VehicleBooking | null> {
    // Check for conflicts
    const isAvailable = await checkAvailability(booking.vehicleId, booking.startTime, booking.endTime);

    if (!isAvailable) {
        throw new Error('Veículo indisponível para o período selecionado.');
    }

    // Explicitly map fields to match DB schema
    const bookingPayload = {
        vehicle_id: booking.vehicleId,
        user_id: booking.userId,
        start_time: booking.startTime,
        end_time: booking.endTime,
        purpose: booking.purpose,
        notes: booking.notes,
        status: BookingStatus.CONFIRMED
    };

    const { data, error } = await supabase
        .from('vehicle_bookings')
        .insert(bookingPayload)
        .select(`
            *,
            vehicle:vehicles(id, plate, brand, model),
            user:users(id, name, company)
        `)
        .single();

    if (error) {
        console.error('Error creating booking SQL:', error);
        throw error;
    }

    return data ? mapBookingFromDb(data) : null;
}

export async function updateBookingStatus(id: number, status: BookingStatus): Promise<VehicleBooking | null> {
    const { data, error } = await supabase
        .from('vehicle_bookings')
        .update({ status })
        .eq('id', id)
        .select(`
            *,
            vehicle:vehicles(id, plate, brand, model),
            user:users(id, name, company)
        `)
        .single();

    if (error) {
        console.error('Error updating booking status:', error);
        throw error;
    }

    return data ? mapBookingFromDb(data) : null;
}

// Breakdown of changes in this chunk:
// 1. Restore availability error (remove bypass).
// 2. Remove console.log in checkAvailability.
export async function checkAvailability(vehicleId: string, startTime: string, endTime: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('vehicle_bookings')
            .select('id')
            .eq('vehicle_id', vehicleId)
            .neq('status', 'CANCELLED')
            // Check for overlap: (StartA < EndB) and (EndA > StartB)
            .lt('start_time', endTime)
            .gt('end_time', startTime);

        if (error) {
            console.error('Error checking availability:', error);
            return false;
        }

        return !data || data.length === 0;
    } catch (err) {
        console.error('Exception in checkAvailability:', err);
        return false;
    }
}

// ============================================
// BOOKING MAPPERS
// ============================================

function mapBookingFromDb(row: any): VehicleBooking {
    return {
        id: row.id,
        vehicleId: row.vehicle_id,
        vehicle: row.vehicle ? mapVehicleFromDb(row.vehicle) : undefined,
        userId: row.user_id,
        user: row.user,
        startTime: row.start_time,
        endTime: row.end_time,
        purpose: row.purpose,
        notes: row.notes,
        status: row.status as BookingStatus,
        createdAt: row.created_at
    };
}
