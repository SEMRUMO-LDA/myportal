# 🚀 CHECKLIST DE DEPLOY - MyPortal

## ✅ Pré-Deploy

### 1. Build de Produção
```bash
npm run build
```

### 2. Verificar arquivos gerados
```bash
ls -lh dist/assets/*.js | head -5
# Deve mostrar vendor-*.js (~600KB), index-*.js, etc
```

---

## 📦 Deploy no Servidor

### 1. Upload de Ficheiros
Fazer upload de **TODA** a pasta `dist/` para `/app/myportal/`:

```
/app/myportal/
├── .htaccess          ← IMPORTANTE! Compressão GZIP
├── index.html
├── manifest.webmanifest
├── sw.js
├── workbox-*.js
└── assets/
    ├── index-*.js
    ├── index-*.css
    ├── vendor-*.js
    ├── Login-*.js
    ├── KioskDashboard-*.js
    └── ... (todos os outros)
```

### 2. Verificar .htaccess
O ficheiro `.htaccess` **DEVE** estar presente em `/app/myportal/.htaccess`

Se o servidor **não suporta .htaccess**, adicionar ao Apache config:
```apache
<Directory "/caminho/para/app/myportal">
    AllowOverride All
</Directory>
```

---

## 🔍 TESTES Pós-Deploy

### 1. Verificar Compressão GZIP (CRÍTICO!)

Abrir DevTools (F12) → Network → Recarregar página

**Verificar header `Content-Encoding`**:
```
✅ Content-Encoding: gzip    (BOM! Assets comprimidos)
❌ Sem header                 (MAU! Assets sem comprimir)
```

**Verificar tamanho transferido**:
```
✅ vendor-*.js: ~185 KB transferred (600 KB size)
❌ vendor-*.js: 615 KB transferred (615 KB size)  ← SEM COMPRESSÃO!
```

### 2. Se GZIP NÃO estiver a funcionar:

**Opção A - Ativar mod_deflate no Apache**:
```bash
# No servidor (SSH)
sudo a2enmod deflate
sudo systemctl restart apache2
```

**Opção B - Configurar no nginx**:
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript
           application/json application/javascript application/xml+rss;
```

**Opção C - Usar CloudFlare** (recomendado):
- Ativar "Auto Minify" para JS/CSS/HTML
- Ativar "Brotli" compression
- Cache TTL: 1 mês para assets

### 3. Verificar Cache Headers

No Network tab, verificar headers:
```
✅ Cache-Control: max-age=31536000  (para JS/CSS)
✅ Cache-Control: max-age=0         (para index.html)
```

### 4. Testar Performance

**Antes de fazer qualquer teste**:
1. Limpar cache do browser (Ctrl+Shift+Delete)
2. Fechar e reabrir browser
3. Abrir em janela privada/incógnita

**Teste de carregamento**:
1. Abrir DevTools → Network
2. Selecionar "Disable cache"
3. Recarregar página (Ctrl+Shift+R)
4. Verificar:
   - ✅ Loading screen azul aparece **instantaneamente**
   - ✅ Total transferred < 1.5 MB (com GZIP)
   - ✅ DOMContentLoaded < 3s
   - ✅ Load < 5s

---

## 🐛 Troubleshooting

### "A página fica em loading infinito"

**Causa**: JavaScript com erro
**Solução**: Abrir Console (F12) e verificar erros

### "Assets dão 404"

**Causa**: Caminho do `base` incorreto no vite.config
**Solução**: Verificar que `base: '/app/myportal/'` está correto

### "Carregamento muito lento (>10s)"

**Causas possíveis**:
1. ❌ GZIP não ativado → Ver secção "Verificar Compressão GZIP"
2. ❌ Servidor lento → Testar `ping` ao servidor
3. ❌ Rede lenta → Testar em outra rede/4G

**Solução rápida**:
```bash
# Verificar se GZIP está ON
curl -I -H "Accept-Encoding: gzip" https://semrumo.eu/app/myportal/assets/vendor-*.js

# Deve mostrar:
# Content-Encoding: gzip
```

### "Dois loading screens"

**Normal!** Há dois loaders:
1. **Loading screen inicial** (azul, HTML puro) - aparece instantaneamente
2. **Suspense loader** (cinza, React) - aparece ao trocar de página

Ambos são necessários e não causam lentidão.

---

## 📊 Métricas Esperadas

### Com GZIP ativado:
- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 3s
- **Total bundle size**: ~1.2 MB (transferido)
- **DOMContentLoaded**: < 2s

### Sem GZIP (MAU!):
- **First Contentful Paint**: ~2s
- **Time to Interactive**: 5-8s
- **Total bundle size**: ~3.6 MB (transferido)
- **DOMContentLoaded**: 4-6s

---

## ✅ Checklist Final

- [ ] Build de produção executado (`npm run build`)
- [ ] Pasta `dist/` completa enviada para servidor
- [ ] Ficheiro `.htaccess` presente em produção
- [ ] GZIP ativado (verificado no Network tab)
- [ ] Cache headers corretos (verificado no Network tab)
- [ ] Loading screen azul aparece instantaneamente
- [ ] App carrega em < 5 segundos
- [ ] Login funciona com PIN 123456
- [ ] Sem erros no Console (F12)

---

## 🆘 Suporte

Se após seguir este checklist a app continuar lenta:

1. **Tirar screenshot do Network tab** (F12 → Network → Recarregar)
2. **Exportar HAR file**: Network → Botão direito → "Save all as HAR"
3. **Verificar headers**: Clicar num asset → Headers tab → Screenshot
4. Enviar informação para análise

**Comando útil para debug**:
```bash
# Ver tamanho real transferido vs tamanho do ficheiro
curl -I -H "Accept-Encoding: gzip" https://semrumo.eu/app/myportal/assets/vendor-74TpZhNv.js
```
