import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('../pages/dashboard/dashboard.module').then(m => m.DashboardPageModule),
      },
      {
        path: 'gastos',
        loadChildren: () => import('../pages/gastos/gastos.module').then(m => m.GastosPageModule),
      },
      {
        path: 'ingresos',
        loadChildren: () => import('../pages/ingresos/ingresos.module').then(m => m.IngresosPageModule),
      },
      {
        path: 'recurrentes',
        loadChildren: () => import('../pages/recurrentes/recurrentes.module').then(m => m.RecurrentesPageModule),
      },
      {
        path: 'reportes',
        loadChildren: () => import('../pages/reportes/reportes.module').then(m => m.ReportesPageModule),
      },
      {
        path: 'categorias',
        loadChildren: () => import('../pages/categorias/categorias.module').then(m => m.CategoriasPageModule),
      },
      {
        path: 'agenda',
        loadChildren: () => import('../pages/agenda/agenda.module').then(m => m.AgendaPageModule),
      },
      { path: '', redirectTo: '/tabs/dashboard', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
