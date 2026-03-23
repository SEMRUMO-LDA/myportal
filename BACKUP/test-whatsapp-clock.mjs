#!/usr/bin/env node

/**
 * Test script for WhatsApp Clock Service
 * Tests the message processing without needing actual WhatsApp messages
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test data
const TEST_USER_ID = 73; // Change to a real user ID
const TEST_PIN = '123456'; // Change to user's actual PIN
const TEST_PHONE = '+351912345678'; // Change to user's phone number

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

async function testCommand(command, expectedResponse) {
    console.log(`\n${colors.cyan}Testing: "${command}"${colors.reset}`);

    // Simulate processing the command
    const commandLower = command.toLowerCase().trim();

    // Parse the command
    let type = 'unknown';
    let userId = null;
    let pin = null;

    if (commandLower.startsWith('entrada')) {
        type = 'clock_in';
        const parts = command.split(' ');
        userId = parts[1];
        pin = parts[2];
    } else if (commandLower.startsWith('saida')) {
        type = 'clock_out';
        const parts = command.split(' ');
        userId = parts[1];
        pin = parts[2];
    } else if (commandLower.startsWith('status')) {
        type = 'status';
        const parts = command.split(' ');
        userId = parts[1];
    } else if (commandLower === 'ajuda' || commandLower === 'help') {
        type = 'help';
    }

    console.log(`  Type: ${type}`);
    console.log(`  User ID: ${userId || 'N/A'}`);
    console.log(`  PIN: ${pin ? '****' : 'Not provided'}`);

    // Simulate response
    let response = '';

    switch (type) {
        case 'help':
            response = '📱 Comandos disponíveis: ENTRADA, SAIDA, STATUS, AJUDA';
            break;
        case 'clock_in':
            if (userId) {
                // Try to register clock in
                const { data, error } = await supabase
                    .from('time_logs')
                    .insert({
                        user_id: parseInt(userId),
                        action: 'clock_in',
                        source: 'whatsapp',
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) {
                    response = `❌ Erro ao registar entrada: ${error.message}`;
                } else {
                    response = `✅ Entrada registada com sucesso!`;
                }
            } else {
                response = '❌ ID de utilizador inválido';
            }
            break;
        case 'clock_out':
            if (userId) {
                // Try to register clock out
                const { data, error } = await supabase
                    .from('time_logs')
                    .insert({
                        user_id: parseInt(userId),
                        action: 'clock_out',
                        source: 'whatsapp',
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) {
                    response = `❌ Erro ao registar saída: ${error.message}`;
                } else {
                    response = `✅ Saída registada com sucesso!`;
                }
            } else {
                response = '❌ ID de utilizador inválido';
            }
            break;
        case 'status':
            if (userId) {
                // Get user status
                const today = new Date().toISOString().split('T')[0];
                const { data, error } = await supabase
                    .from('time_logs')
                    .select('*')
                    .eq('user_id', parseInt(userId))
                    .gte('created_at', today + 'T00:00:00')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error) {
                    response = `❌ Erro ao obter estado: ${error.message}`;
                } else if (data && data.length > 0) {
                    const lastLog = data[0];
                    const state = lastLog.action === 'clock_in' ? '🟢 Presente' : '🔴 Ausente';
                    response = `📊 Estado atual: ${state}`;
                } else {
                    response = '📊 Sem registos hoje';
                }
            } else {
                response = '❌ ID de utilizador inválido';
            }
            break;
        default:
            response = '❓ Comando não reconhecido';
    }

    console.log(`  ${colors.green}Response: ${response}${colors.reset}`);

    if (expectedResponse && !response.includes(expectedResponse)) {
        console.log(`  ${colors.red}⚠️  Expected response to contain: "${expectedResponse}"${colors.reset}`);
    }

    return response;
}

async function runTests() {
    console.log(`${colors.blue}=================================`);
    console.log(`WhatsApp Clock Service Test Suite`);
    console.log(`=================================\n${colors.reset}`);

    console.log(`${colors.yellow}📋 Test Configuration:${colors.reset}`);
    console.log(`  User ID: ${TEST_USER_ID}`);
    console.log(`  Phone: ${TEST_PHONE}`);
    console.log(`  Supabase URL: ${supabaseUrl}`);

    // Test commands
    const testCases = [
        { command: 'ajuda', expected: 'Comandos disponíveis' },
        { command: 'AJUDA', expected: 'Comandos disponíveis' },
        { command: 'help', expected: 'Comandos disponíveis' },
        { command: `entrada ${TEST_USER_ID}`, expected: 'registada' },
        { command: `ENTRADA ${TEST_USER_ID} ${TEST_PIN}`, expected: 'registada' },
        { command: `status ${TEST_USER_ID}`, expected: 'Estado' },
        { command: `STATUS ${TEST_USER_ID}`, expected: 'Estado' },
        { command: `saida ${TEST_USER_ID}`, expected: 'registada' },
        { command: `SAIDA ${TEST_USER_ID} ${TEST_PIN}`, expected: 'registada' },
        { command: 'teste invalido', expected: 'não reconhecido' },
        { command: 'entrada', expected: 'não reconhecido' }, // Missing ID
        { command: 'entrada ABC', expected: 'inválido' }, // Invalid ID
    ];

    for (const testCase of testCases) {
        await testCommand(testCase.command, testCase.expected);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    }

    console.log(`\n${colors.green}=================================`);
    console.log(`Tests completed!`);
    console.log(`=================================\n${colors.reset}`);

    // Show sample webhook payload
    console.log(`${colors.cyan}📨 Sample Webhook Payload for Wassenger:${colors.reset}`);
    console.log(JSON.stringify({
        event: 'message:in',
        data: {
            id: 'msg_12345',
            from: TEST_PHONE,
            to: '+351999999999',
            body: `ENTRADA ${TEST_USER_ID}`,
            timestamp: new Date().toISOString(),
            type: 'text'
        },
        device: {
            id: 'device_123',
            phone: '+351999999999'
        }
    }, null, 2));

    console.log(`\n${colors.yellow}📝 Webhook Configuration:${colors.reset}`);
    console.log(`  URL: https://your-domain.com/api/whatsapp-webhook`);
    console.log(`  Method: POST`);
    console.log(`  Content-Type: application/json`);
    console.log(`  Secret: Set WASSENGER_WEBHOOK_SECRET in .env`);
}

// Run tests
runTests().catch(console.error);