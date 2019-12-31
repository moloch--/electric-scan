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
import { Subject } from 'rxjs';

import { IPCService } from './ipc.service';


export interface ScanResult {
  id: string;
  target: string;
  error: string;
}

export interface Scan {
  id: string;
  name: string;
  results: ScanResult[];
  started: number;
  duration: number;
}


@Injectable({
  providedIn: 'root'
})
export class ScannerService {

  scans$ = new Subject<Scan>();

  constructor(private _ipc: IPCService) { 
    this._ipc.ipcPush$.subscribe((scan: Scan) => {
      this.scans$.next(scan);
    });
  }

  async startScan(name: string, targets: string[], workers: number, width: number, height: number, timeout: number, margin: number): Promise<Object> {
    const resp = await this._ipc.request(`electric_scan`, JSON.stringify({
      name: name,
      width: width,
      height: height,
      timeout: timeout,
      margin: margin,
      targets: targets,
      maxWorkers: workers,
    }));
    try {
      return JSON.parse(resp);
    } catch (err) {
      console.error('Error parsing StartScan response');
      console.error(err);
    }
  }

  async getScan(scanId: string): Promise<Scan> {
    const resp = await this._ipc.request('electric_metadata', JSON.stringify({
      id: scanId,
    }));
    try {
      return JSON.parse(resp);
    } catch (err) {
      console.error(`Error parsing GetScan response: ${resp}`);
      console.error(err);
    }
  }

  async listScans(): Promise<Scan[]> {
    const resp = await this._ipc.request('electric_list', '');
    try {
      return JSON.parse(resp).scans;
    } catch (err) {
      console.error('Error parsing ListScans response');
      console.error(err);
    }
  }

  async rmScan(scanId: string) {
    const resp = await this._ipc.request('electric_rmScan', JSON.stringify({
      scan: scanId,
    }));
    try {
      return JSON.parse(resp).scan;
    } catch (err) {
      console.error('Error parsing ListScans response');
      console.error(err);
    }
  }

}