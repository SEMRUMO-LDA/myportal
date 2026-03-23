# 🚨 HOTFIX IMEDIATO - RESOLVER JÁ!

## O PROBLEMA REAL:
A mensagem "A carregar dados... Aguarde." está a aparecer porque o sistema está a tentar carregar users mas está a falhar!

## SOLUÇÃO IMEDIATA - 2 OPÇÕES:

### OPÇÃO 1: BYPASS TOTAL (MAIS RÁPIDA - 30 SEGUNDOS)

Editar diretamente o Login.tsx em produção:

```javascript
// LINHA 536-539 - COMENTAR ISTO:
// if (allAvailableUsers.length === 0 && loadingUsers) {
//   setEmployeeError('A carregar dados... Aguarde.');
//   return;
// }

// SUBSTITUIR POR:
if (allAvailableUsers.length === 0) {
  // BYPASS - permite login direto mesmo sem lista de users
  console.log('[HOTFIX] Bypassing user check - allowing direct login');
  setStep('pin');
  setPin('');
  return;
}
```

### OPÇÃO 2: FORÇAR USERS HARDCODED (1 MINUTO)

Adicionar no início do handleEmployeeSubmit:

```javascript
// HOTFIX: Users hardcoded para emergência
if (allAvailableUsers.length === 0) {
  const emergencyUsers = [
    { id: 73, name: 'Admin', pin: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' }, // 123456
    { id: 1, name: 'RH', pin: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' },
    // Adicionar mais users conforme necessário
  ];
  setLocalUsers(emergencyUsers);
  allAvailableUsers = emergencyUsers;
}
```

## AÇÃO IMEDIATA AGORA: