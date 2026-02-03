/*\
title: $:/core/modules/parsers/wikiparser/basewikiparser.js
type: application/javascript
module-type: parser

The base wiki text parser

This implementation is sub-optional, it 'steals' its defintion from the text/vnd.tiddlywiki,
it would be better that the text/vnd.tiddlywiki was split into an abstract base and a realisation
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";
function override(a, b) {
  var hash = {};
  return a.concat(b).filter(function (val) {
    return hash[val] ? 0 : hash[val] = 1;
  });
}
var createClassesList= function (ruleList,userlist,nativelist) {
	var temp ={};
	for (var i=0;i<ruleList.length;i++) {
		var rule = ruleList[i];
		var found = false;
		if (!!userlist) 
			if (Object.prototype.hasOwnProperty.call(userlist,rule)) {
				temp[rule] = userlist[rule];
				found = true; 
			}
		if (!found) 
			if (Object.prototype.hasOwnProperty.call(nativelist,rule)) {
				temp[rule] = nativelist[rule];
			}
		
	}
	return temp;
};
var ParserPrimer = function(type,text,options) {
	//BJ meditation if I pass in the complete type here, then I could use this to cache the 
	//Parser objects.
	if(!this.pragmaRuleClasses) {
		ParserPrimer.prototype.pragmaRuleClasses = $tw.modules.createClassesFromModules("wikirule","pragma",$tw.WikiRuleBase);
	}
	if(!this.blockRuleClasses) {
		ParserPrimer.prototype.blockRuleClasses = $tw.modules.createClassesFromModules("wikirule","block",$tw.WikiRuleBase);
	}
	if(!this.inlineRuleClasses) {
		ParserPrimer.prototype.inlineRuleClasses = $tw.modules.createClassesFromModules("wikirule","inline",$tw.WikiRuleBase);
	}
	if(!this.userClasses) {
		ParserPrimer.prototype.userClasses = $tw.modules.createClassesFromModules("wikirule","user",$tw.WikiRuleBase);
	}

    if (!!options.parserrules) {//if($tw.browser)alert("createrules");
		if (!!options.parserrules.pragmaRuleList)this.pragmaRuleClasses=createClassesList(options.parserrules.pragmaRuleList, this.userClasses, this.pragmaRuleClasses);
		if (!!options.parserrules.blockRuleList)this.blockRuleClasses=createClassesList(options.parserrules.blockRuleList, this.userClasses, this.blockRuleClasses);
		if (!!options.parserrules.inlineRuleList)this.inlineRuleClasses=createClassesList(options.parserrules.inlineRuleList, this.userClasses, this.inlineRuleClasses);
	}
	for (var i = 0;i<this.blockRuleClasses.length;i++) alert (this.blockRuleClasses[i].rule.name);
	// Save the parse text
	this.type = type || "text/vnd.twbase";
	this.source = text || "";
	this.options = options;
};
//realise the parser from the abstr parser
var  BaseWikiParser5= function (type,text,options) { 
	require("$:/core/modules/parsers/wikiparser/abstractwikiparser.js")["AbstrWikiParser"].
												call(this,new ParserPrimer(type,text,options));
}
BaseWikiParser5.prototype =Object.create( 
	require("$:/core/modules/parsers/wikiparser/abstractwikiparser.js")["AbstrWikiParser"].prototype);

exports["text/vnd.twbase"] = BaseWikiParser5;

})();

