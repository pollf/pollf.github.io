// Monitor Audio level to detect if some talks who is not publsihing
//#############################################################################
var audioLevelSlow;

try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioContext = new AudioContext();
} catch (e) {
    alert('Web Audio API not supported.');
}

// Put variables in global scope to make them available to the browser console.
var constraints = window.constraints = {
    audio: true,
    video: false
};



function handleSuccess(stream) {
    var audio = new Audio('./res/stopthat.wav');
    // Put variables in global scope to make them available to the
    // browser console.
    window.stream = stream;
    var soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
    soundMeter.connectToSource(stream, function(e) {
        if (e) {
            alert(e);
            return;
        }

        setInterval(function() {
            //console.log("Instant Vol: " + soundMeter.instant.toFixed(2));
            audioLevelSlow = soundMeter.instant.toFixed(3);
            //console.log("Slow Vol: " + soundMeter.slow.toFixed(2));
            // if user is not publsihign warn him if hes talking
            if (talksNow != myFullUserName && audioLevelSlow > 0.2) {
                log("You are not publishing...");
                audio.play();
            }
        }, 250);
    });
}

function handleError(error) {
    console.log('navigator.getUserMedia error: ', error);
}

navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);