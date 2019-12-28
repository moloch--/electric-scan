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
  }

  startScan() {
    
  }

}
