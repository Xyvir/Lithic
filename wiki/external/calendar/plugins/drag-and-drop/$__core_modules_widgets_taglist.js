/*\
title: $:/core/modules/widgets/taglist.js
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

var TagListWidget = function(parseTreeNode,options) {
	// Initialise the storyviews if they've not been done already
	if(!this.storyViews) {
		TagListWidget.prototype.storyViews = {};
		$tw.modules.applyMethods("storyview",this.storyViews);
	}
	// Main initialisation inherited from widget.js
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
TagListWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
TagListWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	this.renderChildren(parent,nextSibling);
};

/*
Compute the internal state of the widget
*/
TagListWidget.prototype.execute = function() {
	// Get our attributes
	this.template = this.getAttribute("template");
	this.editTemplate = this.getAttribute("editTemplate");
	this.variableName = this.getAttribute("variable","currentTiddler");
	this.nodrop = this.getAttribute("nodrop");
	this.htmltag = this.getAttribute("htmltag");
	this.static = this.getAttribute("static"); 
	this.listtag=this.getAttribute("targeTtag",this.getVariable("currentTiddler"));
	this.listtag=this.getAttribute("targettag",this.listtag);
	// Compose the list elements
	this.list = this.getTiddlerList();
	var members = [],
		self = this;
	// Check for an empty list
	if(this.list.length === 0) {
		members = this.getEmptyMessage();
	} else {
		$tw.utils.each(this.list,function(title,index) {
			members.push(self.makeItemTemplate(title));
		});
	}
	// Construct the child widgets
	this.makeChildWidgets(members);
};

TagListWidget.prototype.getTiddlerList = function() {
	var defaultFilter = "[tag["+this.listtag+"]]";
	return this.wiki.filterTiddlers(this.getAttribute("filter",defaultFilter),this);//BJ FIXME should not allow user defined filters
};
TagListWidget.prototype.setTiddlerList = function(what,where) {
	var self = this;
	if (this.nodrop || this.static) return;
	var update = function(value) {
		var tiddler = self.wiki.getTiddler(self.listtag)||{title:self.listtag},
			updateFields = {};
		
		updateFields["list"] = value;
		self.wiki.addTiddler(new $tw.Tiddler(self.wiki.getCreationFields(),tiddler,updateFields,
		self.wiki.getModificationFields()));
	};
	var newlist=[],
		j=0;
	
	for (var i=0;i<this.list.length;i++) {
		if (this.list[i]===what) continue;
		if (this.list[i]===where) {
			newlist[j]=what;
			j++; 
		}
		newlist[j]=this.list[i];
		j++; 
	}
	update(newlist);
};

TagListWidget.prototype.getEmptyMessage = function() {
	var emptyMessage = this.getAttribute("emptyMessage",""),
		parser = this.wiki.parseText("text/vnd.tiddlywiki",emptyMessage,{parseAsInline: true});
	if(parser) {
		return parser.tree;
	} else {
		return [];
	}
};

/*
Compose the template for a list item
*/
TagListWidget.prototype.makeItemTemplate = function(title) {
	// Check if the tiddler is a draft
	var tiddler = this.wiki.getTiddler(title),
		isDraft = tiddler && tiddler.hasField("draft.of"),
		template = this.template,
		templateTree;
	if(isDraft && this.editTemplate) {
		template = this.editTemplate;
	}
	// Compose the transclusion of the template
	if(template) {
		templateTree = [{type: "transclude", attributes: {tiddler: {type: "string", value: template}}}];
	} else {
		if(this.parseTreeNode.children && this.parseTreeNode.children.length > 0) {
			templateTree = this.parseTreeNode.children;
		} else {
			// Default template is a link to the title
			templateTree = [{type: "element", tag: this.parseTreeNode.isBlock ? "div" : "span", children: [{type: "link", attributes: {to: {type: "string", value: title}}, children: [
					{type: "text", text: title}
			]}]}];
		}
	}
	// Return the list item
	if (this.nodrop) return {type: "taglistitem", itemTitle: title, variableName: this.variableName, children: templateTree, listtag:null};
	return {type: "taglistitem", itemTitle: title, variableName: this.variableName, children: templateTree, listtag:this.listtag, htmltag:this.htmltag};
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
TagListWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	// Completely refresh if any of our attributes have changed
	if(changedAttributes.filter || changedAttributes.template || changedAttributes.editTemplate || changedAttributes.emptyMessage || changedAttributes.storyview || changedAttributes.targeTtag) {
		this.refreshSelf();
		return true;
	} else {
		// Handle any changes to the list
		var hasChanged = this.handleListChanges(changedTiddlers);
		return hasChanged;
	}
};


