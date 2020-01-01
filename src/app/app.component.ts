/*
  Electric Scan
  Copyright (C) 2019  Bishop Fox

  This program is free software; you can redistribute it and/or
  modify it under the terms of the GNU General Public License
  as published by the Free Software Foundation; either version 2
  of the License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

import { Component, OnInit } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Subject } from 'rxjs';
import { SettingsService } from './providers/settings.service';

const THEME_DARKNESS_SUFFIX = `-dark`

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  isThemeDark = false;
  activeTheme: string;
  activeThemeCssClass: string;

  constructor(private _overlayContainer: OverlayContainer,
              private _settingService: SettingsService) { }

  ngOnInit() {
    this.themeInit();
  }

  async themeInit(): Promise<void> {
    const preferences = await this._settingService.loadSystemPreferences();
    this.setActiveTheme('deeppurple-amber', preferences.darkMode);
  }

  setActiveTheme(theme: string, darkness: boolean = null) {
    if (darkness === null)
      darkness = this.isThemeDark
    else if (this.isThemeDark === darkness) {
      if (this.activeTheme === theme) return
    } else
      this.isThemeDark = darkness
    
    this.activeTheme = theme
    
    const cssClass = darkness === true ? theme + THEME_DARKNESS_SUFFIX : theme
    
    const classList = this._overlayContainer.getContainerElement().classList
    if (classList.contains(this.activeThemeCssClass))
      classList.replace(this.activeThemeCssClass, cssClass)
    else
      classList.add(cssClass)
    
    this.activeThemeCssClass = cssClass
  }

}
