import { Component, OnInit, OnDestroy } from '@angular/core';
import { FadeInOut } from '@app/shared/animations';
import { SettingsService, Settings } from '@app/providers/settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  animations: [FadeInOut]
})
export class SettingsComponent implements OnInit, OnDestroy {

  settings: Settings;
  private debounce: NodeJS.Timeout;

  constructor(private _settingsService: SettingsService) { }

  ngOnInit() {
    this.fetch();
  }

  ngOnDestroy() {
    this.save();
  }

  async fetch() {
    this.settings = await this._settingsService.load();
  }

  async save() {
    this.settings = await this._settingsService.save(this.settings);
  }

  onChange() {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => {
      this.save();
      this.debounce = undefined;
    }, 250);
  }

}
