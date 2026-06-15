import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { GastosPageRoutingModule } from './gastos-routing.module';
import { GastosPage } from './gastos.page';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, IonicModule, GastosPageRoutingModule],
  declarations: [GastosPage],
})
export class GastosPageModule {}
