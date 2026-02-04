/*\
title: $:/plugins/bj/jsoneditor/edit-json.js
type: application/javascript
module-type: widget

jsoneditor adaptor

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var MIN_TEXT_AREA_HEIGHT = 100; // Minimum height of textareas in pixels

var Widget = require("$:/core/modules/widgets/widget.js").widget;
var newid=0;
var EditJsonWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};
if($tw.browser) {
	require("$:/plugins/bj/jsoneditor/JSONeditor.js");
}
/*
Inherit from the base widget class
*/
EditJsonWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
EditJsonWidget.prototype.render = function(parent,nextSibling) {
	var self = this;
	// Save the parent dom node
	this.parentDomNode = parent;
	// Compute our attributes
	this.computeAttributes();
	// Execute our logic
	this.execute();
	// Create our element
	var editInfo = this.getEditInfo();
	var domNode = this.document.createElement("div");
	var domNode2 = this.document.createElement("div");
	if(this.editType) {
		domNode.setAttribute("type",this.editType);
	}
	if(editInfo.value === "" && this.editPlaceholder) {
		domNode.setAttribute("placeholder",this.editPlaceholder);
	}
	// Assign classes
	if(this.editClass) {
		domNode.className = this.editClass;
	}
	var domNode2 = this.document.createElement("div");
	domNode.innerHTML = '<div style="font-size: 11px; font-family: Verdana,Arial,Helvetica,sans-serif;" id="jsoneditortree'+newid+'"></div>';
	domNode2.innerHTML 	=	this.formHTML;
	
	// Add an input event handler
	//$tw.utils.addEventListeners(domNode2,[
	//	{name: "focus", handlerObject: this, handlerMethod: "handleFocusEvent"},
	//	{name: "input", handlerObject: this, handlerMethod: "handleInputEvent"}
	//]);

	// Insert the element into the DOM
	parent.insertBefore(domNode2,nextSibling);
	parent.insertBefore(domNode,domNode2);
	var updater =function(x){
		self.saveChanges(x);
	}
	this.instance=JSONeditor.start('jsoneditortree'+newid,domNode2.firstChild.firstChild,JSON.parse(editInfo.value),
									'$:/plugins/bj/jsoneditor/',this.format,updater);
	var instance = this.instance;

	newid++;
	this.domNodes.push(domNode);
	this.domNodes.push(domNode2);
	if(this.postRender) {
		this.postRender();
	}
	this.formsetup(domNode2.firstChild);
};

EditJsonWidget.prototype.formHTML=	
	'<div style="font-size: 11px; font-family: Verdana,Arial,Helvetica,sans-serif;" ">'+
	"<form name=\"jsoninput\" >"	+
	"\nLabel:<br>"+
	"<input name=\"jlabel\" type=\"text\" value=\"\" size=\"60\" style=\"width:400px\">"+
	"<br><br>\nValue: <br>"+
	"<textarea name=\"jvalue\" rows=\"10\" cols=\"50\" style=\"width:400px\"></textarea>"+
	"<br><br>\nData type: "+
	"<select  name=\"jtype\">"+
	"\n<option value=\"object\">object</option>\n<option value=\"array\">array</option>"+
	"\n<option value=\"string\">string</option>"+
	"\n<option value=\"number\">number</option>\n<option value=\"boolean\">boolean</option>"+
	"\n<option value=\"null\">null</option>\n<option value=\"undefined\">undefined</option>"+
	"\n</select>&nbsp;&nbsp;&nbsp;&nbsp;"+
	"\n<input name=\"orgjlabel\" type=\"hidden\" value=\"\" size=\"50\" style=\"width:300px\">"+
	"\n<input name=\"jsonUpdate\" onfocus=\"this.blur()\" type=\"submit\" value=\"Set value\">&nbsp;\n<br><br>"+
	"\n<input name=\"jsonAddChild\" onfocus=\"this.blur()\" type=\"button\"  value=\"Add child\">"+
	"\n<input name=\"jsonAddSibling\" onfocus=\"this.blur()\" type=\"button\"  value=\"Add sibling\">\n<br><br>"+
	"\n<input name=\"jsonRemove\" onfocus=\"this.blur()\" type=\"button\"  value=\"Delete\">&nbsp;"+
	"\n<input name=\"jsonRename\" onfocus=\"this.blur()\" type=\"button\"  value=\"Rename\">&nbsp;"+
	"\n<input name=\"jsonCut\" onfocus=\"this.blur()\" type=\"button\" value=\"Cut\">&nbsp;"+
	"\n<input name=\"jsonCopy\" onfocus=\"this.blur()\" type=\"button\"  value=\"Copy\">&nbsp;"+
	"\n<input name=\"jsonPaste\" onfocus=\"this.blur()\" type=\"button\" value=\"Paste\">&nbsp;\n<br><br>"+
	"\n<input type=\"checkbox\" name=\"jbefore\">Add children first/siblings before\n<br>"+
	"\n<input type=\"checkbox\" name=\"jPasteAsChild\">Paste as child on objects & arrays\n<br><br><div id=\"jformMessage\"></div>\n</form></div>";
				
