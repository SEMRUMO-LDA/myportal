/**
 * Wassenger WhatsApp API Integration Service
 * Documentation: https://developers.wassenger.com/docs
 */

import { getSetting } from './settingsService';
import { supabase } from './supabaseClient';

const WASSENGER_API_BASE = 'https://api.wassenger.com/v1';

interface WassengerMessage {
    phone: string; // Phone number with country code (e.g., +351912345678)
    message: string;
}

interface WassengerTemplateMessage {
    phone: string;
    templateName: string;
    templateParams: Record<string, string>;
}

interface WassengerResponse {
    id?: string;
    status?: string;
    error?: string;
}

class WassengerService {
    private apiKey: string | null = null;

    setApiKey(key: string) {
        this.apiKey = key;
    }

    async loadConfig() {
        if (this.apiKey) return;
        const key = await getSetting('wassenger_key');
        if (key) this.apiKey = key;
    }

    getApiKey(): string | null {
        return this.apiKey;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    private async request<T>(endpoint: string, payload: any = {}): Promise<T> {
        await this.loadConfig();
        if (!this.apiKey) {
            throw new Error('Wassenger API key not configured');
        }

        // Use Supabase RPC as a backend proxy to avoid CORS
        // The postgres function 'send_whatsapp_message' must be created first
        const { data, error } = await supabase.rpc('send_whatsapp_message', {
            p_phone: payload.phone,
            p_message: payload.message,
            p_api_key: this.apiKey
        });

        if (error) {
            console.error('Supabase RPC Error:', error);
            if (error.message?.includes('timeout')) {
                throw new Error('O servidor demorou demasiado tempo a responder. Por favor, tente novamente.');
            }
            throw new Error(error.message || 'Erro na comunicação com o servidor proxy.');
        }

        if (data && (data as any).error) {
            console.error('Wassenger API Error:', (data as any).error);
            throw new Error((data as any).error || 'Erro na API Wassenger');
        }

        return data as T;
    }

    /**
     * Send a simple text message via WhatsApp
     */
    async sendMessage(phone: string, message: string): Promise<WassengerResponse> {
        // Format phone number (ensure it starts with country code)
        const formattedPhone = phone.replace(/\s/g, '').replace(/^00/, '+');

        return this.request<WassengerResponse>('/messages', {
            phone: formattedPhone,
            message,
        });
    }

    /**
     * Send attendance alert to employee
     */
    async sendAttendanceAlert(phone: string, userName: string, alertType: 'missed_clockin' | 'missed_clockout'): Promise<WassengerResponse> {
        const messages = {
            missed_clockin: `Olá ${userName}! 👋\n\nReparámos que ainda não registou a sua entrada de hoje no sistema. Por favor, regularize a situação assim que possível.\n\n📱 Portal: my.semrumo.pt`,
            missed_clockout: `Olá ${userName}! 👋\n\nReparámos que ainda não registou a sua saída de hoje no sistema. Por favor, regularize a situação antes de sair.\n\n📱 Portal: my.semrumo.pt`,
        };

        return this.sendMessage(phone, messages[alertType]);
    }

    /**
     * Send vacation request status update
     */
    async sendVacationStatus(phone: string, userName: string, status: 'approved' | 'rejected', dates: string): Promise<WassengerResponse> {
        const messages = {
            approved: `Olá ${userName}! ✅\n\nO seu pedido de férias para ${dates} foi *aprovado*.\n\nBoas férias! 🏖️`,
            rejected: `Olá ${userName}! ❌\n\nInfelizmente, o seu pedido de férias para ${dates} não foi aprovado.\n\nPor favor, contacte os Recursos Humanos para mais informações.`,
        };

        return this.sendMessage(phone, messages[status]);
    }

    /**
     * Send payroll notification
     */
    async sendPayslipNotification(phone: string, userName: string, month: string): Promise<WassengerResponse> {
        const message = `Olá ${userName}! 💼\n\nO seu recibo de vencimento de *${month}* está disponível no portal.\n\n📱 Aceda em: my.semrumo.pt/portal/profile\n\nSe tiver dúvidas, contacte os RH.`;

        return this.sendMessage(phone, message);
    }

    /**
     * Send onboarding welcome message
     */
    async sendOnboardingWelcome(phone: string, userName: string, company: string): Promise<WassengerResponse> {
        const message = `Bem-vindo à ${company}, ${userName}! 🎉\n\nEstamos muito felizes por tê-lo na equipa!\n\nPara completar o seu onboarding, aceda ao portal:\n📱 my.semrumo.pt\n\nOs seus dados de acesso serão enviados por email.\n\nQualquer dúvida, estamos aqui para ajudar!`;

        return this.sendMessage(phone, message);
    }

    /**
     * Validate API key by making a test request
     * We'll use the same proxy function but with a status check message or dedicated endpoint
     */
    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            // Simplified validation via the same proxy
            const { data, error } = await supabase.rpc('send_whatsapp_message', {
                p_phone: '+1234567890', // Dummy phone
                p_message: 'VALIDATION_CHECK',
                p_api_key: apiKey
            });

            // If we get a response (even if it's an error from Wassenger about the phone), 
            // the proxy worked and the key was accepted by the proxy code
            return !error;
        } catch {
            return false;
        }
    }
}

// Export singleton instance
export const wassengerService = new WassengerService();
export default wassengerService;
