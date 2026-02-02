/*\
title: $:/plugins/lithic/overtype/widget-streams.js
type: application/javascript
module-type: widget

OverType Editor Widget for TiddlyWiki + Streams + CompText
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var EditTextWidget = require("$:/core/modules/widgets/edit-text.js")["edit-text"];

// 1. Load OverType Library
try {
    require("$:/plugins/lithic/overtype/overtype.js"); 
} catch(e) { console.warn("OverType library failed to load:", e); }

// 2. Load CompText Library
var CompletionLib;
try {
    CompletionLib = require("$:/plugins/snowgoon88/edit-comptext/completion.js");
} catch(e) { console.log("CompText library not found (optional)."); }

var getOverTypeClass = function() {
    var OT = window.OverType;
    if (!OT) return null;
    if (typeof OT.init === "function") return OT;
    if (OT.default && typeof OT.default.init === "function") return OT.default;
    return null;
};

// 3. Highlighter Bridge for Code Blocks
var highlighterBridge = function(code, lang) {
    var highlighter = $tw.utils.getHighlighter ? $tw.utils.getHighlighter() : null;
    if(highlighter && lang) {
        try {
            var result = highlighter.highlight(lang, code);
            if (result && result.value) return result.value;
        } catch(e) {}
    }
    return $tw.utils.htmlEncode(code);
};

var OverTypeWidget = function(parseTreeNode,options) {
    this.initialise(parseTreeNode,options);
};

OverTypeWidget.prototype = new EditTextWidget();

OverTypeWidget.prototype.render = function(parent,nextSibling) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();

    var container = this.document.createElement("div");
    container.style.height = "auto";
    container.style.width = "100%";
    container.style.minHeight = "0px"; 
    container.style.position = "relative"; 
    
    parent.insertBefore(container,nextSibling);
    this.domNodes.push(container);

    var editTitle = this.getAttribute("tiddler",this.getVariable("currentTiddler"));
    var editField = this.getAttribute("field","text");
    var initialText = this.wiki.getTiddlerText(editTitle, "") || "";
    var passedClass = this.getAttribute("class", "");
    var shouldFocus = this.getAttribute("focus") === "yes";
    var attrMinHeight = this.getAttribute("minHeight") || "0px";

    var self = this;
    var OverTypeClass = getOverTypeClass();

    if (OverTypeClass) {
        var instances = OverTypeClass.init(container, {
            value: initialText,
            theme: 'cave', 
            autoResize: true,        
            toolbar: false,          
            showStats: false,        
            fontFamily: "inherit",
            fontSize: "inherit",
            lineHeight: "inherit",
            padding: "8px", 
            codeHighlighter: highlighterBridge,
            autofocus: shouldFocus,
            minHeight: attrMinHeight,
            onChange: function(value) {
                self.saveChanges(value, editTitle, editField);
            }
        });
        
        this.editor = instances[0];

        if (this.editor && this.editor.textarea) {
            var ta = this.editor.textarea;

            if (this.editor.wrapper) {
                this.editor.wrapper.style.setProperty("min-height", attrMinHeight, "important");
            }

            ta.classList.add("tc-edit-texteditor");
            if (passedClass) {
                passedClass.split(" ").forEach(function(c) { if(c) ta.classList.add(c); });
            }

            ta.style.setProperty("background", "transparent", "important");
            ta.style.setProperty("color", "transparent", "important");
            ta.style.setProperty("caret-color", "var(--cursor, #f95738)", "important");
            
            // --- COMPTEXT INTEGRATION ---
            if (CompletionLib && CompletionLib.Completion) {
                var configText = this.wiki.getTiddlerText("$:/plugins/snowgoon88/edit-comptext/config");
                var config = {};
                if (configText) {
                    try { config = JSON.parse(configText); } catch(e) {}
                }

                // FIX: Initialize CompText with document.body as parent 
                // and zero offsets for absolute viewport positioning
                this.completionInstance = new CompletionLib.Completion(
                    this, ta, config, document.body, 0, 0
                );
            }
        }

    } else {
        container.innerHTML = "Error: OverType library not found.";
    }
    
    this.editTitle = editTitle;
    this.editField = editField;
};

OverTypeWidget.prototype.saveChanges = function(text, title, field) {
    this.wiki.setText(title, field, null, text);
};

OverTypeWidget.prototype.refresh = function(changedTiddlers) {
    if(changedTiddlers[this.editTitle]) {
        var newText = this.wiki.getTiddlerText(this.editTitle);
        if(this.editor && this.editor.getValue() !== newText) {
             this.editor.setValue(newText);
        }
    }
    return false;
};

exports["overtype-streams-editor"] = OverTypeWidget;

})();