'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type AdminEmployee } from '@/lib/api/admin';

const ROLES = ['SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const;
const STATUSES = ['APPROVED', 'SUSPENDED'] as const;

function readProblem(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'detail' in json) {
    const detail = (json as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

export function EmployeeManagement({
  employees: initialEmployees,
}: {
  employees: AdminEmployee[];
}): JSX.Element {
  const [employees, setEmployees] = useState(initialEmployees);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createValues, setCreateValues] = useState({
    fullName: '',
    email: '',
    role: 'SALES_MANAGER',
  });

  async function createEmployee(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch('/api/admin/employees', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createValues, accountStatus: 'APPROVED' }),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      setError(readProblem(json, 'Could not add employee.'));
      return;
    }
    const employee = json as AdminEmployee;
    setEmployees((current) => [employee, ...current]);
    setCreateValues({ fullName: '', email: '', role: 'SALES_MANAGER' });
    setMessage('Employee added. They can sign in with Auth0 using the same email.');
  }

  async function updateEmployee(
    id: string,
    body: {
      fullName?: string;
      role?: string;
      accountStatus?: string;
      suspensionReason?: string | null;
    },
  ): Promise<void> {
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admin/employees/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      setError(readProblem(json, 'Could not update employee.'));
      return;
    }
    const updated = json as AdminEmployee;
    setEmployees((current) =>
      current.map((employee) => (employee.id === updated.id ? updated : employee)),
    );
    setMessage('Employee access updated and audited.');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 lg:grid-cols-[1fr_1fr_180px_120px]"
            onSubmit={(event) => {
              void createEmployee(event);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="employee-name">Full name</Label>
              <Input
                id="employee-name"
                value={createValues.fullName}
                onChange={(event) =>
                  setCreateValues((current) => ({ ...current, fullName: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employee-email">Email</Label>
              <Input
                id="employee-email"
                type="email"
                value={createValues.email}
                onChange={(event) =>
                  setCreateValues((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employee-role">Role</Label>
              <select
                id="employee-role"
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={createValues.role}
                onChange={(event) =>
                  setCreateValues((current) => ({ ...current, role: event.target.value }))
                }
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Add
              </Button>
            </div>
          </form>
          {error ? (
            <p className="text-destructive mt-3 text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 text-sm text-emerald-600" role="status">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees.map((employee) => (
              <EmployeeRow key={employee.id} employee={employee} onSave={updateEmployee} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeeRow({
  employee,
  onSave,
}: {
  employee: AdminEmployee;
  onSave: (
    id: string,
    body: {
      fullName?: string;
      role?: string;
      accountStatus?: string;
      suspensionReason?: string | null;
    },
  ) => Promise<void>;
}): JSX.Element {
  const [role, setRole] = useState(employee.primaryRole);
  const [status, setStatus] = useState(employee.accountStatus);
  const [reason, setReason] = useState(employee.suspensionReason ?? '');
  const lastLogin = employee.lastLoginAt
    ? new Date(employee.lastLoginAt).toLocaleString('en-IN')
    : 'Never';

  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-medium">{employee.fullName}</p>
        <p className="text-muted-foreground text-xs">{employee.email}</p>
      </td>
      <td className="px-4 py-3">
        <select
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value as AdminEmployee['primaryRole'])}
        >
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {item.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-2">
          <select
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as AdminEmployee['accountStatus'])}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {status === 'SUSPENDED' ? (
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Suspension reason"
            />
          ) : null}
        </div>
      </td>
      <td className="text-muted-foreground px-4 py-3">{lastLogin}</td>
      <td className="px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            void onSave(employee.id, {
              role,
              accountStatus: status,
              suspensionReason: status === 'SUSPENDED' ? reason : null,
            })
          }
        >
          Save
        </Button>
      </td>
    </tr>
  );
}
