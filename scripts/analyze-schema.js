const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Tables we know are missing or need checking
const knownTables = [
  'time_logs', 'anonymous_feedback', 'survey_responses', 'trips', 
  'receipts', 'alerts', 'employee_feedback'
];

console.log("Searching for interfaces to reverse-engineer schema...");

// Find all TypeScript files defining types
const typeFiles = execSync('find src pages components services types -name "*.ts" -o -name "*.tsx"').toString().split('\n').filter(Boolean);

let allContent = '';
for (const file of typeFiles) {
  try {
    allContent += fs.readFileSync(file, 'utf8') + '\n';
  } catch(e) {}
}

// Very basic regex to find interface definitions
const interfaceRegex = /export\s+interface\s+(\w+)\s*{([^}]+)}/g;
let match;
while ((match = interfaceRegex.exec(allContent)) !== null) {
  const name = match[1];
  const props = match[2].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && l.includes(':'));
  
  if (['TimeLog', 'Anomaly', 'Leave', 'User', 'Expense', 'Feedback', 'SurveyResponse', 'Alert'].includes(name)) {
    console.log(`\nInterface: ${name}`);
    props.forEach(p => console.log(`  ${p}`));
  }
}

// Search for supabase.from('...').select('...') to see what columns are explicitly selected
console.log("\nSearching for explicit selects...");
const selects = execSync("grep -ro \"from('[a-zA-Z_]\\+').*select('[^']*')\" src/ pages/ components/ services/ || true").toString().split('\n').filter(Boolean);
const tableSelects = {};

selects.forEach(line => {
  const tableMatch = line.match(/from\('([^']+)'\)/);
  const selectMatch = line.match(/select\('([^']+)'\)/);
  
  if (tableMatch && selectMatch) {
    const table = tableMatch[1];
    const select = selectMatch[1];
    if (!tableSelects[table]) tableSelects[table] = new Set();
    
    select.split(',').forEach(col => {
      const cleanCol = col.trim().split(':')[0].trim(); // Handle aliasing like 'created_at:timestamp'
      if (cleanCol && cleanCol !== '*') {
        tableSelects[table].add(cleanCol);
      }
    });
  }
});

for (const [table, cols] of Object.entries(tableSelects)) {
  console.log(`\nTable ${table} selects:`);
  console.log(Array.from(cols).join(', '));
}
