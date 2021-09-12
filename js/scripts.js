// save window width and height for measuring to position elements
var windowWidth = window.innerWidth
var windowHeight = window.innerHeight

// set the dimensions and margins of the radial chart
var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = windowWidth - margin.left - margin.right,
    height = windowHeight - margin.top - margin.bottom,
    innerRadius = windowHeight / 6,
    outerRadius = Math.min(width, height) / 2 - (windowHeight*0.09); // the outerRadius goes from the middle of the SVG area to the border, with some extra room for the top longer bars

// append the svg object to the body of the page
var svg = d3.select("#radial-chart")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + width / 2 + "," + ( height/2 )+ ")");

// set the dimensions and margins of the pie chart
var pie_width = windowHeight / 4
    pie_height = windowHeight / 4
    pie_margin = 0

// The radius of the pieplot is half the width or half the height (smallest one)
var radius = Math.min(pie_width, pie_height) / 2 - pie_margin

// append svg for the pie chart to the div
var pie_svg = d3.select("#radial-chart")
  .append("svg")
    .attr("width", pie_width)
    .attr("height",  pie_height)
    .attr('transform', `translate(${windowWidth/2 - radius}, ${-windowHeight/2 - radius - 4})`)
    .attr('class', 'pie-chart')
  .append("g")
    .attr("transform", "translate(" + pie_width / 2 + "," + pie_height / 2 + ")")

