import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { IPCService } from './ipc.service';


export interface Settings {

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

export interface SystemPreferences {
  darkMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor(private _ipc: IPCService) { }

  async load(): Promise<Settings> {
    const settings = await this._ipc.request('client_loadSettings', '');
    console.log(`[SettingsService] Load: ${settings}`);
    return JSON.parse(settings);
  }

  async save(settings: Settings): Promise<Settings> {
    const data = JSON.stringify(settings);
    const updated = await this._ipc.request('client_saveSettings', data);
    console.log(`[SettingsService] Load: ${updated}`);
    return JSON.parse(updated);
  }

  async loadSystemPreferences(): Promise<SystemPreferences> {
    const data = await this._ipc.request('client_systemPreferences', '');
    return JSON.parse(data);
  }

}
