'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { applyApiErrors } from '@/lib/form';
import { departmentSchema } from '@/lib/schemas';
import type { Department, FacultyMember, Page } from '@/lib/types';

type Values = z.infer<typeof departmentSchema>;

function DeptForm({ editing, onClose }: { editing: Department | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(departmentSchema), defaultValues: { name: editing?.name ?? '', code: editing?.code ?? '' } });
  const save = useMutation({
    mutationFn: (v: Values) => (editing ? api.put(`/departments/${editing.id}`, v) : api.post('/departments', v)),
    onSuccess: () => {
      toast.success(editing ? 'Department updated.' : 'Department created.');
      qc.invalidateQueries({ queryKey: ['departments'] });
      onClose();
    },
    onError: (e) => {
      if (!applyApiErrors(e, setFieldError)) setError(errorMessage(e));
      else setError('');
    },
  });
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="flex flex-col gap-3" data-testid="department-form">
      {error && (
        <p role="alert" data-testid="department-form-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Field label="Name" error={errors.name?.message}>
        <Input data-testid="department-name" {...register('name')} />
      </Field>
      <Field label="Code" error={errors.code?.message} hint="2-6 uppercase letters, for example CSE.">
        <Input data-testid="department-code" {...register('code')} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} data-testid="department-cancel">
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} data-testid="department-save">
          Save
        </Button>
      </div>
    </form>
  );
}

function HodForm({ dept, onClose }: { dept: Department; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [value, setValue] = useState(dept.hod?.id ?? '');
  const members = useQuery({
    queryKey: ['faculty', 'dept-members', dept.id],
    queryFn: () => api.get<Page<FacultyMember>>('/faculty', { departmentId: dept.id, status: 'ACTIVE', pageSize: 50 }),
  });
  const save = useMutation({
    mutationFn: () => api.put(`/departments/${dept.id}/hod`, { facultyId: value || null }),
    onSuccess: () => {
      toast.success('Head of department updated.');
      qc.invalidateQueries({ queryKey: ['departments'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Head of department">
        <Select value={value} onChange={(e) => setValue(e.target.value)} data-testid="hod-select">
          <option value="">No HOD</option>
          {members.data?.items.map((f) => (
            <option key={f.id} value={f.id}>
              {f.fullName} ({f.employeeId})
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} data-testid="hod-cancel">
          Cancel
        </Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} data-testid="hod-save">
          Save
        </Button>
      </div>
    </div>
  );
}

export function DepartmentsView() {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<{ editing: Department | null } | null>(null);
  const [hod, setHod] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['departments'], queryFn: () => api.get<Department[]>('/departments') });

  const remove = useMutation({
    mutationFn: (d: Department) => api.del(`/departments/${d.id}`),
    onSuccess: () => {
      toast.success('Department deleted.');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      setDeleting(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Departments"
        actions={
          <Button onClick={() => setForm({ editing: null })} data-testid="department-create-open">
            <Plus className="h-4 w-4" aria-hidden />
            Add department
          </Button>
        }
      />
      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data && data.length === 0 ? (
        <EmptyState title="No departments yet" testid="departments-empty" />
      ) : (
        <div className="animate-slide-up">
        <Table caption="Departments" data-testid="departments-table">
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Name</TH>
              <TH>HOD</TH>
              <TH>Active faculty</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {data?.map((d) => (
              <TR key={d.id} data-testid={`department-row-${d.code}`} className="transition-colors hover:bg-surface-2/60">
                <TD>{d.code}</TD>
                <TD>{d.name}</TD>
                <TD>{d.hod ? `${d.hod.fullName} (${d.hod.employeeId})` : 'Not assigned'}</TD>
                <TD>{d.activeFacultyCount}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setForm({ editing: d })} data-testid={`department-edit-${d.code}`}>
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setHod(d)} data-testid={`department-hod-${d.code}`}>
                      Set HOD
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(d)} data-testid={`department-delete-${d.code}`}>
                      Delete
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        </div>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.editing ? 'Edit department' : 'Add department'} testid="department-dialog">
        {form && <DeptForm key={form.editing?.id ?? 'new'} editing={form.editing} onClose={() => setForm(null)} />}
      </Dialog>
      <Dialog open={!!hod} onClose={() => setHod(null)} title={`Head of ${hod?.code ?? ''}`} testid="hod-dialog">
        {hod && <HodForm key={hod.id} dept={hod} onClose={() => setHod(null)} />}
      </Dialog>
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete department?" description={`${deleting?.name ?? ''} can only be deleted when it has no faculty.`} testid="department-delete-dialog">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)} data-testid="department-delete-no">
            Cancel
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting)} data-testid="department-delete-confirm">
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
