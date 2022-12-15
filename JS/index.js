import { Recorder } from "./Recorder.js";
const rec_button = document.querySelector('.rec');
const stop_button = document.querySelector('.stop');
const nameEle = document.querySelector('.name');
const min = document.querySelector('.min');
const sec = document.querySelector('.sec');
const all = document.querySelector('.all');
let recStarted = false;
let timeInterval;
let audio;
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => console.log('Successfully connected'))
    .catch(err => {
    all.textContent = 'Microphone not detected';
});
const rec = new Recorder(5);
rec_button.addEventListener("click", async () => {
    if (rec.limitReached())
        return;
    rec_button.classList.toggle('disabled');
    stop_button.classList.toggle('disabled');
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
    rec_button.classList.toggle('disabled');
    stop_button.classList.toggle('disabled');
    const time = rec.stopRecTimer(min, sec);
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
    const time = document.querySelector('.time');
    timeInterval = setInterval(() => {
        let timeValue = +time.innerHTML + 1;
        if (timeValue > 15) {
            clearInterval(timeInterval);
            if (recStarted) {
                stopRecording((record) => {
                    audio = record;
                });
            }
        } else {
            time.innerHTML = timeValue;
        }
    }, 1000);
}

JFCustomWidget.subscribe("ready", function(){
    var label = JFCustomWidget.getWidgetSetting('questionTime');

    startTimer();

    console.log(label);

    JFCustomWidget.subscribe("submit", async function(){
        var msg = {
            //you should valid attribute to data for JotForm
            //to be able to use you widget as required
            valid: true,
            value: "some url"
        }
        console.log("UPLOAD STARTED");
        await new Promise((res) => setTimeout(() => res(), 10000));
        console.log("UPLOAD ENDED");
        // send value to JotForm
        JFCustomWidget.sendSubmit(msg);
    });
  });