import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ScannerService } from '@app/providers/scanner.service';
import { FadeInOut } from '@app/shared/animations';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { debounce } from 'rxjs/operators';

const IPCIDR = require('ip-cidr');


@Component({
  selector: 'app-new',
  templateUrl: './new.component.html',
  styleUrls: ['./new.component.scss'],
  animations: [FadeInOut]
})
export class NewComponent implements OnInit {

  readonly MIN_MASK = 15;

  numberOfTargets = 0;
  startScanForm: FormGroup;
  starting = false;
  countingTargets = false;

  constructor(private _fb: FormBuilder,
              private _router: Router,
              private _snackBar: MatSnackBar,
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

    this.startScanForm.get('targets').valueChanges.pipe(
      debounce(() => interval(300))
    ).subscribe((rawTargets: string) => {
      this.countingTargets = true;
      this.numberOfTargets = this.parseTargets(rawTargets).length;
      this.countingTargets = false;
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
    const scan = await this._scannerService.startScan(name, targets, workers, width, height, timeout, margin);
    this._router.navigate(['/scan', 'view', scan['id']]);
  }
  
  parseTargets(rawTargets: string): string[] {
    
    const targets = rawTargets.split('\n')
      .map(target => target.trim())
      .map(target => target.toLowerCase())
      .filter(target => target.length);

    let allTargets: string[] = [];
    for (let index = 0; index < targets.length; ++index) {
      let target = targets[index];
      let targetUri: URL;
      if (target.startsWith('http://') || target.startsWith('https://')) {
        targetUri = new URL(target);
      } else {
        targetUri = new URL(`http://${target}`);
      }
      let targetCidr = `${targetUri.hostname}${targetUri.pathname}`;
      console.log(`check cidr: ${targetCidr} from '${targetUri}' (${target})`);
      const cidr = new IPCIDR(targetCidr);
      if (cidr.isValid()) {
        if (targetCidr.indexOf('/') === -1) {
          allTargets.push(target);  // Plain IP address, no mask
          continue;
        }
        const mask = Number(targetCidr.split('/')[1]);
        if (mask && this.MIN_MASK < mask) {
          let ips: string[] = cidr.toArray();
          ips = ips.map((ip) => { 
            targetUri.hostname = ip;
            return targetUri.toString();
          });
          allTargets = allTargets.concat(ips); 
        } else if (mask && mask <= this.MIN_MASK) {
          this._snackBar.open(`Network mask /${mask} is too large`, 'Dismiss');
        } else {
          this._snackBar.open(`Invalid network mask`, 'Dismiss');
        }
      } else {
        allTargets.push(targets[index]);
      }
    }

    // Check to see if everything has "http:" or "https:" prefix since
    // an HTTP 302 -> https: is probably a thing we default to http:
    for (let index = 0; index < allTargets.length; ++index) {
      if (allTargets[index].startsWith('http://') || allTargets[index].startsWith('https://')) {
        continue;
      }
      allTargets[index] = `http://${allTargets[index]}`;
    }
    allTargets = this.unique(allTargets);
    // console.log(allTargets);
    return allTargets;
  }

  unique(targets: string[]): string[] {
    return targets.filter((elem, index, self) => {
      return index === self.indexOf(elem);
    });
  }

}
