/**
 * WhatsApp Clock-In/Out Service - Adapted for existing time_logs structure
 * Processes WhatsApp messages for time tracking commands
 */

import { supabase } from './supabaseClient';
import { wassengerService } from './wassengerService';
import { kioskClockService } from './kioskClockService';
import { logger } from '../utils/logger';

// Command patterns
const COMMANDS = {
    ENTRADA: /^(entrada|in|e)\s+(\d+)(?:\s+(\d{4,6}))?$/i,
    SAIDA: /^(saida|out|s)\s+(\d+)(?:\s+(\d{4,6}))?$/i,
    PAUSA: /^(pausa|pause|p)\s+(\d+)(?:\s+(\d{4,6}))?$/i,
    RETORNO: /^(retorno|return|r)\s+(\d+)(?:\s+(\d{4,6}))?$/i,
    STATUS: /^(status|estado)\s+(\d+)$/i,
    AJUDA: /^(ajuda|help|h)$/i
};

interface ProcessedCommand {
    type: 'clock_in' | 'clock_out' | 'pause' | 'return' | 'status' | 'help' | 'unknown';
    userId?: number;
    pin?: string;
}

interface WhatsAppMessage {
    from: string; // Phone number with country code
    body: string; // Message content
    timestamp: string;
    messageId: string;
}

class WhatsAppClockService {
    /**
     * Process incoming WhatsApp message
     */
    async processMessage(message: WhatsAppMessage): Promise<void> {
        try {
            logger.info('[WhatsApp Clock] Processing message', {
                from: message.from,
                body: message.body.substring(0, 50), // Log only first 50 chars for privacy
                timestamp: message.timestamp
            });

            // Parse command from message
            const command = this.parseCommand(message.body);

            // Get user from phone number
            const user = await this.getUserByPhone(message.from);

            // Process based on command type
            let response: string;

            if (command.type === 'help') {
                response = this.getHelpMessage();
            } else if (command.type === 'unknown') {
                response = this.getUnknownCommandMessage();
            } else if (!user && command.type !== 'help') {
                response = this.getUnregisteredPhoneMessage();
            } else if (user && command.userId && user.id !== command.userId) {
                response = this.getMismatchedIdMessage();
            } else if (user) {
                // Validate PIN if provided
                if (command.pin) {
                    const isValidPin = await this.validatePin(user.id, command.pin);
                    if (!isValidPin) {
                        response = this.getInvalidPinMessage();
                        await this.logAttempt(user.id, command.type, 'invalid_pin', message);
                        await wassengerService.sendMessage(message.from, response);
                        return;
                    }
                }

                // Process the actual clock command
                response = await this.processClockCommand(user, command, message);
            } else {
                response = this.getErrorMessage();
            }

            // Send response via WhatsApp
            await wassengerService.sendMessage(message.from, response);

        } catch (error) {
            logger.error('[WhatsApp Clock] Error processing message', { error, message });

            // Try to send error message to user
            try {
                await wassengerService.sendMessage(
                    message.from,
                    '❌ Ocorreu um erro ao processar o seu comando. Por favor, tente novamente.'
                );
            } catch (sendError) {
                logger.error('[WhatsApp Clock] Failed to send error message', { sendError });
            }
        }
    }

    /**
     * Parse command from message body
     */
    private parseCommand(body: string): ProcessedCommand {
        const trimmedBody = body.trim();

        // Check each command pattern
        for (const [commandName, pattern] of Object.entries(COMMANDS)) {
            const match = trimmedBody.match(pattern);
            if (match) {
                switch (commandName) {
                    case 'ENTRADA':
                        return { type: 'clock_in', userId: parseInt(match[2]), pin: match[3] };
                    case 'SAIDA':
                        return { type: 'clock_out', userId: parseInt(match[2]), pin: match[3] };
                    case 'PAUSA':
                        return { type: 'pause', userId: parseInt(match[2]), pin: match[3] };
                    case 'RETORNO':
                        return { type: 'return', userId: parseInt(match[2]), pin: match[3] };
                    case 'STATUS':
                        return { type: 'status', userId: parseInt(match[2]) };
                    case 'AJUDA':
                        return { type: 'help' };
                }
            }
        }

        return { type: 'unknown' };
    }

    /**
     * Get user by phone number
     */
    private async getUserByPhone(phone: string): Promise<any | null> {
        try {
            // Normalize phone number (remove + and spaces)
            const normalizedPhone = phone.replace(/[\s+]/g, '');

            // Try different formats
            const phoneVariants = [
                normalizedPhone,
                normalizedPhone.replace(/^351/, ''), // Remove country code
                '351' + normalizedPhone.replace(/^351/, ''), // Ensure country code
                normalizedPhone.substring(normalizedPhone.length - 9) // Last 9 digits for PT numbers
            ];

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .or(phoneVariants.map(p => `phone.ilike.%${p}`).join(','))
                .limit(1)
                .single();

            if (error) {
                logger.warn('[WhatsApp Clock] User not found by phone', { phone, error });
                return null;
            }

            return data;
        } catch (error) {
            logger.error('[WhatsApp Clock] Error getting user by phone', { phone, error });
            return null;
        }
    }

