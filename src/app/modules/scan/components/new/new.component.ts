import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ScannerService } from '@app/providers/scanner.service';
import { FadeInOut } from '@app/shared/animations';
import { Router } from '@angular/router';


@Component({
  selector: 'app-new',
  templateUrl: './new.component.html',
  styleUrls: ['./new.component.scss'],
  animations: [FadeInOut]
})
export class NewComponent implements OnInit {

  startScanForm: FormGroup;
  starting = false;

  constructor(private _fb: FormBuilder,
              private _router: Router,
              private _scannerService: ScannerService) { }

  ngOnInit() {
    const defaultName = `${new Date().toLocaleString("en-US")}`;
    this.startScanForm = this._fb.group({
      name: [defaultName, Validators.compose([
        Validators.required,
      ])],
      targets: ['', Validators.compose([
        Validators.required,
      ])],

      workers: ['8', Validators.compose([
        Validators.required,
      ])],
      width: ['1920', Validators.compose([
        Validators.required,
      ])],
      height: ['1080', Validators.compose([
        Validators.required,
      ])],
      margin: ['50', Validators.compose([
        Validators.required,
      ])],
    });
  }

  async startScan() {
    this.starting = true;
    const name = this.startScanForm.controls['name'].value;
    const workers = Number(this.startScanForm.controls['workers'].value);
    const width = Number(this.startScanForm.controls['width'].value);
    const height = Number(this.startScanForm.controls['height'].value);
    const margin = Number(this.startScanForm.controls['margin'].value);
    const targets = this.parseTargets(this.startScanForm.controls['targets'].value);
    const scanId = await this._scannerService.electricScan(name, targets, workers, width, height, margin);
    this._router.navigate(['scan', 'view', scanId]);
  }
  
  parseTargets(rawTargets: string): string[] {
    return rawTargets.split('\n')
      .map(target => target.trim())
      .filter(t => t.length);
  }

}
