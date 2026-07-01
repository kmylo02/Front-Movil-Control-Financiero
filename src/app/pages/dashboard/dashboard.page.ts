import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService } from '../../core/services/reports.service';
import { BillItemsService } from '../../core/services/bill-items.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { MonthlySummary, BillItem, MONTH_NAMES } from '../../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild('donutCanvas') donutCanvas!: ElementRef;

  user$        = this.auth.currentUser$;
  unreadCount$ = this.notifications.unreadCount$;

  today     = new Date();
  year      = this.today.getFullYear();
  month     = this.today.getMonth() + 1;
  monthName = MONTH_NAMES[this.month - 1];
  todayDay  = this.today.getDate();

  summary:     MonthlySummary | null = null;
  prevSummary: MonthlySummary | null = null;
  agendaBills: BillItem[] = [];
  isLoading = true;
  private donutChart?: Chart;

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
    private notifications:    NotificationsService,
    private router:           Router,
  ) {}

  ngOnInit()         { this.loadData(); }
  ngOnDestroy()      { this.donutChart?.destroy(); }
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
      summary:     this.reports.getMonthly(this.year, this.month).pipe(catchError(() => of(null))),
      prevSummary: this.reports.getMonthly(this.prevMonthYear, this.prevMonthNum).pipe(catchError(() => of(null))),
      bills:       this.billItemsService.getByMonth(this.year, this.month).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ summary, prevSummary, bills }) => {
        this.summary     = summary as MonthlySummary | null;
        this.prevSummary = prevSummary as MonthlySummary | null;
        this.agendaBills = bills as BillItem[];
        this.isLoading   = false;
        setTimeout(() => this.renderDonut(), 100);
      },
      error: () => { this.isLoading = false; },
    });
  }

  toggleBill(bill: BillItem) {
    this.billItemsService.toggle(bill._id).subscribe(() => {
      this.billItemsService.getByMonth(this.year, this.month)
        .subscribe(bills => { this.agendaBills = bills; });
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

  logout() { this.auth.logout(); this.router.navigateByUrl('/auth/login', { replaceUrl: true }); }
}
