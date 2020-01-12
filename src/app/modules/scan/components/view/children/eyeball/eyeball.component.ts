import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as tf from '@tensorflow/tfjs';

import { ScannerService, Scan } from '@app/providers/scanner.service';


export interface EyeballClassification {
  CUSTOM_404: string[];
  LOGIN_PAGE: string[];
  HOMEPAGE: string[];
  OLD_LOOKING: string[];
}


@Component({
  selector: 'app-eyeball',
  templateUrl: './eyeball.component.html',
  styleUrls: ['./eyeball.component.scss']
})
export class EyeballComponent implements OnInit {

  readonly TF_RESOURCES: File[] = [];

  readonly CUSTOM_404 = 'Custom 404';
  readonly LOGIN_PAGE = 'Login Page';
  readonly HOMEPAGE = 'Homepage';
  readonly OLD_LOOKING = 'Old Looking';

  scan: Scan;
  images = new Map<string, string>();
  imagesCompleted = false;

  classifications: EyeballClassification = {
    CUSTOM_404: [],
    LOGIN_PAGE: [],
    HOMEPAGE: [],
    OLD_LOOKING: [],
  };

  constructor(private _route: ActivatedRoute,
              private _scannerService: ScannerService) { }

  ngOnInit() {
    this._route.params.subscribe(async (params) => {
      this.scan = await this._scannerService.getScan(params['scan-id']);
      console.log(this.scan);
      await Promise.all(this.scan.results
        .filter(res => res.error === '')
        .map(async (res) => {
          const img = await this._scannerService.getDataUrl(this.scan.id, res.id);
          this.images.set(res.id, img);
      }));
      this.imagesCompleted = true;
    });
  }

  async eyeballScan(): Promise<void> {
    console.log('eyeballing ...');
    const tfFiles = await this._scannerService.tfFiles();
    const model = await tf.loadLayersModel(tf.io.browserFiles(tfFiles));
    const offset = tf.scalar(127.5);
    const keys = Array.from(this.images.keys());
    for (let index = 0; index < keys.length; ++index) {
      const key = keys[index];
      console.log(`classifying: ${key}`);
      const img = new Image();
      img.src = this.images.get(key);
      img.height = 1080;
      img.width = 1920;
      const image = tf.browser.fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .sub(offset)
        .div(offset)
        .expandDims();
      const predictions = (<tf.Tensor<tf.Rank>> model.predict(image)).dataSync();
      console.log(`${typeof predictions} - ${predictions}`);
      if (predictions[0] > 0.5) {
        console.log(`Custom 404: ${key}`);
        this.classifications.CUSTOM_404.push(key);
      }
      if (predictions[1] > 0.5) {
        console.log(`Login Page: ${key}`);
        this.classifications.LOGIN_PAGE.push(key);
      }
      if (predictions[2] > 0.5) {
        console.log(`Homepage: ${key}`);
        this.classifications.HOMEPAGE.push(key);
      }
      if (predictions[3] > 0.5) {
        console.log(`Old Looking: ${key}`);
        this.classifications.OLD_LOOKING.push(key);
      }
    }

    console.log(this.classifications);
  }

}
