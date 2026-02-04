/*\
title: $:/bj/modules/widgets/edit.js
type: application/javascript
module-type: widget
\*/

if($tw.browser )   {
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var ready = false;

var MIN_TEXT_AREA_HEIGHT = 100; // Minimum height of textareas in pixels

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var EditHtmlWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};
var PLUSMODE = (typeof $tw.wiki.getTiddler("$:/language/Docs/Types/text/x-perimental")!='undefined');

/*
Inherit from the base widget class
*/
EditHtmlWidget.prototype = new Widget();

EditHtmlWidget.prototype.postRender = function() {
	var self = this,
		cm;
	var toWiki = function(text) {
		//if($tw.browser) alert("in towiki "+text)

		//BJ FIXME - in theory the attribs can be in any order, so this may fail as it is
		var newtext = "";

		 newtext = text.replace(/^<p><span class=\"verbatim\".*?>([^<]*)<\/span><\/p>/,
		function(m,key,offset,str){
                if (key.indexOf('<') != -1) {// we have caputure some formatting - !abort
					return m;
				}
				return $tw.utils.htmlDecode(key) + "\n<!-- verbatim -->";

		});
		newtext =
		newtext.replace(/<p><span class=\"verbatim\".*?>([^<]*)<\/span><\/p>/g,
		function(m,key,offset,str){
                if (key.indexOf('<') != -1) {// we have caputure some formatting - !abort
					return m;
				}
				return "\n<!-- nl verb -->"+$tw.utils.htmlDecode(key)+"<!-- atim -->";

			
		});
		newtext = newtext.replace(/<span class=\"verbatim\".*?>([^<]*)<\/span>/g,
			function(m,key,offset,str){
				if (key.indexOf('<')!=-1) {// we have caputure some formatting - !abort
					return m;
				}
				return "<!-- verb -->"+$tw.utils.htmlDecode(key)+"<!-- atim -->";
			});
		return newtext;
	}

	if($tw.browser && window.CKEDITOR && this.editTag === "textarea") {
		
		var ck ="editor"+ Math.random();
		this.domNodes[0].firstChild.setAttribute("name",ck);
		this.domNodes[0].firstChild.setAttribute("id",ck);
		var config;
		try {
		    config = $tw.wiki.getTiddlerData("$:/plugins/bj/visualeditor/config.json");
		} catch(e) {
			alert("invalid config format");
			config = [];
		}
		CKEDITOR.replace(ck, config);//,

		CKEDITOR.instances[ck].on('change', 
			function() { 
				if (PLUSMODE && self.edittype == 'text/x-perimental') {
					self.saveChanges(toWiki(CKEDITOR.instances[ck].getData()));
				} else {
					self.saveChanges(CKEDITOR.instances[ck].getData());
				} 
			}
		);
	} 
};

EditHtmlWidget.prototype.render = function(parent,nextSibling) {
	var self = this;
	// Save the parent dom node
	this.parentDomNode = parent;
	// Compute our attributes
	this.computeAttributes();
	// Execute our logic
	this.execute();
	var fromWiki = function(text) {
		var preAmble = '<span class="verbatim">';
		var index=1;
		//seperate the /define .../end section
		text = text.split("<\!-- verbatim -->");
		if (text.length == 1) //no preamble defined
			index = 0;
		else
			text[0] = preAmble+$tw.utils.htmlEncode(text[0]) + '</span>'
		text[index] = text[index].replace(/^<\!-- nl verb -->([\s\S]*?)<\!-- atim -->/mg,
		function(m,key,offset,str){//alert(key);
			return '<p>' + preAmble+$tw.utils.htmlEncode(key)+'</span>'+'</p>';
		});//alert ("newtext "+text[index]);
		text[index] = text[index].replace(/<\!-- verb -->([\s\S]*?)<\!-- atim -->/g,
		function(m,key,offset,str){//alert(key);
			return preAmble+$tw.utils.htmlEncode(key)+'</span>';
		});
		//alert ("newtext "+text.join(""));
		return text.join("");
	}
	// Create our element
	var outerDomNode = this.document.createElement('div');
		outerDomNode.className = "tw-ckeditor-instance";
	var domNode = this.document.createElement(this.editTag);

	if(this.editPlaceholder) {
		domNode.setAttribute("placeholder",this.editPlaceholder);
	}
	// Assign classes
	if(this.editClass) {
		domNode.className = this.editClass;
	}
	// Set the text
	var editInfo = this.getEditInfo();
	if(this.editTag === "textarea") {
		if (PLUSMODE && this.edittype == 'text/x-perimental') {
			domNode.appendChild(this.document.createTextNode(fromWiki(editInfo.value)));
		} else  {
			domNode.appendChild(this.document.createTextNode(editInfo.value));
		} 
	} else {
		alert("visual editor only works with textarea")
	}
    outerDomNode.appendChild(domNode);
	// Insert the element into the DOM
	parent.insertBefore(outerDomNode,nextSibling);
	this.domNodes.push(outerDomNode);
	if(this.postRender) {
		this.postRender();
	}
};

