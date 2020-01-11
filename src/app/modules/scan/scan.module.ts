import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

import { BaseMaterialModule } from '@app/base-material';
import { NewComponent } from './components/new/new.component';
import { HistoryComponent } from './components/history/history.component';
import { 
  ViewComponent, DetailsDialogComponent, OpenUrlDialogComponent
} from './components/view/view.component';
import { UrlTitlePipe, DatePipe, DataUrlPipe } from './scan.pipes';
import { EyeballComponent } from './components/eyeball/eyeball.component';


@NgModule({
  declarations: [
    NewComponent,
    HistoryComponent,
    ViewComponent, 
    DetailsDialogComponent,
    OpenUrlDialogComponent,

    UrlTitlePipe,
    DatePipe,
    DataUrlPipe,
    EyeballComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BaseMaterialModule,
    BrowserAnimationsModule,
    InfiniteScrollModule
  ],
  entryComponents: [
    DetailsDialogComponent,
    OpenUrlDialogComponent,
  ]
})
export class ScanModule { }
