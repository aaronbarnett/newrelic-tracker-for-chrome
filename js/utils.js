/* by John Manoogian III / jm3 */

var DEBUG = true;
const SESSION_SCOPE = 2;

var AIRBRAKE = {
  account_name: function() {
    return localStorage["airbrake_account_name"];
  },

  auth_token: function() {
    return localStorage["airbrake_auth_token"];
  },

  api_endpoint: "https://ACCOUNT_NAME.airbrake.io/",

  response_slots: [ "id", "project-id", "created-at", "action", "error-class", "error-message", "file", "rails-env", "line-number", "most-recent-notice-at", "notices-count" ],

  build_cache: function() {
    var c = localStorage["airbrake_cache"];
    if( !c ) {
      return new Array();
    } else {
      return c.split( " " );
    }
  },

  check_for_new_errors: function() {
    var ht = new Object();

    if( !this.account_name() || !this.auth_token() )
      return;
    var errors_url = this.api_endpoint.replace( /ACCOUNT_NAME/, this.account_name()) +
      ("/errors.xml?auth_token=TOK").replace( /TOK/, this.auth_token() );

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() { AIRBRAKE.display_new_errors(xhr) };
    xhr.open("GET", errors_url, true);
    xhr.send();
  },

  seen_error: function( id ) {
    var airbrake_cache = airbrake_cache || this.build_cache();
    if( $.inArray( id, airbrake_cache ) != -1 )
     return id;
    else {
       airbrake_cache.push( id );
       localStorage["airbrake_cache"] = airbrake_cache.join(' ');
       return;
    }
  },

  display_new_errors: function( xhr ) {
    if( xhr.readyState != 4 ) return;
    if( xhr.status != 200 ) { c( "display_new_errors: error! - " + xhr.status ); return; } // FIXME: handle / bubble up error

    var errors = $(xhr.responseXML).find( "groups" ).find( "group" );
    var errors_skipped = 0;
    
    $.each( errors, function( i, error ) {
      if( !AIRBRAKE.seen_error( $(error).find( "id" ).text()))
        AIRBRAKE.display_error( error );
      else
        errors_skipped = i;
    });
      c( "Skipped " + errors_skipped + " previously seen Airbrake errors." );
  },

  display_error: function( e ) {
    var e = $(e);
    var env_filter = localStorage['rails_env_filter']

    // var link_to_error =
    //   this.api_endpoint.replace( /ACCOUNT_NAME/, this.account_name() )
    //   + "errors/" + e.find( "id" ).text();
    //var qs = "link=" + escape( link_to_error);
    var map = {}

    // marshall the good bits from the XHR response object to query string
    $.each( this.response_slots, function(i,v) { 
      //qs += "&" + v + "=" + escape( e.find( v ).text() )
      map[ v ]= e.find( v ).text()
    });
    
    //notifyer = "/screens/notification.html?" + qs
    //webkitNotifications.createHTMLNotification( notifyer ).show();

    if ( !env_filter || env_filter == map['rails-env'] ){
      var teaser = map['rails-env'] +' '+ map['most-recent-notice-at']
      webkitNotifications.createNotification("/images/icn-danger-1.png", map['error-message'], teaser ).show();
    }
  },

  render_error: function() {
    var mesg = get_param( "error-message" );
    if( mesg ) // add spacing so HTML can wrap the errors properly
      mesg = mesg.replace(/::/g, ":: ").replace(/(\w)\/(\w)/g, "$1/ $2").replace(/(\w)Error/g, "$1 Error");
    var link = get_param( "link" );
    $("#notification").append( "<a href='" + link + "' target='airbrake'>" + mesg + "</a>");
    /*
    * fields avail:
    * "id", "project-id", "created-at", "action", "error-class", "error-message", "file", "rails-env", "line-number", "most-recent-notice-at", "notices-count" ];
    * var error_markup = ""
    * $.each( this.response_slots, function(i,v) { error_markup += "<dt>" + v + "</dt><dd>" + get_param(v) + "</dd>" });
    * $("#notification").append( "<dl>" + error_markup + "</dl>" );
    */
  },

  fetch_app_list: function( callback ) {
    // TODO: http://your_account.airbrake.io/data_api/v1/projects.xml
  },

  END: undefined
};

