# 🚀 INSTRUÇÕES UPLOAD BUILD 28 PARA SERVIDOR

**O problema é que o servidor ainda tem build antigo!**

---

## 📍 LOCALIZAÇÃO DO BUILD CORRETO

```
/Users/tiagopacheco/Desktop/MYPORTAL/dist/
```

**ESTE é o build 28 que funciona!**

---

## 🔧 MÉTODOS DE UPLOAD

### Método 1: cPanel File Manager (Mais Comum)

1. **Login no cPanel:**
   - URL: https://semrumo.eu:2083 (ou similar)
   - Username: [seu username]
   - Password: [sua password]

2. **Ir para File Manager:**
   - Menu → Files → File Manager
   - Navegar até: `public_html/app/myportal/`

3. **Fazer Backup do antigo:**
   - Selecionar toda a pasta atual
   - Compress → criar `backup_old.zip`

4. **Upload novo build:**
   - Upload → Selecionar TODOS os ficheiros de `/Users/tiagopacheco/Desktop/MYPORTAL/dist/`
   - Ou: Comprimir `dist/` localmente → Upload do zip → Extract

5. **Verificar:**
   - Confirmar que `index.html` foi substituído
   - Confirmar que existe pasta `assets/`

---

### Método 2: FTP (FileZilla)

1. **Abrir FileZilla**

2. **Conectar:**
   - Host: ftp.semrumo.eu
   - Username: [seu username]
   - Password: [sua password]
   - Port: 21

3. **Navegar:**
   - Lado direito: `public_html/app/myportal/`
   - Lado esquerdo: `/Users/tiagopacheco/Desktop/MYPORTAL/dist/`

4. **Backup:**
   - Renomear pasta atual no servidor: `myportal_old`

5. **Upload:**
   - Arrastar TODOS os ficheiros de `dist/` para o servidor
   - Aguardar upload completo (pode demorar 2-5 min)

---

### Método 3: SSH/Terminal

```bash
# 1. Comprimir build local
cd /Users/tiagopacheco/Desktop/MYPORTAL
tar -czf dist_build28.tar.gz dist/

# 2. Copiar para servidor
scp dist_build28.tar.gz usuario@semrumo.eu:/home/usuario/

# 3. No servidor (via SSH)
ssh usuario@semrumo.eu
cd /home/usuario/public_html/app/
mv myportal myportal_backup
mkdir myportal
cd myportal
tar -xzf ~/dist_build28.tar.gz --strip-components=1
```

---

## ✅ VERIFICAR UPLOAD

Após upload, verificar no servidor:

### Ficheiros críticos devem existir:
```
myportal/index.html
myportal/manifest.webmanifest
myportal/sw.js
myportal/assets/index-*.js
myportal/assets/vendor-*.js
```

### Verificar versão no index.html:
```javascript
// Deve conter:
const BUILD_VERSION = '28';
```

---

## 🧪 TESTE APÓS UPLOAD

1. **Abrir:** https://semrumo.eu/app/myportal/

2. **Limpar cache no browser:**
   - Chrome/Edge: Ctrl+Shift+Delete
   - Safari: Cmd+Option+E

3. **Testar login:**
   - ID: 1
   - PIN: 123456

4. **Deve funcionar!**

---

## 🆘 SE NÃO SOUBER O MÉTODO

**Veja qual tem acesso:**

- [ ] Tem acesso ao cPanel?
- [ ] Tem FileZilla instalado?
- [ ] Sabe usar SSH/Terminal?
- [ ] Outra ferramenta?

**Me diga qual e eu ajudo!**

---

## ⚡ TESTE LOCAL (Enquanto não faz upload)

**Já iniciei servidor local!**

Abra no browser:
```
http://localhost:3000
```

Login de teste:
- ID: 1
- PIN: 123456

**Deve funcionar perfeitamente!**

Isso confirma que o Build 28 está correto.

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Confirme que funciona em `localhost:3000`
2. ⏳ Faça upload do build para servidor
3. ✅ Teste em produção

**QUAL MÉTODO DE UPLOAD VAI USAR?**
