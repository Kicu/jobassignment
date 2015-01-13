var MyApp = (function () {

	//templates, they are small and simple so we store them as strings
	var rssTmpl = '{{#items}}<div class="infobox"><h3><a target="_blank" href="{{link}}">{{title}}</a></h3><p>{{date}}</p></div>{{/items}}';
	var jsonTmpl = '{{#items}}<div class="infobox"><h3><a target="_blank" href="{{link}}">{{title}}</a></h3><p>{{myDate}}</p><p>{{description}}</p></div>{{/items}}';
	var varnishTmpl = '<div class="infobox"><h3>Most requested hostnames</h3>{{#hosts}}<p>{{key}} ({{count}})</p>{{/hosts}}</div><div class="infobox"><h3>Most requested files</h3>{{#files}}<p>{{key}} ({{count}})</p>{{/files}}</div>'

	//will help with creating Date obj from strings
	var monthNames = {
		'Januar': 'January', 
		'Februar': 'February', 
		'Mars': 'March', 
		'April': 'April', 
		'Mai': 'May',
		'Juni': 'June', 
		'Juli': 'July', 
		'August': 'August', 
		'September': 'September',
		'Oktober': 'October',
		'November': 'November',
		'Desember': 'December'
	};
	/**
	 * Tests browser for available XHR to use with CORS
	 * @param {string} method The method (get or post)
	 * @param {string} url The url to use in request
	 * @returns {object | Boolean} The object to perform the request or false if there is none
	 */
	function createCORSRequest(method, url) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			// Check if XMLHttpRequest object has a "withCredentials" property as it only exists on XMLHttpRequest2
			xhr.open(method, url, true);
		} else if (typeof XDomainRequest != "undefined") {
			// in case of ie9 we need XDomainRequest
			xhr = new XDomainRequest();
			xhr.open(method, url);
		} else {
			return false;
	  	}
	  	return xhr;
	}
	/**
	 * Helper function that takes flat object and creates an array of objects
	 * @param {object} obj The object
	 * @returns {object} The array created from object
	 */
	function objToArray(obj) {
		var arr = [];
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
	    		arr.push({'key':key, 'count':obj[key]});
			}
		}
		return arr;
	}
	//public methods
	return {
		//----------- VG rss -----------

		/**
		 * Function parses xml string searching for items with properties 'title', 'pubDate' and 'link'
		 * Returns array of parsed elements sorted by pubDate so that the newest are first
		 * @param {string} rssString A string representing xml data	 
		 * @returns {object} Array of items extracted from xml, empty array if there were none or string was invalid
		 */
		parseRss: function (rssString) {
			var tmp = new DOMParser;
			var rssXML = tmp.parseFromString(rssString, "text/xml" );
			//we are using basic XML DOM both for cross-browser compatibility 
			//and because the file has simple structure
			var rssData = [];
			//get all items
			var articles = rssXML.getElementsByTagName('item');
			var i,j;
			for(i=0; i < articles.length; i++) {
				var articleNodes = articles[i].childNodes;
				var article = {};
				//extract title, pubDate and link from each item
				for(j=0; j < articleNodes.length; j++) {
					if(articleNodes[j].nodeName === 'title') {
						article.title = articleNodes[j].childNodes[0].nodeValue;
					} else if(articleNodes[j].nodeName === 'pubDate') {
						article.date = articleNodes[j].childNodes[0].nodeValue;
					} else if(articleNodes[j].nodeName === 'link') {
						article.link = articleNodes[j].childNodes[0].nodeValue;
					}
				}
				rssData.push(article);
			}
			//sort by date, newest first
			rssData.sort(function(a, b) {
				return new Date(b.date) - new Date(a.date);
			});
			return rssData;
		},
		/**
		 * Function downloads and parses rss feed using CORS then renders it using Mustache
		 * @param {string} url The url of rss feed
		 */
		getRSS:	function(url) {
			var xhr = createCORSRequest('GET', url);
			if(xhr) {
				xhr.onload = function() {
					var rssXML = xhr.responseText;
					var rssData = MyApp.parseRss(rssXML);

					var elem = document.getElementById('rss-data');
					elem.innerHTML = Mustache.render(rssTmpl, {'items':rssData});
				}
				xhr.send();
			}
		},

		//----------- Varnish.log -----------

		/**
		 * Function takes text data from varnish file and parses it
		 * The return value is object with 2 arrays, one for hostnames and one for filenames
		 * Each array is holding objects with following data: 'key' - hostname/filename, 'count' - number of occurences
		 * Arrays are sorted according to the value of count
		 * @param {string} textData Text data from varnish.log
		 * @returns {object} The object holding 2 arrays with hostnames/filenames counted and sorted (biggest first)
		 */
		parseVarnish: function (textData) {
			var hostnames = {}, 
			files = {}, 
			tmpReq;
			//regex to catch all requests like:
			//GET http://www.vgtv.no/video/img/94949_160px.jpg
			var regex = /(GET|POST|PURGE) http:\/\/([\d\w\.\-\?\%\=\[\]\&\,\;\%\+\/])+/g;
			var requests = textData.match(regex);
			//now we iterate over the requests and extract the hostname and file
			for(var i=0; i < requests.length; i++) {
				tmpReq = requests[i].split('/');
				//hostname is the third element from split ("GET http://<hostname>/")
				if(tmpReq[2] in hostnames) {
					hostnames[tmpReq[2]]++;
				} else {
					hostnames[tmpReq[2]] = 1;
				}
				//file is the last element from split, we check for empty string in case there is no file
				//the last element can also be query string ?xyz so we check for dot, as files should be with extension
				if(tmpReq[tmpReq.length-1] != "" && tmpReq[tmpReq.length-1].indexOf('.') !== -1) {
					if(tmpReq[tmpReq.length-1] in files) {
						files[tmpReq[tmpReq.length-1]]++;
					} else {
						files[tmpReq[tmpReq.length-1]] = 1;
					}
				}
			}
			//we have objects with properties hostname/file:number_of_occurences
			//now we can translate them to arrays so the sorting will become much easier
			var hostsArr = objToArray(hostnames).sort(function(a,b){
				return b['count'] - a['count'];
			});
			var filesArr = objToArray(files).sort(function(a,b){
				return b['count'] - a['count'];
			});
			return {
				'hostnames': hostsArr,
				'filenames': filesArr
			}
		},
		/**
		 * Downloads and parses varnish.log, then renders the data
		 * @param {string} url The url of varnish.log
		 */
		getVarnish: function(url) {
			//plain simple XHR as we dont need to get the file from different origin
			var xhr = new XMLHttpRequest();
			xhr.open('get', url, true);
			xhr.onreadystatechange = function() {
				if(xhr.readyState === 4) {
					var varnishData = MyApp.parseVarnish(xhr.responseText);
					var elem = document.getElementById('varnish-data');
					mData = {
						'hosts': varnishData['hostnames'].slice(0,5),
						'files': varnishData['filenames'].slice(0,5),
					}
					elem.innerHTML = Mustache.render(varnishTmpl, mData);
				}
			}
			xhr.send();
		},

		//----------- JSON data -----------

		/**
		 * Parses JSON data and sorts it by date
		 * It translates month names to english in order to create Date object from them
		 * @param {object} data The data
		 * @returns {object} The array created from object
		 */
		parseJSON: function (data) {
			var i;
			for(i=0; i < data.length; i++) {
				if('date' in data[i] && 'time' in data[i]) {
					//translate foreign month name to english
					var dateName = data[i].date.replace(/(\d+) ([A-Za-z]+) (\d+)/g, function(str,day,month,year) {
				   		return (monthNames[month]) ? day +' '+ monthNames[month] +' '+ year : str;
					});
					data[i].myDate = dateName + ' ' + data[i].time;
				} else {
					//if no date specified, this item will later get the date 01.01.1970 and will be at the bottom
					data[i].myDate = 0;
				}
			}
			//sort by date, newest first
			data.sort(function(a, b) {
				return new Date(b.myDate) - new Date(a.myDate);
			});
			return data;
		},
		/**
		 * Downloads JSON feed by injecting new script element into document and performing JSONP request
		 * @param {string} url The url to call
		 */
		getJSONP: function(url) {
			var script = document.createElement('script');
			script.src = url + '?callback=MyApp.handleJSONP';
			document.getElementsByTagName('head')[0].appendChild(script);
		},
		/**
		 * Callback for jsonp, parses data then renders it
		 * @param {string} data The data from server
		 */
		handleJSONP: function(data) {
			var jsonData = MyApp.parseJSON(data);

			var elem = document.getElementById('json-data');
			elem.innerHTML = Mustache.render(jsonTmpl, {'items':jsonData});
		}
	};
})();