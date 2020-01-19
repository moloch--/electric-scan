import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import * as tf from '@tensorflow/tfjs';

import { ScannerService, Scan, ScanResult, Eyeball } from '@app/providers/scanner.service';
import { ClientService } from '@app/providers/client.service';
import { FadeInOut } from '@app/shared/animations';
import { ContextMenuComponent } from '../../view.component';


@Component({
  selector: 'app-eyeball',
  templateUrl: './eyeball.component.html',
  styleUrls: ['./eyeball.component.scss'],
  animations: [FadeInOut]
})
export class EyeballComponent extends ContextMenuComponent implements OnInit {

  offset = tf.scalar(127.5);
  scan: Scan;
  scanResults = new Map<string, ScanResult>();
  images = new Map<string, string>();
  imagesCompleted = false;
  eyeballing = false;
  eyeballCompleted = false;
  isCompleted = false;
  confidence = 0.6;

  classifications: Eyeball = {
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
      this.isCompleted = this.scan.duration !== -1 ? true : false;
      if (this.isCompleted) {
        const eyeball = await this._scannerService.getEyeball(this.scan.id);
        if (eyeball !== null) {
          this.classifications = eyeball;
          this.eyeballCompleted = true;
          this.loadAllImages();
        } else {
          await this.loadAllImages();
          this.eyeballScan();
        }
      }
    });
  }

  async loadAllImages(): Promise<void> {
    await Promise.all(this.scan.results
      .filter((result: ScanResult) => result.error === '')
      .map(async (result: ScanResult) => {
        const img = await this._scannerService.getDataUrl(this.scan.id, result.id);
        this.images.set(result.id, img);
        this.scanResults.set(result.id, result);
    }));
    this.imagesCompleted = true;
  }

  resultsOf(resultIds: string[]): ScanResult[] {
    const results = [];
    for (let index = 0; index < resultIds.length; ++index) {
      results.push(this.scanResults.get(resultIds[index]));
    }
    return results;
  }

  async eyeballScan(): Promise<void> {
    console.log('eyeballing ...');
    this.eyeballing = true;
    const tfFiles = await this._scannerService.tfFiles();
    const model = await tf.loadLayersModel(tf.io.browserFiles(tfFiles));
    const keys = Array.from(this.images.keys());
    await Promise.all(keys.map((key) => {
      this.classifyImage(key, model);
    }));
    this.eyeballing = false;
    this.eyeballCompleted = true;
    this._scannerService.saveEyeball(this.scan.id, this.classifications);
  }

  async classifyImage(key: string, model: tf.LayersModel) {
    console.log(`classifying: ${key}`);
    const img = new Image(this.scan.width, this.scan.height);
    img.src = this.images.get(key);
    const tensor = tf.browser.fromPixels(img)
      .resizeNearestNeighbor([224, 224])
      .toFloat()
      .sub(this.offset)
      .div(this.offset)
      .expandDims();
    const predictions = (<tf.Tensor<tf.Rank>> model.predict(tensor)).dataSync();
    console.log(`${predictions}`);
    if (predictions[0] > this.confidence) {
      console.log(`Custom 404: ${key}`);
      this.classifications.custom404.push(key);
    }
    if (predictions[1] > this.confidence) {
      console.log(`Login Page: ${key}`);
      this.classifications.loginPage.push(key);
    }
    if (predictions[2] > this.confidence) {
      console.log(`Homepage: ${key}`);
      this.classifications.homePage.push(key);
    }
    if (predictions[3] > this.confidence) {
      console.log(`Old Looking: ${key}`);
      this.classifications.oldLooking.push(key);
    }
  }
}
