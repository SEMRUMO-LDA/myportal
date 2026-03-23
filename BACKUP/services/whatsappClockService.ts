/**
 * WhatsApp Clock-In/Out Service
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
    LINK: /^(link|l)$/i,
    AJUDA: /^(ajuda|help|h)$/i
};

interface ProcessedCommand {
    type: 'clock_in' | 'clock_out' | 'pause' | 'return' | 'status' | 'link' | 'help' | 'unknown';
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
            } else if (command.type === 'link') {
                // LINK command works without user verification (uses phone number)
                if (!user) {
                    response = this.getUnregisteredPhoneMessage();
                } else {
                    response = await this.generateClockLink(user);
                }
            } else if (command.type === 'unknown') {
                response = this.getUnknownCommandMessage();
            } else if (!user) {
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
                    case 'LINK':
                        return { type: 'link' };
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
     * Process clock command
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

            switch (command.type) {
                case 'clock_in': {
                    const result = await kioskClockService.clockIn(user.id.toString());
                    if (result.success) {
                        await this.logAttempt(user.id, 'clock_in', 'success', message);
                        return `✅ *Entrada registada com sucesso!*\n\n` +
                               `👤 ${user.name}\n` +
                               `📅 ${formattedDate}\n` +
                               `⏰ ${formattedTime}\n` +
                               `🏢 Empresa: ${user.companyId || 'N/A'}\n\n` +
                               `Tenha um excelente dia de trabalho! 💪`;
                    } else {
                        return `❌ Não foi possível registar entrada.\n` +
                               `Motivo: ${result.message}\n\n` +
                               `Por favor, contacte o suporte se o problema persistir.`;
                    }
                }

                case 'clock_out': {
                    const result = await kioskClockService.clockOut(user.id.toString());
                    if (result.success) {
                        await this.logAttempt(user.id, 'clock_out', 'success', message);

                        // Calculate worked hours if available
                        const workedHours = result.data?.workedHours || 'N/A';

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
                    await this.logAttempt(user.id, 'pause', 'success', message);
                    return `⏸️ *Pausa iniciada*\n\n` +
                           `👤 ${user.name}\n` +
                           `⏰ ${formattedTime}\n\n` +
                           `Não se esqueça de registar o retorno! 📱`;
                }

                case 'return': {
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
            // Get today's time logs
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('time_logs')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', today + 'T00:00:00')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error || !data || data.length === 0) {
                return {
                    currentState: 'Sem registo hoje',
                    lastAction: null,
                    hoursToday: '0h00'
                };
            }

            const lastLog = data[0];
            let currentState = 'Desconhecido';

            if (lastLog.action === 'clock_in') {
                currentState = '🟢 Presente';
            } else if (lastLog.action === 'clock_out') {
                currentState = '🔴 Ausente';
            }

            // Calculate hours worked today
            const hoursToday = await this.calculateHoursToday(userId);

            return {
                currentState,
                lastAction: new Date(lastLog.created_at).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
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
     * Calculate hours worked today
     */
    private async calculateHoursToday(userId: number): Promise<string> {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('time_logs')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', today + 'T00:00:00')
                .order('created_at', { ascending: true });

            if (error || !data || data.length === 0) {
                return '0h00';
            }

            let totalMinutes = 0;
            let lastClockIn: Date | null = null;

            for (const log of data) {
                if (log.action === 'clock_in') {
                    lastClockIn = new Date(log.created_at);
                } else if (log.action === 'clock_out' && lastClockIn) {
                    const clockOut = new Date(log.created_at);
                    const diff = clockOut.getTime() - lastClockIn.getTime();
                    totalMinutes += Math.floor(diff / 60000);
                    lastClockIn = null;
                }
            }

            // If still clocked in, calculate until now
            if (lastClockIn) {
                const now = new Date();
                const diff = now.getTime() - lastClockIn.getTime();
                totalMinutes += Math.floor(diff / 60000);
            }

            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            return `${hours}h${minutes.toString().padStart(2, '0')}`;
        } catch (error) {
            logger.error('[WhatsApp Clock] Error calculating hours', { userId, error });
            return '0h00';
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

    /**
     * Generate permanent clock link for user
     */
    private async generateClockLink(user: any): Promise<string> {
        try {
            const baseUrl = 'https://semrumo.eu/app/myportal';

            // Generate unique token based on user ID and phone (permanent)
            const token = Buffer.from(`${user.id}-${user.phone}`).toString('base64');

            // Create the permanent clock link
            const clockUrl = `${baseUrl}/clock-geo.html?phone=${encodeURIComponent(user.phone)}&token=${token}&name=${encodeURIComponent(user.name)}`;

            // Create the personal landing page link
            const fileName = `link-${user.id}-${user.name.replace(/\s+/g, '-').toLowerCase()}.html`;
            const landingPageUrl = `${baseUrl}/${fileName}`;

            return `🔗 *Link de Picagem Pessoal*\n\n` +
                   `👤 ${user.name}\n` +
                   `📱 ID: ${user.id}\n\n` +
                   `*Link Direto de Picagem:*\n` +
                   `${clockUrl}\n\n` +
                   `*Página Pessoal:*\n` +
                   `${landingPageUrl}\n\n` +
                   `💡 *Como usar:*\n` +
                   `1️⃣ Clique no link acima\n` +
                   `2️⃣ Adicione aos favoritos do browser\n` +
                   `3️⃣ No iPhone: "Adicionar ao Ecrã Principal"\n` +
                   `4️⃣ No Android: "Adicionar ao Ecrã Inicial"\n\n` +
                   `✅ *Vantagens:*\n` +
                   `• Link permanente - nunca muda\n` +
                   `• Funciona sem WhatsApp\n` +
                   `• GPS automático\n` +
                   `• Um clique para picar\n` +
                   `• Pode guardar como app\n\n` +
                   `📌 Guarde este link para acesso rápido!`;
        } catch (error) {
            logger.error('[WhatsApp Clock] Error generating clock link', { error, user });
            return '❌ Erro ao gerar o link de picagem. Por favor, contacte o suporte.';
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
               `*LINK* - Obter o seu link de picagem pessoal\n` +
               `*AJUDA* - Ver esta mensagem\n\n` +
               `📝 *Exemplos:*\n` +
               `• ENTRADA 12345\n` +
               `• SAIDA 12345 1234\n` +
               `• STATUS 12345\n` +
               `• LINK\n\n` +
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