/*
Get the tiddler being edited and current value
*/
EditHtmlWidget.prototype.getEditInfo = function() {
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
			switch(this.editField) {
				case "text":
					value = "Type the text for the tiddler '" + this.editTitle + "'";
					break;
				case "title":
					value = this.editTitle;
					break;
				default:
					value = "";
					break;
			}
			if (this.editDefault !== undefined) {
				value = this.editDefault;
			}
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

EditHtmlWidget.prototype.getAttribute = function () {
	//parameters are passed to parent so get them from there
	return this.parentWidget.getAttribute.apply(this.parentWidget, arguments);
}
 
EditHtmlWidget.prototype.execute = function() {
	this.editTitle = this.getAttribute("tiddler",this.getVariable("currentTiddler"));
	this.editField = this.getAttribute("field","text");
	this.editIndex = this.getAttribute("index");
	this.editDefault = this.getAttribute("default");
	this.editClass = this.getAttribute("class");
	this.editPlaceholder = this.getAttribute("placeholder");
	this.editFocusPopup = this.getAttribute("focusPopup");
	this.onkeyupdate = this.getAttribute("onkeyupdate","yes"); 
	// Get the content type of the thing we're editing
	this.edittype = "";
	if(this.editField === "text") {
		var tiddler = this.wiki.getTiddler(this.editTitle);
		if(tiddler) {
			this.edittype = tiddler.fields.type;
		}
	}
	// only textarea can be visually edited
	this.editTag = "textarea"
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
EditHtmlWidget.prototype.refresh = function(changedTiddlers) {
// attribute changes are caught by parent widget
	if(changedTiddlers[this.editTitle]) {
		//this.refreshSelf(); BJ maybe we don't like to have our edits pulled - this could be an option
		//return true;
	}
	return false;
};

/*
Update the editor with new text. This method is separate from updateEditorDomNode()
so that subclasses can override updateEditor() and still use updateEditorDomNode()
*/
EditHtmlWidget.prototype.updateEditor = function(text) {
	this.updateEditorDomNode(text);
};

/*
Update the editor dom node with new text
*/
EditHtmlWidget.prototype.updateEditorDomNode = function(text) {
	// Replace the edit value if the tiddler we're editing has changed
	var domNode = this.domNodes[0].firstChild;
	if(!domNode.isTiddlyWikiFakeDom) {
		if(this.document.activeElement !== domNode) {
			domNode.value = text;
		}
		// Fix the height if needed
		//this.fixHeight();
	}
};

/*
Handle a dom "input" event
*/
EditHtmlWidget.prototype.handleInputEvent = function(event) {
	this.saveChanges(this.domNodes[0].firstChild.value);
	//this.fixHeight();
	return true;
};

EditHtmlWidget.prototype.handleFocusEvent = function(event) {
	if(this.editFocusPopup) {
		$tw.popup.triggerPopup({
			domNode: this.domNodes[0].firstChild,
			title: this.editFocusPopup,
			wiki: this.wiki,
			force: true
		});
	}
	return true;
};

EditHtmlWidget.prototype.saveChanges = function(text) {
	var editInfo = this.getEditInfo();
	if(text !== editInfo.value) {
		editInfo.update(text);
	}
};

$tw.utils.registerFileType("text/x-perimental","utf8",".perimental");
exports["__!ckebase__"] = EditHtmlWidget;//choose an unparseable name to make widget 'private'

//-------------- base initialisation - ----------------

var startup =  function () { //do after lib is loaded
	if (typeof CKEDITOR != 'undefined')   {
		var PLUSMODE  = (typeof $tw.wiki.getTiddler("$:/language/Docs/Types/text/x-perimental")!='undefined');

		var sty;
		try {
		 sty=$tw.wiki.getTiddlerData("$:/plugins/bj/visualeditor/styles.json");
		} catch(e){ 
			alert("invalid style format");
			sty=[];
		}
		if (PLUSMODE) sty.push({ "name": "verbatim","element": "span","attributes": {"class": "verbatim"}});

		CKEDITOR.stylesSet.add( 'default',sty);
		if (PLUSMODE) CKEDITOR.addCss($tw.wiki.getTiddlerData("$:/plugins/bj/visualeditor/verbatim.json").verbatim);
		CKEDITOR.on( 'instanceReady', function( ev ) {
			var blockTags = ['div','h1','h2','h3','h4','h5','h6','p','pre','li','blockquote','ul','ol',
							'table','thead','tbody','tfoot','td','th',];
			var rules = {
				indent : false,
				breakBeforeOpen : true,
				breakAfterOpen : false,
				breakBeforeClose : false,
				breakAfterClose : false
			};

			for (var i=0; i<blockTags.length; i++) {
				ev.editor.dataProcessor.writer.setRules( blockTags[i], rules );
			}
		});

		//BJ hide tw5 tags and macros from ckeditor
		CKEDITOR.config.protectedSource.push(/<\/?\$[^<]*\/?>/g);
		CKEDITOR.config.protectedSource.push(/<<[^<]*>>/g);
		//CKEDITOR. config.protectedSource.push(/<\?[\s\S]*?\?>/g); // PHP Code
		CKEDITOR.config.protectedSource.push(/<code>[\s\S]*?<\/code>/gi); // Code tags
		CKEDITOR.config.entities = false;
	}

	var atiddler = $tw.wiki.getTiddler("$:/config/EditorTypeMappings/text/html");
	if (atiddler == undefined) {
				$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getCreationFields(),
				{title:"$:/config/EditorTypeMappings/text/html", text:"html"}));
	}
	atiddler = $tw.wiki.getTiddler("$:/config/EditorTypeMappings/text/x-perimental");
	if (atiddler == undefined) {	
				$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getCreationFields(),
					{title:"$:/config/EditorTypeMappings/text/x-perimental", text:"x-perimental"}));
	}
}

