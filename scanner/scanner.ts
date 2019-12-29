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
import { BehaviorSubject } from 'rxjs';


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
  started: number;
  duration: number;
}

export class ElectricScanner {

  public width: number = 1920;
  public height: number = 1080;
  public timeout: number = 10000;
  public margin: number = 100;
  public scan$: BehaviorSubject<Scan>;
  public scan: Scan;

  private _started: Date;

  constructor(private maxNumOfWorkers = 8) { }

  private unique(targets: string[]): string[] {
    targets = targets.map(target => target.trim()).filter(t => t.length);
    return targets.filter((elem, index, self) => {
      return index === self.indexOf(elem);
    });
  }

  async start(parentDir: string, name: string, targets: string[]): Promise<BehaviorSubject<Scan>> {
    const tasks = this.unique(targets);
    this._started = new Date();
    this.scan = {
      id: uuid().toString(),
      name: name,
      results: new Array(tasks.length),
      started: this._started.getTime(),
      duration: -1,
    };
    console.log(`Starting new scan with id ${this.scan.id}`)
    console.log(`Max number of workers: ${this.maxNumOfWorkers}`);
    const scanDir = path.join(parentDir, this.scan.id);
    if (!fs.existsSync(scanDir)) {
      fs.mkdirSync(scanDir, {mode: 0o700, recursive: true});
      console.log(`Created scan directory: ${scanDir}`);
    }
    this.scan$ = new BehaviorSubject(this.scan);
    await this.saveMetadata(scanDir);
    setImmediate(async () => {
      console.log(`Scanning ${tasks.length} target(s) ...`);
      await this.executeQueue(scanDir, tasks);
      this.scan.duration = new Date().getTime() - this._started.getTime();
      console.log(`Scan completed: ${this.scan.duration}`);
      await this.saveMetadata(scanDir);
      this.scan$.complete();
    });
    return this.scan$;
  }

  private async saveMetadata(scanDir: string) {
    return new Promise((resolve, reject) => {
      const metaPath = path.join(scanDir, 'metadata.json');
      fs.writeFile(metaPath, JSON.stringify(this.scan), {mode: 0o600, encoding: 'utf-8'}, (err) => {
        err ? reject(err) : resolve();
        this.scan$.next(this.scan);
      });
    });
  }

  private executeQueue(scanDir: string, tasks: string[]): Promise<null> {
    let numOfWorkers = 0;
    let taskIndex = 0;

    return new Promise((complete) => {

      const handleResult = (index: number, screenshot: Screenshot) => {
        console.log(`handleResult() for ${index}`);
        const taskId = uuid().toString();
        this.scan.results[index] = {
          id: taskId,
          target: screenshot.target,
          error: screenshot.error,
        };
        const filePNG = path.join(scanDir, `${taskId}.png`);
        const imageData = screenshot.image ? screenshot.image.toPNG() : Buffer.from('');
        fs.writeFile(filePNG, imageData, {mode: 0o600, encoding: 'binary'}, (err) => {
          err ? console.error(err) : null;
        });
        numOfWorkers--;
        getNextTask();
      };

      const getNextTask = () => {
        console.log(`getNextTask() - Task ${taskIndex} of ${tasks.length} - Workers: ${numOfWorkers} (Max: ${this.maxNumOfWorkers})`);
        if (numOfWorkers < this.maxNumOfWorkers && taskIndex < tasks.length) {
          const index = taskIndex;
          this.capture(tasks[index]).then((result) => { 
            handleResult(index, result); // Success
          }).catch((result) => {
            handleResult(index, result); // Failure
          });
          taskIndex++;
          numOfWorkers++;
          getNextTask();
        } else if (numOfWorkers === 0 && taskIndex === tasks.length) {
          complete();
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