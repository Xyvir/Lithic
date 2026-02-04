/*\
title: $:/core/modules/widgets/ondrop.js
type: application/javascript
module-type: widget

List and list item widgets

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

/*
The list widget creates list element sub-widgets that reach back into the list widget for their configuration
*/

var OnDrop = function(parseTreeNode,options) {
	// Main initialisation inherited from widget.js
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
OnDrop.prototype = new Widget();

/*
Render this widget into the DOM
*/
OnDrop.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
		// Add event handlers
	// Create element
	var domNode = this.document.createElement("div");
	domNode.className = "tc-dropzone";
	$tw.utils.addEventListeners(domNode,[
		{name: "drop", handlerObject: this, handlerMethod: "handleDropEvent"}
		]);
	// Insert element
	parent.insertBefore(domNode,nextSibling);
	this.renderChildren(domNode,null);
	this.domNodes.push(domNode);
};

/*
Compute the internal state of the widget
*/
OnDrop.prototype.execute = function() {
	this.listtag = this.getAttribute("targeTtag",this.getVariable("currentTiddler"));
    this.onAddMessage = this.getAttribute("onAddMessage");
    this.action = this.getAttribute("tagAction"); 
	// Make child widgets
	this.makeChildWidgets();
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
OnDrop.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	// Completely refresh if any of our attributes have changed
	if(changedAttributes.tagAction || changedAttributes.onAddMessage) {
		this.refreshSelf();
		return true;
	} else {
	return this.refreshChildren(changedTiddlers);
	}
};
OnDrop.prototype.addTag = function (tidname) {
		var tiddler = this.wiki.getTiddler(tidname);
		var modification = this.wiki.getModificationFields();
		modification.tags = (tiddler.fields.tags || []).slice(0);
		$tw.utils.pushTop(modification.tags,this.listtag);
		this.wiki.addTiddler(new $tw.Tiddler(tiddler,modification));
			
}

OnDrop.prototype.removeTag = function (tidname) {
		var tiddler = this.wiki.getTiddler(tidname);
		var p = tiddler.fields.tags.indexOf(this.listtag);
		if(p !== -1) {
			var modification = this.wiki.getModificationFields();
			modification.tags = (tiddler.fields.tags || []).slice(0);
			modification.tags.splice(p,1);
			if(modification.tags.length === 0) {
				modification.tags = undefined;
			}
		this.wiki.addTiddler(new $tw.Tiddler(tiddler,modification));
		}	
}

OnDrop.prototype.handleDropEvent  = function(event) {
	var self = this,
		dataTransfer = event.dataTransfer, returned={};
		returned = self.nameandOnListTag(dataTransfer);
	
	if (!!returned.name) { //only handle tiddler drops
		 if (!returned.onList) { //this means tiddler does not have the tag
			if (self.action === 'addtag') self.addTag(returned.name);
		}
		else {
			if (self.action === 'removetag') self.removeTag(returned.name);
		}
		 //cancel normal action
		 self.cancelAction(event);

		 self.dispatchEvent({type: "tm-dropHandled", param: null});
	 if (self.onAddMessage) self.dispatchEvent({type: self.onAddMessage, param: returned.name});
	 }
	 //else let the event fall thru
};
OnDrop.prototype.importDataTypes = [
	{type: "text/vnd.tiddler", IECompatible: false, convertToFields: function(data) {
		return JSON.parse(data);
	}},
	{type: "URL", IECompatible: true, convertToFields: function(data) {
		// Check for tiddler data URI
		var match = decodeURI(data).match(/^data\:text\/vnd\.tiddler,(.*)/i);
		if(match) {
			return JSON.parse(match[1]);
		} else {
			return { // As URL string
				text: data
			};
		}
	}},
	{type: "text/x-moz-url", IECompatible: false, convertToFields: function(data) {
		// Check for tiddler data URI
		var match = decodeURI(data).match(/^data\:text\/vnd\.tiddler,(.*)/i);
		if(match) {
			return JSON.parse(match[1]);
		} else {
			return { // As URL string
				text: data
			};
		}
	}},
	{type: "text/plain", IECompatible: false, convertToFields: function(data) {
		return {
			text: data
		};
	}},
	{type: "Text", IECompatible: true, convertToFields: function(data) {
		return {
			text: data
		};
	}},
	{type: "text/uri-list", IECompatible: false, convertToFields: function(data) {
		return {
			text: data
		};
	}}
];
OnDrop.prototype.cancelAction =function(event) {
	// Try each provided data type in turn
		{
	var dataTransfer = event.dataTransfer;
	event.preventDefault();
	// Stop the drop ripple up to any parent handlers
	event.stopPropagation();
};
};

OnDrop.prototype.nameandOnListTag = function(dataTransfer) {
	// Try each provided data type in turn
	for(var t=0; t<this.importDataTypes.length; t++) {
		if(!$tw.browser.isIE || this.importDataTypes[t].IECompatible) {
			// Get the data
			var dataType = this.importDataTypes[t];
			var data = dataTransfer.getData(dataType.type);
			// Import the tiddlers in the data);
			if(data !== "" && data !== null) {
				var tiddlerFields = dataType.convertToFields(data);
				if(!tiddlerFields.title) {
					
					break;
				}
				if (tiddlerFields.tags && $tw.utils.parseStringArray(tiddlerFields.tags).indexOf(this.listtag) !== -1) {
					return {name:tiddlerFields.title, onList:true};
				}
				else {//we have to add the tag to the tiddler
					if (!!this.wiki.getTiddler(tiddlerFields.title)){//tid is in this tw
						return {name:tiddlerFields.title, onList:false};
					}
				//return false; 
				}
			}
		}
	};
	return  {name:null, onList:false};
};
exports.ondrop = OnDrop;
})();

