// TinyMCE recordrtc library functions.
// @package    tinymce_recordrtc.
// @author     Jesus Federico  (jesus [at] blindsidenetworks [dt] com).
// @copyright  2016 to present, Blindside Networks Inc.
// @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later.

/** global: M */
/** global: bowser */
/** global: recordrtc */
/** global: Blob */
/** global: player */
/** global: startStopBtn */
/** global: uploadBtn */
/** global: countdownSeconds */
/** global: countdownTicker */
/** global: recType */
/** global: mediaRecorder */
/** global: chunks */
/** global: blobSize */
/** global: maxUploadSize */

/**
 * This function is initialized from PHP
 *
 * @param {Object}
 *            Y YUI instance
 */
M.tinymce_recordrtc.view_init = function() {
    // Assignment of global variables.
    alertWarning = Y.one('div#alert-warning');
    alertDanger = Y.one('div#alert-danger');
    player = Y.one('audio#player');
    playerDOM = document.querySelector('audio#player');
    startStopBtn = Y.one('button#start-stop');
    uploadBtn = Y.one('button#upload');
    recType = 'audio';
    // Extract the numbers from the string, and convert to bytes.
    maxUploadSize = parseInt(recordrtc.maxfilesize.match(/\d+/)[0], 10) * Math.pow(1024, 2);

    // Show alert and redirect user if connection is not secure.
    M.tinymce_recordrtc.check_secure();
    // Show alert if using non-ideal browser.
    M.tinymce_recordrtc.check_browser();

    // Run when user clicks on "record" button.
    startStopBtn.on('click', function() {
        var btn = this;
        btn.set('disabled', true);

        // If button is displaying "Start Recording" or "Record Again".
        if ((btn.get('textContent') === M.util.get_string('startrecording', 'tinymce_recordrtc')) ||
            (btn.get('textContent') === M.util.get_string('recordagain', 'tinymce_recordrtc')) ||
            (btn.get('textContent') === M.util.get_string('recordingfailed', 'tinymce_recordrtc'))) {
            // Make sure the audio player and upload button are not shown.
            player.ancestor().ancestor().addClass('hide');
            uploadBtn.ancestor().ancestor().addClass('hide');

            // Change look of recording button.
            if (!recordrtc.oldermoodle) {
                btn.replaceClass('btn-outline-danger', 'btn-danger');
            }

            // Empty the array containing the previously recorded chunks.
            chunks = [];
            blobSize = 0;

            // Initialize common configurations.
            var commonConfig = {
                // When the stream is captured from the microphone/webcam.
                onMediaCaptured: function(stream) {
                    // Make audio stream available at a higher level by making it a property of btn.
                    btn.stream = stream;

                    if (btn.mediaCapturedCallback) {
                        btn.mediaCapturedCallback();
                    }
                },

                // Revert button to "Record Again" when recording is stopped.
                onMediaStopped: function(btnLabel) {
                    btn.set('textContent', btnLabel);
                },

                // Handle recording errors.
                onMediaCapturingFailed: function(error) {
                    var btnLabel = null;

                    // Handle getUserMedia-thrown errors.
                    switch (error.name) {
                        case 'AbortError':
                            Y.use('moodle-core-notification-alert', function() {
                                new M.core.alert({
                                    title: M.util.get_string('gumabort_title', 'tinymce_recordrtc'),
                                    message: M.util.get_string('gumabort', 'tinymce_recordrtc')
                                });
                            });

                            btnLabel = M.util.get_string('recordingfailed', 'tinymce_recordrtc');
                            break;
                        case 'NotAllowedError':
                            Y.use('moodle-core-notification-alert', function() {
                                new M.core.alert({
                                    title: M.util.get_string('gumnotallowed_title', 'tinymce_recordrtc'),
                                    message: M.util.get_string('gumnotallowed', 'tinymce_recordrtc')
                                });
                            });

                            btnLabel = M.util.get_string('recordingfailed', 'tinymce_recordrtc');
                            break;
                        case 'NotFoundError':
                            Y.use('moodle-core-notification-alert', function() {
                                new M.core.alert({
                                    title: M.util.get_string('gumnotfound_title', 'tinymce_recordrtc'),
                                    message: M.util.get_string('gumnotfound', 'tinymce_recordrtc')
                                });
                            });

                            btnLabel = M.util.get_string('recordingfailed', 'tinymce_recordrtc');
                            break;
                        case 'NotReadableError':
                            Y.use('moodle-core-notification-alert', function() {
                                new M.core.alert({
                                    title: M.util.get_string('gumnotreadable_title', 'tinymce_recordrtc'),
                                    message: M.util.get_string('gumnotreadable', 'tinymce_recordrtc')
                                });
                            });

                            btnLabel = M.util.get_string('recordingfailed', 'tinymce_recordrtc');
                            break;
                        case 'OverConstrainedError':
                            Y.use('moodle-core-notification-alert', function() {
                                new M.core.alert({
                                    title: M.util.get_string('gumoverconstrained_title', 'tinymce_recordrtc'),
                                    message: M.util.get_string('gumoverconstrained', 'tinymce_recordrtc')
                                });
                            });

                            btnLabel = M.util.get_string('recordingfailed', 'tinymce_recordrtc');
                            break;
                        case 'SecurityError':
                            Y.use('moodle-core-notification-alert', function() {
                                new M.core.alert({
                                    title: M.util.get_string('gumsecurity_title', 'tinymce_recordrtc'),
                                    message: M.util.get_string('gumsecurity', 'tinymce_recordrtc')
                                });
                            });

                            cm.editorScope.closeDialogue(cm.editorScope);
                            break;
                        case 'TypeError':
                            Y.use('moodle-core-notification-alert', function() {
                                new M.core.alert({
                                    title: M.util.get_string('gumtype_title', 'tinymce_recordrtc'),
                                    message: M.util.get_string('gumtype', 'tinymce_recordrtc')
                                });
                            });

                            btnLabel = M.util.get_string('recordingfailed', 'tinymce_recordrtc');
                    }

                    // Proceed to treat as a stopped recording.
                    commonConfig.onMediaStopped(btnLabel);
                }
            };

            // Capture audio stream from microphone.
            M.tinymce_recordrtc.capture_audio(commonConfig);

            // When audio stream is successfully captured, start recording.
            btn.mediaCapturedCallback = function() {
                M.tinymce_recordrtc.start_recording(recType, btn.stream);
            };
        } else { // If button is displaying "Stop Recording".
            // First of all clears the countdownTicker.
            clearInterval(countdownTicker);

            // Disable "Record Again" button for 1s to allow background processing (closing streams).
            setTimeout(function() {
                btn.set('disabled', false);
            }, 1000);

            // Stop recording.
            M.tinymce_recordrtc.stop_recording_audio(btn.stream);

            // Change button to offer to record again.
            btn.set('textContent', M.util.get_string('recordagain', 'tinymce_recordrtc'));
            if (!recordrtc.oldermoodle) {
                btn.replaceClass('btn-danger', 'btn-outline-danger');
            }
        }
    });
};

