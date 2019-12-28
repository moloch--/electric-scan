import { Component, OnInit } from '@angular/core';
import { ScannerService } from '@app/providers/scanner.service';

@Component({
  selector: 'app-new',
  templateUrl: './new.component.html',
  styleUrls: ['./new.component.scss']
})
export class NewComponent implements OnInit {

  constructor(private _scannerService: ScannerService) { }

  ngOnInit() {
    console.log('starting scan...');
    this.startScan();
  }

  startScan() {
    this._scannerService.electricScan('test1', [
      'https://google.com/',
      'https://bishopfox.com/'
    ], 8, 1920, 1080, 50);
  }

}
