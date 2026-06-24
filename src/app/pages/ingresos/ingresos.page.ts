import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IncomesService } from '../../core/services/incomes.service';
import { CategoriesService } from '../../core/services/categories.service';
import { Income, Category, MONTH_NAMES, COLOMBIAN_BANKS } from '../../core/models';

@Component({
  selector: 'app-ingresos',
  templateUrl: './ingresos.page.html',
  styleUrls: ['./ingresos.page.scss'],
  standalone: false,
})
export class IngresosPage implements OnInit {
  incomes: Income[] = [];
  categories: Category[] = [];
  isLoading = true;
  showModal = false;
  editingId: string | null = null;
  form!: FormGroup;

  searchText = '';
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' = 'date-desc';
  readonly banks = COLOMBIAN_BANKS;

  today = new Date();
  year = this.today.getFullYear();
  month = this.today.getMonth() + 1;
  monthName = MONTH_NAMES[this.month - 1];

  get filtered(): Income[] {
    let list = this.searchText.trim()
      ? this.incomes.filter(i => i.description.toLowerCase().includes(this.searchText.toLowerCase()))
      : [...this.incomes];
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
    private incomesService: IncomesService,
    private categoriesService: CategoriesService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private router: Router,
  ) {}

  ngOnInit() { this.buildForm(); this.loadData(); }
  ionViewWillEnter() { this.loadData(); }

  get bankBalance(): { bank: string; total: number }[] {
    const map = new Map<string, number>();
    for (const i of this.incomes) {
      const b = i.bank?.trim() || 'Sin banco';
      map.set(b, (map.get(b) ?? 0) + i.amount);
    }
    return Array.from(map.entries()).map(([bank, total]) => ({ bank, total })).sort((a, b) => b.total - a.total);
  }

  buildForm() {
    this.form = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      categoryId: ['', Validators.required],
      date: [this.todayLocal(), Validators.required],
      bank: [''],
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
      incomes: this.incomesService.getAll(this.year, this.month),
      categories: this.categoriesService.getAll('income'),
    }).subscribe({
      next: ({ incomes, categories }) => {
        this.incomes = incomes;
        this.categories = categories;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  goToCategories(): void { this.router.navigate(['/tabs/categorias']); }

  async quickNewCategory(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Nueva categoría de ingreso',
      inputs: [{ name: 'name', type: 'text', placeholder: 'Nombre (ej: Salario)' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: (data) => {
            if (!data.name?.trim()) return false;
            this.categoriesService.create({ name: data.name.trim(), type: 'income', color: '#22c55e', icon: 'cash' })
              .subscribe({ next: (cat) => { this.categories = [...this.categories, cat]; this.form.patchValue({ categoryId: cat._id }); this.showToast('Categoría creada'); } });
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  openAdd() { this.editingId = null; this.buildForm(); this.showModal = true; }

  openEdit(income: Income) {
    this.editingId = income._id;
    this.form.patchValue({
      description: income.description,
      amount: income.amount,
      categoryId: (income.categoryId as any)?._id || income.categoryId,
      date: (income.date as string)?.substring(0, 10),
      bank: income.bank || '',
      notes: income.notes || '',
    });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  async onSave() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
    await loading.present();
    const payload = {
      ...this.form.value,
      amount: +this.form.value.amount,
      notes: this.form.value.notes ?? '',
      bank: this.form.value.bank ?? '',
    };
    const req = this.editingId
      ? this.incomesService.update(this.editingId, payload)
      : this.incomesService.create(payload);
    req.subscribe({
      next: async () => {
        await loading.dismiss();
        this.showModal = false;
        this.loadData();
        this.showToast(this.editingId ? 'Ingreso actualizado' : 'Ingreso agregado');
      },
      error: async () => { await loading.dismiss(); this.showToast('Error al guardar', 'danger'); },
    });
  }

  async onDelete(income: Income) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar ingreso',
      message: `¿Eliminar "${income.description}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: () => {
            this.incomesService.delete(income._id).subscribe({
              next: () => { this.loadData(); this.showToast('Ingreso eliminado'); },
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

  get total() { return this.filtered.reduce((sum, i) => sum + i.amount, 0); }

  private async showToast(message: string, color = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
