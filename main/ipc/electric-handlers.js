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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.ElectricHandlers = void 0;
const electron_1 = require("electron");
const path = require("path");
const fs = require("fs");
const jsonschema_1 = require("./jsonschema");
const scanner_1 = require("../scanner");
const client_handlers_1 = require("./client-handlers");
const constants_1 = require("./constants");
const GUID = { "type": "string", "minLength": 36, "maxLength": 36 };
const ARRAY_OF_GUIDS = {
    "type": "array",
    "items": GUID,
    "additionalItems": false
};
class ElectricHandlers {
    static readMetadata(scanPath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const metaPath = path.join(scanPath, 'metadata.json');
                console.log(`[readMetadata] ${metaPath}`);
                fs.readFile(metaPath, (err, data) => {
                    if (err) {
                        resolve(null);
                    }
                    else {
                        try {
                            resolve(JSON.parse(data.toString()));
                        }
                        catch (err) {
                            console.error(`[JSON Error]: ${err}`);
                            resolve(null);
                        }
                    }
                });
            });
        });
    }
    static electric_list(_) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fs.readdir(constants_1.SCANS_DIR, (err, ls) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return reject(err);
                    }
                    const results = [];
                    for (let index = 0; index < ls.length; ++index) {
                        const scanId = ls[index];
                        if (scanId.startsWith('.')) {
                            continue;
                        }
                        const meta = yield ElectricHandlers.readMetadata(path.join(constants_1.SCANS_DIR, scanId));
                        meta ? results.push(meta) : null;
                    }
                    resolve(JSON.stringify({ scans: results }));
                }));
            });
        });
    }
    static electric_rmScan(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const scanId = path.basename(JSON.parse(req).scanId);
                const scanDir = path.join(constants_1.SCANS_DIR, scanId);
                if (fs.existsSync(scanDir)) {
                    // If we fail to remove a file the rmdir() will also fail,
                    // so just always resolve the unlink() promise
                    console.log(`[rm scan] ${scanDir}`);
                    const ls = yield client_handlers_1.ClientHandlers.lsDir(scanDir);
                    yield Promise.all(ls.map((filename) => {
                        return new Promise((resolve) => {
                            fs.unlink(path.join(scanDir, filename), resolve);
                        });
                    }));
                    fs.rmdir(scanDir, (err) => {
                        if (err) {
                            console.error(err);
                            reject(err);
                        }
                        else {
                            resolve(JSON.stringify({ scan: scanId }));
                        }
                    });
                }
            }));
        });
    }
    static electric_scan(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const scanReq = JSON.parse(req);
            const workers = scanReq.maxWorkers ? Math.abs(scanReq.maxWorkers || 1) : 8;
            const scanSettings = yield client_handlers_1.ClientHandlers.client_loadSettings('');
            let scanner = new scanner_1.ElectricScanner(JSON.parse(scanSettings), workers);
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
            let scan$ = yield scanner.start(constants_1.SCANS_DIR, scanReq.name, scanReq.targets);
            const subscription = scan$.subscribe((scan) => {
                electron_1.ipcMain.emit('push', JSON.stringify(scan));
            }, (err) => {
                console.error(`[scan error]: ${err}`);
            }, () => {
                // On Complete
                subscription.unsubscribe();
                scanner = null;
                scan$ = null;
            });
            return JSON.stringify({ id: scanner.scan.id });
        });
    }
    static electric_metadata(req) {
        const metaReq = JSON.parse(req);
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const meta = yield ElectricHandlers.readMetadata(path.join(constants_1.SCANS_DIR, metaReq.scanId));
            if (meta) {
                resolve(JSON.stringify(meta));
            }
            else {
                reject(`Scan '${metaReq.scanId}' does not exist`);
            }
        }));
    }
    static electric_getDataUrl(req) {
        try {
            const dataUrlReq = JSON.parse(req);
            const scanId = path.basename(dataUrlReq.scanId);
            const resultId = path.basename(dataUrlReq.resultId);
            return new Promise((resolve, reject) => {
                const dataPath = path.join(constants_1.SCANS_DIR, scanId, `${resultId}.data`);
                fs.readFile(dataPath, { encoding: 'utf8' }, (err, data) => {
                    err ? reject(err) : resolve(JSON.stringify({ dataUrl: data }));
                });
            });
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    static electric_getEyeball(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const scanId = path.basename(JSON.parse(req).scanId);
                const eyeballPath = path.join(constants_1.SCANS_DIR, scanId, constants_1.EYEBALL_FILE);
                fs.readFile(eyeballPath, { encoding: 'utf8' }, (err, data) => {
                    err ? reject(err) : resolve(data);
                });
            });
        });
    }
    static electric_saveEyeball(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const saveReq = JSON.parse(req);
            const scanId = path.basename(saveReq.scanId);
            const eyeballPath = path.join(constants_1.SCANS_DIR, scanId, constants_1.EYEBALL_FILE);
            const data = JSON.stringify(saveReq.eyeball);
            fs.writeFile(eyeballPath, data, { mode: 0o600 }, (err) => {
                err ? console.error(err) : null;
            });
            return '';
        });
    }
}
__decorate([
    jsonschema_1.jsonSchema({
        "type": "object",
        "properties": {
            "scanId": GUID,
        },
        "required": ["scanId"]
    })
], ElectricHandlers, "electric_rmScan", null);
__decorate([
    jsonschema_1.jsonSchema({
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
            "width": { "type": "number" },
            "height": { "type": "number" },
            "margin": { "type": "number" },
            "timeout": { "type": "number" },
        },
        "required": ["name", "targets"]
    })
], ElectricHandlers, "electric_scan", null);
__decorate([
    jsonschema_1.jsonSchema({
        "type": "object",
        "properties": {
            "scanId": GUID,
        },
        "required": ["scanId"],
    })
], ElectricHandlers, "electric_metadata", null);
__decorate([
    jsonschema_1.jsonSchema({
        "type": "object",
        "properties": {
            "scanId": GUID,
            "resultId": GUID,
        },
        "required": ["scanId", "resultId"]
    })
], ElectricHandlers, "electric_getDataUrl", null);
__decorate([
    jsonschema_1.jsonSchema({
        "type": "object",
        "properties": {
            "scanId": GUID,
        },
        "required": ["scanId"]
    })
], ElectricHandlers, "electric_getEyeball", null);
__decorate([
    jsonschema_1.jsonSchema({
        "type": "object",
        "properties": {
            "scanId": GUID,
            "eyeball": {
                "type": "object",
                "properties": {
                    "custom404": ARRAY_OF_GUIDS,
                    "loginPage": ARRAY_OF_GUIDS,
                    "homePage": ARRAY_OF_GUIDS,
                    "oldLooking": ARRAY_OF_GUIDS,
                },
                "additionalItems": false,
            },
        },
        "required": ["scanId", "eyeball"]
    })
], ElectricHandlers, "electric_saveEyeball", null);
exports.ElectricHandlers = ElectricHandlers;
//# sourceMappingURL=electric-handlers.js.map