import { Component } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {

  constructor(
    private actionSheetCtrl: ActionSheetController,
    private router: Router,
  ) {}

  async openMore() {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Más opciones',
      cssClass: 'more-action-sheet',
      buttons: [
        {
          text: 'Recurrentes',
          icon: 'repeat-outline',
          handler: () => this.router.navigateByUrl('/tabs/recurrentes'),
        },
        {
          text: 'Reportes',
          icon: 'bar-chart-outline',
          handler: () => this.router.navigateByUrl('/tabs/reportes'),
        },
        {
          text: 'Categorías',
          icon: 'pricetags-outline',
          handler: () => this.router.navigateByUrl('/tabs/categorias'),
        },
        {
          text: 'Cancelar',
          icon: 'close-outline',
          role: 'cancel',
        },
      ],
    });
    await sheet.present();
  }
}
