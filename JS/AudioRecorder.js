class AudioRecorder {
  stream;
  mediaRecorder;
  audioChunks = [];
  audioBlob;
  permissionsGranted = false;

  addEventListeners() {
    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      this.audioChunks.push(event.data);
    });

    this.mediaRecorder.addEventListener("stop", () => {
      this.audioBlob = new Blob(this.audioChunks, {
        'type': 'audio/wav'
      });
      this.audioUrl = URL.createObjectURL(this.audioBlob);
      this.recordingCb(this.audioBlob);
      const audio = new Audio(this.audioUrl);
      const play = () => {
        audio.play();
      };
      setTimeout(() => {
        play();
      }, 3000);
    });
  }

  requestPermissions(cb) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.stream = stream;
        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });
        this.permissionsGranted = true;
        this.addEventListeners();
        cb();
      })
      .catch((err) => {
        console.log("No Mic Permission");
      });
  }

  get isMicPermissionGranted() {
    return this.permissionsGranted;
  }

  start(cb) {
    this.audioChunks = [];
    this.requestPermissions(() => {
      this.mediaRecorder.start();
      cb();
    });
  }

  stop(cb) {
    this.recordingCb = cb;
    this.mediaRecorder.stop();
    for (let audio of this.stream.getAudioTracks()) {
      audio.stop();
    }
    this.audioChunks = [];
    this.audioBlob = null;
    this.audioUrl = null;
  }
}

class Recorder {
  audioRecorder;
  audioTimeEl;
  questionTimeEl;
  questionTime;
  isRecordingStarted = false;

  constructor({ audioTimeEl, questionTimeEl, questionTime }) {
    this.audioRecorder = new AudioRecorder();
    this.audioTimeEl = audioTimeEl;
    this.questionTimeEl = questionTimeEl;
    this.questionTime = questionTime;
    questionTimeEl.innerHTML = this.getFormattedTime(questionTime);
  }

  startRecording(cb) {
    this.audioRecorder.start(() => {
      this.startRecordingTimer();
      this.isRecordingStarted = true;
      cb();
    });
  }

  stopRecording(cb) {
    if (this.isRecordingStarted) {
      this.audioRecorder.stop(cb);
      this.isRecordingStarted = false;
      clearInterval(this.recorderTimeInterval);
    }
    clearInterval(this.questionTimeInterval);
  }

  get isRecording() {
    return this.isRecordingStarted;
  }

  get isMicPermissionGranted() {
    return this.audioRecorder.isMicPermissionGranted;
  }

  resetRecordingTimer() {
    this.audioTimeEl.innerHTML = "00:00";
  }

  getFormattedTime(t) {
    const minutes = t >= 60 ? parseInt(t / 60) : 0;
    const seconds = t % 60;
    return `${minutes < 10 ? "0" + minutes : minutes}:${
      seconds < 10 ? "0" + seconds : seconds
    }`;
  }

  startRecordingTimer() {
    let sec = 1;
    this.audioTimeEl.innerHTML = this.getFormattedTime(sec);
    this.recorderTimeInterval = setInterval(() => {
      sec++;
      this.audioTimeEl.innerHTML = this.getFormattedTime(sec);
    }, 1000);
  }

  startQuestionTimer(cb) {
    let timeValue = this.questionTime;
    this.questionTimeInterval = setInterval(() => {
      timeValue--;
      if (timeValue <= 0) {
        this.questionTimeEl.innerHTML = this.getFormattedTime(timeValue);
        clearInterval(this.questionTimeInterval);
        cb();
      } else {
        this.questionTimeEl.innerHTML = this.getFormattedTime(timeValue);
      }
    }, 1000);
  }
}

export { Recorder };
