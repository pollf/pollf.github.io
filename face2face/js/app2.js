// Session Token etc. Later this will be generated by a server
var apiKey = "45914242";
var sessionId = "1_MX40NTkxNDI0Mn5-MTUwMDQ4MjE4OTg3OX5sQS9BRXZTYnAyeitaZ3NOMWZ3WTk1SEF-fg";
// token valid 7 days from  11.07.2017
var token = "T1==cGFydG5lcl9pZD00NTkxNDI0MiZzaWc9ZDY3YjFlOGVhMzFkYTIzODMwZmJjM2Y0YmViZTM1YzJkMWMyOWZlNDpzZXNzaW9uX2lkPTFfTVg0ME5Ua3hOREkwTW41LU1UVXdNRFE0TWpFNE9UZzNPWDVzUVM5QlJYWlRZbkF5ZWl0YVozTk9NV1ozV1RrMVNFRi1mZyZjcmVhdGVfdGltZT0xNTAwNDgyMjA3Jm5vbmNlPTAuOTE0Nzg3OTcyODg1NzM2NyZyb2xlPXB1Ymxpc2hlciZleHBpcmVfdGltZT0xNTAzMDc0MjA1JmluaXRpYWxfbGF5b3V0X2NsYXNzX2xpc3Q9";


// global session status variables ############################################
/*
enables access to the session, stream and 
thus the name that was created with the stream 
*/
var myPublisher;

// Session object is needed for signaling
var session

// the choosen name and the fully qualified name for referencing
var myUserName;
var myFullUserName;

// numer of connected peers (streams that you are subscribed to)
var numOfPeers;

// streamId of currently talking peer
var talksNow;

// Queue for talkers (FIFO)
var talkingQueue = [];

// define connection to ui ids (bases + StreamName + RandomNumber)
var uiUserName = "#stream-panel-username-";
var uiStreamContainer = "#stream-panel-body-";
var uiTalkStatus = "#talking-info-";
var uiTalkTime = "#talking-time-";

// not stream dependent ui ids
var streamArea = "#stream-area";
var uiUserNameInput = "#user-name-input";
var uiLog = "#log-text-area";




// global helper variables (timekeeping etc.)
var maxTalkingTime = 60; // in seconds
var talkingStartedAt;
var timeCountdownInterval;

// ############################################################################


// The beginning
// ############################################################################
$("#btn_join_session").click(function() {
    // check if a username was entered, only then proceed
    var userName = $(uiUserNameInput).val();
    if (userName !== "") {
        myUserName = userName;
        log("Hello, " + userName);
        $("#start_panel").slideUp();
        $("#meeting-panel").slideDown();

        // generate random Number, to make sure the name is unique
        // because it is used for referencing later
        var rand = getRandomInt(1, 9999);
        myFullUserName = userName + "-" + rand;
        // remove all whitespace
        myFullUserName = myFullUserName.replace(/ /g, '')
        log("Your full Username for this Session is " + myFullUserName);

        // connect to session using the choosen name
        initializeSession();

    } else {
        log("You need to choose a username to proceed!");
    }
});


// Initialize Session
// ############################################################################
// Handle TokBox Errors by passing them to the console
function handleError(error) {
    if (error) {
        log("TOKBOX: " + error.message);
    }
}

