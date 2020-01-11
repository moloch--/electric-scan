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

  readonly TF_MODEL = 'app://electric/assets/tf/model.json';

  readonly CUSTOM_404 = 'Custom 404';
  readonly LOGIN_PAGE = 'Login Page';
  readonly HOMEPAGE = 'Homepage';
  readonly OLD_LOOKING = 'Old Looking';

  scan: Scan;
  
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
      this.eyeballScan();
    });
  }

  async eyeballScan(): Promise<void> {

    console.log(`Loading tf model from ${this.TF_MODEL}`);
    const model = await tf.loadLayersModel(this.TF_MODEL);

    const offset = tf.scalar(127.5);
    const imageElem: HTMLImageElement = <HTMLImageElement>document.getElementById(`id-`);
    const image = tf.browser.fromPixels(imageElem)
      .resizeNearestNeighbor([224, 224])
      .toFloat()
      .sub(offset)
      .div(offset)
      .expandDims();

    const predictions = model.predict(image);
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

}