// Upload data then draw elements on page and add functionality
Promise.all([
    d3.csv("https://raw.githubusercontent.com/kelsey-n/revelio-assignment/main/data/returnRate_medianTimespent_filtered2.csv", d3.autoType),
    d3.csv("https://raw.githubusercontent.com/kelsey-n/revelio-assignment/main/data/destinationsByHomeCountry_Summary_final.csv", d3.autoType)
  ]).then(function(data) {

    var barData = data[0]
    var pieData = data[1]

    // X scale
    var x = d3.scaleBand()
        .range([0, 2 * Math.PI])
        .domain( barData.map(function(d) { return d.home_country; }) ); // The domain of the X axis is the list of countries.

    // Y scale
    var y = d3.scaleRadial()
        .range([innerRadius, outerRadius])
        .domain([0, d3.max(barData.map(d => d.return_rate))]);

    // Color scale to color bars according to median time spent abroad
    var barColor = d3.scaleLinear()
        .domain([d3.min(barData.map(d => d.median_timespent_abroad)), d3.max(barData.map(d => d.median_timespent_abroad))])
        .range(['#58CCED', '#072F5F'])

    // Add bars
    bars = svg.append("g")
      .selectAll("path")
      .data(barData)
      .enter()
      .append("path")
        .attr("fill", function(d) { return barColor(d.median_timespent_abroad); })
        .attr("d", d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(function(d) { return y(d.return_rate); })
            .startAngle(function(d) { return x(d.home_country); })
            .endAngle(function(d) { return x(d.home_country) + x.bandwidth(); })
            .padAngle(0.01)
            .padRadius(innerRadius))

    // Define the div for the tooltip to show when hovering over bars, and hide it with opacity 0
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    bars.on("mouseenter", function(event, d) { //do 2 things on bar mouseenter: 1- draw pie chart; 2- show tooltip
        d3.select(this).transition() //change opacity of bar slightly to show which bar is being hovered over
             .duration('10')
             .attr('opacity', '0.85')
        var pieData_homeCountry = pieData.filter(row => row.home_country == d.home_country) //extract home country of hovered bar to draw that home country's pie chart
        var pieData_toplot = Object.entries(pieData_homeCountry[0])
          .filter(row => row[1] > 0)
        drawPieChart(pieData_toplot)
        pie_svg.style('opacity', 1)
        tooltip.transition() //show tooltip
            .duration(200)
            .style("opacity", .9);
      });

    bars.on("mousemove", function(event, d) {
      pie_svg.style('opacity', 1)
      tooltip.html(d.home_country + "<br/>"  + d.return_rate + "% return rate"  + "<br/>"  + d.median_timespent_abroad + " median years abroad")
      // Position tooltip based on mouse position relative to top & left of window so that the pie chart in the middle is never blocked by the tooltip
      event.pageY < windowHeight/2 ? tooltip.style("top", (event.pageY - 55) + "px") : tooltip.style("top", (event.pageY + 15) + "px")
      event.pageX < windowWidth/2 ? tooltip.style("left", (event.pageX - 155) + "px") : tooltip.style("left", (event.pageX + 15) + "px")
    })

    bars.on("mouseleave", function(event, d) {
        d3.select(this).transition()
                 .duration('10')
                 .attr('opacity', '1');
        pie_svg.selectAll("*").remove(); //clear the pie chart on mouseout
        tooltip.transition() //hide tooltip
            .duration(500)
            .style("opacity", 0);
      });

    // Add radial y axis with values of return rate
    var yAxis = svg.append("g")
        .attr("text-anchor", "middle");

    var yTick = yAxis
      .selectAll("g")
      //.data(y.ticks(5)) //this gives the exact yticks as [0,10,20,30,40,50]. we only want to show a few so we can add the y axis label as 'Return Rate (%)' AND have as few lines drawn on top of bars, interrupting mousemove for the bars
      .data([20,40,50]) //so we will define data manually here choosing only a few convenient but informative y ticks
      .enter().append("g");
    // y axis radial lines
    yTick.append("circle")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .attr("r", y);
    // white background for y tickvalues
    yTick.append("text")
        .attr("y", function(d) { return -y(d); })
        .attr("dy", "0.35em")
        .attr("fill", "none")
        .attr("stroke", "#ffffffdd")
        .attr("stroke-width", 5)
        .text(y.tickFormat(5, "s"));
    // font for y tickvalues (20,40,50 as defined above)
    yTick.append("text")
        .attr("y", function(d) { return -y(d); })
        .attr("dy", "0.35em")
        .text(y.tickFormat(5, "s"));

    // Add the home_country labels, translating, rotating and anchoring text based on bar angle
    // First add white background stroke so country names are visible on top of radial lines
    svg.append("g")
        .selectAll("g")
        .data(barData)
        .enter()
        .append("g")
          .attr("text-anchor", function(d) { return (x(d.home_country) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start"; })
          .attr("transform", function(d) { return "rotate(" + ((x(d.home_country) + x.bandwidth() / 2) * 180 / Math.PI - 90) + ")"+"translate(" + (y(d.return_rate)+10) + ",0)"; })
        .append("text")
          .attr("transform", function(d) { return (x(d.home_country) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "rotate(180)" : "rotate(0)"; })
          .style("font-size", "1.9vh")
          .attr("fill", "none")
          .attr("stroke", "#ffffffdd")
          .attr("stroke-width", 5)
          .text(function(d){return(d.home_country)})
    // Then add country names on top of white stroke
    svg.append("g")
        .selectAll("g")
        .data(barData)
        .enter()
        .append("g")
          .attr("text-anchor", function(d) { return (x(d.home_country) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start"; })
          .attr("transform", function(d) { return "rotate(" + ((x(d.home_country) + x.bandwidth() / 2) * 180 / Math.PI - 90) + ")"+"translate(" + (y(d.return_rate)+10) + ",0)"; })
        .append("text")
          .attr("transform", function(d) { return (x(d.home_country) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "rotate(180)" : "rotate(0)"; })
          .style("font-size", "1.8vh")
          .text(function(d){return(d.home_country)})

    // Add legend for bar colors using d3-legend library
    svg.append("g")
      .attr("class", "legendLinear")
      .attr("transform", "translate(20,20)");
    var legendLinear = d3.legendColor()
      .shapeWidth(windowWidth*0.017)
      .orient('horizontal')
      .title('Median Years Spent Abroad')
      .scale(barColor);
    svg.select(".legendLinear")
      .attr("transform", `translate(${windowWidth/3.5}, ${-windowHeight/4})`)
      .attr("font-size", "0.9vw")
      .call(legendLinear);

    // Add title
    svg
      .append("text")
      .attr("class", "title")
      .attr("transform", `translate(${-windowWidth/3}, ${-windowHeight/2.2})`)
      .text("Working ~away~ From Home")
    // fit title into a third of the window width by calling the wrap function defined below (taken from Mike Bostock)
    svg.select(".title")
      .call(wrap, windowWidth/3);

    // Append text to the svg

    svg
      .append("text")
      .attr("class", "instructions-center")
      .style("font-size", "0.7vw")
      .attr("text-anchor", "middle")
      .text("Destinations will appear here!")
    // fit this text into the radius of the pie chart
    svg.select(".instructions-center")
      .call(wrap, radius);

    // Add rect element before text to give appearance of background color for text
    var textboxWidth = windowWidth*0.4 - outerRadius

    var textbox = svg.append("rect")
                    .attr("class", "text-box")
                    .attr("width", textboxWidth)
                    .attr("height", windowHeight*0.75)
                    .attr("x", -outerRadius - ((windowWidth/2 - outerRadius) * 0.9))
                    .attr("y", -windowHeight/2*0.75)
                    .attr("fill", "white")
                    .attr("rx", 3)
                    .attr("ry", 3)
                    .attr("stroke", "#F5F5F5")
                    .attr("stroke-width", 3)

    var lineBreak = windowHeight*0.03

    svg
      .append("text")
      .attr("class", "takeaways")
      .style("font-size", "1.1vw")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-outerRadius - ((windowWidth/2 - outerRadius) * 0.9) + textboxWidth/2}, ${-windowHeight/2*0.75 + lineBreak} )`)
      .text("Purpose")

    svg
      .append("text")
      .attr("class", "background")
      .style("font-size", "0.9vw")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-outerRadius - ((windowWidth/2 - outerRadius) * 0.9) + textboxWidth/2}, ${-windowHeight/2*0.75 + lineBreak*2})`)
      .text("Explore international migration for work by the home countries with the highest and lowest rates of return.")
    svg.select(".background")
      .call(wrap, textboxWidth - 5);

    svg
      .append("text")
      .attr("class", "instructions")
      .style("font-size", "1vw")
      .style("font-style", "italic")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-outerRadius - ((windowWidth/2 - outerRadius) * 0.9) + textboxWidth/2}, ${-windowHeight/2*0.75 + lineBreak*6})`)
      .text("Hover over a bar to see destination countries by that home country!")
    svg.select(".instructions")
      .call(wrap, textboxWidth - 5);

    svg
      .append("text")
      .attr("class", "takeaways")
      .style("font-size", "1.1vw")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-outerRadius - ((windowWidth/2 - outerRadius) * 0.9) + textboxWidth/2}, ${-windowHeight/2*0.75 + lineBreak*11})`)
      .text("Takeaways")
    svg
      .append("text")
      .attr("class", "takeaways")
      .style("font-size", "0.9vw")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-outerRadius - ((windowWidth/2 - outerRadius) * 0.9) + textboxWidth/2}, ${-windowHeight/2*0.75 + lineBreak*13})`)
      .text("Return rate tends to be inversely proportional to median time spent abroad (ie the higher the return rate, the shorter the time spent abroad and vice versa).")
    svg
      .append("text")
      .attr("class", "takeaways")
      .style("font-size", "0.9vw")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-outerRadius - ((windowWidth/2 - outerRadius) * 0.9) + textboxWidth/2}, ${-windowHeight/2*0.75 + lineBreak*17})`)
      .text("Some exceptions are the US and New Zealand (where both return rate and time spent abroad are high) and Tunisia (where both are low).")
    svg
      .append("text")
      .attr("class", "takeaways")
      .style("font-size", "0.9vw")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-outerRadius - ((windowWidth/2 - outerRadius) * 0.9) + textboxWidth/2}, ${-windowHeight/2*0.75 + lineBreak*21})`)
      .text("Considering only the top 5 destination countries for each home country visualized, the most popular destinations by number of migrants are the UK, the US, Germany, Canada and Switzerland.")
   svg.selectAll(".takeaways")
      .call(wrap, textboxWidth - 5);

    svg
      .append("text")
      .attr("class", "notes")
      .style("font-size", "0.8vw")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${windowWidth/2*0.7}, ${windowHeight/4})`)
      .text("This dataset was filtered for periods of time spent abroad between 3 months and 40 years. Only countries with 10,000+ migrants were visualized. \
      For each home country, the 5 most popular destination countries (by number of migrants) are shown by name in the pie chart, and migrants to all other destination countries are summed under 'Other'.")
    svg.selectAll(".notes")
      .call(wrap, (windowWidth/2 - outerRadius)*0.7);

    // Append text on an arc

    svg.append("path")
    .attr("id", "title") //Unique id of the path
    .attr("d", d3.arc()
        .innerRadius(0)
        .outerRadius(outerRadius * 0.8)
        .startAngle(-Math.PI/2)
        .endAngle(Math.PI/2))
    .style("fill", "none")
    //Create an SVG text element and append a textPath element
    svg.append("text")
     .append("textPath") //append a textPath to the text element
      .attr("xlink:href", "#title") //place the ID of the path here
      .style("text-anchor","middle") //place the text halfway on the arc
      .attr("startOffset", "31%")
      .attr("font-size", "1vw")
      .text("Return Rate (%)");

    svg.append("path")
    .attr("id", "highest") //Unique id of the path
    .attr("d", d3.arc()
        .innerRadius(0)
        .outerRadius(windowHeight/2)
        .startAngle(0)
        .endAngle(Math.PI))
    .style("fill", "none")
    //Create an SVG text element and append a textPath element
    svg.append("text")
     .append("textPath") //append a textPath to the text element
      .attr("xlink:href", "#highest") //place the ID of the path here
      .style("text-anchor","middle") //place the text halfway on the arc
      .attr("startOffset", "22%")
      .attr("font-size", "1.8vh")
      .text("Highest Return Rates");

    svg.append("path")
    .attr("id", "lowest") //Unique id of the path
    .attr("d", d3.arc()
        .innerRadius(0)
        .outerRadius(outerRadius + ((windowHeight/2 - outerRadius)/2))
        .startAngle(0)
        .endAngle(2*Math.PI))
    .style("fill", "none")
    //Create an SVG text element and append a textPath element
    svg.append("text")
     .append("textPath") //append a textPath to the text element
      .attr("xlink:href", "#lowest") //place the ID of the path here
      .style("text-anchor","middle") //place the text halfway on the arc
      .attr("startOffset", "83%")
      .attr("font-size", "1.8vh")
      .text("Lowest Return Rates");

});

