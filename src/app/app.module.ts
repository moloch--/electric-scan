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
import { HomeComponent } from './components/home/home.component';
import { TopMenuComponent } from './components/top-menu/top-menu.component';
import { SettingsComponent } from './components/settings/settings.component';


@NgModule({
  declarations: [

    // Components
    AppComponent,
    HomeComponent,
    TopMenuComponent,

    AppComponent,

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
