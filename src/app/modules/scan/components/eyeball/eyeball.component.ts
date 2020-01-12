import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as tf from '@tensorflow/tfjs';

import { ScannerService, Scan, ScanResult } from '@app/providers/scanner.service';


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
    console.log(Array.from(this.images.keys()));
    for (let key in Array.from(this.images.keys())) {
      console.log(`classifying: ${key}`);
      const imageElem: HTMLImageElement = <HTMLImageElement>document.createElement('img');
      imageElem.width = 1920;
      imageElem.height = 1080;
      imageElem.src = this.images.get(key);
      const image = tf.browser.fromPixels(imageElem)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .sub(offset)
        .div(offset)
        .expandDims();
      const predictions = model.predict(image);
      console.log(`${typeof predictions} - ${predictions}`);
      if (predictions[0] > 0.5) {
        console.log(`Custom 404: ${imageElem.id}`);
        this.classifications.CUSTOM_404.push(imageElem.id);
      }
      if (predictions[1] > 0.5) {
        console.log(`Login Page: ${imageElem.id}`);
        this.classifications.LOGIN_PAGE.push(imageElem.id);
      }
      if (predictions[2] > 0.5) {
        console.log(`Homepage: ${imageElem.id}`);
        this.classifications.HOMEPAGE.push(imageElem.id);
      }
      if (predictions[3] > 0.5) {
        console.log(`Old Looking: ${imageElem.id}`);
        this.classifications.OLD_LOOKING.push(imageElem.id);
      }
    }

    console.log(this.classifications);
  }

}
