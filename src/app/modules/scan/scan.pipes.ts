import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'scanUrl'
})
export class ScanUrlPipe implements PipeTransform {

  constructor(private domSanitizer: DomSanitizer) { }

  transform(resultId: string, scanId: string) {
    const url = new URL(`scan://electric`);
    url.pathname = `${scanId}/${resultId}.png`;
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url.toString());
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
    const hostname = new URL(url).hostname;
    return hostname[0].toUpperCase() + hostname.slice(1);
  }

}