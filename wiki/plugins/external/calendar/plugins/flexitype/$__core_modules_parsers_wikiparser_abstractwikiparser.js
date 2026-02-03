/*\
title: $:/core/modules/parsers/wikiparser/abstractwikiparser.js
type: application/javascript
module-type: global

base class- individual wikiparser inherit from this class

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var AbstrWikiParser = function(specifier) {
	
	this.type = specifier.type;
	this.source = specifier.source;
	this.options =specifier.options;
	this.wiki = this.options.wiki;
	this.pragmaRuleClasses=specifier.pragmaRuleClasses;
	this.blockRuleClasses=specifier.blockRuleClasses;
	this.inlineRuleClasses=specifier.inlineRuleClasses;
	this.sourceLength = this.source.length;
	// Set current parse position
	this.pos = 0;
	// Instantiate the pragma parse rules
	this.pragmaRules = this.instantiateRules(this.pragmaRuleClasses,"pragma",0);
	// Instantiate the parser block and inline rules
	this.blockRules = this.instantiateRules(this.blockRuleClasses,"block",0);
	this.inlineRules = this.instantiateRules(this.inlineRuleClasses,"inline",0);
	// Parse any pragmas
	this.tree = [];
	var topBranch = this.parsePragmas();
	// Parse the text into inline runs or blocks
	if(this.options.parseAsInline) {
		topBranch.push.apply(topBranch,this.parseInlineRun());
	} else {
		topBranch.push.apply(topBranch,this.parseBlocks());
	}
	// Return the parse tree
};

AbstrWikiParser.prototype =Object.create( 
	require("$:/core/modules/parsers/wikiparser/wikiparser.js")["text/vnd.tiddlywiki"].prototype);

exports["AbstrWikiParser"] = AbstrWikiParser;

})();
