/**
 * Script para gerar links únicos de picagem rápida
 * Cada colaborador terá um link direto que autentica e faz a picagem automaticamente
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://imfhacvrivasciftaujm.supabase.co';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE1NzQyNSwiZXhwIjoyMDg0NzMzNDI1fQ.0IzRioNPcH-pcsWPQo3LrdAIGkVbC3ONgjAiFDdh4mM';

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Função para gerar token único e seguro
function generateSecureToken(userId: number, email: string): string {
  const secret = 'MYPORTAL_CLOCK_SECRET_2024';
  const data = `${userId}:${email}:${Date.now()}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 32);
}

// Template HTML para página de picagem rápida
function generateClockPageHTML(user: any, token: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Picagem Rápida - ${user.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }

        .avatar {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: white;
            font-weight: bold;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .user-info {
            color: #666;
            margin-bottom: 30px;
        }

        .clock-display {
            font-size: 48px;
            font-weight: 300;
            color: #333;
            margin: 30px 0;
            font-variant-numeric: tabular-nums;
        }

        .button-container {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
        }

        .clock-button {
            flex: 1;
            padding: 20px;
            border: none;
            border-radius: 15px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .clock-in {
            background: linear-gradient(135deg, #4caf50, #45a049);
            color: white;
        }

        .clock-in:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(76, 175, 80, 0.3);
        }

        .clock-out {
            background: linear-gradient(135deg, #f44336, #e53935);
            color: white;
        }

        .clock-out:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(244, 67, 54, 0.3);
        }

        .clock-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }

        .status {
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
            font-weight: 500;
        }

        .status.success {
            background: #e8f5e9;
            color: #2e7d32;
            border: 2px solid #4caf50;
        }

        .status.error {
            background: #ffebee;
            color: #c62828;
            border: 2px solid #f44336;
        }

        .status.info {
            background: #e3f2fd;
            color: #1565c0;
            border: 2px solid #2196f3;
        }

        .last-clock {
            margin-top: 20px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 10px;
            color: #666;
        }

        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #999;
            font-size: 12px;
        }

        @media (max-width: 480px) {
            .container {
                padding: 30px 20px;
            }

            .clock-display {
                font-size: 36px;
            }

            .button-container {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="avatar">${user.name.substring(0, 2).toUpperCase()}</div>
        <h1>Olá, ${user.name.split(' ')[0]}!</h1>
        <div class="user-info">
            <div>${user.role || 'Colaborador'}</div>
            <div>${user.department || 'Sem Departamento'}</div>
        </div>

        <div class="clock-display" id="clock">--:--:--</div>

        <div class="button-container">
            <button class="clock-button clock-in" onclick="clockIn()">
                🟢 Entrada
            </button>
            <button class="clock-button clock-out" onclick="clockOut()">
                🔴 Saída
            </button>
        </div>

        <div id="status"></div>
        <div id="lastClock" class="last-clock" style="display: none;"></div>

        <div class="footer">
            Sistema de Picagem Rápida - SEMRUMO MyPortal<br>
            Link pessoal e intransmissível
        </div>
    </div>

    <script>
        // Configuração
        const API_URL = 'https://imfhacvrivasciftaujm.supabase.co';
        const USER_ID = ${user.id};
        const USER_TOKEN = '${token}';
        const USER_EMAIL = '${user.email}';

        // Atualizar relógio
        function updateClock() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('clock').textContent = \`\${hours}:\${minutes}:\${seconds}\`;
        }

        setInterval(updateClock, 1000);
        updateClock();

        // Função para mostrar status
        function showStatus(message, type = 'info') {
            const statusEl = document.getElementById('status');
            statusEl.className = 'status ' + type;
            statusEl.innerHTML = message;

            if (type === 'success') {
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 5000);
            }
        }

        // Função para fazer picagem de entrada
        async function clockIn() {
            showStatus('A registar entrada... <span class="loading"></span>', 'info');

            try {
                const response = await fetch(\`\${API_URL}/rest/v1/time_logs\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs'
                    },
                    body: JSON.stringify({
                        user_id: USER_ID,
                        clock_in: new Date().toISOString(),
                        type: 'IN',
                        clock_in_method: 'FAST_LINK',
                        gps_address: 'Link Direto'
                    })
                });

                if (response.ok) {
                    showStatus('✅ Entrada registada com sucesso!', 'success');
                    updateLastClock('Entrada às ' + new Date().toLocaleTimeString('pt-PT'));
                } else {
                    throw new Error('Erro ao registar entrada');
                }
            } catch (error) {
                showStatus('❌ Erro ao registar entrada. Tente novamente.', 'error');
                console.error(error);
            }
        }

        // Função para fazer picagem de saída
        async function clockOut() {
            showStatus('A registar saída... <span class="loading"></span>', 'info');

            try {
                // Primeiro buscar o último registo de entrada
                const getResponse = await fetch(\`\${API_URL}/rest/v1/time_logs?user_id=eq.\${USER_ID}&clock_out=is.null&order=clock_in.desc&limit=1\`, {
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs'
                    }
                });

                const logs = await getResponse.json();

                if (logs && logs.length > 0) {
                    const logId = logs[0].id;

                    // Atualizar com a saída
                    const updateResponse = await fetch(\`\${API_URL}/rest/v1/time_logs?id=eq.\${logId}\`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs'
                        },
                        body: JSON.stringify({
                            clock_out: new Date().toISOString(),
                            type: 'OUT',
                            clock_out_method: 'FAST_LINK'
                        })
                    });

                    if (updateResponse.ok) {
                        showStatus('✅ Saída registada com sucesso!', 'success');
                        updateLastClock('Saída às ' + new Date().toLocaleTimeString('pt-PT'));
                    } else {
                        throw new Error('Erro ao registar saída');
                    }
                } else {
                    showStatus('⚠️ Não há entrada registada para fazer saída', 'error');
                }
            } catch (error) {
                showStatus('❌ Erro ao registar saída. Tente novamente.', 'error');
                console.error(error);
            }
        }

        // Atualizar última picagem
        function updateLastClock(text) {
            const lastClockEl = document.getElementById('lastClock');
            lastClockEl.style.display = 'block';
            lastClockEl.innerHTML = '<strong>Última picagem:</strong> ' + text;
        }

        // Carregar última picagem ao iniciar
        async function loadLastClock() {
            try {
                const response = await fetch(\`\${API_URL}/rest/v1/time_logs?user_id=eq.\${USER_ID}&order=created_at.desc&limit=1\`, {
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs'
                    }
                });

                const logs = await response.json();

                if (logs && logs.length > 0) {
                    const log = logs[0];
                    const type = log.clock_out ? 'Saída' : 'Entrada';
                    const time = new Date(log.clock_out || log.clock_in).toLocaleString('pt-PT');
                    updateLastClock(\`\${type} em \${time}\`);
                }
            } catch (error) {
                console.error('Erro ao carregar última picagem:', error);
            }
        }

        // Carregar dados ao iniciar
        loadLastClock();
    </script>
</body>
</html>`;
}

async function generateAllLinks() {
  console.log('🔗 Gerando links únicos de picagem para todos os colaboradores...\n');

  try {
    // Buscar todos os usuários ativos
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, department, status')
      .eq('status', 'ACTIVE')
      .order('name');

    if (error) throw error;

    console.log(`📊 Total de colaboradores encontrados: ${users.length}\n`);

    // Criar diretório para os arquivos HTML
    const outputDir = path.join(process.cwd(), 'picagem-links');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Gerar arquivo de índice com todos os links
    let indexHTML = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Links de Picagem Rápida - SEMRUMO</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #667eea;
        }
        .search {
            margin: 20px 0;
            padding: 15px;
            width: 100%;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-sizing: border-box;
        }
        .stats {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        th {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #f0f0f0;
        }
        tr:hover {
            background: #f9f9f9;
        }
        .link {
            display: inline-block;
            padding: 8px 16px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: all 0.3s;
        }
        .link:hover {
            background: #764ba2;
            transform: translateY(-2px);
        }
        .copy-btn {
            padding: 6px 12px;
            background: #4caf50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 10px;
            font-size: 12px;
        }
        .copy-btn:hover {
            background: #45a049;
        }
        .department {
            display: inline-block;
            padding: 4px 8px;
            background: #e3f2fd;
            color: #1976d2;
            border-radius: 4px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <h1>🔗 Links de Picagem Rápida - SEMRUMO MyPortal</h1>

    <div class="stats">
        <strong>Total de Colaboradores:</strong> ${users.length} |
        <strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-PT')}
    </div>

    <input type="text" class="search" id="search" placeholder="Pesquisar por nome, email ou departamento..." onkeyup="filterTable()">

    <table id="linksTable">
        <thead>
            <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Cargo</th>
                <th>Departamento</th>
                <th>Link de Picagem</th>
            </tr>
        </thead>
        <tbody>`;

    // Gerar link para cada colaborador
    for (const user of users) {
      const token = generateSecureToken(user.id, user.email);
      const fileName = `picagem-${user.id}-${user.name.toLowerCase().replace(/\s+/g, '-')}.html`;
      const filePath = path.join(outputDir, fileName);

      // Criar arquivo HTML individual
      const htmlContent = generateClockPageHTML(user, token);
      fs.writeFileSync(filePath, htmlContent);

      // Adicionar à tabela de índice
      indexHTML += `
            <tr>
                <td>${user.id}</td>
                <td><strong>${user.name}</strong></td>
                <td>${user.email}</td>
                <td>${user.role || 'Colaborador'}</td>
                <td><span class="department">${user.department || 'Sem Dept.'}</span></td>
                <td>
                    <a href="${fileName}" class="link" target="_blank">Abrir Link</a>
                    <button class="copy-btn" onclick="copyLink('${fileName}')">📋 Copiar</button>
                </td>
            </tr>`;

      console.log(`✅ Link gerado para: ${user.name} (${fileName})`);
    }

    indexHTML += `
        </tbody>
    </table>

    <script>
        function filterTable() {
            const input = document.getElementById('search');
            const filter = input.value.toUpperCase();
            const table = document.getElementById('linksTable');
            const tr = table.getElementsByTagName('tr');

            for (let i = 1; i < tr.length; i++) {
                const td = tr[i].getElementsByTagName('td');
                let found = false;

                for (let j = 0; j < td.length; j++) {
                    if (td[j]) {
                        const txtValue = td[j].textContent || td[j].innerText;
                        if (txtValue.toUpperCase().indexOf(filter) > -1) {
                            found = true;
                            break;
                        }
                    }
                }

                tr[i].style.display = found ? '' : 'none';
            }
        }

        function copyLink(fileName) {
            const fullUrl = window.location.href.replace('index.html', '') + fileName;
            navigator.clipboard.writeText(fullUrl).then(() => {
                alert('Link copiado para a área de transferência!');
            });
        }
    </script>
</body>
</html>`;

    // Salvar arquivo de índice
    const indexPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(indexPath, indexHTML);

    console.log('\n' + '='.repeat(60));
    console.log('✅ LINKS GERADOS COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📁 Diretório: ${outputDir}`);
    console.log(`📄 Arquivo principal: ${indexPath}`);
    console.log(`🔗 Total de links gerados: ${users.length}`);
    console.log('\n🚀 Como usar:');
    console.log('1. Abra o arquivo index.html no navegador');
    console.log('2. Procure o colaborador desejado');
    console.log('3. Clique em "Abrir Link" ou copie o link');
    console.log('4. Envie o link único para cada colaborador');
    console.log('\n⚠️  Importante: Cada link é pessoal e intransmissível!');

  } catch (error) {
    console.error('❌ Erro ao gerar links:', error);
  }
}

// Executar
generateAllLinks();