//require("$:/plugins/bj/visualeditor/ckeditor.js"); BJ -option to build in the lib?
/*
create lib loader 
*/
if($tw.browser)  {
	var head = document.getElementsByTagName('head')[0];
	var js = document.createElement("script");
	js.type = "text/javascript";
	js.onload = function() {  
		//do non-tree initialisation
		startup();
		ready = true;//BJ do this in startup
		//broadcast ready message
		$tw.wiki.setTextReference("$:/temp/ckeready","ready");
	}
	if (window.location.hostname == "bjtools.tiddlyspot.com") {
		js.src = $tw.wiki.getTiddlerText("$:/plugin/bj/visualeditor/bjtools/lib")||"";
	}
	else {
		var tiddler = $tw.wiki.getTiddler("$:/plugin/bj/visualeditor/includelib")||{fields:{}};
		var src = (tiddler.fields.text)||"";
		js.src = src.replace(/.*?<script.*?src=["'](.*?)["'][\s\S]*/,"$1");
		if (tiddler.fields.tags) {
			var pos = tiddler.fields.tags.indexOf("$:/core/wiki/rawmarkup");
			if(pos !== -1) {
				alert("Please remove the tag $:/core/wiki/rawmarkup from tiddler $:/plugin/bj/visualeditor/includelib")
			}
		}
	}
	head.appendChild(js);
} 
//----------------base initialisation finished-----------------------------

var LoadWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};
 
LoadWidget.prototype = new Widget();



LoadWidget.prototype.getLoadingMessage = function() {
	var message = "<h2>loading ckeditor",
		parser = this.wiki.parseText("text/vnd.tiddlywiki",message,{parseAsInline: true});
	if(parser) {
		return parser.tree;
	} else {
		return [];
	}
};
 
LoadWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	this.renderChildren(parent,nextSibling);
};


LoadWidget.prototype.execute = function() {

	if (ready) {
		// insert the real widget
		this.makeChildWidgets([{type: "__!ckebase__"}]);
	}
	else this.makeChildWidgets(this.getLoadingMessage());
};

LoadWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	// Refresh if an attribute has changed, or the 'lib is loaded' is indicated
		if(Object.keys(changedAttributes).length || changedTiddlers["$:/temp/ckeready"]) {
		this.refreshSelf();
		return true;
	} else {
		return this.refreshChildren(changedTiddlers);		
	}
};

LoadWidget.prototype.invokeAction = function(triggeringWidget,event) {
	this.invokeActions(this,event);
	return true; // Action was invoked
};

exports["edit-html"] = LoadWidget;
exports["edit-x-perimental"] = LoadWidget;
})();
}
