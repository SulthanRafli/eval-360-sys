import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@NgModule({
  declarations: [],
  imports: [CommonModule, DeleteConfirmModalComponent],
  exports: [DeleteConfirmModalComponent],
})
export class SharedModule {}
