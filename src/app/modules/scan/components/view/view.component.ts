import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { FadeInOut } from '@app/shared/animations';
import { ScannerService, Scan, ScanResult } from '@app/providers/scanner.service';
import { ClientService } from '@app/providers/client.service';




@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  animations: [FadeInOut]
})
export class ViewComponent implements OnInit {

  scanId: string;
  progress: number = 0;
  private _hideErrors = false;
  displayedResults: ScanResult[];

  page = 1;
  readonly pageSize = 30;

  private _scan: Scan;
  private _scanSub: Subscription;

  @ViewChild(MatMenuTrigger, { static: false }) contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  constructor(public dialog: MatDialog,
              private _route: ActivatedRoute,
              private _router: Router,
              private _scannerService: ScannerService,
              private _clientService: ClientService) { }

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

  get scan(): Scan {
    return this._scan;
  }

  set scan(scan: Scan) {
    this._scan = scan;
    this._progress();
    this.updateDisplayResults();
  }

  get hideErrors(): boolean {
    return this._hideErrors;
  }

  set hideErrors(hideErrors: boolean) {
    this._hideErrors = hideErrors;
    this.updateDisplayResults();
  }
  
  onScroll() {
    this.page++;
    this.updateDisplayResults();
  }

  isComplete(): boolean {
    return this.scan ? this.scan.duration !== -1 : false;
  }

  private _progress() {
    if (this.scan) {
      const completed = this.scan.results.filter(res => res !== null);
      this.progress = Math.floor((completed.length / this.scan.results.length) * 100.0);
    } else {
      this.progress = 0;
    }
  }

  async fetchScan() {
    this.scan = await this._scannerService.getScan(this.scanId);
  }

  updateDisplayResults() {
    if (!this.scan) {
      return [];
    }
    let completed = this.scan.results.filter(r => r !== null);
    if (this.hideErrors) {
      completed = completed.filter(res => res.error === '');
    }
    completed = completed.slice(0, this.page * this.pageSize);
    if (JSON.stringify(this.displayedResults) !== JSON.stringify(completed)) {
      this.displayedResults = completed;
    }
  }

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
    console.log(`Save image ${this.scan.id}/${result.id}.png`)
    this._clientService.saveImageAs(this.scan.id, result.id);
  }

  saveAllAs() {
    this._clientService.saveAllAs(this.scan.id);
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
        this._clientService.openUrl(data.result.target);
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

  onEyeballer() {
    this._router.navigate(['scan', 'eyeballer', this.scan.id]);
  }

}


@Component({
  selector: 'app-details-dialog',
  templateUrl: 'details-dialog.html',
})
export class DetailsDialogComponent implements OnInit {

  scan: Scan;
  result: ScanResult;
  parent: ViewComponent;

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