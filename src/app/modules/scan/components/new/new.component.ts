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
      timeout: ['15', Validators.compose([
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
    const timeout = Number(this.startScanForm.controls['timeout'].value) * 1000;
    const margin = Number(this.startScanForm.controls['margin'].value);
    const targets = this.parseTargets(this.startScanForm.controls['targets'].value);
    const scan = await this._scannerService.StartScan(name, targets, workers, width, height, timeout, margin);
    this._router.navigate(['scan', 'view', scan['id']]);
  }
  
  parseTargets(rawTargets: string): string[] {
    const targets = rawTargets.split('\n')
      .map(target => target.trim())
      .map(target => target.toLowerCase())
      .filter(t => t.length);
    // Check to see if everything has "http:" or "https:" prefix since
    // an HTTP 302 -> https: is probably a thing we default to http:
    for (let index = 0; index < targets.length; ++index) {
      if (!['https:', 'http:'].some(p => targets[index].startsWith(p))) {
        targets[index] = `http://${targets[index]}`;
      }
    }
    return targets;
  }

}
