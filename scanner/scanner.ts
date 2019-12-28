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

import { BrowserWindow, NativeImage } from 'electron';
import * as uuid from 'uuid/v4';
import * as fs from 'fs';
import * as path from 'path';
import { Observer } from 'rxjs';

// Screenshot data + metadata
interface Screenshot {
  target: string;
  image: NativeImage|null;
  error: string;
}

// Result for a single target, but no image data
export interface ScanResult {
  id: string;
  target: string;
  error: string;
}

// Results for the entire scan
export interface Scan {
  id: string;
  name: string;
  results: ScanResult[];
  duration: number;
}

export class ElectricScanner {

  public width: number = 1920;
  public height: number = 1080;
  public timeout: number = 10000;
  public margin: number = 100;

  constructor(private maxNumOfWorkers = 8) { }

  private unique(targets: string[]): string[] {
    targets = targets.map(target => target.trim());
    return targets.filter((elem, index, self) => {
      return index === self.indexOf(elem);
    });
  }

  async start(parentDir: string, name: string, targets: string[]): Promise<string> {
    const scan: Scan = {
      id: uuid().toString(),
      name: name,
      results: [],
      duration: -1,
    };
    console.log(`Starting new scan with id ${scan.id}`)
    console.log(`Max number of workers: ${this.maxNumOfWorkers}`);
    const started = new Date();
    const scanDir = path.join(parentDir, scan.id);
    if (!fs.existsSync(scanDir)) {
      fs.mkdirSync(scanDir, {mode: 0o700, recursive: true});
      console.log(`Created scan directory: ${scanDir}`);
    }
    setImmediate(async () => {
      const tasks = this.unique(targets);
      console.log(`Scanning ${tasks.length} target(s) ...`);
      scan.results = await this.executeQueue(scanDir, tasks);
      scan.duration = new Date().getTime() - started.getTime();
      console.log(`Scan completed: ${scan.duration}`);
      this.saveMetadata(scanDir, started, scan);
    });
    return scan.id;
  }

  private async saveMetadata(scanDir: string, started: Date, scan: Scan) {
    const metaPath = path.join(scanDir, 'metadata.json');
    const metadata = JSON.stringify({
      name: scan.name,
      started: started.toString(),
      duration: scan.duration,
      results: scan.results,
    });
    fs.writeFile(metaPath, metadata, {mode: 0o600, encoding: 'utf-8'}, (err) => {
      err ? console.error(err) : null;
    });
  }

  private executeQueue(scanDir: string, tasks: string[]): Promise<ScanResult[]> {
    let numOfWorkers = 0;
    let taskIndex = 0;
    const results: ScanResult[] = new Array(tasks.length);

    return new Promise(complete => {

      const handleResult = (index: number, screenshot: Screenshot) => {
        console.log(`handleResult()`);
        const taskId = uuid().toString();
        results[index] = {
          id: taskId,
          target: screenshot.target,
          error: screenshot.error,
        };
        const data = JSON.stringify({
          id: taskId,
          target: screenshot.target,
          image: screenshot.image ? screenshot.image.toDataURL() : '',
          error: screenshot.error,
        });
        const filePath = path.join(scanDir, `${taskId}.json`);
        const filePNG = path.join(scanDir, `${taskId}.png`);
        console.log(`Saving result for ${screenshot.target} to ${filePath}`);
        fs.writeFile(filePath, data, {mode: 0o600, encoding: 'utf-8'}, (err) => {
          err ? console.error(err) : null;
        });
        const imageData = screenshot.image ? screenshot.image.toPNG() : new Buffer('');
        fs.writeFile(filePNG, imageData, {mode: 0o600, encoding: 'binary'}, (err) => {
          err ? console.error(err) : null;
        });
        numOfWorkers--;
        getNextTask();
      };

      const getNextTask = () => {
        console.log(`getNextTask() - Task ${taskIndex} of ${tasks.length} - Workers: ${numOfWorkers} (Max: ${this.maxNumOfWorkers})`);
        if (numOfWorkers < this.maxNumOfWorkers && taskIndex < tasks.length) {
          this.capture(tasks[taskIndex]).then((result) => { 
            handleResult(taskIndex, result); // Success
          }).catch((result) => {
            handleResult(taskIndex, result); // Failure
          });
          taskIndex++;
          numOfWorkers++;
          getNextTask();
        } else if (numOfWorkers === 0 && taskIndex === tasks.length) {
          complete(results);
        }
      };

      getNextTask();
    });
  }

  private async capture(target: string): Promise<Screenshot> {

    const targetURL = new URL(target);
    console.log(`Screen capture: ${targetURL.toString()}`);
    if (targetURL.protocol !== 'http:' && targetURL.protocol !== 'https:') {
      return Promise.reject({
        target: targetURL.toString(),
        image: null,
        error: `Invalid protocol '${targetURL.protocol}'`
      });
    }
  
    let scanWindow = this.scanWindow(this.width, this.height);
    scanWindow.on('closed', () => {
      scanWindow = null;
    });
    scanWindow.loadURL(targetURL.toString());
    
    try {
      const image: NativeImage = await new Promise((resolve, reject) => {
        // Set timeout and clear it if we get a 'dom-ready'
        const timeoutErr = setTimeout(() => {
          scanWindow.close();
          reject('timeout');
        }, this.timeout);
        scanWindow.webContents.once('dom-ready', () => {
          // We got a 'dom-ready' wait 'margin' ms before capturePage()
          console.log(`DOM ready for ${targetURL.toString()}`);
          clearTimeout(timeoutErr);
          setTimeout(async () => {
            const image = await scanWindow.capturePage();
            scanWindow.close();
            resolve(image);
          }, this.margin);
        });
      });
      return {
        target: targetURL.toString(),
        image: image,
        error: '',
      };
    } catch (err) {
      return {
        target: targetURL.toString(),
        image: null,
        error: err,
      };
    }

  }

  private scanWindow(width: number, height: number): BrowserWindow {
    return new BrowserWindow({
      width: width,
      height: height,
      show: false,
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
      }
    });
  }

}