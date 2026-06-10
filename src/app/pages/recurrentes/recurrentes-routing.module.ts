import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RecurrentesPage } from './recurrentes.page';

const routes: Routes = [{ path: '', component: RecurrentesPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecurrentesPageRoutingModule {}
