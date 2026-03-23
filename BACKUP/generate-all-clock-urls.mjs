#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function generateAllClockUrls() {
  console.log('🔗 Generating Clock URLs for All Users\n');
  console.log('='.repeat(70));
  console.log('');

  try {
    // Buscar todos os utilizadores com telefone
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, phone')
      .not('phone', 'is', null)
      .order('name');

    if (error || !users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    console.log(`✅ Found ${users.length} users with phone numbers\n`);

    const baseUrl = 'https://semrumo.eu/app/myportal';
    const urls = [];

    // Gerar URLs
    for (const user of users) {
      const url = `${baseUrl}/picar.html?phone=${encodeURIComponent(user.phone)}&name=${encodeURIComponent(user.name)}`;

      urls.push({
        id: user.id,
        name: user.name,
        phone: user.phone,
        url: url,
        shortUrl: `picar.html?phone=${user.phone}`
      });
    }

    // Criar HTML com todos os links
    let html = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Links de Picagem - SEMRUMO</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }

        .stat-number {
            font-size: 36px;
            font-weight: bold;
            color: #667eea;
        }

        .stat-label {
            color: #666;
            margin-top: 5px;
        }

        .search-box {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .search-box input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }

        .search-box input:focus {
            outline: none;
            border-color: #667eea;
        }

        .user-card {
            background: white;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }

        .user-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        .user-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .user-name {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }

        .user-id {
            background: #f0f0f0;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            color: #666;
        }

        .user-phone {
            color: #666;
            margin-bottom: 15px;
            font-size: 14px;
        }

        .url-box {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 5px;
            word-break: break-all;
            font-size: 12px;
            font-family: monospace;
            margin-bottom: 10px;
            border: 1px solid #e0e0e0;
        }

        .btn-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 10px 15px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
        }

        .btn-primary {
            background: #667eea;
            color: white;
        }

        .btn-primary:hover {
            background: #5a67d8;
        }

        .btn-success {
            background: #28a745;
            color: white;
        }

        .btn-success:hover {
            background: #218838;
        }

        .btn-secondary {
            background: #6c757d;
            color: white;
        }

        .btn-secondary:hover {
            background: #5a6268;
        }

        .instructions {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }

        .instructions h2 {
            color: #084298;
            margin-bottom: 15px;
        }

        .instructions ul {
            margin-left: 20px;
        }

        .instructions li {
            margin-bottom: 10px;
            color: #333;
        }

        @media print {
            .search-box, .btn-group { display: none; }
            .user-card { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 Links de Picagem Rápida</h1>
        <p>SEMRUMO - Sistema de Ponto</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number">${users.length}</div>
            <div class="stat-label">Colaboradores</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">100%</div>
            <div class="stat-label">Com GPS</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">1-Click</div>
            <div class="stat-label">Picagem Rápida</div>
        </div>
    </div>

    <div class="instructions">
        <h2>📱 Como Usar os Links</h2>
        <ul>
            <li><strong>Enviar por WhatsApp:</strong> Copie o link e envie para o colaborador</li>
            <li><strong>Guardar Favoritos:</strong> Colaborador clica no link e adiciona aos favoritos</li>
            <li><strong>Adicionar ao Ecrã Inicial:</strong> iPhone: "Adicionar ao Ecrã Principal" | Android: "Adicionar ao Ecrã Inicial"</li>
            <li><strong>Testar:</strong> Clique em "Testar Link" para abrir e experimentar</li>
            <li><strong>Copiar:</strong> Use o botão "Copiar URL" para copiar rapidamente</li>
        </ul>
    </div>

    <div class="search-box">
        <input type="text" id="searchInput" placeholder="🔍 Pesquisar por nome, telefone ou ID...">
    </div>

    <div id="userList">
`;

    // Adicionar cada utilizador
    for (const item of urls) {
      html += `
        <div class="user-card" data-search="${item.name.toLowerCase()} ${item.phone} ${item.id}">
            <div class="user-header">
                <div class="user-name">👤 ${item.name}</div>
                <div class="user-id">ID: ${item.id}</div>
            </div>
            <div class="user-phone">📱 ${item.phone}</div>
            <div class="url-box">${item.url}</div>
            <div class="btn-group">
                <a href="${item.url}" target="_blank" class="btn btn-primary">🔗 Testar Link</a>
                <button onclick="copyToClipboard('${item.url.replace(/'/g, "\\'")}', this)" class="btn btn-success">📋 Copiar URL</button>
                <button onclick="shareWhatsApp('${item.phone}', '${item.url.replace(/'/g, "\\'")}', '${item.name.replace(/'/g, "\\'")}', this)" class="btn btn-secondary">💬 Enviar WhatsApp</button>
            </div>
        </div>