/*
Process any changes to the list
*/
TagListWidget.prototype.handleListChanges = function(changedTiddlers) {
	// Get the new list
	var prevList = this.list;
	this.list = this.getTiddlerList();//alert(this.list);
	var redolist = false;

	// Check for an empty list
	if(this.list.length === 0) {
		// Check if it was empty before
		if(prevList.length === 0) {
			// If so, just refresh the empty message
			return this.refreshChildren(changedTiddlers);
		} else {
			// Replace the previous content with the empty message
			for(var t=this.children.length-1; t>=0; t--) {
				this.removeListItem(t);
			}
			var nextSibling = this.findNextSiblingDomNode();
			this.makeChildWidgets(this.getEmptyMessage());
			this.renderChildren(this.parentDomNode,nextSibling);
			return true;
		}
	} else {
		// If the list was empty then we need to remove the empty message
		if(prevList.length === 0) 
		{
			this.removeChildDomNodes();
			this.children = [];
		}
		if (prevList.length!==this.list.length) {
			redolist = true;
		} else {
			var t;
			for(t=0; t<this.list.length; t++) {
				if (prevList[t]!==this.list[t]) {//compare tid titles
					break;
				}	
			}
			if ( t!==this.list.length ){
				redolist = true;
			}
		}
		var hasRefreshed = false;
		if (redolist === true) {
			var hasRefreshed = true;
			for(var t=this.children.length-1; t>=0; t--) {
				this.removeListItem(t);
			}
			for(var t=0; t<this.list.length; t++) {
					this.insertListItem(t,this.list[t]);
			}
		} else {
			return this.refreshChildren(changedTiddlers);
		}
		return hasRefreshed;
	}
};

/*
Find the list item with a given title, starting from a specified position
*/
TagListWidget.prototype.findListItem = function(startIndex,title) {
	while(startIndex < this.children.length) {
		if(this.children[startIndex].parseTreeNode.itemTitle === title) {
			return startIndex;
		}
		startIndex++;
	}
	return undefined;
};

/*
Insert a new list item at the specified index
*/
TagListWidget.prototype.insertListItem = function(index,title) {
	// Create, insert and render the new child widgets
	var widget = this.makeChildWidget(this.makeItemTemplate(title));
	widget.parentDomNode = this.parentDomNode; // Hack to enable findNextSiblingDomNode() to work
	this.children.splice(index,0,widget);
	var nextSibling = widget.findNextSiblingDomNode();
	widget.render(this.parentDomNode,nextSibling);
	// Animate the insertion if required
	if(this.storyview && this.storyview.insert) {
		this.storyview.insert(widget);
	}
	return true;
};

/*
Remove the specified list item
*/
TagListWidget.prototype.removeListItem = function(index) {
	var widget = this.children[index];
	// Animate the removal if required
	if(this.storyview && this.storyview.remove) {
		this.storyview.remove(widget);
	} else {
		widget.removeChildDomNodes();
	}
	// Remove the child widget
	this.children.splice(index,1);
};

exports.taglist = TagListWidget;

var TagListItemWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
	this.nodrop = this.parseTreeNode.listtag;
};

