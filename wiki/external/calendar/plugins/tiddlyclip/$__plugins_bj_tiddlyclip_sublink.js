exports.name ="sublink";
exports.run  = function(link,global) {
	var here = (this.document.location.toString().split("#")[0]).replace(/(.*)\/.*?$/,"$1");
	var  pos = -1;
	pos = link.indexOf(here);
	if (!global && pos === 0) return "./" + link.substr(here.length+1);
	return link;
}

