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

import { dialog, nativeTheme, SaveDialogOptions } from 'electron';
import { homedir } from 'os';
import { shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import { jsonSchema } from './jsonschema';
import { SCANS_DIR, SETTINGS_PATH } from './constants';


export class ClientHandlers {

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
    } catch (err) {
      console.error(err);
      return Promise.reject(`Failed to open url: ${req}`)
    }
  }

  @jsonSchema({
    "type": "object",
    "properties": {
      "scanId": { "type": "string", "minLength": 1, "maxLength": 36 },
    },
    "required": ["scanId"]
  })
  static async client_openScanFolder(req: string): Promise<string> {
    try {
      const openScanReq = JSON.parse(req);
      const scanId = path.basename(openScanReq.scanId);
      const scanPath = path.join(SCANS_DIR, scanId);
      if (fs.existsSync(scanPath)) {
        shell.showItemInFolder(scanPath);
      }
      return scanId;
    } catch (err) {
      console.error(err);
      return Promise.reject(`Failed to open scan folder: ${req}`)
    }
  }

  @jsonSchema({
    "type": "object",
    "properties": {
      "scanId": { "type": "string", "minLength": 1, "maxLength": 36 },
      "resultId": { "type": "string", "minLength": 1, "maxLength": 36 },
    },
    "required": ["scanId", "resultId"]
  })
  static async client_saveImageAs(req: string): Promise<string> {
    try {
      const saveImageReq = JSON.parse(req);
      const scanId = path.basename(saveImageReq.scanId);
      const resultId = path.basename(saveImageReq.resultId);
      const src = path.join(SCANS_DIR, scanId, `${resultId}.png`);
      if (fs.existsSync(src)) {
        const dialogOptions: SaveDialogOptions = {
          title: 'Save Image As ...',
          message: 'Save screenshot file',
          defaultPath: path.join(homedir(), 'Desktop', 'Untitled.png'),
          properties: ['createDirectory', 'showHiddenFiles', 'showOverwriteConfirmation']
        };
        const dst = await dialog.showSaveDialog(dialogOptions);
        if (!dst.canceled) {
          console.log(`[save image] ${dst.filePath}`);
          fs.copyFile(src, dst.filePath, (err) => { err ? console.error(err) : null });
        }
        return JSON.stringify({ success: true });
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  @jsonSchema({
    "type": "object",
    "properties": {
      "scanId": { "type": "string", "minLength": 1, "maxLength": 36 },
    },
    "required": ["scanId"]
  })
  static async client_saveAllAs(req: string): Promise<string> {
    try {
      const saveAllReq = JSON.parse(req);
      const scanId = path.basename(saveAllReq.scanId);
      const srcDir = path.join(SCANS_DIR, scanId);
      if (fs.existsSync(srcDir)) {
        const dialogOptions: SaveDialogOptions = {
          title: 'Save All As ...',
          message: 'Save all screenshots',
          defaultPath: path.join(homedir(), 'Desktop'),
          properties: ['createDirectory', 'showHiddenFiles', 'showOverwriteConfirmation']
        };
        const dstDir = await dialog.showSaveDialog(dialogOptions);
        if (!dstDir.canceled) {
          if (!fs.existsSync(dstDir.filePath)) {
            fs.mkdirSync(dstDir.filePath, { mode: 0o700 });
          }
          const ls = await ClientHandlers.lsDir(srcDir);
          const pngs = ls.filter(filename => filename.endsWith('.png'));
          for (let index = 0; index < pngs.length; ++index) {
            const src = path.join(srcDir, pngs[index]);
            const dst = path.join(dstDir.filePath, pngs[index]);
            console.log(`[save all] ${src} -> ${dst}`);
            fs.copyFile(src, dst, (err) => { err ? console.error(err) : null });
          }
        }
      }
    } catch (err) {
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
      "UserAgent": { "type": ["string", "null"] },
      "DisableTLSValidation": { "type": ["boolean", "null"] },
      "SOCKSProxyEnabled": { "type": ["boolean", "null"] },
      "SOCKSProxyHostname": { "type": ["string", "null"] },
      "SOCKSProxyPort": { "type": ["number", "null"] },
      "HTTPProxyEnabled": { "type": ["boolean", "null"] },
      "HTTPProxyHostname": { "type": ["string", "null"] },
      "HTTPProxyPort": { "type": ["number", "null"] },
      "HTTPSProxyEnabled": { "type": ["boolean", "null"] },
      "HTTPSProxyHostname": { "type": ["string", "null"] },
      "HTTPSProxyPort": { "type": ["number", "null"] },
    }
  })
  static async client_saveSettings(req: string): Promise<string> {
    try {
      fs.writeFile(SETTINGS_PATH, req, {mode: 0o600}, (err) => {
        err ? console.error(err) : null;
      });
      return req;
    } catch (err) {
      return Promise.reject('');
    }
  }

}