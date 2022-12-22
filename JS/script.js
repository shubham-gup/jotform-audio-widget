const recButton = document.querySelector(".record-btn");
const cancelButton = document.querySelector(".cancel-btn");
const waveBox = document.querySelector(".boxContainer");
const questionTimeEl = document.querySelector(".question-time");
const audioTimeEl = document.querySelector(".audio-time");
const permissionDialog = document.querySelector(".permission-dialog");
const audioRecorder = document.querySelector(".audio-recorder");
const player = document.querySelector(".player");
const responseSuccess = document.querySelector(".response--success");
const responseFailed = document.querySelector(".response--failed");
let recorder;
let isRecorded = false;
let uploaded = false;
let questionTimeInterval;
let recorderTimeInterval;
let questionTime = 30;
let questionFileName = 'audio_answer_'
let initialised = false;
let timesUp = false;
let recordingAnswer = 'no_answer';

let isRecordingStarted = false;
const objects = {
  context: null,
  stream: null,
  recorder: null,
};

function init(qTime, qId) {
  initialised = true;
  questionTime = qTime;
  questionFileName = `${questionFileName}${qId}.wav`;
  startQuestionTimer(done);
}

recButton.addEventListener("click", async () => {
  if (!isRecorded && initialised) {
    if (!isRecordingStarted) {
      startRecording(() => {
        recButton.classList.add("recording");
        waveBox.classList.add("box-animate");
        cancelButton.classList.remove("display-none");
      });
    } else {
      await done();
    }
  }
});

cancelButton.addEventListener("click", async () => {
  if (isRecordingStarted && initialised) {
    stopRecording(() => {
      cancelButton.classList.add("display-none");
      recButton.classList.remove("recording");
      waveBox.classList.remove("box-animate");
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
  }).catch((err) => {
    // TODO: handle errors
  });
}

async function upload(url) {
  if (uploaded) return;
  const data = await fetch(
    "https://staging.squadrun.co/assessments/api/v10/assessment/get-signed-url",
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
  ).catch((err) => {
    // TODO: handle errors
  });
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
      player.classList.add("display-none");
      responseSuccess.classList.remove("display-none");
      cancelButton.classList.add("display-none");
      recordingAnswer = await upload(url);
      recButton.classList.remove("recording");
      waveBox.classList.remove("box-animate");
      if (JFCustomWidget) {
        JFCustomWidget.sendData({
          value: JSON.stringify(recordingAnswer),
          valid: true,
        });
      }
    });
  } else {
    timesUp = true;
    player.classList.add("display-none");
    responseFailed.classList.remove("display-none");
    if (JFCustomWidget) {
      JFCustomWidget.sendData({
        value: recordingAnswer,
        valid: true,
      });
    }
  }
}

function initRecorder() {
  if (objects.context === null) {
    objects.context = new (window?.AudioContext ||
      window?.webkitAudioContext)();
  }
};

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
};

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
};

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

JFCustomWidget.subscribe("ready", function (formData) {
  const label = JFCustomWidget.getWidgetSetting("questionTime");

  init(+label, formData.formID);

  console.log(formData);

  JFCustomWidget.subscribe("submit", async function () {
    JFCustomWidget.sendSubmit({
      value: recordingAnswer,
      valid: !formData.required || timesUp || uploaded,
    });
  });
});
