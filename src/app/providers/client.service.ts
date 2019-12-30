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

import { Injectable } from '@angular/core';

import { IPCService } from './ipc.service';


@Injectable({
  providedIn: 'root'
})
export class ClientService {

  constructor(private _ipc: IPCService) { }

  async exit(): Promise<void> {
    this._ipc.request('client_exit', '');
  }

  async openUrl(url: string): Promise<void> {
    this._ipc.request('client_openUrl', JSON.stringify({ url: url }));
  }

  async openScanFolder(scanId: string): Promise<void> {
    this._ipc.request('client_openScanFolder', JSON.stringify({ scan: scanId }));
  }

  async saveImageAs(scanId: string, resultId: string): Promise<boolean> {
    const save = await this._ipc.request('client_saveImageAs', JSON.stringify({ 
        scan: scanId,
        result: resultId,
    }));
    return JSON.parse(save).success ? true : false; 
  }

  async saveAllAs(scanId: string): Promise<boolean> {
    const save = await this._ipc.request('client_saveAllAs', JSON.stringify({ 
        scan: scanId,
    }));
    return JSON.parse(save).success ? true : false; 
  }

}