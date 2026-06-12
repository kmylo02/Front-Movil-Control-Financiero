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
      next: async (res) => {
        await loading.dismiss();
        await this.offerBiometric(email, res.access_token);
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
    try {
      const { token } = await this.biometric.verify();
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      if (user) {
        this.auth.restoreSession(token, user);
        this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
      } else {
        await this.showBiometricError();
      }
    } catch {
      await this.showBiometricError();
    }
  }

  private async offerBiometric(email: string, token: string): Promise<void> {
    const available = await this.biometric.isAvailable();
    if (!available) return;
    const alert = await this.alertCtrl.create({
      header: '¿Habilitar huella?',
      message: 'Activa el acceso con huella dactilar para ingresar más rápido la próxima vez.',
      buttons: [
        { text: 'Ahora no', role: 'cancel' },
        {
          text: 'Activar',
          handler: () => {
            this.biometric.saveCredentials(email, token)
              .catch(() => {});
          },
        },
      ],
    });
    await alert.present();
    await alert.onDidDismiss();
  }

  private async showBiometricError(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message: 'No se pudo verificar tu identidad. Usa tu contraseña.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  goRegister() { this.router.navigateByUrl('/auth/register'); }
}
