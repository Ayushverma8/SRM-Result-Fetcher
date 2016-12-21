var cheerio = require('cheerio');
var fs = require('fs');
var request = require('request');
var captcha = {
	options: {
		url: 'http://evarsity.srmuniv.ac.in/srmwebonline/Captcha',
		encoding: null
	},
};

exports.get = function(req, res) {
	var j = request.jar();
	captcha.options['jar'] = j;
	request(captcha.options, function (error, response, body) {
		if (!error) {
			this.req.session.jar = j.getCookieString(captcha.options.url);
			fs.writeFile("./public/img/captcha.jpg", body, function(err) {
					if(err) {
						this.res.send('Captcha rendering failed!');
					} else {
						this.res.render('home');
					}
			}.bind({'res' : this.res}));
		} else {
			console.log(error);
			this.res.send('Captcha retrieval failed!');
		}
	}.bind({'res': res, 'req': req}));
};

var results = {
	options: function (regNo, day, month, year, captcha) {
		return {
			url: 'http://evarsity.srmuniv.ac.in/srmwebonline/exam/onlineResult.jsp',
			method: 'POST',
			form: {
				'frmdate': year + '-' + month + '-' + day,
				'iden':'1',
				'txtRegisterno': regNo,
				'txtFromDate': day,
				'selMonth':	month,
				'txtYear':	year,
				'txtvericode':	captcha
	   	},
		  headers: {
	      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36',
			}
	  };
	}
};

exports.post = function(req, res) {
	console.log(req.body);
	if (req.session.jar) {
		if ((req.body.regno) && (req.body.dob) && (req.body.captcha)) {
			var regex = /([0-9]{4})-([0-9]{2})-([0-9]{2})/;
			if (req.body.dob.search(regex) != -1) {
				var date = req.body.dob.match(regex);
				var options = results.options(req.body.regno, date[3], date[2], date[1], req.body.captcha);
				options.headers['Cookie'] = req.session.jar;
				request(options, function (error, response, body) {
						req.session.jar = null;
						if (!error) {
							this.req.session.content = body;
							parser(this.res, this.req.session.content);
						} else {
							res.send("Portal error");
						}
					}.bind({'res': res, 'req': req})
				);
			} else {
				res.send('Date invalid');
			}
		} else {
			res.send('Form incomplete');
		}
	} else {
		res.status(404);
		res.render('404');
	}
};

function parser(res, data) {
	"use strict";
	//console.log("A");
	let $ = cheerio.load(data);

	//Details Extraction
	var x = "";
	var details = {};
	$('td.dynaColorTR1').each(function detailsRowExtraction(index, element){
		if (index % 2 === 0) {
			x = $(element).text().trim();
		} else {
			details[x] = $(element).text().trim();
		}
	});

	//Column Header Extraction			
	var th = [];
	$('table').last().find('tr:nth-of-type(1) td').each(function columnHeaderExtract(index, element) {
		th.push($(element).text().trim());
	});
	
	//Subjects Detail Extraction
	var result = [];
	$('table').last().find('tr').each(function subjectIterate(index, element){
		var subject = {};
		if (index > 0) {
			$(element).find('td').each(function SubjectDetailExtraction(index, element) {
				var value = $(element).text().trim();
				if (value) {
					subject[th[index]] = value;
				}
			});
			result.push(subject);
			subject = {};
		}
	});
	
	//GPA Calculation
	let grades = {'S': 10, 'A': 9, 'B': 8, 'C': 7, 'D': 5, 'U': 0, 'I': 0, 'W': 0};
	let totalCredits = 0;
	let sum = 0;
	for (let i = 0, credits = 0; i < result.length; i++) {
		credits = parseInt(result[i]['CREDIT'])
		totalCredits += credits;
		sum += grades[result[i]['GRADE']]*credits;
	}
	
	//Display Results
	res.render('result', {
		'details': details,
		'subjects': result,
		'GPA': (sum/totalCredits).toFixed(2)
	});
};
