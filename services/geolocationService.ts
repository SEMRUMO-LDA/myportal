/**
 * Geolocation Service
 * Handles GPS location requests and validation
 */

export interface GeolocationResult {
  success: boolean;
  coords?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  error?: string;
  errorCode?: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
}

export interface GeoLocation {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  address?: string;
}

class GeolocationService {
  /**
   * Request user's current location
   * ALWAYS asks for permission - required for every clock action
   */
  async getCurrentLocation(timeout: number = 10000): Promise<GeolocationResult> {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.error('[Geolocation] Browser does not support geolocation');
      return {
        success: false,
        error: 'O seu browser não suporta geolocalização. Use um browser moderno (Chrome, Safari, Firefox).',
        errorCode: 'NOT_SUPPORTED'
      };
    }

    return new Promise((resolve) => {
      console.log('[Geolocation] Requesting current position...');

      const options: PositionOptions = {
        enableHighAccuracy: true,  // Request GPS accuracy
        timeout: timeout,          // Max wait time
        maximumAge: 0              // Don't use cached position - ALWAYS get fresh location
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          console.log('[Geolocation] ✅ Location obtained:', coords);

          resolve({
            success: true,
            coords
          });
        },
        (error) => {
          console.error('[Geolocation] ❌ Error:', error);

          let errorMessage: string;
          let errorCode: GeolocationResult['errorCode'];

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada. Por favor, permita o acesso à localização nas definições do browser.';
              errorCode = 'PERMISSION_DENIED';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Localização indisponível. Verifique se o GPS está ativado e se está num local com sinal.';
              errorCode = 'POSITION_UNAVAILABLE';
              break;
            case error.TIMEOUT:
              errorMessage = `Timeout ao obter localização (${timeout}ms). Tente novamente.`;
              errorCode = 'TIMEOUT';
              break;
            default:
              errorMessage = 'Erro desconhecido ao obter localização.';
              errorCode = 'POSITION_UNAVAILABLE';
          }

          resolve({
            success: false,
            error: errorMessage,
            errorCode
          });
        },
        options
      );
    });
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in meters
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check if user is within allowed locations
   */
  isWithinAllowedLocations(
    userLat: number,
    userLng: number,
    allowedLocations: GeoLocation[]
  ): {
    allowed: boolean;
    nearestLocation?: GeoLocation;
    distance?: number;
  } {
    if (!allowedLocations || allowedLocations.length === 0) {
      // No restrictions - allow anywhere
      return { allowed: true };
    }

    let nearestLocation: GeoLocation | undefined;
    let minDistance = Infinity;

    for (const location of allowedLocations) {
      const distance = this.calculateDistance(
        userLat,
        userLng,
        location.latitude,
        location.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location;
      }

      // Check if within radius
      if (distance <= location.radius) {
        console.log(`[Geolocation] ✅ Within allowed location: ${location.name} (${Math.round(distance)}m away)`);
        return {
          allowed: true,
          nearestLocation: location,
          distance: Math.round(distance)
        };
      }
    }

    console.warn(`[Geolocation] ❌ NOT within any allowed location. Nearest: ${nearestLocation?.name} (${Math.round(minDistance)}m away)`);

    return {
      allowed: false,
      nearestLocation,
      distance: Math.round(minDistance)
    };
  }

  /**
   * Get location name from coordinates (reverse geocoding)
   * Falls back to coordinates if geocoding fails
   */
  async getLocationName(lat: number, lng: number): Promise<string> {
    try {
      // Try reverse geocoding using Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'User-Agent': 'MyPortal-Attendance-App'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || data.address?.city || data.address?.town;
        if (address) {
          console.log('[Geolocation] Location name:', address);
          return address;
        }
      }
    } catch (error) {
      console.warn('[Geolocation] Reverse geocoding failed:', error);
    }

    // Fallback to coordinates
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(lat: number, lng: number): string {
    return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
  }

  /**
   * Format distance for display
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

export const geolocationService = new GeolocationService();
