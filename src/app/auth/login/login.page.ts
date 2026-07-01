import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { BiometricService } from '../../core/services/biometric.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  standalone: false,
})
export class LoginPage implements OnInit {
  form: FormGroup;
  showPassword    = false;
  showBiometric   = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private biometric: BiometricService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async ngOnInit() {
    const available = await this.biometric.isAvailable();
    const hasStored = available ? await this.biometric.hasStoredCredentials() : false;
    this.showBiometric = available && hasStored;
  }

  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const loading = await this.loadingCtrl.create({ message: 'Iniciando sesión...' });
    await loading.present();
    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      next: async () => {
        await loading.dismiss();
        await this.offerBiometric(email, password);
        this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
      },
      error: async (err) => {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Error',
          message: err.error?.message || 'Credenciales inválidas',
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  async loginWithBiometric() {
    let loading: any = null;
    try {
      // 1. Verificar huella ANTES de mostrar loading
      const { email, password } = await this.biometric.verify();

      // 2. Huella ok → mostrar loading y hacer login real
      loading = await this.loadingCtrl.create({ message: 'Iniciando sesión...' });
      await loading.present();

      this.auth.login(email, password).subscribe({
        next: async () => {
          await loading?.dismiss();
          this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
        },
        error: async () => {
          await loading?.dismiss();
          // Limpiar credenciales viejas ANTES de mostrar el alert
          await this.biometric.deleteCredentials();
          this.showBiometric = false;
          const alert = await this.alertCtrl.create({
            header: '¿Cambió tu contraseña?',
            message: 'Las credenciales guardadas ya no son válidas. Inicia sesión con tu contraseña para reactivar la huella.',
            buttons: ['OK'],
          });
          await alert.present();
        },
      });
    } catch {
      // Usuario canceló la huella o el dispositivo falló — no hacer nada
      await loading?.dismiss();
    }
  }

  async ionViewWillEnter() {
    const available = await this.biometric.isAvailable();
    const hasStored = available ? await this.biometric.hasStoredCredentials() : false;
    this.showBiometric = available && hasStored;
  }

  private async offerBiometric(email: string, password: string): Promise<void> {
    const available = await this.biometric.isAvailable();
    if (!available) return;

    const alreadyStored = await this.biometric.hasStoredCredentials();
    if (alreadyStored) {
      // Actualiza las credenciales guardadas sin molestar al usuario
      this.biometric.saveCredentials(email, password).catch(() => {});
      return;
    }

    const alert = await this.alertCtrl.create({
      header: '¿Habilitar huella?',
      message: 'Activa el acceso con huella dactilar para ingresar más rápido.',
      buttons: [
        { text: 'Ahora no', role: 'cancel' },
        { text: 'Activar', handler: () => { this.biometric.saveCredentials(email, password).catch(() => {}); } },
      ],
    });
    await alert.present();
    await alert.onDidDismiss();
  }

  goRegister() { this.router.navigateByUrl('/auth/register'); }
}
