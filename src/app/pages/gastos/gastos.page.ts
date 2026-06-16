import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ExpensesService } from '../../core/services/expenses.service';
import { CategoriesService } from '../../core/services/categories.service';
import { Expense, Category, MONTH_NAMES } from '../../core/models';

@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.page.html',
  styleUrls: ['./gastos.page.scss'],
  standalone: false,
})
export class GastosPage implements OnInit {
  expenses: Expense[] = [];
  categories: Category[] = [];
  isLoading = true;
  showModal = false;
  editingId: string | null = null;
  form!: FormGroup;

  searchText = '';
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' = 'date-desc';

  today = new Date();
  year = this.today.getFullYear();
  month = this.today.getMonth() + 1;
  monthName = MONTH_NAMES[this.month - 1];

  get filtered(): Expense[] {
    let list = this.searchText.trim()
      ? this.expenses.filter(e => e.description.toLowerCase().includes(this.searchText.toLowerCase()))
      : [...this.expenses];
    switch (this.sortBy) {
      case 'date-desc':
        list.sort((a, b) => {
          const d = b.date.localeCompare(a.date);
          return d !== 0 ? d : (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
        }); break;
      case 'date-asc':
        list.sort((a, b) => {
          const d = a.date.localeCompare(b.date);
          return d !== 0 ? d : (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
        }); break;
      case 'amount-desc': list.sort((a, b) => b.amount - a.amount); break;
      case 'amount-asc':  list.sort((a, b) => a.amount - b.amount); break;
    }
    return list;
  }

  constructor(
    private expensesService: ExpensesService,
    private categoriesService: CategoriesService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private router: Router,
  ) {}

  ngOnInit() { this.buildForm(); this.loadData(); }
  ionViewWillEnter() { this.loadData(); }

  buildForm() {
    this.form = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      categoryId: ['', Validators.required],
      date: [this.todayLocal(), Validators.required],
      notes: [''],
    });
  }

  private todayLocal(): string {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      expenses: this.expensesService.getAll(this.year, this.month),
      categories: this.categoriesService.getAll('expense'),
    }).subscribe({
      next: ({ expenses, categories }) => {
        this.expenses = expenses;
        this.categories = categories;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  goToCategories(): void { this.router.navigate(['/tabs/categorias']); }

  async quickNewCategory(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Nueva categoría de gasto',
      inputs: [{ name: 'name', type: 'text', placeholder: 'Nombre (ej: Alimentación)' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: (data) => {
            if (!data.name?.trim()) return false;
            this.categoriesService.create({ name: data.name.trim(), type: 'expense', color: '#6366f1', icon: 'receipt' })
              .subscribe({ next: (cat) => { this.categories = [...this.categories, cat]; this.form.patchValue({ categoryId: cat._id }); this.showToast('Categoría creada'); } });
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  openAdd() { this.editingId = null; this.buildForm(); this.showModal = true; }

  openEdit(expense: Expense) {
    this.editingId = expense._id;
    this.form.patchValue({
      description: expense.description,
      amount: expense.amount,
      categoryId: (expense.categoryId as any)?._id || expense.categoryId,
      date: (expense.date as string)?.substring(0, 10),
      notes: expense.notes || '',
    });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  async onSave() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
    await loading.present();
    const req = this.editingId
      ? this.expensesService.update(this.editingId, this.form.value)
      : this.expensesService.create(this.form.value);
    req.subscribe({
      next: async () => {
        await loading.dismiss();
        this.showModal = false;
        this.loadData();
        this.showToast(this.editingId ? 'Gasto actualizado' : 'Gasto agregado');
      },
      error: async () => { await loading.dismiss(); this.showToast('Error al guardar', 'danger'); },
    });
  }

  async onDelete(expense: Expense) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar gasto',
      message: `¿Eliminar "${expense.description}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: () => {
            this.expensesService.delete(expense._id).subscribe({
              next: () => { this.loadData(); this.showToast('Gasto eliminado'); },
              error: () => this.showToast('Error al eliminar', 'danger'),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  prevMonth() {
    this.month--; if (this.month < 1) { this.month = 12; this.year--; }
    this.monthName = MONTH_NAMES[this.month - 1]; this.loadData();
  }

  nextMonth() {
    this.month++; if (this.month > 12) { this.month = 1; this.year++; }
    this.monthName = MONTH_NAMES[this.month - 1]; this.loadData();
  }

  getCategoryName(categoryId: any): string {
    if (typeof categoryId === 'object') return categoryId?.name || '';
    return this.categories.find(c => c._id === categoryId)?.name || '';
  }

  isHormiga(expense: Expense): boolean {
    const catId = typeof expense.categoryId === 'object'
      ? (expense.categoryId as any)?._id
      : expense.categoryId;
    return this.categories.find(c => c._id === catId)?.name?.toLowerCase().includes('hormiga') ?? false;
  }

  get total() { return this.expenses.reduce((sum, e) => sum + e.amount, 0); }

  private async showToast(message: string, color = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
