/**
 * Sistema de Picagem por NFC/QR Code
 * Cada colaborador tem um código único que pode ser usado em NFC tag ou QR Code
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

const supabaseUrl = 'https://fphesgwlqmprixehgqwz.supabase.co';
const baseAppUrl = 'https://myportal.semrumo.pt'; // URL da sua aplicação

// Criar sistema de identificação única
class NFCClockSystem {

  /**
   * Gera um código único para cada colaborador
   * Este código será programado no NFC ou QR Code
   */
  generateUserCode(userId: number, email: string): string {
    const secret = 'SEMRUMO_NFC_2024_SECRET';
    const data = `${userId}:${email}:CLOCK`;
    const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
    // Retorna um código curto mas único (16 caracteres)
    return hash.substring(0, 16);
  }

  /**
   * Gera URL para programar no NFC ou QR Code
   */
  generateNFCUrl(userId: number, userCode: string): string {
    // URL que será aberta quando o NFC for scaneado
    return `${baseAppUrl}/clock/${userId}/${userCode}`;
  }

  /**
   * Página HTML para terminal de picagem NFC
   * Esta página fica num tablet/computador no escritório
   */
  generateNFCTerminalHTML(): string {
    return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terminal de Picagem NFC/QR - SEMRUMO</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .terminal {
            background: white;
            border-radius: 30px;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.3);
            padding: 60px;
            max-width: 800px;
            width: 100%;
            text-align: center;
        }

        .logo {
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 30px;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            color: white;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 42px;
        }

        .subtitle {
            color: #666;
            font-size: 18px;
            margin-bottom: 40px;
        }

        .scan-area {
            background: #f8f9fa;
            border: 3px dashed #667eea;
            border-radius: 20px;
            padding: 60px;
            margin: 40px 0;
            position: relative;
        }

        .nfc-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }

        .instructions {
            font-size: 24px;
            color: #333;
            margin: 20px 0;
        }

        .or-divider {
            margin: 30px 0;
            color: #999;
            font-size: 18px;
        }

        #qr-reader {
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
        }

        .manual-input {
            margin-top: 30px;
            padding: 20px;
            background: #f0f0f0;
            border-radius: 15px;
        }

        .input-group {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        input[type="text"] {
            flex: 1;
            padding: 15px;
            font-size: 18px;
            border: 2px solid #ddd;
            border-radius: 10px;
            text-align: center;
            text-transform: uppercase;
        }

        button {
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .status {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            padding: 20px;
            font-size: 20px;
            font-weight: 600;
            text-align: center;
            transform: translateY(-100%);
            transition: transform 0.3s;
            z-index: 1000;
        }

        .status.show {
            transform: translateY(0);
        }

        .status.success {
            background: #4caf50;
            color: white;
        }

        .status.error {
            background: #f44336;
            color: white;
        }

        .last-entries {
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 15px;
        }

        .entry {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: white;
            margin: 10px 0;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .entry-name {
            font-weight: 600;
            color: #333;
        }

        .entry-time {
            color: #666;
        }

        .entry-type {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }

        .entry-type.in {
            background: #e8f5e9;
            color: #4caf50;
        }

        .entry-type.out {
            background: #ffebee;
            color: #f44336;
        }

        .clock-display {
            font-size: 72px;
            font-weight: 200;
            color: #667eea;
            margin: 30px 0;
            font-variant-numeric: tabular-nums;
        }
    </style>
</head>
<body>
    <div class="terminal">
        <div class="logo">🏢</div>
        <h1>Terminal de Picagem</h1>
        <div class="subtitle">SEMRUMO - Escritório Central</div>

        <div class="clock-display" id="clock">00:00:00</div>

        <div class="scan-area">
            <div class="nfc-icon">📱</div>
            <div class="instructions">
                Aproxime o seu cartão NFC ou telemóvel
            </div>

            <div class="or-divider">— OU —</div>

            <div id="qr-reader"></div>
            <div class="instructions">
                Mostre o seu QR Code
            </div>

            <div class="or-divider">— OU —</div>

            <div class="manual-input">
                <div>Digite o seu código pessoal:</div>
                <div class="input-group">
                    <input type="text" id="manualCode" placeholder="Código de 16 dígitos" maxlength="16">
                    <button onclick="processManualCode()">Validar</button>
                </div>
            </div>
        </div>

        <div class="last-entries" id="lastEntries">
            <h3>Últimas Picagens</h3>
            <div id="entriesList"></div>
        </div>
    </div>

    <div class="status" id="status"></div>

    <!-- QR Code Scanner Library -->
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>

    <script>
        const SUPABASE_URL = '${supabaseUrl}';
        const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwaGVzZ3dscW1wcml4ZWhnc3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4NzkyMjQsImV4cCI6MjA0MzQ1NTIyNH0.DhhFhDpLcPnBaKaBOZgO8RjRBEJHNZGa6vczOTI9xO0';

        // Relógio
        function updateClock() {
            const now = new Date();
            document.getElementById('clock').textContent = now.toLocaleTimeString('pt-PT');
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Lista de últimas entradas (em memória)
        let lastEntries = [];

        // Mostrar status
        function showStatus(message, type = 'success') {
            const statusEl = document.getElementById('status');
            statusEl.textContent = message;
            statusEl.className = 'status show ' + type;

            setTimeout(() => {
                statusEl.classList.remove('show');
            }, 3000);
        }

        // Processar código (de NFC, QR ou manual)
        async function processCode(code) {
            console.log('Processando código:', code);

            // Extrair user_id do código ou URL
            let userId;
            let userCode;

            if (code.includes('/clock/')) {
                // É uma URL completa
                const parts = code.split('/clock/')[1].split('/');
                userId = parseInt(parts[0]);
                userCode = parts[1];
            } else if (code.length === 16) {
                // É apenas o código
                userCode = code;
                // Precisamos buscar o user_id pelo código
                userId = await getUserIdByCode(userCode);
            } else {
                showStatus('❌ Código inválido', 'error');
                return;
            }

            if (!userId) {
                showStatus('❌ Colaborador não encontrado', 'error');
                return;
            }

            // Buscar dados do colaborador
            const userData = await getUserData(userId);
            if (!userData) {
                showStatus('❌ Erro ao buscar dados do colaborador', 'error');
                return;
            }

            // Determinar se é entrada ou saída
            const isEntry = await checkIfEntry(userId);

            // Registar picagem
            if (isEntry) {
                await registerClockIn(userId, userData.name);
            } else {
                await registerClockOut(userId, userData.name);
            }
        }

        // Buscar user_id pelo código
        async function getUserIdByCode(code) {
            // Aqui você precisaria ter uma tabela ou mapeamento
            // Por simplicidade, vamos extrair do próprio código
            // Na prática, você teria uma tabela user_codes no Supabase
            return null; // Implementar conforme necessidade
        }

        // Buscar dados do utilizador
        async function getUserData(userId) {
            try {
                const response = await fetch(\`\${SUPABASE_URL}/rest/v1/users?id=eq.\${userId}\`, {
                    headers: {
                        'apikey': ANON_KEY,
                        'Authorization': 'Bearer ' + ANON_KEY
                    }
                });

                const data = await response.json();
                return data[0];
            } catch (error) {
                console.error('Erro ao buscar utilizador:', error);
                return null;
            }
        }

        // Verificar se é entrada ou saída
        async function checkIfEntry(userId) {
            try {
                const response = await fetch(
                    \`\${SUPABASE_URL}/rest/v1/time_logs?user_id=eq.\${userId}&clock_out=is.null&order=clock_in.desc&limit=1\`,
                    {
                        headers: {
                            'apikey': ANON_KEY,
                            'Authorization': 'Bearer ' + ANON_KEY
                        }
                    }
                );

                const data = await response.json();
                return data.length === 0; // Se não há entrada aberta, é uma entrada
            } catch (error) {
                return true; // Por defeito, considerar entrada
            }
        }

        // Registar entrada
        async function registerClockIn(userId, userName) {
            try {
                const response = await fetch(\`\${SUPABASE_URL}/rest/v1/time_logs\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': ANON_KEY,
                        'Authorization': 'Bearer ' + ANON_KEY,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        clock_in: new Date().toISOString(),
                        type: 'IN',
                        clock_in_method: 'NFC_TERMINAL',
                        gps_address: 'Escritório Central - Terminal NFC'
                    })
                });

                if (response.ok) {
                    showStatus(\`✅ ENTRADA registada: \${userName}\`, 'success');
                    addToLastEntries(userName, 'in');
                    playSound('success');
                } else {
                    throw new Error('Erro ao registar entrada');
                }
            } catch (error) {
                showStatus('❌ Erro ao registar entrada', 'error');
                playSound('error');
            }
        }

        // Registar saída
        async function registerClockOut(userId, userName) {
            try {
                // Buscar última entrada
                const getResponse = await fetch(
                    \`\${SUPABASE_URL}/rest/v1/time_logs?user_id=eq.\${userId}&clock_out=is.null&order=clock_in.desc&limit=1\`,
                    {
                        headers: {
                            'apikey': ANON_KEY,
                            'Authorization': 'Bearer ' + ANON_KEY
                        }
                    }
                );

                const logs = await getResponse.json();

                if (logs && logs.length > 0) {
                    // Atualizar com saída
                    const response = await fetch(\`\${SUPABASE_URL}/rest/v1/time_logs?id=eq.\${logs[0].id}\`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': ANON_KEY,
                            'Authorization': 'Bearer ' + ANON_KEY
                        },
                        body: JSON.stringify({
                            clock_out: new Date().toISOString(),
                            type: 'OUT',
                            clock_out_method: 'NFC_TERMINAL'
                        })
                    });

                    if (response.ok) {
                        showStatus(\`✅ SAÍDA registada: \${userName}\`, 'success');
                        addToLastEntries(userName, 'out');
                        playSound('success');
                    } else {
                        throw new Error('Erro ao registar saída');
                    }
                }
            } catch (error) {
                showStatus('❌ Erro ao registar saída', 'error');
                playSound('error');
            }
        }

        // Adicionar às últimas entradas
        function addToLastEntries(name, type) {
            const entry = {
                name: name,
                time: new Date().toLocaleTimeString('pt-PT'),
                type: type
            };

            lastEntries.unshift(entry);
            if (lastEntries.length > 5) {
                lastEntries = lastEntries.slice(0, 5);
            }

            updateEntriesDisplay();
        }

        // Atualizar display de entradas
        function updateEntriesDisplay() {
            const container = document.getElementById('entriesList');
            container.innerHTML = lastEntries.map(entry => \`
                <div class="entry">
                    <div class="entry-name">\${entry.name}</div>
                    <div class="entry-time">\${entry.time}</div>
                    <div class="entry-type \${entry.type}">\${entry.type === 'in' ? 'ENTRADA' : 'SAÍDA'}</div>
                </div>
            \`).join('');
        }

        // Som de feedback
        function playSound(type) {
            const audio = new Audio(\`data:audio/wav;base64,UklGRoAFAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQ==\`);
            audio.play().catch(e => console.log('Som desativado'));
        }

        // Processar código manual
        function processManualCode() {
            const code = document.getElementById('manualCode').value.trim();
            if (code.length === 16) {
                processCode(code);
                document.getElementById('manualCode').value = '';
            } else {
                showStatus('❌ Código deve ter 16 caracteres', 'error');
            }
        }

        // Inicializar QR Scanner
        function initQRScanner() {
            const html5QrCode = new Html5Qrcode("qr-reader");

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            };

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    console.log('QR Code detectado:', decodedText);
                    processCode(decodedText);
                    html5QrCode.stop();

                    // Reiniciar scanner após 3 segundos
                    setTimeout(() => initQRScanner(), 3000);
                },
                (errorMessage) => {
                    // Ignorar erros de scan contínuo
                }
            ).catch((err) => {
                console.log('Câmera não disponível, usar input manual');
            });
        }

        // Detectar NFC (se suportado)
        if ('NDEFReader' in window) {
            const ndef = new NDEFReader();

            ndef.scan().then(() => {
                console.log("NFC scanning iniciado");

                ndef.onreading = event => {
                    const decoder = new TextDecoder();
                    for (const record of event.message.records) {
                        const text = decoder.decode(record.data);
                        console.log('NFC detectado:', text);
                        processCode(text);
                    }
                };
            }).catch(error => {
                console.log('NFC não disponível:', error);
            });
        }

        // Inicializar
        document.addEventListener('DOMContentLoaded', () => {
            initQRScanner();
        });

        // Listener para input manual (Enter)
        document.getElementById('manualCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                processManualCode();
            }
        });
    </script>
</body>
</html>`;
  }
}

// Função principal para gerar todos os códigos e QR Codes
async function generateNFCSystem() {
  console.log('🔧 Gerando sistema NFC/QR Code para picagem...\n');

  const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_SERVICE_KEY || '');
  const nfcSystem = new NFCClockSystem();

  try {
    // Buscar todos os utilizadores
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, department')
      .eq('status', 'ACTIVE')
      .order('name');

    if (error) throw error;

    console.log(`👥 Total de colaboradores: ${users.length}\n`);

    // Criar diretórios
    const outputDir = path.join(process.cwd(), 'nfc-qr-system');
    const qrDir = path.join(outputDir, 'qr-codes');
    const nfcDir = path.join(outputDir, 'nfc-configs');

    [outputDir, qrDir, nfcDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    });

    // Gerar arquivo CSV com todos os códigos
    let csvContent = 'ID,Nome,Email,Departamento,Código NFC,URL Completa\n';

    // Gerar HTML com instruções
    let instructionsHTML = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>Sistema NFC/QR - Instruções de Configuração</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #333; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
        .card {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .user-card {
            display: inline-block;
            width: 300px;
            margin: 10px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            text-align: center;
            background: white;
        }
        .qr-code { margin: 15px 0; }
        .code {
            font-family: monospace;
            background: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            word-break: break-all;
        }
        .instructions {
            background: #e3f2fd;
            padding: 15px;
            border-left: 4px solid #2196f3;
            margin: 20px 0;
        }
        table { width: 100%; border-collapse: collapse; background: white; }
        th { background: #667eea; color: white; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f9f9f9; }
    </style>
</head>
<body>
    <h1>🔐 Sistema de Picagem NFC/QR Code - SEMRUMO</h1>

    <div class="card instructions">
        <h2>📱 Como Configurar Tags NFC</h2>
        <ol>
            <li>Use uma app como "TagWriter" (Android) ou "NFC Tools" (iOS/Android)</li>
            <li>Selecione "Write" → "Add a record" → "URI/URL"</li>
            <li>Cole a URL única do colaborador</li>
            <li>Aproxime a tag NFC e grave</li>
            <li>Cole a etiqueta com o nome do colaborador no cartão</li>
        </ol>
    </div>

    <div class="card instructions">
        <h2>📷 Como Usar QR Codes</h2>
        <ol>
            <li>Imprima o QR Code do colaborador</li>
            <li>Cole num cartão ou crachá</li>
            <li>O colaborador mostra o QR Code ao terminal</li>
            <li>A picagem é registada automaticamente</li>
        </ol>
    </div>

    <div class="card">
        <h2>👥 Códigos dos Colaboradores</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Departamento</th>
                    <th>Código NFC</th>
                    <th>QR Code</th>
                </tr>
            </thead>
            <tbody>`;

    // Processar cada utilizador
    for (const user of users) {
      const userCode = nfcSystem.generateUserCode(user.id, user.email);
      const nfcUrl = nfcSystem.generateNFCUrl(user.id, userCode);

      // Gerar QR Code
      const qrPath = path.join(qrDir, `qr-${user.id}-${user.name.toLowerCase().replace(/\s+/g, '-')}.png`);
      await QRCode.toFile(qrPath, nfcUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Adicionar ao CSV
      csvContent += `${user.id},"${user.name}","${user.email}","${user.department || 'N/A'}","${userCode}","${nfcUrl}"\n`;

      // Adicionar à tabela HTML
      instructionsHTML += `
                <tr>
                    <td>${user.id}</td>
                    <td><strong>${user.name}</strong></td>
                    <td>${user.department || 'N/A'}</td>
                    <td class="code">${userCode}</td>
                    <td><a href="qr-codes/qr-${user.id}-${user.name.toLowerCase().replace(/\s+/g, '-')}.png" target="_blank">Ver QR</a></td>
                </tr>`;

      console.log(`✅ Gerado código para: ${user.name}`);
    }

    instructionsHTML += `
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>🖥️ Terminal de Picagem</h2>
        <p>Abra o arquivo <strong>terminal-nfc.html</strong> num tablet ou computador no escritório.</p>
        <p>Este terminal aceita:</p>
        <ul>
            <li>✅ Tags NFC (aproximar ao dispositivo)</li>
            <li>✅ QR Codes (mostrar à câmera)</li>
            <li>✅ Código manual (digitar 16 caracteres)</li>
        </ul>
    </div>
</body>
</html>`;

    // Salvar arquivos
    fs.writeFileSync(path.join(outputDir, 'codigos-colaboradores.csv'), csvContent);
    fs.writeFileSync(path.join(outputDir, 'instrucoes-configuracao.html'), instructionsHTML);
    fs.writeFileSync(path.join(outputDir, 'terminal-nfc.html'), nfcSystem.generateNFCTerminalHTML());

    console.log('\n' + '='.repeat(60));
    console.log('✅ SISTEMA NFC/QR GERADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📁 Diretório: ${outputDir}`);
    console.log('\n📄 Arquivos gerados:');
    console.log('  • terminal-nfc.html - Terminal para o escritório');
    console.log('  • instrucoes-configuracao.html - Instruções completas');
    console.log('  • codigos-colaboradores.csv - Lista de todos os códigos');
    console.log(`  • qr-codes/ - ${users.length} QR Codes individuais`);
    console.log('\n🚀 Como implementar:');
    console.log('1. Configure um tablet/PC com terminal-nfc.html sempre aberto');
    console.log('2. Programe tags NFC com as URLs de cada colaborador');
    console.log('3. Ou imprima os QR Codes para cartões');
    console.log('4. Colaboradores aproximam cartão/telemóvel para picar');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
generateNFCSystem();