import { Component, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Header } from '../../../../shared/models/app.types';

@Component({
  selector: 'app-matrix-tables',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './matrix-tables.component.html',
  styleUrl: './matrix-tables.component.css', // You can add component-specific styles here
})
export class MatrixTableComponent {
  // @Input() decorators mark these properties as inputs from a parent component
  @Input() title: string = '';
  @Input() matrix: number[][] = [];
  @Input() headers: Header[] = [];
  @Input() showHeader: boolean = true;

  @Input() showSum: boolean = false;
  @Input() sumValues?: number[];

  @Input() showPriority: boolean = false;
  @Input() priorityValues?: number[];

  @Input() showRatio: boolean = false;
  @Input() ratioValues?: number[];

  @Input() showColSum: boolean = false;
  @Input() sumColValues?: number[];

  /**
   * Calculates the total sum of ratio values for the footer row.
   * @returns The sum of all ratio values.
   */
  getTotalRatio(): number {
    if (!this.ratioValues) {
      return 0;
    }
    return this.ratioValues.reduce((sum, val) => sum + val, 0);
  }

  /**
   * Calculates the colspan for the footer row's empty cell to maintain table structure.
   * @returns The calculated colspan value.
   */
  getColspan(): number {
    let colspan = 0;
    if (this.showHeader) this.headers.length;
    if (this.showSum) colspan++;
    if (this.showPriority) colspan++;
    return colspan;
  }
}