// Setup to get audio stream from microphone.
M.tinymce_recordrtc.capture_audio = function(config) {
    M.tinymce_recordrtc.capture_user_media(
        // Media constraints.
        {
            audio: true
        },

        // Success callback.
        function(audioStream) {
            // Set audio player source to microphone stream.
            playerDOM.srcObject = audioStream;

            config.onMediaCaptured(audioStream);
        },

        // Error callback.
        function(error) {
            config.onMediaCapturingFailed(error);
        }
    );
};

M.tinymce_recordrtc.stop_recording_audio = function(stream) {
    // Stop recording microphone stream.
    mediaRecorder.stop();

    // Stop each individual MediaTrack.
    stream.getTracks().forEach(function(track) {
        track.stop();
    });

    // Set source of audio player.
    var blob = new Blob(chunks, {type: mediaRecorder.mimeType});
    player.set('src', URL.createObjectURL(blob));

    // Show audio player with controls enabled, and unmute.
    player.set('muted', false);
    player.set('controls', true);
    player.ancestor().ancestor().removeClass('hide');

    // Show upload button.
    uploadBtn.ancestor().ancestor().removeClass('hide');
    uploadBtn.set('textContent', M.util.get_string('attachrecording', 'atto_recordrtc'));
    uploadBtn.set('disabled', false);

    // Handle when upload button is clicked.
    uploadBtn.on('click', function() {
        // Trigger error if no recording has been made.
        if (!player.getAttribute('src') || chunks === []) {
            Y.use('moodle-core-notification-alert', function() {
                new M.core.alert({
                    title: M.util.get_string('norecordingfound_title', 'tinymce_recordrtc'),
                    message: M.util.get_string('norecordingfound', 'tinymce_recordrtc')
                });
            });
        } else {
            var btn = this;
            btn.set('disabled', true);

            // Upload recording to server.
            M.tinymce_recordrtc.upload_to_server(recType, function(progress, fileURLOrError) {
                if (progress === 'ended') { // Insert annotation in text.
                    btn.set('disabled', false);
                    M.tinymce_recordrtc.insert_annotation(recType, fileURLOrError);
                } else if (progress === 'upload-failed') { // Show error message in upload button.
                    btn.set('disabled', false);
                    btn.set('textContent', M.util.get_string('uploadfailed', 'tinymce_recordrtc') + ' ' + fileURLOrError);
                } else if (progress === 'upload-failed-404') { // 404 error = File too large in Moodle.
                    btn.set('disabled', false);
                    btn.set('textContent', M.util.get_string('uploadfailed404', 'tinymce_recordrtc'));
                } else if (progress === 'upload-aborted') {
                    btn.set('disabled', false);
                    btn.set('textContent', M.util.get_string('uploadaborted', 'tinymce_recordrtc') + ' ' + fileURLOrError);
                } else {
                    btn.set('textContent', progress);
                }
            });
        }
    });
};
