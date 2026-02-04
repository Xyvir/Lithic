/*\
title: $:/core/modules/widgets/dropzone-extend.js
type: application/javascript
module-type: widget

Extend the dropzone widget to allow other widget to handle drop events 

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";


var DropZoneWidget = require("$:/core/modules/widgets/dropzone.js")["dropzone"];
var Widget = require("$:/core/modules/widgets/widget.js").widget;
/*
The edit-text widget calls this method just after inserting its dom nodes
*/
/*
overload the base widget class initialise
*/
DropZoneWidget.prototype.bjDropzoneExtend ={};
DropZoneWidget.prototype.bjDropzoneExtend.initialise = DropZoneWidget.prototype.initialise;

DropZoneWidget.prototype.initialise = function (parseTreeNode,options) {
	DropZoneWidget.prototype.bjDropzoneExtend.initialise.call(this,parseTreeNode,options);
	this.addEventListeners([
		{type: "tm-dropHandled", handler: "handleDropHandled"}]);
};
/*
handle drophandled message
*/
DropZoneWidget.prototype.handleDropHandled = function(event) {
	// Reset the enter count
	this.dragEnterCount = 0;
	// Remove highlighting
	$tw.utils.removeClass(this.domNodes[0],"tc-dragover");
	return false;
};

})();
