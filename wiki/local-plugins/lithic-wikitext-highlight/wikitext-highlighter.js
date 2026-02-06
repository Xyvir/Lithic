/*\
title: $:/plugins/xyvir/lithic-wikitext-highlight/wikitext-highlighter.js
type: application/javascript
module-type: startup

Starts up the wikitext highlighter
\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    exports.name = "wikitext-highlighter";
    exports.platforms = ["browser"];
    exports.after = ["startup"];
    exports.synchronous = true;

    exports.startup = function () {
        if ($tw.browser && !window.hljs) {
            try {
                window.hljs = require("$:/plugins/tiddlywiki/highlight/highlight.js");
            } catch (e) {
                // highlight.js not found
                return;
            }
        }

        var hljs = window.hljs || require("$:/plugins/tiddlywiki/highlight/highlight.js");

        if (!hljs) return;

        hljs.registerLanguage('tw', function (hljs) {
            return {
                name: 'Wikitext',
                aliases: ['wikitext'],
                contains: [
                    // 1. MACROS
                    // Includes <<<...>>>, <<...>>, and the new <$...>
                    {
                        className: 'function',
                        variants: [
                            { begin: /<<<+/, end: />>>+/ },
                            { begin: /<<+/, end: />>+/ },
                            // Updated: Only matches if it starts with <$
                            { begin: /<\$/, end: />/ }
                        ]
                    },

                    // 2. Formatting: Bold/Italic '' and '''
                    {
                        className: 'strong',
                        begin: /'{2,3}/, end: /'{2,3}/
                    },

                    // 3. Wiki Links [[ ... ]]
                    {
                        className: 'link',
                        begin: /\[\[/, end: /\]\]/
                    },

                    // 4. Templates {{ ... }}
                    {
                        className: 'symbol',
                        begin: /\{\{/, end: /\}\}/
                    },

                    // 5. Headers =
                    {
                        className: 'section',
                        begin: /^=+/, end: /=+$/
                    },

                    // 6. Generic single brackets [ ... ]
                    {
                        className: 'meta',
                        begin: /[\[\]]/
                    },

                    // 7. Standard Strings
                    hljs.QUOTE_STRING_MODE
                ]
            };
        });

        // In recent highlight.js versions, initHighlighting is deprecated/removed in favor of highlightAll
        // But TiddlyWiki's highlight plugin might handle the triggering. 
        // We just need to register the language.
        // hljs.initHighlighting(); 
    };

})();
