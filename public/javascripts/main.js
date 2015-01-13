window.onload = function() {
	var rssUrl = '//www.vg.no/rss/feed/forsiden/?frontId=1';
	var jsonUrl = '//rexxars.com/playground/testfeed/';
	var varnishUrl = '/javascripts/varnish.log';

	(function(){
		//init tabs code
		var currentTab = document.getElementsByClassName('tab-active')[0].childNodes[0];
		var tabs = document.getElementsByClassName('tab');
		for(var i=0; i < tabs.length; i++) {
			tabs[i].childNodes[0].addEventListener('click', function() {
				//tabs
				if(this !== currentTab) {
					currentTab = this;
					var j;
					var tabs = this.parentNode.parentNode.childNodes;
					for(j=0; j < tabs.length; j++ ) {
						tabs[j].className = "tab";
					}
					this.parentNode.className += " tab-active"
					//content
					var name = this.href.split('#')[1];
					var tabContent = document.getElementById(name + '-tab');
					var others = tabContent.parentNode.childNodes;
					for(j=0; j < others.length; j++) {
						others[j].className = "";
					}
					tabContent.className += " content-active";
				}
			});
		}
	})();

	MyApp.getVarnish(varnishUrl);
	MyApp.getRSS(rssUrl);
	MyApp.getJSONP(jsonUrl);
	
};