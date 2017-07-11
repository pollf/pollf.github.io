// replace these values with those generated in your TokBox Account
var apiKey = "45912982";
var sessionId = "2_MX40NTkxMjk4Mn5-MTQ5OTc3Nzc5MDI0NH5HTDhyZzFvNjdPRWtsWjlIcHM5U3FjMVB-fg";
// token valid 7 days from  11.07.2017
var token = "T1==cGFydG5lcl9pZD00NTkxMjk4MiZzaWc9MTk4MzNiYWQyMGU3OTllMTkzNmMzNzFjNDZmYzlhNzhiM2YzYjU1ODpzZXNzaW9uX2lkPTJfTVg0ME5Ua3hNams0TW41LU1UUTVPVGMzTnpjNU1ESTBOSDVIVERoeVp6RnZOamRQUld0c1dqbEljSE01VTNGak1WQi1mZyZjcmVhdGVfdGltZT0xNDk5Nzc3ODE2Jm5vbmNlPTAuNjY2ODEzMDA3NjIxMjk4NCZyb2xlPXB1Ymxpc2hlciZleHBpcmVfdGltZT0xNTAwMzgyNjE1JmluaXRpYWxfbGF5b3V0X2NsYXNzX2xpc3Q9";

// (optional) add server code here
initializeSession();

//##################################################

// Handling all of our errors here by alerting them
function handleError(error) {
  if (error) {
    alert(error.message);
  }
}

function initializeSession() {
  var session = OT.initSession(apiKey, sessionId);

  // Subscribe to a newly created stream
  session.on('streamCreated', function(event) {
  session.subscribe(event.stream, 'subscriber', {
    insertMode: 'append',
    width: '100%',
    height: '100%'
  	}, handleError);
  });

  // Create a publisher
  var publisher = OT.initPublisher('publisher', {
    insertMode: 'append',
    width: '100%',
    height: '100%'
  }, handleError);

  // Connect to the session
  session.connect(token, function(error) {
    // If the connection is successful, publish to the session
    if (error) {
      handleError(error);
    } else {
      session.publish(publisher, handleError);
    }
  });
}



