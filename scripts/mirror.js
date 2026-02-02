/**
 * scripts/mirror.js (Lithic - Disposable Root)
 * * Plugins -> wiki/plugins/external
 * * Tiddlers -> wiki/tiddlers (Wiped and rebuilt every run)
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const yaml = require('js-yaml');

// --- CONFIGURATION ---
const CONFIG_FILE = 'vendor.yml';
const LOCK_FILE = 'vendor-lock.json';

const PLUGIN_DIR = path.join('wiki', 'plugins', 'external');
const TIDDLERS_DIR = path.join('wiki', 'tiddlers');

// 1. Load Config
if (!fs.existsSync(CONFIG_FILE)) {
    console.error(`❌ ERROR: Could not find ${CONFIG_FILE}`);
    process.exit(1);
}

let sources;
try {
    sources = yaml.load(fs.readFileSync(CONFIG_FILE, 'utf8'));
} catch (e) {
    console.error(`❌ ERROR: Invalid YAML: ${e.message}`);
    process.exit(1);
}

// 2. Prepare Directories
if (!fs.existsSync(PLUGIN_DIR)) fs.mkdirSync(PLUGIN_DIR, { recursive: true });

// WIPE TIDDLERS COMPLETELY (Since Lithic code is in /plugins)
if (fs.existsSync(TIDDLERS_DIR)) {
    console.log(`🧹 Wiping ${TIDDLERS_DIR} for a clean build...`);
    fs.rmSync(TIDDLERS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TIDDLERS_DIR, { recursive: true });

let lockData = {};
if (fs.existsSync(LOCK_FILE)) {
    lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
}

// Helper: Get Remote Headers
function getRemoteInfo(url) {
    try {
        const headers = execSync(`curl -s -I -L "${url}"`).toString();
        const etagMatch = headers.match(/etag:\s*"?([^"\r\n]+)"?/i);
        const dateMatch = headers.match(/last-modified:\s*([^\r\n]+)/i);
        return {
            etag: etagMatch ? etagMatch[1] : null,
            lastModified: dateMatch ? dateMatch[1] : null
        };
    } catch (e) { return null; }
}

console.log(`Starting Mirror (Disposable Root Mode)...`);
let changesMade = false;

sources.forEach(source => {
    if (source.disabled) return;

    console.log(`\n--- Processing: ${source.name} ---`);
    const targetDir = path.join(PLUGIN_DIR, source.name);
    
    // --- CHECK UPDATE ---
    const remoteInfo = getRemoteInfo(source.url);
    const lockEntry = lockData[source.name];
    
    let isFresh = false;
    if (lockEntry && remoteInfo) {
        if (remoteInfo.etag && remoteInfo.etag === lockEntry.etag) isFresh = true;
        else if (remoteInfo.lastModified && remoteInfo.lastModified === lockEntry.lastModified) isFresh = true;
    }

    if (!isFresh || source.force) {
        console.log(`🔄 Updating source...`);
        const isZip = source.url.toLowerCase().endsWith('.zip');
        const ext = isZip ? '.zip' : '.html';
        const tempFile = `temp_${source.name}${ext}`;

        try {
            execSync(`curl -f -L -S "${source.url}" -o ${tempFile}`, { stdio: 'inherit' });
            
            if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
                if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
                
                if (isZip) {
                    console.log(`📦 Unzipping...`);
                    fs.mkdirSync(targetDir, { recursive: true });
                    execSync(`unzip -q -o ${tempFile} -d ${targetDir}`, { stdio: 'inherit' });
                } else {
                    console.log(`💥 Exploding TiddlyWiki...`);
                    execSync(`npx tiddlywiki --load ${tempFile} --savewikifolder ${targetDir}`, { stdio: 'inherit' });
                }
                
                // Smart Pruning: Clean up the library folder (internal tiddlers)
                if (source.cleanContent) {
                    const tiddlersDir = path.join(targetDir, 'tiddlers');
                    if (fs.existsSync(tiddlersDir)) {
                        console.log('✂️  Pruning library folder...');
                        const keepList = new Set();
                        (source.copy || []).forEach(p => {
                            if (p.startsWith('tiddlers/')) keepList.add(path.normalize(p)); 
                        });

                        const files = fs.readdirSync(tiddlersDir);
                        files.forEach(file => {
                            const relPath = path.join('tiddlers', file);
                            if (!keepList.has(path.normalize(relPath))) {
                                fs.rmSync(path.join(tiddlersDir, file));
                            }
                        });
                    }
                }

                lockData[source.name] = {
                    url: source.url,
                    etag: remoteInfo ? remoteInfo.etag : null,
                    lastModified: remoteInfo ? remoteInfo.lastModified : null,
                    updatedAt: new Date().toISOString()
                };
                changesMade = true;
            }
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch (error) {
            console.error(`❌ FAILED: ${error.message}`);
        }
    } else {
        console.log(`✅ Up to date.`);
    }

    // --- AGGREGATION (Directly into the now-empty wiki/tiddlers) ---
    if (source.copy && Array.isArray(source.copy) && source.copy.length > 0) {
        console.log(`📂 Aggregating ${source.copy.length} files to wiki/tiddlers...`);
        source.copy.forEach(filePath => {
            const srcPath = path.join(targetDir, filePath);
            const safeName = `${source.name}_${path.basename(filePath)}`;
            const destPath = path.join(TIDDLERS_DIR, safeName);

            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
            } else {
                console.warn(`   ⚠️ File not found: ${filePath}`);
            }
        });
    }
});

if (changesMade) {
    console.log(`\n📝 Saving lockfile...`);
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
}
