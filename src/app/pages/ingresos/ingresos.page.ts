import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IncomesService } from '../../core/services/incomes.service';
import { CategoriesService } from '../../core/services/categories.service';
import { Income, Category, MONTH_NAMES } from '../../core/models';

@Component({
  selector: 'app-ingresos',
  templateUrl: './ingresos.page.html',
  standalone: false,
})
export class IngresosPage implements OnInit {
  incomes: Income[] = [];
  categories: Category[] = [];
  isLoading = true;
  showModal = false;
  editingId: string | null = null;
  form!: FormGroup;

  today = new Date();
  year = this.today.getFullYear();
  month = this.today.getMonth() + 1;
  monthName = MONTH_NAMES[this.month - 1];

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

  buildForm() {
    this.form = this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      categoryId: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      notes: [''],
    });
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
      date: income.date?.toString().split('T')[0],
      notes: income.notes || '',
    });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  async onSave() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
    await loading.present();
    const req = this.editingId
      ? this.incomesService.update(this.editingId, this.form.value)
      : this.incomesService.create(this.form.value);
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

  get total() { return this.incomes.reduce((sum, i) => sum + i.amount, 0); }

  private async showToast(message: string, color = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
