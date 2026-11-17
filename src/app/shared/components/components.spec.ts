import { TestBed } from '@angular/core/testing';
import { ItemStatusTag, CodeTag } from './tags';
import { KpiCard } from './kpi-card';
import { provideRouter } from '@angular/router';
import { strongPassword } from '../../pages/auth/register/register';
import { FormControl } from '@angular/forms';

describe('shared components', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('renders a human label for item status', async () => {
    const f = TestBed.createComponent(ItemStatusTag);
    f.componentRef.setInput('status', 'claim_pending');
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Claim pending');
  });
  it('renders the luggage-tag code', async () => {
    const f = TestBed.createComponent(CodeTag);
    f.componentRef.setInput('code', 'CF-F-2001');
    await f.whenStable();
    expect(f.nativeElement.querySelector('.cf-code-tag').textContent).toBe('CF-F-2001');
  });
  it('KPI card draws a sparkline from the trend', async () => {
    const f = TestBed.createComponent(KpiCard);
    f.componentRef.setInput('label', 'Total lost');
    f.componentRef.setInput('value', 21);
    f.componentRef.setInput('trend', [1, 3, 2, 5]);
    await f.whenStable();
    expect(f.nativeElement.querySelector('svg path')).toBeTruthy();
    expect(f.nativeElement.textContent).toContain('21');
  });
});

describe('password policy (client mirror of the server rule)', () => {
  it('requires length, cases, number and symbol', () => {
    expect(strongPassword(new FormControl('weakpass'))).toEqual({ weak: true });
    expect(strongPassword(new FormControl('Str0ng!Pass'))).toBeNull();
  });
});
