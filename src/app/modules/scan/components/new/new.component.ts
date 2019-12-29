import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ValidationErrors } from '@angular/forms';
import { ScannerService } from '@app/providers/scanner.service';
import { FadeInOut } from '@app/shared/animations';


@Component({
  selector: 'app-new',
  templateUrl: './new.component.html',
  styleUrls: ['./new.component.scss'],
  animations: [FadeInOut]
})
export class NewComponent implements OnInit {

  startScanForm: FormGroup;

  constructor(private _fb: FormBuilder,
              private _scannerService: ScannerService) { }

  ngOnInit() {
    this.startScanForm = this._fb.group({
      name: ['', Validators.compose([
        Validators.required,
      ])],
      targets: ['', Validators.compose([
        Validators.required,
      ])],
    });
  }

  async startScan() {
    const scanId = await this._scannerService.electricScan('test1', [
      'https://google.com/',
      'https://bishopfox.com/'
    ], 8, 1920, 1080, 50);
    console.log(scanId);
  }

}
