/*\
title: $:/core/modules/widgets/link-dragover-extend.js
type: application/javascript
module-type: widget

Extend the link widget to allow click when there is a drag over (option)

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var LinkWidget = require("$:/core/modules/widgets/link.js")["link"];
LinkWidget.prototype.bjDragExtend ={};
LinkWidget.prototype.bjDragExtend.renderLink = LinkWidget.prototype.renderLink;

LinkWidget.prototype.renderLink = function (parent,nextSibling) {
	LinkWidget.prototype.bjDragExtend.renderLink.call(this,parent,nextSibling);
	if (this.dragoverclick==="yes") { 
		$tw.utils.addEventListeners(this.domNodes[0],[
			{name: "dragover", handlerObject: this, handlerMethod: "handleDragOverEvent"}
		]);
	}
}

/*
add option
*/
LinkWidget.prototype.bjDragExtend.execute = LinkWidget.prototype.execute;
LinkWidget.prototype.execute = function() {
	LinkWidget.prototype.bjDragExtend.execute.call(this);
	this.dragoverclick=this.getAttribute("dragoverclic","no");
};
/*
handle dragover
*/
LinkWidget.prototype.handleDragOverEvent  = function(event) {
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
