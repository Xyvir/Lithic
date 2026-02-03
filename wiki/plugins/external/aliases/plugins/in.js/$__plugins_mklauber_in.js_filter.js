/*\
title: $:/plugins/mklauber/in.js/filter.js
type: application/javascript
module-type: filteroperator

Filter operator returning the tiddlers whose are listed in the text reference in the operand tiddler
Specify a field as a suffix to compare the field on the input tiddlers to the list.

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Export our filter function
*/
exports.in = function(source,operator,options) {
	var results = [],
		tr = $tw.utils.parseTextReference(operator.operand),
		currTiddlerTitle = options.widget && options.widget.getVariable("currentTiddler"),
		list = options.wiki.getTiddlerList(tr.title || currTiddlerTitle,tr.field,tr.index),
		field = operator.suffix || "title";

	source(function(tiddler,title) {
		var value = tiddler.fields[field];
		if(list.indexOf(value) !== -1) {
			results.push(title);
		}
	});
	return results;
};

})();
