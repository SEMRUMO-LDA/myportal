/**
 * Settings Service
 * Manages application configuration and settings stored in database
 */

import { supabase } from './supabaseClient';
import { errorHandler } from '../utils/errorHandler';

export interface AppSetting {
    key: string;
    value: string;
}

/**
 * Fetch a specific setting by its key
 */
export const getSetting = async (key: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', key)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data?.value || null;
    } catch (error) {
        errorHandler.handleSilent(error, 'settingsService.getSetting');
        return null;
    }
};

/**
 * Save or update a setting
 */
export const saveSetting = async (key: string, value: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('settings')
            .upsert({ key, value }, { onConflict: 'key' });

        if (error) throw error;
        return true;
    } catch (error) {
        errorHandler.handle(error, 'settingsService.saveSetting');
        return false;
    }
};

/**
 * Bulk fetch settings
 */
export const getSettings = async (keys: string[]): Promise<Record<string, string>> => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', keys);

        if (error) throw error;

        const settingsMap: Record<string, string> = {};
        data?.forEach((item: any) => {
            settingsMap[item.key] = item.value;
        });

        return settingsMap;
    } catch (error) {
        errorHandler.handleSilent(error, 'settingsService.getSettings');
        return {};
    }
};
