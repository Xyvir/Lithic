/*\
title: $:/plugins/ahanniga/context-menu/ContextListener.js
type: application/javascript
module-type: widget

This widgets implements context menus to tiddlers - Patched by Jane to support param-filter
\*/

(function () {

    var sanitize = function (string) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            "/": '&#x2F;',
        };
        const reg = /[&<>"'/]/ig;
        return string.replace(reg, (match) => (map[match]));
    };

    var htmlToElement = function (html) {
        var template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    }

    var parseParameters = function (src) {
        let paramMatcher = /\\parameters\s*\((.*?)\)/;
        let paramMatch = src.match(paramMatcher);
        let parameters = {};
        if (paramMatch && paramMatch.length > 1) {
            paramMatch[1].split(",").forEach(pair => {
                let [key, value] = pair.split(":");
                if (key && value) {
                    parameters[key.trim()] = value.replace(/["']/g, "").trim();
                }
            });

            // Remove the \parameters block from the src
            src = src.replace(paramMatcher, '').trim();
        }

        Object.keys(parameters).forEach(param => {
            let re = new RegExp("<<" + param + ">>", "g");
            src = src.replace(re, parameters[param]);
        });

        return src;
    }

    var Widget = require("$:/core/modules/widgets/widget.js").widget;
    var template = `<div id="contextMenu" class="context-menu" style="display: none; z-order: 9999;"></div>`;

    var ContextListener = function (parseTreeNode, options) {
        this.initialise(parseTreeNode, options);
    };

    ContextListener.prototype = new Widget();

    ContextListener.prototype.render = function (parent, nextSibling) {
        this.parentDomNode = parent;
        var self = this;
        parent.addEventListener("contextmenu", function (event) { self.contextmenu.call(self, event) });
        document.onclick = this.hideMenu;
    };

    ContextListener.prototype.contextmenu = function (event) {
        var self = this;
        var menu = document.getElementById("contextMenu");

        if (getSelection().toString().trim().length > 0) {
            // User has selected text, so don't trigger this menu
            return true;
        }

        if (menu == null) {
            this.document.body.appendChild(htmlToElement(template));
            menu = document.getElementById("contextMenu");
            menu.addEventListener("click", function (event) { self.menuClicked.call(self, event) });
        }
        menu.innerHTML = "";

        var menuHtml = ["<ul>"];
        var titles = $tw.wiki.getTiddlersWithTag("$:/tags/tiddlercontextmenu");
        var label, action, icon, tid, targ, text, separator, paramFilter, customParam;

        // Check if we can find a closer tiddler title (e.g. Streams node)
        var closestTiddler = event.target.closest("[data-tiddler-title]");
        if (closestTiddler) {
            targ = closestTiddler.getAttribute("data-tiddler-title");
        } else {
            targ = event.currentTarget.getAttribute("data-tiddler-title");
        }

        for (var a = 0; a < titles.length; a++) {
            tid = $tw.wiki.getTiddler(titles[a]);
            text = sanitize(tid.getFieldString("text", "hide"));

            if (text !== "show") {
                continue;
            }

            label = sanitize(tid.getFieldString("caption", "Unlabelled Option"));
            action = sanitize(tid.getFieldString("tm-message", "tm-dummy"));
            icon = $tw.wiki.getTiddlerText(tid.getFieldString("icon", "$:/core/images/blank"));
            if (icon) {
                icon = parseParameters(icon);
            } else {
                icon = "";
            }
            separator = tid.fields["separate-after"] === undefined ? "" : "menu-separator";

            // --- PATCH START ---
            // Check for param-filter and pre-calculate the text to copy
            paramFilter = tid.getFieldString("param-filter");
            customParam = "";
            if (paramFilter) {
                var iterator = function (callback) {
                    callback(targ, $tw.wiki.getTiddler(targ));
                };
                var results = $tw.wiki.filterTiddlers(paramFilter, null, iterator);
                if (results.length > 0) {
                    customParam = sanitize(results[0]);
                }
            }
            // --- PATCH END ---

            menuHtml.push(`<li class="${separator}"><a action="${action}" targ="${targ}" data-custom-param="${customParam}" href="#!">${icon} ${label}</a></li>`);
        }

        menuHtml.push("</ul>");
        menu.append(htmlToElement(menuHtml.join("")))

        if (menu.style.display == "block") {
            this.hideMenu();
        } else {
            menu.style.display = 'block';
            menu.style.left = event.pageX + "px";
            menu.style.top = event.pageY + "px";
        }

        event.preventDefault();
        return false;
    };

    ContextListener.prototype.menuClicked = function (event) {
        var action = event.target.getAttribute("action");
        var targ = event.target.getAttribute("targ");
        // Retrieve our custom param
        var customParam = event.target.getAttribute("data-custom-param");

        var tid, stid, state, text, ptid;
        this.hideMenu();

        switch (action) {
            case "tm-fold-tiddler":
                stid = `$:/state/folded/${targ}`;
                state = $tw.wiki.getTiddlerText(stid, "show") === "show" ? "hide" : "show";
                $tw.wiki.setText(stid, "text", null, state);
                break;
            case "tm-copy-to-clipboard":
                // --- PATCH START ---
                // If we have a custom param, use it. Otherwise default to body text.
                if (customParam && customParam !== "") {
                    text = customParam;
                } else {
                    text = $tw.wiki.getTiddlerText(targ);
                }
                // --- PATCH END ---
                this.dispatchEvent({ type: action, param: text });
                break;
            case "tm-print":
                this.dispatchEvent({ type: action, event: event });
                break;
            case "tm-unfold-all-tiddlers":
                this.dispatchEvent({ type: action, param: targ, foldedStatePrefix: "$:/state/folded/" });
                break;
            case "sp-print-river":
                var curEntries = [];
                ptid = $tw.wiki.getTiddler("$:/PrintList");
                if (ptid !== undefined) {
                    var list = ptid.getFieldList("list");
                    if (Array.isArray(list) && list.indexOf(targ) < 0) {
                        for (a = 0; a < list.length; a++) {
                            curEntries.push(list[a]);
                        }
                    }
                }
                curEntries.push(targ);
                $tw.wiki.setText("$:/PrintList", "list", 0, curEntries);
                $tw.rootWidget.dispatchEvent({ type: 'tm-open-window', param: '$:/plugins/BTC/PrintRiver/ui/Templates/PrintRiver' });
                break;
            case "tm-new-here":
                this.dispatchEvent({ type: "tm-new-tiddler", paramObject: { tags: targ } });
                break;
            default:
                this.dispatchEvent({ type: action, param: targ });
        }

        event.preventDefault();
        return false;
    };

    ContextListener.prototype.refresh = function (changedTiddlers) {
        return false;
    };

    ContextListener.prototype.hideMenu = function () {
        var menu = document.getElementById("contextMenu");
        if (menu != null) {
            menu.style.display = "none";
        }
    };

    exports.contextMenu = ContextListener;

})();
