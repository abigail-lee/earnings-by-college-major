// nodelist foreach polyfill
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

$(document).ready(function() {

  //  Overlay
  $(".js-full-screen-overlay").fadeIn(500);
  $(".js-full-screen-overlay-close").click(function() {
    $(".js-full-screen-overlay").fadeOut(500);
    return false;
  });

  //  Sticky navigation
  var $chartNav = $(".degrees-chart nav");
  var chartNavOffset = $chartNav.offset().top;
  var containerTopPadding = $(".degrees-chart .charts").css("padding-top");
  $(window).bind('load resize scroll',function(){
        if (chartNavOffset < $(window).scrollTop()) {
            $chartNav.addClass('sticky');
            // $(".degrees-chart .charts").css("padding-top", $chartNav.outerHeight() + "px");
        } else {
            $chartNav.removeClass('sticky');
            $(".degrees-chart .charts").css("padding-top", containerTopPadding);
        }
    });

  //  Kickoff chart building
  d3.csv("data/median_.csv", function(data) {

    //  Returns just our column headers, except "year"
    var headers = d3.keys(data[0]).filter(function(key) { return key !== "year"; });

    var grouping = ["Some High School", "High School Degree or GED", "Some College, No Degree", "Associate Degree"];
    var nonDegreeGroup = document.querySelectorAll(".section.less-than-bachelors");
    var degreeGroup = document.querySelectorAll(".section.bachelors");
    var dropdowns = document.querySelectorAll("div.dropdown");


    headers.forEach(function(header) {
      if(grouping.indexOf(header) != -1) {
        nonDegreeGroup.forEach(function(x) {
          x.innerHTML +=  "<div class='item'>" + header + "</div>"; 
        })
      } else {
        degreeGroup.forEach(function(x) {
          x.innerHTML +=  "<div class='item'>" + header + "</div>"; 
        })
      }
    });

    dropdowns.forEach(function(x){
      $(x).dropdown({
        onChange: function(value, text, $selectedItem){
          var items = document.querySelectorAll(".dropdown .menu .item"),
              parents = ["dropdown--one", "dropdown--two", "dropdown--three", "dropdown--four"],
              nextMenu = $(this)[0].nextElementSibling;
        
          // show next menu upon selection
          if (nextMenu != null) { nextMenu.classList.add("drop-visible") };

          // disable the selection choice in other menus
          parents.forEach(function(y){
            if (y != x.id) {
              let items = document.getElementById(y).querySelectorAll(".item");

              for (var i = 0; i < items.length; i++){
                if (items[i].innerText == text) {
                  items[i].classList.add("disabled");
                  break;
                }
              }
            }
          });
          drawChart();
        },
        placeholder: 'Select a degree to compare'
      });
    });

    // show first few menus
    var chosenLists = document.querySelectorAll("div.dropdown");

    for (var i = 0; i < 1; i++) {
        chosenLists[i].classList.add("drop-visible");
    }

    //  Attach change events to the various fitlers / selectors so that they redraw the chart
    $(".js-chart-selection, .js-chart-filter").change(function() {

      //  Disable each of the selected degrees in the other selects
      $(".js-chart-selection option").attr("disabled", false);
      degreeChart.getFilters().forEach(function(d) {
        $(".js-chart-selection").each(function() {
          if( $(this).val() != d ) {
            $("option[value='" + d + "']", this).attr("disabled", true);
          }
        })
      });
      drawChart();
    });


    // attach change events to only dropdowns so that checkboxes don't trigger the effect
    $(".js-chart-selection").change(function(){
      let totalDrops = chosenLists.length,
          visibleDrops = document.querySelectorAll(".drop-visible").length;

      if (visibleDrops < totalDrops) {
        chosenLists[visibleDrops].classList.add("drop-visible");
      }
    });

    //  Draw our charts for the first time
    $("#dropdown--one").dropdown("set selected", "High School Degree or GED");
    buildRangeSlider();

    function drawChart(){
        degreeChart.drawMedianChart( "data/median_" + degreeChart.getTypes() + ".csv", degreeChart.getFilters(), ".js-chart--median-annual");
        degreeChart.drawPercentileChart( "data/percentile_" + degreeChart.getTypes() + ".csv", degreeChart.getFilters(), ".js-chart--percentile");

        console.log(`median_${degreeChart.getTypes()}.csv`);
    }

    var width = $(window).width();

    $(window).resize(function(){
      if ($(this).width() !== width) {
        drawChart();
        width = $(this).width();
        console.log("go");
      }
    });

  });

  function buildRangeSlider(){
    var $slider = $('#slider-range');

    $slider.slider({
      range: true,
      min: 0,
      max: 100,
      values: [ 0, 100 ],
      slide: function( event, ui ) {
        $( "#percentile__start" ).val(ui.values[ 0 ]);
        $( "#percentile__end" ).val(ui.values[ 1 ]);

      }
    });
  }

  function slider(){
    var slider = document.getElementById("myRange");
    var output = document.getElementById("slider__number");
    output.value = slider.value; // Display the default slider value

    function moveSliderAndInput(){
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

    // Update the current slider value (each time you drag the slider handle)
    slider.oninput = function() {
      output.value = this.value;
      moveSliderAndInput();
    }

    output.oninput = function(){
      slider.value = output.value;
      moveSliderAndInput();
    }
  }

});