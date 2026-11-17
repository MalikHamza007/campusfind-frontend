import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { Message } from 'primeng/message';
import { Tag } from 'primeng/tag';
import { Avatar } from 'primeng/avatar';
import { ROLE_ICON, ROLE_LABEL, ROLE_SEVERITY } from '../../core/constants/permissions';
import { FileUpload, FileSelectEvent } from 'primeng/fileupload';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { FilesService, UsersService } from '../../core/services/data.services';
import { NotifyService } from '../../core/services/notify.service';
import { User } from '../../core/interfaces/models';
import { applyServerErrors, errorMessage } from '../../core/utils/api-error';
import { initials } from '../../core/utils/format';
import { PageHeader } from '../../shared/components/page-header';
import { SecureImage } from '../../shared/components/secure-image';
import { PASSWORD_RULES, strongPassword } from '../auth/register/register';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, ReactiveFormsModule, Button, InputText, Password, Select, Message, Tag, Avatar, FileUpload, PageHeader, SecureImage],
  templateUrl: './profile.html',
})
export class ProfilePage implements OnInit {
  readonly roleLabel = ROLE_LABEL;
  readonly roleIcon = ROLE_ICON;
  readonly roleSeverity = ROLE_SEVERITY;
  auth = inject(AuthService);
  private users = inject(UsersService);
  private files = inject(FilesService);
  private notify = inject(NotifyService);
  private fb = inject(FormBuilder);
  user = signal<User | null>(null);
  saving = signal(false);
  savingPw = signal(false);
  uploadingAvatar = signal(false);
  pwError = signal<string | null>(null);
  rules = PASSWORD_RULES;
  initials = initials;
  departments = ['Computer Science', 'Business Administration', 'Engineering', 'English', 'Lost & Found Office'];

  profile = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    department: ['', Validators.required],
    phone: ['', Validators.pattern(/^\+?[0-9 \-]{10,16}$/)],
  });
  password = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, strongPassword]],
  });

  ngOnInit() { this.load(); }
  load() {
    this.users.get(this.auth.user()!.id).subscribe({
      next: (u) => { this.user.set(u); this.profile.reset({ fullName: u.fullName, department: u.department, phone: u.phone ?? '' }); },
      error: (err) => this.notify.error('Profile could not load', errorMessage(err)),
    });
  }
  passed(test: (v: string) => boolean) { return test(this.password.controls.newPassword.value); }

  save() {
    if (this.profile.invalid) { this.profile.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.profile.getRawValue();
    this.users.update(this.auth.user()!.id, { ...v, phone: v.phone || null }).subscribe({
      next: (u) => { this.saving.set(false); this.user.set(u); this.auth.updateUser(u); this.profile.markAsPristine(); this.notify.success('Profile saved'); },
      error: (err) => { this.saving.set(false); applyServerErrors(this.profile, err); this.notify.error('Could not save', errorMessage(err)); },
    });
  }

  changePassword() {
    this.pwError.set(null);
    if (this.password.invalid) { this.password.markAllAsTouched(); return; }
    this.savingPw.set(true);
    const v = this.password.getRawValue();
    this.users.changePassword(v.currentPassword, v.newPassword).subscribe({
      next: () => { this.savingPw.set(false); this.password.reset(); this.notify.success('Password changed', 'Other devices have been signed out.'); },
      error: (err) => { this.savingPw.set(false); applyServerErrors(this.password, err); this.pwError.set(errorMessage(err)); },
    });
  }

  avatar(e: FileSelectEvent) {
    const file = e.currentFiles[0];
    if (!file) return;
    this.uploadingAvatar.set(true);
    this.files.upload(file, 'avatar').pipe(
      switchMap((p) => (p.file ? this.users.update(this.auth.user()!.id, { avatarFileId: p.file.id }) : [])),
    ).subscribe({
      next: (u) => { if (u) { this.user.set(u as User); this.auth.updateUser(u as User); } },
      error: (err) => { this.uploadingAvatar.set(false); this.notify.error('Photo not updated', errorMessage(err)); },
      complete: () => { this.uploadingAvatar.set(false); this.notify.success('Profile photo updated'); },
    });
  }
}
