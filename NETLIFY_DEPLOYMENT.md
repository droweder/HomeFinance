# Guia de Deployment no Netlify

## Configurações do Netlify

### 1. Build Settings
- **Build Command**: `npm run build`
- **Publish Directory**: `dist/public`
- **Node Version**: 18

### 2. Environment Variables (obrigatórias)
Configure as seguintes variáveis de ambiente no painel do Netlify:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 3. Arquivos de Configuração
Os seguintes arquivos foram criados para o deployment:

- `netlify.toml` - Configurações principais do Netlify
- `_headers` - Headers de segurança
- `_redirects` - Redirecionamentos para SPA

### 4. Como Configurar

1. **No GitHub**: 
   - Faça push dos arquivos para seu repositório

2. **No Netlify**:
   - Conecte seu repositório GitHub
   - Configure as environment variables:
     - Vá em Site Settings > Environment Variables
     - Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   - Deploy será automático

### 5. Verificação
Após o deployment, verifique se:
- A aplicação carrega corretamente
- A autenticação com Supabase funciona
- Os dados são carregados da base Supabase

### 6. Troubleshooting
Se houver problemas:
1. Verifique os logs de build no Netlify
2. Confirme se as environment variables estão corretas
3. Verifique se o Supabase está configurado para aceitar requisições do domínio do Netlify

## Notas Importantes
- A aplicação é 100% frontend (JAMstack)
- Todas as operações de banco são feitas via Supabase
- Não há servidor backend - apenas arquivos estáticos
- O build gera todos os arquivos necessários em `dist/public`