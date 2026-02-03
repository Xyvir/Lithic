/*\
title: $:/plugins/mklauber/aliases/link.js
type: application/javascript
module-type: widget-subclass

Widget base class

\*/
(function(){

	/*jslint node: true, browser: true */
	/*global $tw: false */
	"use strict";

	exports.baseClass = "link";

	exports.constructor = function(parseTreeNode,options) {
		this.initialise(parseTreeNode,options);
	};

	exports.prototype = {};

	exports.prototype.dispatchEvent = function(event) {
		// Add the followAliases flag to the event.
		event['followAliases'] = this.followAliases;

		Object.getPrototypeOf(Object.getPrototypeOf(this)).dispatchEvent.call(this, event);
	};

	exports.prototype.execute = function() {
		// Call the base class handleChangeEvent function
		Object.getPrototypeOf(Object.getPrototypeOf(this)).execute.call(this);

		this.followAliases = this.getAttribute("followAliases", "true");
		this.isMissing = !this.wiki.tiddlerExists(this.to) && !(this.wiki.filterTiddlers("[title["+this.to+"]listed[aliases]]").length === 1);
	};

})();
