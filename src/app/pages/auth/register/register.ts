import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { Message } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';
import { NotifyService } from '../../../core/services/notify.service';
import { applyServerErrors, errorMessage } from '../../../core/utils/api-error';

export const EMAIL_DOMAIN = 'campusfind.edu.pk';
export const PASSWORD_RULES = [
  { key: 'len', label: '8–72 characters', test: (v: string) => v.length >= 8 && v.length <= 72 },
  { key: 'lower', label: 'a lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { key: 'upper', label: 'an uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'num', label: 'a number', test: (v: string) => /\d/.test(v) },
  { key: 'sym', label: 'a symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];
export function strongPassword(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '');
  return PASSWORD_RULES.every((r) => r.test(v)) ? null : { weak: true };
}
export function universityEmail(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').toLowerCase().trim();
  return !v || v.endsWith('@' + EMAIL_DOMAIN) ? null : { domain: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Button, InputText, Password, Select, Message],
  templateUrl: './register.html',
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotifyService);
  loading = signal(false);
  error = signal<string | null>(null);
  rules = PASSWORD_RULES;
  domain = EMAIL_DOMAIN;
  departments = ['Computer Science', 'Business Administration', 'Engineering', 'English'];

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, universityEmail]],
    studentId: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2,5}-\d{4}-[A-Za-z]{2,5}-\d{3}$/)]],
    department: ['', Validators.required],
    phone: ['', Validators.pattern(/^\+?[0-9 \-]{10,16}$/)],
    password: ['', [Validators.required, strongPassword]],
  });

  passed(test: (v: string) => boolean) {
    return test(this.form.controls.password.value);
  }
  show(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    this.auth.register({ ...v, email: v.email.trim().toLowerCase(), studentId: v.studentId.toUpperCase(), phone: v.phone || undefined }).subscribe({
      next: () => {
        this.notify.success('Account created', 'Sign in with your new password.');
        void this.router.navigate(['/login']);
      },
      error: (err) => {
        if (!applyServerErrors(this.form, err)) this.error.set(errorMessage(err));
        else this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