// Function to draw the pie chart based on the home_country bar that the user is hovering over
function drawPieChart(pieData_homeCountry) {
  // set the color scale
  var color = d3.scaleOrdinal()
    .domain(pieData_homeCountry.map(d => d[0]))
    .range(d3.schemeSet2);
  // Compute the position of each group on the pie:
  var pie = d3.pie()
    .value(function(d) {return d[1]; })
  var data_ready = pie(pieData_homeCountry)
  // shape helper to build arcs and position labels:
  var arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(radius)
  var labelArc = d3.arc()
    .outerRadius(radius)
    .innerRadius(5);
  // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
  pie_svg
    .selectAll('mySlices')
    .data(data_ready)
    .enter()
    .append('path')
      .attr('d', arcGenerator)
      .attr('fill', function(d){ return(color(d.data[0])) })
      .attr("stroke", "black")
      .style("stroke-width", "0px")
  // Label the pie chart, adapting the rotating labels from the radial bars
  pie_svg.append("g")
      .selectAll("mySlices")
      .data(data_ready)
      .enter()
      .append("text")
        .text(function(d){ return d.data[0]})
        .attr("transform", function(d) {
          var midAngle = d.startAngle + ((d.endAngle - d.startAngle)/2) < Math.PI ? d.startAngle/2 + d.endAngle/2 : d.startAngle/2  + d.endAngle/2 + Math.PI ;
          return "translate(" + labelArc.centroid(d)[0] + "," + labelArc.centroid(d)[1] + ") rotate(-90) rotate(" + (midAngle * 180/Math.PI) + ")"})
        .style("font-size", "0.7vw")
        .attr("text-anchor", "middle")
}

// Mike Bostock's text wrap function from https://bl.ocks.org/mbostock/7555321
function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.2, // ems
        //x = text.attr("x"), //removing for equal spacing between lines
        y = text.attr("y"),
        dy = 0 //parseFloat(text.attr("dy")) || 0,
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", 0).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}
