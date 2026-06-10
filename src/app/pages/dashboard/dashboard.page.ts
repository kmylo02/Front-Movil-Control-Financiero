import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService } from '../../core/services/reports.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { MonthlySummary, MONTH_NAMES } from '../../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  standalone: false,
})
export class DashboardPage implements OnInit {
  @ViewChild('donutCanvas') donutCanvas!: ElementRef;

  user$ = this.auth.currentUser$;
  unreadCount$ = this.notifications.unreadCount$;

  today = new Date();
  year = this.today.getFullYear();
  month = this.today.getMonth() + 1;
  monthName = MONTH_NAMES[this.month - 1];

  summary: MonthlySummary | null = null;
  isLoading = true;
  private donutChart?: Chart;

  constructor(
    private auth: AuthService,
    private reports: ReportsService,
    private notifications: NotificationsService,
    private router: Router,
  ) {}

  ngOnInit() { this.loadData(); }

  ionViewWillEnter() { this.notifications.getUnreadCount().subscribe(); }

  loadData() {
    this.isLoading = true;
    this.reports.getMonthly(this.year, this.month).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.isLoading = false;
        setTimeout(() => this.renderDonut(), 100);
      },
      error: () => { this.isLoading = false; },
    });
  }

  private renderDonut() {
    if (!this.donutCanvas || !this.summary?.byCategory?.length) return;
    this.donutChart?.destroy();
    const colors = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16'];
    this.donutChart = new Chart(this.donutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.summary.byCategory.map(c => c.category?.name || ''),
        datasets: [{
          data: this.summary.byCategory.map(c => c.total),
          backgroundColor: colors.slice(0, this.summary.byCategory.length),
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        cutout: '65%',
      },
    });
  }

  get balance() {
    if (!this.summary) return 0;
    return (this.summary.totalIncomes ?? 0) - this.summary.totalExpenses;
  }

  get budgetPercent(): number {
    return this.summary?.budget?.usagePercent ?? 0;
  }

  get budgetTotal(): number {
    return this.summary?.budget?.budget?.totalLimit ?? 0;
  }

  get budgetColor(): string {
    const p = this.budgetPercent;
    if (p >= 100) return 'danger';
    if (p >= 80) return 'warning';
    return 'success';
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }
}