var NEWRELIC = {

  api_endpoint: "https://rpm.newrelic.com/",

  danger_threshold: 0.8,

  api_key: function() {
    return localStorage["newrelic_api_key"];
  },

  primary_app: function() {
    return localStorage["newrelic_primary_app"];
  },

  parse_apps_and_populate_pulldown: function( xhr ) {
    // reset the picker UPI in case of AJAX fail
    $("#newrelic_primary_app" ).attr( "disabled", "true" );
    $("#newrelic_primary_app_ui label" ).addClass( "disabled" );
    if( xhr.readyState != 4 ) return;
    if( xhr.status != 200 || (! xhr.responseXML) ) { c( "error! - " + xhr.status ); return; } // FIXME handle error

    var apps = $(xhr.responseXML).find( "accounts account applications application" );

    if( apps.size() == 1 )
      return;

    var index_set = false;
    for( var i = 0; i < apps.length; i++ ) {
      var name = $(apps[i]).find( "name" ).text();
      var id = $(apps[i]).find( "id" ).text();
      $("#newrelic_primary_app" ).append( "<option value='" + id + "'>" + name + "</option>" );
      if( NEWRELIC.primary_app() == id ) {
        $("#newrelic_primary_app" ).val( id );
        index_set = true;
      }
    }

    // since we couldn't find a match, the user's previously saved primary 
    // app has been deleted or renamed, so default to the first app.
    if( ! index_set )
      localStorage["newrelic_primary_app"] = $(apps[0]).find( "id" ).text();

    $("#newrelic_primary_app" ).removeAttr( "disabled" );
    $("#newrelic_primary_app_ui label" ).removeClass( "disabled" );
  },

  fetch_and_display_app_stats: function( callback ) {
    if( ! this.api_key())
      return signal_error( "First, enter your NewRelic API key." );

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() { callback(xhr) };
    xhr.open("GET", this.api_endpoint + "accounts.xml?include=application_health", true);
    xhr.setRequestHeader("x-api-key", this.api_key());
    xhr.send();
  },

  display_all_app_stats: function() {
    if( ! this.api_key() )
      return signal_error( "First, enter your NewRelic API key." );

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function( x ) {
      if( xhr.readyState != 4 ) return;
      if( xhr.status != 200 ) { c( "display_all_app_stats: error! - " + xhr.status ); return; }
      $("#hud").empty();
      $("#hud").append( xhr.responseText );
    }
    xhr.open("GET", this.api_endpoint + "application_dashboard", true);
    xhr.setRequestHeader("x-api-key", this.api_key());
    xhr.send();
  },

  process_stats: function( xhr ) {
    if( xhr.readyState != 4 ) return;
    if( xhr.status != 200 ) { c( "process_stats: error! - " + xhr.status ); return; } // FIXME: handle / bubble up error

    var apdex =
      $(xhr.responseXML).
      find( "id:contains(" + NEWRELIC.primary_app() + ")" ).
      parent().
      find( "threshold_value[name='Apdex']" ).
      attr( "metric_value" );

    if( isNaN( apdex ))
      return;

    chrome.browserAction.setBadgeText( {text:apdex} );

    /* RGBA order */
    var color, apdex_colors = {
      safe:     [0,  155,    0,  255],
      middling: [0,    0,  255,  225],
      danger:   [255,  0,  0,    255]
    };

    if( parseFloat( apdex ) < NEWRELIC.danger_threshold )
      color = {color:apdex_colors.danger};
    else
      color = {color:apdex_colors.safe};
    chrome.browserAction.setBadgeBackgroundColor( color );
  },

  END: undefined
};

function c( s ) {
  if( DEBUG )
    console.log( s );
}

function get_ga_account_id() {
  return 'UA-23727290-1';
}

function signal_error( s ) {
  $("#note").replaceWith("<h1>" + s + "</h1>");
  c( s );
  $("#hud").hide();
  $("#welcome").show();
  return undefined;
}

/* hack requrired to get jQuery to correctly decode (render) any
 * html/unicode &entities; in translation strings.
 */

function decode_entities( s ) {
  return $("<div/>").html( s ).text();
}

/* loop over all elements with @class attrs and look for any localizables,
 * and set their value from the locale-appropriate messages.json
 */

function localize() {
  var localized_elements = 0;
  $("[class]").each( function() {
    var element = this;
    $.each(element.attributes, function(i, attrib){
      if( attrib.name == "class" ) {

        var class_list = new Array();
        if( attrib.value.indexOf( " " ) != -1 )
          class_list = attrib.value.split( " " );
        else
          class_list[0] = attrib.value;

        for( var j = 0; j < class_list.length; j++ ) {
          var val = class_list[j];

          if( val.match( /^l_/ )) {
            localized_elements ++;
            var key = val.replace( /^l_/, '' );
            $(element).text( decode_entities( chrome.i18n.getMessage( key )));
          }
        }
      }
    });
  });
  c( "localized " + localized_elements + " element(s)");
}

function get_param(name) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}
