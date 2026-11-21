'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { api, errorMessage } from '@/lib/api';
import { forgotSchema } from '@/lib/schemas';

type Values = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const onSubmit = async (v: Values) => {
    setError('');
    try {
      const d = await api.post<{ message: string }>('/auth/forgot-password', v);
      setMessage(d.message);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we will send a reset link.">
      {message ? (
        <div className="flex flex-col gap-4" data-testid="forgot-success">
          <p role="status" className="text-sm">
            {message}
          </p>
          <Link href="/login" className="text-sm text-primary underline" data-testid="forgot-back-login">
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4" data-testid="forgot-form">
          {error && (
            <p role="alert" data-testid="forgot-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
              {error}
            </p>
          )}
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" data-testid="forgot-email" {...register('email')} />
          </Field>
          <Button type="submit" loading={isSubmitting} data-testid="forgot-submit">
            Send reset link
          </Button>
          <Link href="/login" className="text-center text-sm text-primary underline" data-testid="forgot-login-link">
            Back to log in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
