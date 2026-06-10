import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GastosPage } from './gastos.page';

const routes: Routes = [{ path: '', component: GastosPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GastosPageRoutingModule {}
