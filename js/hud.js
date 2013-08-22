
function setup_ux() {
  if( !NEWRELIC.api_key()) {
    $("#hud").hide();
    $("#footer").hide();
    $("#welcome").show();
  } else {
    $("#hud").show();
    $("#footer").show();
    $("#welcome").hide();
  }
  localize();
}

$(document).ready(function() {
	setup_ux();
	NEWRELIC.display_all_app_stats();
});
