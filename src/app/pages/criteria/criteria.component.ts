import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface Question {
  id: string;
  code: string;
  text: string;
  criteriaId: string;
}

export interface Criteria {
  id: string;
  code: string;
  name: string;
  questions: Question[];
}

@Component({
  selector: 'app-criteria',
  imports: [CommonModule, FormsModule],
  templateUrl: './criteria.component.html',
  styleUrl: './criteria.component.css',
})
export class CriteriaComponent implements OnInit {
  criteria: Criteria[] = [];
  showCriteriaForm = false;
  showSubcriteriaForm = false;
  editingCriteria: Criteria | null = null;
  editingSubcriteria: Question | null = null;
  selectedCriteriaId = '';
  showResetModal = false;
  showDeleteModal = false;
  itemToDelete: {
    type: 'criteria' | 'subcriteria';
    item: Criteria | Question;
  } | null = null;

  criteriaForm = {
    code: '',
    name: '',
  };

  subcriteriaForm = {
    code: '',
    text: '',
    criteriaId: '',
  };

  errors: { [key: string]: string } = {};

  // Mock data - replace with actual service calls
  private defaultCriteria: Criteria[] = [
    {
      id: 'C1',
      code: 'C1',
      name: 'Kualitas Kerja',
      questions: [
        {
          id: 'P1',
          code: 'P1',
          text: 'Kemampuan menyelesaikan tugas dengan hasil yang berkualitas tinggi',
          criteriaId: 'C1',
        },
        {
          id: 'P2',
          code: 'P2',
          text: 'Konsistensi dalam menjaga standar kualitas pekerjaan',
          criteriaId: 'C1',
        },
      ],
    },
    {
      id: 'C2',
      code: 'C2',
      name: 'Produktivitas',
      questions: [
        {
          id: 'P3',
          code: 'P3',
          text: 'Kemampuan menyelesaikan pekerjaan dalam waktu yang efisien',
          criteriaId: 'C2',
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.loadCriteria();
  }

  // Statistics getters
  get totalCriteria(): number {
    return this.criteria.length;
  }

  get totalSubcriteria(): number {
    return this.criteria.reduce((sum, c) => sum + c.questions.length, 0);
  }

  get avgSubcriteria(): string {
    return this.totalCriteria > 0
      ? (this.totalSubcriteria / this.totalCriteria).toFixed(1)
      : '0';
  }

  // Data operations
  loadCriteria(): void {
    // In a real app, this would be a service call
    this.criteria = [...this.defaultCriteria];
  }

  updateEvaluationCriteria(criteria: Criteria[]): void {
    // In a real app, this would be a service call
    this.criteria = criteria;
  }

  resetToDefaultCriteria(): Criteria[] {
    // In a real app, this would be a service call
    return [...this.defaultCriteria];
  }

  // Validation functions
  validateCriteriaForm(): boolean {
    const newErrors: { [key: string]: string } = {};

    if (!this.criteriaForm.code.trim()) {
      newErrors['code'] = 'Kode kriteria wajib diisi';
    } else if (
      this.criteria.some(
        (c) =>
          c.code === this.criteriaForm.code && c.id !== this.editingCriteria?.id
      )
    ) {
      newErrors['code'] = 'Kode kriteria sudah digunakan';
    }

    if (!this.criteriaForm.name.trim()) {
      newErrors['name'] = 'Nama kriteria wajib diisi';
    }

    this.errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  validateSubcriteriaForm(): boolean {
    const newErrors: { [key: string]: string } = {};

    if (!this.subcriteriaForm.code.trim()) {
      newErrors['subCode'] = 'Kode subkriteria wajib diisi';
    } else {
      const allQuestions = this.criteria.flatMap((c) => c.questions);
      if (
        allQuestions.some(
          (q) =>
            q.code === this.subcriteriaForm.code &&
            q.id !== this.editingSubcriteria?.id
        )
      ) {
        newErrors['subCode'] = 'Kode subkriteria sudah digunakan';
      }
    }

    if (!this.subcriteriaForm.text.trim()) {
      newErrors['subText'] = 'Teks subkriteria wajib diisi';
    }

    if (!this.subcriteriaForm.criteriaId) {
      newErrors['subCriteria'] = 'Pilih kriteria untuk subkriteria';
    }

    this.errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  // CRUD Operations for Criteria
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

  handleSaveCriteria(): void {
    if (!this.validateCriteriaForm()) return;

    if (this.editingCriteria) {
      // Update existing criteria
      const updatedCriteria = this.criteria.map((c) =>
        c.id === this.editingCriteria!.id
          ? { ...c, code: this.criteriaForm.code, name: this.criteriaForm.name }
          : c
      );
      this.criteria = updatedCriteria;
      this.updateEvaluationCriteria(updatedCriteria);
    } else {
      // Create new criteria
      const newCriteria: Criteria = {
        id: `C${Date.now()}`,
        code: this.criteriaForm.code,
        name: this.criteriaForm.name,
        questions: [],
      };
      const updatedCriteria = [...this.criteria, newCriteria];
      this.criteria = updatedCriteria;
      this.updateEvaluationCriteria(updatedCriteria);
    }

    this.showCriteriaForm = false;
    this.editingCriteria = null;
  }

  handleDeleteCriteria(criteria: Criteria): void {
    this.itemToDelete = { type: 'criteria', item: criteria };
    this.showDeleteModal = true;
  }

  // CRUD Operations for Subcriteria
  handleCreateSubcriteria(criteriaId?: string): void {
    this.editingSubcriteria = null;
    this.subcriteriaForm = {
      code: '',
      text: '',
      criteriaId:
        criteriaId || this.selectedCriteriaId || this.criteria[0]?.id || '',
    };
    this.errors = {};
    this.showSubcriteriaForm = true;
  }

  handleEditSubcriteria(subcriteria: Question): void {
    this.editingSubcriteria = subcriteria;
    this.subcriteriaForm = {
      code: subcriteria.code,
      text: subcriteria.text,
      criteriaId: subcriteria.criteriaId,
    };
    this.errors = {};
    this.showSubcriteriaForm = true;
  }

  handleSaveSubcriteria(): void {
    if (!this.validateSubcriteriaForm()) return;

    if (this.editingSubcriteria) {
      // Update existing subcriteria
      let updatedCriteria = this.criteria.map((c) => ({
        ...c,
        questions: c.questions.map((q) =>
          q.id === this.editingSubcriteria!.id
            ? {
                ...q,
                code: this.subcriteriaForm.code,
                text: this.subcriteriaForm.text,
                criteriaId: this.subcriteriaForm.criteriaId,
              }
            : q
        ),
      }));

      // If criteria changed, move the question
      if (
        this.editingSubcriteria.criteriaId !== this.subcriteriaForm.criteriaId
      ) {
        const finalCriteria = updatedCriteria.map((c) => {
          if (c.id === this.editingSubcriteria!.criteriaId) {
            // Remove from old criteria
            return {
              ...c,
              questions: c.questions.filter(
                (q) => q.id !== this.editingSubcriteria!.id
              ),
            };
          } else if (c.id === this.subcriteriaForm.criteriaId) {
            // Add to new criteria
            return {
              ...c,
              questions: [
                ...c.questions,
                {
                  id: this.editingSubcriteria!.id,
                  code: this.subcriteriaForm.code,
                  text: this.subcriteriaForm.text,
                  criteriaId: this.subcriteriaForm.criteriaId,
                },
              ],
            };
          }
          return c;
        });
        this.criteria = finalCriteria;
        this.updateEvaluationCriteria(finalCriteria);
      } else {
        this.criteria = updatedCriteria;
        this.updateEvaluationCriteria(updatedCriteria);
      }
    } else {
      // Create new subcriteria
      const newSubcriteria: Question = {
        id: `P${Date.now()}`,
        code: this.subcriteriaForm.code,
        text: this.subcriteriaForm.text,
        criteriaId: this.subcriteriaForm.criteriaId,
      };

      const updatedCriteria = this.criteria.map((c) =>
        c.id === this.subcriteriaForm.criteriaId
          ? { ...c, questions: [...c.questions, newSubcriteria] }
          : c
      );
      this.criteria = updatedCriteria;
      this.updateEvaluationCriteria(updatedCriteria);
    }

    this.showSubcriteriaForm = false;
    this.editingSubcriteria = null;
  }

  handleDeleteSubcriteria(subcriteria: Question): void {
    this.itemToDelete = { type: 'subcriteria', item: subcriteria };
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.itemToDelete) return;

    if (this.itemToDelete.type === 'criteria') {
      const criteriaToDelete = this.itemToDelete.item as Criteria;
      const updatedCriteria = this.criteria.filter(
        (c) => c.id !== criteriaToDelete.id
      );
      this.criteria = updatedCriteria;
      this.updateEvaluationCriteria(updatedCriteria);
    } else {
      const subcriteriaToDelete = this.itemToDelete.item as Question;
      const updatedCriteria = this.criteria.map((c) => ({
        ...c,
        questions: c.questions.filter((q) => q.id !== subcriteriaToDelete.id),
      }));
      this.criteria = updatedCriteria;
      this.updateEvaluationCriteria(updatedCriteria);
    }

    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  handleResetToDefault(): void {
    const defaultCriteria = this.resetToDefaultCriteria();
    this.criteria = defaultCriteria;
    this.updateEvaluationCriteria(defaultCriteria);
    this.showResetModal = false;
  }

  // Helper methods for templates
  closeCriteriaForm(): void {
    this.showCriteriaForm = false;
  }

  closeSubcriteriaForm(): void {
    this.showSubcriteriaForm = false;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  closeResetModal(): void {
    this.showResetModal = false;
  }
}
