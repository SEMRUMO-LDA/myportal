#!/usr/bin/env node

/**
 * Test script for WhatsApp Clock Service - Adapted Version
 * Tests with the actual time_logs structure
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

// Test configuration - User 73 actual data
const TEST_USER_ID = 73;
const TEST_PHONE = '+351911100707'; // Actual phone from database

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

async function checkUserData() {
    console.log(`\n${colors.cyan}🔍 Verificando dados do User ${TEST_USER_ID}...${colors.reset}`);

    const { data: user, error } = await supabase
        .from('users')
        .select('id, name, phone, pin, company')
        .eq('id', TEST_USER_ID)
        .single();

    if (error) {
        console.log(`${colors.red}❌ Erro ao buscar user: ${error.message}${colors.reset}`);
        return null;
    }

    console.log(`${colors.green}✅ User encontrado:${colors.reset}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Nome: ${user.name}`);
    console.log(`  Telefone: ${user.phone || 'Não definido'}`);
    console.log(`  PIN: ${user.pin ? '****' : 'Não definido'}`);
    console.log(`  Empresa: ${user.company || 'N/A'}`);

    return user;
}

async function checkTodayStatus(userId) {
    console.log(`\n${colors.cyan}📊 Verificando estado de hoje...${colors.reset}`);

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.log(`${colors.red}❌ Erro: ${error.message}${colors.reset}`);
        return null;
    }

    if (!data) {
        console.log(`${colors.yellow}📝 Sem registos hoje${colors.reset}`);
        return null;
    }

    console.log(`${colors.green}✅ Registo de hoje encontrado:${colors.reset}`);
    console.log(`  ID: ${data.id}`);
    console.log(`  Data: ${data.date}`);
    console.log(`  Check-in: ${data.check_in ? new Date(data.check_in).toLocaleTimeString('pt-PT') : 'N/A'}`);
    console.log(`  Check-out: ${data.check_out ? new Date(data.check_out).toLocaleTimeString('pt-PT') : 'N/A'}`);
    console.log(`  Pausa início: ${data.break_start ? new Date(data.break_start).toLocaleTimeString('pt-PT') : 'N/A'}`);
    console.log(`  Pausa fim: ${data.break_end ? new Date(data.break_end).toLocaleTimeString('pt-PT') : 'N/A'}`);

    return data;
}

async function simulateClockIn(userId) {
    console.log(`\n${colors.cyan}🟢 Simulando ENTRADA ${userId}...${colors.reset}`);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if already has entry today
    const { data: existing } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

    if (existing && existing.check_in && !existing.check_out) {
        console.log(`${colors.yellow}⚠️  Já tem entrada às ${new Date(existing.check_in).toLocaleTimeString('pt-PT')}${colors.reset}`);
        return false;
    }

    // Create or update entry
    let result;
    if (existing) {
        // Update existing record
        result = await supabase
            .from('time_logs')
            .update({
                check_in: now,
                check_out: null,
                updated_at: now
            })
            .eq('id', existing.id)
            .select()
            .single();
    } else {
        // Create new record
        result = await supabase
            .from('time_logs')
            .insert({
                user_id: userId,
                date: today,
                check_in: now,
                status: 'present',
                created_at: now,
                updated_at: now
            })
            .select()
            .single();
    }

    if (result.error) {
        console.log(`${colors.red}❌ Erro: ${result.error.message}${colors.reset}`);
        return false;
    }

    console.log(`${colors.green}✅ Entrada registada com sucesso às ${new Date(now).toLocaleTimeString('pt-PT')}${colors.reset}`);
    return true;
}

async function simulateClockOut(userId) {
    console.log(`\n${colors.cyan}🔴 Simulando SAIDA ${userId}...${colors.reset}`);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Get today's entry
    const { data: existing, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

    if (error || !existing) {
        console.log(`${colors.yellow}⚠️  Sem entrada hoje para registar saída${colors.reset}`);
        return false;
    }

    if (!existing.check_in) {
        console.log(`${colors.yellow}⚠️  Sem check-in registado${colors.reset}`);
        return false;
    }

    if (existing.check_out) {
        console.log(`${colors.yellow}⚠️  Já tem saída às ${new Date(existing.check_out).toLocaleTimeString('pt-PT')}${colors.reset}`);
        return false;
    }

    // Calculate total hours
    const checkIn = new Date(existing.check_in);
    const checkOut = new Date();
    const diff = (checkOut.getTime() - checkIn.getTime()) / 1000 / 60 / 60; // hours

    const result = await supabase
        .from('time_logs')
        .update({
            check_out: now,
            total_hours: diff.toFixed(2),
            updated_at: now
        })
        .eq('id', existing.id)
        .select()
        .single();

    if (result.error) {
        console.log(`${colors.red}❌ Erro: ${result.error.message}${colors.reset}`);
        return false;
    }

    console.log(`${colors.green}✅ Saída registada com sucesso às ${new Date(now).toLocaleTimeString('pt-PT')}${colors.reset}`);
    console.log(`${colors.green}   Horas trabalhadas: ${diff.toFixed(2)}h${colors.reset}`);
    return true;
}

async function testWhatsAppCommands() {
    console.log(`\n${colors.magenta}📱 Simulando Comandos WhatsApp${colors.reset}`);
    console.log('=' .repeat(50));

    // Test STATUS command
    console.log(`\n${colors.cyan}Comando: "STATUS ${TEST_USER_ID}"${colors.reset}`);
    const status = await checkTodayStatus(TEST_USER_ID);

    let response = `📊 *Estado atual*\n\n`;
    if (status) {
        if (status.check_in && !status.check_out) {
            response += `🟢 Presente desde ${new Date(status.check_in).toLocaleTimeString('pt-PT')}`;
        } else if (status.check_out) {
            response += `🔴 Saída registada às ${new Date(status.check_out).toLocaleTimeString('pt-PT')}`;
        } else {
            response += `🔴 Sem registos`;
        }
    } else {
        response += `🔴 Sem registos hoje`;
    }
    console.log(`${colors.green}Resposta WhatsApp:\n${response}${colors.reset}`);

    // Test AJUDA command
    console.log(`\n${colors.cyan}Comando: "AJUDA"${colors.reset}`);
    console.log(`${colors.green}Resposta WhatsApp:
📱 Comandos disponíveis:
• ENTRADA ${TEST_USER_ID} - Registar entrada
• SAIDA ${TEST_USER_ID} - Registar saída
• STATUS ${TEST_USER_ID} - Ver estado
• AJUDA - Ver comandos${colors.reset}`);
}

async function showWebhookPayload() {
    console.log(`\n${colors.yellow}📨 Payload de Exemplo para Wassenger:${colors.reset}`);
    console.log('=' .repeat(50));

    const payload = {
        event: 'message:in',
        data: {
            id: 'msg_' + Date.now(),
            from: TEST_PHONE,
            to: '+351999999999', // Your Wassenger number
            body: `ENTRADA ${TEST_USER_ID}`,
            timestamp: new Date().toISOString(),
            type: 'text'
        },
        device: {
            id: 'device_123',
            phone: '+351999999999'
        }
    };

    console.log(JSON.stringify(payload, null, 2));

    console.log(`\n${colors.yellow}🔧 Configuração Webhook:${colors.reset}`);
    console.log(`URL: https://semrumo.eu/api/whatsapp-webhook`);
    console.log(`Method: POST`);
    console.log(`Secret: ${process.env.WASSENGER_WEBHOOK_SECRET || 'Não definido'}`);
}

async function runTests() {
    console.log(`${colors.blue}${'='.repeat(60)}`);
    console.log(`       WhatsApp Clock Service - Teste Completo`);
    console.log(`${'='.repeat(60)}${colors.reset}\n`);

    // 1. Check user data
    const user = await checkUserData();
    if (!user) {
        console.log(`${colors.red}❌ Teste abortado - user não encontrado${colors.reset}`);
        return;
    }

    // 2. Check today's status
    await checkTodayStatus(TEST_USER_ID);

    // 3. Ask if should simulate clock in/out
    console.log(`\n${colors.yellow}❓ Deseja simular entrada/saída? (Isto vai modificar a BD)${colors.reset}`);
    console.log(`   Para testar, execute: node test-whatsapp-adapted.mjs --simulate`);

    const shouldSimulate = process.argv.includes('--simulate');

    if (shouldSimulate) {
        // Test clock in
        await simulateClockIn(TEST_USER_ID);

        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test clock out
        await simulateClockOut(TEST_USER_ID);

        // Check final status
        await checkTodayStatus(TEST_USER_ID);
    }

    // 4. Show WhatsApp command examples
    await testWhatsAppCommands();

    // 5. Show webhook payload
    await showWebhookPayload();

    console.log(`\n${colors.green}${'='.repeat(60)}`);
    console.log(`                    ✅ Teste Completo!`);
    console.log(`${'='.repeat(60)}${colors.reset}\n`);

    console.log(`${colors.cyan}📋 Próximos passos:${colors.reset}`);
    console.log(`1. ✅ Executar SQL no Supabase (se ainda não fez)`);
    console.log(`2. ✅ Configurar webhook no Wassenger`);
    console.log(`3. ✅ Enviar mensagem WhatsApp: "STATUS ${TEST_USER_ID}"`);
    console.log(`4. ✅ Testar: "ENTRADA ${TEST_USER_ID}"`);
    console.log(`5. ✅ Testar: "SAIDA ${TEST_USER_ID}"`);
}

// Run tests
runTests().catch(console.error);