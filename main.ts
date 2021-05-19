/*
  Electric Scan
  Copyright (C) 2019  Bishop Fox

  This program is free software; you can redistribute it and/or
  modify it under the terms of the GNU General Public License
  as published by the Free Software Foundation; either version 2
  of the License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

import { app, BrowserWindow, screen, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as contextMenu from 'electron-context-menu';

import { startIPCHandlers, SCANS_DIR } from './main/ipc';
import * as AppProtocol from './app-protocol';


let mainWindow: BrowserWindow;

async function createMainWindow() {

  const electronScreen = screen;
  const screenSize = electronScreen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  const gutterSize = 100;
  mainWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    x: gutterSize,
    y: gutterSize,
    width: screenSize.width - (gutterSize * 2),
    height: screenSize.height - (gutterSize * 2),
    webPreferences: {
      sandbox: true,
      webSecurity: true,
      contextIsolation: true,
      webviewTag: false,
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      nativeWindowOpen: false,
      safeDialogs: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // hide until 'ready-to-show'
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`${AppProtocol.scheme}://electric/index.html`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

}

// ------------------- [ MAIN ] -------------------

try {

  contextMenu({
    prepend: (defaultActions, params, browserWindow) => [],
  });
  
  if (!fs.existsSync(SCANS_DIR)) {
    fs.mkdirSync(SCANS_DIR, {recursive: true, mode: 0o700});
  }

  // Custom protocol handler
  app.on('ready', () => {
    protocol.registerBufferProtocol(AppProtocol.scheme, AppProtocol.requestHandler);
    protocol.interceptFileProtocol('file', (_, cb) => { cb(null) });
    createMainWindow();
    startIPCHandlers(mainWindow);
  });

  protocol.registerSchemesAsPrivileged([{
    scheme: AppProtocol.scheme,
    privileges: { 
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }]);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createMainWindow();
    }
  });

} catch (error) {
  console.error(error);
  process.exit(1);
}
