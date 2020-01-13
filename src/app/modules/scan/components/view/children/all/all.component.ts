import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material';

import { FadeInOut } from '@app/shared/animations';
import { ScannerService, Scan, ScanResult } from '@app/providers/scanner.service';
import { ClientService } from '@app/providers/client.service';
import { DetailsDialogComponent, OpenUrlDialogComponent } from '../../view.component';


@Component({
  selector: 'app-all',
  templateUrl: './all.component.html',
  styleUrls: ['./all.component.scss'],
  animations: [FadeInOut]
})
export class AllComponent implements OnInit {

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
              public route: ActivatedRoute,
              public router: Router,
              public scannerService: ScannerService,
              public clientService: ClientService) { }

  ngOnInit() {
    this.route.params.subscribe(async (params) => {
      this.scan = await this.scannerService.getScan(params['scan-id']);
      this._scanSub = this.scannerService.scans$.subscribe((scan) => {
        if (scan.id === this.scan.id) {
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

  onContextMenu(event: MouseEvent, result: ScanResult) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { 'item': result };
    this.contextMenu.openMenu();
  }


}
