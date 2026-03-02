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
            var indent = "";
            for (var i = 0; i < depth; i++) {
                indent += "    "; // 4 spaces per depth
            }
            results.push(indent);
        });
        return results;
    };

})();
