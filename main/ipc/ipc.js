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
exports.startIPCHandlers = void 0;
const electron_1 = require("electron");
const electric_handlers_1 = require("./electric-handlers");
const client_handlers_1 = require("./client-handlers");
const IPC_HANDLERS = [electric_handlers_1.ElectricHandlers, client_handlers_1.ClientHandlers];
// IPC handlers must start with "namespace_" this helps ensure we do not inadvertently
// expose methods that we don't want exposed to the sandboxed code.
const prefixWhitelist = ['fs_', 'client_', 'electric_'];
function dispatchIPC(method, data) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`IPC Dispatch: ${method}`);
        if (prefixWhitelist.some(prefix => method.startsWith(prefix))) {
            for (let handlers of IPC_HANDLERS) {
                if (typeof handlers[method] === 'function') {
                    const result = yield handlers[method](data);
                    return result;
                }
            }
            return Promise.reject(`No handler for method: ${method}`);
        }
        else {
            return Promise.reject(`Invalid method handler namespace for "${method}"`);
        }
    });
}
function startIPCHandlers(window) {
    electron_1.ipcMain.on('ipc', (event, msg) => __awaiter(this, void 0, void 0, function* () {
        dispatchIPC(msg.method, msg.data).then((result) => {
            if (msg.id !== 0) {
                event.sender.send('ipc', {
                    id: msg.id,
                    type: 'response',
                    method: 'success',
                    data: result
                });
            }
        }).catch((err) => {
            console.error(`[startIPCHandlers] ${err}`);
            if (msg.id !== 0) {
                event.sender.send('ipc', {
                    id: msg.id,
                    type: 'response',
                    method: 'error',
                    data: err.toString()
                });
            }
        });
    }));
    // This one doesn't have an event argument for some reason ...
    electron_1.ipcMain.on('push', (event) => __awaiter(this, void 0, void 0, function* () {
        window.webContents.send('ipc', {
            id: 0,
            type: 'push',
            method: '',
            data: event
        });
    }));
}
exports.startIPCHandlers = startIPCHandlers;
//# sourceMappingURL=ipc.js.map