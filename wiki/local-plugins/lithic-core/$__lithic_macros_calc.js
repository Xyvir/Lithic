/*\
title: $:/lithic/macros/calc
type: application/javascript
module-type: macro

Macro to evaluate arithmetic.
Usage: 
  <<calc "3+3">>   -> Returns "6" (Plaintext)
  <<calc "3+3=">>  -> Returns "$$ 3+3=6 $$" (KaTeX with formatting)
\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    exports.name = "calc";

    exports.params = [
        { name: "equation" }
    ];

    exports.run = function (equation) {
        try {
            // 0. CHECK MODE: Does it end with "="?
            var rawEq = equation.trim();
            var showKatex = false;

            if (rawEq.endsWith("=")) {
                showKatex = true;
                rawEq = rawEq.slice(0, -1);
            }

            // 1. EXPAND
            var expandedEquation = $tw.wiki.renderText(
                "text/plain",
                "text/vnd.tiddlywiki",
                rawEq,
                { parentWidget: this.parentWidget }
            );

            // 2. PREPARE FOR CALCULATION
            var calcString = expandedEquation
                .replace(/\^/g, "**")
                .replace(/sqrt/g, "Math.sqrt");

            // 3. SECURITY CHECK
            if (/[^0-9+\-*/(). \t\r\nMath.sqrt]/.test(calcString.replace("Math.sqrt", ""))) {
                return showKatex ? "$$ \\text{Error} $$" : "Error";
            }

            // 4. SOLVE
            var result = Function('"use strict";return (' + calcString + ')')();

            // --- IF PLAINTEXT MODE, RETURN NOW ---
            if (!showKatex) {
                if (!Number.isInteger(result) && isFinite(result)) {
                    return parseFloat(result.toFixed(4)).toString();
                }
                return result.toString();
            }

            // --- KATEX FORMATTING LOGIC ---

            // A. Format the Result
            var resultStr = result.toString();
            var formattedResult = resultStr;

            // Check for Infinity
            if (result === Infinity) {
                formattedResult = "\\infty";
            } else if (result === -Infinity) {
                formattedResult = "-\\infty";
            }
            // Check for repeating decimals / irrational
            else if (resultStr.length > 10 && resultStr.includes('.')) {
                if (/3{5,}$/.test(resultStr)) {
                    formattedResult = resultStr.replace(/3{5,}$/, "") + "\\overline{3}";
                }
                else if (/6{5,}7?$/.test(resultStr)) {
                    formattedResult = resultStr.replace(/6{5,}7?$/, "") + "\\overline{6}";
                }
                else {
                    formattedResult = parseFloat(result.toFixed(4)) + "...";
                }
            }

            // B. Format the Equation
            var displayString = expandedEquation;

            displayString = displayString.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");

            var parts = displayString.split('/');
            if (parts.length === 2) {
                displayString = "\\frac{" + parts[0].trim() + "}{" + parts[1].trim() + "}";
            } else {
                displayString = displayString.replace(/\//g, "\\div");
            }

            displayString = displayString
                .replace(/\*/g, "\\times")
                .replace(/\^/g, "^");

            return "$$ " + displayString + " = " + formattedResult + " $$";

        } catch (e) {
            console.log("Calc Macro Error:", e);
            return showKatex ? "$$ \\text{Calc Error} $$" : "Error";
        }
    };

})();