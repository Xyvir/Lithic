/*\

Example macro which this plugin has automatically integrated with Relink

\*/

exports.name = "3rd";

exports.params = [
	{name: "tiddler"}
];

exports.run = function(tiddler) {
	return "3rd macro called with: " + tiddler;
};