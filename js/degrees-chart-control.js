var degreeChart = {};
var mobile = window.matchMedia("(max-width:768px)");

degreeChart.getFilters = function() {
  //  Returns list of selected dgrees
  var filters = [];
  $("div.dropdown").each(function() {
    var currentVal = $(this).dropdown("get text");

    if(currentVal != "Select a degree to compare") {
      filters.push(currentVal);
    }
  });

  return filters;
};


degreeChart.filterDateByDegree = function(data, filters, xname) {
  //  Takes a dataset from a CSV and filters down to only the selected degrees
  filters = filters || [];

  var filtered_data = data.map(
    function(d) {
      var set = {};
      set[xname] = d[xname];
      filters.forEach(function(name){
        set[name] = d[name];
      });
      return set;
    }
  );
  return filtered_data;
};

degreeChart.getTypes = function() {
  //  Returns selected grad / full-time filters
  var types = [];
  $(".js-chart-filter input").each(function() {
    if( this.checked ) {
      types.push(this.value);
    }
  });
  return types.join("_");
};

degreeChart.toggleKey = function(target, focus, op) {
  //  Hiding / showing of the graph key popover
  if(op == "show") {
    //  Will the key show off the graph? Hide.
    if (mobile.matches == false) {
      if( (parseFloat($(target + " .js-chart-label").css("left")) + 300 < 890) && (parseFloat($(target + " .js-chart-label").css("left")) > 15) ) {
        focus.style("display", null);
        $(target + " .js-chart-label").show();
      } 
      else {
        degreeChart.toggleKey(target, focus, "hide");
      }
    } else {
      focus.style("display", null);
      $(".js-mobile-chart-label").show();
    }
  }
  // if(op == "hide" && !$(target + " .js-chart-label").is(":hover")) {
  //   focus.style("display", "none");
  //   $(target + " .js-chart-label").hide();
  // }
};


degreeChart.fillKey = function(target, data, x, margin) {
  //  Fills in graph key popover with correct data
  var $label = $(target + " .js-chart-label");
  $label.empty();

  var $header = $("<h2/>");

  if(data.hasOwnProperty("year")) {
    $header.text(data.year + " years since career start");
    var format = function(num) {
      return Math.round(+num/1000);
    }
  }
  if(data.hasOwnProperty("Percentile")) {
    $header.text(data.Percentile + " percentile");
    // $label.append($header);
    var format = function(num) {
      return (Math.round(+num/10000)/100).toString().length == 3 ? (Math.round(+num/10000)/100).toString() + "0" : (Math.round(+num/10000)/100);
    }
  }

  $label.append($header);

  for(degree in data) {
    if(degree != "year" && degree != "Percentile" && data[degree] > 0) {
      var $line = $("<p/>");
      var $degree = $("<span/>").addClass("chart-label-degree").text(degree);
      var $income = $("<span/>").addClass("chart-label-income").text("$" + format(data[degree]));
      $line.append($degree).append($income);
      $line.css("background-color", d3.selectAll("[n='" + degree + "']").style("stroke"));
      $label.append($line);
    }
  }

  $label.css("top", margin.top + 20);
  if(x > 525)
    $label.css("left", x + (margin.left - 20) - $label.outerWidth());
  else
    $label.css("left", x + (margin.left + 20));
};

