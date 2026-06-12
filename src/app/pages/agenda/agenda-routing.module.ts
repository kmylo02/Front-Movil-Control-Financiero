import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgendaPage } from './agenda.page';

const routes: Routes = [{ path: '', component: AgendaPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class AgendaPageRoutingModule {}
