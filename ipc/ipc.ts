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
  ipcMain, FileFilter, BrowserWindow, IpcMainEvent, dialog, nativeTheme
} from 'electron';
import { homedir } from 'os';
import { shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import { jsonSchema } from './jsonschema';
import { ElectricScanner } from '../scanner';


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

export const APP_DIR = path.join(homedir(), '.electric');
export const SCANS_DIR = path.join(APP_DIR, 'scans');
export const SETTINGS_PATH = path.join(APP_DIR, 'settings.json');


// IPC Methods used to start/interact with the RPCClient
export class IPCHandlers {

  static client_exit() {
    process.on('unhandledRejection', () => { }); // STFU Node
    process.exit(0);
  }

  static async client_systemPreferences(_: string): Promise<string> {
    return JSON.stringify({
      darkMode: nativeTheme.shouldUseDarkColors,
    });
  }

  @jsonSchema({
    "type": "object",
    "properties": {
      "url": { "type": "string", "minLength": 1, "maxLength": 2048 },
    },
    "required": ["url"]
  })
  static async client_openUrl(req: string): Promise<string> {
    try {
      const openUrlReq = JSON.parse(req);
      const url = new URL(openUrlReq.url);
      if (["http:", "https:"].some(proto => proto === url.protocol)) {
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
    "type": "object",
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
    "type": "object",
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
          properties: {
            openFile: true,
            createDirectory: true,
          }
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

  @jsonSchema({
    "type": "object",
    "properties": {
      "scan": { "type": "string", "minLength": 1, "maxLength": 36 },
    },
    "required": ["scan"]
  })
  static async client_saveAllAs(req: string): Promise<string> {
    try {
      const saveAllReq = JSON.parse(req);
      const scanId = path.basename(saveAllReq.scan);
      const srcDir = path.join(SCANS_DIR, scanId);
      if (fs.existsSync(srcDir)) {
        const dialogOptions = {
          title: 'Save All As ...',
          message: 'Save all screenshots',
          defaultPath: path.join(homedir(), 'Desktop'),
          properties: {
            openDirectory: true,
            createDirectory: true,
          }
        };
        const dstDir = await dialog.showSaveDialog(dialogOptions);
        if (!dstDir.canceled) {
          if (!fs.existsSync(dstDir.filePath)) {
            fs.mkdirSync(dstDir.filePath, {mode: 0o700});
          }
          const ls = await IPCHandlers.lsDir(srcDir);
          const pngs = ls.filter(filename => filename.endsWith('.png'));
          for (let index = 0; index < pngs.length; ++index) {
            const src = path.join(srcDir, pngs[index]);
            const dst = path.join(dstDir.filePath, pngs[index]);
            console.log(`[save all] ${src} -> ${dst}`);
            fs.copyFile(src, dst, (err) => { err ? console.error(err) : null }); 
          }
        }
      }
    } catch(err) {
      return Promise.reject(err);
    }
  }

  static async lsDir(dir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, async (err, nodes) => {
        err ? reject(err) : resolve(nodes);
      });
    });
  }

  static async client_loadSettings(_: string): Promise<string> {
    return new Promise(async (resolve) => {
      console.log(`[load settings] ${SETTINGS_PATH}`);
      if (!fs.existsSync(SETTINGS_PATH)) {
        await this.client_saveSettings(JSON.stringify({}));
      }
      fs.readFile(SETTINGS_PATH, (err, data) => {
        if (err) {
          resolve(null);
        } else {
          try {
            resolve(data.toString());
          } catch (err) {
            console.error(`[JSON Error]: ${err}`);
            resolve(null);
          }
        }
      });
    });
  }

  @jsonSchema({
    "type": "object",
    "properties": {
      "UserAgent": {"type": ["string", "null"]},
      "DisableTLSValidation": {"type": ["boolean", "null"]},
      "SOCKSProxyEnabled": {"type": ["boolean", "null"]},
      "SOCKSProxyHostname": {"type": ["string", "null"]},
      "SOCKSProxyPort": {"type": ["number", "null"]},
      "HTTPProxyEnabled": {"type": ["boolean", "null"]},
      "HTTPProxyHostname": {"type": ["string", "null"]},
      "HTTPProxyPort": {"type": ["number", "null"]},
      "HTTPSProxyEnabled": {"type": ["boolean", "null"]},
      "HTTPSProxyHostname": {"type": ["string", "null"]},
      "HTTPSProxyPort": {"type": ["number", "null"]},
    }
  })
  static async client_saveSettings(req: string): Promise<string> {
    try {
      fs.writeFile(SETTINGS_PATH, req, {mode: 0o600}, (err) => {
        err ? console.error(err) : null;
      });
      return req;
    } catch(err) {
      return Promise.reject('');
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
    "type": "object",
    "properties": {
      "scan": { "type": "string", "minLength": 1, "maxLength": 36 },
    },
    "required": ["scan"]
  })
  static async electric_rmScan(req: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const rmScanReq = JSON.parse(req);
      const scanId = path.basename(rmScanReq.scan);
      const scanDir = path.join(SCANS_DIR, scanId);
      if (fs.existsSync(scanDir)) {

        // If we fail to remove a file the rmdir() will also fail,
        // so just always resolve the unlink() promise
        console.log(`[rm scan] ${scanDir}`);
        const ls = await IPCHandlers.lsDir(scanDir);
        await Promise.all(ls.map((filename) => {
          return new Promise((resolve) => {
            fs.unlink(path.join(scanDir, filename), resolve);
          });
        }));

        fs.rmdir(scanDir, (err) => { 
          if (err) {
            console.error(err);
            reject(err);
          } else {
            resolve(JSON.stringify({ scan: scanId }));
          }
        });
      }
    })
  }

  @jsonSchema({
    "type": "object",
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
    const scanSettings = await IPCHandlers.client_loadSettings('');
    let scanner = new ElectricScanner(JSON.parse(scanSettings), workers);
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
    let scan$ = await scanner.start(SCANS_DIR, scanReq.name, scanReq.targets);
    const subscription = scan$.subscribe((scan) => {
      ipcMain.emit('push', JSON.stringify(scan));
    }, (err) => {
      console.error(`[scan error]: ${err}`);
    }, () => {
      // On Complete
      subscription.unsubscribe();
      scanner = null;
      scan$ = null;
    });
    return JSON.stringify({ id: scanner.scan.id });
  }

  @jsonSchema({
    "type": "object",
    "properties": {
      "id": { "type": "string", "minLength": 1, "maxLength": 36 },
    },
    "required": ["id"],
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
