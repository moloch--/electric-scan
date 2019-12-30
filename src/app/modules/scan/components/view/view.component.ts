import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { FadeInOut } from '@app/shared/animations';
import { ScannerService, Scan, ScanResult } from '@app/providers/scanner.service';


@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  animations: [FadeInOut]
})
export class ViewComponent implements OnInit {

  scanId: string;
  scan: Scan;
  private _scanSub: Subscription;

  @ViewChild(MatMenuTrigger, { static: false }) contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  constructor(public dialog: MatDialog,
              private _route: ActivatedRoute,
              private _scannerService: ScannerService) { }

  ngOnInit() {
    this._route.params.subscribe((params) => {
      this.scanId = params['scan-id'];
      this.fetchScan();
      this._scanSub = this._scannerService.scans$.subscribe((scan) => {
        if (scan.id === this.scanId) {
          this.scan = scan;
        }
      });
    });
  }

  ngOnDestroy() {
    this._scanSub.unsubscribe();
  }
  
  onScroll() {
    console.log('scrolled!!');
  }

  isComplete(): boolean {
    return this.scan ? this.scan.duration !== -1 : false;
  }

  async fetchScan() {
    this.scan = await this._scannerService.GetScan(this.scanId);
  }

  results() {
    return this.scan ? this.scan.results.filter(r => r !== null) : [];
  }

  details(result: ScanResult) {
    this.contextMenu.closeMenu();
    const dialogRef = this.dialog.open(DetailsDialogComponent, {
      data: { 
        scan: this.scan,
        result: result
      }
    });
    dialogRef.afterClosed().subscribe(async (action) => {
      console.log(action);
    });
  }

  saveAs(result: ScanResult) {

  }

  openUrl(result: ScanResult) {

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