/*\
title: $:/lithic/widgets/transclude.js
type: application/javascript
module-type: widget

Override the core transclude widget to support stream-list

\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    var TranscludeWidget = require("$:/core/modules/widgets/transclude.js").transclude;

    var LithicTranscludeWidget = function (parseTreeNode, options) {
        TranscludeWidget.call(this, parseTreeNode, options);
    };

    LithicTranscludeWidget.prototype = Object.create(TranscludeWidget.prototype);
    LithicTranscludeWidget.prototype.constructor = LithicTranscludeWidget;

    LithicTranscludeWidget.prototype.render = function (parent, nextSibling) {
        this.parentDomNode = parent;
        this.computeAttributes();
        this.execute();

        var tiddler = this.wiki.getTiddler(this.transcludeTitle);

        // Check if we are transcluding the whole tiddler (no field/index specified)
        // and if the tiddler has 'stream-list'
        if (this.transcludeTitle && !this.transcludeField && !this.transcludeIndex &&
            tiddler && tiddler.fields["stream-list"]) {

            // Construct the embed-stream macro call using triple quotes to handle potential quotes in title
            var text = '<<embed-stream """' + this.transcludeTitle + '""">>';

            var parser = this.wiki.parseText("text/vnd.tiddlywiki", text, { parseAsInline: false });

            // We must become the parent of these new widgets
            this.makeChildWidgets(parser.tree);
            this.renderChildren(parent, nextSibling);
            return;
        }

        // Fallback to core behavior
        TranscludeWidget.prototype.render.call(this, parent, nextSibling);
    };

    exports.transclude = LithicTranscludeWidget;

})();
