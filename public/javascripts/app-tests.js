describe("MyApp", function() {

	it("should exist", function() {
		expect(MyApp).toBeDefined();
	});

	describe("RSS parser", function() {
		it("should return empty array if string is not xml", function() {
			//not xml data
			var parsedData = MyApp.parseRss("Some string data");
		  	expect(parsedData).toEqual([]);
		});

		it("should return array of length equal to count of items", function(){
			//simple xml string, 2 empty items
			var someData = "<?xml version='1.0' encoding='UTF-8'?><rss>";
		  	someData += "<item></item><item></item></rss>";

		  	var parsedData = MyApp.parseRss(someData);
		  	expect(parsedData.length).toBe(2);
		});

		it("should sort returned array by date (latest first)", function(){
			//simple xml string, 2 items containing title and pubDate
			var someData = "<?xml version='1.0' encoding='UTF-8'?><rss>";
		  	someData += "<item><title>Older title</title><pubDate>Mon, 10 Jan 2014 09:22:11 +0100</pubDate></item>";
		  	someData += "<item><title>Newer title</title><pubDate>Mon, 12 Feb 2014 10:05:20 +0100</pubDate></item></rss>";

		  	var parsedData = MyApp.parseRss(someData);
		  	expect(parsedData[0]["title"]).toEqual("Newer title");
		});
	});

	describe("Varnish parser", function(){
		it("should return 1 hostname and 1 filename for a simple request", function(){
			var someData = '"GET http://sample.host.com/images/sample.jpg HTTP/1.1"';

			var parsedData = MyApp.parseVarnish(someData);
			expect(parsedData['hostnames'].length).toBe(1);
			expect(parsedData['filenames'].length).toBe(1);
		});

		it("should correctly count hostnames for requests", function(){
			//3 different requests with the same host
			var someData = 'GET http://sample.host.com/images/sample.jpg HTTP/1.1';
			someData += 'GET http://sample.host.com/ HTTP/1.1';
			someData += 'GET http://sample.host.com/asdf?2 HTTP/1.1';

			var parsedData = MyApp.parseVarnish(someData);
			expect(parsedData['hostnames'][0].key).toEqual('sample.host.com');
			expect(parsedData['hostnames'][0].count).toBe(3);
		});
	});

	describe("JSON data parser", function(){
		it("should return array of same length as parameter", function(){
			var someData = [
				{"title": "Sample1","link": "http://www.foo.com"},
			    {"title": "Sample2","link": "http:/sample.domain.com/index.html"},
			];
			
			var result = MyApp.parseJSON(someData);
			expect(result.length).toBe(2);
		});

		it("should sort items by date", function(){
			var someData = [
				{"title": "Sample1","link": "http://www.foo.com","date": "20 Januar 2012","time": "18:00",},
			    {"title": "Sample2","link": "http:/sample.domain.com/index.html","date": "13 Februar 2012","time": "12:00"},
			];

			var result = MyApp.parseJSON(someData);
			expect(result[0].title).toEqual("Sample2");
		});
	});
});
