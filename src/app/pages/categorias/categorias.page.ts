import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { CategoriesService } from '../../core/services/categories.service';
import { Category } from '../../core/models';

const COLORS = ['#6366f1','#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#8b5cf6','#ec4899','#64748b','#84cc16','#06b6d4'];

@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.page.html',
  styleUrls: ['./categorias.page.scss'],
})
export class CategoriasPage implements OnInit {
  categories: Category[] = [];
  loading  = true;
  segment: 'expense' | 'income' = 'expense';
  colors = COLORS;

  constructor(
    private categoriesService: CategoriesService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void { this.load(); }

  ionViewWillEnter(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.categoriesService.getAll().subscribe({
      next: cats => { this.categories = cats; this.loading = false; },
      error: ()   => { this.loading = false; },
    });
  }

  get filtered(): Category[] {
    return this.categories.filter(c => c.type === this.segment || c.type === 'both');
  }

  async openForm(cat?: Category): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: cat ? 'Editar categoría' : 'Nueva categoría',
      inputs: [
        { name: 'name',  type: 'text',   value: cat?.name  ?? '', placeholder: 'Nombre' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: cat ? 'Actualizar' : 'Crear',
          handler: async (data) => {
            if (!data.name?.trim()) return false;
            const payload: Partial<Category> = {
              name:  data.name.trim(),
              type:  this.segment,
              color: cat?.color ?? '#6366f1',
              icon:  cat?.icon  ?? 'receipt',
            };
            const op = cat
              ? this.categoriesService.update(cat._id, payload)
              : this.categoriesService.create(payload);
            op.subscribe({ next: () => { this.load(); this.toast(cat ? 'Categoría actualizada' : 'Categoría creada'); } });
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async pickColor(cat: Category): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Elige un color',
      inputs: this.colors.map(c => ({
        type:    'radio' as const,
        label:   c,
        value:   c,
        checked: cat.color === c,
      })),
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aplicar',
          handler: (color) => {
            this.categoriesService.update(cat._id, { ...cat, color }).subscribe({ next: () => this.load() });
          },
        },
      ],
    });
    await alert.present();
  }

  async confirmDelete(cat: Category): Promise<void> {
    const alert = await this.alertCtrl.create({
      header:  'Eliminar categoría',
      message: `¿Eliminar "${cat.name}"? Los gastos asociados no se eliminarán.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: () => {
            this.categoriesService.delete(cat._id).subscribe({ next: () => { this.load(); this.toast('Categoría eliminada'); } });
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(msg: string): Promise<void> {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, position: 'bottom', color: 'success' });
    await t.present();
  }
}
