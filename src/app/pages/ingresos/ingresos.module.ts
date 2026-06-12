import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { IngresosPageRoutingModule } from './ingresos-routing.module';
import { IngresosPage } from './ingresos.page';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IonicModule, IngresosPageRoutingModule],
  declarations: [IngresosPage],
})
export class IngresosPageModule {}
