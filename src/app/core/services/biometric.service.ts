import { Injectable } from '@angular/core';
import { NativeBiometric } from 'capacitor-native-biometric';

const SERVER = 'control-financiero-app';

@Injectable({ providedIn: 'root' })
export class BiometricService {

  async isAvailable(): Promise<boolean> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch {
      return false;
    }
  }

  async hasStoredCredentials(): Promise<boolean> {
    try {
      const creds = await NativeBiometric.getCredentials({ server: SERVER });
      return !!creds?.password;
    } catch {
      return false;
    }
  }

  async saveCredentials(email: string, password: string): Promise<void> {
    await NativeBiometric.setCredentials({
      username: email,
      password: password,
      server: SERVER,
    });
  }

  async verify(): Promise<{ email: string; password: string }> {
    await NativeBiometric.verifyIdentity({
      reason: 'Verifica tu identidad para acceder',
      title: 'Control Financiero',
      subtitle: 'Login con huella dactilar',
      description: '',
      maxAttempts: 3,
      useFallback: true,
      negativeButtonText: 'Cancelar',
    });
    const creds = await NativeBiometric.getCredentials({ server: SERVER });
    return { email: creds.username, password: creds.password };
  }

  async deleteCredentials(): Promise<void> {
    try {
      await NativeBiometric.deleteCredentials({ server: SERVER });
    } catch { /* already deleted */ }
  }
}
