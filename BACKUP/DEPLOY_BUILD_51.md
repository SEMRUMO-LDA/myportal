# 🚀 Deploy BUILD 51 - Instruções Completas

**Data**: 2026-03-20
**Versão**: BUILD 51
**Status Build**: ✅ **SUCESSO**
**Tamanho Total**: ~3.7 MB

---

## ✅ Pré-Deploy Checklist

- [x] Build executado com sucesso
- [x] VERSION 51 confirmado em dist/index.html
- [x] version.json atualizado
- [x] Changelog completo criado
- [x] Documentação técnica completa
- [x] Todos os bugs críticos corrigidos
- [x] Code review completo

---

## 📊 O Que Mudou Nesta Build

### 1. GPS Opcional ✅
- Colaboradores podem picar mesmo sem GPS
- Cria anomalia `MISSING_GPS` (low severity)
- Toast amarelo avisa utilizador

### 2. Novos Campos na Ficha ✅
- Telemóvel Alternativo
- Nacionalidade
- Estado Civil (dropdown)
- Contacto de Emergência

### 3. Defaults de Permissões ✅
Novos colaboradores criados com:
- ✅ Picagem manual = ON
- ✅ Pedidos Férias = ON
- ✅ Bolsa de Horas = ON

### 4. Horário Flexível (Parcial) ✅
- Desativa geofence quando ON
- Desativa anomalias de horário
- Campo "Horas Mínimas Diárias"
- ⚠️ Botões de pausa manual NÃO implementados

### 5. Bugs Corrigidos ✅
- Schedule Template agora grava corretamente
- Location ID agora grava corretamente
- Filtro permite NULL em campos ID
- Validação da morada adicionada

**Documentação Completa**: [BUILD_51_CHANGELOG.md](BUILD_51_CHANGELOG.md)

---

## 📦 Ficheiros para Upload

### Estrutura do Deploy

```
dist/
├── index.html                        (7.17 KB)
├── version.json                      (novo)
├── manifest.webmanifest              (0.37 KB)
├── sw.js                             (service worker)
├── workbox-8c29f6e4.js              (service worker helper)
├── assets/
│   ├── index-BSP7JRDm.css           (168.76 KB)
│   ├── index-3MF-hEP1.js            (197.06 KB)
│   ├── vendor-Dk67Xesb.js           (737.65 KB) ← Maior chunk
│   ├── vendor-pdf-7FpZMLCr.js       (575.73 KB)
│   ├── vendor-charts-DbCKyebV.js    (326.83 KB)
│   ├── vendor-calendar-CuUsxa0w.js  (323.92 KB)
│   ├── vendor-supabase-BGsYGe4j.js  (161.21 KB)
│   └── [50+ outros ficheiros JS]
└── .htaccess                         (importante para cache)
```

---

## 🔧 Instruções de Deploy

### Opção 1: Upload Manual via FTP/SFTP

1. **Backup Atual** (IMPORTANTE!)
   ```bash
   # No servidor, fazer backup da pasta atual
   mv /app/myportal /app/myportal_backup_build50
   ```

