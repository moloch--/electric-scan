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

import { IPCService } from './providers/ipc.service';
import { FileSystemService } from './providers/filesystem.service';
import { ScannerService } from './providers/scanner.service';

import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { TopMenuComponent } from './components/top-menu/top-menu.component';


@NgModule({
  declarations: [

    // Components
    AppComponent,
    HomeComponent,
    TopMenuComponent,

    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    BaseMaterialModule,

    ScanModule,

    SharedModule,
    AppRoutingModule,
  ],
  providers: [IPCService, FileSystemService, ScannerService],
  bootstrap: [AppComponent]
})
export class AppModule {}
