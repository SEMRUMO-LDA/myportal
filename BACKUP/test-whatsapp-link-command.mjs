#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Test the LINK command functionality
 */
async function testLinkCommand() {
  console.log('🧪 Testing WhatsApp LINK Command\n');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Get a test user with phone number
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, phone')
      .not('phone', 'is', null)
      .limit(5);

    if (error || !users || users.length === 0) {
      console.log('❌ No users found with phone numbers');
      return;
    }

    console.log(`✅ Found ${users.length} test users\n`);

    for (const user of users) {
      console.log('─'.repeat(60));
      console.log(`\n👤 User: ${user.name}`);
      console.log(`📱 Phone: ${user.phone}`);
      console.log(`🆔 ID: ${user.id}\n`);

      // Generate the same link that would be sent via WhatsApp
      const baseUrl = 'https://semrumo.eu/app/myportal';
      const token = Buffer.from(`${user.id}-${user.phone}`).toString('base64');
      const clockUrl = `${baseUrl}/clock-geo.html?phone=${encodeURIComponent(user.phone)}&token=${token}&name=${encodeURIComponent(user.name)}`;
      const fileName = `link-${user.id}-${user.name.replace(/\s+/g, '-').toLowerCase()}.html`;
      const landingPageUrl = `${baseUrl}/${fileName}`;

      console.log('📋 WhatsApp Response Preview:');
      console.log('─'.repeat(60));
      console.log(`🔗 *Link de Picagem Pessoal*

👤 ${user.name}
📱 ID: ${user.id}

*Link Direto de Picagem:*
${clockUrl}

*Página Pessoal:*
${landingPageUrl}

💡 *Como usar:*
1️⃣ Clique no link acima
2️⃣ Adicione aos favoritos do browser
3️⃣ No iPhone: "Adicionar ao Ecrã Principal"
4️⃣ No Android: "Adicionar ao Ecrã Inicial"

✅ *Vantagens:*
• Link permanente - nunca muda
• Funciona sem WhatsApp
• GPS automático
• Um clique para picar
• Pode guardar como app

📌 Guarde este link para acesso rápido!`);
      console.log('─'.repeat(60));
      console.log('');
    }

    console.log('\n✅ LINK command test completed successfully!');
    console.log('\n📝 Command Format:');
    console.log('   User sends: "LINK" or "L"');
    console.log('   System identifies user by phone number');
    console.log('   System sends personalized link\n');

    console.log('🎯 Use Cases:');
    console.log('   1. User wants to save bookmark for quick access');
    console.log('   2. User wants to add clock button to phone home screen');
    console.log('   3. User lost their link and needs it again');
    console.log('   4. New employee wants their personal link\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLinkCommand();