EditJsonWidget.prototype.formsetup = function(f) {
	var instance = this.instance
	var fs=f.style
	fs.fontSize=fs.fontSize="11px"
	fs.fontFamily=fs.fontFamily="Verdana,Arial,Helvetica,sans-serif"
	var e=f.getElementsByTagName("*");
	for(var i=0;i<e.length;i++){
		var s=e[i].style
		if(!!s){
			s.fontSize="11px"
			s.fontFamily="Verdana,Arial,Helvetica,sans-serif"
		}
		var cb= e[i].name
		if (!!cb ) switch (cb) {
			case 'jsoninput': if (this.onkeyupdate!=="yes") e[i].addEventListener("submit", function (e) {
				e.preventDefault();
				instance.jsonChange(e.target);
				return false;
			});

			break;
			case 'jlabel': if (this.onkeyupdate==="yes") e[i].addEventListener("input", function (e) {
				//e.preventDefault();
				instance.jsonChange(e.target.parentNode);
				return false;
			});
			break;
			case 'jvalue': if (this.onkeyupdate==="yes") e[i].addEventListener("input", function (e) {
				//e.preventDefault();
				instance.jsonChange(e.target.parentNode);
				return false;
			});
			break;
			case 'jsonUpdate': if (this.onkeyupdate==="yes") e[i].style.display = 'none';
			break;
			case 'jtype': e[i].addEventListener("change", function (e) {
				instance.changeJsonDataType(e.target.value,e.target.parentNode);
			});
			break;
			case 'jsonAddChild':e[i].addEventListener("click", function (e) {
				instance.jsonAddChild(e.target.parentNode);
			});
			break;
			case 'jsonAddSibling': e[i].addEventListener("click", function (e) {
				instance.jsonAddSibling(e.target.parentNode);
			});
			break;
			case 'jsonRemove': e[i].addEventListener("click", function (e) {
				instance.jsonRemove(e.target.parentNode);
			});
			break;
			case 'jsonRename': e[i].addEventListener("click", function (e) {
				instance.jsonRename(e.target.parentNode);
			});
			break;
			case 'jsonCut': e[i].addEventListener("click", function (e) {
				instance.jsonCut(e.target.parentNode);
			});
			break;
			case 'jsonCopy':e[i].addEventListener("click", function (e) {
				instance.jsonCopy(e.target.parentNode);
			});
			break;
			case 'jsonPaste': e[i].addEventListener("click", function (e) {
				instance.jsonPaste(e.target.parentNode);
			});
			break;
			default:
		}
	}
}
/*
Get the tiddler being edited and current value
*/
EditJsonWidget.prototype.getEditInfo = function() {
	// Get the edit value
	var self = this,
		value,
		update;
	if(this.editIndex) {
		value = this.wiki.extractTiddlerDataItem(this.editTitle,this.editIndex,this.editDefault);
		update = function(value) {
			var data = self.wiki.getTiddlerData(self.editTitle,{});
			if(data[self.editIndex] !== value) {
				data[self.editIndex] = value;
				self.wiki.setTiddlerData(self.editTitle,data);
			}
		};
	} else {
		// Get the current tiddler and the field name
		var tiddler = this.wiki.getTiddler(this.editTitle);
		if(tiddler) {
			// If we've got a tiddler, the value to display is the field string value
			value = tiddler.getFieldString(this.editField);
		} else {
			// Otherwise, we need to construct a default value for the editor
			value = '{}';
		}

		update = function(value) {
			var tiddler = self.wiki.getTiddler(self.editTitle),
				updateFields = {
					title: self.editTitle
				};
			updateFields[self.editField] = value;
			self.wiki.addTiddler(new $tw.Tiddler(self.wiki.getCreationFields(),tiddler,updateFields,self.wiki.getModificationFields()));
		};
	}
	return {value: value, update: update};
};

/*
Compute the internal state of the widget
*/
EditJsonWidget.prototype.execute = function() {
	// Get our parameters
	this.editTitle = this.getAttribute("tiddler",this.getVariable("currentTiddler"));
	this.editField = this.getAttribute("field","text");
	this.editIndex = this.getAttribute("index");
	this.editClass = this.getAttribute("class");
	this.editPlaceholder = this.getAttribute("placeholder");
	this.editFocusPopup = this.getAttribute("focusPopup");
	this.onkeyupdate = this.getAttribute("onkeyupdate","yes"); 
	// Get the editor element tag and type
	var tag,type;
	if(this.editField === "text") {
		tag = "textarea";
	} else {
		tag = "input";
		var fieldModule = $tw.Tiddler.fieldModules[this.editField];
		if(fieldModule && fieldModule.editTag) {
			tag = fieldModule.editTag;
		}
		if(fieldModule && fieldModule.editType) {
			type = fieldModule.editType;
		}
		type = type || "text";
	}
	// Get the rest of our parameters
	this.editTag = this.getAttribute("tag",tag);
	this.editType = this.getAttribute("type",type);
	try {
	 var data=$tw.wiki.getTiddlerData("$:/plugins/bj/jsoneditor/options.json");
	 this.onkeyupdate=(data['onkeyupdate'])?data['onkeyupdate']:'yes';
	 this.format=(data['format'])?data['format']:'';
	} catch(e){ 
		alert("invalid style format");
		this.onkeyupdate="yes";
		this.format='';
	}
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
EditJsonWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	// Completely rerender if any of our attributes have changed
	if(changedAttributes.tiddler || changedAttributes.field || changedAttributes.index) {
		this.refreshSelf();
		return true;
	} else if(changedTiddlers[this.editTitle]) {
		//this.refreshSelf();//BJ FIXME saving cause the widget to get redrawn
		return true;
	}
	return false;
};


/*
Handle a dom "input" event
*/
EditJsonWidget.prototype.handleInputEvent = function(event) {
	this.saveChanges(JSON.stringify(this.json));
	return true;
};

EditJsonWidget.prototype.handleFocusEvent = function(event) {
	if(this.editFocusPopup) {
		$tw.popup.triggerPopup({
			domNode: this.domNodes[0],
			title: this.editFocusPopup,
			wiki: this.wiki,
			force: true
		});
	}
	return true;
};

EditJsonWidget.prototype.saveChanges = function(text) {
	var editInfo = this.getEditInfo();
	if(text !== editInfo.value) {
		editInfo.update(text);
	}
};

exports["edit-json"] = EditJsonWidget;

})();
