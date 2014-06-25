String.prototype.toTitleCase = function () {
	ret = this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	ret = ret.replace( /Blw /, "Below " );
	ret = ret.replace( /Nr /, "Near " );
	return ret;
};

function date_to_string( date ) {
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var day = date.getDate();

	return "" + year + "-" + month + "-" + day;
}

function query(site_number) {

	var chart_data = [];
	var chart = "";

	var today = new Date();
	var one_month_ago = new Date( today - (30*24*3600*1000) );
	var one_year_ago = new Date( today.getFullYear()-1, today.getMonth(), today.getDate() );

	var last_year_start = new Date( one_year_ago.getFullYear(), 6-1,  1 );
	var last_year_end	= new Date( one_year_ago.getFullYear(), 9-1, 30 );

	var base_uri =	 'http://nwis.waterservices.usgs.gov/nwis/iv/?sites=' + site_number + '&format=json';

	show_spinner();

	jQuery.getJSON(
		base_uri 
			+ "&startDT=" + date_to_string( one_month_ago ) 
			+ "&endDT=" + date_to_string( today ),
		handle0);

	function handle0(response) {
		var the_chart_title = { 
			fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
			fontSize: 30,
			text: (response.value && response.value.timeSeries && response.value.timeSeries.length > 0 )
				? response.value.timeSeries[0].sourceInfo.siteName.toTitleCase()
				: 'No river flow data available'
		};

		chart = new CanvasJS.Chart("chart", {
			zoomEnabled: true,
			title: the_chart_title,
			legend: {
				fontFamily: '"Helvetica Neue", Helvetica, sans-serif'
			},
			axisX : { 
				stripLines: [
					{	startValue: new Date( today.getFullYear(), 6-1,  1 ),
						endValue:	new Date( today.getFullYear(), 6-1, 30 ),
						color: "e5eeff",
						labelBackgroundColor: "white",
						labelFontColor: "black",
						label: "June"
					},
					{	startValue: new Date( today.getFullYear(), 7-1,  1 ),
						endValue:	new Date( today.getFullYear(), 7-1, 31 ),
						color: "white",
						labelBackgroundColor: "white",
						labelFontColor: "black",
						label: "July"
					},
					{	startValue: new Date( today.getFullYear(), 8-1,  1 ),
						endValue:	new Date( today.getFullYear(), 8-1, 31 ),
						color: "e5eeff",
						labelBackgroundColor: "white",
						labelFontColor: "black",
						label: "August"
					},
					{	startValue: new Date( today.getFullYear(), 9-1,  1 ),
						endValue:	new Date( today.getFullYear(), 9-1, 30 ),
						color: "white",
						labelBackgroundColor: "white",
						labelFontColor: "black",
						label: "September"
					}
				],

				//minimum: new Date( today.getFullYear(), 5-1, 15 ),
				//maximum: new Date( today.getFullYear(), 9-1, 30 ),
				valueFormatString: "MMM DD",

				interval: 100,
				//interlacedColor: '#c0d0f0',
				intervalType: 'month'
			},
			axisY :{ 
				labelFontSize: 16,
				suffix:" ft³/s",
				includeZero: true
			},
			data: chart_data
		} );

		handleQueryResponse(response, 0, "This Year's Flow");
		jQuery.getJSON(
			base_uri 
				+ "&startDT=" + date_to_string( last_year_start ) 
				+ "&endDT=" + date_to_string( last_year_end ),
			handle1);
	}

	function handle1(response) {
		handleQueryResponse(response, 365, "Last Year's Flow");
		hide_spinner();
	}

	function handleQueryResponse(response, offset, name) {
		if (!offset) offset = 0;
		console.log(response);

		var the_dats = response.value.timeSeries;

		for (var j=0; j<the_dats.length; j++ ) {
			
			var variableName = the_dats[j].variable.variableName;
			if (! variableName.match(/flow/i)) 
				continue;
			var dataSeries = { 
				showInLegend: true,
				name: the_dats[j].variable.variableDescription,
				//legendText: the_dats[j].variable.variableName,
				legendText: name,
				markerSize: 0,
				type: "spline"
			};
			var dataPoints = [];
			var the_data = the_dats[j].values[0].value;

			var last_day = undefined;
			for (var i=0; i<the_data.length; i++) {
				var d = the_data[i];
				var date = new Date( (new Date(d.dateTime)) - (-offset*24*3600*1000));

				// Only plot once point per day
				if (last_day == undefined || date.getDate() != last_day.getDate() ) {
					last_day = date;

					dataPoints.push({
						x: date,
						y: parseInt(d.value)
					});
				}
			}

			dataSeries.dataPoints = dataPoints;
			chart_data.push(dataSeries); 
		}

		chart.render();
	}
}

function show_error() {
	chart = new CanvasJS.Chart( "chart", {
		title: "Unable to retreive data for site: " + 0000000
	} );
}

function load_sites() {
	jQuery.ajax( {
		url: "/xml/sites.xml",
		dataType: "xml",
		success: function(response) {
			var data = $("mapper site", response).map(function() {
				return {
					value: $(this).attr("sna").toTitleCase(),
					id: $(this).attr("sno")
				};
			}).get();
			setup_autocomplete( data );
		}
	});
}

function setup_autocomplete( data ) {
	$( "#site_name" ).autocomplete( {
		source: function( request, response ) {
			var terms = request.term.split(/\s+/);
			var candidates = data;
			var results = [];

			for( var i=0; i<terms.length; i++) {
				var r = new RegExp( $.ui.autocomplete.escapeRegex(terms[i]), "i" );
				results = [];
				for( var j=0; j<candidates.length; j++) {
					if (candidates[j].value.match(r)) {
						results.push( candidates[j] );
					}
				}
				candidates = results;
			}
			//console.log( results );
			response( results);
		}, 
		minLength: 3,
		select: function( event, ui ) {
			$("#site_name").val( ui.item.value );
			$("#site_number").val( ui.item.id );
			console.log( ui.item ?
				"Selected: " + ui.item.value + ", site id: " + ui.item.id :
				"Nothing selected, input was " + this.value );
			$("#site").submit();
			return false;
		}
	} )
	.data("ui-autocomplete")._renderItem = function(ul, item) {
		return $("<li>")
			.append( "<a>" + item.value + " <span>site id: " + item.id + "</span></a>" )
			.appendTo( ul );
	};
}

var spinner = undefined;

function show_spinner() {
	if (!spinner) 
		spinner = new Spinner( {
			lines: 7, // The number of lines to draw
			length: 20, // The length of each line
			width: 10, // The line thickness
			radius: 30, // The radius of the inner circle
			corners: 1, // Corner roundness (0..1)
			direction: 1, // 1: clockwise, -1: counterclockwise
			color: '#000', // #rgb or #rrggbb or array of colors
			speed: 1, // Rounds per second
			trail: 60, // Afterglow percentage
			className: 'spinner', // The CSS class to assign to the spinner
			top: '50%', // Top position relative to parent
			left: '50%' // Left position relative to parent
		} );

	spinner.spin( document.getElementById("container") );
	//$("#container").append( spinner.el );
}

function hide_spinner() {
	if (spinner) 
		spinner.stop();
}

