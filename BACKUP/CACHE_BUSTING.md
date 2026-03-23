# 🚀 CACHE BUSTING - MyPortal

## ✅ Sistema Implementado

O MyPortal utiliza **3 camadas de cache busting** para garantir que os utilizadores recebem sempre a versão mais recente:

---

## 🔹 **Camada 1: Hashes Automáticos (Vite)**

### Como funciona:
Vite adiciona **automaticamente** um hash único ao nome de cada ficheiro quando o conteúdo muda.

### Exemplos:
```
index-CO3gWz9Y.js      ← Hash: CO3gWz9Y
Login-BWhFS7Yk.js       ← Hash: BWhFS7Yk
vendor-74TpZhNv.js      ← Hash: 74TpZhNv
index-CxeyhOxr.css      ← Hash: CxeyhOxr
```

### Vantagens:
- ✅ **Automático** - não precisa fazer nada
- ✅ **Preciso** - só muda quando o conteúdo muda
- ✅ **Eficiente** - ficheiros não alterados mantêm o mesmo hash

### O que acontece:
1. Fazes alteração no código
2. Executas `npm run build`
3. Vite gera **novo hash** automaticamente
4. Browser carrega **novo ficheiro** (nome diferente)
5. Ficheiros antigos ficam em cache (não há problema)

---

## 🔹 **Camada 2: Build Number (version.json)**

### Como funciona:
Cada build incrementa automaticamente um número de versão.

### Ficheiro: `version.json`
```json
{
  "version": "1.0.0",
  "buildDate": "2026-03-19T08:35:27.059Z",
  "buildNumber": 2
}
```

### Script: `scripts/update-version.js`
Executado **automaticamente** antes de cada build:
```bash
npm run build
# Executa: node scripts/update-version.js && vite build
```

### O que acontece:
1. Script incrementa `buildNumber`
2. Atualiza `buildDate` com timestamp atual
3. Ficheiro `version.json` é copiado para `dist/`
4. Pode ser usado para tracking de versão

### Como usar (opcional):
```javascript
// Fetch current version
fetch('/app/myportal/version.json')
  .then(r => r.json())
  .then(v => console.log(`Version: ${v.version} Build: ${v.buildNumber}`));
```

---

## 🔹 **Camada 3: Headers HTTP (.htaccess)**

### Ficheiro: `public/.htaccess`
Copiado automaticamente para `dist/.htaccess` durante o build.

### Estratégia de Cache:

#### ✅ **Assets com hash (JS/CSS) - Cache FOREVER**
```apache
<FilesMatch "\.(js|css)$">
  Header set Cache-Control "max-age=31536000, public, immutable"
</FilesMatch>
```
- **Cache**: 1 ano (31536000 segundos)
- **immutable**: Browser **nunca** revalida (máxima performance)
- **Seguro**: Nome muda se conteúdo mudar (hash)

#### ✅ **HTML - Cache NEVER**
```apache
<FilesMatch "\.(html|htm)$">
  Header set Cache-Control "max-age=0, no-cache, no-store, must-revalidate"
</FilesMatch>
```
- **Cache**: 0 segundos
- **no-cache**: Sempre revalida com servidor
- **must-revalidate**: Obrigatório revalidar

#### ✅ **Service Worker e Manifest - Cache NEVER**
```apache
<FilesMatch "^(sw\.js|manifest\.webmanifest|version\.json)$">
  Header set Cache-Control "max-age=0, no-cache, no-store, must-revalidate"
</FilesMatch>
```

#### ✅ **GZIP Compression**
```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE text/html
</IfModule>
```
- **Reduz**: ~70% do tamanho (615KB → 185KB)
- **Crítico**: Para performance!

---

## 📊 **Fluxo Completo**

### Quando fazes um deploy novo:

```
1. npm run build
   ↓
2. scripts/update-version.js
   ├─ buildNumber: 2 → 3
   └─ buildDate: atualizado
   ↓
3. Vite Build
   ├─ Gera novos hashes: Login-ABC123.js
   ├─ Copia .htaccess para dist/
   └─ Copia version.json para dist/
   ↓
4. Upload dist/ para servidor
   ↓
5. Utilizador acede à app
   ├─ HTML: Cache MISS (sempre fresh)
   ├─ index.html referencia Login-ABC123.js (novo hash)
   ├─ Browser carrega Login-ABC123.js (cache MISS)
   └─ Browser guarda Login-ABC123.js (cache 1 ano)
   ↓
6. Próximo acesso
   ├─ HTML: Cache MISS (revalida)
   ├─ index.html referencia Login-ABC123.js (mesmo hash)
   └─ Browser usa cache (HIT) ← SUPER RÁPIDO!
```