degreeChart.drawMedianChart = function(filename, filters, target) {

  var margin = {top: 20, right: 0, bottom: 40, left: 20};

  if (mobile.matches) {
    var width = window.innerWidth - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;
  } else {
    var width = 900 - margin.left - margin.right,
        height = 360 - margin.top - margin.bottom;
  }

  var bisectDate = d3.bisector(function(d) { return d.year; }).left;

  var x = d3.scale.linear()
    .range([0, width]);

  var y = d3.scale.linear()
    .range([height, 0]);

  var color = d3.scale.category10();

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(mobile.matches ? 4 : 8)
    .tickSize(0);

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(mobile.matches ? 4 : 5)
    .tickSize(-width, 0, 0)
    .outerTickSize(0)
    .tickFormat(
      function(d) {
        return Math.round(d/1000);
      }
    );

  var line = d3.svg.line()
    .interpolate("monotone")
    .x(function(d) { return x(d.year); })
    .y(function(d) { return y(d.income); });

  $(target + " .chart-contain svg").remove();

  var svg = d3.select(target + " .chart-contain").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.csv(filename, function(data) {

    data = degreeChart.filterDateByDegree(data, filters, "year");

    color.domain(d3.keys(data[0]).filter(function(key) { return key !== "year"; }));
    
    var degrees = color.domain().map(function(name) {
      return {
        name: name,
        values: data.map(function(d) { 
          return {year: +d.year, income: +d[name]};
        })
      };
    });

    degrees = degrees.map(function(degree) {
      var temp_values = [];
      for(var i = 0; i < degree.values.length; i++) {
        if(degree.values[i].income > 0)
          temp_values.push(degree.values[i])
      }
      return {
        name: degree.name,
        values: temp_values
      }
    });

    x.domain([-2,45]);

    y.domain([
      d3.min(degrees, function(c) { return d3.min(c.values, function(v) { return v.income; }); }) - 2000,
      Math.round(d3.max(degrees, function(c) { return d3.max(c.values, function(v) { return v.income; }); }) / 5000) * 5000 + 5000
    ]);

    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "#ffffff")
      .style("stroke", "#CCCCCC")
      .style("stroke-width","1px")
      .style("shape-rendering", "crispEdges;");

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .append("text")
      .attr("y", 25)
      .attr("dy", ".71em")
      .attr("x", width/2)
      .style("text-anchor", "middle")
      .text("YEARS SINCE START OF CAREER")
      .style("fill", "#AAA"); 

    svg.append("g")
      .attr("class", "y axis")
      .append("rect")
      .attr("class","bg")
      .attr("width",20)
      .attr("height",height)
      .attr("x", -20);

    svg.selectAll(".y.axis")
      .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -14)
        .attr("dy", ".71em")
        .attr("x", -height/2)
        .style("text-anchor", "middle")
        .text("THOUSANDS OF 2018 DOLLARS")
        .style("fill", "#fff")
        .style("font-weight","bold");

    svg.selectAll(".x.axis .tick:last-of-type text")
      .attr("x", -8);

    svg.selectAll(".y.axis .tick text")
      .attr("x", 18)
      .attr("y", ".75em");

    var degree = svg.selectAll(".degree")
      .data(degrees)
      .enter().append("g")
      .attr("class", "degree");

    degree.append("path")
      .attr("class", "line")
      .attr("d", function(d) { console.log(d); return line(d.values); })
      .attr("n", function(d) { return d.name })
      .style("stroke", function(d) {
        var color = "";
        $("div.dropdown").each(function() {
          if($(this).dropdown("get text") == d.name)
            color = $(this).data("color");
        });
        return color;
      });

    // Add our elements for focus
    var focus = svg.append("g")
      .attr("class", "focus")
      .style("display", "none");
    focus.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", height)
      .style("stroke","#1C2E38")
      .style("stroke-dasharray", "4,4")
      .style("stroke-width","1px");

    // For each line, add a focus circle
    degree.each(function(d) {
      focus.append("circle")
      .attr("r", 4.5)
      .attr("parent", d.name)
      .attr("class", "focus dot")
      .attr("fill", svg.selectAll("[n='" + d.name + "']").style("stroke"));
    });

    svg.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height)
      .style("fill","transparent")
      .on("mouseout", function() { degreeChart.toggleKey(target, focus, "hide"); })
      .on("mousemove", mousemove);

    function mousemove() {

      if (mobile.matches == false) {
        var x0 = x.invert(d3.mouse(this)[0]);
        if(x0 < 42) {
          var i = bisectDate(data, x0, 1),
          d0 = data[i - 1],
          d1 = data[i],
          d = x0 - d0.year > d1.year - x0 ? d1 : d0;

          svg.selectAll(".focus.dot").style("display","none");
          for(var key in d) {
            if(key != "year" && d[key] > 0) {
              focus.attr("transform", "translate(" + x(d.year) + ", 0)");
              var focusDot = svg.selectAll("[parent='" + key + "']")
                .attr("transform", "translate(0, " + y(d[key]) + ")")
                .style("display",null);
            }
          }
          degreeChart.fillKey(target, d, x(d.year), margin);
          degreeChart.toggleKey(target, focus, "show");
        }
      }
      
    }

    function slideMove(){
      var slider = document.querySelectorAll(".slider");
      var output = document.getElementById("slider__number");
      output.value = slider[0].value; // Display the default slider value

      function moveSliderAndInput(slider, output){
        var sliderPos = slider.value / slider.max;
        let pixelPostion;
        var percent = (slider.value - 1) / (slider.max - slider.min) * 100;

        if (sliderPos < 0.51) {
          pixelPostion =  Math.round(slider.clientWidth * (sliderPos * 1));
        } else {
          pixelPostion =  Math.round(slider.clientWidth * sliderPos);
        }

        // color the slider to the left of the thumb
        $(slider).css(
          "background",
          "linear-gradient(to right, #2A3F49 0%, #2A3F49 " +
            percent +
            "%, #d5d9da " +
            percent +
            "%, #d5d9da 100%)"
        );

        output.style.left = `${pixelPostion - 25}px`;
      }

      // // Update the current slider value (each time you drag the slider handle)
        slider[0].oninput = function(){
          output.value = this.value;
          moveSliderAndInput(slider[0], output);
          sliderUpdatesGraph(slider[0]);
        }

        output.oninput = function(){
          slider[0].value = output.value;
          console.log(slider[0].value + " " + output.value);
          moveSliderAndInput(slider[0], output);
          sliderUpdatesGraph(slider[0]);
        }

      function sliderUpdatesGraph(slider){
        if (slider.id == "median-annual-slider") {
           let x0 = slider.value;
          if(x0 < 43) {
            var i = slider.value,
            d0 = data[i - 1],
            d1 = data[i],
            d = x0 - d0.year > d1.year - x0 ? d1 : d0;


            svg.selectAll(".focus.dot").style("display","none");
            for(var key in d) {
              if(key != "year" && d[key] > 0) {
                focus.attr("transform", "translate(" + x(d.year) + ", 0)");
                var focusDot = svg.selectAll("[parent='" + key + "']")
                  .attr("transform", "translate(0, " + y(d[key]) + ")")
                  .style("display",null);
              }
            }
            degreeChart.fillKey(target, d, x(d.year), margin);
            degreeChart.toggleKey(target, focus, "show");
          }
        }
      }

      sliderUpdatesGraph(slider[0]);
    }

    slideMove();

  });
};


