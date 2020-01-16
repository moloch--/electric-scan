import { Component, OnInit } from '@angular/core';

import { FadeInOut } from '@app/shared/animations';


@Component({
  selector: 'app-resembles',
  templateUrl: './resembles.component.html',
  styleUrls: ['./resembles.component.scss'],
  animations: [FadeInOut]
})
export class ResemblesComponent implements OnInit {

  readonly BASE64_MARKER = ';base64,';

  constructor() { }

  ngOnInit() {

  }

  convertDataURIToBinary(dataURI) {
    var base64Index = dataURI.indexOf(this.BASE64_MARKER) + this.BASE64_MARKER.length;
    var base64 = dataURI.substring(base64Index);
    var raw = window.atob(base64);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  }

}
