// replace these values with those generated in your TokBox Account
var apiKey = "45916672";
var sessionId = "1_MX40NTkxNjY3Mn5-MTUwMDExODUyOTQ3MH5kdk5oTXFDTm4zbmpLTVlxYnI5ZGpEQmV-UH4";
// token valid 7 days from  11.07.2017
var token = "T1==cGFydG5lcl9pZD00NTkxNjY3MiZzaWc9NmY1NTkzMmRiMjRiZTc1MzFkMjY0NDUwOTcxNWFmZGNkYjI3NjY1ZTpzZXNzaW9uX2lkPTFfTVg0ME5Ua3hOalkzTW41LU1UVXdNREV4T0RVeU9UUTNNSDVrZGs1b1RYRkRUbTR6Ym1wTFRWbHhZbkk1WkdwRVFtVi1VSDQmY3JlYXRlX3RpbWU9MTUwMDExODU2NiZub25jZT0wLjAwODY0NjM1NDY1NDk3MzU0MyZyb2xlPXB1Ymxpc2hlciZleHBpcmVfdGltZT0xNTAwMTIyMTYzJmluaXRpYWxfbGF5b3V0X2NsYXNzX2xpc3Q9";


var connectionId;

var allowedToTalk;

var connectionCount = 0;

var suscriberCount = 0;

// (optional) add server code here
$(document).ready(function() {
    initializeSession();
    // set talk time progress bar width
    
});

function initializeSession() {

    console.log("initializing session");

    var session = OT.initSession(apiKey, sessionId);


    // Subscribe to a newly created stream
    session.on('streamCreated', function(event) {
        console.log('A Stream creation was detected');
        var subscriberProperties = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        };

        suscriberCount++;
        var UserDivName = 'subscriber_' + (suscriberCount + 1);

        var subscriber = session.subscribe(event.stream,
            UserDivName,
            subscriberProperties,
            function(error) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Subscriber added.');
                }
            });
        subscriber.setStyle('audioLevelDisplayMode', 'on');
       
        streamID = subscriber.stream.streamId;
        console.log("subscribed to a stream with ID: " + streamID);

    });

   


    var publisher;

    function initializePublisher(error) {
        // If the connection is successful, initialize a publisher and publish to the session
        if (!error) {
            publisher = OT.initPublisher('publisher', {
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
                console.log("Publisher started streaming with StreamID " + publisher.stream.streamId);
                
                publisher.publishAudio(false);
            });


        } else {
            console.log('There was an error connecting to the session: ', error.code, error.message);
        }
    }


    session.on({
        'connectionCreated': function(event) {
            connectionCount++;
            //console.log("new connection in session : no. " + connectionCount);

            connectionId = session.connection.connectionId;
            if (event.connection.connectionId != session.connection.connectionId) {
                console.log('Another client connected to session');
            }
        },
        'connectionDestroyed': function connectionDestroyedHandler(event) {
            connectionCount--;
            console.log('A client disconnected from session');
        }
    });

    // Connect to the session
    session.connect(token, initializePublisher);

}    