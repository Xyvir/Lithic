const fs = require('fs');
const path = require('path');

const EXTERNAL_PLUGINS_DIR = path.join(__dirname, '../wiki/plugins/external');
const TARGET_PLUGINS_DIR = path.join(__dirname, '../wiki/plugins');

if (!fs.existsSync(EXTERNAL_PLUGINS_DIR)) {
    console.error(`External plugins directory not found: ${EXTERNAL_PLUGINS_DIR}`);
    process.exit(1);
}

if (!fs.existsSync(TARGET_PLUGINS_DIR)) {
    fs.mkdirSync(TARGET_PLUGINS_DIR, { recursive: true });
}

function findPluginInfoFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findPluginInfoFiles(filePath, fileList);
        } else if (file === 'plugin.info') {
            fileList.push(filePath);
        }
    }
    return fileList;
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

console.log('Scanning for external plugins...');
const pluginInfos = findPluginInfoFiles(EXTERNAL_PLUGINS_DIR);

console.log(`Found ${pluginInfos.length} plugin.info files.`);

pluginInfos.forEach(infoPath => {
    try {
        const content = fs.readFileSync(infoPath, 'utf8');
        const pluginInfo = JSON.parse(content);
        
        if (!pluginInfo.title || !pluginInfo.title.startsWith('$:/plugins/')) {
            console.warn(`Skipping ${infoPath}: Invalid 'title' property in plugin.info`);
            return;
        }

        // Extract publisher/plugin-name from title: $:/plugins/publisher/name
        const parts = pluginInfo.title.split('/');
        if (parts.length < 4) {
             console.warn(`Skipping ${infoPath}: Title structure too short (${pluginInfo.title})`);
             return;
        }
        
        const publisher = parts[2];
        const pluginName = parts[3]; // Can be 'name/subname' ? Usually just name. 
        // Actually, some plugins might be $:/plugins/org/repo/sub. 
        // But standard is $:/plugins/author/name.
        // Let's assume standard 4 parts for now, or use slice(2).join('/') for deeper?
        // Let's stick to standard folder structure map: wiki/plugins/PUBLISHER/NAME
        
        const relativePath = parts.slice(2).join('/');
        const targetPath = path.join(TARGET_PLUGINS_DIR, relativePath);
        const sourceDir = path.dirname(infoPath);
        
        console.log(`Copying ${pluginInfo.title} -> ${targetPath}`);
        
        copyRecursiveSync(sourceDir, targetPath);
        
    } catch (e) {
        console.error(`Error processing ${infoPath}:`, e.message);
    }
});

console.log('Plugin flattening complete.');
