'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { RequestBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Pagination, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { applyApiErrors } from '@/lib/form';
import { facultySchema } from '@/lib/schemas';
import type { Department, FacultyMember, Page, Shift } from '@/lib/types';
import { fmtDate, humanize, todayKey } from '@/lib/utils';

type Values = z.infer<typeof facultySchema>;
const DESIGNATIONS = ['ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR', 'LECTURER'];
const CSV_TEMPLATE = 'fullName,email,phone,departmentCode,designation,dateOfJoining\nSample Person,sample.person@example.test,9876543210,CSE,LECTURER,2024-01-15\n';

function FacultyForm({ editing, onClose, departments, shifts }: { editing: FacultyMember | null; onClose: () => void; departments: Department[]; shifts: Shift[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(facultySchema),
    defaultValues: editing
      ? {
          fullName: editing.fullName,
          email: editing.email,
          phone: editing.phone,
          departmentId: editing.department.id,
          designation: editing.designation,
          dateOfJoining: editing.dateOfJoining,
          shiftId: editing.shift.id,
        }
      : { fullName: '', email: '', phone: '', departmentId: '', designation: 'ASSISTANT_PROFESSOR', dateOfJoining: todayKey(), shiftId: '' },
  });

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = { ...v, shiftId: v.shiftId || undefined };
      return editing ? api.put<FacultyMember>(`/faculty/${editing.id}`, { ...body, shiftId: body.shiftId ?? editing.shift.id }) : api.post<FacultyMember & { temporaryPassword?: string }>('/faculty', body);
    },
    onSuccess: (d, v) => {
      qc.invalidateQueries({ queryKey: ['faculty'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
      if (editing) {
        toast.success('Faculty updated.');
        onClose();
      } else {
        toast.success('Faculty created.');
        const pw = (d as { temporaryPassword?: string }).temporaryPassword;
        if (pw) setCreated({ email: v.email, password: pw });
        else onClose();
      }
    },
    onError: (e) => {
      if (!applyApiErrors(e, setFieldError)) setError(errorMessage(e));
      else setError('');
    },
  });

  if (created) {
    return (
      <div className="flex flex-col gap-3" data-testid="faculty-created">
        <p className="text-sm">
          Account created for <strong>{created.email}</strong>. Share this temporary password securely; it is shown only once.
        </p>
        <code className="rounded-xl bg-surface-2 p-3 text-sm" data-testid="faculty-temp-password">
          {created.password}
        </code>
        <Button onClick={onClose} data-testid="faculty-created-done">
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="flex flex-col gap-3" data-testid="faculty-form">
      {error && (
        <p role="alert" data-testid="faculty-form-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Field label="Full name" error={errors.fullName?.message}>
        <Input data-testid="faculty-name" {...register('fullName')} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" data-testid="faculty-email" {...register('email')} />
      </Field>
      <Field label="Phone" error={errors.phone?.message}>
        <Input inputMode="numeric" data-testid="faculty-phone" {...register('phone')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Department" error={errors.departmentId?.message}>
          <Select data-testid="faculty-department" {...register('departmentId')}>
            <option value="">Select</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Designation" error={errors.designation?.message}>
          <Select data-testid="faculty-designation" {...register('designation')}>
            {DESIGNATIONS.map((d) => (
              <option key={d} value={d}>
                {humanize(d)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of joining" error={errors.dateOfJoining?.message}>
          <Input type="date" max={todayKey()} data-testid="faculty-joining" {...register('dateOfJoining')} />
        </Field>
        <Field label="Shift" error={errors.shiftId?.message}>
          <Select data-testid="faculty-shift" {...register('shiftId')}>
            <option value="">{editing ? 'Keep current' : 'Default shift'}</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} data-testid="faculty-cancel">
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} data-testid="faculty-save">
          {editing ? 'Save changes' : 'Create faculty'}
        </Button>
      </div>
    </form>
  );
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<{ imported: number; failed: number; errors: { row: number; messages: string[] }[] } | null>(null);
  const [error, setError] = useState('');
  const run = useMutation({
    mutationFn: () => api.post<NonNullable<typeof result>>('/faculty/import', { csv }),
    onSuccess: (d) => {
      setResult(d);
      setError('');
      if (d.imported > 0) toast.success(`Imported ${d.imported} faculty.`);
      qc.invalidateQueries({ queryKey: ['faculty'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const reset = () => {
    setCsv('');
    setResult(null);
    setError('');
  };
  const closeAll = () => {
    reset();
    onClose();
  };
  return (
    <Dialog open={open} onClose={closeAll} title="Import faculty from CSV" description="Required columns: fullName, email, phone, departmentCode, designation, dateOfJoining. Accounts get a generated password." testid="import-dialog">
      <div className="flex flex-col gap-3">
        <Field label="CSV file">
          <Input
            type="file"
            accept=".csv,text/csv"
            data-testid="import-file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setCsv(await f.text());
            }}
          />
        </Field>
        <Field label="Or paste CSV">
          <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} className="min-h-32 font-mono text-xs" data-testid="import-csv" />
        </Field>
        <button type="button" className="self-start text-xs text-primary underline" onClick={() => setCsv(CSV_TEMPLATE)} data-testid="import-template">
          Insert example (synthetic) row
        </button>
        {error && (
          <p role="alert" data-testid="import-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}
        {result && (
          <div role="status" data-testid="import-result" className="rounded-xl bg-surface-2 p-3 text-sm">
            <p>
              Imported {result.imported}, failed {result.failed}.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-danger">
                {result.errors.map((er) => (
                  <li key={er.row}>
                    Row {er.row}: {er.messages.join('; ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={closeAll} data-testid="import-close">
            Close
          </Button>
          <Button onClick={() => run.mutate()} loading={run.isPending} disabled={!csv.trim()} data-testid="import-submit">
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Faculty directory. HODs get a read-only list of their department; admins can also manage. */
export function FacultyView({ admin }: { admin: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('employeeId');
  const [order, setOrder] = useState('asc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ editing: FacultyMember | null } | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<FacultyMember | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api.get<Department[]>('/departments'), enabled: admin });
  const shifts = useQuery({ queryKey: ['shifts'], queryFn: () => api.get<Shift[]>('/shifts'), enabled: admin });
  const list = useQuery({
    queryKey: ['faculty', 'list', search, departmentId, status, sortBy, order, pageSize, page],
    queryFn: () => api.get<Page<FacultyMember>>('/faculty', { q: search, departmentId: admin ? departmentId : undefined, status, sortBy, order, pageSize, page }),
    placeholderData: (prev) => prev,
  });

  const toggle = useMutation({
    mutationFn: (f: FacultyMember) => api.patch(`/faculty/${f.id}/status`, { status: f.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    onSuccess: () => {
      toast.success('Status updated.');
      qc.invalidateQueries({ queryKey: ['faculty'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (f: FacultyMember) => api.del(`/faculty/${f.id}`),
    onSuccess: () => {
      toast.success('Faculty deleted.');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['faculty'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      setDeleting(null);
    },
  });

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={admin ? 'Faculty' : 'Department faculty'}
        subtitle={admin ? 'Search, filter and manage faculty (synthetic demo data).' : 'Faculty in your department.'}
        actions={
          admin && (
            <>
              <Button variant="secondary" onClick={() => setImporting(true)} data-testid="faculty-import-open">
                <Upload className="h-4 w-4" aria-hidden />
                Import CSV
              </Button>
              <Button onClick={() => setForm({ editing: null })} data-testid="faculty-create-open">
                <Plus className="h-4 w-4" aria-hidden />
                Add faculty
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <Field label="Search" className="lg:col-span-2">
          <Input type="search" placeholder="Name, ID or email" value={q} onChange={(e) => setQ(e.target.value)} data-testid="faculty-search" />
        </Field>
        {admin && (
          <Field label="Department">
            <Select value={departmentId} onChange={(e) => reset(() => setDepartmentId(e.target.value))} data-testid="faculty-filter-department">
              <option value="">All</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Status">
          <Select value={status} onChange={(e) => reset(() => setStatus(e.target.value))} data-testid="faculty-filter-status">
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
        <Field label="Sort by">
          <Select value={sortBy} onChange={(e) => reset(() => setSortBy(e.target.value))} data-testid="faculty-sort">
            <option value="employeeId">Employee ID</option>
            <option value="fullName">Name</option>
            <option value="dateOfJoining">Date of joining</option>
            <option value="createdAt">Created</option>
          </Select>
        </Field>
        <Field label="Order">
          <Select value={order} onChange={(e) => reset(() => setOrder(e.target.value))} data-testid="faculty-order">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </Select>
        </Field>
      </div>

      {list.isLoading ? (
        <SkeletonRows />
      ) : list.error ? (
        <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data && list.data.items.length === 0 ? (
        <EmptyState title="No faculty match these filters" testid="faculty-empty" />
      ) : (
        <>
          <div className="animate-slide-up">
          <Table caption="Faculty" data-testid="faculty-table">
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Name</TH>
                <TH>Dept</TH>
                <TH>Designation</TH>
                <TH>Joined</TH>
                <TH>Status</TH>
                {admin && <TH>Actions</TH>}
              </TR>
            </THead>
            <TBody>
              {list.data?.items.map((f) => (
                <TR key={f.id} data-testid={`faculty-row-${f.employeeId}`}>
                  <TD>{f.employeeId}</TD>
                  <TD>
                    {f.fullName}
                    <span className="block text-xs text-muted">{f.email}</span>
                  </TD>
                  <TD>{f.department.code}</TD>
                  <TD>{humanize(f.designation)}</TD>
                  <TD>{fmtDate(f.dateOfJoining)}</TD>
                  <TD>
                    <RequestBadge status={f.status} />
                  </TD>
                  {admin && (
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setForm({ editing: f })} data-testid={`faculty-edit-${f.employeeId}`}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggle.mutate(f)} data-testid={`faculty-toggle-${f.employeeId}`}>
                          {f.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleting(f)} data-testid={`faculty-delete-${f.employeeId}`}>
                          Delete
                        </Button>
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
          </div>
          {list.data && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Pagination page={page} pageSize={pageSize} total={list.data.total} onPage={setPage} testid="faculty-pagination" />
              <label className="mt-3 flex items-center gap-2 text-sm">
                Rows
                <Select className="h-9 w-20" value={pageSize} onChange={(e) => reset(() => setPageSize(Number(e.target.value)))} data-testid="faculty-page-size">
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          )}
        </>
      )}

      {admin && (
        <>
          <Dialog open={!!form} onClose={() => setForm(null)} title={form?.editing ? 'Edit faculty' : 'Add faculty'} testid="faculty-dialog">
            {form && <FacultyForm key={form.editing?.id ?? 'new'} editing={form.editing} onClose={() => setForm(null)} departments={departments.data ?? []} shifts={shifts.data ?? []} />}
          </Dialog>
          <ImportDialog open={importing} onClose={() => setImporting(false)} />
          <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete faculty member?" description={`${deleting?.fullName ?? ''} can only be deleted if there is no attendance, leave or regularization history. Otherwise deactivate instead.`} testid="faculty-delete-dialog">
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleting(null)} data-testid="faculty-delete-no">
                Cancel
              </Button>
              <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting)} data-testid="faculty-delete-confirm">
                Delete
              </Button>
            </div>
          </Dialog>
        </>
      )}
    </>
  );
}
