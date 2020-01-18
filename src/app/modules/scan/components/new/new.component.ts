import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ScannerService } from '@app/providers/scanner.service';
import { FadeInOut } from '@app/shared/animations';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { debounce } from 'rxjs/operators';


@Component({
  selector: 'app-new',
  templateUrl: './new.component.html',
  styleUrls: ['./new.component.scss'],
  animations: [FadeInOut]
})
export class NewComponent implements OnInit {

  numberOfTargets = 0;
  startScanForm: FormGroup;
  starting = false;
  countingTargets = false;
  worker: Worker;

  constructor(private _fb: FormBuilder,
              private _router: Router,
              private _snackBar: MatSnackBar,
              private _scannerService: ScannerService) { }

  ngOnInit() {

    this.worker = new Worker('./parsetargets.worker', { type: 'module' });

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
      timeout: ['15', Validators.compose([
        Validators.required,
      ])],
      margin: ['50', Validators.compose([
        Validators.required,
      ])],
    });

    this.startScanForm.get('targets').valueChanges.pipe(
      debounce(() => interval(300))
    ).subscribe(async (rawTargets: string) => {
      this.numberOfTargets = (await this.parseTargets(rawTargets)).length;
    });
  }

  async startScan() {
    this.starting = true;
    const name = this.startScanForm.controls['name'].value;
    const workers = Number(this.startScanForm.controls['workers'].value);
    const width = Number(this.startScanForm.controls['width'].value);
    const height = Number(this.startScanForm.controls['height'].value);
    const timeout = Number(this.startScanForm.controls['timeout'].value) * 1000;
    const margin = Number(this.startScanForm.controls['margin'].value);
    const targets = await this.parseTargets(this.startScanForm.controls['targets'].value);
    const scan = await this._scannerService.startScan(name, targets, workers, width, height, timeout, margin);
    this._router.navigate(['/scan', 'view', scan['id']]);
  }
  
  async parseTargets(rawTargets: string): Promise<string[]> {
    this.countingTargets = true;
    return new Promise((resolve) => {
      this.worker.onmessage = ({ data }) => {
        this.countingTargets = false;
        resolve((<string[]> data.targets));
        if (data.errors.length) {
          this._snackBar.open(data.errors[0].message, 'Dismiss');
        }
      };
      this.worker.postMessage(rawTargets);
    });
  }

}