`;
    }

    html += `
    </div>

    <script>
        // Pesquisa
        document.getElementById('searchInput').addEventListener('input', function(e) {
            const search = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.user-card');

            cards.forEach(card => {
                const searchData = card.getAttribute('data-search');
                if (searchData.includes(search)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });

        // Copiar para clipboard
        function copyToClipboard(text, btn) {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copiado!';
                btn.style.background = '#28a745';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                }, 2000);
            }).catch(err => {
                alert('Erro ao copiar: ' + err);
            });
        }

        // Compartilhar via WhatsApp
        function shareWhatsApp(phone, url, name, btn) {
            const message = encodeURIComponent(
                \`🔗 *Link de Picagem Pessoal - SEMRUMO*\\n\\n\` +
                \`Olá \${name}! 👋\\n\\n\` +
                \`Aqui está o seu link pessoal de picagem rápida:\\n\` +
                \`\${url}\\n\\n\` +
                \`💡 *Como usar:*\\n\` +
                \`1️⃣ Clique no link acima\\n\` +
                \`2️⃣ Permita acesso ao GPS\\n\` +
                \`3️⃣ Clique em ENTRADA ou SAÍDA\\n\` +
                \`4️⃣ Guarde o link nos favoritos!\\n\\n\` +
                \`✅ Rápido, simples e com GPS automático!\`
            );
            window.open(\`https://wa.me/\${phone.replace(/\\+/g, '')}?text=\${message}\`, '_blank');
        }

        // Estatísticas
        console.log('📊 Total de links gerados: ${users.length}');
    </script>
</body>
</html>`;

    // Salvar HTML
    fs.writeFileSync('LINKS_PICAGEM_TODOS.html', html);
    console.log('✅ Ficheiro criado: LINKS_PICAGEM_TODOS.html\n');

    // Criar CSV também
    let csv = 'ID,Nome,Telefone,URL\n';
    for (const item of urls) {
      csv += `${item.id},"${item.name}",${item.phone},"${item.url}"\n`;
    }
    fs.writeFileSync('LINKS_PICAGEM_TODOS.csv', csv);
    console.log('✅ Ficheiro criado: LINKS_PICAGEM_TODOS.csv\n');

    // Criar ficheiro de texto simples
    let txt = '═══════════════════════════════════════════════════════════════════════\n';
    txt += '                    LINKS DE PICAGEM - SEMRUMO                          \n';
    txt += '═══════════════════════════════════════════════════════════════════════\n\n';

    for (const item of urls) {
      txt += `👤 ${item.name}\n`;
      txt += `📱 Telefone: ${item.phone}\n`;
      txt += `🆔 ID: ${item.id}\n`;
      txt += `🔗 URL: ${item.url}\n`;
      txt += `${'─'.repeat(70)}\n\n`;
    }

    fs.writeFileSync('LINKS_PICAGEM_TODOS.txt', txt);
    console.log('✅ Ficheiro criado: LINKS_PICAGEM_TODOS.txt\n');

    // Mostrar alguns exemplos
    console.log('\n📋 Primeiros 5 Links:\n');
    console.log('═'.repeat(70));

    urls.slice(0, 5).forEach(item => {
      console.log(`\n👤 ${item.name}`);
      console.log(`📱 ${item.phone}`);
      console.log(`🔗 ${item.url}`);
    });

    console.log('\n\n✅ Geração completa!');
    console.log('\n📁 Ficheiros criados:');
    console.log('   • LINKS_PICAGEM_TODOS.html (visualizar no browser)');
    console.log('   • LINKS_PICAGEM_TODOS.csv (importar para Excel)');
    console.log('   • LINKS_PICAGEM_TODOS.txt (formato texto)');
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

generateAllClockUrls();
