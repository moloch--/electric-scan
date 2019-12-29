import { Component, OnInit } from '@angular/core';
import { FadeInOut } from '@app/shared/animations';


@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  animations: [FadeInOut]
})
export class ViewComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
