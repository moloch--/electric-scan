import { Component, OnInit } from '@angular/core';
import { ScannerService } from '@app/providers/scanner.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {

  history: any;

  constructor(private _scannerService: ScannerService) { }

  ngOnInit() {
    this.fetch();
  }

  async fetch() {
    this.history = await this._scannerService.electricList();
    console.log(this.history);
  }

}
