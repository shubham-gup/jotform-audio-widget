import { VoiceRecorder } from "./voice_recorder.js";

const url = "https://staging.squadrun.co";

(function (baseUrl) {
  const recButton = document.querySelector(".recordBtn");
  const cancelButton = document.querySelector(".cancelBtn");
  const waveBox = document.querySelector(".boxContainer");
  const questionTimeEl = document.querySelector(".questionTime");
  const audioTimeEl = document.querySelector(".audioTime");
  const player = document.querySelector(".player");
  const responseSuccess = document.querySelector(".response--success");
  const responseFailed = document.querySelector(".response--failed");
  const tooltip = document.querySelector(".tooltiptext--mic");

  let isRecorded = false;
  let uploaded = false;
  let questionTimeInterval;
  let recorderTimeInterval;
  let questionTime = 30;
  let questionFileName = "audio_answer_";
  let initialised = false;
  let timesUp = false;
  let recordingAnswer = "no_answer";
  let isRecordingStarted = false;
  const objects = {
    context: null,
    stream: null,
    recorder: null,
  };

  recButton.addEventListener("click", async () => {
    if (!isRecorded && initialised) {
      if (!isRecordingStarted) {
        tooltip.innerHTML = "Click to Submit Recording";
        startRecording(() => {
          recordingStartedUI();
        });
      } else {
        tooltip.innerHTML = "Click to Start Recording";
        done();
      }
    }
  });

  cancelButton.addEventListener("click", () => {
    if (isRecordingStarted && initialised) {
      stopRecording(() => {
        recordingEndedUI();
      }, false);
    }
  });

  async function uploadToS3(presignedPostData, blob) {
    const file = new File([blob], questionFileName, { type: "audio/wav" });

    const formData = new FormData();

    Object.keys(presignedPostData.fields).forEach((key) => {
      formData.append(key, presignedPostData.fields[key]);
    });

    formData.append("file", file);

    await fetch(presignedPostData.url, {
      method: "POST",
      body: formData,
    }).catch((err) => {});
  }

  async function upload(url) {
    if (uploaded) return;
    const data = await fetch(
      `${baseUrl}/file_upload/api/v1/speechassessment/get-signed-url`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          object_name: questionFileName,
        }),
      }
    ).catch((err) => {});
    const res = await data.json();
    await uploadToS3(res, url);
    uploaded = true;
    return res.path;
  }

  function markResponseRecorded() {
    isRecorded = true;
  }

  async function done() {
    markResponseRecorded();
    if (isRecordingStarted) {
      stopRecording(async (url) => {
        successResponseCapturedUI();
        recordingEndedUI();
        recordingAnswer = await upload(url);
        JFCustomWidget.sendData({
          value: JSON.stringify(recordingAnswer),
          valid: true,
        });
      });
    } else {
      timesUp = true;
      errorResponseCapturedUI();
      JFCustomWidget.sendData({
        value: recordingAnswer,
        valid: true,
      });
    }
  }

  function initRecorder() {
    if (objects.context === null) {
      objects.context = new (window?.AudioContext ||
        window?.webkitAudioContext)();
    }
  }

  function startRecording(cb) {
    initRecorder();
    const options = { audio: true, video: false };
    navigator.mediaDevices
      .getUserMedia(options)
      .then((stream) => {
        objects.stream = stream;
        objects.recorder = new VoiceRecorder(
          objects.context.createMediaStreamSource(stream),
          { numChannels: 1 }
        );
        objects.recorder.record();
        startRecordingTimer();
        isRecordingStarted = true;
        cb();
      })
      .catch(function (err) {});
  }

  function stopRecording(cb, isFinalSave = true) {
    if (isRecordingStarted) {
      if (objects.stream !== null) {
        objects.stream.getAudioTracks()[0].stop();
      }
      isRecordingStarted = false;
      clearInterval(recorderTimeInterval);
      if (objects.recorder !== null) {
        objects.recorder.stop();

        if (isFinalSave) {
          objects.recorder.exportWAV(function (blob) {
            cb(blob);
          });
        } else {
          audioTimeEl.innerHTML = getFormattedTime(0);
          cb();
        }
      }
    }
    if (isFinalSave) {
      clearInterval(questionTimeInterval);
    }
  }

  function getFormattedTime(t) {
    const minutes = t >= 60 ? parseInt(t / 60) : 0;
    const seconds = t % 60;
    return `${minutes < 10 ? "0" + minutes : minutes}:${
      seconds < 10 ? "0" + seconds : seconds
    }`;
  }

  function startRecordingTimer() {
    let sec = 1;
    audioTimeEl.innerHTML = getFormattedTime(sec);
    recorderTimeInterval = setInterval(() => {
      sec++;
      audioTimeEl.innerHTML = getFormattedTime(sec);
    }, 1000);
  }

  function startQuestionTimer(cb) {
    let timeValue = questionTime;
    questionTimeEl.innerHTML = getFormattedTime(timeValue);
    questionTimeInterval = setInterval(() => {
      timeValue--;
      if (timeValue <= 0) {
        questionTimeEl.innerHTML = getFormattedTime(timeValue);
        clearInterval(questionTimeInterval);
        cb();
      } else {
        questionTimeEl.innerHTML = getFormattedTime(timeValue);
      }
    }, 1000);
  }

  function initialiseAudioPlayer(src) {
    if (src) {
      const audioEl = document.querySelector('.audio-player');
      audioEl.src = src;
      audioEl.classList.remove('display-none');
      JFCustomWidget.requestFrameResize({
        width: 400,
        height: 220,
      });
    }
  }

  function init(qTime, qId, audioSrc) {
    initialised = true;
    questionTime = qTime;
    questionFileName = `${questionFileName}${qId}.wav`;
    startQuestionTimer(done);
    initialiseAudioPlayer(audioSrc);
  }

  JFCustomWidget.subscribe("ready", function (formData) {
    const label = JFCustomWidget.getWidgetSetting("questionTime");
    const questionAudioUrl = JFCustomWidget.getWidgetSetting("questionAudioUrl");

    if (label != 0) {
      init(+label, formData.formID, questionAudioUrl);
    }

    JFCustomWidget.subscribe("submit", async function () {
      JFCustomWidget.sendSubmit({
        value: recordingAnswer,
        valid: !formData.required || timesUp || uploaded,
      });
    });
  });

  // UI methods
  function recordingStartedUI() {
    recButton.classList.add("recording");
    waveBox.classList.add("box-animate");
    cancelButton.classList.remove("display-none");
  }

  function recordingEndedUI() {
    recButton.classList.remove("recording");
    waveBox.classList.remove("box-animate");
    cancelButton.classList.add("display-none");
  }

  function hideAudioRecorderUI() {
    player.classList.add("display-none");
  }

  function successResponseCapturedUI() {
    hideAudioRecorderUI();
    responseSuccess.classList.remove("display-none");
  }

  function errorResponseCapturedUI() {
    hideAudioRecorderUI();
    responseFailed.classList.remove("display-none");
  }
})(url);
