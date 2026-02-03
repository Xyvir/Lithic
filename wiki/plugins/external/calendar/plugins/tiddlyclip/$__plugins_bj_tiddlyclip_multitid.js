exports.name ="tomultid";
exports.run  = function(IMPORT_TITLE,tiddler)
	{

	var tiddlers = [tiddler];

	// Get the current $:/Import tiddler
	var importTiddler = $tw.wiki.getTiddler(IMPORT_TITLE),
		importData = $tw.wiki.getTiddlerData(IMPORT_TITLE,{}),
		newFields = new Object({
			title: IMPORT_TITLE,
			type: "application/json",
			"multitid-type": "vault"
		}),
		incomingTiddlers = [];
	// Process each tiddler
	importData.tiddlers = importData.tiddlers || {};
	$tw.utils.each(tiddlers,function(tiddlerFields) {
		var title = tiddlerFields.title;
		if(title) {
			incomingTiddlers.push(title);
			importData.tiddlers[title] = tiddlerFields;
		}
	});

	// Save the $:/Import tiddler
	newFields.text = JSON.stringify(importData,null,$tw.config.preferences.jsonSpaces);
	$tw.wiki.addTiddler(new $tw.Tiddler(importTiddler,newFields));
	// Update the story and history details

	return "saved";
};


