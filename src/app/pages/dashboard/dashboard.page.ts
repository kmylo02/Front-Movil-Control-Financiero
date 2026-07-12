import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout, finalize } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService } from '../../core/services/reports.service';
import { BillItemsService } from '../../core/services/bill-items.service';
import { ExpensesService } from '../../core/services/expenses.service';
import { IncomesService } from '../../core/services/incomes.service';
import { RecurringService } from '../../core/services/recurring.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { MonthlySummary, BillItem, Expense, Income, Recurring, YearlySummary, MONTH_NAMES } from '../../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild('donutCanvas')   donutCanvas!:   ElementRef;
  @ViewChild('yearBarCanvas') yearBarCanvas!: ElementRef;

  user$        = this.auth.currentUser$;
  unreadCount$ = this.notifications.unreadCount$;

  today     = new Date();
  year      = this.today.getFullYear();
  month     = this.today.getMonth() + 1;
  monthName = MONTH_NAMES[this.month - 1];
  todayDay  = this.today.getDate();

  summary:          MonthlySummary | null = null;
  prevSummary:      MonthlySummary | null = null;
  agendaBills:      BillItem[]  = [];
  recentExpenses:   Expense[]   = [];
  recentIncomes:    Income[]    = [];
  pendingRecurring: Recurring[] = [];
  yearly:           YearlySummary | null = null;
  isLoading = true;
  private donutChart?:   Chart;
  private yearBarChart?: Chart;

  get prevMonthYear() { return this.month === 1 ? this.year - 1 : this.year; }
  get prevMonthNum()  { return this.month === 1 ? 12 : this.month - 1; }
  get prevMonthName() { return MONTH_NAMES[this.prevMonthNum - 1]; }
  get isCurrentMonth() { return this.year === this.today.getFullYear() && this.month === this.today.getMonth() + 1; }

  get agendaPending()      { return this.agendaBills.filter(b => b.status === 'pending'); }
  get agendaPaid()         { return this.agendaBills.filter(b => b.status === 'paid'); }
  get agendaTotalPending() { return this.agendaPending.reduce((s, b) => s + b.amount, 0); }
  get agendaTotalPaid()    { return this.agendaPaid.reduce((s, b) => s + b.amount, 0); }
  get agendaTotal()        { return this.agendaBills.reduce((s, b) => s + b.amount, 0); }
  get agendaPercent()      { return this.agendaTotal > 0 ? Math.round((this.agendaTotalPaid / this.agendaTotal) * 100) : 0; }
  get agendaSorted(): BillItem[] {
    const pending = this.agendaPending.slice().sort((a, b) => a.dueDay - b.dueDay);
    const paid    = this.agendaPaid.slice().sort((a, b) => a.dueDay - b.dueDay);
    return [...pending, ...paid];
  }

  isOverdue(b: BillItem)    { return b.status === 'pending' && this.year === this.today.getFullYear() && this.month === this.today.getMonth() + 1 && b.dueDay < this.todayDay; }
  isDueToday(b: BillItem)   { return b.status === 'pending' && this.year === this.today.getFullYear() && this.month === this.today.getMonth() + 1 && b.dueDay === this.todayDay; }
  billCatColor(b: BillItem) { return typeof b.categoryId === 'object' ? (b.categoryId as any).color : '#6366f1'; }
  billCatName(b: BillItem)  { return typeof b.categoryId === 'object' ? (b.categoryId as any).name  : ''; }

  get totalGastado()      { return (this.summary?.totalExpenses ?? 0) + this.agendaTotalPaid; }
  get balance()           { return (this.summary?.totalIncomes ?? 0) - this.totalGastado; }
  get balanceProyectado() { return this.balance - this.agendaTotalPending; }
  get prevMonthBalance()  { return this.prevSummary?.balance ?? 0; }
  get totalDisponible()   { return this.prevMonthBalance + this.balance; }

  get budgetPercent() { return this.summary?.budget?.usagePercent ?? 0; }
  get budgetTotal()   { return this.summary?.budget?.budget?.totalLimit ?? 0; }
  get budgetColor()   { const p = this.budgetPercent; return p >= 100 ? 'danger' : p >= 80 ? 'warning' : 'success'; }

  constructor(
    private auth:             AuthService,
    private reports:          ReportsService,
    private billItemsService: BillItemsService,
    private expensesService:  ExpensesService,
    private incomesService:   IncomesService,
    private recurringService: RecurringService,
    private notifications:    NotificationsService,
    private router:           Router,
  ) {}

  ngOnInit()         { this.loadData(); }
  ngOnDestroy()      { this.donutChart?.destroy(); this.yearBarChart?.destroy(); }
  ionViewWillEnter() { this.notifications.getUnreadCount().subscribe(); }

  changeMonth(dir: number) {
    this.month += dir;
    if (this.month > 12) { this.month = 1; this.year++; }
    if (this.month < 1)  { this.month = 12; this.year--; }
    this.monthName = MONTH_NAMES[this.month - 1];
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      summary:          this.reports.getMonthly(this.year, this.month).pipe(timeout(15000), catchError(() => of(null))),
      prevSummary:      this.reports.getMonthly(this.prevMonthYear, this.prevMonthNum).pipe(timeout(15000), catchError(() => of(null))),
      bills:            this.billItemsService.getByMonth(this.year, this.month).pipe(timeout(15000), catchError(() => of([]))),
      expenses:         this.expensesService.getAll(this.year, this.month).pipe(timeout(15000), catchError(() => of([]))),
      incomes:          this.incomesService.getAll(this.year, this.month).pipe(timeout(15000), catchError(() => of([]))),
      pendingRecurring: this.recurringService.getPending().pipe(timeout(15000), catchError(() => of([]))),
      yearly:           this.reports.getYearly(this.year).pipe(timeout(15000), catchError(() => of(null))),
    }).pipe(
      finalize(() => { this.isLoading = false; }),
    ).subscribe({
      next: ({ summary, prevSummary, bills, expenses, incomes, pendingRecurring, yearly }) => {
        this.summary          = summary as MonthlySummary | null;
        this.prevSummary      = prevSummary as MonthlySummary | null;
        this.agendaBills      = bills as BillItem[];
        this.recentExpenses   = (expenses as Expense[]).slice(0, 5);
        this.recentIncomes    = (incomes as Income[]).slice(0, 5);
        this.pendingRecurring = pendingRecurring as Recurring[];
        this.yearly           = yearly as YearlySummary | null;
        setTimeout(() => { this.renderDonut(); this.renderYearBar(); }, 100);
      },
    });
  }

  toggleBill(bill: BillItem) {
    this.billItemsService.toggle(bill._id).subscribe(() => {
      this.billItemsService.getByMonth(this.year, this.month)
        .subscribe(bills => { this.agendaBills = bills; });
    });
  }

  private renderYearBar() {
    if (!this.yearBarCanvas || !this.yearly) return;
    this.yearBarChart?.destroy();
    const labels = MONTH_NAMES.map(m => m.substring(0, 3));
    this.yearBarChart = new Chart(this.yearBarCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Ingresos', data: this.yearly.months.map(m => m.incomes),  backgroundColor: '#22c55e', borderRadius: 4 },
          { label: 'Gastos',   data: this.yearly.months.map(m => m.expenses), backgroundColor: '#ef4444', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  private renderDonut() {
    if (!this.donutCanvas || !this.summary?.byCategory?.length) return;
    this.donutChart?.destroy();
    this.donutChart = new Chart(this.donutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels:   this.summary.byCategory.map(c => c.category?.name || ''),
        datasets: [{
          data:            this.summary.byCategory.map(c => c.total),
          backgroundColor: this.summary.byCategory.map((c: any) => c.category?.color ?? '#6366f1'),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } },
        cutout: '68%',
      },
    });
  }

  expCatColor(e: Expense): string { return typeof e.categoryId === 'object' ? (e.categoryId as any).color ?? '#ef4444' : '#ef4444'; }
  incCatColor(i: Income):  string { return typeof i.categoryId === 'object' ? (i.categoryId as any).color ?? '#22c55e' : '#22c55e'; }

  logout() { this.auth.logout(); this.router.navigateByUrl('/auth/login', { replaceUrl: true }); }
}
