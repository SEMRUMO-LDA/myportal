import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('Verificando dados do User 10024 na DB...\n');

const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', 10024)
  .single();

if (error) {
  console.error('Erro:', error);
  process.exit(1);
}

console.log('DADOS NA BASE DE DADOS:\n');

// Dados pessoais
console.log('=== PESSOAL ===');
console.log('Nome:', user.name);
console.log('Email:', user.email);
console.log('Telefone:', user.phone || 'NULL');
console.log('Morada:', user.address || 'NULL');
console.log('NIF:', user.nif || 'NULL');
console.log('NISS:', user.niss || 'NULL');
console.log('Data Nascimento:', user.birth_date || 'NULL');
console.log('Data Admissao:', user.admission_date || 'NULL');

// Campos novos
console.log('\n=== NOVOS CAMPOS ===');
console.log('Telemovel Alternativo:', user.mobile_phone || 'NULL');
console.log('Nacionalidade:', user.nationality || 'NULL');
console.log('Estado Civil:', user.marital_status || 'NULL');
console.log('Contacto Emergencia:', user.emergency_contact || 'NULL');

// Profissional
console.log('\n=== PROFISSIONAL ===');
console.log('Empresa:', user.company);
console.log('Departamento:', user.department || 'NULL');
console.log('Role:', user.role);
console.log('Location ID:', user.location_id || 'NULL');
console.log('Schedule Template ID:', user.schedule_template_id || 'NULL');

process.exit(0);
