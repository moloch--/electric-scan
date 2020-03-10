import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';

import { Subscription } from 'rxjs';

import { ScannerService, Scan, ScanResult } from '@app/providers/scanner.service';
import { FadeInOut } from '@app/shared/animations';
import { ClientService } from '@app/providers/client.service';



export interface Dialogs {
  openUrl(result: ScanResult): void
  saveAs(result: ScanResult): void
}


@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  animations: [FadeInOut]
})
export class ViewComponent implements OnInit {

  scan: Scan;
  progress: number = 0;
  navLinks = [
    { path: 'all', label: 'All' },
    { path: 'eyeball', label: 'Eyeballer' },
    // { path: 'resembles', label: 'Resembles' },
  ];

  private _scanSub: Subscription;

  constructor(public route: ActivatedRoute,
              public router: Router,
              public clientService: ClientService,
              public scannerService: ScannerService) { }

  ngOnInit() {
    this.route.params.subscribe(async (params) => {
      this.scan = await this.scannerService.getScan(params['scan-id']);
      this._scanSub = this.scannerService.scans$.subscribe((scan) => {
        if (this.scan.id === scan.id) {
          this.scan = scan;
          this._updateProgress();
        }
      });
    });
  }

  ngOnDestroy() {
    this._scanSub.unsubscribe();
  }

  private _updateProgress() {
    if (this.scan) {
      const hasResult = this.scan.results.filter(result => result !== null);
      this.progress = Math.floor((hasResult.length / this.scan.results.length) * 100.0);
    } else {
      this.progress = 0;
    }
  }

  isComplete(): boolean {
    return this.scan ? this.scan.duration !== -1 : false;
  }

  saveAllAs() {
    this.clientService.saveAllAs(this.scan.id);
  }

}

// --------------------- [ DIALOGS ] --------------------- 

@Component({
  selector: 'app-context-menu',
  template: '',
})
export class ContextMenuComponent implements Dialogs {

  scan: Scan;
  @ViewChild(MatMenuTrigger, { static: false }) contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  constructor(public dialog: MatDialog,
              public clientService: ClientService) { }

  details(result: ScanResult) {
    this.contextMenu.closeMenu();
    this.dialog.open(DetailsDialogComponent, {
      data: { 
        scan: this.scan,
        result: result,
        parent: this,
      }
    });
  }

  saveAs(result: ScanResult) {
    this.clientService.saveImageAs(this.scan.id, result.id);
  }

  openUrl(result: ScanResult) {
    const dialogRef = this.dialog.open(OpenUrlDialogComponent, {
      data: { 
        scan: this.scan,
        result: result,
      }
    });
    const dialogSub = dialogRef.afterClosed().subscribe(async (data) => {
      if (data) {
        this.clientService.openUrl(data.result.target);
      }
      dialogSub.unsubscribe();
    });
  }

  onContextMenu(event: MouseEvent, result: ScanResult) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { 'item': result };
    this.contextMenu.openMenu();
  }

}


@Component({
  selector: 'app-details-dialog',
  templateUrl: 'details-dialog.html',
})
export class DetailsDialogComponent implements OnInit {

  scan: Scan;
  result: ScanResult;
  parent: Dialogs;

  constructor(public dialogRef: MatDialogRef<DetailsDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit() {
    this.scan = this.data.scan;
    this.result = this.data.result;
    this.parent = this.data.parent;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  saveAs(result: ScanResult) {
    this.dialogRef.close();
    this.parent.saveAs(result);
  }

  openUrl(result: ScanResult) {
    this.dialogRef.close();
    this.parent.openUrl(result);
  }

}

@Component({
  selector: 'app-openurl-dialog',
  templateUrl: 'openurl-dialog.html',
})
export class OpenUrlDialogComponent implements OnInit {

  scan: Scan;
  result: ScanResult;

  constructor(public dialogRef: MatDialogRef<DetailsDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit() {
    this.scan = this.data.scan;
    this.result = this.data.result;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}