function initializeSession() {
    session = OT.initSession(apiKey, sessionId);
    log("Session initialized");

    // Subscribe to a newly created stream
    session.on('streamCreated', function(event) {
        // Create HTML for Subscribing
        addStreamToHTML(event.stream.name, "info");
        var element = uiStreamContainer.replace("#", "") + event.stream.name;
        session.subscribe(event.stream, element, {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        }, handleError);
    });

    // React to destroyed Stream
    session.on("streamDestroyed", function(event) {
        // Remove affected Stream Container from DOM
        var element = event.stream.name;
        $("#" + element).remove();
    });

    // Create a publisher
    // Create HTML for Publisher
    addStreamToHTML(myFullUserName, "primary");
    var element = uiStreamContainer.replace("#", "") + myFullUserName;
    myPublisher = OT.initPublisher(element, {
        insertMode: 'append',
        width: '100%',
        height: '100%',
        name: myFullUserName
    });

    myPublisher.setStyle('audioLevelDisplayMode', 'on');


    myPublisher.setStyle('audioLevelDisplayMode', 'on');
    myPublisher.on('audioLevelUpdated', function(event) {
        var audioLevel = event.audioLevel;
        if (audioLevel > 0.2) {
            //logToConsole(" Currently talking. audioLevel " + event.audioLevel);
        }
    });

    function publishStream() {
        session.publish(myPublisher).on("streamCreated", function(event) {
            log(myUserName + " started publishing Stream " + myPublisher.stream.streamId);
            // enter meeting with audio turned off
            myPublisher.publishAudio(false);
        });
    }

    session.connect(token, publishStream);
    // Which function to call if a signal is received
    session.on("signal", receiveSignal);
}




// Signals
// ############################################################################

// Sending Signals
// Used from the log function to send Log to everyone
function signalGlobalLog(logMessage) {
    log("You dispatched a signalGlobalLog");
    session.signal({
        data: "log#" + logMessage
    });
}

// Fired if you click the Let me talk Button
function signalLetMeTalk() {
    log("You dispatched a signalLetMeTalk");
    session.signal({
        data: "letMeTalk#" + myFullUserName
    });
}

// Fired if you click the done talking button
function signalDoneTalking() {
    log("You dispatched a signalDoneTalking");
    session.signal({
        data: "doneTalking#" + myFullUserName
    });
}

// Signal your remaining talk time
function signalTalkTimeLeft(talkTimeLeft){
	session.signal({
        data: "talkTimeLeft#" + myFullUserName + "#" + talkTimeLeft
    });
}

// ##################################################################
// Processing Signals
function receiveSignal(event) {
    var res = event.data.split("#");
    var cmd = res[0];

    switch (cmd) {
        case "log":
            message = res[1];
            logGlobal(message);
            break;
        case "letMeTalk":
            senderFullName = res[1];
            handleLetMeTalk(senderFullName);
            break;
        case "doneTalking":
            senderFullName = res[1];
            handleDoneTalking(senderFullName);
            break;
        case "talkTimeLeft":
        	senderFullName = res[1];
        	talkTimeLeft = res[2];
        	handleTalkTimeLeft(senderFullName, talkTimeLeft); 
        	break;  
        default:
            log("ERROR: signaled command not found " + cmd);
    }
}

// ##################################################################
// Functions used to process signals
function handleLetMeTalk(streamName) {
    // If nobody is currently talking
    if (talksNow == null && talkingQueue.length == 0) {
        // if you are the one that wants to talk
        if (streamName === myFullUserName) {
            myPublisher.publishAudio(true)
            // for timekeeping
            talkingStartedAt = new Date().getTime() / 1000;
            timeCountdownInterval = intervalTrigger();
        }
        // In every case, set the talksNow Variable
        talksNow = streamName;
        log(talksNow + " is now talking");
        updateUiTalkStatus();
        // if somebody is already talking
    } else if (talksNow != null) {
        // are you already in the queue or talking right now? 
        inQueue = $.inArray(streamName, talkingQueue);
        if (inQueue == -1 && talksNow != streamName) {
            talkingQueue.push(streamName);
            log("Queue: " + JSON.stringify(talkingQueue));
        }
    }
}

function handleDoneTalking(streamName) {
    // if ther is nobody waiting to talk
    if (streamName === myFullUserName) {
        myPublisher.publishAudio(false);
        updateUiTalkStatus();
        // Stop Timer
        window.clearInterval(timeCountdownInterval);
    }
    if (talkingQueue.length == 0) {
        talksNow = null;
        updateUiTalkStatus();
    }
    // if there are people waiting to talk
    if (talkingQueue.length > 0) {
        // get the next talker (FIFO)
        talksNow = talkingQueue.shift();
        log(talksNow + "is now talking");
        if (talksNow == myFullUserName) {
            // for timekeeping
            myPublisher.publishAudio(true);
            talkingStartedAt = new Date().getTime() / 1000;
            timeCountdownInterval = intervalTrigger();
        }
        updateUiTalkStatus();
    }
}

