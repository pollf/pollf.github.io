// replace these values with those generated in your TokBox Account
var apiKey = "45912982";
var sessionId = "2_MX40NTkxMjk4Mn5-MTQ5OTc3Nzc5MDI0NH5HTDhyZzFvNjdPRWtsWjlIcHM5U3FjMVB-fg";
// token valid 7 days from  11.07.2017
var token = "T1==cGFydG5lcl9pZD00NTkxMjk4MiZzaWc9MTk4MzNiYWQyMGU3OTllMTkzNmMzNzFjNDZmYzlhNzhiM2YzYjU1ODpzZXNzaW9uX2lkPTJfTVg0ME5Ua3hNams0TW41LU1UUTVPVGMzTnpjNU1ESTBOSDVIVERoeVp6RnZOamRQUld0c1dqbEljSE01VTNGak1WQi1mZyZjcmVhdGVfdGltZT0xNDk5Nzc3ODE2Jm5vbmNlPTAuNjY2ODEzMDA3NjIxMjk4NCZyb2xlPXB1Ymxpc2hlciZleHBpcmVfdGltZT0xNTAwMzgyNjE1JmluaXRpYWxfbGF5b3V0X2NsYXNzX2xpc3Q9";

// stores the connectionId
var connectionId;

var allowedToTalk;

var connectionCount = 0;

var suscriberCount = 0;

// max continuous talk time in seconds +  helpers for counting down the time
var maxTalkTime = 20;
var talkStartedAt;
var talkTimeNow;
var timeCountdownInterval;

// stramId of current talker (used to inform incoming participants)
var nowTalking = "nobody"

// mapping zwischen stream id von subscribern und div ids
var mapping = new Object();


// (optional) add server code here
$(document).ready(function() {
    initializeSession();
    // set talk time progress bar width
     $("#time_left_pb").html(maxTalkTime + " seconds");
});

//##################################################

// Handling all of our errors here by alerting them
function handleError(error) {
    if (error) {
        alert(error.message);
    }
}

// writes line to logging text area
function log(message) {
    timestamp = new Date().toLocaleTimeString()
    $("#log-text-area").prepend("\n")
    $("#log-text-area").prepend(timestamp, ":  ", message)
}


