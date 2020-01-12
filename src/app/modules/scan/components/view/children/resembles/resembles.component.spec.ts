import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ResemblesComponent } from './resembles.component';

describe('ResemblesComponent', () => {
  let component: ResemblesComponent;
  let fixture: ComponentFixture<ResemblesComponent>;

  beforeEach(async(() => {
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
