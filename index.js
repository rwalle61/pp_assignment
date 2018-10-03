$(function(){
	
var baseUrl = (window.location.protocol + "//" + window.location.host + "/events2017");
console.log(baseUrl);

$("#link_to_search").attr('href', baseUrl + '/index.html');
$("#link_to_admin").attr('href', baseUrl + '/admin.html');
	
searchEventByKeywords();
//searchEventByID("e_2");
	
//on searchButton click, do something 
$("#search_button").click(function(e) {
	e.preventDefault();

	searchEventByKeywords();
});

//doesn't show up in table because not returning event.event_id
function searchEventByID(event_id){
	$.getJSON(baseUrl + '/events/get/'+ event_id)
		.done( data => {
			console.log("searchEventByID data is ");
			console.log(data);

			showResults(data);
		})
		.fail( (xhr, textStatus, errorThrown) => { 
			var errMsg = JSON.parse(xhr.responseText);
			alert("Error: "+ errMsg.error);
		}); 	
}	
	
function searchEventByKeywords(){	
	//aesthetics
		$("#events_div").show()
		//show search is in progress
		$("#search_button").addClass("running");
		$("#search_btn_txt").text("Searching");

		//hide details tables
		$("#detailsTables").hide();
		//clear existing table
		$("#event_rows").html("");
	
	//set up search params
	if ($("#search_form").val().length == 0) {
		var keywords = "";
		var dates = "";
	} else {
		var keywords = $("#search_form").val().split(" ");

		var dates = [];
		for (word of keywords) {
			var date = moment.utc(word, [moment.ISO_8601], true); //"YYYY", "YYYY-MM", "YYYY-MM-DD"
			if (date.isValid()) dates.push(date.toISOString());
		}	
	}

	//send GET request with search params
	$.getJSON(baseUrl + '/events/search', {search: keywords, date: dates})	
		.done( data => {
			console.log("searchEventByKeywords data is ");
			console.log(data);	

			showResults(data);
			if (data.events.length == 0) alert ("No events found for these keywords and/or dates.");
		})
		.fail( (xhr, textStatus, errorThrown) => { 
			var errMsg = JSON.parse(xhr.responseText);
			alert("Error: " + errMsg.error + ". Please re-enter.");
		}); 
}
	
function showResults(data) {
	//scroll to table
	$('html, body').animate({
		scrollTop: $("#events_div").offset().top
	}, 700);
	
	//build table
	var events = data.events;
	for (eKey in events) { 
		var event = events[eKey];
		addEventToTable(event);
	}
	
	//stop showing search is in progress
	$("#search_btn_txt").text("Search");
	$("#search_button").removeClass("running");
	
	//show event details msg
	$('#e_details_msg')	.css('display', 'inline-block')
								.hide()
  								.fadeIn(1200)
								.fadeOut(100)
								.fadeIn(400);
}
	function addEventToTable(event) { 
		//shorten date
		var eDate = new Date(event.date);
		eDate = moment(eDate).format("YYYY-MM-DD");
		
		var eventRowHTML = '<tr id='+ event.event_id + '>'
							 + '<td>'+event.title+'</td>'
							 + '<td>'+eDate+'</td>'
							 + '<td>'+event.venue.name+'</td>'
							 + '</tr>';
		
		//set show details on click
		var rowID = "#" + event.event_id;
		$(document).on("click", rowID, function(){
			//add loading class to each td
			$(rowID).children().addClass("ld-over");
			
			//add loading icon to td containing event.title
			var loadingIconDiv = '<div class="ld ld-ring ld-spin-fast"></div>';
			$(rowID).children("td").first().append(loadingIconDiv);
			
			//show loading icon
			$(rowID).children().addClass("running");
			
			console.log($(rowID).html());
			showDetails(event.title); //really, should be event_id not event.title!
		});
					
		$('#event_rows').append(eventRowHTML);
	}	
	
//get event_title from hyperlink. first, add hyperlink	
function showDetails(event_title) { 
	//get the event from the server using the event_title
	$.getJSON(baseUrl + '/events/search', {search: event_title}, function(data){
		var event = data.events[0];

		//build details tables,
		addToEventDetailsTable(event);
		addToVenueDetailsTable(event.venue);
		
		//hide loading icon in event results table
		$("#event_rows").find($(".running")).removeClass("running");
		
		//scroll to details tables
		$('html, body').animate({
			scrollTop: $("#detailsTables").offset().top
		}, 500);
		//or, $("#detailsTables").get(0).scrollIntoView({block: "start", behavior: "smooth"});
		
		//unhide the details tables
		console.log("show the details tables");
		console.log($("#detailsTables"));
		$("#detailsTables").show();
	});
} 
	function addToEventDetailsTable(event) { 
		$('#newEventTitle').text(event.title);

		//add the event's details to eventDetailsTable
		$('#event_id').text(event.event_id);
		$('#event_date').text(moment(event.date).format("YYYY-MM-DD"));
		$('#event_blurb').text(event.blurb);
		$('#event_url').text(event.url);
	}
	function addToVenueDetailsTable(venue) { 
		$('#newVenueName').text(venue.name);

		$('#venue_id').text(venue.venue_id);
		$('#venue_postcode').text(venue.postcode);
		$('#venue_town').text(venue.town);
		$('#venue_url').text(venue.url);
		$('#venue_icon').html('<img src="' + venue.icon + '" alt=venue icon  style="display:block; width:100%; height:auto;">');
		
		
	}	
	
}); //close document(ready)