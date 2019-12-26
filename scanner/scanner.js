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
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var uuid = require("uuid/v4");
var fs = require("fs");
var path = require("path");
var ElectricScanner = /** @class */ (function () {
    function ElectricScanner(maxNumOfWorkers) {
        if (maxNumOfWorkers === void 0) { maxNumOfWorkers = 8; }
        this.maxNumOfWorkers = maxNumOfWorkers;
    }
    ElectricScanner.prototype.unique = function (targets) {
        targets = targets.map(function (target) { return target.trim(); });
        return targets.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });
    };
    ElectricScanner.prototype.start = function (resultDir, targets) {
        return __awaiter(this, void 0, void 0, function () {
            var scan, startTime, scanDir, tasks, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        scan = {
                            id: uuid().toString(),
                            results: [],
                            duration: -1,
                        };
                        console.log("Starting new scan with id " + scan.id);
                        console.log("Max number of workers: " + this.maxNumOfWorkers);
                        startTime = new Date().getTime();
                        scanDir = path.join(resultDir, scan.id);
                        if (!fs.existsSync(scanDir)) {
                            fs.mkdirSync(scanDir, { mode: 448, recursive: true });
                            console.log("Created scan directory: " + scanDir);
                        }
                        tasks = this.unique(targets);
                        console.log("Scanning " + tasks.length + " target(s) ...");
                        _a = scan;
                        return [4 /*yield*/, this.executeQueue(scanDir, tasks)];
                    case 1:
                        _a.results = _b.sent();
                        scan.duration = new Date().getTime() - startTime;
                        console.log("Scan completed: " + scan.duration);
                        return [2 /*return*/, scan];
                }
            });
        });
    };
    ElectricScanner.prototype.executeQueue = function (scanDir, tasks) {
        var _this = this;
        var numOfWorkers = 0;
        var taskIndex = 0;
        var results = new Array(tasks.length);
        return new Promise(function (complete) {
            var handleResult = function (index, screenshot) {
                console.log("handleResult()");
                var taskId = uuid().toString();
                results[index] = {
                    id: taskId,
                    target: screenshot.target,
                    error: screenshot.error,
                };
                var data = JSON.stringify({
                    id: taskId,
                    target: screenshot.target,
                    image: screenshot.image ? screenshot.image.toDataURL() : '',
                    error: screenshot.error,
                });
                var filePath = path.join(scanDir, taskId + ".json");
                var filePNG = path.join(scanDir, taskId + ".png");
                console.log("Saving result for " + screenshot.target + " to " + filePath);
                fs.writeFile(filePath, data, { mode: 384, encoding: 'utf-8' }, console.error);
                var imageData = screenshot.image ? screenshot.image.toPNG() : new Buffer('');
                fs.writeFile(filePNG, imageData, { mode: 384, encoding: 'binary' }, console.error);
                numOfWorkers--;
                getNextTask();
            };
            var getNextTask = function () {
                console.log("getNextTask() - Task " + taskIndex + " of " + tasks.length + " - Workers: " + numOfWorkers + " (Max: " + _this.maxNumOfWorkers + ")");
                if (numOfWorkers < _this.maxNumOfWorkers && taskIndex < tasks.length) {
                    _this.capture(tasks[taskIndex]).then(function (result) {
                        handleResult(taskIndex, result); // Success
                    }).catch(function (result) {
                        handleResult(taskIndex, result); // Failure
                    });
                    taskIndex++;
                    numOfWorkers++;
                    getNextTask();
                }
                else if (numOfWorkers === 0 && taskIndex === tasks.length) {
                    console.log('All work has completed');
                    complete(results);
                }
            };
            getNextTask();
        });
    };
    ElectricScanner.prototype.capture = function (target, width, height, timeout, margin) {
        if (width === void 0) { width = 1920; }
        if (height === void 0) { height = 1080; }
        if (timeout === void 0) { timeout = 10000; }
        if (margin === void 0) { margin = 50; }
        return __awaiter(this, void 0, void 0, function () {
            var targetURL, scanWindow, image, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        targetURL = new URL(target);
                        console.log("Screen capture: " + targetURL.toString());
                        if (targetURL.protocol !== 'http:' && targetURL.protocol !== 'https:') {
                            return [2 /*return*/, Promise.reject({
                                    target: targetURL.toString(),
                                    image: null,
                                    error: "Invalid protocol: " + targetURL.protocol
                                })];
                        }
                        scanWindow = this.scanWindow(width, height);
                        scanWindow.on('closed', function () {
                            scanWindow = null;
                        });
                        scanWindow.loadURL(targetURL.toString());
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var timeoutErr = setTimeout(function () {
                                    scanWindow.close();
                                    reject('timeout');
                                }, timeout);
                                scanWindow.webContents.once('dom-ready', function () {
                                    console.log("DOM ready for " + targetURL.toString());
                                    clearTimeout(timeoutErr);
                                    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                        var image;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, scanWindow.capturePage()];
                                                case 1:
                                                    image = _a.sent();
                                                    scanWindow.close();
                                                    resolve(image);
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); }, margin);
                                });
                            })];
                    case 2:
                        image = _a.sent();
                        return [2 /*return*/, {
                                target: targetURL.toString(),
                                image: image,
                                error: '',
                            }];
                    case 3:
                        err_1 = _a.sent();
                        return [2 /*return*/, {
                                target: targetURL.toString(),
                                image: null,
                                error: err_1,
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ElectricScanner.prototype.scanWindow = function (width, height) {
        return new electron_1.BrowserWindow({
            width: width,
            height: height,
            show: true,
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
    };
    return ElectricScanner;
}());
exports.ElectricScanner = ElectricScanner;
//# sourceMappingURL=scanner.js.map