# 🚨 HOTFIX URGENTE - Erro CORS em Produção

## ❌ PROBLEMA IDENTIFICADO:

1. **Erro 500** - Múltiplos recursos falhando ao carregar
2. **CORS Error** - Referências a `localhost:11434` em produção
3. **Mixed URLs** - Código tentando conectar a localhost do servidor de produção

## ✅ SOLUÇÃO IMEDIATA:

### 1. LIMPAR TODAS AS REFERÊNCIAS LOCALHOST

```bash
# No servidor de produção, execute:
cd /path/to/myportal

# 1. Limpar dist folder completamente
rm -rf dist/

# 2. Limpar node_modules cache
rm -rf node_modules/.vite

# 3. Rebuild com configuração de produção
npm run build
```

### 2. VERIFICAR VARIÁVEIS DE AMBIENTE

Certifique-se que o arquivo `.env` em produção NÃO tem:
```env
# REMOVER ou COMENTAR:
# OLLAMA_URL=http://localhost:11434
```

### 3. HOTFIX NO CÓDIGO

Editar `pages/Settings.tsx` ANTES do rebuild:

```typescript
// MUDAR DE:
const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');

// PARA:
const [ollamaUrl, setOllamaUrl] = useState('');
```

### 4. CONFIGURAÇÃO NGINX (se aplicável)

Adicionar ao nginx config:
```nginx
location /app/myportal/ {
    # Headers CORS
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    try_files $uri $uri/ /app/myportal/index.html;
}
```

## 🔧 COMANDOS RÁPIDOS:

Execute em sequência:

```bash
# 1. Backup atual
cp -r dist dist_backup_$(date +%Y%m%d_%H%M%S)

# 2. Limpar tudo
rm -rf dist node_modules/.vite

# 3. Rebuild limpo
NODE_ENV=production npm run build

# 4. Verificar que não há localhost no build
grep -r "localhost" dist/ || echo "✅ Sem localhost encontrado"

# 5. Limpar cache do browser (cliente)
# Pressione Ctrl+Shift+R ou Cmd+Shift+R
```

## 🎯 VERIFICAÇÃO:

Após aplicar o hotfix:

1. Abrir Developer Tools (F12)
2. Ir para tab Network
3. Fazer login
4. Verificar que TODOS os requests vão para:
   - `semrumo.eu/app/myportal/*`
   - `imfhacvrivasciftaujm.supabase.co/*`
   - **NENHUM** para `localhost`

## ⚡ SOLUÇÃO ALTERNATIVA RÁPIDA:

Se ainda houver problemas, criar arquivo `dist/emergency-fix.js`:

```javascript
// Interceptar todos os requests para localhost
(function() {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    let url = args[0];
    if (typeof url === 'string' && url.includes('localhost')) {
      console.warn('Blocked localhost request:', url);
      return Promise.reject(new Error('Localhost requests blocked in production'));
    }
    return originalFetch.apply(this, args);
  };
})();
```

E adicionar ao `index.html`:
```html
<script src="/app/myportal/emergency-fix.js"></script>
```

## 📝 NOTA IMPORTANTE:

O erro está vindo de Settings.tsx que tem hardcoded:
- `http://localhost:11434` para Ollama

Isso NUNCA deve estar em produção!

---

**Status**: CRÍTICO
**Prioridade**: MÁXIMA
**Tempo estimado**: 10 minutos