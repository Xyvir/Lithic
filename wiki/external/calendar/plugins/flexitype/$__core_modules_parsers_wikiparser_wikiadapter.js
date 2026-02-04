/*\
title: $:/core/modules/parsers/wikiparser/wikiadapter.js
type: application/javascript
module-type: global

overrides for wiki.js

\*/
(function(){
	
var wiki = require("$:/core/modules/wiki.js");
wiki.mergesetting = function(items, adjustitems) {
	if (!adjustitems) return;//nothing to do
	$tw.utils.each(adjustitems,function(adjustitem, listname) {
		if (!!items[listname]) {
			if (items[listname] instanceof Array) {//merge lists
				var i,baselen=items[listname].length;
				for (var j=0; j<adjustitem.length; j++){
					for ( i=0; i<baselen; i++) {
						if (adjustitem[j]===items[listname][i]) break;
					}
					if (i===baselen) items[listname].push(adjustitem[j]);
				}
			} else {
				items[listname]=adjustitem;//override item
			}
		} else items[listname]=adjustitem;//add new item
		
	})
}
/*
recursive function, retrives parseroptions from tiddlers/files
returns preparser, baseparser type and parserrules
*/
wiki.makeparsers=function(type,text,options){
	var returns={};
		
		var typeParts = type.split(";flexibility=");
		if (typeParts.length >1) {
			var typeDialog =typeParts[1];//alert(typeDialog);
			var  readdata=$tw.wiki.getTiddlerData(typeDialog);
			//read json tid (typeDialog )containing:
				// one string var of preparser eg text/type>html  
				// baseparser
				// parserdata
				// concaternate parserdata with baseparser -recursive
				// overload baserparser's preparser with this preparser
			if (!!readdata) {
				if (!!readdata.baserules) 
					returns=this.makeparsers(readdata.baserules,text,options);
				if (!!readdata.parseAsInline) returns.parseAsInline =readdata.parseAsInline;
				if (!returns.parserrules) returns.parserrules = readdata.parserrules;
				else this.mergesetting(returns.parserrules,readdata.parserrules);
				returns.type = typeParts[0];//overrides basetype of baserules
				if (!!readdata.preparser) returns.preparser =readdata.preparser;//override baserule preparser	
				//alert(parserdata);
			}	else {
				returns.type=type;
				returns.parserrules=null;
				returns.preparser=null;
			}
		} else {
			returns.type=type;
			returns.parserrules=null;
			returns.preparser=null;
		}
		return returns;

}
wiki.prepasstext =function(preparser,text, options) {
	var preparserpart = preparser.split(">");
	return this.renderText(preparserpart[1],preparserpart[0],text,options);
}
/*
Parse a block of text of a specified MIME type
	type: content type of text to be parsed
	text: text
	options: see below
Options include:
	parseAsInline: if true, the text of the tiddler will be parsed as an inline run
*/
wiki.parseText = function(type,text,options) {
	options = options || {};
	var parserdata;
	// Select a parser
	if(type !== undefined) { //get type is undefined when built
		parserdata=this.makeparsers(type,text,options);
		type=parserdata.type;
		if (!!parserdata.parseAsInline) options.parseAsInline =parserdata.parseAsInline;
		if (!!parserdata.preparser) text = this.prepasstext.call(this,parserdata.preparser,text,options);
	}
	var Parser = $tw.Wiki.parsers[type];
	if(!Parser && $tw.config.fileExtensionInfo[type]) {
		Parser = $tw.Wiki.parsers[$tw.config.fileExtensionInfo[type].type];
	}
	if(!Parser) {
		Parser = $tw.Wiki.parsers[options.defaultType || "text/vnd.tiddlywiki"];
	}
	if(!Parser) {
		return null;
	}
	// Return the parser instance
	return new Parser(type,text,{
		parseAsInline: options.parseAsInline,
		wiki: this,
		_canonical_uri: options._canonical_uri,
		parserrules:(type !== undefined)?parserdata.parserrules:null 
	});
};
})();
