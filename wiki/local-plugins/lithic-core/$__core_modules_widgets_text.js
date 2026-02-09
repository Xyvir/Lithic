/*\
title: $:/core/modules/widgets/text.js
type: application/javascript
module-type: widget

An override of the core text widget that automatically linkifies the text, including Aliases.

\*/

"use strict";

var TITLE_TARGET_FILTER = "$:/config/Freelinks/TargetFilter";

var Widget = require("$:/core/modules/widgets/widget.js").widget,
    LinkWidget = require("$:/core/modules/widgets/link.js").link,
    ButtonWidget = require("$:/core/modules/widgets/button.js").button,
    ElementWidget = require("$:/core/modules/widgets/element.js").element;

var TextNodeWidget = function (parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
};

/*
Inherit from the base widget class
*/
TextNodeWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
TextNodeWidget.prototype.render = function (parent, nextSibling) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.renderChildren(parent, nextSibling);
};

/*
Compute the internal state of the widget
*/
TextNodeWidget.prototype.execute = function () {
    var self = this,
        ignoreCase = self.getVariable("tv-freelinks-ignore-case", { defaultValue: "no" }).trim() === "yes";
    // Get our parameters
    var childParseTree = [{
        type: "plain-text",
        text: this.getAttribute("text", this.parseTreeNode.text || "")
    }];
    // Only process links if not disabled and we're not within a button or link widget
    if (this.getVariable("tv-wikilinks", { defaultValue: "yes" }).trim() !== "no" && this.getVariable("tv-freelinks", { defaultValue: "no" }).trim() === "yes" && !this.isWithinButtonOrLink()) {
        // Get the information about the current tiddler titles, and construct a regexp
        // Modified Cache Key to differentiate from standard Freelinks
        this.tiddlerTitleInfo = this.wiki.getGlobalCache("tiddler-title-info-aliases-" + (ignoreCase ? "insensitive" : "sensitive"), function () {
            var targetFilterText = self.wiki.getTiddlerText(TITLE_TARGET_FILTER),
                // Get valid tiddlers based on filter
                sourceTitles = !!targetFilterText ? self.wiki.filterTiddlers(targetFilterText, $tw.rootWidget) : self.wiki.allTitles();

            // 1. Build a list of candidate objects: { text: "match string", target: "Real Title" }
            var candidates = [];

            $tw.utils.each(sourceTitles, function (title) {
                // Add the title itself
                candidates.push({ text: title, target: title });

                // Check for Aliases field
                var tiddler = self.wiki.getTiddler(title);
                if (tiddler && tiddler.fields.aliases) {
                    // Parse the aliases list (handles spaces/brackets standard TW list format)
                    var aliases = $tw.utils.parseStringArray(tiddler.fields.aliases);
                    if (aliases) {
                        $tw.utils.each(aliases, function (alias) {
                            if (alias) {
                                candidates.push({ text: alias, target: title });
                            }
                        });
                    }
                }
            });

            // 2. Sort candidates by length of the text (Longest first prevents "link" masking "linkage")
            candidates.sort(function (a, b) {
                var lenA = a.text.length,
                    lenB = b.text.length;
                if (lenA !== lenB) {
                    return lenA < lenB ? +1 : -1;
                } else {
                    // Alphabetical sort for same length
                    if (a.text < b.text) return -1;
                    if (a.text > b.text) return +1;
                    return 0;
                }
            });

            // 3. Separate into parallel arrays for the Regex construction
            var titles = [],
                targets = [],
                reparts = [];

            $tw.utils.each(candidates, function (item) {
                if (item.text.substring(0, 3) !== "$:/") {
                    titles.push(item.text);
                    targets.push(item.target);
                    // Create capturing group for this specific candidate
                    reparts.push("(" + $tw.utils.escapeRegExp(item.text) + ")");
                }
            });

            var regexpStr = "\\b(?:" + reparts.join("|") + ")\\b";
            return {
                titles: titles,
                targets: targets, // We now store targets explicitly
                regexp: new RegExp(regexpStr, ignoreCase ? "i" : "")
            };
        });

        // Repeatedly linkify
        if (this.tiddlerTitleInfo.titles.length > 0) {
            var index, text, match, matchEnd;
            do {
                index = childParseTree.length - 1;
                text = childParseTree[index].text;
                match = this.tiddlerTitleInfo.regexp.exec(text);
                if (match) {
                    // Make a text node for any text before the match
                    if (match.index > 0) {
                        childParseTree[index].text = text.substring(0, match.index);
                        index += 1;
                    }

                    // Resolve the target title.
                    // We find which capturing group matched (index 1..n)
                    // And map it to our 0-indexed targets array.
                    var matchIndex = match.indexOf(match[0], 1);
                    var targetTitle = this.tiddlerTitleInfo.targets[matchIndex - 1];

                    // Make a link node for the match
                    childParseTree[index] = {
                        type: "link",
                        attributes: {
                            // Link to the Target, not the matched text
                            to: { type: "string", value: targetTitle },
                            "class": { type: "string", value: "tc-freelink" }
                        },
                        children: [{
                            type: "plain-text", text: match[0]
                        }]
                    };
                    index += 1;
                    // Make a text node for any text after the match
                    matchEnd = match.index + match[0].length;
                    if (matchEnd < text.length) {
                        childParseTree[index] = {
                            type: "plain-text",
                            text: text.substring(matchEnd)
                        };
                    }
                }
            } while (match && childParseTree[childParseTree.length - 1].type === "plain-text");
        }
    }
    // Make the child widgets
    this.makeChildWidgets(childParseTree);
};

TextNodeWidget.prototype.isWithinButtonOrLink = function () {
    var withinButtonOrLink = false,
        widget = this.parentWidget;
    while (!withinButtonOrLink && widget) {
        withinButtonOrLink = widget instanceof ButtonWidget || widget instanceof LinkWidget || ((widget instanceof ElementWidget) && widget.parseTreeNode.tag === "a");
        widget = widget.parentWidget;
    }
    return withinButtonOrLink;
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
TextNodeWidget.prototype.refresh = function (changedTiddlers) {
    var self = this,
        changedAttributes = this.computeAttributes(),
        titlesHaveChanged = false;
    $tw.utils.each(changedTiddlers, function (change, title) {
        if (change.isDeleted) {
            titlesHaveChanged = true;
        } else {
            // We must assume any change could include alias changes, checking strictly is expensive
            // simpler to rely on the standard title check or trigger a refresh if the specific tiddler is involved
            titlesHaveChanged = titlesHaveChanged || !self.tiddlerTitleInfo || self.tiddlerTitleInfo.titles.indexOf(title) !== -1 || self.tiddlerTitleInfo.targets.indexOf(title) !== -1;
        }
    });
    if (changedAttributes.text || titlesHaveChanged) {
        this.refreshSelf();
        return true;
    } else {
        return false;
    }
};

exports.text = TextNodeWidget;