2. **Upload da nova dist/**
   - Fazer upload de TODA a pasta `dist/` para `/app/myportal/`
   - Incluir ficheiros ocultos (`.htaccess`)
   - Sobrescrever todos os ficheiros

3. **Verificar Permissões**
   ```bash
   chmod -R 755 /app/myportal
   chown -R www-data:www-data /app/myportal
   ```

4. **Verificar .htaccess**
   - Confirmar que `public/.htaccess` existe
   - Confirmar que tem headers de cache corretos

---

### Opção 2: Deploy Automatizado (Script)

```bash
#!/bin/bash
# deploy-build-51.sh

REMOTE_USER="semrumo"
REMOTE_HOST="semrumo.eu"
REMOTE_PATH="/app/myportal"
LOCAL_DIST="./dist"

echo "🚀 Deploy BUILD 51 para produção..."

# 1. Backup remoto
echo "📦 Criando backup..."
ssh $REMOTE_USER@$REMOTE_HOST "cp -r $REMOTE_PATH ${REMOTE_PATH}_backup_build50"

# 2. Upload
echo "⬆️  Fazendo upload..."
rsync -avz --delete $LOCAL_DIST/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

# 3. Permissões
echo "🔐 Ajustando permissões..."
ssh $REMOTE_USER@$REMOTE_HOST "chmod -R 755 $REMOTE_PATH && chown -R www-data:www-data $REMOTE_PATH"

# 4. Verificação
echo "✅ Verificando deploy..."
curl -I https://semrumo.eu/app/myportal/ | head -n 1

echo "🎉 Deploy concluído!"
```

---

## 🧪 Testes Pós-Deploy

### 1. Teste Básico - Acesso ✅

```bash
# Verificar se site está acessível
curl -I https://semrumo.eu/app/myportal/
# Deve retornar: HTTP/1.1 200 OK
```

**Browser**:
1. Abrir `https://semrumo.eu/app/myportal/`
2. Deve aparecer página de login
3. Console deve mostrar: `[CacheBuster] New version: 51`

---

### 2. Teste de Cache Busting ✅

1. **Chrome**: Abrir DevTools → Application → Clear storage → Reload
2. **Safari**: Command + Option + E → Reload
3. Console deve mostrar:
   ```
   [CacheBuster] Old version: 50 → New version: 51
   [CacheBuster] Cache cleared successfully
   ```

---

### 3. Teste de Login ✅

1. Fazer login com utilizador teste
2. Deve redirecionar para dashboard
3. Sem erros na consola

---

### 4. Teste de Picagem (CRÍTICO) ✅

1. Ir para `/app/myportal/#/kiosk`
2. Selecionar colaborador
3. Clicar "ENTRADA"
4. **Deve funcionar** mesmo sem GPS
5. Se GPS falhar: deve mostrar toast amarelo

**Cenários**:
- ✅ GPS ativo → funciona normal
- ✅ GPS desligado → funciona + toast amarelo
- ✅ GPS timeout → funciona + toast amarelo

---

### 5. Teste de Novos Campos ✅

1. Login como ADMIN/RH
2. Ir para "Gestão de Utilizadores"
3. Criar novo colaborador
4. Tab "Dados Pessoais" → verificar 4 novos campos:
   - Telemóvel Alternativo
   - Nacionalidade (default "Portuguesa")
   - Estado Civil (dropdown)
   - Contacto de Emergência
5. Preencher e guardar
6. Refresh → verificar que valores persistem

---

### 6. Teste de Defaults de Permissões ✅

1. Criar novo colaborador
2. Ir para tab "Acesso"
3. **Verificar toggles ON**:
   - ✅ Picagem manual (azul)
   - ✅ Pedidos Férias (azul)
   - ✅ Bolsa de Horas (azul)

---

### 7. Teste de Horário Flexível ⚠️

**ATENÇÃO**: Funcionalidade parcial, NÃO ativar em produção ainda

1. Editar colaborador teste
2. Tab "Acesso" → Ativar "Horário Flexível"
3. Campo "Horas Mínimas Diárias" deve aparecer
4. Configurar restrictGeo = ON
5. Fazer picagem fora do raio permitido
6. **Deve permitir** (geofence ignorado)

---

## ⚠️ Troubleshooting

### Problema 1: Cache não limpa

**Sintomas**: Utilizadores ainda veem versão antiga

**Solução**:
```javascript
// No browser, consola:
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

---

### Problema 2: Erro 404 nos assets

**Sintomas**: CSS/JS não carrega

**Causa**: Caminho incorreto ou ficheiros não fizeram upload

**Solução**:
1. Verificar se pasta `dist/assets/` existe no servidor
2. Verificar permissões (755)
3. Re-upload da pasta `assets/`

---

### Problema 3: Picagem não funciona

**Sintomas**: Erro ao picar

**Debug**:
1. Abrir DevTools → Network
2. Verificar calls para `/time_logs`
3. Ver resposta do servidor

**Possíveis causas**:
- RLS policies na DB
- Campos novos não existem na tabela
- Conexão Supabase

---

### Problema 4: Novos campos não aparecem

**Sintomas**: Campos mobilePhone, nationality, etc não visíveis

**Causa**: Cache do browser

**Solução**:
1. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear cache no DevTools
3. Verificar version.json: `curl https://semrumo.eu/app/myportal/version.json`

---

## 📊 Monitorização Pós-Deploy

### Métricas para Observar

1. **Anomalias GPS**
   ```sql
   SELECT COUNT(*) FROM anomalies
   WHERE type = 'MISSING_GPS'
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Taxa de Sucesso de Picagens**
   ```sql
   SELECT COUNT(*) FROM time_logs
   WHERE date = CURRENT_DATE;
   ```

3. **Erros JavaScript**
   - Monitorizar console.error
   - Verificar logs do servidor

---

## 🔄 Rollback (Se Necessário)

Se algo correr mal:

```bash
# 1. Restaurar backup
ssh user@server "rm -rf /app/myportal && mv /app/myportal_backup_build50 /app/myportal"

# 2. Limpar cache utilizadores
# Enviar email/aviso para utilizadores fazerem Ctrl+Shift+R
```

---

## ✅ Checklist Final

### Antes do Deploy
- [x] Build concluído sem erros
- [x] Changelog criado
- [x] Documentação completa
- [x] Versão incrementada para 51

### Durante o Deploy
- [ ] Backup da versão anterior criado
- [ ] Upload de todos os ficheiros
- [ ] Permissões ajustadas
- [ ] `.htaccess` verificado

### Após o Deploy
- [ ] Site acessível (HTTP 200)
- [ ] Login funciona
- [ ] Picagem funciona (com e sem GPS)
- [ ] Novos campos visíveis
- [ ] Defaults de permissões aplicados
- [ ] Cache busting funciona
- [ ] Sem erros na consola

### Monitorização (Primeiras 24h)
- [ ] Verificar anomalias GPS criadas
- [ ] Verificar taxa de sucesso de picagens
- [ ] Feedback de utilizadores
- [ ] Verificar logs de erro

---

## 📞 Suporte

**Em caso de problemas críticos**:

1. **Rollback imediato** para BUILD 50
2. Documentar erro encontrado
3. Verificar logs do servidor
4. Contactar equipa de desenvolvimento

---

## 📈 KPIs de Sucesso

**Deploy considera-se bem-sucedido se**:

- ✅ 0 erros críticos nas primeiras 24h
- ✅ Taxa de sucesso de picagens > 95%
- ✅ < 10 anomalias GPS/dia (indicador de problemas reais)
- ✅ Feedback positivo de utilizadores
- ✅ Novos campos a ser utilizados

---

## 🎉 Notas Finais

### Vantagens da BUILD 51

1. **Maior Resiliência** - Picagem não falha por GPS
2. **Melhor UX** - Mais campos disponíveis
3. **Defaults Inteligentes** - Menos configuração manual
4. **Preparação para Flexível** - Base para horário flexível completo

### Próximos Passos (BUILD 52)

1. Botões de pausa manual
2. Dashboard de anomalias GPS
3. Relatórios de horário flexível

---

**Deploy preparado por**: Claude Code Agent
**Data**: 2026-03-20 19:30 UTC
**Status**: ✅ **PRONTO PARA PRODUÇÃO**

---

**BOA SORTE COM O DEPLOY! 🚀**
