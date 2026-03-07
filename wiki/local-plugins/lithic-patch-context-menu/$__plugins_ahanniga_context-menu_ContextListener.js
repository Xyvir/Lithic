/*\
title: $:/plugins/ahanniga/context-menu/ContextListener.js
type: application/javascript
module-type: widget

This widgets implements context menus to tiddlers
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

            src = src.replace(paramMatcher, '').trim();
        }

        Object.keys(parameters).forEach(param => {
            let re = new RegExp("<<" + param + ">>", "g");
            src = src.replace(re, parameters[param]);
        });

        return src;
    }

    var Widget = require("$:/core/modules/widgets/widget.js").widget;
    var template = `<div id="contextMenu" class="context-menu" style="display: none; z-index: 10000;"></div>`;

    var ContextListener = function (parseTreeNode, options) {
        this.initialise(parseTreeNode, options);
    };

    ContextListener.prototype = new Widget();

    ContextListener.prototype.render = function (parent, nextSibling) {
        this.parentDomNode = parent;
        var self = this;
        document.addEventListener("contextmenu", function (event) { self.contextmenu.call(self, event) });
        document.onclick = this.hideMenu;
    };

    ContextListener.prototype.contextmenu = function (event) {
        var self = this;
        var menu = document.getElementById("contextMenu");

        if (getSelection().toString().trim().length > 0) {
            return true;
        }

        if (event.target && event.target.closest && event.target.closest(".unieditor__textarea")) {
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

        var closestTiddler = event.target.closest("[data-tiddler-title], [data-node-title]");

        var link = event.target.closest(".tc-tiddlylink");
        if (link) {
            var title = link.getAttribute("data-tiddler-title");
            if (!title && link.hasAttribute("href")) {
                var href = link.getAttribute("href");
                if (href.startsWith("#")) {
                    title = decodeURIComponent(href.substring(1));
                }
            }
            if (title) {
                targ = title;
            }
        }

        if (!targ) {
            if (closestTiddler) {
                targ = closestTiddler.getAttribute("data-node-title") || closestTiddler.getAttribute("data-tiddler-title");
            }
        }

        if (!targ) {
            return true;
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
            paramFilter = tid.getFieldString("param-filter");
            customParam = "";
            if (paramFilter) {
                var resolvedFilter = paramFilter.replace(/<currentTiddler>/g, "[" + targ + "]");

                var iterator = function (callback) {
                    callback($tw.wiki.getTiddler(targ), targ);
                };

                var results = $tw.wiki.filterTiddlers(resolvedFilter, null, iterator);
                if (results.length > 0) {
                    customParam = sanitize(results.join('\n'));
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
            menu.style.left = event.clientX + "px";
            menu.style.top = event.clientY + "px";
        }

        event.preventDefault();
        return false;
    };

    ContextListener.prototype.menuClicked = function (event) {
        var targetStart = event.target;
        var targetAction = targetStart.closest("[action]");

        if (!targetAction) {
            return false;
        }

        var action = targetAction.getAttribute("action");
        var targ = targetAction.getAttribute("targ");
        var customParam = targetAction.getAttribute("data-custom-param");

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
            case "lithic-copy-share-url":
                var filter = "[[" + targ + "]] [[" + targ + "]get-stream-nodes[]]";
                var tiddlerTitles = $tw.wiki.filterTiddlers(filter);
                var exportData = [];
                for (var t = 0; t < tiddlerTitles.length; t++) {
                    var tidObj = $tw.wiki.getTiddler(tiddlerTitles[t]);
                    if (tidObj) {
                        if (t === 0) {
                            var newTags = (tidObj.fields.tags || []).slice();
                            if (newTags.indexOf("$:/tags/PayloadURL") < 0) {
                                newTags.push("$:/tags/PayloadURL");
                            }
                            tidObj = new $tw.Tiddler(tidObj, { tags: newTags });
                        }
                        var fields = {};
                        for (var field in tidObj.fields) {
                            fields[field] = tidObj.getFieldString(field);
                        }
                        exportData.push(fields);
                    }
                }
                var jsonPayload = JSON.stringify(exportData);
                var encodedPayload = btoa(unescape(encodeURIComponent(jsonPayload)));
                var shareUrl = "https://lithic.uk/?json=" + encodedPayload;

                // --- RICH CLIPBOARD IMPLEMENTATION START ---
                var linkText = targ + " on Lithic.uk";
                var htmlContent = '<a href="' + shareUrl + '">' + linkText + '</a>';
                var plainContent = shareUrl;
                var widgetNode = this;

                var executeLegacyCopy = function () {
                    var success = false;
                    var copyHandler = function (e) {
                        e.preventDefault();
                        if (e.clipboardData) {
                            e.clipboardData.setData('text/html', htmlContent);
                            e.clipboardData.setData('text/plain', plainContent);
                            success = true;
                        }
                    };

                    document.addEventListener('copy', copyHandler);
                    try {
                        var tempSpan = document.createElement("span");
                        tempSpan.textContent = plainContent;
                        // Keep hidden from view but selectable by the browser
                        tempSpan.style.position = "fixed";
                        tempSpan.style.left = "-9999px";
                        tempSpan.style.top = "0";
                        document.body.appendChild(tempSpan);

                        var selection = window.getSelection();
                        if (selection) {
                            var range = document.createRange();
                            range.selectNodeContents(tempSpan);
                            selection.removeAllRanges();
                            selection.addRange(range);

                            document.execCommand('copy');
                            selection.removeAllRanges();
                        }
                        document.body.removeChild(tempSpan);
                    } catch (e) {
                        console.error("Lithic Legacy Copy Failed:", e);
                    } finally {
                        document.removeEventListener('copy', copyHandler);
                    }
                    return success;
                };

                var isAndroid = /Android/i.test(navigator.userAgent);

                // Bypass Async API on Android due to text/html stripping bug
                if (!isAndroid && navigator.clipboard && window.ClipboardItem) {
                    try {
                        var htmlBlob = new Blob([htmlContent], { type: "text/html" });
                        var plainBlob = new Blob([plainContent], { type: "text/plain" });
                        var item = new ClipboardItem({
                            "text/html": htmlBlob,
                            "text/plain": plainBlob
                        });

                        navigator.clipboard.write([item]).then(function () {
                            widgetNode.dispatchEvent({ type: "tm-notify", param: "$:/core/ui/Notifications/CopiedToClipboard" });
                        }).catch(function (err) {
                            if (executeLegacyCopy()) {
                                widgetNode.dispatchEvent({ type: "tm-notify", param: "$:/core/ui/Notifications/CopiedToClipboard" });
                            } else {
                                widgetNode.dispatchEvent({ type: "tm-copy-to-clipboard", param: plainContent });
                            }
                        });
                    } catch (err) {
                        if (executeLegacyCopy()) {
                            widgetNode.dispatchEvent({ type: "tm-notify", param: "$:/core/ui/Notifications/CopiedToClipboard" });
                        } else {
                            widgetNode.dispatchEvent({ type: "tm-copy-to-clipboard", param: plainContent });
                        }
                    }
                } else {
                    if (executeLegacyCopy()) {
                        widgetNode.dispatchEvent({ type: "tm-notify", param: "$:/core/ui/Notifications/CopiedToClipboard" });
                    } else {
                        widgetNode.dispatchEvent({ type: "tm-copy-to-clipboard", param: plainContent });
                    }
                }
                // --- RICH CLIPBOARD IMPLEMENTATION END ---
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