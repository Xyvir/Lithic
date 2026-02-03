<script>
function play(id) { document.getElementById(id).play(); }
function pause(id) {
    var sound = document.getElementById(id);
    var fadeAudio = setInterval(function () {
        var startVolume = sound.volume;
        // Only fade if past the fade out point or not at zero already
        if (sound.volume - 0.02 > 0.0) {
            sound.volume -= 0.1;
        }

        // When volume at zero stop all the intervalling
        if (sound.volume -0.1 <= 0) {
            clearInterval(fadeAudio);
            sound.pause();
            sound.volume = startVolume;
        }
    }, 200);
}
function rewind(id) {document.getElementById(id).currentTime =
 0; }

</script>