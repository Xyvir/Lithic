/*\
title: $:/plugins/bj/typestemplate/viewTemplatePicker.js
type: application/javascript
module-type: macro


\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Information about this macro

*/

exports.name = "viewTemplatePicker";

exports.params = [

];
/*
Run the macro
*/
// Mappings from content type to edit templates type are stored in tiddlers with this prefix
var VIEW_TEMPLATE_MAPPING_PREFIX = "$:/config/ViewTemplateTypeMappings/";

exports.run = function() {
	
var cur = this.getVariable("currentTiddler"), template = null, 
	tiddler = this.wiki.getTiddler(cur);
	
	tiddler && tiddler.fields && tiddler.fields.type? 
			template =  $tw.wiki.getTiddlerText(VIEW_TEMPLATE_MAPPING_PREFIX +tiddler.fields.type) : template = null;
	if (!template)
		return  $tw.wiki.getTiddlerText("$:/core/ui/ViewTemplate");
	template = template.trim();
return  $tw.wiki.getTiddlerText(template)||$tw.wiki.getTiddlerText("$:/core/ui/ViewTemplate");
}

})();
