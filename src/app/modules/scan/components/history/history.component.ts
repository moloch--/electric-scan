import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Sort } from '@angular/material/sort';
import { Router } from '@angular/router';

import { ScannerService, Scan } from '@app/providers/scanner.service';
import { FadeInOut } from '@app/shared/animations';


@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
  animations: [FadeInOut]
})
export class HistoryComponent implements OnInit {

  noScans = false;
  dataSrc: MatTableDataSource<Scan>;
  displayedColumns: string[] = [
    'started', 'name', 'results', 'actions'
  ];

  constructor(private _router: Router,
              private _scannerService: ScannerService) { }

  ngOnInit() {
    this.fetch();
  }

  async fetch() {
    const scans = await this._scannerService.listScans();
    if (scans && scans.length) {
      scans.sort((a, b) => (a.started > b.started) ? 1 : -1)
      this.dataSrc = new MatTableDataSource(scans);
    } else {
      this.noScans = true;
    }
  }

  compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  applyFilter(filterValue: string) {
    this.dataSrc.filter = filterValue.trim().toLowerCase();
  }

  onRowSelection(scan: Scan) {
    this._router.navigate(['/scan', 'view', scan.id]);
  }

  async deleteScan(scan: Scan) {
    await this._scannerService.rmScan(scan.id);
    this.fetch();
  }

  sortData(event: Sort) {
    this.dataSrc.data = this.dataSrc.data.slice().sort((a: Scan, b: Scan) => {
      const isAsc = event.direction === 'asc';
      switch (event.active) {
        case 'started':  return this.compare(a.started, b.started, isAsc);
        case 'name': return this.compare(a.name, b.name, isAsc);
        case 'results': return this.compare(a.results.length, b.results.length, isAsc);
        default: return 0;
      }
    });
  }

}
