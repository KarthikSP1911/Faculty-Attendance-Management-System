'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { loginSchema } from '@/lib/schemas';
import { ROLE_HOME } from '@/lib/utils';

type Values = z.infer<typeof loginSchema>;

const DEMO = [
  { key: 'admin', label: 'Admin', email: 'admin@fams.test' },
  { key: 'hod', label: 'HOD (CSE)', email: 'hod.cse@fams.test' },
  { key: 'faculty', label: 'Faculty (CSE)', email: 'cse.faculty1@fams.test' },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const go = (role: keyof typeof ROLE_HOME) => {
    const next = new URLSearchParams(window.location.search).get('next');
    router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : ROLE_HOME[role]);
  };

  useEffect(() => {
    if (!loading && user) go(user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const onSubmit = async (v: Values) => {
    setFormError('');
    try {
      const u = await login(v.email, v.password);
      go(u.role);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  return (
    <AuthLayout title="Log in" subtitle="Use your institution email and password.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4" data-testid="login-form">
        {formError && (
          <p role="alert" data-testid="login-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
            {formError}
          </p>
        )}
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="username" data-testid="login-email" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" data-testid="login-password" {...register('password')} />
        </Field>
        <Button type="submit" loading={isSubmitting} data-testid="login-submit">
          Log in
        </Button>
        <Link href="/forgot-password" className="text-center text-sm text-primary underline" data-testid="login-forgot-link">
          Forgot password?
        </Link>
      </form>

      <div className="mt-5 border-t border-line pt-4" data-testid="demo-accounts">
        <p className="text-xs font-medium text-muted">Demo accounts (synthetic data, password Demo@1234)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <Button
              key={d.key}
              variant="secondary"
              size="sm"
              data-testid={`login-demo-${d.key}`}
              onClick={() => {
                setValue('email', d.email);
                setValue('password', 'Demo@1234');
              }}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
