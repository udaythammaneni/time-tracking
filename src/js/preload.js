const { ipcRenderer, contextBridge, powerMonitor } = require("electron")

window.addEventListener('DOMContentLoaded', () => {

  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }

  ipcRenderer.on('screenshot:captured', (e, imageData) => {
    document.getElementById('placeholder').src = imageData;
  });

  /****************************************Accessing HTML elements********************************/

  const time_el = document.querySelector('.time');
  const today_date = document.getElementById('today_date');
  const loginbtn = document.getElementById('login');
  loginbtn.addEventListener('click', start_stop);
  const stopbtn = document.getElementById('stopbtn');
  stopbtn.addEventListener('click', start_stop)
  const view_all = document.getElementById('viewall');
  const static = document.getElementById('row-card-align')
  const hour = document.getElementById('hr');
  const minutes = document.getElementById('min');
  const secondsid = document.getElementById('sec');
  const resume_btn = document.getElementById('resume');


  //Updating date automatically on UI
  var today = new Date();
  var isplaying = false;
  let isIdle = false;
  let idleTotalTime = 0;

  /**************************************************************************************************/

  const tellTime = async function () {

    today_date.innerText = new Date().toString().slice(0, 16);
    //Checks date and resets timer if date is changed
    var dt = new Date();
    if (today.getDate() < dt.getDate() || today.getMonth() < dt.getMonth() || today.getFullYear() < dt.getFullYear()) {
      console.log("Stop calling");
      seconds = 0;
      hour.innerText = "00hr";
      minutes.innerText = "00 mins"
      secondsid.innerText = "00 secs"
      timeCapture = '00:00:00';
      stop();
      today = dt;
    }
  }
  setInterval(function () { tellTime() }, 1000);

  /*****************************************************************************************************/

  let timeCapture;
  // Update the timer
  let seconds = 0;
  let interval = null;
  let tm;
  let saveTimeInt;

  function timer() {

    seconds++;

    if (isIdle) {
      if (seconds >= idleTotalTime) seconds = seconds - idleTotalTime;
      isIdle = false;
      idleTotalTime = 0;
      console.log("....idle time...")
      setTimeout(() => { ipcRenderer.invoke("timeUpdate", timeCapture); }, 5000)
    }

    else {
      ipcRenderer.send('startInterval');
    }


    let hrs = Math.floor(seconds / 3600);
    let mins = Math.floor((seconds - (hrs * 3600)) / 60);
    let secs = seconds % 60;

    if (secs < 10) secs = '0' + secs;
    if (mins < 10) mins = "0" + mins;
    if (hrs < 10) hrs = "0" + hrs;

    //time_el.innerText = `${hrs}:${mins}:${secs}`;

    hour.innerText = `${hrs}hr`;
    if (mins > 0) { minutes.innerText = `${mins} mins` }
    else { minutes.innerText = "00 mins" }
    if (secs > 0) { secondsid.innerText = `${secs} secs` }
    else { secondsid.innerText = "00 secs" }


    timeCapture = `${hrs}:${mins}:${secs}`;
  }

  /************************************Start time function********************************************/
  function start() {

    if (interval) {
      return
    }
    isplaying = true;
    interval = setInterval(timer, 1000);

    tm = window.setInterval(() => {
      ipcRenderer.send('screenshot:capture', {});
    }, 1000 * 60 * 10);// Every 10 Minutes screen capture 1000 * 10 * 60

    saveTimeInt = window.setInterval(() => {
      ipcRenderer.invoke("timeUpdate", timeCapture);
    }, 1000 * 60 * 10);// Every 30 Minutes screen capture 1000 * 60 * 30

    setTimeout(() => { ipcRenderer.invoke("timeUpdate", timeCapture); }, 5000)

  }

  /**************************************Stop time function***************************************/
  function stop() {

    clearInterval(interval);
    interval = null;
    isplaying = false;
    window.clearInterval(tm); //screenshot
    window.clearInterval(saveTimeInt); //Time update
    ipcRenderer.invoke("timeUpdate", timeCapture)
  }

  /*   function reset() {
      stop();
      seconds = 0;
      time_el.innerText = '00:00:00';
    } */

  function start_stop() {
    if (isplaying) {
      stop();
      stopbtn.style.cssText = 'display:none';
      loginbtn.style.cssText = 'display:inline'
    }
    else {
      start();
      loginbtn.style.cssText = 'display:none';
      stopbtn.style.cssText = 'display:inline'
    }
  }

  ipcRenderer.on('dbtime:captured', (e, timerData) => {
    let ta = timerData.split(':'); // split it at the colons
    // minutes are worth 60 seconds. Hours are worth 60 minutes.
    seconds = (+ta[0]) * 60 * 60 + (+ta[1]) * 60 + (+ta[2]);
    if (isNaN(seconds)) { seconds = 0; return; }
    // time_el.innerText = timerData;
    hour.innerText = `${ta[0]}hr`;

    if (ta[1] > 0) { minutes.innerText = `${ta[1]} mins` }
    else { minutes.innerText = "00 mins" }

    if (ta[2] > 0) { secondsid.innerText = `${ta[2]} secs` }
    else { secondsid.innerText = "00 secs" }

    timeCapture = timerData;
  });

  ipcRenderer.on('stoptimer', (e) => { stop(); });
  ipcRenderer.on('starttimer', (e) => { start(); });

  ipcRenderer.on('idletime', (e, data) => {
    isIdle = true;

    if (isNaN(data)) return;
    idleTotalTime = data;
  })

  /********************************date formatting into "dd-mm-yyyy"**************************/
  function dateToDMY() {
    // Date.now();
    var obj = new Date(Date.now());
    var year = obj.getFullYear();
    var m = obj.getMonth() + 1;
    var month = m < 10 ? "0" + m : m.toString();
    var d = obj.getDate();
    var day = d < 10 ? "0" + d : d;
    return `${day}-${month}-${year}`;
  }

  ipcRenderer.on('logintime', (e, data) => {
    logintime = document.getElementById('logintime')
    logintime.innerText = data.loginTime;
  })

  ipcRenderer.on('fetchLocalTimer', (e) => {
    ipcRenderer.invoke("timeUpdate", timeCapture);
  })

  ipcRenderer.on('appVersion', (e, data) => {
    document.getElementById('version').innerText = `App Version : ${data}`
  })




  /*************************timer_format takes in seconds and returns hh:mm:ss in string********************************************/

  function timer_format(secnds) {

    let hrs = Math.floor(secnds / 3600);
    let mins = Math.floor((secnds - (hrs * 3600)) / 60);
    let secs = secnds % 60;

    if (secs < 10) secs = '0' + secs;
    if (mins < 10) mins = "0" + mins;
    if (hrs < 10) hrs = "0" + hrs;

    var timer = `${hrs}:${mins}:${secs}`;
    return timer;

  }

})


