import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
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
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-criteria',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './criteria.component.html',
  styleUrl: './criteria.component.css',
})
export class CriteriaComponent implements OnInit {
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
  private criteriaSubscription: Subscription | null = null;

  // Component state
  criteria: Criteria[] = [];
  editingCriteria: Criteria | null = null;
  editingQuestion: Question | null = null;
  isLoading = true;
  showCriteriaForm = false;
  showQuestionForm = false;
  showDeleteModal = false;
  itemToDelete: {
    type: 'criteria' | 'subcriteria';
    item: Criteria | Question;
  } | null = null;

  // Form models
  criteriaForm = { code: '', name: '' };
  subcriteriaForm = { code: '', text: '', criteriaId: '' };
  errors: { [key: string]: string } = {};

  ngOnInit(): void {
    this.loadCriteria();
  }

  ngOnDestroy(): void {
    // Unsubscribe to prevent memory leaks
    this.criteriaSubscription?.unsubscribe();
  }

  // Statistics getters
  get totalCriteria(): number {
    return this.criteria.length;
  }

  get totalQuestion(): number {
    return this.criteria.reduce(
      (sum, c) => sum + (c.questions?.length || 0),
      0
    );
  }

  get avgQuestion(): string {
    if (this.totalCriteria === 0) return '0.0';
    return (this.totalQuestion / this.totalCriteria).toFixed(1);
  }

  // Data operations
  loadCriteria(): void {
    this.isLoading = true;
    this.criteriaSubscription = this.criteriaService.getCriteria().subscribe({
      next: (data) => {
        this.criteria = data;
        // Ensure questions array exists
        this.criteria.forEach((c) => {
          if (!c.questions) {
            c.questions = [];
          }
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading criteria:', err);
        this.isLoading = false;
      },
    });
  }

  // Validation functions (remain mostly the same)
  validateCriteriaForm(): boolean {
    const newErrors: { [key: string]: string } = {};
    if (!this.criteriaForm.code.trim())
      newErrors['code'] = 'Kode kriteria wajib diisi';
    else if (
      this.criteria.some(
        (c) =>
          c.code === this.criteriaForm.code && c.id !== this.editingCriteria?.id
      )
    ) {
      newErrors['code'] = 'Kode kriteria sudah digunakan';
    }
    if (!this.criteriaForm.name.trim())
      newErrors['name'] = 'Nama kriteria wajib diisi';
    this.errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  validateQuestionForm(): boolean {
    const newErrors: { [key: string]: string } = {};
    if (!this.subcriteriaForm.code.trim())
      newErrors['subCode'] = 'Kode subkriteria wajib diisi';
    else {
      const allQuestions = this.criteria.flatMap((c) => c.questions || []);
      if (
        allQuestions.some(
          (q) =>
            q.code === this.subcriteriaForm.code &&
            q.id !== this.editingQuestion?.id
        )
      ) {
        newErrors['subCode'] = 'Kode subkriteria sudah digunakan';
      }
    }
    if (!this.subcriteriaForm.text.trim())
      newErrors['subText'] = 'Teks subkriteria wajib diisi';
    if (!this.subcriteriaForm.criteriaId)
      newErrors['subCriteria'] = 'Pilih kriteria untuk subkriteria';
    this.errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  // --- CRUD Operations for Criteria ---
  handleCreateCriteria(): void {
    this.editingCriteria = null;
    this.criteriaForm = { code: '', name: '' };
    this.errors = {};
    this.showCriteriaForm = true;
  }

  handleEditCriteria(criteria: Criteria): void {
    this.editingCriteria = criteria;
    this.criteriaForm = { code: criteria.code, name: criteria.name };
    this.errors = {};
    this.showCriteriaForm = true;
  }

  async handleSaveCriteria(): Promise<void> {
    if (!this.validateCriteriaForm()) return;

    try {
      if (this.editingCriteria) {
        await this.criteriaService.updateCriteria(
          this.editingCriteria.id,
          this.criteriaForm
        );
      } else {
        const newCriteria: Omit<Criteria, 'id'> = {
          ...this.criteriaForm,
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
    this.itemToDelete = { type: 'criteria', item: criteria };
    this.showDeleteModal = true;
  }

  // --- CRUD Operations for Question ---
  handleCreateQuestion(criteriaId?: string): void {
    this.editingQuestion = null;
    this.subcriteriaForm = {
      code: '',
      text: '',
      criteriaId:
        criteriaId || (this.criteria.length > 0 ? this.criteria[0].id : ''),
    };
    this.errors = {};
    this.showQuestionForm = true;
  }

  handleEditQuestion(subcriteria: Question): void {
    this.editingQuestion = subcriteria;
    this.subcriteriaForm = {
      code: subcriteria.code,
      text: subcriteria.text,
      criteriaId: subcriteria.criteriaId,
    };
    this.errors = {};
    this.showQuestionForm = true;
  }

  async handleSaveQuestion(): Promise<void> {
    if (!this.validateQuestionForm()) return;

    try {
      if (this.editingQuestion) {
        // If the criteria ID has changed, we need to move the question
        if (
          this.editingQuestion.criteriaId !== this.subcriteriaForm.criteriaId
        ) {
          const questionToMove: Question = {
            ...this.editingQuestion,
            code: this.subcriteriaForm.code,
            text: this.subcriteriaForm.text,
          };
          await this.criteriaService.moveQuestion(
            questionToMove,
            this.subcriteriaForm.criteriaId
          );
        } else {
          // Otherwise, just update the question in place
          const updatedQuestion: Question = {
            ...this.editingQuestion,
            code: this.subcriteriaForm.code,
            text: this.subcriteriaForm.text,
          };
          await this.criteriaService.updateQuestion(
            this.subcriteriaForm.criteriaId,
            updatedQuestion
          );
        }
      } else {
        // Create new subcriteria
        const newQuestion: Question = {
          id: `P${Date.now()}`, // Simple unique ID generation
          code: this.subcriteriaForm.code,
          text: this.subcriteriaForm.text,
          criteriaId: this.subcriteriaForm.criteriaId,
        };
        await this.criteriaService.addQuestion(
          this.subcriteriaForm.criteriaId,
          newQuestion
        );
      }
      this.closeQuestionForm();
    } catch (error) {
      console.error('Error saving subcriteria:', error);
    }
  }

  handleDeleteQuestion(subcriteria: Question): void {
    this.itemToDelete = { type: 'subcriteria', item: subcriteria };
    this.showDeleteModal = true;
  }

  // --- Modal Actions ---
  async confirmDelete(): Promise<void> {
    if (!this.itemToDelete) return;

    try {
      if (this.itemToDelete.type === 'criteria') {
        await this.criteriaService.deleteCriteria(
          (this.itemToDelete.item as Criteria).id
        );
      } else {
        const sub = this.itemToDelete.item as Question;
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
    this.showCriteriaForm = false;
    this.editingCriteria = null;
  }

  closeQuestionForm(): void {
    this.showQuestionForm = false;
    this.editingQuestion = null;
  }

  openDeleteModal(
    type: 'criteria' | 'subcriteria',
    item: Criteria | Question
  ): void {
    this.itemToDelete = { type, item };
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }
}
