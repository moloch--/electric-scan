import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import * as tf from '@tensorflow/tfjs';

import { ScannerService, Scan, ScanResult } from '@app/providers/scanner.service';
import { ClientService } from '@app/providers/client.service';
import { FadeInOut } from '@app/shared/animations';
import { ContextMenuComponent } from '../../view.component';


export interface EyeballClassification {
  custom404: ScanResult[];
  loginPage: ScanResult[];
  homePage: ScanResult[];
  oldLooking: ScanResult[];
}

@Component({
  selector: 'app-eyeball',
  templateUrl: './eyeball.component.html',
  styleUrls: ['./eyeball.component.scss'],
  animations: [FadeInOut]
})
export class EyeballComponent extends ContextMenuComponent implements OnInit {

  readonly CUSTOM_404 = 'Custom 404';
  readonly LOGIN_PAGE = 'Login Page';
  readonly HOMEPAGE = 'Homepage';
  readonly OLD_LOOKING = 'Old Looking';

  scan: Scan;
  scanResults = new Map<string, ScanResult>();
  images = new Map<string, string>();
  imagesCompleted = false;
  eyeballing = false;
  eyeballCompleted = false;
  confidence = 0.6;

  classifications: EyeballClassification = {
    custom404: [],
    loginPage: [],
    homePage: [],
    oldLooking: [],
  };

  constructor(public dialog: MatDialog,
              public clientService: ClientService,
              private _route: ActivatedRoute,
              private _scannerService: ScannerService) {
                super(dialog, clientService);
              }

  ngOnInit() {
    this._route.parent.params.subscribe(async (params) => {
      this.scan = await this._scannerService.getScan(params['scan-id']);
      await Promise.all(this.scan.results
        .filter((result: ScanResult) => result.error === '')
        .map(async (result: ScanResult) => {
          const img = await this._scannerService.getDataUrl(this.scan.id, result.id);
          this.images.set(result.id, img);
          this.scanResults.set(result.id, result);
      }));
      this.imagesCompleted = true;
      this.eyeballScan();
    });
  }

  async eyeballScan(): Promise<void> {
    console.log('eyeballing ...');
    this.eyeballing = true;
    const tfFiles = await this._scannerService.tfFiles();
    const model = await tf.loadLayersModel(tf.io.browserFiles(tfFiles));
    const offset = tf.scalar(127.5);
    const keys = Array.from(this.images.keys());
    for (let index = 0; index < keys.length; ++index) {
      const key = keys[index];
      console.log(`classifying: ${key}`);
      const img = new Image();
      img.src = this.images.get(key);
      img.height = this.scan.height;
      img.width = this.scan.width;
      const tensor = tf.browser.fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .sub(offset)
        .div(offset)
        .expandDims();
      const predictions = (<tf.Tensor<tf.Rank>> model.predict(tensor)).dataSync();
      console.log(`${typeof predictions} - ${predictions}`);
      if (predictions[0] > this.confidence) {
        console.log(`Custom 404: ${key}`);
        this.classifications.custom404.push(this.scanResults.get(key));
      }
      if (predictions[1] > this.confidence) {
        console.log(`Login Page: ${key}`);
        this.classifications.loginPage.push(this.scanResults.get(key));
      }
      if (predictions[2] > this.confidence) {
        console.log(`Homepage: ${key}`);
        this.classifications.homePage.push(this.scanResults.get(key));
      }
      if (predictions[3] > this.confidence) {
        console.log(`Old Looking: ${key}`);
        this.classifications.oldLooking.push(this.scanResults.get(key));
      }
    }

    console.log(this.classifications);
    this.eyeballing = false;
    this.eyeballCompleted = true;
  }

}
