String.prototype.beautifyRiverName = function () {
  ret = this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
  ret = ret.replace( /Blw /, "Below " );
  ret = ret.replace( /Nr /, "Near " );
  ret = ret.replace( /Rv /, "River " );
  return ret;
};

function date_to_string( date ) {
  return date.toISOString().split('T')[0];
}

function decodeHtml(str) {
  return ($.parseHTML(str)[0]?.wholeText || "");
}

function getYAxisSuffix(variable) {
  const map = {
    "Gage height, ft": " ft",
    "Streamflow, ft&#179;/s": " ft³/s",
  }

  return map[variable.variableName] 
    || variable?.unit?.unitCode
    || "ft per sec"
}

class Chart {
  constructor(name) {
    this.name = name;
    this.chartData = [];
  }

  build(timeSeries, variableCode, variable) {
    const titleOptions = {
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSize: 20,
      text: this.constructor.extractTitle(timeSeries?.[0]?.sourceInfo),
    };

    const yAxisOptions = {
      labelFontSize: 16,
      suffix: getYAxisSuffix(variable),
      includeZero: true
    };

    const subtitleText = decodeHtml(variable.variableName);

    const options = {
      zoomEnabled: true,
      title: titleOptions,
      subtitles: [ {text: subtitleText} ],
      legend: {
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: 12,
      },
      axisX : {
        interlacedColor: "#e5eeff",
        valueFormatString: "MMMM",
        labelBackgroundColor: "white",
        labelFontColor: "black",
        labelFontSize: 16,
        interval: 1,
        intervalType: 'month'
      },
    };

    const id = `chart-${variableCode}`;
    const $el = $(`<div class="flow-chart" id="${id}" />`);
    $('#container').append($el);

    this.chartCanvas = new CanvasJS.Chart(id, {
      ...options,
      axisY: yAxisOptions,
      data: this.chartData
    });

    return this;
  }

  addData(dataSeries) {
    this.chartData.push(dataSeries);
  }

  render() {
    this.chartCanvas.render();
  }

  static extractTitle(sourceInfo) {
    return sourceInfo ? `${sourceInfo.siteName?.beautifyRiverName()} - Site no: ${sourceInfo.siteCode?.[0]?.value}`
      : 'No river flow data available';
  }

}

