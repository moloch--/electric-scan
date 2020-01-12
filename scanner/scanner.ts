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

import { BrowserWindow, NativeImage, Session } from 'electron';
import { BehaviorSubject } from 'rxjs';
import * as uuid from 'uuid/v4';
import * as fs from 'fs';
import * as path from 'path';
import * as writeFileAtomic from 'write-file-atomic';


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
  width: number;
  height: number;
}

export interface ScannerSettings {
    /* Browser Settings */
    UserAgent: string;
    DisableTLSValidation: boolean;
  
    /* Proxy Settings */
    SOCKSProxyEnabled: boolean;
    SOCKSProxyHostname: string;
    SOCKSProxyPort: number;
  
    HTTPProxyEnabled: boolean;
    HTTPProxyHostname: string;
    HTTPProxyPort: number;
  
    HTTPSProxyEnabled: boolean;
    HTTPSProxyHostname: string;
    HTTPSProxyPort: number;
}

export class ElectricScanner {

  public width: number = 1920;
  public height: number = 1080;
  public timeout: number = 10000;
  public margin: number = 100;
  public scan$: BehaviorSubject<Scan>;
  public scan: Scan;

  private _scanDir: string;
  private _started: Date;

  constructor(private settings: ScannerSettings, private maxNumOfWorkers = 8) { }

  private unique(targets: string[]): string[] {
    targets = targets.map(t => t.trim()).filter(t => t.length);
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
      width: this.width,
      height: this.height,
    };
    console.log(`Starting new scan with id ${this.scan.id}`)
    console.log(`Max number of workers: ${this.maxNumOfWorkers}`);
    this._scanDir = path.join(parentDir, this.scan.id);
    if (!fs.existsSync(this._scanDir)) {
      fs.mkdirSync(this._scanDir, {mode: 0o700, recursive: true});
      console.log(`Created scan directory: ${this._scanDir}`);
    }
    this.scan$ = new BehaviorSubject(this.scan);
    await this.saveMetadata();
    setImmediate(async () => {
      console.log(`Scanning ${tasks.length} target(s) ...`);
      await this.executeQueue(tasks);
      this.scan.duration = new Date().getTime() - this._started.getTime();
      console.log(`Scan completed: ${this.scan.duration}`);
      await this.saveMetadata();
      this.scan$.complete();
    });
    return this.scan$;
  }

  private async saveMetadata(): Promise<void|NodeJS.ErrnoException> {
    return new Promise((resolve, reject) => {
      const metaPath = path.join(this._scanDir, 'metadata.json');
      const data = JSON.stringify(this.scan);
      writeFileAtomic(metaPath, data, {mode: 0o600}, (err: NodeJS.ErrnoException) => {
        err ? reject(err) : resolve();
        this.scan$.next(this.scan);
      });
    });
  }

  private executeQueue(tasks: string[]): Promise<null> {
    let numOfWorkers = 0;
    let taskIndex = 0;

    return new Promise((complete) => {

      const handleResult = async (index: number, screenshot: Screenshot) => {
        console.log(`handleResult() for ${index}`);
        const resultId = uuid().toString();
        if (screenshot.image) {
          const filePNG = path.join(this._scanDir, `${resultId}.png`);
          const imageData = screenshot.image ? screenshot.image.toPNG() : Buffer.from('');
          fs.writeFile(filePNG, imageData, {mode: 0o600, encoding: null}, (err: NodeJS.ErrnoException) => {
            err ? console.error(err) : null;
          });

          const fileData = path.join(this._scanDir, `${resultId}.data`);
          const dataUrl = screenshot.image ? screenshot.image.toDataURL() : '';
          fs.writeFile(fileData, dataUrl, {mode: 0o600, encoding: 'utf8'}, (err: NodeJS.ErrnoException) => {
            err ? console.error(err) : null;
          });
        }
        this.scan.results[index] = {
          id: resultId,
          target: screenshot.target,
          error: screenshot.error,
        };
        await this.saveMetadata();
        numOfWorkers--;
        getNextTask();
      };

      const getNextTask = () => {
        console.log(`Task ${taskIndex} of ${tasks.length} - Workers: ${numOfWorkers} (Max: ${this.maxNumOfWorkers})`);
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
    // console.log(`Screenshot: ${targetURL.toString()}`);
    if (targetURL.protocol !== 'http:' && targetURL.protocol !== 'https:') {
      return Promise.reject({
        target: targetURL.toString(),
        image: null,
        error: `Invalid protocol '${targetURL.protocol}'`
      });
    }
    let scanWindow = await this.createScanWindow(this.width, this.height);
    scanWindow.on('closed', () => {
      scanWindow = null;
    });
    
    let result: Screenshot;
    try {
      const image = await this.screenshot(scanWindow, targetURL);
      result = {
        target: targetURL.toString(),
        image: image,
        error: image.isEmpty() ? 'No result' : '',
      };
    } catch (err) {
      result = {
        target: targetURL.toString(),
        image: null,
        error: err.code,
      };
    } finally {
      scanWindow.close();
    }
    return result;
  }

  private screenshot(scanWindow: BrowserWindow, targetURL: URL): Promise<NativeImage> {
    return new Promise(async (resolve, reject) => {
      const timeoutErr = setTimeout(() => {
        reject({ code: 'ERR_REQUEST_TIMEOUT' });
      }, this.timeout);
      try {
        await scanWindow.loadURL(targetURL.toString());
        console.log(`did-finish-load: ${targetURL.toString()}`);
        clearTimeout(timeoutErr);
        setTimeout(async () => {
          try {
            const image = await scanWindow.capturePage();
            resolve(image);
          } catch(err) {
            reject(err);
          }
        }, this.margin);
      } catch (err) {
        reject(err);
      }
    });
  }

  private async createScanWindow(width: number, height: number): Promise<BrowserWindow> {
    const window = new BrowserWindow({
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
    window.webContents.setAudioMuted(true);
    window.webContents.session.on('will-download', (event) => {
      event.preventDefault();
    });
    await this.configureSession(window.webContents.session);
    return window;
  }

  private async configureSession(session: Session): Promise<void> {
    
    // User-agent
    if (this.settings.UserAgent && this.settings.UserAgent.length) {
      session.setUserAgent(this.settings.UserAgent);
    }

    // Disable TLS validation (0 = Accept Cert)
    if (this.settings.DisableTLSValidation) {
      session.setCertificateVerifyProc((_, callback) => {
        callback(0);
      });
    }

    // Proxy rules
    await session.setProxy({
      pacScript: null,
      proxyRules: this.proxyRules(),
      proxyBypassRules: null
    });
  }

  private proxyRules(): string {
    const proxyRules = [];
    if (this.settings.SOCKSProxyEnabled) {
      const socksProxy = new URL('socks5://');
      socksProxy.hostname = this.settings.SOCKSProxyHostname;
      socksProxy.port = this.settings.SOCKSProxyPort.toString();
      proxyRules.push(socksProxy.toString());
    }
    if (this.settings.HTTPProxyEnabled) {
      const httpProxy = `http=${this.settings.HTTPProxyHostname}:${this.settings.HTTPProxyPort}`;
      proxyRules.push(httpProxy);
    }
    if (this.settings.HTTPSProxyEnabled) {
      const httpsProxy = `https=${this.settings.HTTPSProxyHostname}:${this.settings.HTTPSProxyPort}`;
      proxyRules.push(httpsProxy);
    }
    const rules = proxyRules.join(';');
    if (proxyRules.length) {
      console.log(`[proxy rules] ${rules}`);
    }
    return rules;
  }

}