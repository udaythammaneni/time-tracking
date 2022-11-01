const { app, BrowserWindow, ipcMain, desktopCapturer, Notification, powerMonitor, powerSaveBlocker, dialog, globalShortcut, shell } = require('electron')
const path = require('path')
const fs = require('fs');
var FormData = require('form-data');
const axios = require("axios");
const Store = require("electron-store");
const { log } = require('console');
const storage = new Store();

app.disableHardwareAcceleration()
const isDev = !app.isPackaged;

let win;
function mainWindow() {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) { app.quit() } //Second Instance will Quit

  win = new BrowserWindow({
    width: 450,
    height: 800,
    minWidth: 450,
    maxWidth: 450,
    minHeight: 500,
    icon: './assets/images/timet_2.ico',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, './src/js/preload.js'),
      backgroundThrottling: false

    },
    show: false
  })

  win.loadFile('./src/html/index.html')

  win.once("ready-to-show", () => {
    win.show();
  })
  // Open the DevTools.
  if (isDev) win.webContents.openDevTools()
  win.webContents.on("did-finish-load", () => {
    fetchDBTime();
    win.webContents.send('appVersion', app.getVersion());
  });


  win.on('close', function (e) {
    e.preventDefault();
    app_quit();

  });

  powerMonitor.on("lock-screen", () => {
    powerSaveBlocker.start("prevent-display-sleep");

  });
  powerMonitor.on("suspend", () => {
    powerSaveBlocker.start("prevent-app-suspension");
  });

}

/* Load App Open */
app.whenReady().then(mainWindow);

/** 0: Ctrl+c 1:close  2: window-all-closed, 3: before-quit, 4: will-quit*/
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow()
  }
})







function fetchDBTime() {
  win.webContents.send('dbtime:captured', "01:00:00");
}

function app_quit() {
  win.webContents.send('fetchLocalTimer');
  win.webContents.send('updateQuitTimer');
  dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Yes', 'No'],
    title: 'Confirm',
    normalizeAccessKeys: true,
    message: 'Are you sure you want to quit?'
  }).then((choice) => {
    // "Yes" - 0, "No" - 1
    if (choice.response === 0) {
      win.destroy();
      app.quit();
    }
  }).catch(err => {
    console.log('App quit', err.message);
  });
}

function checkNewUpdates() {
  notify = new Notification({
    title: "App update",
    body: "There is a new version of the app",
  });
  notify.show();
  notify.on("click", function () {
    console.log("Clicked");
    shell.openExternal(URI);
  });
}




function idleTimeDialog() {
  idleTimePopup = true;
  //Stop timer until confirm it
  // win.webContents.send('stoptimer'); 
  var options = {
    type: 'question',
    buttons: ['Yes', 'No'],
    title: 'Confirm',
    normalizeAccessKeys: true,
    message: `Do you want to add idle time to the total time?`
  };

  dialog.showMessageBox(win, options)
    .then((choice) => {
      idleTimePopup = false;
      // "Yes" - 0, "No" - 1
      if (choice.response === 1) {
        win.webContents.send('idletime', idleTotalTime);
      }
      // win.webContents.send('starttimer');
      idleTotalTime = 0;
    }).catch(err => {
      idleTimePopup = false;
      console.log('Idle Time', err.message);
    });
}


let idleTimePopup = false;
let idleTotalTime = 0;
function calcIdleTime() {
  var x = powerMonitor.getSystemIdleTime();

  if (x != 0) {
    if (x % 60 == 0) {
      if (!idleTimePopup) {
        idleTotalTime = 60;
        idleTimeDialog();
      }
    }
    if (idleTimePopup) idleTotalTime++;
  }

}

ipcMain.on('startInterval', () => {
  calcIdleTime();
})



/* Time Update */
ipcMain.handle("timeUpdate", async (event, timer) => {
  await timeUpdateAPI(timer);
});

function timeUpdateAPI(timer) {
  console.log("timeUpdateAPI", timer);
  if (timer == undefined) return;
  let ta = timer.split(':');
  seconds = (+ta[0]) * 60 * 60 + (+ta[1]) * 60 + (+ta[2]);
  if (isNaN(seconds)) return;

  //API CALL

}

ipcMain.on('screenshot:capture', (e, value) => { // The button which takes the screenshot
  desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
    .then(sources => {
      let image = sources[0].thumbnail.toDataURL() // The image to display the screenshot

      let base64Data = image.replace(/^data:image\/png;base64,/, "");

      fs.writeFileSync("output.png", base64Data, 'base64');//Save in folder

      let form = new FormData();
      form.append('image', fs.createReadStream('output.png'));

      axios.post("URL", form, {
        headers: {
          'Authorization': `Bearer ${storage.get("userToken")}`,
          'Content-Type': `multipart/form-data`,
        }
      })
        .then((response) => {
          if (response.data.code == 200) {
            console.log("Image uploaded succesfully");
          }
        }).catch((error) => {
          console.log("Image upload", error.message);
        });

      // win.webContents.send('screenshot:captured', image);
    });
})