degreeChart.drawPercentileChart = function(filename, filters, target) {

  var margin = {top: 0, right: 0, bottom: 0, left: 20},
    width = 900 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  var margin2 = {top: 30, right: 90, bottom: 0, left: 65},
    height2 = 480 - margin2.top - margin2.bottom;
    width2 = 900 - margin2.left - margin2.right;

  if (mobile.matches) {
    margin.top = 0;
    var width = window.innerWidth - margin.left - margin.right,
        width2 = window.innerWidth - margin2.left - margin2.right,
        height = 400 - margin.top - margin.bottom;
  } else {
    var width = 900 - margin.left - margin.right,
        height = 360 - margin.top - margin.bottom;
  }

  var bisectDate = d3.bisector(function(d) { return d.Percentile; }).left;

  var x = d3.scale.linear().range([0, width]);
  var x2 = d3.scale.linear().range([0, width2]);

  var y = d3.scale.linear().range([height, 0]);
  var y2 = d3.scale.linear().range([height, 0]);

  var color = d3.scale.category10();

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(mobile.matches ? 4 : 8)
    .tickSize(0);

  var xAxis2 = d3.svg.axis().scale(x2).orient("bottom").tickSize(0);

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(3)
    .tickSize(-width, 0, 0)
    .outerTickSize(0)
    .tickFormat(
      function(d) {
        if(d > 999999) {
          var num = Math.round(d/100000) / 10;
        }
        else{
          var num = (Math.round(d/10000) / 100).toString();
          if(num.length > 2) {
            num = num.replace(/^0+/, '');
          }
        }
        return num;
      }
    );

  var line = d3.svg.line()
    .interpolate("monotone")
    .x(function(d) { return x(d.percentile); })
    .y(function(d) { return y(d.income); });

  $(target + " .chart-contain svg").remove();

  var svg = d3.select(target + " .chart-contain").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height2 + margin2.top + margin2.bottom)
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

  var main = svg.append("g")
    .attr("class", "main")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  main.append("defs").append("svg:clipPath")
    .attr("id", "clip")
  .append("rect")
    .attr("id","clip-rect")
    .attr("x",0)
    .attr("y",0)
    .attr("width", width)
    .attr("height", height);

  var context = svg.append("g")
    .attr("class", "context")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

  d3.csv(filename, function(data) {

    data = degreeChart.filterDateByDegree(data, filters, "Percentile");

    color.domain(d3.keys(data[0]).filter(function(key) { return key !== "Percentile"; }));
    
    var degrees = color.domain().map(function(name) {
      return {
        name: name,
        values: data.map(function(d) {
          return {percentile: +d.Percentile, income: +d[name]};
        })
      };
    });

    x.domain([0,100]);

    var brush = d3.svg.brush()
      .x(x2)
      .on("brush", brushed);

    y.domain([
      d3.min(degrees, function(c) { return d3.min(c.values, function(v) { return v.income; }); }),
      d3.max(degrees, function(c) { return d3.max(c.values, function(v) { return v.income; }); })
    ]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    main.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("stroke", "#2A3F49")
      .style("stroke-width","1px")
      .style("shape-rendering", "crispEdges;");

    main.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .append("text")
      .attr("y", 25)
      .attr("dy", ".71em")
      .attr("x", width/2)
      .style("text-anchor", "middle")
      .text("PERCENTILE OF EARNINGS DISTRIBUTION")
      .style("fill", "#AAA");

    main.append("g")
      .attr("class", "y axis")
      .append("rect")
      .attr("class","bg")
      .attr("width",20)
      .attr("height",height)
      .attr("x", -20);

    main.selectAll(".y.axis")
      .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -14)
        .attr("dy", ".71em")
        .attr("x", -height/2)
        .style("text-anchor", "middle")
        .text("MILLIONS OF 2014 DOLLARS")
        .style("fill", "#fff")
        .style("font-weight","bold");

    main.selectAll(".x.axis .tick text")
      .attr("x", 0);

    main.selectAll(".x.axis .tick:last-of-type text")
      .attr("x", -10);

    main.selectAll(".y.axis .tick text")
      .attr("x", 20)
      .attr("y", ".75em");

    var degree = main.selectAll(".degree")
      .data(degrees)
      .enter().append("g")
      .attr("class", "degree")
      .attr("clip-path", "url(#clip)");

    degree.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      .attr("n", function(d) { return d.name })
      .style("stroke", function(d) {
        var color = "";
        $("div.dropdown").each(function() {
        if($(this).dropdown("get text") == d.name) {
          color = $(this).data("color");
        }
        });
        return color;
      });

    // Add our elements for focus
    var focus = main.append("g")
      .attr("class", "focus")
      .style("display", "none");
    focus.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", height)
      .style("stroke","#444")
      .style("stroke-dasharray", "4,4")
      .style("stroke-width","1px");

    // For each line, add a focus circle // PROBLEM
    degree.each(function(d) {
      focus.append("circle")
      .attr("r", 4.5)
      .attr("parent", d.name)
      .attr("fill", main.selectAll("[n='" + d.name + "']").style("stroke"));
    });

    main.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height)
      .style("fill","transparent")
      .on("mouseout", function() { degreeChart.toggleKey(target, focus, "hide"); })
      .on("mousemove", mousemove);

    function mousemove() {
      if (mobile.matches == false) {
        var x0 = x.invert(d3.mouse(this)[0]);
        if(x0 < 95) {
          var i = bisectDate(data, x0, 1),
          d0 = data[i - 1],
          d1 = data[i],
          d = x0 - d0.Percentile > d1.Percentile - x0 ? d1 : d0;

          for(var key in d) {
            if(key != "Percentile") {
            focus.attr("transform", "translate(" + x(d.Percentile) + ", 0)");

            var focusDot = svg.selectAll("[parent='" + key + "']")
              .attr("transform", "translate(0, " + y(d[key]) + ")");
            }
          }
          degreeChart.fillKey(target, d, x(d.Percentile), margin);
          degreeChart.toggleKey(target, focus, "show");
        }
      } 
    }

    function slideMove(){
      var slider = document.querySelectorAll(".slider");
      var output = document.getElementById("slider__number2");
      output.value = slider[1].value; // Display the default slider value

      function moveSliderAndInput(slider, output){
        let width = slider.clientWidth - 15,
            min = slider.min,
            max = slider.max,
            offset = -3.5,
            percent2 = (slider.value - min) / (max - min),
            percent3 = (slider.value - min) / (max - min) * 100;

        // the position of the output
        newPosition = width * percent2 + offset;

        // color the slider to the left of the thumb
        $(slider).css(
          "background",
          "linear-gradient(to right, #2A3F49 0%, #2A3F49 " +
            (Math.round(percent3)) +
            "%, #d5d9da " +
            (Math.round(percent3)) +
            "%, #d5d9da 100%)"
        );

        // console.log(max - min);

        // console.log(pixelPosition);
        output.style.left = `${newPosition - 5}px`;

      }

      // Update the current slider value (each time you drag the slider handle)
        slider[1].oninput = function(){
          output.value = this.value;
          moveSliderAndInput(slider[1], output);
          sliderUpdatesGraph(slider[1]);
        }

        output.oninput = function(){
          slider[1].value = output.value;
          console.log(slider[1].value + " " + output.value);
          moveSliderAndInput(slider[1], output);
          sliderUpdatesGraph(slider[1]);
        }

      function sliderUpdatesGraph(slider){
        if (slider.id == "median-annual-slider") {
           let x0 = slider.value;
          if(x0 < 43) {
            var i = slider.value,
            d0 = data[i - 1],
            d1 = data[i],
            d = x0 - d0.year > d1.year - x0 ? d1 : d0;


            svg.selectAll(".focus.dot").style("display","none");
            for(var key in d) {
              if(key != "year" && d[key] > 0) {
                focus.attr("transform", "translate(" + x(d.year) + ", 0)");
                var focusDot = svg.selectAll("[parent='" + key + "']")
                  .attr("transform", "translate(0, " + y(d[key]) + ")")
                  .style("display",null);
              }
            }
            degreeChart.fillKey(target, d, x(d.year), margin);
            degreeChart.toggleKey(target, focus, "show");
          }
        } else {
          let x0 = slider.value - 4;
          if(x0 < 95) {
            var i = slider.value -4,
            d0 = data[i - 1],
            d1 = data[i],
            d = x0 - d0.Percentile > d1.Percentile - x0 ? d1 : d0;

            for(var key in d) {
              if(key != "Percentile") {
              focus.attr("transform", "translate(" + x(d.Percentile) + ", 0)");

              var focusDot = svg.selectAll("[parent='" + key + "']")
                .attr("transform", "translate(0, " + y(d[key]) + ")");
              }
            }
            degreeChart.fillKey(target, d, x(d.Percentile), margin);
            degreeChart.toggleKey(target, focus, "show");
          }  
        }
      }

      sliderUpdatesGraph(slider[1]);
    }

    slideMove();


function controlPercentileEarnings(){
    let handles = document.querySelectorAll(".ui-slider-handle"),
        percentileStartHandle = handles[0].getBoundingClientRect(),
        percentileEndHandle = handles[1].getBoundingClientRect(),
        startContainer = document.getElementById("percentile__start-container"),
        startInput = document.getElementById("percentile__start"),
        endContainer = document.getElementById("percentile__end-container"),
        endInput = document.getElementById("percentile__end"),
        startVal = startInput.value,
        endVal,
        slider = document.querySelectorAll(".slider"),
        output = document.getElementById("slider__number2");

      if (endInput.value <= 95) {
        endVal = endInput.value;
      } else {
        endVal = 95;
      }

      startContainer.style.left = `${percentileStartHandle.left}px`;
      endContainer.style.left = `${percentileEndHandle.right - 40}px`;
    

    startInput.oninput = function(){
      startVal = startInput.value;
      $('#slider-range').slider("option", "values", [startVal, endVal]);
      moveToolTips("start");
      brushed();
      adjustMainPercentileSlide();
    }

    endInput.oninput = function(){
      let val = event.target.value;

      if (val < startVal) {
        endVal = Number(startVal) + 1;

      } else if (endInput.value <= 95) {
        endVal = endInput.value;

        $('#slider-range').slider("option", "values", [startVal, endVal]);
      } else {
        endVal = 95;

        $('#slider-range').slider("option", "values", [startVal, endVal]);
      }

      moveToolTips("end");
      brushed();
      adjustMainPercentileSlide();
    }

    function moveToolTips(handle){
      percentileStartHandle = handles[0].getBoundingClientRect();
      percentileEndHandle = handles[1].getBoundingClientRect();


      if(handle == "start") {
        startContainer.style.left = `${percentileStartHandle.left - 10}px`;
      } else if (handle == "end") {
        endContainer.style.left = `${percentileEndHandle.left - 10}px`;
      } else {
        startContainer.style.left = `${percentileStartHandle.left - 10}px`;
        endContainer.style.left = `${percentileEndHandle.left - 10}px`;
      }

    }

    $(window).resize(function(){
      moveToolTips("end");
    })

    function adjustMainPercentileSlide(){
      let topSlider = slider[1];

      function checkForChange(num, current){
        if (num == current) {
          return false;
        } else {
          return true;
        }
      }

      // update end slider 

      function updateEndValues(){
        let newNumber = Number(endInput.value),
            currentMax = Number(topSlider.max) == 95 ? 100 : Number(topSlider.max),
            currentPosition = Number(topSlider.value),
            percentileEndHandle = handles[1].getBoundingClientRect();



        if (checkForChange(newNumber, currentMax)) {
          if (endInput.value < 95) {
            endVal = endInput.value;
          } else {
            endVal = 95;
          }

          topSlider.setAttribute("max", endVal);

          console.log(`${topSlider.value}`);


          topSlider.value > topSlider.min ? topSlider.value = currentPosition - (currentMax - newNumber) : topSlider.value = topSlider.min;

          // if (output.value > endVal) { output.value = endVal; }

          endContainer.style.left = `${percentileEndHandle.left - 10}px`;
          output.value = topSlider.value;
        }
      }

      function updateStartValues(){
        let newNumber = Number(startInput.value),
            currentMin = Number(topSlider.min) == 5 ? 5 : Number(topSlider.min),
            percentileStartHandle = handles[0].getBoundingClientRect();

        if (checkForChange(newNumber, currentMin)) {

          // next, get updated min value and define it
          // if value is greater than 5 (where our percentile starts, set min to value)
          // update the slider attribute, add one since our percentile scale starts at 0
          if (startInput.value > 5) {
            startVal = Number(startInput.value);
            topSlider.setAttribute("min", startVal + 1);
          } else {

            topSlider.setAttribute("min", 5);
          }

          topSlider.value > topSlider.min ? topSlider.value = newNumber / 2 : topSlider.value = topSlider.min;

          startContainer.style.left = `${percentileStartHandle.left - 10}px`;
          output.value = topSlider.value;       
        }
      }

      updateEndValues();
      updateStartValues();
    }


    $('#slider-range').on("slide", function(event, ui){
      brushed();

      adjustMainPercentileSlide();
    });
  }

  controlPercentileEarnings();

    function brushed() {
      var startHandle = document.getElementById("percentile__start");
      var endHandle = document.getElementById("percentile__end");
      var brushRange = brush.extent();

      brushRange.splice(0,1,startHandle.value);
      brushRange.splice(1,1,endHandle.value);

      x.domain(brushRange);

        y.domain([
          d3.min(degrees, function(c) {
            return d3.min(c.values, function(v) {
              if(Math.floor(brushRange[0]) <= v.percentile && v.percentile <= Math.ceil(brushRange[1]))
                return v.income;
            })
          }),
          d3.max(degrees, function(c) {
            return d3.max(c.values, function(v) {
              if(Math.floor(brushRange[0]) <= v.percentile && v.percentile <= Math.ceil(brushRange[1]))
                return v.income;
            })
          })
        ]);

      main.selectAll(".degree path")
        .attr("d", function(d) { return line(d.values); })
      main.select(".x.axis").call(xAxis);
      main.select(".y.axis").call(yAxis);
      main.selectAll(".y.axis .tick text")
        .attr("x", 20)
        .attr("y", ".75em");
      main.selectAll(".x.axis .tick text")
      .attr("x", 0);
      main.selectAll(".x.axis .tick:last-of-type text")
        .attr("x", -10);
    } 

  });

};