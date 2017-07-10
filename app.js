// replace these values with those generated in your TokBox Account
var apiKey = '45840352';
var sessionId = '2_MX40NTg0MDM1Mn5-MTQ5NDY3OTM3NDcxNX54bVZGdnh5MDdqQ3BWQ1ZJMnRFcVREYU9-fg';
var token = 'T1==cGFydG5lcl9pZD00NTg0MDM1MiZzaWc9MWZmM2MzYjAxMjYxMWQwNjkzYTE2NDgwZmQxODk0MjIyNjFlYWFjZjpzZXNzaW9uX2lkPTJfTVg0ME5UZzBNRE0xTW41LU1UUTVORFkzT1RNM05EY3hOWDU0YlZaR2RuaDVNRGRxUTNCV1ExWkpNblJGY1ZSRVlVOS1mZyZjcmVhdGVfdGltZT0xNDk0Njc5Mzk1Jm5vbmNlPTAuMTkwNTQ0NTQ4Nzg4OTk4OTYmcm9sZT1wdWJsaXNoZXImZXhwaXJlX3RpbWU9MTQ5NzI3MTQwMQ==';

// stores the connectionId
var connectionId;

var allowedToTalk;

var connectionCount = 0;
var suscriberCount = 0;

$(document).ready(function () {
    // (optional) add server code here
    initializeSession();
});

function logToConsole(s) {
    var timeNow = new Date();
    var timeStamp = timeNow.toLocaleTimeString();
    $("#console").prepend(timeStamp + " " + s + '<br>');
}

function initializeSession() {
    var session = OT.initSession(apiKey, sessionId);

    // Subscribe to a newly created stream
    session.on('streamCreated', function (event) {

        var subscriberProperties = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        };

        suscriberCount++;
        var videoDivName = 'video' + (suscriberCount + 1);
        
        var subscriber = session.subscribe(event.stream,
            videoDivName,
            subscriberProperties,
            function (error) {
                if (error) {
                    logToConsole(error);
                } else {
                    logToConsole('Subscriber added.');
                }
            });

        subscriber.setStyle('audioLevelDisplayMode', 'on');
    });

    var publisher;
    function initializePublisher(error) {
        // If the connection is successful, initialize a publisher and publish to the session
        if (!error) {
            publisher = OT.initPublisher('video1', {
                insertMode: 'append',
                width: '100%',
                height: '100%'
            });

            publisher.setStyle('audioLevelDisplayMode', 'on');
            publisher.on('audioLevelUpdated', function (event) {
                var audioLevel = event.audioLevel;
                if (audioLevel > 0.2) {
                    //logToConsole(" Currently talking. audioLevel " + event.audioLevel);
                }
            });
            session.publish(publisher);
        } else {
            logToConsole('There was an error connecting to the session: ', error.code, error.message);
        }
    }

    session.on({
        'connectionCreated': function (event) {
            connectionCount++;
            logToConsole("new connection in session : no. " + connectionCount);
            connectionId = session.connection.connectionId;
            if (event.connection.connectionId != session.connection.connectionId) {
                logToConsole('Another client connected to session');
            }
        },
        'connectionDestroyed': function connectionDestroyedHandler(event) {
            connectionCount--;
            logToConsole('A client disconnected from session');
        }
    });

    // Connect to the session
    session.connect(token, initializePublisher);

    function requestToTalk(event) {
        logToConsole("Event sent");
        session.signal(
            {
                data: "requestToTalk " + connectionId
            }
        );
    }

    $("#button1").click(requestToTalk);

    function setNotification(txt) {
        $("#notifications").text(txt);
    }

    function enableTalking() {
        logToConsole("enabling talking");
        publisher.publishAudio(true);
        setNotification("You talk.");
    }

    function disableTalking() {
        logToConsole("disabling talking");
        publisher.publishAudio(false);
        setNotification("Someone else talks.");
    }

    function receiveSignal(event) {
        var res = event.data.split(" ");
        var cmd = res[0];
        var senderConnectionId = res[1];

        switch (cmd) {
            case "requestToTalk":
                if (senderConnectionId != connectionId) {
                    disableTalking();
                } else {
                    enableTalking();
                }
                break;
            default:
                logToConsole("ERROR: command not found");
        }
    }

    session.on("signal", receiveSignal);
}