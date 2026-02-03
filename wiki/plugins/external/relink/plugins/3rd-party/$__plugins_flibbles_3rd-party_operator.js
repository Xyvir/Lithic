/*\

Example filter operator which this plugin has automatically integrated with Relink.
This is just a generator that return the third word in the operand tiddler's text.

\*/

exports["3rd"] = function(source,operator,options) {
	var tiddler = options.wiki.getTiddler(operator.operand);
	if (tiddler) {
		var match = /\S+\s+\S+\s+(\S+)/.exec(tiddler.fields.text);
		if (match) {
			return [match[1]];
		}
	}
	return [];
};