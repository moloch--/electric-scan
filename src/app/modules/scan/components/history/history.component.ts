import { Component, OnInit } from '@angular/core';
import { ScannerService } from '@app/providers/scanner.service';
import { FadeInOut } from '@app/shared/animations';


@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
  animations: [FadeInOut]
})
export class HistoryComponent implements OnInit {

  history: any;

  constructor(private _scannerService: ScannerService) { }

  ngOnInit() {
    this.fetch();
  }

  async fetch() {
    this.history = await this._scannerService.ListScans();
    console.log(this.history);
  }

}
