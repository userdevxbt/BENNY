# BENNY Security Configuration

Este diretório contém configurações de segurança para proteger os arquivos JavaScript e a pasta dist/ contra download direto.

## Arquivos de Configuração

### `.htaccess` (Apache)
- Bloqueia acesso direto a arquivos `.js`
- Bloqueia acesso à pasta `/dist/`
- Permite apenas requisições que venham de páginas do próprio site
- Headers de segurança adicionais

### `_headers` (Cloudflare Pages / Netlify)
- Headers de segurança para Cloudflare Pages e Netlify
- Proteção contra indexação de arquivos JS
- Cache control para evitar armazenamento de arquivos sensíveis

### `nginx-security.conf` (Nginx)
- Configuração para servidores Nginx
- Validação de referer
- Bloqueio de acesso direto

### `vercel.json` (Vercel)
- Configuração de headers para Vercel
- Proteção de arquivos JS e pasta dist

## Como Usar

### Apache
Copie o arquivo `.htaccess` para a raiz do seu site. O Apache aplicará as regras automaticamente.

### Cloudflare Pages / Netlify
O arquivo `_headers` já está configurado na raiz. Nenhuma ação adicional necessária.

### Nginx
Adicione o conteúdo de `nginx-security.conf` ao seu arquivo de configuração do site:
```nginx
server {
    # ... suas configurações existentes
    
    # Incluir as regras de segurança
    include /path/to/nginx-security.conf;
}
```

### Vercel
O arquivo `vercel.json` já está configurado na raiz. Vercel aplicará automaticamente.

## O Que É Protegido

✅ Todos os arquivos `.js` na raiz  
✅ Pasta `/dist/` completa  
✅ Arquivos críticos de metodologia:
- smc-precision-engine.js
- master-precision-system.js
- fibonacci-precision-engine.js
- institutional-engine.js
- ml-adaptive-engine.js
- confluence-thermometer.js
- technical-analysis.js
- advanced-analysis.js
- E outros arquivos sensíveis

## Proteções Aplicadas

1. **Bloqueio de Download Direto**: Arquivos JS só podem ser carregados quando referenciados por páginas HTML do próprio site
2. **No-Cache**: Impede armazenamento em cache de arquivos sensíveis
3. **No-Index**: Impede indexação por motores de busca
4. **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
5. **Referer Validation**: Valida que requisições venham do próprio domínio

## Testando a Proteção

Tente acessar diretamente no navegador:
- `https://seu-site.com/app.js` → Deve retornar 403 Forbidden
- `https://seu-site.com/dist/dashboard.html` → Deve retornar 403 Forbidden

Mas ao acessar através de uma página HTML do site, os scripts devem carregar normalmente.
