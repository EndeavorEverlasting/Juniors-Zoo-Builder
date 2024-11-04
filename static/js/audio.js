const synth = new Tone.Synth().toDestination();

function playCorrectSound() {
    synth.triggerAttackRelease("C4", "8n");
}

function playWrongSound() {
    synth.triggerAttackRelease("A3", "8n");
}

window.playCorrectSound = playCorrectSound;
window.playWrongSound = playWrongSound;
