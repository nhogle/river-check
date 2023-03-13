var g, active, path, svg, zoom, projection;
var marker;
var width = 930,
    height = 600;

jQuery( function() {

active = d3.select(null);

projection = d3.geo.albersUsa()
    .scale(1000)
    .translate([width / 2, height / 2]);

zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

path = d3.geo.path()
    .projection(projection);

svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", reset);

g = svg.append("g");
states = g.append("g").attr("id", "states");
sites = g.append("g").attr("id", "sites");

svg
    .call(zoom) // delete this line to disable free zooming
    .call(zoom.event);

d3.json("/js/us.json", function(error, us) {
  states.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .attr("class", "feature")
      .on("click", clicked);

  states.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "mesh")
      .attr("d", path);
});

});

function zoom_to_bounds(bounds) {
  var dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.min(16.0, .8 / Math.max(dx / width, dy / height)),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  console.log("Scale: ", scale)

  svg.transition()
      .duration(750)
      .call(zoom.translate(translate).scale(scale).event);
}

function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  zoom_to_bounds(path.bounds(d));
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  svg.transition()
      .duration(750)
      .call(zoom.translate([0, 0]).scale(1).event);
}

function zoomed() {
  g.style("stroke-width", 1.5 / d3.event.scale + "px");
  g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
  if (d3.event.defaultPrevented) d3.event.stopPropagation();
}

function features(data) { 
  return {
      type: "MultiPoint",
      coordinates: data.map( d => [ +d.lng, +d.lat ] ),
  }
}
function feature(d) { 
  return {
      type: "Point",
      coordinates: [ +d.lng, +d.lat ]
  }
}

function zoom_markers( data ) {
  console.log(`Zooming to set of ${data.length} items.`);

  var t = sites.transition()
    .duration(400)
    .ease('easeBack');

  function transform(d) {
    var c = path.centroid(feature(d));
    return `translate(${c[0]}, ${c[1]})`;
  }

  var circle = sites.selectAll("circle")
    .data(data, d => d.id);

  circle.enter().append("circle")
      .attr( "transform", transform )
      .attr( "fill", "#3333aa")
      .attr( "r", 0 )
    .transition(t)
      .attr( "r", 1 );
  circle.exit().transition(t)
      .attr( "r", 0 )
      .remove();

  if (data.length > 1) {
    var bounds = path.bounds(features(data));
    zoom_to_bounds(bounds);
  }
  else if (data.length == 1) {
    zoom_marker(data[0]);
  }
}

function zoom_marker( item ) {
  var r = path.centroid(feature(item));

  var x = r[0],
      y = r[1],
      scale = 3.0,
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  if ( marker ) 
      d3.select(marker).node().remove();

  marker = g.append('svg:circle')
      .attr( "cx", x )
      .attr( "cy", y )
      .attr( "class", "usgs-site")
      .attr( "r", 3 );

  svg.transition()
      .duration(750)
      .call(zoom.translate(translate).scale(scale).event);

}
