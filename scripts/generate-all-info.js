const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const WIKI_DIR = path.join(ROOT_DIR, 'wiki');
const OUTPUT_FILE = path.join(ROOT_DIR, 'all-tiddlywiki.info');

function findPluginInfos(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            findPluginInfos(filePath, fileList);
        } else if (file === 'plugin.info') {
            fileList.push(filePath);
        }
    });

    return fileList;
}

function extractPluginName(infoPath) {
    try {
        const content = fs.readFileSync(infoPath, 'utf8');
        const info = JSON.parse(content);
        // Standard titles: $:/plugins/publisher/name or $:/themes/publisher/name
        // We want: publisher/name
        if (info.title) {
            const parts = info.title.split('/');
            // Removing "$:", "plugins" (or "themes")
            // $:/plugins/foo/bar -> parts: ["$:", "plugins", "foo", "bar"] -> split slice 2
            if (parts.length >= 4 && (parts[1] === 'plugins' || parts[1] === 'themes')) {
                return parts.slice(2).join('/');
            }
            // Fallback for non-standard but valid titles?
            // If it's just a raw title like "foo/bar" maybe use it?
            return info.title;
        }
    } catch (e) {
        console.warn(`Failed to parse ${infoPath}: ${e.message}`);
    }
    return null;
}

function main() {
    console.log('Generating dynamic all-tiddlywiki.info...');

    const pluginsDir = path.join(WIKI_DIR, 'plugins');
    const themesDir = path.join(WIKI_DIR, 'themes');
    const tiddlersDir = path.join(WIKI_DIR, 'tiddlers');

    const pluginFiles = findPluginInfos(pluginsDir);
    const themeFiles = findPluginInfos(themesDir);
    const tiddlerPluginFiles = findPluginInfos(tiddlersDir);

    const foundPlugins = new Set();
    const foundThemes = new Set();

    pluginFiles.forEach(file => {
        const name = extractPluginName(file);
        if (name) {
            // Check if it's a theme by path or naming convention, usually "themes/" prefix in logic 
            // but TiddlyWiki distinguishes in tiddlywiki.info "plugins" vs "themes".
            // The file path tells us definitively if it's in wiki/plugins or wiki/themes.
            if (file.startsWith(themesDir)) {
                foundThemes.add(name); // Should ideally be handled by finding it in themes dir
            } else {
                foundPlugins.add(name);
            }
        }
    });

    themeFiles.forEach(file => {
        const name = extractPluginName(file);
        if (name) foundThemes.add(name);
    });

    tiddlerPluginFiles.forEach(file => {
        const name = extractPluginName(file);
        if (name) foundPlugins.add(name);
    });

    // Generate the config object
    const config = {
        description: "Lithic (All - Dynamically Generated)",
        plugins: Array.from(foundPlugins).sort(),
        themes: Array.from(foundThemes).sort(),
        build: {
            index: [
                "--render", "$:/core/save/all", "index.html", "text/plain"
            ]
        }
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(config, null, 4));
    console.log(`Generated all-tiddlywiki.info with ${config.plugins.length} plugins and ${config.themes.length} themes.`);
}

main();
