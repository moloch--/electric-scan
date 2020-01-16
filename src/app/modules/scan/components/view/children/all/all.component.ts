import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { FadeInOut } from '@app/shared/animations';
import { ScannerService, Scan, ScanResult } from '@app/providers/scanner.service';
import { ClientService } from '@app/providers/client.service';
import { ContextMenuComponent } from '../../view.component';


@Component({
  selector: 'app-all',
  templateUrl: './all.component.html',
  styleUrls: ['./all.component.scss'],
  animations: [FadeInOut]
})
export class AllComponent extends ContextMenuComponent implements OnInit {

  private _hideErrors = false;
  displayedResults: ScanResult[];

  page = 1;
  readonly pageSize = 30;

  private _scan: Scan;
  private scanSub: Subscription;

  constructor(public route: ActivatedRoute,
              public router: Router,
              public dialog: MatDialog,
              public scannerService: ScannerService,
              public clientService: ClientService) {
                super(dialog, clientService);
              }

  ngOnInit() {
    this.route.parent.params.subscribe(async (params) => {
      this.scan = await this.scannerService.getScan(params['scan-id']);
      this.scanSub = this.scannerService.scans$.subscribe((scan) => {
        if (this.scan.id === scan.id) {
          this.scan = scan;
        }
      });
    });
  }

  ngOnDestroy() {
    this.scanSub.unsubscribe();
  }

  get scan(): Scan {
    return this._scan;
  }

  set scan(scan: Scan) {
    this._scan = scan;
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

}
