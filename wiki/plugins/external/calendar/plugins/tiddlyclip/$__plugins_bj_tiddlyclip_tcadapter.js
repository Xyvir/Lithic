/*\
title: $:/plugins/bj/tiddlyclip/tcadapter.js
type: application/javascript
module-type: widget


\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

if($tw.browser) {
	require("$:/plugins/bj/tiddlyclip/tidpaste.js");
}
var CreateTiddlerWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
	this.addEventListeners([
		{type: "tiddlyclip-create", handler: "handleTiddlyclipEvent"}
	]);
};


/*
Inherit from the base widget class
*/
CreateTiddlerWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
CreateTiddlerWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	this.renderChildren(parent,nextSibling);
}

CreateTiddlerWidget.prototype.getTiddlerList = function() {
	var defaultFilter = "[all[shadows+tiddlers]tag[$:/tags/tiddlyclip]]";
	return this.wiki.filterTiddlers(defaultFilter,this);
}
/*
Compute the internal state of the widget
*/
CreateTiddlerWidget.prototype.execute = function() {
	var self = this;
	// Get our parameters here we could allow an module to modify the plugin
	// Get the commands and place them in the tiddlyclip structure to expose them to the user
	tiddlyclip.dates=function(){
		var dates ={};
		var dateLong=    'DDD, MMM DDth, YYYY';
		var dateTimeLong='DDD, MMM DDth, YYYY at hh12:0mm:0ss am';	
		var dateShort=   'DD MMM YYYY';//journal form
		var dateTimeShort=   'YYYY/MM/DD 0hh:0mm:0ss';//journal form
		
		dates.yearMonth=$tw.utils.stringifyDate(new Date()).replace(/(.*)\.(.*)/,"$1").substr(0,6);
		dates.dateTimeLong=   $tw.utils.formatDateString(new Date(),dateTimeLong);	
		dates.dateLong=       $tw.utils.formatDateString(new Date(),dateLong);		
		dates.dateShort=      $tw.utils.formatDateString(new Date(),dateShort);	       
		dates.dateComma=     dates.dateShort.toString().replace(/ /g,':');
		dates.dateTimeShort=  $tw.utils.formatDateString(new Date(),dateTimeShort);
		return dates;
	}
	tiddlyclip.getDefaultRule=function (ruleName) {
		var defaultRules = {
			defaultTid:'||||{"#type":"text/x-tiddlywiki"},{"$type":"((*@classic*??*#type*??*@abort()*))"}||no-textsaver import|',
			defaultSnip:
			'|((*@pageTitle*))/thumbprint|((*@exists(@snap)*??*@snap*))|ClippedImage|'+
			'|{"$type":"image/png"},{"$when":"((*@dateTimeShort*))"},{"$location":"((*@pageRef*))"}|[[SnapRuleMode]]|'+
			'|((*@pageTitle*))|((*@pageRef*))\\n\\n{{((*@pageTitle*))/thumbprint}}\\n\\n((*@text*))\\n\\n||'+
			'|{"$location":"((*@pageRef*))"},{"$caption":"((*@pageTitle*))"},{"$when":"((*@dateTimeShort*))"}||',
			defaultPin: '|((*@pageTitle*))|((*@pageRef*))\\n\\n[img[((*@onImage*??*@imageURL*??*@largestImgURL*))]]\\n\\n((*@text*))\\n\\n((*@exists(@userstring)*??*@userstring*))||'+
						'|{"$location":"((*@pageRef*))"},{"$caption":"((*@pageTitle*))"},{"$when":"((*@dateTimeShort*))"}|inc|'
		}
		return defaultRules[ruleName];
	}
	tiddlyclip.defaultCategories = [
		"|Tid|copy tids||defaultTid|tiddlers|",
		"|Snip|copy||defaultSnip||",
		"|Pin|Pin it||defaultPin||"
	];

	tiddlyclip.defs = {
	}
	tiddlyclip.newProtoTiddler = function (){
		var tid = new $tw.Tiddler($tw.wiki.getCreationFields(),$tw.wiki.getModificationFields());
		var current = {fields:{}};
		for (var atr in tid.fields){ 
			current.fields[atr]=tid.getFieldString(atr);	
		}
		return current;	
	}
	tiddlyclip.modifyTW= function(fields){
			$tw.wiki.addTiddler(new $tw.Tiddler(fields,$tw.wiki.getModificationFields()));
	}
	tiddlyclip.getNewTitle= function(base,options) {
			options = options || {prefix: "-"};
			return $tw.wiki.generateNewTitle(base,options);
	}
	tiddlyclip.getTidContents= function(tidname) {
		var tiddler = $tw.wiki.getTiddler(tidname);
			switch (tiddler.fields.type) {
				case "application/x-tiddler-dictionary":
					return JSON.stringify($tw.utils.parseFields(tiddler.fields.text));
					break;
			}
			return $tw.wiki.getTiddlerText(tidname);
	}
	//$tw.wiki.my.logEnable= function() {tiddlyclip.logit=true};
	//$tw.wiki.my.logDisable= function() {tiddlyclip.logit=false};
	tiddlyclip.log= function(x) {
		//if (tiddlyclip.logit) 
		//alert(x);
	};
	tiddlyclip.tiddlerExists= function(title) {
			return($tw.wiki.tiddlerExists(title));
	}	
	tiddlyclip.getTiddler= function (title) {
		var tid = $tw.wiki.getTiddler(title);
		if (!tid){
			return null;
		}
		var current = {fields:{}};
		for (var atr in tid.fields){ 
			current.fields[atr]=tid.getFieldString(atr);	
		}
		return current;	
	}	
	tiddlyclip.finish=function (tids) {
		self.dispatchEvent({type: "tm-auto-save-wiki"}); 
	}
	tiddlyclip.importTids =function (tidfields) {
		//tiddlyclip.log("savefile at last!");
		// Get the details from the message
        var tiddlerFieldsArray = [tidfields];					
		self.dispatchEvent({type: "tm-import-tiddlers", param: JSON.stringify(tiddlerFieldsArray)});	
	}
	this.list = this.getTiddlerList();
	tiddlyclip.macro={};
	$tw.utils.each(this.list,function(title,index) {
		try {
			var func = require(title);
			
			tiddlyclip.macro[func.name]=func.run;
		} catch (e) {
			alert("tc: problem with command " + title);
		} 
	});		
	this.makeChildWidgets();
};

