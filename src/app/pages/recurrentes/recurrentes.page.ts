import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { RecurringService } from '../../core/services/recurring.service';
import { CategoriesService } from '../../core/services/categories.service';
import { Recurring, Category } from '../../core/models';


@Component({
  selector: 'app-recurrentes',
  templateUrl: './recurrentes.page.html',
  standalone: false,
})
export class RecurrentesPage implements OnInit {
  recurrentes: Recurring[] = [];
  pending: Recurring[] = [];
  categories: Category[] = [];
  isLoading = true;
  showModal = false;
  editingId: string | null = null;
  form!: FormGroup;
  selectedSegment = 'lista';

  modes = [
    { value: 'auto', label: 'Automático', icon: 'flash-outline', desc: 'Se genera el día 1 del mes' },
    { value: 'manual', label: 'Manual', icon: 'hand-left-outline', desc: 'Confirmas cada mes' },
    { value: 'template', label: 'Plantilla', icon: 'copy-outline', desc: 'Copias y ajustas el monto' },
  ];

  constructor(
    private recurringService: RecurringService,
    private categoriesService: CategoriesService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() { this.buildForm(); this.loadData(); }
  ionViewWillEnter() { this.loadData(); }

  buildForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      categoryId: ['', Validators.required],
      mode: ['manual', Validators.required],
      dayOfMonth: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
    });
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      all: this.recurringService.getAll(),
      pending: this.recurringService.getPending(),
      categories: this.categoriesService.getAll('expense'),
    }).subscribe({
      next: ({ all, pending, categories }) => {
        this.recurrentes = all;
        this.pending = pending;
        this.categories = categories;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  async quickNewCategory(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Nueva categoría',
      inputs: [{ name: 'name', type: 'text', placeholder: 'Nombre (ej: Suscripciones)' }],
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

  openEdit(r: Recurring) {
    this.editingId = r._id;
    this.form.patchValue({
      name: r.name,
      amount: r.amount,
      categoryId: (r.categoryId as any)?._id || r.categoryId,
      mode: r.mode,
      dayOfMonth: r.dayOfMonth,
    });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  async onSave() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
    await loading.present();
    const req = this.editingId
      ? this.recurringService.update(this.editingId, this.form.value)
      : this.recurringService.create(this.form.value);
    req.subscribe({
      next: async () => {
        await loading.dismiss();
        this.showModal = false;
        this.loadData();
        this.showToast('Recurrente guardado');
      },
      error: async () => { await loading.dismiss(); this.showToast('Error al guardar', 'danger'); },
    });
  }

  async onDelete(r: Recurring) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar recurrente',
      message: `¿Eliminar "${r.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: () => {
            this.recurringService.delete(r._id).subscribe({
              next: () => { this.loadData(); this.showToast('Eliminado'); },
              error: () => this.showToast('Error', 'danger'),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  async activatePending(r: Recurring) {
    if (r.mode === 'template') {
      const alert = await this.alertCtrl.create({
        header: 'Confirmar monto',
        message: `Monto base: ${r.amount}. ¿Cuánto pagar este mes?`,
        inputs: [{ name: 'amount', type: 'number', value: r.amount, placeholder: 'Monto' }],
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Confirmar',
            handler: (data) => {
              this.recurringService.activate(r._id, parseFloat(data['amount'])).subscribe({
                next: () => { this.loadData(); this.showToast('Gasto generado'); },
                error: () => this.showToast('Error', 'danger'),
              });
            },
          },
        ],
      });
      await alert.present();
    } else {
      this.recurringService.activate(r._id).subscribe({
        next: () => { this.loadData(); this.showToast('Gasto generado'); },
        error: () => this.showToast('Error al activar', 'danger'),
      });
    }
  }

  getModeIcon(mode: string): string {
    return this.modes.find(m => m.value === mode)?.icon || 'repeat-outline';
  }

  getModeLabel(mode: string): string {
    return this.modes.find(m => m.value === mode)?.label || mode;
  }

  getCategoryName(categoryId: any): string {
    if (typeof categoryId === 'object') return categoryId?.name || '';
    return this.categories.find(c => c._id === categoryId)?.name || '';
  }

  private async showToast(message: string, color = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
