/*\
title: $:/plugins/wikilabs/bundler/import-image.js
type: application/javascript
module-type: upgrader

This module checks if imported tiddlers are named "image.png". 
If so, they are renamed according to the hardcoded template.

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Define sane defaults directly here
var DEFAULT_IMPORT_TITLE = "image.png",
    NEW_TITLE_TEMPLATE = "image_YYYY-0MM-0DD_0hh:0mm:0XXX.png";

exports.upgrade = function (wiki, titles, tiddlers) {
    // We removed the ENABLE check, so this now runs automatically.

    var self = this,
        messages = {};

    $tw.utils.each(titles, function (title) {
        var tiddler = {};

        // Check if the imported title matches our default (e.g. "image.png")
        if (title === DEFAULT_IMPORT_TITLE) {
            messages[title] = "auto-renamed";

            // Generate the new title using the template
            var newTitle = $tw.utils.formatDateString(new Date(), NEW_TITLE_TEMPLATE);

            // Create the new tiddler with the renamed title
            tiddler = new $tw.Tiddler(tiddlers[title], { "title": newTitle });
            tiddlers[tiddler.fields.title] = tiddler.fields;

            // Remove the original "image.png" tiddler from the import list
            tiddlers[title] = Object.create(null);
        }
    });
    return messages;
}