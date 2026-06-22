import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, ToastController } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { ReportsService } from '../../core/services/reports.service';
import { BudgetsService } from '../../core/services/budgets.service';
import { CategoriesService } from '../../core/services/categories.service';
import { MonthlySummary, MonthComparison, MONTH_NAMES } from '../../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: false,
})
export class ReportesPage implements OnInit {
  @ViewChild('barCanvas') barCanvas!: ElementRef;

  selectedSegment = 'reportes';

  today = new Date();
  year = this.today.getFullYear();
  month = this.today.getMonth() + 1;
  monthName = MONTH_NAMES[this.month - 1];

  comparison: MonthComparison | null = null;
  summary: MonthlySummary | null = null;
  isLoading = true;

  budgetForm!: FormGroup;
  showBudgetModal = false;

  private barChart?: Chart;

  constructor(
    private reports: ReportsService,
    private budgets: BudgetsService,
    private categoriesService: CategoriesService,
    private fb: FormBuilder,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {
    this.buildBudgetForm();
    this.loadData();
  }

  ionViewWillEnter() { this.loadData(); }

  buildBudgetForm() {
    this.budgetForm = this.fb.group({
      totalLimit: [null, [Validators.required, Validators.min(0)]],
    });
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      comparison: this.reports.compareMonths(this.year, this.month),
      summary: this.reports.getMonthly(this.year, this.month),
    }).subscribe({
      next: ({ comparison, summary }) => {
        this.comparison = comparison;
        this.summary = summary;
        this.isLoading = false;
        setTimeout(() => this.renderBar(), 150);
      },
      error: () => { this.isLoading = false; },
    });
  }

  renderBar() {
    if (!this.barCanvas || !this.comparison) return;
    this.barChart?.destroy();
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Mes anterior', 'Mismo mes año ant.', 'Mes actual'],
        datasets: [{
          label: 'Gastos totales',
          data: [
            this.comparison.previousMonth?.totalGastado || 0,
            this.comparison.sameMonthLastYear?.totalGastado || 0,
            this.comparison.current?.totalGastado || 0,
          ],
          backgroundColor: ['#94a3b8', '#f59e0b', '#6366f1'],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  openBudgetModal() {
    const existing = this.summary?.budget?.budget?.totalLimit;
    this.budgetForm.patchValue({ totalLimit: existing ?? null });
    this.showBudgetModal = true;
  }

  closeBudgetModal() { this.showBudgetModal = false; }

  async saveBudget() {
    if (this.budgetForm.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
    await loading.present();
    this.budgets.upsert({
      year: this.year,
      month: this.month,
      totalLimit: this.budgetForm.value.totalLimit,
    }).subscribe({
      next: async () => {
        await loading.dismiss();
        this.showBudgetModal = false;
        this.loadData();
        this.showToast('Presupuesto guardado');
      },
      error: async () => { await loading.dismiss(); this.showToast('Error', 'danger'); },
    });
  }

  get budgetTotal(): number { return this.summary?.budget?.budget?.totalLimit ?? 0; }
  get budgetSpent(): number { return this.summary?.budget?.totalSpent ?? 0; }
  get budgetPercent(): number { return this.summary?.budget?.usagePercent ?? 0; }

  get budgetColor(): string {
    const p = this.budgetPercent;
    return p >= 100 ? 'danger' : p >= 80 ? 'warning' : 'success';
  }

  diffPercent(current: number, prev: number): string {
    if (!prev) return 'N/A';
    const diff = ((current - prev) / prev * 100).toFixed(1);
    return `${parseFloat(diff) > 0 ? '+' : ''}${diff}%`;
  }

  diffColor(current: number, prev: number): string {
    if (!prev) return 'medium';
    return current > prev ? 'danger' : 'success';
  }

  get currentTotalGastado(): number { return this.comparison?.current?.totalGastado ?? 0; }
  get currentBalance(): number { return this.comparison?.current?.balance ?? 0; }
  get currentIncomes(): number { return this.comparison?.current?.incomes ?? 0; }
  get summaryTotalGastado(): number { return this.summary?.totalGastado ?? 0; }
  get summaryBalance(): number { return this.summary?.balance ?? 0; }

  prevMonth() {
    this.month--; if (this.month < 1) { this.month = 12; this.year--; }
    this.monthName = MONTH_NAMES[this.month - 1]; this.loadData();
  }

  nextMonth() {
    this.month++; if (this.month > 12) { this.month = 1; this.year++; }
    this.monthName = MONTH_NAMES[this.month - 1]; this.loadData();
  }

  private async showToast(message: string, color = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
