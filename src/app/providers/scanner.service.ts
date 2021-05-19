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
import * as base64 from 'base64-arraybuffer';

import { IPCService } from './ipc.service';
import { stringify } from 'querystring';


export interface ScanResult {
  id: string;
  target: string;
  error: string;
  dataUrl: string;
}

export interface Scan {
  id: string;
  name: string;
  results: ScanResult[];
  started: number;
  duration: number;
  width: number;
  height: number;
}

export interface Eyeball {
  custom404: string[];
  loginPage: string[];
  homePage: string[];
  oldLooking: string[];
}


// Basic LRU Cache to Avoid too much IPC
class LRUCache<T> {

  private _cache: Map<string, T> = new Map<string, T>();
  private _maxEntries: number = 100;

  get(key: string): T|null {
    const hasKey = this._cache.has(key);
    if (hasKey) {
      const entry = this._cache.get(key);
      this._cache.delete(key);
      this._cache.set(key, entry);
      return entry;
    } else {
      return null;
    }
  }

  put(key: string, value: T) {
    if (this._cache.size >= this._maxEntries) {
      const keyToDelete = this._cache.keys().next().value;
      this._cache.delete(keyToDelete);
    }
    this._cache.set(key, value);
  }

}


@Injectable({
  providedIn: 'root'
})
export class ScannerService {

  private _imageCache = new LRUCache<string>();
  private _scanCache = new LRUCache<Scan>();
  private _eyeballCache = new LRUCache<Eyeball>();
  // private _resemblesCache = new LRUCache<string>();

  scans$ = new Subject<Scan>();
  private _tfFiles: File[] = [];

  constructor(private _ipc: IPCService) { 
    this._ipc.ipcPush$.subscribe((scan: Scan) => {
      this.scans$.next(scan);
    });
  }

  async startScan(name: string, targets: string[], workers: number, width: number, 
                  height: number, timeout: number, margin: number): Promise<Object> {
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
    let scan: Scan = this._scanCache.get(scanId);
    if (scan !== null) {
      return scan;
    }
    const resp = await this._ipc.request('electric_metadata', JSON.stringify({
      scanId: scanId,
    }));
    try {
      scan = JSON.parse(resp);
      if (scan.duration !== -1) {
        this._scanCache.put(scanId, scan);  // Only cache completed scans
      }
      return scan;
    } catch (err) {
      console.error(`Error parsing GetScan response: ${resp}`);
      console.error(err);
    }
  }

  async getDataUrl(scanId: string, resultId: string): Promise<string> {
    let dataUrl = this._imageCache.get(resultId);
    if (dataUrl !== null) {
      return dataUrl;
    }
    const resp = await this._ipc.request('electric_getDataUrl', JSON.stringify({
      scanId: scanId,
      resultId: resultId,
    }));
    try {
      dataUrl = JSON.parse(resp).dataUrl;
      this._imageCache.put(resultId, dataUrl);
      return dataUrl;
    } catch (err) {
      console.error(`Error parsing getDataUrl response: ${resp}`);
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
      scanId: scanId,
    }));
    try {
      return JSON.parse(resp).scan;
    } catch (err) {
      console.error('Error parsing ListScans response');
      console.error(err);
    }
  }

  async tfFiles(noCache: Boolean = false): Promise<File[]> {
    try {
      if (this._tfFiles.length < 1 || noCache) {
        this._tfFiles = [];
        let resp = await fetch('/assets/tf/model.json');
        const manifest = await resp.json();
        const modelPaths: string[] = Array.from(manifest.weightsManifest[0].paths);
        resp = await fetch('/assets/tf/model.json');
        const blob = await resp.blob();
        this._tfFiles.push(new File([blob], 'model.json'));
        await Promise.all(modelPaths.map(async (modelPath: string) => {
          const tfFile = await this.fetchTfFile(modelPath);
          this._tfFiles.push(tfFile);
        }));
      }
      return this._tfFiles;
    } catch (err) {
      console.error('Error loading tf files');
      console.error(err);
    }
  }

  private async fetchTfFile(name: string): Promise<File> {
    const base = name.split('/').reverse()[0];
    const resp = await fetch(`/assets/tf/${base}`);
    const blob = await resp.blob();
    return new File([blob], base);
  }

  async getEyeball(scanId: string): Promise<Eyeball|null> {
    let eyeball: Eyeball = this._eyeballCache.get(scanId);
    if (eyeball !== null) {
      return eyeball;
    }
    try {
      const resp = await this._ipc.request('electric_getEyeball', JSON.stringify({
        scanId: scanId,
      }));
      if (resp) {
        eyeball = JSON.parse(resp);
        this._eyeballCache.put(scanId, eyeball);
        return eyeball;
      } else {
        return null;
      }
    } catch(err) {
      console.error(err);
      return null;
    }
  }

  async saveEyeball(scanId: string, eyeball: Eyeball): Promise<void> {
    await this._ipc.request('electric_saveEyeball', JSON.stringify({
      scanId: scanId,
      eyeball: eyeball
    }));
  }

}
