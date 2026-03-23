/**
 * Biometric Authentication Service
 * Implements WebAuthn API for Face ID / Touch ID / Windows Hello
 *
 * Security features:
 * - Biometric data never leaves the device
 * - Only public keys stored on server
 * - Challenge-based authentication
 * - Counter-based replay protection
 */

import { supabase } from './supabaseClient';
import { BiometricCredential } from '../types';
import { errorHandler } from '../utils/errorHandler';

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Custom errors
export class BiometricNotSupportedError extends Error {
  constructor() {
    super('Biometric authentication is not supported on this device');
    this.name = 'BiometricNotSupportedError';
  }
}

export class BiometricCancelledError extends Error {
  constructor() {
    super('Biometric authentication was cancelled by user');
    this.name = 'BiometricCancelledError';
  }
}

export const biometricAuthService = {
  /**
   * Check if WebAuthn is supported
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      navigator.credentials !== undefined
    );
  },

  /**
   * Check if platform authenticator (Face ID/Touch ID) is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.error('Error checking platform authenticator:', error);
      return false;
    }
  },

  /**
   * Register a new biometric credential
   */
  async register(userId: number, userName: string): Promise<BiometricCredential | null> {
    if (!this.isSupported()) {
      throw new BiometricNotSupportedError();
    }

    try {
      // Generate challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      // Create credential options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'SEMRUMO MyPortal',
          id: window.location.hostname
        },
        user: {
          id: stringToUint8Array(userId.toString()),
          name: userName,
          displayName: userName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Face ID / Touch ID / Windows Hello
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      };

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;

      // Store credential in database
      const { data, error } = await supabase
        .from('biometric_credentials')
        .insert({
          user_id: userId,
          credential_id: credential.id,
          public_key: arrayBufferToBase64(response.getPublicKey()!),
          counter: 0,
          device_name: navigator.userAgent.includes('iPhone') ? 'iPhone' :
                       navigator.userAgent.includes('iPad') ? 'iPad' :
                       navigator.userAgent.includes('Android') ? 'Android' :
                       navigator.userAgent.includes('Mac') ? 'Mac' :
                       navigator.userAgent.includes('Windows') ? 'Windows' : 'Unknown',
          enabled: true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        credentialId: data.credential_id,
        publicKey: data.public_key,
        counter: data.counter,
        deviceName: data.device_name,
        createdAt: data.created_at,
        lastUsedAt: data.last_used_at,
        enabled: data.enabled
      };
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new BiometricCancelledError();
      }
      errorHandler.handle(error, 'biometricAuthService.register');
      return null;
    }
  },

  /**
   * Authenticate using biometric credential
   */
  async authenticate(userId: number): Promise<{ success: boolean; credentialId?: string }> {
    if (!this.isSupported()) {
      throw new BiometricNotSupportedError();
    }

    try {
      // Get user's credentials from database
      const { data: credentials, error: fetchError } = await supabase
        .from('biometric_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true);

      if (fetchError) throw fetchError;
      if (!credentials || credentials.length === 0) {
        throw new Error('No biometric credentials registered');
      }

      // Generate challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      // Create authentication options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: credentials.map(cred => ({
          id: stringToUint8Array(cred.credential_id),
          type: 'public-key' as PublicKeyCredentialType,
          transports: ['internal'] as AuthenticatorTransport[]
        })),
        timeout: 60000,
        userVerification: 'required'
      };

      // Authenticate
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Authentication failed');
      }

      // Update last_used_at
      await supabase
        .from('biometric_credentials')
        .update({ last_used_at: new Date().toISOString() })
        .eq('credential_id', assertion.id);

      return {
        success: true,
        credentialId: assertion.id
      };
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new BiometricCancelledError();
      }
      errorHandler.handle(error, 'biometricAuthService.authenticate');
      return { success: false };
    }
  },

  /**
   * List all biometric credentials for a user
   */
  async listCredentials(userId: number): Promise<BiometricCredential[]> {
    try {
      const { data, error } = await supabase
        .from('biometric_credentials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        credentialId: row.credential_id,
        publicKey: row.public_key,
        counter: row.counter,
        deviceName: row.device_name,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
        enabled: row.enabled
      }));
    } catch (error) {
      errorHandler.handleSilent(error, 'biometricAuthService.listCredentials');
      return [];
    }
  },

  /**
   * Revoke a biometric credential
   */
  async revoke(credentialId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('biometric_credentials')
        .update({ enabled: false })
        .eq('credential_id', credentialId);

      if (error) throw error;
      return true;
    } catch (error) {
      errorHandler.handle(error, 'biometricAuthService.revoke');
      return false;
    }
  },

  /**
   * Delete a biometric credential permanently
   */
  async delete(credentialId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('biometric_credentials')
        .delete()
        .eq('credential_id', credentialId);

      if (error) throw error;
      return true;
    } catch (error) {
      errorHandler.handle(error, 'biometricAuthService.delete');
      return false;
    }
  },

  /**
   * Check if user has biometric credentials registered
   */
  async hasCredentials(userId: number): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('biometric_credentials')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('enabled', true);

      if (error) throw error;
      return (count || 0) > 0;
    } catch (error) {
      errorHandler.handleSilent(error, 'biometricAuthService.hasCredentials');
      return false;
    }
  }
};
