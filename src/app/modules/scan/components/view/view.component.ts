import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { ScannerService, Scan, ScanResult } from '@app/providers/scanner.service';
import { ClientService } from '@app/providers/client.service';
import { FadeInOut } from '@app/shared/animations';


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
export class ViewComponent implements OnInit, Dialogs {

  scan: Scan;

  constructor(public dialog: MatDialog, 
              public route: ActivatedRoute,
              public scannerService: ScannerService,
              public clientService: ClientService) { }

  ngOnInit() {
    this.route.params.subscribe(async (params) => {
      this.scan = await this.scannerService.getScan(params['scan-id']);
    });
  }

  saveAs(result: ScanResult) {
    this.clientService.saveImageAs(this.scan.id, result.id);
  }

  saveAllAs() {
    this.clientService.saveAllAs(this.scan.id);
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

}

// --------------------- [ DIALOGS ] --------------------- 

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