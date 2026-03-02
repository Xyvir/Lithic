/*\
title: $:/lithic/filters/stream-indent.js
type: application/javascript
module-type: filteroperator
description: Returns 4 spaces of indentation for each level of depth of a stream node from a given root node

\*/
(function () {

    "use strict";

    exports["stream-indent"] = function (source, operator, options) {
        var results = [];
        var rootTitle = operator.operand || "";

        var rootNode = options.wiki.getTiddler(rootTitle);
        var rootIsBlank = (!rootNode || !rootNode.fields.text || rootNode.fields.text.trim() === "");

        source(function (tiddler, title) {
            var depth = 0;
            var current = title;
            // Traverse parents until we hit the root node or a node with no parent
            while (current && current !== rootTitle) {
                var node = options.wiki.getTiddler(current);
                if (!node || !node.fields.parent) break;
                current = node.fields.parent;
                depth++;
                if (depth > 50) break; // safeguard against circular references
            }

            if (rootIsBlank) {
                depth = Math.max(0, depth - 1);
            }
            var indent = "";
            for (var i = 0; i < depth; i++) {
                indent += "    "; // 4 spaces per depth
            }
            results.push(indent);
        });
        return results;
    };

})();
