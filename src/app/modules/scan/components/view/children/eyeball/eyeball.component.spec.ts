import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EyeballComponent } from './eyeball.component';

describe('EyeballComponent', () => {
  let component: EyeballComponent;
  let fixture: ComponentFixture<EyeballComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EyeballComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EyeballComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
