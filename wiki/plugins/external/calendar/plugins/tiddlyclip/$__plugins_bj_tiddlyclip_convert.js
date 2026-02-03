exports.name ="htmlToTW2";
exports.run  = function(text)
	{


	
	var toTW  =(function() {
	  var ELEMENT = this.Node?Node.ELEMENT_NODE:1,
			 TEXT = this.Node?Node.TEXT_NODE:   3,
			 CDATA= this.Node?Node.CDATA_SECTION_NODE:4,
		   COMMENT= this.Node?Node.COMMENT_NODE:  8;
	
		var Tname = {
		//need to add a flag the says only add a \n if not preceeded by \n
		
		// -- table --
		table   :[handleTabBg,handleTabEnd,''],//todo add handle end to add footer '
		thead	:[handleTheadBg, "",""],
		tbody	:[handleTbodyBg, "",""],
		tfoot	:[handleTfootBg, "",""],
		tr		:[trStart,trEnd,''],
		td		:[tdStart,tdEnd,''],
		th		:[tdStart,tdEnd,'th'],

		// -- heading --

		h1:["\newline!"			,"\n",""],
		h2:["\newline!!"		,"\n",""],
		h3:["\newline!!!"		,"\n",""],
		h4:["\newline!!!!"		,"\n",""],
		h5:["\newline!!!!!"		,"\n",""],
		h6:["\newline!!!!!!"	,"\n",""],
		
		// -- list --
		ul		:[""			,"\newline","ul"],
		ol		:[""			,"\newline","ol"],
		dl		:[""			,"\newline","dl"],
		li		:[handleBullit	,"","li"],
		dt		:[handleBullit	,"","dt"],
		dd		:[handleBullit	,"","dd"],
		
		// -- quoteByBlock --		
		// -- quoteByLine --
		blockquote:[handlebq, "\newline","bq"],
		
		// -- rule --
		// -- monospacedByLine --
		// -- wikifyComment --	
		// -- macro --
		// -- prettyLink --
		// -- wikiLink --
		// -- urlLink --
		a		:["[["			,handleLink,""], 
		
		// -- image --
		img		:[handleImg, '',''],
		
		// -- html --
		// -- commentByBlock --
		// -- characterFormat --
		b      :[ "''",  "''" ,""],
		strong :[ "''",  "''" ,""],
		i      :[ "//",  "//" ,""],
		em     :[ "//",  "//" ,""],
		u      :[ "__",  "__",""],
		sub    :[ "~~",  "~~",""],
		sup    :[ "^^",  "^^",""],
		strike :[ "--",  "--",""],
		
		// -- customFormat --
		span:[handleSPAN		,endDIV,""],	
		div:[handleDIV			,endDIV,""],	
		// -- mdash --
		hr:["<hr>"	,"",""],		
		// -- lineBreak --

		br		:[handleBreak,	"",""],
		
		// -- rawText --
		// -- htmlEntitiesEncoding --

		code   :[ "{{{",  "}}}",""],
		tt     :[ "{{{",  "}}}",""],
		pre   :[ "\newline{{{\n",  "\newline}}}\n",""]

		}	
		var MAXCOL=20;
		var spanDwCounters = new Array(MAXCOL);
		var colCount =0;	
		var intable=false;
		var foot,tofoot,head,footer;
		var divStackEmpty =[];
				
	  return function tw(el, outer, LOCALE,parentbullit) {
			var i = 0, j = el.childNodes, k='', m, n,
				l = j.length;
			var nodeFound=false, ind, bullit = [];
			if (!parentbullit) parentbullit = [];
			for (ind = 0; ind < parentbullit.length;ind++) bullit.push(parentbullit[ind]);
			
			if (outer) 
			{
				m = el.nodeName.toLowerCase();
				
				for (var name in Tname) {

					if (name === m) {
						k = typeof Tname[name][0] == "function"?
								Tname[name][0](el, outer, LOCALE,parentbullit):Tname[name][0];		
						
						//alert( "m="+m+" "+k);
						bullit.push(Tname[name][2]);//pass on tag to child for bulit list
						nodeFound = true;
						break;
					}
				}
			}
			var temp='';
			while(i !== l) switch((n = j[i++]).nodeType) {

			  case ELEMENT: temp +=tw(n, true, LOCALE,bullit); break;
			  case TEXT:    temp += doTrim(m,n.nodeValue); break;
			  case COMMENT: temp += "/% " +n.nodeValue +" %/";break;
			  

			} 
			if (tofoot===true) footer += temp; else k += temp;
			
			var kk='blank';
			if (!outer) return trimNl(k);
			for (var name in Tname) {
				if (name === m) {
					kk = (typeof Tname[name][1] == "function"?
								Tname[name][1](el, outer, LOCALE):Tname[name][1]);
					//return (k+Tname[name][1]);
					//alert ('kk '+kk);
					return k+kk;
				}
			}
			return k;
		}; 
		function attr(el,LOCALE) {
			var i = 0, j = el.attributes, k = new Array(l = j.length), l, nm,v;
			while(i !== l) {
				nm = j[i].nodeName ;
				v = j[i].value;
				k[i]='';
				//check to see if src is local, add path if it is 
				if ((nm==='src')||(nm==='href')){
					var pathStart = v.substring(0,4);
					
					if ((pathStart==='file') ||(pathStart === 'http'))
						k[i] +=nm + '="'+ v + '"'; 
					else {
						if (nm==='src') {
							if (!!LOCALE) {
								var locale = LOCALE.split('//');
								locale = locale[0]+'//'+locale[1].split('/')[0];
								k[i] +=nm +  '="'+ locale+v + '"';
							}
							else k[i] +=nm +  '="'+v + '"';
						}
						else
							k[i] +=nm +  '="'+ LOCALE+v + '"';	
					}
		
				}
				else
					k[i] +=nm + '="'+ v +'"';
				//alert(nm+" ="+v);
				i++;
			}
			return (l?" ":"") + k.join(" ");
	  }
		  
		function handleSPAN(el, outer, LOCALE,parentbullit,bullitstack) {
			var k = '{{"', style = '';
			var attrlist = attr(el,LOCALE);
			var empty = true;
			for (var i= 0;i< attrlist.length;i++) { 
				item = attrlist[i].split(':');

				if (item[0] ==='style'){
					k +=attrlist[i].substring(6,attrlist[i].length-1).replace(/"/g,"'")+";";
				   empty = false;
				}
			}
			divStackEmpty.push(empty);
			if (empty === true) return '';
			return k+'"{\newline';
		}

		function handleDIV(el, outer, LOCALE,parentbullit,bullitstack) {
			var k = '{{"', align = 'left',style = '';
			var attrlist = attr(el,LOCALE);
			var empty = true;
			for (var i= 0;i< attrlist.length;i++) { 
				item = attrlist[i].split(':');
				if (item[0] ==='align'){ 
					k +='align:'+item[1]+";";
					empty = false;
				}
				else if (item[0] ==='style') {
					k +=attrlist[i].substring(6,attrlist[i].length-1).replace(/"/g,"'")+";";
					empty = false;
				}
			}
			divStackEmpty.push(empty);
			if (empty === true) return '';
			return k+'"{\newline';
		}
		function endDIV() {
			if (divStackEmpty.pop() === true) return "";
			return '}}}';
		}	
		function doTrim(name, content) {
			var whiteSpace = /^\s+|\s+$/g;
			if (name!=='pre') return content.replace(whiteSpace, ' ');
			return content;
		}
	   function trimNl(k)
	   {
		   return k.replace (/(\newline)+/g,"\newline").replace (/\n\newline/g,"\n").
					replace(/\newline/g,"\n").          replace(/\n.*?\trim\|/g,"\n|").
					replace(/\|([h,f])\trim.*?\n/g,"|$1\n").     replace(/\trim/g,"");//replace(/\trim/g,"\n");tiddler	function
		  }
		function trimNewLines(k,term) { 
			if ((term.length >6) &&(term.substring(0,7) === '\newline')) {
				tt = term.substring(7,term.length);
				if ((k.length > 1) &&(k.substring(k.length-1,k.length)==='\n')) return k + tt;
				else return (k + '\n' + tt);
			}
			return k + term;
		}
		
		function handleBreak (el, outer, LOCALE,parentbullit,bullitstack) 	{
			if (intable === true) return '<<br>>';
			return "\n";
		}
		
		function handleBullit(el, outer, LOCALE,parentbullit,bullitstack) {
			var bullit;// = parentbullit[parentbullit.length-1];
			for (var i =0 ; i < parentbullit.length; i++) {
				bullit = parentbullit[parentbullit.length-1-i];
				if ((bullit === 'dl')||(bullit === 'ul')||(bullit === 'ol')) break;
			}
			//if (i === parentbullit.length) alert ("error");

			if ((this[2] ==='dt')&&(bullit === 'dl')){ return '\newline'+handleBullitList(parentbullit)+';';}
			if (bullit === 'ul') { return '\newline'+handleBullitList(parentbullit,parentbullit.length-1-i) +'*';}
			if (bullit === 'ol') { return '\newline'+handleBullitList(parentbullit,parentbullit.length-1-i)+'#';}
			if (bullit === 'dl') { return '\newline'+handleBullitList(parentbullit,parentbullit.length-1-i)+':';}
			return '';
		}


		function handleBullitList(parentbullit,end) {
			if (parentbullit.length < 1) return;
			
			var bullitInner = parentbullit[end-1];
			for (var i =end-1 ; i>-1; i--) {
				bullitInner = parentbullit[i];
				if ((bullitInner === 'dt')||(bullitInner === 'li')||(bullitInner === 'dd')) break;
			}
			if (i === end) { alert ("error"); return;}
			end = i;
			var bullitOuter = parentbullit[end-1];
			for (var i =end-1 ; i>-1; i--) {
				bullitOuter = parentbullit[i];
				if ((bullitOuter === 'dl')||(bullitOuter === 'ul')||(bullitOuter === 'ol')) break;
			}
			if (i === end) { alert ("error"); return;}
			//parentbullit=parentbullit.substring(0,parentbullit.length-4);
			
			if ((bullitInner ==='dt')&&(bullitOuter === 'dl')){ return handleBullitList(parentbullit,i)+';';}
			if (bullitOuter === 'ul') { return handleBullitList(parentbullit,i)+'*';}
			if (bullitOuter === 'ol') { return handleBullitList(parentbullit,i)+'#';}
			if (bullitOuter === 'dl') { return handleBullitList(parentbullit,i)+':';}
			return '';
		}
		function handleLink (el, outer, LOCALE) {
			return  '|' +el.getAttribute("href") +']]';
		}
		function handlebq (el, outer, LOCALE,parentbullit,bullitstack)	{
			var bullit;// = parentbullit[parentbullit.length-1];
			var outline = '\newline>';
			for (var i =parentbullit.length-1 ; i >-1; i--) {
				bullit = parentbullit[i];
				if (bullit === 'bq') outline += '>';
			}

			return outline;
		}


		function handleTabBg (el, outer, LOCALE,parentbullit,bullitstack) {
			for (var i = 0; i < MAXCOL; i++) spanDwCounters[i]=0;
			foot = false;
			tofoot = false;
			head = false;
			footer = '';
			return '';
		}
		function handleTheadBg() {
			head = true; //flag to put header char on each of row
			return '';
		}
		function handleTbodyBg() {
			tofoot=false;
			head = false;
			return '';
		}
		function handleTfootBg() {
			foot = true; //flag to put foot char on each of row
			tofoot =true;//when footer html is before body save to temp area then append
			return '';
		}
		function handleTabEnd(){
			if (foot===true)
			return footer + "f\newline"; //move footer to end of table
			else return '\newline';
			return '';
		}
		function trStart (el, outer, LOCALE,parentbullit,bullitstack) {
			colCount =0;
			if (tofoot===true) footer+='\newline'; else  return '\newline';
			return '';
		}
		function trEnd (){
		    if (tofoot===true) { footer+='|f\trim';return '';}
		    if (head===true) return  '|h\trim';
		    return '|\trim';
		}
		function tdStart (el, outer, LOCALE,parentbullit,bullitstack) {
			var k ='|';
			intable = true; //<br> are converted to <<br>> not newline due to tw formatting
			if (colCount === 0) k='\trim|';
			if 	(spanDwCounters[colCount] >1) {
				k +='~|';
				spanDwCounters[colCount]--;
			} else
				if (this[2]==='th') k +='!';
			var rowspan =  parseInt( el.getAttribute('rowspan'))|| 1;
			spanDwCounters[colCount]= rowspan;
			
			var colspan =  parseInt(el.getAttribute('colspan') )|| 1;
			//alert("colspan "+colspan);
			for (var i = 0; i<colspan-1; i++) k+='>|';
			
			var align = el.getAttribute('align') || 'none';
			var style = el.getAttribute('style') || '';
			if (style === 'text-align: center;') align = 'center';
			if (style ==='text-align: right;')   align = 'right' ;
			if ((align ==='center')||(align ==='right')) k+=' ';
			if (tofoot===true)footer+=k; else return k;
			return '';
		}
		
		function tdEnd (el, outer, LOCALE,parentbullit,bullitstack) {
			colCount +=1;
			intable = false;
			var align =  el.getAttribute('align') || 'none';
			var style = el.getAttribute('style') || '';
			if (style === 'text-align: center;') align = 'center';
			if (style ==='text-align: left;')   align = 'left' ;

			if (align ==='center') if (tofoot===true)footer+=' ';else return ' ';	
			if (align ==='left') if (tofoot===true)footer+=' '; else return ' ';
			if (tofoot===true)footer+='';else return '';
			return '';
			//if (tofoot===true) alert (footer);
		}

		function handleImg(el, outer, LOCALE,parentbullit,bullitstack) {
			var img = el.getAttribute('src');
			if (!img) return '';

			var pathStart = img.substring(0,4);

			if ((pathStart!=='file') && (pathStart !== 'http'))
			{
				var locale = LOCALE.split('//');
				locale = locale[0]+'//'+locale[1].split('/')[0];
				img= locale+img;	
			}	
			var alt = el.getAttribute('alt');
			var align = el.getAttribute('align');
			var title = el.getAttribute('title');

			var ret = "[";
			if (align === 'left') ret += "<" ;
			if (align === 'right') ret += ">" ;
			ret += "img[";
			if (title) ret += "$title|" 
			ret += (img+"]]");
			return ret;
		}
	})(); 
		var content = "<html><body>" + text + "</body></html>";
		// Create the iframe
		var iframe = document.createElement("iframe");
		iframe.style.display = "none";
		document.body.appendChild(iframe);
		var doc = iframe.document;
		if(iframe.contentDocument)
			doc = iframe.contentDocument; 
		else if(iframe.contentWindow)
			doc = iframe.contentWindow.document; 
		// Put the content in the iframe
		doc.open();
		doc.writeln(content);
		doc.close();
		// convert to tiddlytext
		var twcontent = toTW(doc.body);
		iframe.parentNode.removeChild(iframe);
		return twcontent;
}
///end convert///