function handleTalkTimeLeft(streamName, talkTimeLeft){
	$(uiTalkTime + streamName).css("width", 100 * (talkTimeLeft / maxTalkingTime) + "%");
    $(uiTalkTime + streamName).html(talkTimeLeft);
}

// React to Button Clicks
// ############################################################################

// Toogle Video for own Stream
$("#btn_toggle_video").click(function() {
    if (myPublisher.stream.hasVideo) {
        log(myPublisher.stream.name + "  disabled Video", true);
        myPublisher.publishVideo(false);
    } else {
        log(myPublisher.stream.name + "  enabled Video", true);
        myPublisher.publishVideo(true);
    }
});

// Send a let me talk signal
$("#btn_letmetalk").click(function() {
    log(myPublisher.stream.name + "  wants to talk", true);
    signalLetMeTalk();
});

// Send a done talking Signal
// Send a let me talk signal
$("#btn_donetalking").click(function() {
    if (talksNow === myFullUserName) {
        log(myPublisher.stream.name + "  will stop talking", true);
        signalDoneTalking();
    }
});

// ############################################################################
// Timekeeping
function intervalTrigger() {
    return window.setInterval(function() {
        countDownTalkTime();
    }, 1000);
}

function countDownTalkTime() {
    var talkTimeNow = new Date().getTime() / 1000;
    var timeTalked = talkTimeNow - talkingStartedAt;
    if (timeTalked >= maxTalkingTime) {
        log("your talk time is over");
        signalDoneTalking();
        // remove this interval trigger
        window.clearInterval(timeCountdownInterval);
        talkStartedAt = null;
        timeTalked = null;
        return;

    }
    // signal talk time left to others
    signalTalkTimeLeft(Math.floor(maxTalkingTime - timeTalked));
}


// Logging
// ############################################################################
// writes line to logging text area
// ToDo: option to publish to all peers
function log(message, global) {
    if (!global) {
        timestamp = new Date().toLocaleTimeString();
        $(uiLog).prepend("\n");
        $(uiLog).prepend("[LOCAL] ", timestamp, ":  ", message);
    } else {
        signalGlobalLog(message);
    }

}

// Could be solved nicer
function logGlobal(message) {
    timestamp = new Date().toLocaleTimeString();
    $(uiLog).prepend("\n");
    $(uiLog).prepend("[GLOBAL] ", timestamp, ":  ", message);
}

// Helper Functions
// ############################################################################
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateUiTalkStatus() {
        $(".label-talkstatus").html("");
        $(".timeleft-progress").html("");
        $(".timeleft-progress").css("width", "100%");

        if (talksNow != null) {
            $(uiTalkStatus + talksNow).html(`<span class="glyphicon glyphicon-volume-up" aria-hidden="true">`);
        }
}



// HTML Creation
// ############################################################################
// Style can be primary or info
function addStreamToHTML(fullUserName, style) {
    var template = `<div class="panel panel-` + style + ` panel-stream" id="` + fullUserName + `">
	<div class="panel-heading">
	<h3 class="panel-title" id="` + uiUserName.replace("#", "") + fullUserName + `">` + fullUserName.split("-")[0] + `</h3>
	</div>
	<div class="panel-body">
	<div class="stream-panel-body" id="` + uiStreamContainer.replace("#", "") + fullUserName + `">
	</div>
	<table class="table-bordered stream-info-table">
	<tr>
	<td>
	<big><span class="label label-info label-talkstatus" id="` + uiTalkStatus.replace("#", "") + fullUserName + `"></span></big>
	</td>
	</tr>
	<tr>
	<td>
	<div class="timeleft-progress-wrapper">
	<div class="progress-bar timeleft-progress" id="` + uiTalkTime.replace("#", "") + fullUserName + `" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%;">
	
	</div>
	</div>
	</td>
	</tr>
	</table>
	</div>`

    // Insert html to Stream Area
    $(streamArea).append(template);
}