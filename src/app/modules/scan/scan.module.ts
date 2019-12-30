import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

import { BaseMaterialModule } from '@app/base-material';
import { NewComponent } from './components/new/new.component';
import { HistoryComponent } from './components/history/history.component';
import { ViewComponent, DetailsDialogComponent } from './components/view/view.component';
import { ScanUrlPipe, UrlTitlePipe, DatePipe } from './scan.pipes';


@NgModule({
  declarations: [
    NewComponent,
    HistoryComponent,
    ViewComponent, 
    DetailsDialogComponent,

    ScanUrlPipe,
    UrlTitlePipe,
    DatePipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BaseMaterialModule,
    BrowserAnimationsModule,
    InfiniteScrollModule
  ],
  entryComponents: [DetailsDialogComponent]
})
export class ScanModule { }
