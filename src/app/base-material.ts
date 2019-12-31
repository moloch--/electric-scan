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

import { NgModule } from '@angular/core';
import {
  MatButtonModule, MatCheckboxModule, MatOptionModule, MatSelectModule, MatMenuModule, MatTabsModule,
  MatFormFieldModule, MatTooltipModule, MatToolbarModule, MatIconModule, MatProgressSpinnerModule,
  MatDialogModule, MatGridListModule, MatCardModule, MatTableModule, MatSortModule, MatInputModule,
  MatSnackBarModule, MatSlideToggleModule, MatDividerModule, MatProgressBarModule, MatBadgeModule
} from '@angular/material';

const modules = [
  MatButtonModule, MatCheckboxModule, MatOptionModule, MatSelectModule, MatMenuModule, MatTabsModule,
  MatFormFieldModule, MatTooltipModule, MatToolbarModule, MatIconModule, MatProgressSpinnerModule,
  MatDialogModule, MatGridListModule, MatCardModule, MatTableModule, MatSortModule, MatInputModule,
  MatSnackBarModule, MatSlideToggleModule, MatDividerModule, MatProgressBarModule, MatBadgeModule
];

@NgModule({
  imports: modules,
  exports: modules,
})
export class BaseMaterialModule { }
