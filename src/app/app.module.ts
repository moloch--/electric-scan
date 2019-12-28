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


import 'reflect-metadata';
import '../polyfills';

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { SharedModule } from './shared/shared.module';
import { AppRoutingModule } from './app-routing.module';
import { BaseMaterialModule } from './base-material';
import { ScanModule } from './modules/scan/scan.module';
import { ScanModuleRouting } from './modules/scan/scan.routes';

import { IPCService } from './providers/ipc.service';
import { FileSystemService } from './providers/filesystem.service';
import { ScannerService } from './providers/scanner.service';

import { AppComponent } from './app.component';
import { TopMenuComponent } from './components/top-menu/top-menu.component';
import { SettingsComponent } from './components/settings/settings.component';


@NgModule({
  declarations: [

    // Components
    AppComponent,
    TopMenuComponent,

    SettingsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    BaseMaterialModule,

    // Routes
    AppRoutingModule,
    ScanModuleRouting,

    // Modules
    ScanModule,
    SharedModule,
  ],
  providers: [IPCService, FileSystemService, ScannerService],
  bootstrap: [AppComponent]
})
export class AppModule {}
