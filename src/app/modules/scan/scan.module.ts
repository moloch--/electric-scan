import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewComponent } from './components/new/new.component';
import { HistoryComponent } from './components/history/history.component';
import { ViewComponent } from './components/view/view.component';



@NgModule({
  declarations: [NewComponent, HistoryComponent, ViewComponent],
  imports: [
    CommonModule
  ]
})
export class ScanModule { }
