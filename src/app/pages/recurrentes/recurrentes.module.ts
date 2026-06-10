import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RecurrentesPageRoutingModule } from './recurrentes-routing.module';
import { RecurrentesPage } from './recurrentes.page';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, RecurrentesPageRoutingModule],
  declarations: [RecurrentesPage],
})
export class RecurrentesPageModule {}
