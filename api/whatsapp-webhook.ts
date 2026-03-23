/**
 * WhatsApp Webhook Endpoint
 * Receives incoming messages from Wassenger and processes clock commands
 */

import { Request, Response } from 'express';
import { whatsappClockService } from '../services/whatsappClockService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Wassenger webhook secret (should be in environment variables)
const WEBHOOK_SECRET = process.env.WASSENGER_WEBHOOK_SECRET || '';

interface WassengerWebhookPayload {
    event: 'message:in' | 'message:out' | 'message:status';
    data: {
        id: string;
        from: string;
        to: string;
        body: string;
        timestamp: string;
        type: 'text' | 'image' | 'document' | 'audio' | 'video';
        media?: {
            url: string;
            mimetype: string;
        };
    };
    device?: {
        id: string;
        phone: string;
    };
}

/**
 * Verify webhook signature for security
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!WEBHOOK_SECRET) {
        logger.warn('[WhatsApp Webhook] No webhook secret configured, skipping verification');
        return true; // Skip verification in development
    }

    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Main webhook handler
 */
export async function whatsappWebhook(req: Request, res: Response) {
    try {
        // Log incoming webhook
        logger.info('[WhatsApp Webhook] Received webhook', {
            method: req.method,
            headers: req.headers,
            bodySize: JSON.stringify(req.body).length
        });

        // Verify webhook signature (if configured)
        const signature = req.headers['x-wassenger-signature'] as string;
        if (signature && !verifyWebhookSignature(JSON.stringify(req.body), signature)) {
            logger.warn('[WhatsApp Webhook] Invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Parse webhook payload
        const payload = req.body as WassengerWebhookPayload;

        // Only process incoming text messages
        if (payload.event !== 'message:in' || payload.data.type !== 'text') {
            logger.info('[WhatsApp Webhook] Ignoring non-text or non-incoming message', {
                event: payload.event,
                type: payload.data?.type
            });
            return res.status(200).json({ status: 'ignored' });
        }

        // Process the message asynchronously
        whatsappClockService.processMessage({
            from: payload.data.from,
            body: payload.data.body,
            timestamp: payload.data.timestamp,
            messageId: payload.data.id
        }).catch(error => {
            logger.error('[WhatsApp Webhook] Failed to process message', { error });
        });

        // Respond immediately to acknowledge receipt
        res.status(200).json({ status: 'received' });

    } catch (error) {
        logger.error('[WhatsApp Webhook] Webhook error', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Health check endpoint for the webhook
 */
export async function whatsappWebhookHealth(req: Request, res: Response) {
    res.status(200).json({
        status: 'healthy',
        service: 'whatsapp-webhook',
        timestamp: new Date().toISOString()
    });
}