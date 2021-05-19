"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectricScanner = void 0;
const electron_1 = require("electron");
const rxjs_1 = require("rxjs");
const uuid = require("uuid/v4");
const fs = require("fs");
const path = require("path");
const writeFileAtomic = require("write-file-atomic");
class ElectricScanner {
    constructor(settings, maxNumOfWorkers = 8) {
        this.settings = settings;
        this.maxNumOfWorkers = maxNumOfWorkers;
        this.width = 1920;
        this.height = 1080;
        this.timeout = 10000;
        this.margin = 100;
    }
    unique(targets) {
        targets = targets.map(t => t.trim()).filter(t => t.length);
        return targets.filter((elem, index, self) => {
            return index === self.indexOf(elem);
        });
    }
    start(parentDir, name, targets) {
        return __awaiter(this, void 0, void 0, function* () {
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
            console.log(`Starting new scan with id ${this.scan.id}`);
            console.log(`Max number of workers: ${this.maxNumOfWorkers}`);
            this._scanDir = path.join(parentDir, this.scan.id);
            if (!fs.existsSync(this._scanDir)) {
                fs.mkdirSync(this._scanDir, { mode: 0o700, recursive: true });
                console.log(`Created scan directory: ${this._scanDir}`);
            }
            this.scan$ = new rxjs_1.BehaviorSubject(this.scan);
            yield this.saveMetadata();
            setImmediate(() => __awaiter(this, void 0, void 0, function* () {
                console.log(`Scanning ${tasks.length} target(s) ...`);
                yield this.executeQueue(tasks);
                this.scan.duration = new Date().getTime() - this._started.getTime();
                console.log(`Scan completed: ${this.scan.duration}`);
                yield this.saveMetadata();
                this.scan$.complete();
            }));
            return this.scan$;
        });
    }
    saveMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const metaPath = path.join(this._scanDir, 'metadata.json');
                const data = JSON.stringify(this.scan);
                writeFileAtomic(metaPath, data, { mode: 0o600 }, (err) => {
                    err ? reject(err) : resolve();
                    this.scan$.next(this.scan);
                });
            });
        });
    }
    executeQueue(tasks) {
        let numOfWorkers = 0;
        let taskIndex = 0;
        return new Promise((complete) => {
            const handleResult = (index, screenshot) => __awaiter(this, void 0, void 0, function* () {
                console.log(`handleResult() for ${index} - ${screenshot.target}`);
                const resultId = uuid().toString();
                if (screenshot.image) {
                    const filePNG = path.join(this._scanDir, `${resultId}.png`);
                    const imageData = screenshot.image ? screenshot.image.toPNG() : Buffer.from('');
                    fs.writeFile(filePNG, imageData, { mode: 0o600, encoding: null }, (err) => {
                        err ? console.error(err) : null;
                    });
                    const fileData = path.join(this._scanDir, `${resultId}.data`);
                    const dataUrl = screenshot.image ? screenshot.image.toDataURL() : '';
                    fs.writeFile(fileData, dataUrl, { mode: 0o600, encoding: 'utf8' }, (err) => {
                        err ? console.error(err) : null;
                    });
                }
                this.scan.results[index] = {
                    id: resultId,
                    target: screenshot.target,
                    error: screenshot.error,
                };
                yield this.saveMetadata();
                numOfWorkers--;
                getNextTask();
            });
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
                }
                else if (numOfWorkers === 0 && taskIndex === tasks.length) {
                    complete(null);
                }
            };
            getNextTask();
        });
    }
    capture(target) {
        return __awaiter(this, void 0, void 0, function* () {
            const targetURL = new URL(target);
            // console.log(`Screenshot: ${targetURL.toString()}`);
            if (targetURL.protocol !== 'http:' && targetURL.protocol !== 'https:') {
                return Promise.reject({
                    target: targetURL.toString(),
                    image: null,
                    error: `Invalid protocol '${targetURL.protocol}'`
                });
            }
            let scanWindow = yield this.createScanWindow(this.width, this.height);
            scanWindow.on('closed', () => {
                scanWindow = null;
            });
            let result;
            try {
                const image = yield this.screenshot(scanWindow, targetURL);
                result = {
                    target: targetURL.toString(),
                    image: image,
                    error: image.isEmpty() ? 'No result' : '',
                };
            }
            catch (err) {
                result = {
                    target: targetURL.toString(),
                    image: null,
                    error: err.code,
                };
            }
            finally {
                scanWindow.close();
            }
            return result;
        });
    }
    screenshot(scanWindow, targetURL) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const timeoutErr = setTimeout(() => {
                reject({ code: 'ERR_REQUEST_TIMEOUT' });
            }, this.timeout);
            try {
                yield scanWindow.loadURL(targetURL.toString());
                console.log(`did-finish-load: ${targetURL.toString()}`);
                clearTimeout(timeoutErr);
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const image = yield scanWindow.capturePage();
                        resolve(image);
                    }
                    catch (err) {
                        reject(err);
                    }
                }), this.margin);
            }
            catch (err) {
                reject(err);
            }
        }));
    }
    createScanWindow(width, height) {
        return __awaiter(this, void 0, void 0, function* () {
            const window = new electron_1.BrowserWindow({
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
            yield this.configureSession(window.webContents.session);
            return window;
        });
    }
    configureSession(session) {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield session.setProxy({
                pacScript: null,
                proxyRules: this.proxyRules(),
                proxyBypassRules: null
            });
        });
    }
    proxyRules() {
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
exports.ElectricScanner = ElectricScanner;
//# sourceMappingURL=scanner.js.map