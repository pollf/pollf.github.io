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
var uiQueueList = "#queue-area-list-container";
var btnSuperpower = "#btn_superpower";




// global helper variables (timekeeping etc.)
var maxTalkingTime = 60; // in seconds
var talkingStartedAt;
var timeCountdownInterval;
// can be used to get at top of queue directly or to extend talk time by amount
var superpower = 3;
// Seconds gained if talk time is extended
var extendTalkTimeBy = 20;
// for audi level monitoring
var currentAudioLevel;
var histAudioLevel = [];
// used for couning how many seconds at a time the talker was silent
var secondsSilent;

// ############################################################################

//var rect = document.getElementById("log-panel").getBoundingClientRect();
//log(rect.top, rect.right, rect.bottom, rect.left);


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
        // if someone is talking
        if (talksNow != null) {
            signalQueueStatus();
        }
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
        // if you are currently talking, signal done talking
        signalDoneTalking();
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
        currentAudioLevel = event.audioLevel;
        //log("Audio Level " + currentAudioLevel);
        //if (audioLevel > 0.2) {
        //log(" Currently talking. audioLevel " + event.audioLevel);
        //}
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
function signalTalkTimeLeft(talkTimeLeft) {
    session.signal({
        data: "talkTimeLeft#" + myFullUserName + "#" + talkTimeLeft
    });
}

// Signal Agreement to something the talker just said
function signalExpressAgreement() {
    session.signal({
        data: "expressAgreement#" + myFullUserName
    });
}

// Signal Disagreement to something the talker just said
function signalExpressDisagreement() {
    session.signal({
        data: "expressDisagreement#" + myFullUserName
    });
}

// Signal status of current talkingQueue (used to inform new users on the status)
// Only users with a empty Queue should react to this signal
function signalQueueStatus() {
    session.signal({
        data: "queueStatus#" + talksNow + "#" + JSON.stringify(talkingQueue)
    });
}

// Signal that you want to leave the Queue if you are in it
function signalLeaveQueue() {
    log("You dispatched a signalLeaveQueue");
    session.signal({
        data: "leaveQueue#" + myFullUserName
    });
}

// Signal that you want want to use one superpower action
function signalUseSuperpower() {
    session.signal({
        data: "useSuperPower#" + myFullUserName
    });
}

// ##################################################################
// Processing Signals
function receiveSignal(event) {
    var res = event.data.split("#");
    var cmd = res[0];

    switch (cmd) {
        case "log":
            var message = res[1];
            logGlobal(message);
            break;
        case "letMeTalk":
            var senderFullName = res[1];
            handleLetMeTalk(senderFullName);
            break;
        case "doneTalking":
            var senderFullName = res[1];
            handleDoneTalking(senderFullName);
            break;
        case "talkTimeLeft":
            var senderFullName = res[1];
            var talkTimeLeft = res[2];
            handleTalkTimeLeft(senderFullName, talkTimeLeft);
            break;
        case "expressAgreement":
            var senderFullName = res[1];
            expressAgreement(senderFullName);
            break;
        case "expressDisagreement":
            var senderFullName = res[1];
            expressDisagreement(senderFullName);
            break;
        case "queueStatus":
            var talksNow = res[1];
            var queueJson = res[2];
            handleQueueStatusUpdate(talksNow, queueJson);
            break;
        case "leaveQueue":
            var senderFullName = res[1];
            handleLeaveQueue(senderFullName);
            break;
        case "useSuperPower":
            var senderFullName = res[1];
            handleUseSuperpower(senderFullName);
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
            // Update Queue UI 
            updateUiQueue();
            // visualize Queue Injection
            visualizeAddQueue(streamName);
        }
    }
}

function handleDoneTalking(streamName) {
    // if ther is nobody waiting to talk
    if (streamName === myFullUserName) {
        myPublisher.publishAudio(false);
        // Stop Timer
        window.clearInterval(timeCountdownInterval);
        updateUiTalkStatus();
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
        // Update Queue UI 
        updateUiQueue();
    }
}

function handleTalkTimeLeft(streamName, talkTimeLeft) {
    $(uiTalkTime + streamName).css("width", 100 * (talkTimeLeft / maxTalkingTime) + "%");
    $(uiTalkTime + streamName).html(Math.floor(talkTimeLeft));
}