function initializeSession() {

    log("initializing session")

    var session = OT.initSession(apiKey, sessionId);


    // Subscribe to a newly created stream
    session.on('streamCreated', function(event) {
        log('A Stream creation was detected');
        var subscriberProperties = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        };

        suscriberCount++;
        var UserDivName = 'user_' + (suscriberCount + 1);

        var subscriber = session.subscribe(event.stream,
            UserDivName,
            subscriberProperties,
            function(error) {
                if (error) {
                    log(error);
                } else {
                    log('Subscriber added.');
                }
            });
        subscriber.setStyle('audioLevelDisplayMode', 'on');
        // add to mapping
        streamID = subscriber.stream.streamId;
        mapping[streamID] = suscriberCount + 1;
        log("Write to mapping StreamID " + streamID)
        // send current talk status to everyone
        signalTalkStatus();

    });


    var publisher;

    function initializePublisher(error) {
        // If the connection is successful, initialize a publisher and publish to the session
        if (!error) {
            publisher = OT.initPublisher('user_1', {
                insertMode: 'append',
                width: '100%',
                height: '100%'
            });

            publisher.setStyle('audioLevelDisplayMode', 'on');
            publisher.on('audioLevelUpdated', function(event) {
                var audioLevel = event.audioLevel;
                if (audioLevel > 0.2) {
                    //logToConsole(" Currently talking. audioLevel " + event.audioLevel);
                }
            });
            session.publish(publisher).on("streamCreated", function(event) {
                log("Publisher started streaming.");
                $("#your-stream-id").html(publisher.stream.streamId);
                // enter meeting with audio turned off
                publisher.publishAudio(false);
            });


        } else {
            log('There was an error connecting to the session: ', error.code, error.message);
        }
    }


    session.on({
        'connectionCreated': function(event) {
            connectionCount++;
            log("new connection in session : no. " + connectionCount);
            connectionId = session.connection.connectionId;
            if (event.connection.connectionId != session.connection.connectionId) {
                log('Another client connected to session');
            }
        },
        'connectionDestroyed': function connectionDestroyedHandler(event) {
            connectionCount--;
            log('A client disconnected from session');
        }
    });

    // Connect to the session
    session.connect(token, initializePublisher);


    function requestToTalk(event) {
        log("Let me talk event sent from " + connectionId);
        session.signal({
            data: "requestToTalk#" + connectionId + "#" + publisher.stream.streamId
        });
    }

    function signalTalkStatus() {
        log("Signaling talk status " + connectionId);
        session.signal({
            data: "signalTalkStatus#" + nowTalking
        });
    }

    function signalDoneTalking(){
        log("Signaling done talking from " + connectionId);
        session.signal({
            data: "doneTalking#"
        });
    }

    $("#btn_talk").click(requestToTalk);

    function enableTalking(talkerStreamId) {
        clearUserDescs();
        log("enabling talking");
        publisher.publishAudio(true);
        // visualize talking by changing css class
        $("#user_1_desc").html("<span class='label label-success centered-label'>is talking</span>");
        nowTalking = talkerStreamId;

        // register Interval that calls countDownTalkTime every second
        talkStartedAt = new Date().getTime() / 1000;
        timeCountdownInterval = intervalTrigger();
    }

    function intervalTrigger(){
        return window.setInterval(function() {
            countDownTalkTime();
        }, 1000);
    }

    function disableTalking(talkerStreamId) {
        clearUserDescs();
        log("disabling talking");
        publisher.publishAudio(false);
        talker_div = mapping[talkerStreamId];
        log("talkerStreamId " + talkerStreamId);
        log("Talker DIV " + talker_div);
        $("#user_" + talker_div + "_desc").html("<span class='label label-success centered-label'>is talking</span>");
        nowTalking = talkerStreamId;
    }

    function disableTalkingAtTimeout(){
        clearUserDescs();
        publisher.publishAudio(false);
        // inform everyone, that you are done talking
        signalDoneTalking();
    }




    function receiveSignal(event) {
        var res = event.data.split("#");
        var cmd = res[0];


        switch (cmd) {
            case "requestToTalk":
                var senderConnectionId = res[1];
                var streamId = res[2];
                // if its not yourself who wants to talk
                if (senderConnectionId != connectionId) {
                    disableTalking(streamId);
                } else {
                    // if you want to talk    
                    enableTalking(streamId);
                }
                break;
            case "signalTalkStatus":
                // only update talk status, if you have none (aka nobody talks)
                if (nowTalking === "nobody" && res[1] != "nobody") {
                    nowTalking = res[1];
                    $("#user_" + mapping[nowTalking] + "_desc").html("<span class='label label-success centered-label'>is talking</span>");
                }
                break;
            case "doneTalking":
                // all users descs, because nobody talks right now
                clearUserDescs();
                break;    
            default:
                log("ERROR: signaled command not found");
        }
    }

    session.on("signal", receiveSignal);

    // Count down the time when talking and end talking if timout ist reached
    function countDownTalkTime(){
        talkTimeNow = new Date().getTime() / 1000;
        timeTalked = talkTimeNow - talkStartedAt;
        if(timeTalked >= maxTalkTime){
            log("your talk time is over");
            // remove this interval trigger
            window.clearInterval(timeCountdownInterval);
            disableTalkingAtTimeout();
            // reset helper variables fpr time counting
            talkStartedAt = null;
            timeTalked = null;
            // reset progress bar
            $("#time_left_pb").html(maxTalkTime + " seconds");
            $("#time_left_pb").css("width", "100%");

            
        }
        // set progress bar to show time left
        $("#time_left_pb").css("width", 100*((maxTalkTime-timeTalked)/maxTalkTime)+"%");
        $("#time_left_pb").html(Math.floor(maxTalkTime-timeTalked) + " seconds");
    }

}

function clearUserDescs() {
    for (var div = 1; div <= 6; div++) {
        //log("clearing all user descs")
        $("#user_" + div + "_desc").html("");
    }
}