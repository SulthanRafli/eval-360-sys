import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CircleDivide,
  Database,
  FileQuestionMark,
  FileText,
  LucideAngularModule,
  Plus,
  SquarePen,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-angular';
import { CriteriaService } from '../../shared/services/criteria.service';
import { Criteria, Question } from '../../shared/models/app.types';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-criteria',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './criteria.component.html',
  styleUrl: './criteria.component.css',
})
export class CriteriaComponent {
  // Icon references
  readonly Plus = Plus;
  readonly Database = Database;
  readonly CircleDivide = CircleDivide;
  readonly SquarePen = SquarePen;
  readonly Trash2 = Trash2;
  readonly FileText = FileText;
  readonly X = X;
  readonly TriangleAlert = TriangleAlert;
  readonly FileQuestionMark = FileQuestionMark;

  // Inject the service
  private criteriaService = inject(CriteriaService);

  private criteria$ = this.criteriaService.getCriteria();
  public criteria = toSignal(this.criteria$, { initialValue: [] });

  // Component state
  editingCriteria = signal<Criteria | null>(null);
  editingQuestion = signal<Question | null>(null);
  isLoading = signal(true);
  showCriteriaForm = signal(false);
  showQuestionForm = signal(false);
  showDeleteModal = signal(false);
  itemToDelete = signal<{
    type: 'criteria' | 'subcriteria';
    item: Criteria | Question;
  } | null>(null);
  criteriaForm = signal<{ code: string; name: string }>({ code: '', name: '' });
  subcriteriaForm = signal<{ code: string; text: string; criteriaId: string }>({
    code: '',
    text: '',
    criteriaId: '',
  });
  errors = signal<{ [key: string]: string }>({});

  // Statistics getters
  get totalCriteria(): number {
    return this.criteria().length;
  }

  get totalQuestion(): number {
    return this.criteria().reduce(
      (sum, c) => sum + (c.questions?.length || 0),
      0
    );
  }

  get avgQuestion(): string {
    if (this.totalCriteria === 0) return '0.0';
    return (this.totalQuestion / this.totalCriteria).toFixed(1);
  }

