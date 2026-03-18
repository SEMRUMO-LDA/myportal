/**
 * Session Service - Kiosk Mode
 * 
 * Manages device authorization for Kiosk tablets.
 * Once a device is authorized by an admin, it stays authorized for 30 days.
 * Employees clock in/out but don't get persistent sessions.
 */

// Constants
const KIOSK_KEY = 'semrumo_kiosk_device';
const KIOSK_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface KioskDevice {
    deviceId: string;
    authorizedBy: string; // Admin ID who authorized
    authorizedAt: number;
    expiresAt: number;
    locationId?: number;
    locationName?: string;
}

/**
 * Generate a unique device ID
 */
export const generateDeviceId = (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Authorize this device as a Kiosk
 */
export const authorizeKioskDevice = (
    adminId: string,
    locationId?: number,
    locationName?: string
): KioskDevice => {
    const device: KioskDevice = {
        deviceId: generateDeviceId(),
        authorizedBy: adminId,
        authorizedAt: Date.now(),
        expiresAt: Date.now() + KIOSK_DURATION_MS,
        locationId,
        locationName
    };

    try {
        localStorage.setItem(KIOSK_KEY, JSON.stringify(device));

    } catch (error) {
        console.error('[Kiosk] Failed to save device authorization:', error);
    }

    return device;
};

/**
 * Get current device authorization
 */
export const getKioskDevice = (): KioskDevice | null => {
    try {
        const stored = localStorage.getItem(KIOSK_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('[Kiosk] Failed to parse device:', error);
        return null;
    }
};

/**
 * Check if device is authorized and not expired
 */
export const isKioskAuthorized = (): boolean => {
    const device = getKioskDevice();
    if (!device) return false;

    const isValid = Date.now() < device.expiresAt;

    if (!isValid) {

        clearKioskAuthorization();
    }

    return isValid;
};

/**
 * Clear device authorization (requires re-auth by admin)
 */
export const clearKioskAuthorization = (): void => {
    try {
        localStorage.removeItem(KIOSK_KEY);

    } catch (error) {
        console.error('[Kiosk] Failed to clear authorization:', error);
    }
};

/**
 * Get days remaining in authorization
 */
export const getKioskDaysRemaining = (): number => {
    const device = getKioskDevice();
    if (!device) return 0;

    const remainingMs = device.expiresAt - Date.now();
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
};

/**
 * Renew kiosk authorization (by admin)
 */
export const renewKioskAuthorization = (adminId: string): boolean => {
    const device = getKioskDevice();
    if (!device) return false;

    device.authorizedBy = adminId;
    device.expiresAt = Date.now() + KIOSK_DURATION_MS;

    try {
        localStorage.setItem(KIOSK_KEY, JSON.stringify(device));

        return true;
    } catch (error) {
        return false;
    }
};
