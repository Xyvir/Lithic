/*\
title: $:/lithic/macros/calc
type: application/javascript
module-type: macro

Macro to evaluate infix arithmetic strings.
Usage: <<calc "1 + 2">> or <<calc "{{!!field}} * 5">>
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.name = "calc";

exports.params = [
    {name: "equation"}
];

exports.run = function(equation) {
    try {
        // 1. EXPAND: Turn {{!!field}} or {{tiddler}} into actual numbers using the Wiki Text parser
        var expandedEquation = $tw.wiki.renderText(
            "text/plain", 
            "text/vnd.tiddlywiki", 
            equation, 
            { parentWidget: this.parentWidget }
        );

        // 2. CLEAN: Remove anything that isn't a number or math symbol (security)
        // Allowed: 0-9 . + - * / ( ) and spaces
        if (/[^0-9+\-*/(). \t\r\n]/.test(expandedEquation)) {
            return "Err: Invalid Char";
        }

        // 3. SOLVE: Run the math
        var result = Function('"use strict";return (' + expandedEquation + ')')();

        // 4. FORMAT: Return the result (optional: .toFixed(2) if you want decimals limited)
        return result;

    } catch (e) {
        console.log("Calc Error:", e);
        return "Err";
    }
};

})();