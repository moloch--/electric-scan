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
--------------------------------------------------------------------------

Maps IPC calls to RPC calls, and provides other local operations such as
listing/selecting configs to the sandboxed code.

*/

import { ipcMain, FileFilter, BrowserWindow, IpcMainEvent, dialog } from 'electron';
import { homedir } from 'os';
import { shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import { jsonSchema } from './jsonschema';
import { ElectricScanner, Scan } from '../scanner';


export interface ReadFileReq {
  title: string;
  message: string;
  openDirectory: boolean;
  multiSelections: boolean;
  filters: FileFilter[] | null; // { filters: [ { name: 'Custom File Type', extensions: ['as'] } ] }
}

export interface SaveFileReq {
  title: string;
  message: string;
  filename: string;
  data: string;
}

export interface IPCMessage {
  id: number;
  type: string;
  method: string; // Identifies the target method and in the response if the method call was a success/error
  data: string;
}

const SCANS = {};
const SCANS_DIR = path.join(homedir(), '.electric', 'scans');

// IPC Methods used to start/interact with the RPCClient
export class IPCHandlers {

  static client_exit() {
    process.on('unhandledRejection', () => { }); // STFU Node
    process.exit(0);
  }

  @jsonSchema({
    "properties": {
      "url": { "type": "string", "minLength": 1, "maxLength": 2048 },
    },
    "required": ["url"]
  })
  static async client_openUrl(req: string): Promise<string> {
    try {
      const openUrlReq = JSON.parse(req);
      const url = new URL(openUrlReq.url);
      if (["http:", "https:"].some(p => p === url.protocol)) {
        console.log(`[open url] ${url.toString()}`);
        shell.openExternal(url.toString());
      }
      return url.toString();
    } catch(err) {
      console.error(err);
      return Promise.reject(`Failed to open url: ${req}`)
    }
  }

  @jsonSchema({
    "properties": {
      "scan": { "type": "string", "minLength": 1, "maxLength": 36 },
    },
    "required": ["scan"]
  })
  static async client_openScanFolder(req: string): Promise<string> {
    try {
      const openScanReq = JSON.parse(req);
      const scanId = path.basename(openScanReq.scan);
      const scanPath = path.join(SCANS_DIR, scanId);
      if (fs.existsSync(scanPath)) {
        shell.showItemInFolder(scanPath);
      }
      return scanId;
    } catch(err) {
      console.error(err);
      return Promise.reject(`Failed to open scan folder: ${req}`)
    }
  }

  @jsonSchema({
    "properties": {
      "scan": { "type": "string", "minLength": 1, "maxLength": 36 },
      "result": { "type": "string", "minLength": 1, "maxLength": 36 },
    },
    "required": ["scan", "result"]
  })
  static async client_saveImageAs(req: string): Promise<string> {
    try {
      const saveImageReq = JSON.parse(req);
      const scanId = path.basename(saveImageReq.scan);
      const resultId = path.basename(saveImageReq.result);
      const src = path.join(SCANS_DIR, scanId, `${resultId}.png`);
      if (fs.existsSync(src)) {
        const dialogOptions = {
          title: 'Save Image As ...',
          message: 'Save screenshot file',
          defaultPath: path.join(homedir(), 'Desktop', 'Untitled.png'),
        };
        const dst = await dialog.showSaveDialog(dialogOptions);
        if (!dst.canceled) {
          console.log(`[save image] ${dst.filePath}`);
          fs.copyFile(src, dst.filePath, (err) => { err ? console.error(err) : null }); 
        }
        return JSON.stringify({ success: true });
      }
    } catch(err) {
      return Promise.reject(err);
    }
  }

  private static async readMetadata(scanPath: string): Promise<any> {
    return new Promise((resolve) => {
      const metaPath = path.join(scanPath, 'metadata.json');
      console.log(`[readMetadata] ${metaPath}`);
      fs.readFile(metaPath, (err, data) => {
        if (err) {
          resolve(null);
        } else {
          try {
            resolve(JSON.parse(data.toString()));
          } catch (err) {
            console.error(`[JSON Error]: ${err}`);
            resolve(null);
          }
        }
      });
    });
  }

  static async electric_list(_: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readdir(SCANS_DIR, async (err, ls) => {
        if (err) {
          return reject(err);
        }
        const results = [];
        for (let index = 0; index < ls.length; ++index) {
          const scanId = ls[index];
          if (scanId.startsWith('.')) {
            continue;
          }
          const meta = await IPCHandlers.readMetadata(path.join(SCANS_DIR, scanId));
          meta ? results.push(meta) : null;
        }
        resolve(JSON.stringify({ scans: results }));
      });
    });
  }

  @jsonSchema({
    "properties": {
      "name": { "type": "string", "minLength": 1, "maxLength": 100 },
      "targets": { 
        "type": "array",
        "minLength": 1,
        "items": { "type": "string", "minLength": 1 },
        "additionalItems": false,
      },
      "maxWorkers": { "type": "number" },
      "width":  { "type": "number" },
      "height":  { "type": "number" },
      "margin":  { "type": "number" },
      "timeout":  { "type": "number" },
    },
    "required": ["name", "targets"]
  })
  static async electric_scan(req: string): Promise<string> {
    const scanReq = JSON.parse(req);
    const workers = scanReq.maxWorkers ? Math.abs(scanReq.maxWorkers || 1) : 8;
    const scanner = new ElectricScanner(workers);
    if (scanReq.width) {
      scanner.width = scanReq.width;
    }
    if (scanReq.height) {
      scanner.height = scanReq.height;
    }
    if (scanReq.margin) {
      scanner.margin = scanReq.margin;
    }
    if (scanReq.timeout) {
      scanner.timeout = scanReq.timeout;
    }
    const parentDir = path.join(homedir(), '.electric', 'scans');
    const scan$ = await scanner.start(parentDir, scanReq.name, scanReq.targets);
    SCANS[scanner.scan.id] = scan$;
    const subscription = scan$.subscribe((scan) => {
      ipcMain.emit('push', JSON.stringify(scan));
    }, (err) => {
      console.error(`[scan error]: ${err}`);
    }, () => {
      delete SCANS[scanner.scan.id];
      subscription.unsubscribe();
    });
    return JSON.stringify({ id: scanner.scan.id });
  }

  @jsonSchema({
    "properties": {
      "scan": { "type": "string", "minLength": 1, "maxLength": 36 },
    },
    "required": ["scan"],
  })
  static electric_metadata(req: string): Promise<string> {
    const metadataReq = JSON.parse(req);
    return new Promise(async (resolve, reject) => {
      const meta = await IPCHandlers.readMetadata(path.join(SCANS_DIR, metadataReq.id));
      if (meta) {
        resolve(JSON.stringify(meta));
       } else {
        reject(`Scan '${metadataReq.id}' does not exist`);
       }
    });
  }

}

// IPC handlers must start with "namespace_" this helps ensure we do not inadvertently
// expose methods that we don't want exposed to the sandboxed code.
const prefixWhitelist = ['fs_', 'client_', 'electric_'];
async function dispatchIPC(method: string, data: string): Promise<string | null> {
  console.log(`IPC Dispatch: ${method}`);
  if (prefixWhitelist.some(prefix => method.startsWith(prefix))) {
    if (typeof IPCHandlers[method] === 'function') {
      const result: string = await IPCHandlers[method](data);
      return result;
    } else {
      return Promise.reject(`No handler for method: ${method}`);
    }
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
