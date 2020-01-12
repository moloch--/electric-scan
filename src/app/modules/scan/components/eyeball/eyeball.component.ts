import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as tf from '@tensorflow/tfjs';

import { ScannerService, Scan, ScanResult } from '@app/providers/scanner.service';


export interface EyeballClassification {
  custom404: string[];
  loginPage: string[];
  homePage: string[];
  oldLooking: string[];
}


@Component({
  selector: 'app-eyeball',
  templateUrl: './eyeball.component.html',
  styleUrls: ['./eyeball.component.scss']
})
export class EyeballComponent implements OnInit {

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

  classifications: EyeballClassification = {
    custom404: [],
    loginPage: [],
    homePage: [],
    oldLooking: [],
  };

  constructor(private _route: ActivatedRoute,
              private _scannerService: ScannerService) { }

  ngOnInit() {
    this._route.params.subscribe(async (params) => {
      this.scan = await this._scannerService.getScan(params['scan-id']);
      console.log(this.scan);
      await Promise.all(this.scan.results
        .filter((result: ScanResult) => result.error === '')
        .map(async (result: ScanResult) => {
          const img = await this._scannerService.getDataUrl(this.scan.id, result.id);
          this.images.set(result.id, img);
          this.scanResults.set(result.id, result);
      }));
      this.imagesCompleted = true;
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
      if (predictions[0] > 0.5) {
        console.log(`Custom 404: ${key}`);
        this.classifications.custom404.push(key);
      }
      if (predictions[1] > 0.5) {
        console.log(`Login Page: ${key}`);
        this.classifications.loginPage.push(key);
      }
      if (predictions[2] > 0.5) {
        console.log(`Homepage: ${key}`);
        this.classifications.homePage.push(key);
      }
      if (predictions[3] > 0.5) {
        console.log(`Old Looking: ${key}`);
        this.classifications.oldLooking.push(key);
      }
    }

    console.log(this.classifications);
    this.eyeballing = false;
    this.eyeballCompleted = true;
  }

}
