import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';

import { BaseMaterialModule } from '@app/base-material';
import { NewComponent } from './components/new/new.component';
import { HistoryComponent } from './components/history/history.component';
import { 
  ViewComponent, DetailsDialogComponent, OpenUrlDialogComponent, ContextMenuComponent
} from './components/view/view.component';
import { UrlTitlePipe, DatePipe, DataUrlPipe } from './scan.pipes';
import { EyeballComponent } from './components/view/children/eyeball/eyeball.component';
import { ResemblesComponent } from './components/view/children/resembles/resembles.component';
import { AllComponent } from './components/view/children/all/all.component';


@NgModule({
  declarations: [
    NewComponent,
    HistoryComponent,
    ViewComponent, 
    DetailsDialogComponent,
    OpenUrlDialogComponent,
    ContextMenuComponent,
    EyeballComponent,
    ResemblesComponent,
    AllComponent,
    
    UrlTitlePipe,
    DatePipe,
    DataUrlPipe,
  ],
  imports: [
    CommonModule,
    RouterModule,
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
