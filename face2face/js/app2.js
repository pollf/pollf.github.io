// global session status variables ############################################
/*
enables access to the session, stream and 
thus the name that was created with the stream 
*/
var myPublisher;

// numer of connected peers (streams that you are subscribed to)
var numOfPeers;

// streamId of currently talking peer
var talksNow;

// global helper variables (timekeeping etc.)
var maxTalkingTime = 20; // in seconds
var talkingStartedAt;


// To be deleted ##############################################################
// UI Test Code

$("#btn_join_session").click(function() {
  $("#start_panel").slideUp();
  $("#meeting-panel").slideDown();
});

/*
$("#testbox").click(function() {
	$("#testbox").remove();
});	
*/