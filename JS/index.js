import { Recorder } from "./Recorder.js";
const rec_button = document.querySelector(".rec");
const stop_button = document.querySelector(".stop");
const nameEle = document.querySelector(".name");
const min = document.querySelector(".min");
const sec = document.querySelector(".sec");
const all = document.querySelector(".all");
let recStarted = false;
let timeInterval;
let audio;
navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then(() => console.log("Successfully connected"))
  .catch((err) => {
    all.textContent = "Microphone not detected";
  });
const rec = new Recorder(5);
rec_button.addEventListener("click", async () => {
  if (rec.limitReached()) return;
  rec_button.classList.toggle("disabled");
  stop_button.classList.toggle("disabled");
  rec.startRecTimer(min, sec);
  recStarted = true;
  await rec.start_record();
});
stop_button.addEventListener("click", () => {
  stopRecording((record) => {
    audio = record;
  });
});

function stopRecording(cb) {
  rec_button.classList.toggle("disabled");
  stop_button.classList.toggle("disabled");
  const time = rec.stopRecTimer(min, sec);
  upload();
  // const name = nameEle.value || '';
  // nameEle.value = '';
  rec.stop_record(time, name, (record) => {
    // const element = rec.returnNewRecord(record);
    // const playBtn = element.children[0];
    // const delBtn = element.children[2].children[1];
    // const timeSpan = element.children[2].children[0].children[0];
    // playBtn.addEventListener('click', () => {
    //     rec.startAndPause(record, playBtn, timeSpan);
    // });
    // delBtn.addEventListener('click', () => {
    //     delBtn.parentElement?.parentElement?.remove();
    //     rec.deleteRecord(record);
    // });
    // all.appendChild(element);
    cb(record);
    recStarted = false;
  });
}

function startTimer() {
  const time = document.querySelector(".time");
  timeInterval = setInterval(() => {
    let timeValue = +time.innerHTML + 1;
    if (JFCustomWidget && timeValue == 5) {
      JFCustomWidget.sendData({
        value: timeValue,
      });
    }
    if (JFCustomWidget && timeValue == 10) {
      JFCustomWidget.sendSubmit({
        value: timeValue,
        valid: true,
      });
    }
    if (timeValue > 15) {
      clearInterval(timeInterval);
      if (recStarted) {
        stopRecording(async (record) => {
          await uploadRecording(record);
        }); 
      }
    } else {
      time.innerHTML = timeValue;
    }
  }, 1000);
}

async function upload() {
    const d = await fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
      });
    const res = await d.json();
    console.log(res)
    return res;
}

JFCustomWidget.subscribe("ready", function (formId, value) {
  var label = JFCustomWidget.getWidgetSetting("questionTime");

  startTimer();

  console.log(formId, value);

  JFCustomWidget.subscribe("submit", async function () {
    var msg = {
      //you should valid attribute to data for JotForm
      //to be able to use you widget as required
      valid: true,
      value: `some url: ${formId.formID}`,
    };
    console.log("UPLOAD STARTED");
    // await new Promise((res) => setTimeout(() => res(), 10000));
    try {
        await upload();
        // JFCustomWidget.sendSubmit(msg);
        console.log("UPLOAD ENDED");
        JFCustomWidget.sendSubmit(msg);
    } catch {
        console.log(err)
    }
  });
});
