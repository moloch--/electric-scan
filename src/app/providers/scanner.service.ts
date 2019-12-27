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
import { stringify } from 'querystring';


@Injectable({
  providedIn: 'root'
})
export class ScannerService {

  constructor(private _ipc: IPCService) { }

  async electricScan(name: string, targets: string[]): Promise<string> {
    const resp = await this._ipc.request(`electric_scan`, JSON.stringify({
      name: stringify,
      targets: targets,
    }));
    return resp;
  }

}