/*
Inherit from the base widget class
*/
TagListItemWidget.prototype = new Widget();
TagListItemWidget.prototype.addTag = function (tidname) {
		var tiddler = this.wiki.getTiddler(tidname);
		var modification = this.wiki.getModificationFields();
		modification.tags = (tiddler.fields.tags || []).slice(0);
		$tw.utils.pushTop(modification.tags,this.parseTreeNode.listtag);
		this.wiki.addTiddler(new $tw.Tiddler(tiddler,modification));
			
}
TagListItemWidget.prototype.handleDropEvent  = function(event) {
	var self = this,
		dataTransfer = event.dataTransfer,
		returned = this.nameandOnListTag(dataTransfer);
	if (!this.nodrop) {
		this.cancelAction(event);
		self.dispatchEvent({type: "tm-dropHandled", param: null});
		return;
	}
	if (!!returned.name) { //only handle tiddler drops
		 if (!returned.onList) { //this means tiddler does not have the tag
			 this.addTag(returned.name);
		 }
		 this.parentWidget.setTiddlerList(returned.name, this.parseTreeNode.itemTitle);

		 //cancel normal action
		 this.cancelAction(event);
		 self.dispatchEvent({type: "tm-dropHandled", param: null});

	 }
	 //else let the event fall thru
};
TagListItemWidget.prototype.importDataTypes = [
	{type: "text/vnd.tiddler", IECompatible: false, convertToFields: function(data) {
		return JSON.parse(data);
	}},
	{type: "URL", IECompatible: true, convertToFields: function(data) {
		// Check for tiddler data URI
		var match = decodeURIComponent(data).match(/^data\:text\/vnd\.tiddler,(.*)/i);
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
		var match = decodeURIComponent(data).match(/^data\:text\/vnd\.tiddler,(.*)/i);
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
TagListItemWidget.prototype.cancelAction =function(event) {
	// Try each provided data type in turn
		{
	var self = this,
		dataTransfer = event.dataTransfer;
	event.preventDefault();
	// Stop the drop ripple up to any parent handlers
	event.stopPropagation();
};
};


TagListItemWidget.prototype.nameandOnListTag = function(dataTransfer) {
	// Try each provided data type in turn
	var self = this;
	for(var t=0; t<this.importDataTypes.length; t++) {
		if(!$tw.browser.isIE || this.importDataTypes[t].IECompatible) {
			// Get the data
			var dataType = this.importDataTypes[t];
			var data = dataTransfer.getData(dataType.type);
			// Import the tiddlers in the data
			if(data !== "" && data !== null) {
				var tiddlerFields = dataType.convertToFields(data);
				if(!tiddlerFields.title) {
					break;
				}
				if (tiddlerFields.tags && $tw.utils.parseStringArray(tiddlerFields.tags).indexOf(self.parseTreeNode.listtag) !== -1) {
					return {name:tiddlerFields.title, onList:true};
				}
				else {//we have to add the tag to the tiddler
					if (!!self.wiki.getTiddler(tiddlerFields.title)){//tid is in this tw
						return {name:tiddlerFields.title, onList:false};
					}
				//return false; 
				}
			}
		}else alert("not found");
	};
	return  {name:null, onList:false};
};
/*
Render this widget into the DOM
*/
TagListItemWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();	
	var tag = "div";
	if(this.parseTreeNode.htmltag && $tw.config.htmlUnsafeElements.indexOf(this.revealTag) === -1) {
		tag = this.parseTreeNode.htmltag;
	}
var domNode = this.document.createElement(tag);
	// Add event handlers
	$tw.utils.addEventListeners(domNode,[
		{name: "dragover", handlerObject: this, handlerMethod: "handleDragOverEvent"},		
		{name: "drop", handlerObject: this, handlerMethod: "handleDropEvent"}
		]);
	// Insert element
	parent.insertBefore(domNode,nextSibling);
	this.renderChildren(domNode,null);
	this.domNodes.push(domNode);
};


TagListItemWidget.prototype.handleDragOverEvent  = function(event) {
//alert("OVER")
	// Tell the browser that we're still interested in the drop
	event.preventDefault();
	event.dataTransfer.dropEffect = "copy";
};
/*
Compute the internal state of the widget
*/
TagListItemWidget.prototype.execute = function() {
	// Set the current list item title
	this.setVariable(this.parseTreeNode.variableName,this.parseTreeNode.itemTitle);
	// Construct the child widgets
	this.makeChildWidgets();
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
TagListItemWidget.prototype.refresh = function(changedTiddlers) {
	return this.refreshChildren(changedTiddlers);
};

exports.taglistitem = TagListItemWidget;

})();
