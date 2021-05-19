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
exports.ClientHandlers = void 0;
const electron_1 = require("electron");
const os_1 = require("os");
const electron_2 = require("electron");
const fs = require("fs");
const path = require("path");
const jsonschema_1 = require("./jsonschema");
const constants_1 = require("./constants");
class ClientHandlers {
    static client_exit() {
        process.on('unhandledRejection', () => { }); // STFU Node
        process.exit(0);
    }
    static client_systemPreferences(_) {
        return __awaiter(this, void 0, void 0, function* () {
            return JSON.stringify({
                darkMode: electron_1.nativeTheme.shouldUseDarkColors,
            });
        });
    }
    static client_openUrl(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const openUrlReq = JSON.parse(req);
                const url = new URL(openUrlReq.url);
                if (["http:", "https:"].some(proto => proto === url.protocol)) {
                    console.log(`[open url] ${url.toString()}`);
                    electron_2.shell.openExternal(url.toString());
                }
                return url.toString();
            }
            catch (err) {
                console.error(err);
                return Promise.reject(`Failed to open url: ${req}`);
            }
        });
    }
    static client_openScanFolder(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const openScanReq = JSON.parse(req);
                const scanId = path.basename(openScanReq.scanId);
                const scanPath = path.join(constants_1.SCANS_DIR, scanId);
                if (fs.existsSync(scanPath)) {
                    electron_2.shell.showItemInFolder(scanPath);
                }
                return scanId;
            }
            catch (err) {
                console.error(err);
                return Promise.reject(`Failed to open scan folder: ${req}`);
            }
        });
    }
    static client_saveImageAs(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const saveImageReq = JSON.parse(req);
                const scanId = path.basename(saveImageReq.scanId);
                const resultId = path.basename(saveImageReq.resultId);
                const src = path.join(constants_1.SCANS_DIR, scanId, `${resultId}.png`);
                if (fs.existsSync(src)) {
                    const dialogOptions = {
                        title: 'Save Image As ...',
                        message: 'Save screenshot file',
                        defaultPath: path.join(os_1.homedir(), 'Desktop', 'Untitled.png'),
                        properties: ['createDirectory', 'showHiddenFiles', 'showOverwriteConfirmation']
                    };
                    const dst = yield electron_1.dialog.showSaveDialog(dialogOptions);
                    if (!dst.canceled) {
                        console.log(`[save image] ${dst.filePath}`);
                        fs.copyFile(src, dst.filePath, (err) => { err ? console.error(err) : null; });
                    }
                    return JSON.stringify({ success: true });
                }
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
    }
    static client_saveAllAs(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const saveAllReq = JSON.parse(req);
                const scanId = path.basename(saveAllReq.scanId);
                const srcDir = path.join(constants_1.SCANS_DIR, scanId);
                if (fs.existsSync(srcDir)) {
                    const dialogOptions = {
                        title: 'Save All As ...',
                        message: 'Save all screenshots',
                        defaultPath: path.join(os_1.homedir(), 'Desktop'),
                        properties: ['createDirectory', 'showHiddenFiles', 'showOverwriteConfirmation']
                    };
                    const dstDir = yield electron_1.dialog.showSaveDialog(dialogOptions);
                    if (!dstDir.canceled) {
                        if (!fs.existsSync(dstDir.filePath)) {
                            fs.mkdirSync(dstDir.filePath, { mode: 0o700 });
                        }
                        const ls = yield ClientHandlers.lsDir(srcDir);
                        const pngs = ls.filter(filename => filename.endsWith('.png'));
                        for (let index = 0; index < pngs.length; ++index) {
                            const src = path.join(srcDir, pngs[index]);
                            const dst = path.join(dstDir.filePath, pngs[index]);
                            console.log(`[save all] ${src} -> ${dst}`);
                            fs.copyFile(src, dst, (err) => { err ? console.error(err) : null; });
                        }
                    }
                }
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
    }
    static lsDir(dir) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fs.readdir(dir, (err, nodes) => __awaiter(this, void 0, void 0, function* () {
                    err ? reject(err) : resolve(nodes);
                }));
            });
        });
    }
    static client_loadSettings(_) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                console.log(`[load settings] ${constants_1.SETTINGS_PATH}`);
                if (!fs.existsSync(constants_1.SETTINGS_PATH)) {
                    yield this.client_saveSettings(JSON.stringify({}));
                }
                fs.readFile(constants_1.SETTINGS_PATH, (err, data) => {
                    if (err) {
                        resolve(null);
                    }
                    else {
                        try {
                            resolve(data.toString());
                        }
                        catch (err) {
                            console.error(`[JSON Error]: ${err}`);
                            resolve(null);
                        }
                    }
                });
            }));
        });
    }
    static client_saveSettings(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                fs.writeFile(constants_1.SETTINGS_PATH, req, { mode: 0o600 }, (err) => {
                    err ? console.error(err) : null;
                });
                return req;
            }
            catch (err) {
                return Promise.reject('');
            }
        });
    }
}
__decorate([
    jsonschema_1.jsonSchema({
        "type": "object",
        "properties": {
            "url": { "type": "string", "minLength": 1, "maxLength": 2048 },
        },
        "required": ["url"]
    })
], ClientHandlers, "client_openUrl", null);
__decorate([
    jsonschema_1.jsonSchema({
        "type": "object",
        "properties": {
            "scanId": { "type": "string", "minLength": 1, "maxLength": 36 },
        },
        "required": ["scanId"]
    })
], ClientHandlers, "client_openScanFolder", null);
__decorate([
    jsonschema_1.jsonSchema({
        "type": "object",
        "properties": {
            "scanId": { "type": "string", "minLength": 1, "maxLength": 36 },
            "resultId": { "type": "string", "minLength": 1, "maxLength": 36 },
        },
        "required": ["scanId", "resultId"]
    })
], ClientHandlers, "client_saveImageAs", null);
__decorate([
    jsonschema_1.jsonSchema({
        "type": "object",
        "properties": {
            "scanId": { "type": "string", "minLength": 1, "maxLength": 36 },
        },
        "required": ["scanId"]
    })
], ClientHandlers, "client_saveAllAs", null);
__decorate([
    jsonschema_1.jsonSchema({
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
], ClientHandlers, "client_saveSettings", null);
exports.ClientHandlers = ClientHandlers;
//# sourceMappingURL=client-handlers.js.map