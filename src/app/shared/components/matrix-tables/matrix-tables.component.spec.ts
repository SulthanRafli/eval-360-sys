import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatrixTablesComponent } from './matrix-tables.component';

describe('MatrixTablesComponent', () => {
  let component: MatrixTablesComponent;
  let fixture: ComponentFixture<MatrixTablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixTablesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MatrixTablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
