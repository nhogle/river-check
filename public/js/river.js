String.prototype.toTitleCase = function () {
  ret = this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
  ret = ret.replace( /Blw /, "Below " );
  ret = ret.replace( /Nr /, "Near " );
  return ret;
};

function date_to_string( date ) {
  return date.toISOString().split('T')[0];
}

function query(site_number) {
  var chart_data = [];
  var chart_y_axes = {};
  var chart = "";

  var today = new Date();
  var this_month = today.getMonth();

  var this_year_end = today;
  var this_year_start = new Date( today.getFullYear(), today.getMonth()-4, 1 );

  //var one_month_ago = new Date( today - (30*24*3600*1000) );
  var one_year_ago = new Date( today.getFullYear()-1, today.getMonth(), today.getDate() );

  var last_year_start = new Date( one_year_ago.getFullYear(), one_year_ago.getMonth()-4,  1 );
  var last_year_end = new Date( one_year_ago.getFullYear(), one_year_ago.getMonth()+1, 30 );

  //const base_uri = `http://waterservices.usgs.gov/nwis/stat/?format=json&sites=${site_number}&parameterCd=00060`;
  //const base_uri = 'http://nwis.waterservices.usgs.gov/nwis/iv/?sites=' + site_number + '&format=json&parameterCd=00060';
  //const base_uri = `https://waterservices.usgs.gov/nwis/dv/?site=${site_number}&format=json&parameterCd=00060`;
  //const base_uri = `https://waterservices.usgs.gov/nwis/dv/?site=${site_number}&format=json`;
  //const base_uri = `https://waterservices.usgs.gov/nwis/dv/?site=${site_number}&format=json&parameterCd=00060,00065&statCd=00003`;
  //const base_uri = `https://waterservices.usgs.gov/nwis/iv/?site=${site_number}&format=json&parameterCd=00060,00065`;
  const base_uri   = `https://nwis.waterservices.usgs.gov/nwis/iv/?site=${site_number}&format=json&parameterCd=00060,00065`;

  show_spinner();

  function extractTimeSeries(response) {
    return response?.value?.timeSeries;
  }

  function extractTitle(sourceInfo) {
    return sourceInfo ? `${sourceInfo.siteName?.toTitleCase()} - Site no: ${sourceInfo.siteCode?.[0]?.value}`
      : 'No river flow data available';
  }

  const uri = base_uri
      + "&startDT=" + date_to_string( this_year_start )
      + "&endDT=" + date_to_string( this_year_end )
  ;

  jQuery.getJSON(uri, handle0);

  function handle0(response) {
    timeSeries = extractTimeSeries(response);
    var the_chart_title = {
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSize: 20,
      text: extractTitle(timeSeries?.[0]?.sourceInfo),
    };

    const chart_options = {
      zoomEnabled: true,
      title: the_chart_title,
      legend: {
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: 12,
      },
      axisX : {
        /*
        stripLines: [
          { startValue: new Date( today.getFullYear(), this_month-4,  1 ),
            endValue: new Date( today.getFullYear(), this_month-4, 30 ),
            color: "#e5eeff",
            labelBackgroundColor: "white",
            labelFontColor: "black",
            label: "April"
          },
          { startValue: new Date( today.getFullYear(), this_month-3,  1 ),
            endValue: new Date( today.getFullYear(), this_month-3, 31 ),
            color: "white",
            labelBackgroundColor: "white",
            labelFontColor: "black",
            label: "May"
          },
          { startValue: new Date( today.getFullYear(), this_month-2,  1 ),
            endValue: new Date( today.getFullYear(), this_month-2, 30 ),
            color: "#e5eeff",
            labelBackgroundColor: "white",
            labelFontColor: "black",
            label: "June"
          },
          { startValue: new Date( today.getFullYear(), this_month-1,  1 ),
            endValue: new Date( today.getFullYear(), this_month-1, 31 ),
            color: "white",
            labelBackgroundColor: "white",
            labelFontColor: "black",
            label: "July"
          },
          { startValue: new Date( today.getFullYear(), this_month-0,  1 ),
            endValue: new Date( today.getFullYear(), this_month-0, 31 ),
            color: "#e5eeff",
            labelBackgroundColor: "white",
            labelFontColor: "black",
            label: "August"
          },
          { startValue: new Date( today.getFullYear(), this_month+1,  1 ),
            endValue: new Date( today.getFullYear(), this_month+1, 30 ),
            color: "white",
            labelBackgroundColor: "white",
            labelFontColor: "black",
            label: "September"
          }
        ],
        */
        interlacedColor: "#e5eeff",

        //minimum: new Date( today.getFullYear(), 5-1, 15 ),
        //maximum: new Date( today.getFullYear(), 9-1, 30 ),
        valueFormatString: "MMMM",
        labelBackgroundColor: "white",
        labelFontColor: "black",
        labelFontSize: 16,

        interval: 1,
        //interlacedColor: '#c0d0f0',
        intervalType: 'month'
      },
    };

    const y_axis_options = [
      {
        labelFontSize: 16,
        suffix:" ft³/s",
        includeZero: true
      },
      {
        labelFontSize: 16,
        suffix:" height (ft)",
        includeZero: true
      },
    ];

    chart = new CanvasJS.Chart("chart", {
      ...chart_options,
      axisY: y_axis_options,
      data: chart_data
    });

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
    const timeSeries = extractTimeSeries(response);

    if (!offset) offset = 0;
    //console.log(response);

    console.log( "Data: ", timeSeries);

    function decodeHtml(str) {
      return ($.parseHTML(str)[0]?.wholeText || "");
    }

    for (series of timeSeries) {
      const theVar = series.variable;
      console.log(`Variable: name=[${decodeHtml(theVar.variableName)}]  desc=[${decodeHtml(theVar.variableDescription)}] option=[${decodeHtml(theVar.options?.option?.[0]?.value)}]`)
      console.log(`  ${JSON.stringify(theVar, 0, 4)}\n\n`);

      const noDataValue = "" + theVar.noDataValue;

      var variableName = series.variable.variableName;
      //if (! variableName.match(/flow/i))
        //continue;

      chart_y_axes[variableName] = {
        labelFontSize: 16,
        suffix: " ft³/s",
        includeZero: true
      };

      //const test = Object.entries(chart_y_axes);
      const axisYIndex = Object.entries(chart_y_axes).findIndex( e => e[0] == variableName );

      var dataPoints = [];
      var the_data = series.values[0].value;

      var last_day = undefined;
      for (var i=0; i<the_data.length; i++) {
        var d = the_data[i];
        var date = new Date( (new Date(d.dateTime)) - (-offset*24*3600*1000));

        // Omit bad values
        if (d.value == noDataValue)
          continue;

        // Only plot once point per day
        if (last_day == undefined || date.getDate() != last_day.getDate() ) {
          last_day = date;

          dataPoints.push({
            x: date,
            y: parseInt(d.value)
          });
        }
      }

      const dataSeries = {
        showInLegend: true,
        name: series.variable.variableDescription,
        //legendText: series.variable.variableName,
        legendText: name,
        markerSize: 0,
        type: axisYIndex == 0 ? "spline" : "area",
        dataPoints: dataPoints,
        axisYIndex: axisYIndex,
      };

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
          lng: $(this).attr("lng"),
          lat: $(this).attr("lat"),
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
      response(results);
    },
    response: function( event, ui ) {
      hide_chart();
      zoom_markers(ui.content);
    },
    minLength: 3,
    select: function( event, ui ) {
      $("#site_name").val( ui.item.value );
      $("#site_number").val( ui.item.id );
      console.log( ui.item ?
        "Selected: " + ui.item.value + ", site id: " + ui.item.id :
        "Nothing selected, input was " + this.value );
      $("#site").submit();
      zoom_marker( ui.item );
      show_chart();
      return false;
    },
    focus: function( event, ui ) {
      hide_chart();
      zoom_marker( ui.item );
      return false;
    }
  } )
  .data("ui-autocomplete")._renderItem = function(ul, item) {
    var a = $( "<a>" + item.value + " <span>site id: " + item.id + "</span></a>" );
    a.attr( "data-lng", item.lng );
    a.attr( "data-lat", item.lat );

    return $("<li>")
      .append(a)
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

function hide_chart() {
  $("#chart").hide();
  $("#map").show();
  hide_spinner();
}

function show_chart() {
  $("#chart").show();
  $("#map").hide();
}

// vim: set et fenc=utf-8 ff=unix sts=0 sw=2 ts=2 :

