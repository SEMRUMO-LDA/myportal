# 📤 COMO FAZER UPLOAD DO BUILD #17

**Destino**: https://semrumo.eu/app/myportal/
**Pasta local**: `/Users/tiagopacheco/Desktop/MYPORTAL/dist/`

---

## 🚀 OPÇÃO 1: FileZilla (Recomendado)

### **Passo 1: Abrir FileZilla**

1. Abrir FileZilla
2. Conectar ao servidor:
   - **Host**: semrumo.eu (ou IP do servidor)
   - **Username**: (teu username FTP/SFTP)
   - **Password**: (tua password)
   - **Port**: 22 (SFTP) ou 21 (FTP)

### **Passo 2: Navegar para a pasta destino**

No painel direito (servidor remoto):
```
/public_html/app/myportal/
```

ou

```
/var/www/html/app/myportal/
```

(Depende da configuração do servidor)

### **Passo 3: Fazer backup da versão atual**

**IMPORTANTE**: Antes de fazer upload, fazer backup!

1. No painel direito (servidor), selecionar toda a pasta `myportal/`
2. Botão direito → **Download**
3. Guardar numa pasta local como backup:
   ```
   /Users/tiagopacheco/Desktop/MYPORTAL_BACKUP_ANTES_BUILD17/
   ```

### **Passo 4: Apagar ficheiros antigos no servidor**

No servidor remoto, apagar:
- `index.html`
- `version.json`
- Pasta `assets/` completa
- Ficheiros `.js` antigos

**NÃO apagar**:
- `.htaccess` (se existir)
- `web.config` (se existir)
- Pastas de backend (se existirem)

### **Passo 5: Upload dos novos ficheiros**

No painel esquerdo (local), navegar para:
```
/Users/tiagopacheco/Desktop/MYPORTAL/dist/
```

Selecionar **TODOS** os ficheiros e pastas em `dist/`:
- index.html
- version.json
- manifest.webmanifest
- sw.js
- workbox-8c29f6e4.js
- leo-avatar.png
- pwa-192x192.png
- pwa-512x512.png
- assets/ (pasta completa)

Arrastar para o painel direito (servidor).

**Tempo estimado**: 2-5 minutos (depende da velocidade da internet)

### **Passo 6: Verificar upload**

Após upload completo, abrir no browser:

1. **https://semrumo.eu/app/myportal/version.json**
   - Deve mostrar: `"buildNumber": 17`

2. **https://semrumo.eu/app/myportal/index.html**
   - Deve carregar a aplicação

3. **https://semrumo.eu/app/myportal/assets/index-CUeVRJ-b.js**
   - Deve existir (não dar erro 404)

---

## 🖥️ OPÇÃO 2: Terminal (macOS/Linux)

### **Via SCP (Secure Copy)**

```bash
# 1. Ir para a pasta do projeto
cd /Users/tiagopacheco/Desktop/MYPORTAL

# 2. Fazer backup do servidor (opcional)
scp -r user@semrumo.eu:/path/to/myportal/ ./BACKUP_BUILD16/

# 3. Upload de todos os ficheiros
scp -r dist/* user@semrumo.eu:/path/to/myportal/

# Substituir:
# - user: teu username SSH
# - /path/to/myportal/: caminho real no servidor
```

**Exemplo real**:
```bash
scp -r dist/* tiago@semrumo.eu:/var/www/html/app/myportal/
```

### **Via RSYNC (Mais eficiente)**

```bash
# Sincroniza apenas ficheiros alterados
rsync -avz --delete dist/ user@semrumo.eu:/path/to/myportal/

# Flags:
# -a = archive mode (preserva permissões)
# -v = verbose (mostra progresso)
# -z = compressão durante transferência
# --delete = apaga ficheiros antigos no destino
```

**Exemplo real**:
```bash
rsync -avz --delete dist/ tiago@semrumo.eu:/var/www/html/app/myportal/
```

---

## 🌐 OPÇÃO 3: cPanel / Painel de Controlo

### **Se tens acesso ao cPanel:**

1. Login no cPanel: https://semrumo.eu:2083 (ou porta do cPanel)
2. Ir para **File Manager**
3. Navegar para `/public_html/app/myportal/`
4. Selecionar todos os ficheiros antigos
5. Clicar **Delete** (fazer backup antes!)
6. Clicar **Upload** no topo
7. Selecionar todos os ficheiros de:
   ```
   /Users/tiagopacheco/Desktop/MYPORTAL/dist/
   ```
