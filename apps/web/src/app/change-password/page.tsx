'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { RoleGuard } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card, PageHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { applyApiErrors } from '@/lib/form';
import { changePasswordSchema } from '@/lib/schemas';

type Values = z.infer<typeof changePasswordSchema>;

function Content() {
  const toast = useToast();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  const onSubmit = async (v: Values) => {
    setError('');
    try {
      await api.post('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword });
      toast.success('Password changed.');
      reset();
    } catch (e) {
      if (!applyApiErrors(e, setFieldError)) setError(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Change password" />
      <Card className="max-w-md animate-slide-up">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4" data-testid="change-password-form">
          {error && (
            <p role="alert" data-testid="change-password-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
              {error}
            </p>
          )}
          <Field label="Current password" error={errors.currentPassword?.message}>
            <Input type="password" autoComplete="current-password" data-testid="change-current" {...register('currentPassword')} />
          </Field>
          <Field label="New password" error={errors.newPassword?.message} hint="8-64 characters with upper and lower case, a digit and a special character.">
            <Input type="password" autoComplete="new-password" data-testid="change-new" {...register('newPassword')} />
          </Field>
          <Field label="Confirm new password" error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" data-testid="change-confirm" {...register('confirm')} />
          </Field>
          <Button type="submit" loading={isSubmitting} data-testid="change-submit">
            Change password
          </Button>
        </form>
      </Card>
    </>
  );
}

export default function ChangePasswordPage() {
  return (
    <RoleGuard>
      <Content />
    </RoleGuard>
  );
}
