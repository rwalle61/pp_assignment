module.exports = function (app, router, fs, bodyParser, cookieParser) {

var bcrypt = require('bcrypt'); // TODO move to server.js?
var superagent = require('superagent');
var setCookie = require('set-cookie');

app.use('/events2017', router);

//get events search page
router.get('/index.html', function (req, res) {
	res.sendFile(__dirname + "/index.html");
});

//if logged in, responds with page. (if not logged in, client redirects to login page)
router.get('/admin.html', function (req, res) {
	//user: req.user
	res.sendFile(__dirname + "/admin.html");
});

//get login page
router.get('/login', function(req, res) {
	res.sendFile(__dirname + "/login.html");
});

router.get('/venues', function (req, res) {
	fs.readFile(__dirname + "/venues.txt", 'utf8', function (err, data) {
		if (err) res.status(400).json({error: "server error reading venues.txt"});

		var response = { venues: {} };

		var venues = JSON.parse(data);

		//integrate api. request http://api.eventful.com/json/venues/search?...&keywords=Restaurant&location=San+Diego

		for (var venue_id in venues) {
			var venue = venues[venue_id];

			//add the venue to response
			response.venues[""+venue_id] = venue;
		}
		res.json(response);
	});
});

router.get('/events/search', function (req, res) {
	fs.readFile(__dirname + "/events.txt", 'utf8', function (err, data) {
		if (err) {
			res.status(400).json({error: "error reading events.txt. Perhaps it is missing!"});
		}
		var events = JSON.parse(data);
		var response = {events: []};

		//rename parameter variables for readability
		var keywords = req.query.search;
		var dates = req.query.date;

		//if there is an invalid date, respond with error
		if (dates && invalidDate(dates)) {
			res.status(400).json({error: "invalid date"});
		} else {

			//get events from api and add to events list
			superagent.get('http://api.eventful.com/json/events/search?')
			.query({ app_key: "zNK5xdwznm4H6xGZ", keywords: 'concertina', location: 'UK' })
			.end((err, apiRes) => {
				if (err) {
					return console.log("n api GET request error");
				} else {
					console.log("\n api GET request successful");
					var apiEvents = JSON.parse(apiRes.text).events.event;
				}
				if (apiEvents) { //if event found from api
					//get relevant details from api
					for (var i = 0; i < apiEvents.length; i++) {
						var event = apiEvents[i];

						//parse date
						var eDate = new Date(event.start_time);
						eDate = eDate.toISOString();

						var apiEvent = {
							title: event.title,
							blurb: event.description,
							date: eDate,
							url: event.url,
							venue: {
								name: 		event.venue_name,
								postcode: 	event.postal_code,
								town: 		event.city_name,
								url: 		event.venue_url,
								icon: 		"",
								venue_id: 	event.venue_id
							}
						}
						events[event.id] = apiEvent;
					}
				}

				//if date not invalid, add events to response
				if (!keywords && !dates) { //no parameters
					//add all events (in api + events.txt) to response
					for (var eKey in events) {

						var event = events[eKey];
						event["event_id"] = eKey; //add on event_id property
						event = appendEVenueTo(event);

						//add the modified event to response
						response.events.push(event);
					}
				} else {

					//search for events in events.txt using parameters
					for (var eKey in events) {
						var event = events[eKey];
						event["event_id"] = eKey; //add on event_id property

						//if params match an event
						if ( titleMatch(event, keywords) || dateMatch(event, dates) ) {
							//append the event's venue to it
							event = appendEVenueTo(event);
							//add the modified event to response
							response.events.push(event);
						}
					}
				}
				res.status(200).json(response);
			});
		}
	});
});

function invalidDate(dates) {
	if (Array.isArray(dates)) {
		for (date of dates) {
			var d = new Date(date);
			if (isNaN(d.getTime())) return true;
		}
	} else { //dates is a single date
		var d = new Date(dates);
		if (isNaN(d.getTime())) return true;
	}
	return false;
}

function titleMatch(event, keywords) {
	if (keywords) {
		//if keywords is array
		if (Array.isArray(keywords)) {
			for (word of keywords) {
				if (event.title.indexOf(word)!= -1) return true;
			}
		} else { //keywords is a single word/string
			return event.title.indexOf(keywords)!= -1;
		}
	}
	return false;
}

function dateMatch(event, dates) {
	if (dates) {
		if (Array.isArray(dates)) {
			for (date of dates) {
				eventDate = new Date(event.date);
				searchDate = new Date(dates);
				eventDate.setHours(0,0,0,0);
				searchDate.setHours(0,0,0,0);
				return (eventDate - searchDate) == 0;
			}
		} else {
			eventDate = new Date(event.date);
			searchDate = new Date(dates);
			eventDate.setHours(0,0,0,0);
			searchDate.setHours(0,0,0,0);
			return (eventDate - searchDate) == 0;
		}
	}
	return false;
}

router.get('/events/get/:event_id', function (req, res) {
	fs.readFile( __dirname + "/events.txt", 'utf8', function (err, data) {
		if (err) {
			res.status(400).json({error: "error reading events.txt. Perhaps it is missing!"});
		}

		var events = JSON.parse(data);

		//search for event using event_id
		var found = false;
		for (var event_id in events) {
			if (!found && event_id == req.params.event_id) {
				found = true;
				var event = events[event_id];

				//append venue to event
				event = appendEVenueTo(event);

				res.status(200).json(event);
			}
		}
		if (!found) res.status(400).json({error: "no such event"});

	});
});

//returns the event with its venue appended to it
function appendEVenueTo(event) {
	var venues = JSON.parse(fs.readFileSync(__dirname + "/venues.txt")); //change this to async using callbacks OR a global variable

	//look for the desired venue_id in venues
	var eVenue = {name: "TBC"};

	for (var venue_id in venues) {
		if (venue_id == event.venue_id) {
			eVenue = venues[event.venue_id];

			//append key-value pair venue_id:v_? to the event's venue
			eVenue["venue_id"] = event.venue_id;

			//remove the key-value pair venue_id:v_? from event
			delete event["venue_id"];

			//add the key-value pair venue: eVenue
			event["venue"] = eVenue;
		}
	}
	return event;
}

router.post('/venues/add', isLoggedIn, function (req, res) {
	//if no name parameter, send error
	if (!req.body.name) {
		res.status(400).json({error: "no name parameter"});
	} else {
		//if okay
		fs.readFile( __dirname + "/venues.txt", 'utf8', function (err, data) {
			if (err) {
				res.status(400).json({error: "error reading venues.txt. Perhaps it is missing!"});
			}
			console.log("\n POST /venues/add fs.readFile (data) is: ");
			console.log(data);

			venues = JSON.parse(data);
			console.log("\n req.body.?");
			console.log(req.body);

			var newVenue =  {
					name: req.body.name,
					postcode: req.body.postcode,
					town: req.body.town,
					url: req.body.url,
					icon: req.body.icon
			};

			var newVenueKey = "v_" + (Object.keys(venues).length + 1);

			venues[newVenueKey] = newVenue;
			console.log("console.log(venues)");
			console.log(venues);

			//update venues.txt file
			var newVenuesFile = JSON.stringify(venues, null, 3);
			fs.writeFile('venues.txt', newVenuesFile, (err) => {
				if (err) throw err;
				console.log("\n fs.writeFile successful");
			})

			res.json(venues);
	  });
	}
});

router.post('/events/add', isLoggedIn, function (req, res) {
	//if no event_id parameter, send error
	if (!req.body.event_id) {
		res.status(400).json({error: "no event_id parameter"});
	} else if (!req.body.title) {
		res.status(400).json({error: "no title parameter"});
	} else if (!req.body.venue_id) {
		res.status(400).json({error: "no venue_id parameter"});
	/*} else if () { //date is ISO8601?
	//var dateIsISO8601 = (new Date(req.body.date)).getTime() > 0;
		res.status(400).json({error: "invalid date parameter"});*/
	} else {
		//if okay
		fs.readFile( __dirname + "/events.txt", 'utf8', function (err, data) {
			if (err) throw err;
			console.log("\n POST /events server data is: ");
			console.log(data);
			console.log(typeof data);

			events = JSON.parse(data);
			console.log("\n req.body.?");
			console.log(req.body);

			var newEvent =  {
					title: 	  req.body.title,
					blurb: 	  req.body.blurb,
					date: 	  req.body.date,
					url: 	  req.body.url,
					venue_id: req.body.venue_id
			};

			events[req.body.event_id] = newEvent;
			console.log(events);

			//update events.txt file
			var newEventsFile = JSON.stringify(events, null, 3);
			fs.writeFile('events.txt', newEventsFile, (err) => {
				if (err) throw err;
				console.log("\n fs.writeFile successful");

				res.json(events);
			})

	  });
	}
});

//route middleware for post requests. checks whether client is logged in (has auth_token)
function isLoggedIn(req, res, next) {
	var requestedUrl = req.protocol + '://' + req.get('Host') + req.baseUrl;
	superagent
	.get(requestedUrl + '/auth/token-check')
	.query({ token: req.body.auth_token, ip: req.ip })
	.end((err, resp) => {
		console.log("\n superagent.end");
		if (err) {
			console.log("\n notLoggedIn");
			res.status(400).json({error: "not logged in"});
		} else {
			console.log("\n isLoggedIn");
			console.log(resp.body);
			return next();
		}
	});
}

//process login form. send {username, password, and ip} to auth to check
router.post('/login/submit', function (req, res) {
	var requestedUrl = req.protocol + '://' + req.get('Host') + req.baseUrl;
	superagent
		.post(requestedUrl + '/auth/password-check')
		.send({ username: req.body.username })
		.send({ password: req.body.password })
		.send({ ip: req.ip })

		.end((err, response) => {
		console.log("\n post /login/submit superagent.end");
		if (err) {
			console.log("\n login failed");
			res.status(400).json({error: "Login failed."});
		} else {
			console.log("\n login success");
			setCookie('token', response.body.token, {
				path: '/',
				res: res,
				maxAge: 2*60*60 //expires in 2 hrs
			});
			res.status(200).json({success: "login successful"});
		}
	});
});

// ==============================================
// ============ authentication ==================
// ==============================================
var sessionLog = {
	s_Admin: {
		ip: "129.234.",
		token: "concertina",
	}/*,
	s_1: {
		ip: "127.0.0.1",
		token: "unknown",
	} */
};

//if username and password pair match a user, send token. (Client will save token in cookie)
router.post('/auth/password-check', function(req, res) {
	//check if username and password are match an existing user
	fs.readFile( __dirname + "/users.txt", 'utf8', function (err, data) {
		if (err) throw err;
		var users = JSON.parse(data);

		//rename parameters for readability
		var username = req.body.username;
		var password = req.body.password;
		var ip 		 = req.body.ip;

		console.log("post/auth/pass-check body, username, password, ip");
		console.log(req.body);
		console.log(username);
		console.log(password);
		console.log(ip);
		var loginSuccessful = false;

		//check if the parameters match a user in users.txt
		for (var userKey in users) {
			var user = users[userKey];
			var userFound = (username == user.username && password == user.password);

			//if match
			if (!loginSuccessful && userFound) {
				loginSuccessful = true;

				//generate auth_token
				var token = username + password + ip;
				bcrypt.hash(token, 10, function(err, token) {

				//save auth_token to sessionLog (with a time)
					var newSessionKey = "s_" + (Object.keys(sessionLog).length);
					var newSession = { ip: ip, token: token };
					sessionLog[newSessionKey] = newSession;
					console.log("\n password match. console.log(sessionLog)");
					console.log(sessionLog);

					res.json({token: token});
				});
			}
		}
		if (!loginSuccessful) res.status(400).json({error: "Login failed."});
	});
});

//responds with whether auth_token and IP pair is valid
router.get('/auth/token-check', function (req, res) {
	if (validToken(req.query.token, req.query.ip)) {
		res.status(200).json({success: 'Authorised, correct token'});
	} else {
		res.status(400).json({error: "not authorised, wrong token"});
	}
});

//returns true iff token and IP pair is valid
function validToken(auth_token, ip) {
	//check if auth token exists && matches correct ip address && is within 2 hours
	for (var sKey in sessionLog) {
		var session = sessionLog[sKey];

		var validToken = (auth_token == session.token);
		var validIP = (ip.indexOf(session.ip) != -1);

		console.log("\n console.log(validToken, validIP)");
		console.log(validToken);
		console.log(validIP);

		//if match
		if (validToken && validIP) return true;
	}
	return false;
}

}
