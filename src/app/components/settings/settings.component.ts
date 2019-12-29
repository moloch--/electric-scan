import { Component, OnInit } from '@angular/core';
import { FadeInOut } from '@app/shared/animations';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  animations: [FadeInOut]
})
export class SettingsComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