  // Validation functions (remain mostly the same)
  validateCriteriaForm(): boolean {
    const newErrors: { [key: string]: string } = {};
    if (!this.criteriaForm().code.trim())
      newErrors['code'] = 'Kode kriteria wajib diisi';
    else if (
      this.criteria().some(
        (c) =>
          c.code === this.criteriaForm().code &&
          c.id !== this.editingCriteria()?.id
      )
    ) {
      newErrors['code'] = 'Kode kriteria sudah digunakan';
    }
    if (!this.criteriaForm().name.trim())
      newErrors['name'] = 'Nama kriteria wajib diisi';
    this.errors.set(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  validateQuestionForm(): boolean {
    const newErrors: { [key: string]: string } = {};
    if (!this.subcriteriaForm().code.trim())
      newErrors['subCode'] = 'Kode subkriteria wajib diisi';
    else {
      const allQuestions = this.criteria().flatMap((c) => c.questions || []);
      if (
        allQuestions.some(
          (q) =>
            q.code === this.subcriteriaForm().code &&
            q.id !== this.editingQuestion()?.id
        )
      ) {
        newErrors['subCode'] = 'Kode subkriteria sudah digunakan';
      }
    }
    if (!this.subcriteriaForm().text.trim())
      newErrors['subText'] = 'Teks subkriteria wajib diisi';
    if (!this.subcriteriaForm().criteriaId)
      newErrors['subCriteria'] = 'Pilih kriteria untuk subkriteria';
    this.errors.set(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // --- CRUD Operations for Criteria ---
  handleCreateCriteria(): void {
    this.editingCriteria.set(null);
    this.criteriaForm.set({ code: '', name: '' });
    this.errors.set({});
    this.showCriteriaForm.set(true);
  }

  handleEditCriteria(criteria: Criteria): void {
    this.editingCriteria.set(criteria);
    this.criteriaForm.set({ code: criteria.code, name: criteria.name });
    this.errors.set({});
    this.showCriteriaForm.set(true);
  }

  async handleSaveCriteria(): Promise<void> {
    if (!this.validateCriteriaForm()) return;

    try {
      if (this.editingCriteria()) {
        await this.criteriaService.updateCriteria(
          this.editingCriteria()?.id || '',
          this.criteriaForm()
        );
      } else {
        const newCriteria: Omit<Criteria, 'id'> = {
          ...this.criteriaForm(),
          questions: [],
        };
        await this.criteriaService.addCriteria(newCriteria);
      }
      this.closeCriteriaForm();
    } catch (error) {
      console.error('Error saving criteria:', error);
      // Optionally show an error message to the user
    }
  }

  handleDeleteCriteria(criteria: Criteria): void {
    this.itemToDelete.set({ type: 'criteria', item: criteria });
    this.showDeleteModal.set(true);
  }

  // --- CRUD Operations for Question ---
  handleCreateQuestion(criteriaId?: string): void {
    this.editingQuestion.set(null);
    this.subcriteriaForm.set({
      code: '',
      text: '',
      criteriaId:
        criteriaId || (this.criteria().length > 0 ? this.criteria()[0].id : ''),
    });
    this.errors.set({});
    this.showQuestionForm.set(true);
  }

  handleEditQuestion(subcriteria: Question): void {
    this.editingQuestion.set(subcriteria);
    this.subcriteriaForm.set({
      code: subcriteria.code,
      text: subcriteria.text,
      criteriaId: subcriteria.criteriaId,
    });
    this.errors.set({});
    this.showQuestionForm.set(true);
  }

  async handleSaveQuestion(): Promise<void> {
    if (!this.validateQuestionForm()) return;

    try {
      if (this.editingQuestion()) {
        // If the criteria ID has changed, we need to move the question
        if (
          this.editingQuestion()?.criteriaId !==
          this.subcriteriaForm()?.criteriaId
        ) {
          const questionToMove: Question = {
            id: this.editingQuestion()?.id || '',
            code: this.subcriteriaForm().code,
            text: this.subcriteriaForm().text,
            criteriaId: this.editingQuestion()?.criteriaId || '',
          };
          await this.criteriaService.moveQuestion(
            questionToMove,
            this.subcriteriaForm().criteriaId
          );
        } else {
          // Otherwise, just update the question in place
          const updatedQuestion: Question = {
            id: this.editingQuestion()?.id || '',
            code: this.subcriteriaForm().code,
            text: this.subcriteriaForm().text,
            criteriaId: this.editingQuestion()?.criteriaId || '',
          };
          await this.criteriaService.updateQuestion(
            this.subcriteriaForm().criteriaId,
            updatedQuestion
          );
        }
      } else {
        // Create new subcriteria
        const newQuestion: Question = {
          id: `P${Date.now()}`, // Simple unique ID generation
          code: this.subcriteriaForm().code,
          text: this.subcriteriaForm().text,
          criteriaId: this.subcriteriaForm().criteriaId,
        };
        await this.criteriaService.addQuestion(
          this.subcriteriaForm().criteriaId,
          newQuestion
        );
      }
      this.closeQuestionForm();
    } catch (error) {
      console.error('Error saving subcriteria:', error);
    }
  }

  handleDeleteQuestion(subcriteria: Question): void {
    this.itemToDelete.set({ type: 'subcriteria', item: subcriteria });
    this.showDeleteModal.set(true);
  }

  // --- Modal Actions ---
  async confirmDelete(): Promise<void> {
    if (!this.itemToDelete()) return;

    try {
      if (this.itemToDelete()?.type === 'criteria') {
        await this.criteriaService.deleteCriteria(
          (this.itemToDelete()?.item as Criteria).id
        );
      } else {
        const sub = this.itemToDelete()?.item as Question;
        await this.criteriaService.deleteQuestion(sub.criteriaId, sub.id);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      this.closeDeleteModal();
    }
  }

  // --- UI Helper Methods ---
  closeCriteriaForm(): void {
    this.showCriteriaForm.set(true);
    this.editingCriteria.set(null);
  }

  closeQuestionForm(): void {
    this.showQuestionForm.set(false);
    this.editingCriteria.set(null);
  }

  openDeleteModal(
    type: 'criteria' | 'subcriteria',
    item: Criteria | Question
  ): void {
    this.itemToDelete.set({ type, item });
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.itemToDelete.set(null);
  }
}
