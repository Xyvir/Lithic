/*\
title: $:/core/modules/widgets/button-dragover-extend.js
type: application/javascript
module-type: widget

Extend the link widget to allow click when there is a drag over (option)

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var ButtonWidget = require("$:/core/modules/widgets/button.js")["button"];
ButtonWidget.prototype.bjDragExtend ={};
ButtonWidget.prototype.bjDragExtend.render = ButtonWidget.prototype.render;

ButtonWidget.prototype.render = function (parent,nextSibling) {
	ButtonWidget.prototype.bjDragExtend.render.call(this,parent,nextSibling);
	if (this.dragoverclick==="yes") { 
		$tw.utils.addEventListeners(this.domNodes[0],[
			{name: "dragover", handlerObject: this, handlerMethod: "handleDragOverEvent"}
		]);
	}
}

/*
add option
*/
ButtonWidget.prototype.bjDragExtend.execute = ButtonWidget.prototype.execute;
ButtonWidget.prototype.execute = function() {
	ButtonWidget.prototype.bjDragExtend.execute.call(this);
	this.dragoverclick=this.getAttribute("dragoverclick","no");
};
/*
handle dragover
*/
ButtonWidget.prototype.handleDragOverEvent  = function(event) {
	// Tell the browser that we're still interested in the drop
	event.preventDefault();
	// Send the drag as click  as a navigate event
	var bounds = this.domNodes[0].getBoundingClientRect();
	this.dispatchEvent({
		type: "tm-navigate",
		navigateTo: this.to,
		navigateFromTitle: this.getVariable("storyTiddler"),
		navigateFromNode: this,
		navigateFromClientRect: { top: bounds.top, left: bounds.left, width: bounds.width, right: bounds.right, bottom: bounds.bottom, height: bounds.height
		},
		navigateSuppressNavigation: event.metaKey || event.ctrlKey
	});
	event.preventDefault();
	event.stopPropagation();
	return false;
};
})();
