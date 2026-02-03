/*\
title: $:/plugins/mklauber/aliases/navigator.js
type: application/javascript
module-type: widget-subclass

Widget base class

\*/
(function(){

	/*jslint node: true, browser: true */
	/*global $tw: false */
	"use strict";

	exports.baseClass = "navigator";

	exports.constructor = function(parseTreeNode,options) {
		this.initialise(parseTreeNode,options);
	};

	exports.prototype = {};

	exports.prototype.handleNavigateEvent = function(event) {
		event = $tw.hooks.invokeHook("th-navigating",event);
		if(event.navigateTo) {
			if (!this.wiki.tiddlerExists(event.navigateTo) && event.followAliases == "true") {
				var aliases = this.wiki.filterTiddlers("[title["+event.navigateTo+"]listed[aliases]]")
				if (aliases.length === 1) {
					event.navigateTo = aliases[0];
				}
			}
			this.addToStory(event.navigateTo,event.navigateFromTitle);
			if(!event.navigateSuppressNavigation) {
				this.addToHistory(event.navigateTo,event.navigateFromClientRect);
			}
		}
		return false;
	};

})();
