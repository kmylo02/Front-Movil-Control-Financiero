import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { BillItemsService } from '../../core/services/bill-items.service';
import { CategoriesService } from '../../core/services/categories.service';
import { BillItem, Category, MONTH_NAMES } from '../../core/models';

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.page.html',
  standalone: false,
})
export class AgendaPage implements OnInit {
  bills: BillItem[]     = [];
  categories: Category[] = [];
  isLoading = true;
  showModal = false;
  editingId: string | null = null;
  form!: FormGroup;

  today    = new Date();
  year     = this.today.getFullYear();
  month    = this.today.getMonth() + 1;
  todayDay = this.today.getDate();
  dayFilter: number | null = null;

  get monthName() { return MONTH_NAMES[this.month - 1]; }

  get activeDays(): number[] {
    const days = [...new Set(this.bills.map(b => b.dueDay))];
    return days.sort((a, b) => a - b);
  }

  get filteredBills(): BillItem[] {
    const base = this.dayFilter !== null
      ? this.bills.filter(b => b.dueDay === this.dayFilter)
      : this.bills;
    return [...base].sort((a, b) => {
      if (a.status === b.status) return a.dueDay - b.dueDay;
      return a.status === 'pending' ? -1 : 1;
    });
  }

  get pending()   { return this.filteredBills.filter(b => b.status === 'pending'); }
  get paid()      { return this.filteredBills.filter(b => b.status === 'paid'); }
  get totalPending() { return this.pending.reduce((s, b) => s + b.amount, 0); }
  get totalPaid()    { return this.paid.reduce((s, b) => s + b.amount, 0); }
  get paidPercent()  {
    const total = this.filteredBills.reduce((s, b) => s + b.amount, 0);
    return total > 0 ? Math.round((this.totalPaid / total) * 100) : 0;
  }

  setDayFilter(day: number | null) {
    this.dayFilter = this.dayFilter === day ? null : day;
  }

  billCountForDay(day: number): number {
    return this.bills.filter(b => b.dueDay === day).length;
  }

  isOverdue(bill: BillItem): boolean {
    return bill.status === 'pending'
      && this.year === this.today.getFullYear()
      && this.month === this.today.getMonth() + 1
      && bill.dueDay < this.todayDay;
  }

  isDueToday(bill: BillItem): boolean {
    return bill.status === 'pending'
      && this.year === this.today.getFullYear()
      && this.month === this.today.getMonth() + 1
      && bill.dueDay === this.todayDay;
  }

  constructor(
    private billItemsService: BillItemsService,
    private categoriesService: CategoriesService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() { this.buildForm(); this.loadData(); }
  ionViewWillEnter() { this.loadData(); }

  buildForm(bill?: BillItem) {
    const catId = bill?.categoryId
      ? (typeof bill.categoryId === 'object' ? (bill.categoryId as Category)._id : bill.categoryId)
      : '';
    this.form = this.fb.group({
      name:        [bill?.name ?? '',          Validators.required],
      amount:      [bill?.amount ?? null,       [Validators.required, Validators.min(0)]],
      categoryId:  [catId,                     ''],
      dueDay:      [bill?.dueDay ?? this.todayDay, [Validators.required, Validators.min(1), Validators.max(31)]],
      isRecurring: [bill?.isRecurring ?? false],
      notes:       [bill?.notes ?? ''],
    });
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      bills: this.billItemsService.getByMonth(this.year, this.month),
      cats:  this.categoriesService.getAll(),
    }).subscribe({
      next: ({ bills, cats }) => {
        this.bills = bills;
        this.categories = cats;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  changeMonth(dir: number) {
    this.month += dir;
    if (this.month > 12) { this.month = 1; this.year++; }
    if (this.month < 1)  { this.month = 12; this.year--; }
    this.loadData();
  }

  async quickNewCategory(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Nueva categoría',
      inputs: [{ name: 'name', type: 'text', placeholder: 'Nombre (ej: Servicios)' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: (data) => {
            if (!data.name?.trim()) return false;
            this.categoriesService.create({ name: data.name.trim(), type: 'expense', color: '#6366f1', icon: 'calendar' })
              .subscribe({ next: (cat) => { this.categories = [...this.categories, cat]; this.form.patchValue({ categoryId: cat._id }); } });
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  openAdd() { this.editingId = null; this.buildForm(); this.showModal = true; }

  openEdit(bill: BillItem) {
    this.editingId = bill._id;
    this.buildForm(bill);
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  async onSave() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const data = {
      ...this.form.value,
      amount: +this.form.value.amount,
      dueDay: +this.form.value.dueDay,
      year:   this.year,
      month:  this.month,
      categoryId: this.form.value.categoryId || undefined,
    };
    const req = this.editingId
      ? this.billItemsService.update(this.editingId, data)
      : this.billItemsService.create(data);
    req.subscribe({
      next: () => { this.showModal = false; this.loadData(); this.showToast('Guardado'); },
      error: () => this.showToast('Error al guardar', 'danger'),
    });
  }

  toggle(bill: BillItem) {
    this.billItemsService.toggle(bill._id).subscribe(() => this.loadData());
  }

  async confirmDelete(bill: BillItem) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar pago',
      message: `¿Eliminar "${bill.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: () => {
            this.billItemsService.delete(bill._id).subscribe({
              next: () => { this.loadData(); this.showToast('Eliminado'); },
              error: () => this.showToast('Error', 'danger'),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  async copyToNextMonth() {
    const alert = await this.alertCtrl.create({
      header: 'Copiar recurrentes',
      message: 'Se copiarán los pagos marcados como recurrentes al siguiente mes.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Copiar',
          handler: () => {
            this.billItemsService.copyToNextMonth(this.year, this.month).subscribe({
              next: () => this.showToast('Recurrentes copiados al siguiente mes'),
              error: () => this.showToast('Error', 'danger'),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  catName(bill: BillItem): string {
    return typeof bill.categoryId === 'object' ? (bill.categoryId as Category).name : '';
  }

  catColor(bill: BillItem): string {
    return typeof bill.categoryId === 'object' ? (bill.categoryId as Category).color : '#6366f1';
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  }

  private async showToast(message: string, color = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