8. Esperar upload completar
9. Verificar que `assets/` foi criada e tem 59 ficheiros JS

---

## ✅ VERIFICAÇÃO PÓS-UPLOAD

### **Checklist obrigatório:**

Abrir cada URL no browser e verificar:

1. ✅ **https://semrumo.eu/app/myportal/version.json**
   ```json
   {
     "version": "1.0.0",
     "buildDate": "2026-03-19T10:21:21.839Z",
     "buildNumber": 17
   }
   ```

2. ✅ **https://semrumo.eu/app/myportal/** (ou index.html)
   - Deve carregar a aplicação
   - Abrir F12 → Console
   - NÃO deve ter erros 404 em ficheiros JS/CSS

3. ✅ **https://semrumo.eu/app/myportal/assets/index-CUeVRJ-b.js**
   - Deve existir (código JavaScript minificado)

4. ✅ **Testar login**
   - ID: 73
   - PIN: 123456
   - Deve entrar em < 3 segundos

---

## 🔧 LIMPAR CACHE DO BROWSER (Importante!)

Após upload, é **CRÍTICO** limpar cache do browser:

### **Chrome/Edge:**
```
Ctrl + Shift + Del (Windows/Linux)
Cmd + Shift + Del (macOS)

Selecionar:
☑️ Cached images and files
☑️ Cookies and other site data

Time range: Last 24 hours
Clicar "Clear data"
```

### **Firefox:**
```
Ctrl + Shift + Del (Windows/Linux)
Cmd + Shift + Del (macOS)

Selecionar:
☑️ Cache
☑️ Cookies

Time range: Everything
Clicar "Clear Now"
```

### **Safari:**
```
Cmd + Option + E (Clear cache)
Safari → Clear History → All History
```

**Ou simplesmente**:
- Abrir em **modo incógnito/privado** para testar sem cache

---

## 📱 TESTAR EM DISPOSITIVOS MÓVEIS

Após upload e limpar cache:

1. **iPhone/iPad**:
   - Abrir Safari
   - Ir para https://semrumo.eu/app/myportal/
   - Permitir geolocalização quando pedir
   - Testar picagem

2. **Android**:
   - Abrir Chrome
   - Ir para https://semrumo.eu/app/myportal/
   - Permitir geolocalização quando pedir
   - Testar picagem

**Geolocalização é obrigatória** - se não pedir permissão, algo está errado!

---

## 🚨 SE ALGO CORRER MAL

### **Problema: Aplicação não carrega (ecrã branco)**

**Solução**:
1. Abrir F12 → Console
2. Ver que erro aparece
3. Provavelmente ficheiro JS não foi carregado
4. Verificar que todos os ficheiros de `dist/assets/` foram enviados

### **Problema: Erro 404 em ficheiros**

**Solução**:
1. Verificar que a estrutura de pastas está correta:
   ```
   /app/myportal/
   ├── index.html
   ├── assets/
   │   ├── index-CUeVRJ-b.js
   │   └── ...
   ```
2. Verificar permissões dos ficheiros (644 para ficheiros, 755 para pastas)

### **Problema: "A carregar dados... Aguarde." (como antes)**

**Solução**:
1. Ir ao Supabase Dashboard → SQL Editor
2. Executar `APPLY_THIS_TO_SUPABASE_FINAL.sql`
3. Os índices da base de dados são obrigatórios!

### **Problema: Sessão não persiste (pede login sempre)**

**Solução**:
1. Ir ao Supabase Dashboard → Authentication → Settings
2. JWT expiry limit: **43200** (segundos)
3. Clicar **Save**
4. Fazer logout e login novamente

---

## 📞 APOIO

Se algo não funcionar:
1. Verificar console do browser (F12)
2. Ver logs do Supabase Dashboard
3. Comparar com documentação:
   - `DEPLOY_BUILD_17.md`
   - `RESUMO_BUILD_17.md`

---

**Upload estimado**: 2-5 minutos
**Configuração Supabase**: 2 minutos
**Testes**: 10 minutos
**TOTAL**: ~15-20 minutos

BOA SORTE! 🚀
