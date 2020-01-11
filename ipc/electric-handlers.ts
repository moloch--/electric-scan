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

import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

import { jsonSchema } from './jsonschema';
import { ElectricScanner } from '../scanner';
import { ClientHandlers } from './client-handlers';

import { SCANS_DIR } from './constants';


export class ElectricHandlers {

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
          const meta = await ElectricHandlers.readMetadata(path.join(SCANS_DIR, scanId));
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
        const ls = await ClientHandlers.lsDir(scanDir);
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
    const scanSettings = await ClientHandlers.client_loadSettings('');
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
      const meta = await ElectricHandlers.readMetadata(path.join(SCANS_DIR, metadataReq.id));
      if (meta) {
        resolve(JSON.stringify(meta));
       } else {
        reject(`Scan '${metadataReq.id}' does not exist`);
       }
    });
  }

}
