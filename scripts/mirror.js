/**
 * scripts/mirror.js (Lithic - Disposable Root)
 * * Plugins -> wiki/external
 * * Tiddlers -> wiki/tiddlers (Wiped and rebuilt every run)
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const yaml = require('js-yaml');

// --- CONFIGURATION ---
const CONFIG_FILE = 'external.yml';
const LOCK_FILE = 'external-lock.json'; // Updated for consistency

const EXTERNAL_DIR = path.join('wiki', 'external');
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
if (!fs.existsSync(EXTERNAL_DIR)) fs.mkdirSync(EXTERNAL_DIR, { recursive: true });

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

const logPath = path.join(__dirname, '../wiki/mirror.log');
let logContent = `--- Mirror Log ${new Date().toISOString()} ---\n\n`;

function log(msg) {
    console.log(msg);
    logContent += `${msg}\n`;
}

function errorFromLog(msg) {
    console.error(msg);
    logContent += `[ERROR] ${msg}\n`;
}

log(`Starting Mirror (External Mode)...`);
let changesMade = false;

sources.forEach(source => {
    if (source.type === 'disable') return;

    log(`\n--- Processing: ${source.name} ---`);
    const targetDir = path.join(EXTERNAL_DIR, source.name);

    // --- CHECK UPDATE ---
    const remoteInfo = getRemoteInfo(source.url);
    const lockEntry = lockData[source.name];

    let isFresh = false;
    if (lockEntry && remoteInfo) {
        if (remoteInfo.etag && remoteInfo.etag === lockEntry.etag) isFresh = true;
        else if (remoteInfo.lastModified && remoteInfo.lastModified === lockEntry.lastModified) isFresh = true;
    }

    if (!isFresh || source.force) {
        log(`🔄 Updating source...`);
        const isZip = source.url.toLowerCase().endsWith('.zip');
        const ext = isZip ? '.zip' : '.html';
        const tempFile = `temp_${source.name}${ext}`;

        try {
            execSync(`curl -f -L -S "${source.url}" -o ${tempFile}`, { stdio: 'inherit' });

            if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
                if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });

                let updateSuccess = true;

                if (isZip) {
                    log(`📦 Unzipping...`);
                    // If source.extract is set, we unzip to a temp dir first, then move the specific folder
                    if (source.extract && source.target) {
                        const tempUnzipDir = path.join(EXTERNAL_DIR, `${source.name}_temp_unzip`);
                        if (fs.existsSync(tempUnzipDir)) fs.rmSync(tempUnzipDir, { recursive: true, force: true });
                        fs.mkdirSync(tempUnzipDir, { recursive: true });

                        execSync(`unzip -q -o ${tempFile} -d ${tempUnzipDir}`, { stdio: 'inherit' });

                        const extractSourcePath = path.join(tempUnzipDir, source.extract);
                        const finalTargetPath = path.join(__dirname, '..', source.target); // Resolve relative to script root

                        if (fs.existsSync(extractSourcePath)) {
                            log(`🚚 Moving extracted folder ${source.extract} -> ${source.target}`);
                            if (fs.existsSync(finalTargetPath)) fs.rmSync(finalTargetPath, { recursive: true, force: true });
                            fs.mkdirSync(path.dirname(finalTargetPath), { recursive: true });
                            fs.renameSync(extractSourcePath, finalTargetPath);
                        } else {
                            errorFromLog(`❌ ERROR: Extraction path not found in zip: ${source.extract}`);
                            updateSuccess = false;
                        }

                        // Cleanup temp unzip
                        fs.rmSync(tempUnzipDir, { recursive: true, force: true });

                    } else {
                        // Standard unzip to targetDir
                        fs.mkdirSync(targetDir, { recursive: true });
                        execSync(`unzip -q -o ${tempFile} -d ${targetDir}`, { stdio: 'inherit' });
                    }
                } else {
                    log(`💥 Exploding TiddlyWiki...`);
                    execSync(`npx tiddlywiki --load ${tempFile} --savewikifolder ${targetDir}`, { stdio: 'inherit' });
                }

                // Pruning Logic based on 'type'
                if (updateSuccess) {
                    const tiddlersDir = path.join(targetDir, 'tiddlers');
                    const pluginsDir = path.join(targetDir, 'plugins');
                    const themesDir = path.join(targetDir, 'themes');

                    if (source.type === 'plugins') {
                        // Keep plugins, delete tiddlers and themes
                        log('✂️  Type: plugins -> Removing tiddlers and themes...');
                        if (fs.existsSync(tiddlersDir)) fs.rmSync(tiddlersDir, { recursive: true, force: true });
                        if (fs.existsSync(themesDir)) fs.rmSync(themesDir, { recursive: true, force: true });
                    } else if (source.type === 'themes') {
                        // Keep themes, delete tiddlers and plugins
                        log('✂️  Type: themes -> Removing tiddlers and plugins...');
                        if (fs.existsSync(tiddlersDir)) fs.rmSync(tiddlersDir, { recursive: true, force: true });
                        if (fs.existsSync(pluginsDir)) fs.rmSync(pluginsDir, { recursive: true, force: true });
                    } else if (source.type === 'tiddlers') {
                        // Keep tiddlers, delete plugins and themes
                        log('✂️  Type: tiddlers -> Removing plugins and themes...');
                        if (fs.existsSync(pluginsDir)) fs.rmSync(pluginsDir, { recursive: true, force: true });
                        if (fs.existsSync(themesDir)) fs.rmSync(themesDir, { recursive: true, force: true });
                    } else {
                        log(`✨ Type: ${source.type || 'all'} -> No pruning.`);
                    }
                }

                if (updateSuccess) {
                    lockData[source.name] = {
                        url: source.url,
                        etag: remoteInfo ? remoteInfo.etag : null,
                        lastModified: remoteInfo ? remoteInfo.lastModified : null,
                        updatedAt: new Date().toISOString()
                    };
                    changesMade = true;
                }
            }
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch (error) {
            errorFromLog(`❌ FAILED: ${error.message}`);
        }
    } else {
        log(`✅ Up to date.`);
    }

    // --- AGGREGATION REMOVED (Replaced by direct usage in plugins dir) ---
});

// --- PROCESS LOCAL PLUGINS ---
const LOCAL_PLUGINS_DIR = path.join('wiki', 'local-plugins');
if (fs.existsSync(LOCAL_PLUGINS_DIR)) {
    log(`\n--- Processing Local Plugins from ${LOCAL_PLUGINS_DIR} ---`);
    const localPlugins = fs.readdirSync(LOCAL_PLUGINS_DIR, { withFileTypes: true });

    localPlugins.forEach(dirent => {
        if (dirent.isDirectory()) {
            const pluginName = dirent.name;
            const sourcePath = path.join(LOCAL_PLUGINS_DIR, pluginName);
            const targetPath = path.join(EXTERNAL_DIR, pluginName);

            log(`📂 Copying local plugin: ${pluginName}`);

            try {
                if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
                fs.cpSync(sourcePath, targetPath, { recursive: true });
            } catch (e) {
                errorFromLog(`❌ Failed to copy local plugin ${pluginName}: ${e.message}`);
            }
        }
    });
}

if (changesMade) {
    log(`\n📝 Saving lockfile...`);
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
}

fs.writeFileSync(logPath, logContent);
console.log(`Mirror complete. Log written to ${logPath}`);
