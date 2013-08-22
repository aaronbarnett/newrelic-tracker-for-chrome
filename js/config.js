
$(document).ready(function() {
	localize();
	restore_options();
	$("#save_button").click( save_options );
});


function persist_fields( a ) {
  while( f = a.shift() ) { persist_field( f ); }
}

function persist_field( f ) {
  var val = $("#" + f).val();
  if( val != localStorage[f] ) {
    localStorage[f] = val;
    c( "display feedback that " + val + " was saved successfully to " + f + " in local storage" ); // FIXME
  }
}

function persist_select( s ) {
  var val = $('#' + s + ' option:selected').val();
  if( val && val != localStorage[s] ) {
    c( "menu was: " + $('#' + s + ' option:selected').val());
    localStorage[s] = val;
    c( "display feedback that " + val + " was saved successfully to " + s + " local storage" ); // FIXME
  }
}

function save_options() {
  persist_fields( ["newrelic_api_key", "airbrake_account_name", "airbrake_auth_token", "rails_env_filter"] );
  persist_select( "newrelic_primary_app" )
  window.close();
}

function restore_field( f ) {
  var val = localStorage[f];
  $("#" + f ).val( val );
  return val;
}

function restore_options() {
  if( restore_field( "newrelic_api_key" ))
    NEWRELIC.fetch_and_display_app_stats( NEWRELIC.parse_apps_and_populate_pulldown );
  restore_field( "airbrake_account_name" );
  restore_field( "airbrake_auth_token" );
  restore_field( "rails_env_filter" );
}
