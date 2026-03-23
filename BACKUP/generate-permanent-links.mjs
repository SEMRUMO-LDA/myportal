#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Gerar links permanentes para todos os colaboradores
async function generatePermanentLinks() {
  console.log('🔗 Generating Permanent Clock Links\n');
  console.log('=====================================\n');

  const { data: users } = await supabase
    .from('users')
    .select('id, name, phone')
    .not('phone', 'is', null)
    .order('name');

  if (!users || users.length === 0) {
    console.log('No users found');
    return;
  }

  const baseUrl = 'https://semrumo.eu/app/myportal';

  let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Links de Picagem - SEMRUMO</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
        }
        .user-card {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .user-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .link {
            background: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            word-break: break-all;
            margin: 10px 0;
        }
        .qr-code {
            margin: 10px 0;
        }
        .instructions {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .bookmark-btn {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            display: inline-block;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <h1>🕐 Links Permanentes de Picagem</h1>

    <div class="instructions">
        <h2>📱 Como usar:</h2>
        <ol>
            <li><strong>Guardar nos favoritos:</strong> Clique no seu link e adicione aos favoritos do browser</li>
            <li><strong>Atalho no telemóvel:</strong> Adicione o link ao ecrã inicial</li>
            <li><strong>QR Code:</strong> Imprima e cole no seu local de trabalho</li>
        </ol>
    </div>
`;

  const links = [];

  for (const user of users) {
    // Gerar token único baseado no ID (permanente)
    const token = Buffer.from(`${user.id}-${user.phone}`).toString('base64');
    const clockUrl = `${baseUrl}/clock-geo.html?phone=${encodeURIComponent(user.phone)}&token=${token}&name=${encodeURIComponent(user.name)}`;

    links.push({
      id: user.id,
      name: user.name,
      phone: user.phone,
      url: clockUrl,
      token: token
    });

    html += `
    <div class="user-card">
        <div class="user-name">👤 ${user.name}</div>
        <div class="link">
            <strong>Link Pessoal:</strong><br>
            <a href="${clockUrl}" target="_blank">${clockUrl}</a>
        </div>
        <a href="${clockUrl}" class="bookmark-btn">🔖 Abrir e Guardar nos Favoritos</a>
        <div class="qr-code">
            <strong>QR Code:</strong><br>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(clockUrl)}" alt="QR Code">
        </div>
        <div style="color: #666; font-size: 12px;">
            ID: ${user.id} | Tel: ${user.phone}
        </div>
    </div>`;

    console.log(`✅ ${user.name}`);
    console.log(`   📱 ${user.phone}`);
    console.log(`   🔗 ${clockUrl}`);
    console.log('');
  }

  html += `
    <div class="instructions" style="margin-top: 40px;">
        <h2>🎯 Vantagens:</h2>
        <ul>
            <li>Link permanente - nunca muda</li>
            <li>Funciona sem WhatsApp</li>
            <li>GPS automático</li>
            <li>Um clique para picar</li>
            <li>Pode guardar como app no telemóvel</li>
        </ul>
    </div>
</body>
</html>`;

  // Guardar HTML com todos os links
  fs.writeFileSync('permanent-links.html', html);
  console.log('📄 HTML file saved: permanent-links.html');

  // Guardar JSON com os links
  fs.writeFileSync('permanent-links.json', JSON.stringify(links, null, 2));
  console.log('📊 JSON file saved: permanent-links.json');

  // Criar versão simplificada para cada utilizador
  for (const link of links) {
    const userHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Picagem">
    <title>Picagem - ${link.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
        }
        h1 { font-size: 28px; margin-bottom: 30px; }
        .btn {
            display: block;
            width: 100%;
            padding: 20px;
            margin: 20px 0;
            border: none;
            border-radius: 10px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            text-decoration: none;
            color: white;
        }
        .btn-primary {
            background: #28a745;
        }
        .btn-secondary {
            background: #007bff;
        }
        .instructions {
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>⏰ Picagem Rápida</h1>
        <h2>${link.name}</h2>

        <a href="${link.url}" class="btn btn-primary">
            📍 Picar com GPS
        </a>

        <div class="instructions">
            <h3>💡 Dica: Adicione aos Favoritos!</h3>
            <p>
                1. Clique no botão acima<br>
                2. Adicione a página aos favoritos<br>
                3. Acesso rápido sempre que precisar!
            </p>
        </div>

        <a href="${link.url}" class="btn btn-secondary">
            🔖 Abrir Link de Picagem
        </a>
    </div>
</body>
</html>`;

    const fileName = `link-${link.id}-${link.name.replace(/\s+/g, '-').toLowerCase()}.html`;
    fs.writeFileSync(fileName, userHtml);
  }

  console.log('\n✅ Individual HTML files created for each user');
  console.log('\n📱 Share these links with employees:');
  console.log('   - Send once via WhatsApp/Email');
  console.log('   - They save as bookmark');
  console.log('   - Never need WhatsApp again!');
}

generatePermanentLinks();