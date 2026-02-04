/*\
title: $:/lithic/modules/wikirules/calc-inline
type: application/javascript
module-type: wikirule

Wiki text rule for == equation == syntax
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.name = "calc-inline";
exports.types = {inline: true};

exports.init = function(parser) {
    this.parser = parser;
    // Regex to match == content ==
    // We use a non-greedy match (.*?) to allow multiple equations on one line
    this.matchRegExp = /==(.*?)==/mg;
};

exports.parse = function() {
    // Move past the match
    this.parser.pos = this.matchRegExp.lastIndex;
    
    // Get the equation text (captured group 1)
    var equation = this.match[1];

    // Return a macro call widget: <<calc "equation">>
    return [{
        type: "macrocall",
        name: "calc",
        params: [
            { name: "equation", value: equation }
        ]
    }];
};

})();