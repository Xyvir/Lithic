/*\
title: $:/plugins/D&DTools/d20.js/roll.js
type: application/javascript
module-type: widget

Text node widget

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var d20 = require("$:/plugins/D&DTools/d20.js/d20.js");

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var RollWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
RollWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
RollWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();

	this.expression = this.document.createElement("div");
	this.renderChildren(this.expression);
	
	var text = "";
	try {
		switch (this.output) {
			case "combo":
				text = d20.comboRoll(this.expression.textContent.trim());
				break;
			case "verbose":
				text = d20.verboseRoll(this.expression.textContent.trim());
				break;
			default:
				text = d20.roll(this.expression.textContent.trim());
		}
		
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
RollWidget.prototype.execute = function() {
	this.silence = this.getAttribute("silence",false);
	this.output = this.getAttribute("format",false);
	var diceroll = {
		type: "element",
		tag: "div",
		children: this.parseTreeNode.children
	};
	this.makeChildWidgets([diceroll]);
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
RollWidget.prototype.refresh = function(changedTiddlers) {
	if(this.refreshChildren(changedTiddlers)) {
		this.refreshSelf();
		return true;
	}
	return false;
};

exports.diceroll = RollWidget;

})();
