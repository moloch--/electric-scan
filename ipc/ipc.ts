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

import { ipcMain, dialog, FileFilter, BrowserWindow, IpcMainEvent } from 'electron';
import { homedir } from 'os';
import * as base64 from 'base64-arraybuffer';
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
      "title": { "type": "string", "minLength": 1, "maxLength": 100 },
      "message": { "type": "string", "minLength": 1, "maxLength": 100 },
      "openDirectory": { "type": "boolean" },
      "multiSelections": { "type": "boolean" },
      "filter": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "extensions": {
              "type": "array",
              "items": { "type": "string" }
            }
          }
        }
      }
    },
    "required": ["title", "message"]
  })
  static async fs_readFile(req: string): Promise<string> {
    const readFileReq: ReadFileReq = JSON.parse(req);
    const dialogOptions = {
      title: readFileReq.title,
      message: readFileReq.message,
      openDirectory: readFileReq.openDirectory,
      multiSelections: readFileReq.multiSelections
    };
    const files = [];
    const open = await dialog.showOpenDialog(null, dialogOptions);
    await Promise.all(open.filePaths.map((filePath) => {
      return new Promise(async (resolve) => {
        fs.readFile(filePath, (err, data) => {
          files.push({
            filePath: filePath,
            error: err ? err.toString() : null,
            data: data ? base64.encode(data) : null
          });
          resolve(); // Failures get stored in `files` array
        });
      });
    }));
    return JSON.stringify({ files: files });
  }

  private static async readMetadata(scanPath: string): Promise<any> {
    return new Promise((resolve) => {
      const metaPath = path.join(scanPath, 'metadata.json');
      console.log(`[readMetadata] ${metaPath}`);
      fs.readFile(metaPath, (err, data) => {
        if (err) {
          resolve(null);
        } else {
          resolve(JSON.parse(data.toString()));
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
        const results = {};
        for (let index = 0; index < ls.length; ++index) {
          const scanId = ls[index];
          const meta = await IPCHandlers.readMetadata(path.join(SCANS_DIR, scanId));
          results[scanId] = meta;
        }
        resolve(JSON.stringify(results));
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
      "scan": { "type": "string", "minLength": 1, "maxLength": 100 },
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

  @jsonSchema({
    "properties": {
      "title": { "type": "string", "minLength": 1, "maxLength": 100 },
      "message": { "type": "string", "minLength": 1, "maxLength": 100 },
      "filename": { "type": "string", "minLength": 1 },
      "data": { "type": "string" }
    },
    "required": ["title", "message", "filename", "data"]
  })
  static fs_saveFile(req: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const saveFileReq: SaveFileReq = JSON.parse(req);
      const dialogOptions = {
        title: saveFileReq.title,
        message: saveFileReq.message,
        defaultPath: path.join(homedir(), 'Downloads', path.basename(saveFileReq.filename)),
      };
      const save = await dialog.showSaveDialog(dialogOptions);
      console.log(`[save file] ${save.filePath}`);
      if (save.canceled) {
        return resolve('');  // Must return to stop execution
      }
      const fileOptions = {
        mode: 0o644,
        encoding: 'binary',
      };
      const data = Buffer.from(base64.decode(saveFileReq.data));
      fs.writeFile(save.filePath, data, fileOptions, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.stringify({ filename: save.filePath }));
        }
      });
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
