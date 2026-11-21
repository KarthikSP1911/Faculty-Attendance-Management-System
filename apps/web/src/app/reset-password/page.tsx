'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { api, errorMessage } from '@/lib/api';
import { resetSchema } from '@/lib/schemas';

type Values = z.infer<typeof resetSchema>;

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(resetSchema), defaultValues: { newPassword: '', confirm: '' } });

  const onSubmit = async (v: Values) => {
    setError('');
    try {
      const d = await api.post<{ message: string }>('/auth/reset-password', { token, newPassword: v.newPassword });
      setDone(d.message);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (!token) {
    return (
      <p role="alert" data-testid="reset-no-token" className="text-sm">
        This reset link is missing its token. Request a new link from the{' '}
        <Link href="/forgot-password" className="text-primary underline">
          forgot password page
        </Link>
        .
      </p>
    );
  }
  if (done) {
    return (
      <div className="flex flex-col gap-4" data-testid="reset-success">
        <p role="status" className="text-sm">
          {done}
        </p>
        <Link href="/login" className="text-sm text-primary underline" data-testid="reset-login-link">
          Go to log in
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4" data-testid="reset-form">
      {error && (
        <p role="alert" data-testid="reset-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Field label="New password" error={errors.newPassword?.message} hint="8-64 characters with upper and lower case, a digit and a special character.">
        <Input type="password" autoComplete="new-password" data-testid="reset-new-password" {...register('newPassword')} />
      </Field>
      <Field label="Confirm new password" error={errors.confirm?.message}>
        <Input type="password" autoComplete="new-password" data-testid="reset-confirm" {...register('confirm')} />
      </Field>
      <Button type="submit" loading={isSubmitting} data-testid="reset-submit">
        Set new password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Reset password" subtitle="Choose a new password for your account.">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthLayout>
  );
}