---

## 🎯 **Verificação em Produção**

### 1. Verificar GZIP está ativo:
```bash
curl -I -H "Accept-Encoding: gzip" https://semrumo.eu/app/myportal/assets/vendor-74TpZhNv.js
```

**Deve mostrar**:
```
Content-Encoding: gzip
Content-Length: ~185000  (vs 615000 sem GZIP)
```

### 2. Verificar Cache Headers:
Abrir DevTools (F12) → Network → Recarregar → Clicar em qualquer `.js`

**Headers esperados**:
```
Cache-Control: max-age=31536000, public, immutable
Content-Encoding: gzip
```

### 3. Verificar versão:
```bash
curl https://semrumo.eu/app/myportal/version.json
```

**Output**:
```json
{
  "version": "1.0.0",
  "buildDate": "2026-03-19T08:35:27.059Z",
  "buildNumber": 3
}
```

---

## 🔧 **Troubleshooting**

### ❌ "Mudei o código mas utilizador vê versão antiga"

**Causa**: HTML em cache (raro) ou build não executado

**Solução**:
```bash
# 1. Verificar se fizeste build
npm run build

# 2. Verificar se hashes mudaram
ls dist/assets/Login-*.js
# Deve mostrar NOVO hash

# 3. Verificar se .htaccess está no servidor
# Deve estar em /app/myportal/.htaccess

# 4. Forçar refresh no browser
Ctrl + Shift + R
```

### ❌ "GZIP não está ativo"

**Verificar**:
```bash
curl -I -H "Accept-Encoding: gzip" https://semrumo.eu/app/myportal/assets/vendor-74TpZhNv.js | grep "Content-Encoding"
```

**Se não mostrar "gzip"**:
```bash
# Opção 1: Ativar mod_deflate
sudo a2enmod deflate
sudo a2enmod headers
sudo systemctl restart apache2

# Opção 2: Usar CloudFlare (recomendado)
# Ativa "Auto Minify" e "Brotli"
```

### ❌ "Assets dão 404"

**Causa**: Caminho errado no `base` do vite.config

**Verificar**:
```typescript
// vite.config.ts
export default defineConfig({
  base: '/app/myportal/',  ← Deve ser EXATAMENTE o caminho do servidor
})
```

---

## 📋 **Checklist de Deploy**

Antes de cada deploy:

- [ ] `npm run build` executado (atualiza versão automaticamente)
- [ ] Pasta `dist/` completa enviada para servidor
- [ ] Ficheiro `dist/.htaccess` presente no servidor
- [ ] Ficheiro `dist/version.json` presente no servidor
- [ ] GZIP ativo (verificar com curl)
- [ ] Cache headers corretos (verificar no DevTools)
- [ ] Teste em browser privado (sem cache)

---

## 📝 **Resumo**

| Tipo de Ficheiro | Cache Duration | Revalidação | Hash no Nome? |
|------------------|----------------|-------------|---------------|
| **index.html** | 0 segundos | Sempre | ❌ Não |
| **JS/CSS** | 1 ano | Nunca | ✅ Sim |
| **Imagens** | 1 ano | Nunca | ⚠️ Recomendado |
| **version.json** | 0 segundos | Sempre | ❌ Não |
| **sw.js** | 0 segundos | Sempre | ❌ Não |

---

## 🎉 **Benefícios**

✅ **Performance**: Utilizadores recorrentes carregam 10x mais rápido (cache)
✅ **Atualizações**: Novas versões aplicadas instantaneamente
✅ **Bandwidth**: Reduz 70% do tráfego (GZIP + cache)
✅ **Experiência**: Zero "versão antiga" stuck
✅ **Automático**: Sem trabalho manual em cada deploy

---

**Versão deste documento**: 1.0.0
**Última atualização**: 2026-03-19
