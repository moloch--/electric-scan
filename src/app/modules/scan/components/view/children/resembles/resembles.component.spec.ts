import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ResemblesComponent } from './resembles.component';

describe('ResemblesComponent', () => {
  let component: ResemblesComponent;
  let fixture: ComponentFixture<ResemblesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ResemblesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ResemblesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
