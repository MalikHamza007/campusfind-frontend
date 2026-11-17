import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Message } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';
import { errorMessage } from '../../../core/utils/api-error';
import { safeReturnUrl } from '../../../core/utils/format';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Button, InputText, Password, Message],
  templateUrl: './login.html',
})
export class LoginPage {
  returnUrl = input<string>();
  expired = input<string>();
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim().toLowerCase(), password).subscribe({
      next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
      error: (err) => {
        this.error.set(errorMessage(err, 'Sign-in failed. Try again.'));
        this.loading.set(false);
      },
    });
  }
}