function query(site_number) {
  $('.flow-chart').remove();
  const theCharts = {};

  var today = new Date();
  var this_month = today.getMonth();

  var this_year_end = today;
  var this_year_start = new Date( today.getFullYear(), today.getMonth()-4, 1 );

  //var one_month_ago = new Date( today - (30*24*3600*1000) );
  var one_year_ago = new Date( today.getFullYear()-1, today.getMonth(), today.getDate() );

  var last_year_start = new Date( one_year_ago.getFullYear(), one_year_ago.getMonth()-3,  1 );
  //var last_year_end = new Date( one_year_ago.getFullYear(), one_year_ago.getMonth()+3, 30 );
  var last_year_end = new Date( one_year_ago.getFullYear(), 8, 30 );

  //const base_uri = `http://waterservices.usgs.gov/nwis/stat/?format=json&sites=${site_number}&parameterCd=00060`;
  //const base_uri = 'http://nwis.waterservices.usgs.gov/nwis/iv/?sites=' + site_number + '&format=json&parameterCd=00060';
  //const base_uri = `https://waterservices.usgs.gov/nwis/dv/?site=${site_number}&format=json&parameterCd=00060`;
  //const base_uri = `https://waterservices.usgs.gov/nwis/dv/?site=${site_number}&format=json`;
  //const base_uri = `https://waterservices.usgs.gov/nwis/dv/?site=${site_number}&format=json&parameterCd=00060,00065&statCd=00003`;
  //const base_uri = `https://waterservices.usgs.gov/nwis/iv/?site=${site_number}&format=json&parameterCd=00060,00065`;
  const base_uri   = `https://nwis.waterservices.usgs.gov/nwis/iv/?site=${site_number}&format=json&parameterCd=00060,00065`;

  show_spinner();
  $('#placeholder').show();

  function renderCharts() {
    for (const [name, chart] of Object.entries(theCharts)) {
      chart.render();
    }
  };

  const uri = base_uri
      + "&startDT=" + date_to_string( this_year_start )
      + "&endDT=" + date_to_string( this_year_end )
  ;

  jQuery.getJSON(uri, handle0);

  function extractTimeSeries(response) {
    return response?.value?.timeSeries;
  }

  function handle0(response) {
    timeSeries = extractTimeSeries(response);

    drawChart(extractTimeSeries(response), "This Year's Flow");
    $('#placeholder').hide();

    jQuery.getJSON(
      base_uri
        + "&startDT=" + date_to_string( last_year_start )
        + "&endDT=" + date_to_string( last_year_end ),
      handle1);
  }

  function handle1(response) {
    drawChart(extractTimeSeries(response), "Last Year's Flow", 365);

    //const theUrl = `${base_uri}&startDt=${date_to_string( last_year_start )}&endDT=${date_to_string( last_year_end )}`;

    // Average Data
    const theUrl = `https://waterservices.usgs.gov/nwis/stat/?sites=${site_number}&statType=mean`;

    jQuery.get( theUrl, (response) => {
      const data = processRdb(response, today);

      // Process data from averages format into the same format as the iv data...
      // We need:
      // - 
      //  variable: 
      //    variableName: string
      //    variableDescription: string
      //    options:
      //      option:
      //        - value: string
      //    noDataValue: number
      //  values:
      //    - value: [
      //      - <data-value>
      //
      // -OR- We can just create another drawChart function...
      // yeah... that's a better idea
      drawAverageChart(data);

    });

    hide_spinner();
  }

  function drawAverageChart(rdbData) {
    // For each USGS variable-code that we're interested in, find that existing
    // chart and add a new time series to it as an average
    for (const [variableCode, dataPoints] of Object.entries(rdbData)) {
      const chart = theCharts[variableCode];
      const dataSeries = {
        showInLegend: true,
        legendText: "Average",
        markerSize: 0,
        type: "spline",
        dataPoints,
      };
      chart?.addData(dataSeries);
    }

    renderCharts();
  }

  function drawChart(timeSeries, name, offset=0) {
    console.log( "Data: ", timeSeries);

    for ( const {values: [{value: theData}], variable: theVar} of timeSeries) {
      console.log(`Variable: name=[${decodeHtml(theVar.variableName)}]  desc=[${decodeHtml(theVar.variableDescription)}] option=[${decodeHtml(theVar.options?.option?.[0]?.value)}]`)
      console.log(`  ${JSON.stringify(theVar, 0, 4)}\n\n`);

      // Extract variable information
      const {variableName, variableCode: [{value: variableCode}], } = theVar;

      // Create a new chart or add to existing chart
      const chart = theCharts[variableCode] || new Chart(variableName).build(timeSeries, variableCode, theVar);
      theCharts[variableCode] = chart;

      show_chart();

      //if (! variableName.match(/flow/i))
        //continue;

      var dataPoints = [];
      const noDataValue = "" + theVar.noDataValue;

      var last_day = undefined;
      for (const d of theData) {
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
        name: theVar.variableDescription,
        //legendText: series.variable.variableName,
        legendText: name,
        markerSize: 0,
        type: "spline",
        dataPoints: dataPoints,
        //axisYIndex: chartIndex,
      };

      chart.addData(dataSeries);
    }

    renderCharts();
  }
}

function processRdb(text, today) {
  // Filter out comments
  const lines = text.trim().split(/\n/).filter( l => !l.startsWith('#'));

  // Grab column names, data descriptions from header lines
  const [columnLine, descLine, ...rowLines] = lines;
  const columns = columnLine?.split(/\t/);
  const descs   = descLine?.split(/\t/);

  // Process each data row into objects with column-name/value pairs
  const makeRow = (row) => {
    return columns.reduce( (obj, col, i) => ({...obj, [col]: row.split(/\t/)[i] }), {} );
  }
  const rows = rowLines.map(makeRow);

  // Partition the output by USGS variable, and create a drawable chart time series for each variable-code
  // TODO: do this in one pass?
  const ret = {};
  for (const {
    parameter_cd: variableCode,
    mean_va: value,
    day_nu: day,
    month_nu: month,
  } of rows) {
    const dataPoints = ret[variableCode] ||= [];
    // USGS returns 1-based months, but we need 0-based month
    const date = new Date(today.getFullYear(), month-1, day);
    dataPoints.push({
      x: date,
      y: parseInt(value)
    });
  }

  return ret;
}

function show_error() {
  chart = new CanvasJS.Chart( "chart", {
    title: "Unable to retreive data for site: " + 0000000
  } );
}


let siteData;
function load_sites() {
  $('#placeholder').hide();

  jQuery.ajax( {
    url: "/xml/sites.xml",
    dataType: "xml",
    success: function(response) {
      const data = $("mapper site", response).map(function() {
        return {
          lng: $(this).attr("lng"),
          lat: $(this).attr("lat"),
          id: $(this).attr("sno"),
          value: $(this).attr("sna").beautifyRiverName(),
        };
      }).get();

      siteData = new Map( data.map((s) => [s.id, s]) );

      setup_autocomplete();
      loadInitialView( siteData );

    }
  });
}

function loadInitialView(data) {
  const state = parseUrlHash();
  showPageState(state, data);
}