    /**
     * Validate user PIN
     */
    private async validatePin(userId: number, pin: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('pin')
                .eq('id', userId)
                .single();

            if (error || !data) {
                return false;
            }

            return data.pin === pin;
        } catch (error) {
            logger.error('[WhatsApp Clock] Error validating PIN', { userId, error });
            return false;
        }
    }

    /**
     * Process clock command using existing structure
     */
    private async processClockCommand(
        user: any,
        command: ProcessedCommand,
        message: WhatsAppMessage
    ): Promise<string> {
        try {
            const now = new Date();
            const formattedTime = now.toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const formattedDate = now.toLocaleDateString('pt-PT');
            const today = now.toISOString().split('T')[0];

            switch (command.type) {
                case 'clock_in': {
                    // Check if already clocked in today
                    const { data: existingLog } = await supabase
                        .from('time_logs')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('date', today)
                        .single();

                    if (existingLog && existingLog.check_in && !existingLog.check_out) {
                        return `⚠️ Já tem entrada registada hoje às ${new Date(existingLog.check_in).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}.\n\nUse SAIDA ${user.id} para registar a saída.`;
                    }

                    // Use kioskClockService for consistency
                    const result = await kioskClockService.clockIn(user.id.toString());

                    if (result.success) {
                        await this.logAttempt(user.id, 'clock_in', 'success', message);
                        return `✅ *Entrada registada com sucesso!*\n\n` +
                               `👤 ${user.name}\n` +
                               `📅 ${formattedDate}\n` +
                               `⏰ ${formattedTime}\n` +
                               `🏢 Empresa: ${user.companyId || 'Semrumo'}\n\n` +
                               `Tenha um excelente dia de trabalho! 💪`;
                    } else {
                        return `❌ Não foi possível registar entrada.\n` +
                               `Motivo: ${result.message}\n\n` +
                               `Por favor, contacte o suporte se o problema persistir.`;
                    }
                }

                case 'clock_out': {
                    // Check if has clock in today
                    const { data: existingLog } = await supabase
                        .from('time_logs')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('date', today)
                        .single();

                    if (!existingLog || !existingLog.check_in) {
                        return `⚠️ Não tem entrada registada hoje.\n\nUse ENTRADA ${user.id} primeiro.`;
                    }

                    if (existingLog.check_out) {
                        return `⚠️ Já tem saída registada hoje às ${new Date(existingLog.check_out).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}.`;
                    }

                    // Use kioskClockService for consistency
                    const result = await kioskClockService.clockOut(user.id.toString());

                    if (result.success) {
                        await this.logAttempt(user.id, 'clock_out', 'success', message);

                        // Calculate worked hours
                        const checkIn = new Date(existingLog.check_in);
                        const checkOut = new Date();
                        const diff = checkOut.getTime() - checkIn.getTime();
                        const hours = Math.floor(diff / 3600000);
                        const minutes = Math.floor((diff % 3600000) / 60000);
                        const workedHours = `${hours}h${minutes.toString().padStart(2, '0')}`;

                        return `✅ *Saída registada com sucesso!*\n\n` +
                               `👤 ${user.name}\n` +
                               `📅 ${formattedDate}\n` +
                               `⏰ ${formattedTime}\n` +
                               `⏱️ Horas trabalhadas: ${workedHours}\n\n` +
                               `Bom descanso! 🏠`;
                    } else {
                        return `❌ Não foi possível registar saída.\n` +
                               `Motivo: ${result.message}\n\n` +
                               `Por favor, contacte o suporte se o problema persistir.`;
                    }
                }

                case 'status': {
                    const status = await this.getUserStatus(user.id);
                    return `📊 *Estado atual*\n\n` +
                           `👤 ${user.name}\n` +
                           `📅 ${formattedDate}\n` +
                           `🔄 Estado: ${status.currentState}\n` +
                           `⏰ Última ação: ${status.lastAction || 'N/A'}\n` +
                           `⏱️ Horas hoje: ${status.hoursToday || '0h00'}`;
                }

                case 'pause': {
                    // Update existing log with break_start
                    const { data: existingLog } = await supabase
                        .from('time_logs')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('date', today)
                        .single();

                    if (!existingLog || !existingLog.check_in || existingLog.check_out) {
                        return `⚠️ Precisa estar com entrada ativa para iniciar pausa.`;
                    }

                    await supabase
                        .from('time_logs')
                        .update({ break_start: now.toISOString() })
                        .eq('id', existingLog.id);

                    await this.logAttempt(user.id, 'pause', 'success', message);
                    return `⏸️ *Pausa iniciada*\n\n` +
                           `👤 ${user.name}\n` +
                           `⏰ ${formattedTime}\n\n` +
                           `Não se esqueça de registar o retorno! 📱`;
                }

                case 'return': {
                    // Update existing log with break_end
                    const { data: existingLog } = await supabase
                        .from('time_logs')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('date', today)
                        .single();

                    if (!existingLog || !existingLog.break_start) {
                        return `⚠️ Não tem pausa ativa para retornar.`;
                    }

                    await supabase
                        .from('time_logs')
                        .update({ break_end: now.toISOString() })
                        .eq('id', existingLog.id);

                    await this.logAttempt(user.id, 'return', 'success', message);
                    return `▶️ *Retorno registado*\n\n` +
                           `👤 ${user.name}\n` +
                           `⏰ ${formattedTime}\n\n` +
                           `Bem-vindo de volta! 💪`;
                }

                default:
                    return this.getUnknownCommandMessage();
            }
        } catch (error) {
            logger.error('[WhatsApp Clock] Error processing clock command', { error, command });
            return '❌ Ocorreu um erro ao processar o comando. Por favor, tente novamente.';
        }
    }

    /**
     * Get user's current status
     */
    private async getUserStatus(userId: number): Promise<any> {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('time_logs')
                .select('*')
                .eq('user_id', userId)
                .eq('date', today)
                .single();

            if (error || !data) {
                return {
                    currentState: '🔴 Sem registo hoje',
                    lastAction: null,
                    hoursToday: '0h00'
                };
            }

            let currentState = '🔴 Ausente';
            let lastAction = null;

            if (data.check_in && !data.check_out) {
                currentState = '🟢 Presente';
                lastAction = new Date(data.check_in).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else if (data.check_out) {
                currentState = '🔴 Saída registada';
                lastAction = new Date(data.check_out).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            // Calculate hours worked today
            let hoursToday = '0h00';
            if (data.check_in) {
                const checkIn = new Date(data.check_in);
                const checkOut = data.check_out ? new Date(data.check_out) : new Date();
                const diff = checkOut.getTime() - checkIn.getTime();
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                hoursToday = `${hours}h${minutes.toString().padStart(2, '0')}`;
            }

            return {
                currentState,
                lastAction,
                hoursToday
            };
        } catch (error) {
            logger.error('[WhatsApp Clock] Error getting user status', { userId, error });
            return {
                currentState: 'Erro',
                lastAction: null,
                hoursToday: '0h00'
            };
        }
    }

    /**
     * Log attempt in database
     */
    private async logAttempt(
        userId: number,
        action: string,
        result: string,
        message: WhatsAppMessage
    ): Promise<void> {
        try {
            await supabase
                .from('whatsapp_clock_logs')
                .insert({
                    user_id: userId,
                    phone: message.from,
                    action,
                    result,
                    message_id: message.messageId,
                    message_body: message.body.substring(0, 100), // Store first 100 chars
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            logger.error('[WhatsApp Clock] Error logging attempt', { error });
            // Don't throw, logging is non-critical
        }
    }

    // Response message templates
    private getHelpMessage(): string {
        return `📱 *Comandos disponíveis:*\n\n` +
               `*ENTRADA* <id> [pin] - Registar entrada\n` +
               `*SAIDA* <id> [pin] - Registar saída\n` +
               `*PAUSA* <id> [pin] - Iniciar pausa\n` +
               `*RETORNO* <id> [pin] - Retornar da pausa\n` +
               `*STATUS* <id> - Ver estado atual\n` +
               `*AJUDA* - Ver esta mensagem\n\n` +
               `📝 *Exemplos:*\n` +
               `• ENTRADA 73\n` +
               `• SAIDA 73 123456\n` +
               `• STATUS 73\n\n` +
               `💡 O PIN é opcional mas recomendado para segurança.`;
    }

    private getUnknownCommandMessage(): string {
        return `❓ Comando não reconhecido.\n\n` +
               `Digite *AJUDA* para ver os comandos disponíveis.`;
    }

    private getUnregisteredPhoneMessage(): string {
        return `📵 Este número de telefone não está registado no sistema.\n\n` +
               `Por favor, contacte os Recursos Humanos para associar o seu número à sua conta.`;
    }

    private getMismatchedIdMessage(): string {
        return `🔒 O ID fornecido não corresponde ao número de telefone registado.\n\n` +
               `Por segurança, só pode registar picagens com o seu próprio ID.`;
    }

    private getInvalidPinMessage(): string {
        return `🔐 PIN inválido.\n\n` +
               `Por favor, verifique o PIN e tente novamente.\n` +
               `Se esqueceu o seu PIN, contacte os Recursos Humanos.`;
    }

    private getErrorMessage(): string {
        return `❌ Ocorreu um erro inesperado.\n\n` +
               `Por favor, tente novamente mais tarde ou contacte o suporte.`;
    }
}

// Export singleton instance
export const whatsappClockService = new WhatsAppClockService();
export default whatsappClockService;