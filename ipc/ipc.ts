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

import {
  ipcMain, BrowserWindow, IpcMainEvent, dialog, nativeTheme
} from 'electron';

import { ElectricHandlers } from './electric-handlers';
import { ClientHandlers } from './client-handlers';


export interface IPCMessage {
  id: number;
  type: string;
  method: string;
  data: string;
}

const IPC_HANDLERS = [ElectricHandlers, ClientHandlers];

// IPC handlers must start with "namespace_" this helps ensure we do not inadvertently
// expose methods that we don't want exposed to the sandboxed code.
const prefixWhitelist = ['fs_', 'client_', 'electric_'];
async function dispatchIPC(method: string, data: string): Promise<string | null> {
  console.log(`IPC Dispatch: ${method}`);
  if (prefixWhitelist.some(prefix => method.startsWith(prefix))) {
    for (let handlers of IPC_HANDLERS) {
      if (typeof handlers[method] === 'function') {
        const result: string = await handlers[method](data);
        return result;
      }
    }
    return Promise.reject(`No handler for method: ${method}`);
  } else {
    return Promise.reject(`Invalid method handler namespace for "${method}"`);
  }
}

export function startIPCHandlers(window: BrowserWindow) {

  ipcMain.on('ipc', async (event: IpcMainEvent, msg: IPCMessage) => {
    dispatchIPC(msg.method, msg.data).then((result: string) => {
      if (msg.id !== 0) {
        event.sender.send('ipc', {
          id: msg.id,
          type: 'response',
          method: 'success',
          data: result
        });
      }
    }).catch((err) => {
      console.error(`[startIPCHandlers] ${err}`);
      if (msg.id !== 0) {
        event.sender.send('ipc', {
          id: msg.id,
          type: 'response',
          method: 'error',
          data: err.toString()
        });
      }
    });
  });

  // This one doesn't have an event argument for some reason ...
  ipcMain.on('push', async (event: IpcMainEvent) => {
    window.webContents.send('ipc', {
      id: 0,
      type: 'push',
      method: '',
      data: event
    });
  });

}
