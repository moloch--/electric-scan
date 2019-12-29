import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FadeInOut } from '@app/shared/animations';


@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  animations: [FadeInOut]
})
export class ViewComponent implements OnInit {

  scanId: string;

  constructor(private _route: ActivatedRoute) { }

  ngOnInit() {
    this._route.params.subscribe((params) => {
      this.scanId = params['scan-id'];
    });
  }

}
