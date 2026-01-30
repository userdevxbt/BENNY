/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    SHDWXBT BUILD CONFIGURATION                                ║
 * ║                  Obfuscation & Minification Settings                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Este arquivo configura o processo de build para ofuscar e proteger o código.
 * 
 * INSTALAÇÃO:
 * npm install -g javascript-obfuscator terser
 * 
 * USO:
 * node build.config.js
 * 
 * Ou use o script npm:
 * npm run build:protect
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Arquivos sensíveis que devem ser ofuscados (metodologia/análise)
    sensitiveFiles: [
        'smc-precision-engine.js',
        'master-precision-system.js',
        'fibonacci-precision-engine.js',
        'institutional-engine.js',
        'ml-adaptive-engine.js',
        'confluence-thermometer.js',
        'technical-analysis.js',
        'advanced-analysis.js',
        'shdwxbt-context-library.js',
        'ai-signal-validator.js',
        'smart-risk-manager.js',
        'institutional-scanner.js',
        'opportunities-service.js',
        'auto-scanner.js',
        'hot-signals.js',
        'backtester.js'
    ],
    
    // Arquivos que devem ser apenas minificados (não sensíveis)
    minifyOnly: [
        'app.js',
        'panels-logic.js',
        'wallet-connectors.js',
        'binance-api.js',
        'supabase-integration.js',
        'supabase-functions.js',
        'smart-alerts.js',
        'config.js',
        'security-shield.js'
    ],
    
    // Diretórios
    sourceDir: './',
    outputDir: './dist/',
    
    // Opções de ofuscação (nível alto)
    obfuscatorOptions: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: true,
        debugProtectionInterval: 4000,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.75,
        stringArrayEncoding: ['rc4'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
    },
    
    // Opções de minificação
    terserOptions: {
        compress: {
            drop_console: false,
            drop_debugger: true,
            dead_code: true,
            unused: true
        },
        mangle: {
            toplevel: false,
            properties: false
        },
        format: {
            comments: false
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function addCopyrightHeader(code, filename) {
    const header = `/**
 * SHDWXBT - ${filename}
 * Copyright (c) 2024-2026 SHDWXBT. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, distribution, or use is strictly prohibited.
 * This code is protected by intellectual property laws.
 * 
 * Build: ${new Date().toISOString()}
 * Checksum: ${generateChecksum(code)}
 */
`;
    return header + code;
}

function generateChecksum(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'SHDW-' + Math.abs(hash).toString(16).toUpperCase();
}

function obfuscateFile(inputPath, outputPath) {
    console.log(`🔒 Ofuscando: ${path.basename(inputPath)}`);
    
    const optionsJson = JSON.stringify(CONFIG.obfuscatorOptions);
    const cmd = `javascript-obfuscator "${inputPath}" --output "${outputPath}" --options-preset high-obfuscation`;
    
    try {
        execSync(cmd, { stdio: 'pipe' });
        
        // Adicionar header de copyright
        let code = fs.readFileSync(outputPath, 'utf8');
        code = addCopyrightHeader(code, path.basename(inputPath));
        fs.writeFileSync(outputPath, code);
        
        console.log(`   ✅ ${path.basename(outputPath)}`);
        return true;
    } catch (error) {
        console.error(`   ❌ Erro ao ofuscar ${path.basename(inputPath)}`);
        return false;
    }
}

function minifyFile(inputPath, outputPath) {
    console.log(`📦 Minificando: ${path.basename(inputPath)}`);
    
    try {
        const cmd = `terser "${inputPath}" -c -m -o "${outputPath}"`;
        execSync(cmd, { stdio: 'pipe' });
        
        // Adicionar header de copyright
        let code = fs.readFileSync(outputPath, 'utf8');
        code = addCopyrightHeader(code, path.basename(inputPath));
        fs.writeFileSync(outputPath, code);
        
        console.log(`   ✅ ${path.basename(outputPath)}`);
        return true;
    } catch (error) {
        console.error(`   ❌ Erro ao minificar ${path.basename(inputPath)}`);
        return false;
    }
}

function copyHTMLWithUpdatedPaths(filename) {
    console.log(`📄 Processando HTML: ${filename}`);
    
    const inputPath = path.join(CONFIG.sourceDir, filename);
    const outputPath = path.join(CONFIG.outputDir, filename);
    
    if (!fs.existsSync(inputPath)) return false;
    
    let html = fs.readFileSync(inputPath, 'utf8');
    
    // Adicionar security-shield.js como primeiro script
    html = html.replace(
        '<head>',
        '<head>\n<!-- Security Shield - Load First -->\n<script src="security-shield.js"></script>'
    );
    
    // Adicionar meta tags de segurança
    const securityMeta = `
    <!-- Security Headers -->
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net https://s3.tradingview.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https:; frame-src https://s.tradingview.com https://dexscreener.com;">
    `;
    
    html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">' + securityMeta);
    
    fs.writeFileSync(outputPath, html);
    console.log(`   ✅ ${filename}`);
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function build() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           SHDWXBT - Protected Build System                   ║');
    console.log('║                    Building for Production                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Verificar dependências
    try {
        execSync('javascript-obfuscator --version', { stdio: 'pipe' });
        execSync('terser --version', { stdio: 'pipe' });
    } catch (error) {
        console.error('❌ Dependências não instaladas. Execute:');
        console.error('   npm install -g javascript-obfuscator terser');
        process.exit(1);
    }
    
    // Criar diretório de output
    ensureDir(CONFIG.outputDir);
    
    let stats = { obfuscated: 0, minified: 0, html: 0, errors: 0 };
    
    // Ofuscar arquivos sensíveis
    console.log('\n🔒 OFUSCANDO ARQUIVOS SENSÍVEIS (METODOLOGIA)');
    console.log('─'.repeat(50));
    
    CONFIG.sensitiveFiles.forEach(file => {
        const inputPath = path.join(CONFIG.sourceDir, file);
        const outputPath = path.join(CONFIG.outputDir, file);
        
        if (fs.existsSync(inputPath)) {
            if (obfuscateFile(inputPath, outputPath)) {
                stats.obfuscated++;
            } else {
                stats.errors++;
            }
        }
    });
    
    // Minificar arquivos não sensíveis
    console.log('\n📦 MINIFICANDO ARQUIVOS UTILITÁRIOS');
    console.log('─'.repeat(50));
    
    CONFIG.minifyOnly.forEach(file => {
        const inputPath = path.join(CONFIG.sourceDir, file);
        const outputPath = path.join(CONFIG.outputDir, file);
        
        if (fs.existsSync(inputPath)) {
            if (minifyFile(inputPath, outputPath)) {
                stats.minified++;
            } else {
                stats.errors++;
            }
        }
    });
    
    // Processar arquivos HTML
    console.log('\n📄 PROCESSANDO ARQUIVOS HTML');
    console.log('─'.repeat(50));
    
    ['index.html', 'login.html', 'dashboard.html', 'admin.html'].forEach(file => {
        if (copyHTMLWithUpdatedPaths(file)) {
            stats.html++;
        }
    });
    
    // Copiar arquivos estáticos
    console.log('\n📁 COPIANDO ARQUIVOS ESTÁTICOS');
    console.log('─'.repeat(50));
    
    // Criar _headers para Cloudflare Pages
    const headersContent = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/*.js
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: no-cache, no-store, must-revalidate
`;
    
    fs.writeFileSync(path.join(CONFIG.outputDir, '_headers'), headersContent);
    console.log('   ✅ _headers (Cloudflare Pages)');
    
    // Relatório final
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                     BUILD COMPLETE                           ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  🔒 Arquivos ofuscados:  ${stats.obfuscated.toString().padStart(3)}                               ║`);
    console.log(`║  📦 Arquivos minificados: ${stats.minified.toString().padStart(3)}                               ║`);
    console.log(`║  📄 Arquivos HTML:        ${stats.html.toString().padStart(3)}                               ║`);
    console.log(`║  ❌ Erros:                ${stats.errors.toString().padStart(3)}                               ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Output: ./dist/                                             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    
    if (stats.errors > 0) {
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    build();
}

module.exports = { build, CONFIG };
