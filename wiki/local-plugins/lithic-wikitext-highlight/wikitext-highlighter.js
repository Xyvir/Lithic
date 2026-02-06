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
                    // 1. BLOCK MACROS <<<...>>>
                    {
                        className: 'function',
                        begin: /<<<+/, end: />>>+/
                    },

                    // 2. WIDGETS <$...> 
                    // We treat these as tags, and crucially, we allow strings inside them
                    {
                        className: 'tag',
                        begin: /<\$/, end: />/,
                        contains: [
                            hljs.QUOTE_STRING_MODE
                        ]
                    },

                    // 3. INLINE MACROS <<...>>
                    {
                        className: 'function',
                        begin: /<<+/, end: />>+/
                    },

                    // 4. FORMATTING
                    // Bold ''...''
                    {
                        className: 'strong',
                        begin: /''/, end: /''/
                    },
                    // Italic //...// (Added this as it was missing)
                    {
                        className: 'emphasis',
                        begin: /\/\//, end: /\/\//
                    },

                    // 5. WIKI LINKS [[...]]
                    {
                        className: 'link',
                        begin: /\[\[/, end: /\]\]/
                    },

                    // 6. TEMPLATES {{...}}
                    {
                        className: 'symbol',
                        begin: /\{\{/, end: /\}\}/
                    },

                    // 7. HEADERS =
                    {
                        className: 'section',
                        begin: /^=+/, end: /=+$/
                    },

                    // 8. GENERIC BRACKETS
                    {
                        className: 'meta',
                        begin: /[\[\]]/
                    },

                    // 9. STANDARD STRINGS
                    hljs.QUOTE_STRING_MODE
                ]
            };
        });
    };

})();