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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type ProtocolCallback = (arg0: { mimeType: string; charset: string; data: Buffer; }) => void;
const SCAN_DIR = path.join(os.homedir(), '.electric', 'scans');
export const scheme = 'scan';

const mimeTypes = {
  '.json': 'application/json',
  '.png': 'image/png',
};

function charset(mimeType: string): string {
  return ['.json'].some(m => m === mimeType) ? 'utf-8' : null;
}

function mime(filename: string): string {
  const type = mimeTypes[path.extname(`${filename || ''}`).toLowerCase()];
  return type ? type : null;
}

export function requestHandler(req: Electron.Request, next: ProtocolCallback) {
  const reqUrl = new URL(req.url);
  let reqPath = path.normalize(reqUrl.pathname);
  if (reqPath === '/') {
    fs.readdir(SCAN_DIR, (err, files) => {
      if (!err) {
        next({
          mimeType: 'application/json',
          charset: 'utf-8',
          data: Buffer.from(JSON.stringify({ scans: files })),
        });
      } else {
        console.error(err);
      }
    });
  } else {
    const reqFilename = path.basename(reqPath);
    fs.readFile(path.join(SCAN_DIR, reqPath), (err, data) => {
      const mimeType = mime(reqFilename);
      if (!err && mimeType !== null) {
        next({
          mimeType: mimeType,
          charset: charset(mimeType),
          data: data
        });
      } else {
        console.error(err);
      }
    });
  }
}
