import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { BaseMaterialModule } from '@app/base-material';

import { NewComponent } from './components/new/new.component';
import { HistoryComponent } from './components/history/history.component';
import { ViewComponent } from './components/view/view.component';

import { ScanUrlPipe, DatePipe } from './scan.pipes';


@NgModule({
  declarations: [
    NewComponent,
    HistoryComponent,
    ViewComponent, 
    ScanUrlPipe,
    DatePipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BaseMaterialModule,
    BrowserAnimationsModule
  ]
})
export class ScanModule { }
