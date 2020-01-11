import { Pipe, PipeTransform } from '@angular/core';
import { ScannerService } from '@app/providers/scanner.service';

@Pipe({
  name: 'dataUrl'
})
export class DataUrlPipe implements PipeTransform {

  constructor(private _scannerService: ScannerService) { }

  async transform(resultId: string, scanId: string) {
    const dataUrl = await this._scannerService.getDataUrl(scanId, resultId);
    return dataUrl;
  }

}

@Pipe({
  name: 'date'
})
export class DatePipe implements PipeTransform {

  constructor() { }

  transform(started: string) {
    return new Date(started).toLocaleString("en-US");
  }

}

@Pipe({
  name: 'urlTitle'
})
export class UrlTitlePipe implements PipeTransform {

  constructor() { }

  transform(url: string) {
    try {
      const hostname = new URL(url).hostname;
      return hostname[0].toUpperCase() + hostname.slice(1).toLowerCase();
    } catch (err) {
      return url[0].toUpperCase() + url.slice(1).toLowerCase();
    }
  }

}