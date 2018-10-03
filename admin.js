$(function(){ //document(ready)

var baseUrl = (window.location.protocol + "//" + window.location.host + "/events2017");
console.log(baseUrl);

$("#link_to_search").attr('href', baseUrl + '/index.html');

//if auth_token not defined, forward to login page
if (jQuery.isEmptyObject(Cookies.get())) {
	alert("Not authorised to view page. Redirecting to Login page");
	window.location.replace(baseUrl + "/login");
}

//show venues
updateVenuesTable();

//on button click, add newVenueForm
$("#venue_form_btn").click(function(e) {
	e.preventDefault();
	$('#new_venue_form').show();
	$('html, body').animate({
		scrollTop: $("#new_venue_form").offset().top
	}, 700);

	$("#divForAddingEvents").hide();

	$("#confirm_btn").show();
	$("#venue_form_btn").hide();
});

//on button click, add venue
$("#confirm_btn").click(function(e) {
	e.preventDefault();
	addVenue();

	$("#venue_form_btn").show();
	$("#confirm_btn").hide();
});

//updates venues.txt
function addVenue() {
	//assemble the venue to add from the forms
	var newVenue =  {
				name:		""+ $('#new_venue_name').val(),
				postcode: 	""+ $('#new_venue_postcode').val(),
				town:		""+ $('#new_venue_town').val(),
				url:		""+ $('#new_venue_url').val(),
				icon:		""+ $('#new_venue_icon').val(),

				auth_token:	Cookies.get("token")
	};

	//POST new venue to venues.txt through server.js
	$.post(baseUrl + '/venues/add', newVenue, "json")
		.done( data => {
			console.log("/venues/add .done data is ");
			console.log(data);
			console.log(typeof data);
			//update page
			updateVenuesTable();
		})
		.fail( (xhr, textStatus, errorThrown) => {
			var errMsg = JSON.parse(xhr.responseText);
			if (errMsg.error == "not authorised, wrong token") {
				alert("Error: "+ errMsg.error + ". Redirecting to Login page");
				window.location.replace(baseUrl + "/login");
			} else {
				alert("Error: "+ errMsg.error);
				$('#new_venue_form').remove();
			}
		});
}

//get data, turn to html, then show in table
function updateVenuesTable() {
	$.getJSON(baseUrl + '/venues', (data) => {
	 	console.log("\n updateVenuesTable");
		console.log(data);

		//update html
		//delete existing table
		$("#venue_rows").html("");
		//rebuild venues
		var venues = data.venues;
		for (venue_id in venues) {
			var venue = venues[venue_id];
			addVenueToTable(venue_id, venue);
		}
	});

	//scroll to venue table
	$('html, body').animate({
		scrollTop: $("#venue_table").offset().top
	}, 700);
}

	function addVenueToTable(venue_id, venue) {
		var venueRowHTML = '<tr id='+ venue_id + '>'
							 + '<td>'+venue_id+'</td>'
							 + '<td>'+venue.name+'</td>'
							 + '<td>'+venue.postcode+'</td>'
							 + '<td>'+venue.town+'</td>'
							 + '<td>'+venue.url+'</td>'
							 + '<td><img src="' + venue.icon+ '" alt=venue icon  style="display:block; width:100%; height:auto;"></td>'
							 + '</tr>';

		setAddEventOnClick(venue_id, venue.name);

		$('#venue_table').append(venueRowHTML);
	}

	function setAddEventOnClick(venue_id, venue_name) {
		$(document).on("click", "#"+venue_id, function(){
			//show table
			$("#divForAddingEvents").show();
			//scroll to it
			$('html, body').animate({
				scrollTop: $("#divForAddingEvents").offset().top
			}, 700);

			$("#new_venue_form").hide();
			$("#confirm_btn").hide();
			$("#venue_form_btn").show();



			//update header of table
			$("#venue_name").text(venue_name);

			//show events at the venue?

			//prep button. on click, add the event using the form data
			$(document).on("click", "#addEventButton", function(){

				addEventToVenue(venue_id);
				//update list of events at the venue?
			})
		});
	}

function addEventToVenue(venue_id) {
	console.log("\n console.log(venue_id)");
	console.log(venue_id);

	//assemble the event to add from the forms
	var newEvent =  {
		event_id:""+ $('#new-e-event_id').val(),
		title:	""+ $('#new-e-title').val(),
		blurb:	""+ $('#new-e-blurb').val(),
		date:		""+ $('#new-e-date').val(),
		url:		""+ $('#new-e-url').val(),
		venue_id:venue_id,

		auth_token:	Cookies.get("token")
	};

	//POST new event to events.txt through server.js
	$.post(baseUrl + '/events/add', newEvent, "json")
		.done( data => {
			console.log("/events/add data is ");
			console.log(data);
			console.log(typeof data);
			$("#divForAddingEvents").hide();
			alert("event successfully added");
			//update page?
		})
		.fail( (xhr, textStatus, errorThrown) => {
			var errMsg = JSON.parse(xhr.responseText);
			if (errMsg.error == "not authorised, wrong token") {
				alert("Error: "+ errMsg.error + ". Redirecting to Login page");
				window.location.replace(baseUrl + "/login");
			} else {
				alert("Error: "+ errMsg.error +". Please try again.");
			}
		});
}

//checkAuthToken();
function checkAuthToken() {
	//check with server whether cookie (auth_token) is valid
	$.getJSON(baseUrl + '/auth')
		.done() //if correct, do nothing (allows page to be shown)
		.fail( (xhr, textStatus, errorThrown) => {
			alert("Not authorised to view page. Redirecting to Login page");
			window.location.replace(baseUrl + "/login");
	});
}

//logout (by deleting cookie auth_token) and redirect to index.html
$("#link_to_logout").click(function(e) {
	e.preventDefault();
	Cookies.remove("token", {path: '/'});
	alert("Logged out. Redirecting to event search page");
	window.location.replace(baseUrl + "/index.html");
});


});	//close document(ready)
