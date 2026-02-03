/*\
title: $:/plugins/mklauber/math.js/calc.js
type: application/javascript
module-type: widget

Text node widget

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var math = require("$:/plugins/mklauber/math.js/math.js");

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var CalcWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
CalcWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
CalcWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();

	this.expression = this.document.createElement("div");
	this.renderChildren(this.expression);
	
	var text = "";
	try {
		text = math.eval(this.expression.textContent.trim());
	} catch(err) {
		if(!this.silence){
			text = "Unable to parse '" + this.expression.textContent + "'";
		}
	}
	var textNode = this.document.createTextNode(text);
	parent.insertBefore(textNode,nextSibling);
	this.domNodes.push(textNode);
};

/*
Compute the internal state of the widget
*/
CalcWidget.prototype.execute = function() {
	this.silence = this.getAttribute("silence",false);
	var calc = {
		type: "element",
		tag: "div",
		children: this.parseTreeNode.children
	};
	this.makeChildWidgets([calc]);
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
CalcWidget.prototype.refresh = function(changedTiddlers) {
	if(this.refreshChildren(changedTiddlers)) {
		this.refreshSelf();
		return true;
	}
	return false;
};

exports.calc = CalcWidget;

})();
