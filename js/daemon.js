var groundhog_seconds         = 60;

var daemon = daemon || new function() {
  setInterval(
    function() { 
      NEWRELIC.fetch_and_display_app_stats( NEWRELIC.process_stats ); 
    },
    groundhog_seconds * 1000 
  );
  setInterval(
    function() { 
      AIRBRAKE.check_for_new_errors(); 
    },
    groundhog_seconds * 1000 
  );
};

// on initial load
NEWRELIC.fetch_and_display_app_stats( NEWRELIC.process_stats );
AIRBRAKE.check_for_new_errors();