function handleQueueStatusUpdate(talksNowPassed, queueJson) {
    // only if own queue is empty
    if (talkingQueue.length === 0) {
        // BUG?!
        talksNow = talksNowPassed;
        var arr = Object.values(JSON.parse(queueJson));
        talkingQueue = arr.slice();
        log("Received Queue Status");
        updateUiTalkStatus();
        updateUiQueue();
    }
}

function handleLeaveQueue(senderFullName) {
    // Delete Sender from Queue and update Ui accordingly
    var newQueue = talkingQueue.filter(function(e) {
        return e !== senderFullName
    })
    talkingQueue = newQueue;
    updateUiQueue();
    // visualize leaving the Queue
    visualizeLeaveQueue(senderFullName);
}

function handleUseSuperpower(senderFullName) {
    // visulaize that some used a superpower
    // if Sender is you and you are already talking, extend talk time
    log("handleUseSuperpower")
    if (senderFullName === talksNow && myFullUserName === senderFullName) {
        log("extend your talktime");
        // shift talk start
        talkingStartedAt += extendTalkTimeBy;
    }

    // if the queue is empty, you essentially wasted one superpower...
    if (talksNow != senderFullName && talkingQueue.length === 0) {
        //log("Someone wasted his Superpower :D", true);
        // use normal way to get in the queue
        if (senderFullName === myFullUserName) {
            signalLetMeTalk();
        }
    }

    // if the queue is not empty
    if (talkingQueue.length > 0) {
        // put sender in the first place and update queue ui

        // if sender is already in the Queue, just change his position
        var inQueue = $.inArray(senderFullName, talkingQueue);
        if (inQueue != -1) {
            // get current position of tailgater
            var idx = talkingQueue.indexOf(senderFullName);
            if (idx === 0) {
                // wasted a superpower...
                return;
            }
            // get subarray of everyone above the tailgater
            var above = talkingQueue.slice(0, idx);
            // and the ones below
            var below = talkingQueue.slice(idx + 1, talkingQueue.length);
            // put sender at first place
            var talkingQueueTMP = [];
            talkingQueueTMP.push(senderFullName);
            talkingQueueTMP = talkingQueueTMP.concat(above);
            talkingQueueTMP = talkingQueueTMP.concat(below);
            talkingQueue = talkingQueueTMP;
            updateUiQueue();
        }

        // if hes not already in the queue insert him to first position
        if (inQueue == -1) {
            var talkingQueueTMP = [];
            talkingQueueTMP.push(senderFullName);
            talkingQueueTMP = talkingQueueTMP.concat(talkingQueue);
            talkingQueue = talkingQueueTMP;
            updateUiQueue();
        }
    }

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
$("#btn_letmetalk").click(manageTalk);

$(btnSuperpower).click(function() {
    if (superpower > 0) {
        // use up one superpower
        superpower -= 1;
        // display left superpower
        $("#superpower_badge").html(superpower);
        signalUseSuperpower();
    }
    if (superpower === 0) {
        // disable button
        $(btnSuperpower).prop('disabled', true);
    }
});

// A click on Spacebar does the same than a click on the talk button
document.body.onkeyup = function(e) {
    if (e.keyCode == 32) {
        manageTalk();
    }
}

// this blocks the page from scrolling down when spacebar is pressed
document.body.onkeydown = function(e) {
    if (e.keyCode == 32) {
        return false;
    }
}


function manageTalk() {
    inQueue = $.inArray(myFullUserName, talkingQueue);
    // if you are not currently talking 
    if (talksNow != myFullUserName && inQueue == -1) {
        //log(myPublisher.stream.name + "  wants to talk", true);
        signalLetMeTalk();
        // if you are talking, this stops the talking    
    } else if (talksNow === myFullUserName) {
        signalDoneTalking();
    }
    // if you are in the waiting list, this gets you out of it again
    else if (inQueue != -1) {
        signalLeaveQueue();
    }
}

// Send a done talking Signal
// Send a let me talk signal
// All talk management will be one button and current status
/*
$("#btn_donetalking").click(function() {
    if (talksNow === myFullUserName) {
        log(myPublisher.stream.name + "  will stop talking", true);
        signalDoneTalking();
    }
});
*/

// React to clicks on agreement Buttons
$("#btn_agreement").click(signalExpressAgreement);
$("#btn_disagreement").click(signalExpressDisagreement);

// ############################################################################
// Timekeeping
function intervalTrigger() {
    return window.setInterval(function() {
        countDownTalkTime();
    }, 1000);
}

function countDownTalkTime() {

    if (secondsSilent > 9) {
        // reset
        secondsSilent = 0;
        log("you don't say much... talk stopped.");
        // remove this interval trigger
        window.clearInterval(timeCountdownInterval);
        signalDoneTalking();
        talkStartedAt = null;
        timeTalked = null;
        return;
    }

    if (currentAudioLevel < 0.1) {
        secondsSilent += 1;
    } else {
        secondsSilent = 0;
    }

    // issue warning to talker
    if (secondsSilent > 3) {
        log("use your time to talk...");
    }



    /*
    // this works already

    if(histAudioLevel.length < 14){
    	histAudioLevel.push(currentAudioLevel);
    }else{
    	histAudioLevel.shift();
    	histAudioLevel.push(currentAudioLevel);

    	var sumOld = histAudioLevel.slice(0,(histAudioLevel.length/2)-1).reduce(function(a, b) { return a + b; });
    	var sumNew = histAudioLevel.slice(histAudioLevel.length/2, histAudioLevel.length -1).reduce(function(a, b) { return a + b; });
    	var avgOld = sumOld/(histAudioLevel.length/2);
    	var avgNew = sumNew/(histAudioLevel.length/2);
    	log("avg old: " + avgOld);
    	log("avg new: " + avgNew);

    	// if differnce between averages is more the 95% of old average: stop talking
    	if(Math.abs(avgOld - avgNew) > 0.95 * avgOld){
    		log("you don't say much... talk stopped.");
            signalDoneTalking();
            // remove this interval trigger
            window.clearInterval(timeCountdownInterval);
            talkStartedAt = null;
            timeTalked = null;
            return;
    	}
    	
    	// Till here
    	*/

    // caluclate average
    // var sum = histAudioLevel.reduce(function(a, b) { return a + b; });
    // var avg = sum / histAudioLevel.length;
    // log("avg Audio level in the last 8 seconds: " + avg);
    //log(JSON.stringify(histAudioLevel));
    /*
		if(avg <= 0.1){
			log("you don't say much... talk stopped.");
	        signalDoneTalking();
	        // remove this interval trigger
	        window.clearInterval(timeCountdownInterval);
	        talkStartedAt = null;
	        timeTalked = null;
	        return;
		}
		*/
    //}
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
    //signalTalkTimeLeft(Math.floor(maxTalkingTime - timeTalked));
    signalTalkTimeLeft(maxTalkingTime - timeTalked);
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
    //log("Update Ui Talk status called")
    $(".label-talkstatus").html("");
    $(".timeleft-progress").html("");
    $(".panel-stream").removeClass("panel-stream-active");
    $(".timeleft-progress").css("width", "100%");

    if (talksNow != null) {
        $("#" + talksNow).addClass("panel-stream-active");
        $(uiTalkStatus + talksNow).html(`<span class="glyphicon glyphicon-volume-up" aria-hidden="true">`);
    }
}

function updateUiQueue() {
    // clear html element
    $(uiQueueList).html("");
    // write new ol from current waiting list
    var html = "<ol>";
    for (var i = 0; i < talkingQueue.length; i++) {
        html += "<li>" + talkingQueue[i].split("-")[0] + "</li>";
    }
    html += "</ol>";
    $(uiQueueList).html(html);

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

// Signal Agreement or Disagreement nonverbaly
// ############################################################################
function expressAgreement(fullUserName) {
    // delete appended span
    /*
    $("#animate-agreement").remove();
    $(uiUserName + fullUserName).append(`<span class="glyphicon glyphicon-thumbs-up" id="animate-agreement" aria-hidden="true" style=" opacity: 0.0; float: right">`)
    $("#animate-agreement").animate({
        opacity: '1.0'
    });
    $("#animate-agreement").animate({
        opacity: '0.0'
    });
    */

    // get offset position of emitting stream

    var position = $(uiStreamContainer + fullUserName).offset();
    var width = $(uiStreamContainer + fullUserName).width();
    var height = $(uiStreamContainer + fullUserName).height();
    var centerX = position.left + width / 2;
    var centerY = position.top + height / 2;
    var textSize = 100;
    var html = `<span class="glyphicon glyphicon-thumbs-up" id="animate-agreement" aria-hidden="true" style="opacity: 0.0;  font-size: 100px; color: green; position: fixed;">`;


    $(document.body).append(html);
    $("#animate-agreement").css("left", centerX - 50);
    $("#animate-agreement").css("top", centerY - 50);
    $("#animate-agreement").css("position", "fixed");

    $("#animate-agreement").animate({
        opacity: '1.0'
    });
    $("#animate-agreement").animate({
        opacity: '0.0'
    }, {
        complete: function() {
            $("#animate-agreement").remove();
        }
    });

}

function expressDisagreement(fullUserName) {
    // delete appended span
    /*
    $("#animate-agreement").remove();
    $(uiUserName + fullUserName).append(`<span class="glyphicon glyphicon-thumbs-down" id="animate-agreement" aria-hidden="true" style=" opacity: 0.0; float: right">`)
    $("#animate-agreement").animate({
        opacity: '1.0'
    });
    $("#animate-agreement").animate({
        opacity: '0.0'
    });
    */

    var position = $(uiStreamContainer + fullUserName).offset();
    var width = $(uiStreamContainer + fullUserName).width();
    var height = $(uiStreamContainer + fullUserName).height();
    var centerX = position.left + width / 2;
    var centerY = position.top + height / 2;
    var textSize = 100;
    var html = `<span class="glyphicon glyphicon-thumbs-down" id="animate-disagreement" aria-hidden="true" style="opacity: 0.0;  font-size: 100px; color: red; position: fixed;">`;


    $(document.body).append(html);
    $("#animate-disagreement").css("left", centerX - 50);
    $("#animate-disagreement").css("top", centerY - 50);
    //$("#animate-disagreement").css("position", "fixed");

    $("#animate-disagreement").animate({
        opacity: '1.0'
    });
    $("#animate-disagreement").animate({
        opacity: '0.0'
    }, {
        complete: function() {
            $("#animate-disagreement").remove();
        }
    });
}

// Visualize adding or leaving the Queue
// ############################################################################
function visualizeAddQueue(streamName) {
    var position = $(uiStreamContainer + streamName).offset();
    var width = $(uiStreamContainer + streamName).width();
    var height = $(uiStreamContainer + streamName).height();
    var centerX = position.left + width / 2;
    var centerY = position.top + height / 2;

    $("#animate-add-queue").remove();

    var html = `<span class="glyphicon glyphicon-plus-sign" id="animate-add-queue" aria-hidden="true" style="position: fixed;">`;

    $(document.body).append(html);
    $("#animate-add-queue").css("left", centerX);
    $("#animate-add-queue").css("top", centerY);


    var positionQueue = $("#queue-area-list-container").offset();
    var widthQueue = $("#queue-area-list-container").width();
    var heightQueue = $("#queue-area-list-container").height();
    var centerXQueue = positionQueue.left + widthQueue / 2;
    var centerYQueue = positionQueue.top + heightQueue / 2;

    $("#animate-add-queue").animate({
        top: centerYQueue,
        left: centerXQueue
    }, {
        duration: 1000,
        complete: function() {
            $("#animate-add-queue").remove();
        }
    });

}

function visualizeLeaveQueue(streamName) {
    var position = $(uiStreamContainer + streamName).offset();
    var width = $(uiStreamContainer + streamName).width();
    var height = $(uiStreamContainer + streamName).height();
    var centerX = position.left + width / 2;
    var centerY = position.top + height / 2;

    $("#animate-leave-queue").remove();

    var html = `<span class="glyphicon glyphicon-minus-sign" id="animate-leave-queue" aria-hidden="true" style="position: fixed;">`;


    var positionQueue = $("#queue-area-list-container").offset();
    var widthQueue = $("#queue-area-list-container").width();
    var heightQueue = $("#queue-area-list-container").height();
    var centerXQueue = positionQueue.left + widthQueue / 2;
    var centerYQueue = positionQueue.top + heightQueue / 2;

    $(document.body).append(html);
    $("#animate-leave-queue").css("left", centerXQueue);
    $("#animate-leave-queue").css("top", centerYQueue);

    $("#animate-leave-queue").animate({
        top: centerY,
        left: centerX
    }, {
        duration: 1000,
        complete: function() {
            $("#animate-leave-queue").remove();
        }
    });
}