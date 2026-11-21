type Role = 'public' | 'any' | 'admin' | 'admin,hod' | 'hod';
type Op = [method: string, path: string, summary: string, role: Role, success?: number];

/** Every endpoint of the API; the spec below is generated from this table. */
const OPS: Op[] = [
  ['get', '/health', 'Health check', 'public'],
  ['post', '/auth/login', 'Log in with email and password', 'public'],
  ['post', '/auth/logout', 'Log out', 'any'],
  ['post', '/auth/refresh', 'Rotate the refresh token', 'public'],
  ['post', '/auth/forgot-password', 'Request a password reset link', 'public'],
  ['post', '/auth/reset-password', 'Reset a password with a single-use token', 'public'],
  ['post', '/auth/change-password', 'Change the signed-in user password', 'any'],
  ['get', '/departments', 'List departments', 'any'],
  ['post', '/departments', 'Create a department', 'admin', 201],
  ['get', '/departments/{id}', 'Get a department', 'any'],
  ['put', '/departments/{id}', 'Update a department', 'admin'],
  ['put', '/departments/{id}/hod', 'Assign or clear the HOD', 'admin'],
  ['delete', '/departments/{id}', 'Delete a department without active faculty', 'admin', 204],
  ['get', '/faculty', 'Search, filter, sort and paginate faculty', 'admin,hod'],
  ['post', '/faculty', 'Create a faculty member', 'admin', 201],
  ['post', '/faculty/import', 'Bulk import faculty from CSV', 'admin'],
  ['get', '/faculty/{id}', 'Get a faculty member', 'any'],
  ['put', '/faculty/{id}', 'Update a faculty member', 'admin'],
  ['patch', '/faculty/{id}/status', 'Activate or deactivate', 'admin'],
  ['delete', '/faculty/{id}', 'Delete a faculty member', 'admin', 204],
  ['get', '/shifts', 'List shifts', 'any'],
  ['put', '/shifts/{id}', 'Update a shift', 'admin'],
  ['get', '/rules', 'Get attendance rules', 'any'],
  ['put', '/rules', 'Set the grace period (0-60 minutes)', 'admin'],
  ['get', '/holidays', 'List holidays', 'any'],
  ['post', '/holidays', 'Create a holiday', 'admin', 201],
  ['put', '/holidays/{id}', 'Update a holiday', 'admin'],
  ['delete', '/holidays/{id}', 'Delete a holiday', 'admin', 204],
  ['post', '/attendance/check-in', 'Check in (server time)', 'any', 201],
  ['post', '/attendance/check-out', 'Check out (server time)', 'any'],
  ['get', '/attendance/today', 'Today status and day type', 'any'],
  ['get', '/attendance/me', 'Own records for a month', 'any'],
  ['post', '/attendance/jobs/absent', 'Run the absent job for a date', 'admin'],
  ['get', '/leave/types', 'List leave types', 'any'],
  ['get', '/leave/balances', 'Yearly leave balances', 'any'],
  ['get', '/leave', 'List leave requests (scoped by role)', 'any'],
  ['post', '/leave', 'Apply for leave', 'any', 201],
  ['get', '/leave/{id}', 'Get a leave request', 'any'],
  ['post', '/leave/{id}/submit', 'Submit a draft', 'any'],
  ['post', '/leave/{id}/approve', 'Approve', 'admin,hod'],
  ['post', '/leave/{id}/reject', 'Reject with a comment', 'admin,hod'],
  ['post', '/leave/{id}/cancel', 'Cancel', 'any'],
  ['get', '/regularization', 'List regularization requests', 'any'],
  ['post', '/regularization', 'Raise a regularization request', 'any', 201],
  ['post', '/regularization/{id}/approve', 'Approve and recompute the day', 'admin,hod'],
  ['post', '/regularization/{id}/reject', 'Reject with a comment', 'admin,hod'],
  ['get', '/reports/daily', 'Daily report (json, csv, pdf)', 'admin,hod'],
  ['get', '/reports/range', 'Custom range report (json, csv, pdf)', 'admin,hod'],
  ['get', '/reports/monthly', 'Monthly report (json, csv, pdf)', 'admin,hod'],
  ['get', '/reports/muster', 'Monthly muster roll (json, csv, pdf)', 'admin,hod'],
  ['get', '/dashboard/faculty', 'Faculty dashboard', 'any'],
  ['get', '/dashboard/hod', 'HOD dashboard', 'hod'],
  ['get', '/dashboard/admin', 'Admin dashboard', 'admin'],
  ['get', '/notifications', 'List own notifications', 'any'],
  ['post', '/notifications/read-all', 'Mark all read', 'any'],
  ['post', '/notifications/{id}/read', 'Mark one read', 'any'],
  ['get', '/audit', 'Audit log viewer', 'admin'],
];

const ROLE_TEXT: Record<Role, string> = {
  public: 'No authentication.',
  any: 'Any signed-in user.',
  admin: 'Admin only.',
  'admin,hod': 'Admin or HOD.',
  hod: 'HOD only.',
};

const envelope = (desc: string) => ({
  description: desc,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } },
});

function buildPaths() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [method, path, summary, role, success = 200] of OPS) {
    const secured = role !== 'public';
    const responses: Record<string, unknown> = {
      [String(success)]: success === 204 ? { description: 'No content' } : envelope('Success'),
      '400': envelope('Validation error (field details in error.details)'),
      '404': envelope('Not found'),
      '409': envelope('Conflict with current state'),
    };
    if (secured) responses['401'] = envelope('Not authenticated');
    if (role !== 'public' && role !== 'any') responses['403'] = envelope('Wrong role');
    const parameters = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: 'path', required: true, schema: { type: 'string' } }));
    (paths[path] ??= {})[method] = {
      summary,
      description: ROLE_TEXT[role],
      tags: [path.split('/')[1]],
      ...(secured ? { security: [{ cookieAuth: [] }, { bearerAuth: [] }] } : {}),
      ...(parameters.length ? { parameters } : {}),
      responses,
    };
  }
  return paths;
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'FAMS API',
    version: '1.0.0',
    description:
      'Faculty Attendance Management System. A demo project with synthetic data. All responses use the envelope {success, data, error}. Times are Asia/Kolkata.',
  },
  servers: [{ url: '/api/v1' }],
  paths: buildPaths(),
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'fams_access' },
      bearerAuth: { type: 'http', scheme: 'bearer' },
    },
    schemas: {
      Envelope: {
        type: 'object',
        required: ['success', 'data', 'error'],
        properties: {
          success: { type: 'boolean' },
          data: { nullable: true },
          error: {
            nullable: true,
            type: 'object',
            properties: { code: { type: 'string' }, message: { type: 'string' }, details: { nullable: true } },
          },
        },
      },
    },
  },
};