function showPageState(state, data) {
  function lookupSite(site_number) {
    return siteData.get(site_number);
  }

  switch (state.view) {
    // Restore the map view with the original search term,
    // Pop up auto-complete, etc.
    case 'map-search':
      hide_chart();
      $('#site_name')
        .val(state.search_term)
        .autocomplete("search");
      break;

    // Show the chart data for the specifed site
    case 'site-chart':
      $('#site_name')
        .val(lookupSite(state.site_id)?.value)
        .autocomplete("close");

      showChartView(state.site_id);
      break;
  }
}

function showChartView(site_number) {
  //$("#site_name").val( site_name );
  $("#site_number").val( site_number );
  $("#site").submit();
  show_chart();
}

function setup_autocomplete() {
  const mapSelectionEvent = new $.Event("map-selection-event");
  function eventWasFromMap(event) {
    return event?.originalEvent?.originalEvent?.type == mapSelectionEvent.type;
  }

  const widget = $( "#site_name" )
    .autocomplete({
      source: function( request, response ) {
        const terms = request.term.split(/\s+/);
        let candidates = Array.from(siteData);

        for( var i=0; i<terms.length; i++) {
          var r = new RegExp( $.ui.autocomplete.escapeRegex(terms[i]), "i" );
          candidates = candidates.filter( ([id, site]) => site.value.match(r) );
        }
        const results = candidates.map( ([id, site]) => site );
        //console.log( results );
        response(results);
      },
      response: function( event, ui ) {
        hide_chart();

        const menu = widget.menu;

        const state = {view: "map-search", search_term: widget.term};
        window.history.replaceState( state, "", `#${buildUrlHash(state)}`);
        zoom_markers(ui.content, onHover, onClick);

        function findMenuItem(d) {
          const menuItem = menu.element.find(`.ui-menu-item[data-site-id=${d.id}]` ).first();
          return menuItem;
        }

        function onHover(d) {
          menu.focus(mapSelectionEvent, findMenuItem(d));
        }

        function onClick(d) {
          // Ugh, not sure why this is needed but JQuery Autocomplete doesn't
          // like it there isn't an "active" menu item...
          const event = new $.Event(mapSelectionEvent);
          const menuItem = findMenuItem(d);
          event.target = menuItem;
          menu.select(event, menuItem);
        }
      },
      minLength: 3,
      select: function( event, ui ) {
        if (ui.item) {
          const site_name = ui.item.value;
          const site_number = ui.item.id;

          console.log( `Selected: ${site_name}, site id: ${site_number}` );

          // Consider this a "forward" navigation 
          const state = {view: "site-chart", site_id: site_number};
          history.pushState( state, "", `#${buildUrlHash(state)}`);

          showChartView(site_number);

          if (!eventWasFromMap(event)) {
            highlight_marker( ui.item );
          }
        }
        else {
          console.log( "Nothing selected, input was " + this.value );
        }

        //return false;
      },
      focus: function( event, ui ) {
        const fromMap = eventWasFromMap(event);
        const doMapZoom = !fromMap

        console.log(`Highlighting river site: ${ui.item}, eventSource: ${fromMap ? "map" : "menu-focus"}`);

        hide_chart();
        highlight_marker( ui.item, doMapZoom );

        return false;
      },
      change: function( event, ui ) {
      },
    })
    .data("ui-autocomplete");

  widget._renderItem = function(ul, item) {
    var a = $( "<a>" + item.value + " <span>site id: " + item.id + "</span></a>" );
    a.attr( "data-lng", item.lng );
    a.attr( "data-lat", item.lat );
    a.attr( "data-site-id", item.id );

    return $("<li>")
      .attr( "data-site-id", item.id )
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
  $(".flow-chart").hide();
  $('#placeholder').hide();
  $("#map").show();
  hide_spinner();
}

function show_chart() {
  $(".flow-chart").show();
  $("#map").hide();
}

function onPageReady() {
  load_sites();
  $("#site").submit( function(event) {
    query( $("#site_number").val() );
    event.preventDefault();
  } );

  // Handle "back"
  window.addEventListener("popstate", (event) => {

    // hashState and state should match...
    const hashState = parseUrlHash();
    const state = event.state;

    console.log( `POP state: location: ${document.location}
      , state: ${JSON.stringify(state)}
      , hashState: ${JSON.stringify(hashState)}
    `);

    showPageState(state);
  });
}

function parseUrlHash() {
  const hash = window.location.hash.substr(1);
  return hash.split('&').reduce( (res, pair) => {
    const [key, value] = pair.split('=');
    return {...res, [decodeURI(key)]: decodeURI(value)};
  }, {});
}

function buildUrlHash(params) {
  return Object.entries(params).map( ([key, val]) => `${key}=${val}` ).join('&');
}

// vim: set et fenc=utf-8 ff=unix sts=0 sw=2 ts=2 :