CreateTiddlerWidget.prototype.handleTiddlyclipEvent = function(event) {

	tiddlyclip.modules.tPaste.paste(event.category,event.pagedata,event.currentsection);	
	return false;
};
		
/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
CreateTiddlerWidget.prototype.refresh = function(changedTiddlers) {
	//var changedAttributes = this.computeAttributes();
	if(false) {
		this.refreshSelf();
		return true;
	} else {
		return this.refreshChildren(changedTiddlers);		
	}
};
exports.createclip = CreateTiddlerWidget;

})();
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var tcWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
tcWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
tcWidget.prototype.render = function(parent,nextSibling) {
	var doc = document;
	var self =this;
	{
		// Inject the message box
		var messageBox = doc.getElementById("tiddlyclip-message-box");
		//remove previously setup
		if(messageBox) messageBox.outerHTML = "";

		messageBox = doc.createElement("div");
		messageBox.id = "tiddlyclip-message-box";
		messageBox.style.display = "none";
		doc.body.appendChild(messageBox);

		// Attach the event handler to the message box
		messageBox.addEventListener("tiddlyclip-save-file", onSaveFile,false);
	};
	function onSaveFile(event) {
		//tiddlyclip.log("savefile at last!");
		// Get the details from the message
		var message = event.target;
	    var category = message.getAttribute("data-tiddlyclip-category");
	    var pageData = message.getAttribute("data-tiddlyclip-pageData");
	    var transformed =  JSON.parse(pageData);
	    if (!transformed.data) alert("not data");
	    var currentsection = message.getAttribute("data-tiddlyclip-currentsection");					
		self.dispatchEvent({type: "tiddlyclip-create", category:category, pagedata: transformed, currentsection:currentsection});	
	}
};

/*
Compute the internal state of the widget
*/
tcWidget.prototype.execute = function() {

};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
tcWidget.prototype.refresh = function(changedTiddlers) {

		return false;		

};

exports["tcadapter"] = tcWidget;

})();
