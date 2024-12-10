import { getOnlyRowOrNull, getOnlyRowOrThrow, getRows, insert, update } from './Database';

type SelectOptions<T> = {
  order?: { column: keyof T; direction: 'ASC' | 'DESC' };
  limit?: number;
};

function buildSelect<T>(filter?: Partial<T>, options?: SelectOptions<T>): [string, unknown[]] {
  const where = filter
    ? ' WHERE ' +
      Object.keys(filter)
        .map((x) => '' + x + ' = ?')
        .join(' AND ')
    : '';
  const values = filter ? Object.values(filter) : [];
  const order = options?.order ? ' ORDER BY ' + (options.order.column as string) + ' ' + options.order.direction : '';
  const limit = options?.limit ? ' LIMIT ' + options.limit : '';
  return [where + order + limit, values];
}

export type ApiKeysRowId = number & { __brand: 'ApiKeysRowId' };
export interface ApiKeysRow {
  id: ApiKeysRowId;
  organizationId: OrganizationsRowId;
  apiKey: string;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: Date;
}

export type FileReferencesRowId = number & { __brand: 'FileReferencesRowId' };
export interface FileReferencesRow {
  id: FileReferencesRowId;
  organizationId: OrganizationsRowId;
  thumbnailBase64?: string | null;
  name: string;
  contentType: string;
  hash: string;
  size: number;
  hits: number;
  isWebsite: 0 | 1;
  createdAt: Date;
}

export type OrganizationsRowId = number & { __brand: 'OrganizationsRowId' };
export interface OrganizationsRow {
  id: OrganizationsRowId;
  name: string;
  postageBatchId?: string | null;
  postageBatchStatus?:
    | 'CREATING'
    | 'CREATED'
    | 'FAILED_TO_CREATE'
    | 'FAILED_TO_TOP_UP'
    | 'FAILED_TO_DILUTE'
    | 'REMOVED'
    | null;
  enabled: 0 | 1;
  createdAt: Date;
}

export type PaymentsRowId = number & { __brand: 'PaymentsRowId' };
export interface PaymentsRow {
  id: PaymentsRowId;
  merchantTransactionId: string;
  organizationId: OrganizationsRowId;
  planId: PlansRowId;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILURE';
  statusReasonCode?: string | null;
  createdAt: Date;
}

export type PlansRowId = number & { __brand: 'PlansRowId' };
export interface PlansRow {
  id: PlansRowId;
  organizationId: OrganizationsRowId;
  amount: number;
  currency: string;
  frequency: string;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED';
  statusReason?: string | null;
  downloadCountLimit: number;
  downloadSizeLimit: number;
  uploadCountLimit: number;
  uploadSizeLimit: number;
  paidUntil?: Date | null;
  cancelAt?: Date | null;
  createdAt: Date;
}

export type StaticTextsRowId = number & { __brand: 'StaticTextsRowId' };
export interface StaticTextsRow {
  id: StaticTextsRowId;
  label: string;
  value: string;
}

export type UsageMetricsRowId = number & { __brand: 'UsageMetricsRowId' };
export interface UsageMetricsRow {
  id: UsageMetricsRowId;
  organizationId: OrganizationsRowId;
  period: string;
  type: 'UPLOADED_BYTES' | 'DOWNLOADED_BYTES';
  available: number;
  used: number;
}

export type UsersRowId = number & { __brand: 'UsersRowId' };
export interface UsersRow {
  id: UsersRowId;
  email: string;
  password: string;
  organizationId: OrganizationsRowId;
  emailVerified: 0 | 1;
  emailVerificationCode: string;
  resetPasswordToken?: string | null;
  enabled: 0 | 1;
  createdAt: Date;
}

export interface NewApiKeysRow {
  organizationId: OrganizationsRowId;
  apiKey: string;
  status: 'ACTIVE' | 'REVOKED';
  createdAt?: Date | null;
}

export interface NewFileReferencesRow {
  organizationId: OrganizationsRowId;
  thumbnailBase64?: string | null;
  name: string;
  contentType: string;
  hash: string;
  size: number;
  hits?: number | null;
  isWebsite: 0 | 1;
  createdAt?: Date | null;
}

export interface NewOrganizationsRow {
  name: string;
  postageBatchId?: string | null;
  postageBatchStatus?:
    | 'CREATING'
    | 'CREATED'
    | 'FAILED_TO_CREATE'
    | 'FAILED_TO_TOP_UP'
    | 'FAILED_TO_DILUTE'
    | 'REMOVED'
    | null;
  enabled?: 0 | 1 | null;
  createdAt?: Date | null;
}

export interface NewPaymentsRow {
  merchantTransactionId: string;
  organizationId: OrganizationsRowId;
  planId: PlansRowId;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILURE';
  statusReasonCode?: string | null;
  createdAt?: Date | null;
}

export interface NewPlansRow {
  organizationId: OrganizationsRowId;
  amount: number;
  currency: string;
  frequency: string;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED';
  statusReason?: string | null;
  downloadCountLimit: number;
  downloadSizeLimit: number;
  uploadCountLimit: number;
  uploadSizeLimit: number;
  paidUntil?: Date | null;
  cancelAt?: Date | null;
  createdAt?: Date | null;
}

export interface NewStaticTextsRow {
  label: string;
  value: string;
}

export interface NewUsageMetricsRow {
  organizationId: OrganizationsRowId;
  period: string;
  type: 'UPLOADED_BYTES' | 'DOWNLOADED_BYTES';
  available: number;
  used?: number | null;
}

export interface NewUsersRow {
  email: string;
  password: string;
  organizationId: OrganizationsRowId;
  emailVerified?: 0 | 1 | null;
  emailVerificationCode: string;
  resetPasswordToken?: string | null;
  enabled?: 0 | 1 | null;
  createdAt?: Date | null;
}

export async function getApiKeysRows(
  filter?: Partial<ApiKeysRow>,
  options?: SelectOptions<ApiKeysRow>,
): Promise<ApiKeysRow[]> {
  const [query, values] = buildSelect(filter, options);
  return getRows('SELECT * FROM swarmy.apiKeys' + query, ...values) as unknown as ApiKeysRow[];
}

export async function getOnlyApiKeysRowOrNull(
  filter?: Partial<ApiKeysRow>,
  options?: SelectOptions<ApiKeysRow>,
): Promise<ApiKeysRow | null> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrNull('SELECT * FROM swarmy.apiKeys' + query, ...values) as unknown as ApiKeysRow | null;
}

export async function getOnlyApiKeysRowOrThrow(
  filter?: Partial<ApiKeysRow>,
  options?: SelectOptions<ApiKeysRow>,
): Promise<ApiKeysRow> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrThrow('SELECT * FROM swarmy.apiKeys' + query, ...values) as unknown as ApiKeysRow;
}

export async function getFileReferencesRows(
  filter?: Partial<FileReferencesRow>,
  options?: SelectOptions<FileReferencesRow>,
): Promise<FileReferencesRow[]> {
  const [query, values] = buildSelect(filter, options);
  return getRows('SELECT * FROM swarmy.fileReferences' + query, ...values) as unknown as FileReferencesRow[];
}

export async function getOnlyFileReferencesRowOrNull(
  filter?: Partial<FileReferencesRow>,
  options?: SelectOptions<FileReferencesRow>,
): Promise<FileReferencesRow | null> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrNull(
    'SELECT * FROM swarmy.fileReferences' + query,
    ...values,
  ) as unknown as FileReferencesRow | null;
}

export async function getOnlyFileReferencesRowOrThrow(
  filter?: Partial<FileReferencesRow>,
  options?: SelectOptions<FileReferencesRow>,
): Promise<FileReferencesRow> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrThrow('SELECT * FROM swarmy.fileReferences' + query, ...values) as unknown as FileReferencesRow;
}

export async function getOrganizationsRows(
  filter?: Partial<OrganizationsRow>,
  options?: SelectOptions<OrganizationsRow>,
): Promise<OrganizationsRow[]> {
  const [query, values] = buildSelect(filter, options);
  return getRows('SELECT * FROM swarmy.organizations' + query, ...values) as unknown as OrganizationsRow[];
}

export async function getOnlyOrganizationsRowOrNull(
  filter?: Partial<OrganizationsRow>,
  options?: SelectOptions<OrganizationsRow>,
): Promise<OrganizationsRow | null> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrNull(
    'SELECT * FROM swarmy.organizations' + query,
    ...values,
  ) as unknown as OrganizationsRow | null;
}

export async function getOnlyOrganizationsRowOrThrow(
  filter?: Partial<OrganizationsRow>,
  options?: SelectOptions<OrganizationsRow>,
): Promise<OrganizationsRow> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrThrow('SELECT * FROM swarmy.organizations' + query, ...values) as unknown as OrganizationsRow;
}

export async function getPaymentsRows(
  filter?: Partial<PaymentsRow>,
  options?: SelectOptions<PaymentsRow>,
): Promise<PaymentsRow[]> {
  const [query, values] = buildSelect(filter, options);
  return getRows('SELECT * FROM swarmy.payments' + query, ...values) as unknown as PaymentsRow[];
}

export async function getOnlyPaymentsRowOrNull(
  filter?: Partial<PaymentsRow>,
  options?: SelectOptions<PaymentsRow>,
): Promise<PaymentsRow | null> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrNull('SELECT * FROM swarmy.payments' + query, ...values) as unknown as PaymentsRow | null;
}

export async function getOnlyPaymentsRowOrThrow(
  filter?: Partial<PaymentsRow>,
  options?: SelectOptions<PaymentsRow>,
): Promise<PaymentsRow> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrThrow('SELECT * FROM swarmy.payments' + query, ...values) as unknown as PaymentsRow;
}

export async function getPlansRows(filter?: Partial<PlansRow>, options?: SelectOptions<PlansRow>): Promise<PlansRow[]> {
  const [query, values] = buildSelect(filter, options);
  return getRows('SELECT * FROM swarmy.plans' + query, ...values) as unknown as PlansRow[];
}

export async function getOnlyPlansRowOrNull(
  filter?: Partial<PlansRow>,
  options?: SelectOptions<PlansRow>,
): Promise<PlansRow | null> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrNull('SELECT * FROM swarmy.plans' + query, ...values) as unknown as PlansRow | null;
}

export async function getOnlyPlansRowOrThrow(
  filter?: Partial<PlansRow>,
  options?: SelectOptions<PlansRow>,
): Promise<PlansRow> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrThrow('SELECT * FROM swarmy.plans' + query, ...values) as unknown as PlansRow;
}

export async function getStaticTextsRows(
  filter?: Partial<StaticTextsRow>,
  options?: SelectOptions<StaticTextsRow>,
): Promise<StaticTextsRow[]> {
  const [query, values] = buildSelect(filter, options);
  return getRows('SELECT * FROM swarmy.staticTexts' + query, ...values) as unknown as StaticTextsRow[];
}

export async function getOnlyStaticTextsRowOrNull(
  filter?: Partial<StaticTextsRow>,
  options?: SelectOptions<StaticTextsRow>,
): Promise<StaticTextsRow | null> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrNull('SELECT * FROM swarmy.staticTexts' + query, ...values) as unknown as StaticTextsRow | null;
}

export async function getOnlyStaticTextsRowOrThrow(
  filter?: Partial<StaticTextsRow>,
  options?: SelectOptions<StaticTextsRow>,
): Promise<StaticTextsRow> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrThrow('SELECT * FROM swarmy.staticTexts' + query, ...values) as unknown as StaticTextsRow;
}

export async function getUsageMetricsRows(
  filter?: Partial<UsageMetricsRow>,
  options?: SelectOptions<UsageMetricsRow>,
): Promise<UsageMetricsRow[]> {
  const [query, values] = buildSelect(filter, options);
  return getRows('SELECT * FROM swarmy.usageMetrics' + query, ...values) as unknown as UsageMetricsRow[];
}

export async function getOnlyUsageMetricsRowOrNull(
  filter?: Partial<UsageMetricsRow>,
  options?: SelectOptions<UsageMetricsRow>,
): Promise<UsageMetricsRow | null> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrNull('SELECT * FROM swarmy.usageMetrics' + query, ...values) as unknown as UsageMetricsRow | null;
}

export async function getOnlyUsageMetricsRowOrThrow(
  filter?: Partial<UsageMetricsRow>,
  options?: SelectOptions<UsageMetricsRow>,
): Promise<UsageMetricsRow> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrThrow('SELECT * FROM swarmy.usageMetrics' + query, ...values) as unknown as UsageMetricsRow;
}

export async function getUsersRows(filter?: Partial<UsersRow>, options?: SelectOptions<UsersRow>): Promise<UsersRow[]> {
  const [query, values] = buildSelect(filter, options);
  return getRows('SELECT * FROM swarmy.users' + query, ...values) as unknown as UsersRow[];
}

export async function getOnlyUsersRowOrNull(
  filter?: Partial<UsersRow>,
  options?: SelectOptions<UsersRow>,
): Promise<UsersRow | null> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrNull('SELECT * FROM swarmy.users' + query, ...values) as unknown as UsersRow | null;
}

export async function getOnlyUsersRowOrThrow(
  filter?: Partial<UsersRow>,
  options?: SelectOptions<UsersRow>,
): Promise<UsersRow> {
  const [query, values] = buildSelect(filter, options);
  return getOnlyRowOrThrow('SELECT * FROM swarmy.users' + query, ...values) as unknown as UsersRow;
}

export async function updateApiKeysRow(id: ApiKeysRowId, object: Partial<NewApiKeysRow>): Promise<void> {
  await update('swarmy.apiKeys', id, object);
}

export async function updateFileReferencesRow(
  id: FileReferencesRowId,
  object: Partial<NewFileReferencesRow>,
): Promise<void> {
  await update('swarmy.fileReferences', id, object);
}

export async function updateOrganizationsRow(
  id: OrganizationsRowId,
  object: Partial<NewOrganizationsRow>,
): Promise<void> {
  await update('swarmy.organizations', id, object);
}

export async function updatePaymentsRow(id: PaymentsRowId, object: Partial<NewPaymentsRow>): Promise<void> {
  await update('swarmy.payments', id, object);
}

export async function updatePlansRow(id: PlansRowId, object: Partial<NewPlansRow>): Promise<void> {
  await update('swarmy.plans', id, object);
}

export async function updateStaticTextsRow(id: StaticTextsRowId, object: Partial<NewStaticTextsRow>): Promise<void> {
  await update('swarmy.staticTexts', id, object);
}

export async function updateUsageMetricsRow(id: UsageMetricsRowId, object: Partial<NewUsageMetricsRow>): Promise<void> {
  await update('swarmy.usageMetrics', id, object);
}

export async function updateUsersRow(id: UsersRowId, object: Partial<NewUsersRow>): Promise<void> {
  await update('swarmy.users', id, object);
}

export async function insertApiKeysRow(object: NewApiKeysRow): Promise<ApiKeysRowId> {
  return insert('swarmy.apiKeys', object as unknown as Record<string, unknown>) as Promise<ApiKeysRowId>;
}

export async function insertFileReferencesRow(object: NewFileReferencesRow): Promise<FileReferencesRowId> {
  return insert('swarmy.fileReferences', object as unknown as Record<string, unknown>) as Promise<FileReferencesRowId>;
}

export async function insertOrganizationsRow(object: NewOrganizationsRow): Promise<OrganizationsRowId> {
  return insert('swarmy.organizations', object as unknown as Record<string, unknown>) as Promise<OrganizationsRowId>;
}

export async function insertPaymentsRow(object: NewPaymentsRow): Promise<PaymentsRowId> {
  return insert('swarmy.payments', object as unknown as Record<string, unknown>) as Promise<PaymentsRowId>;
}

export async function insertPlansRow(object: NewPlansRow): Promise<PlansRowId> {
  return insert('swarmy.plans', object as unknown as Record<string, unknown>) as Promise<PlansRowId>;
}

export async function insertStaticTextsRow(object: NewStaticTextsRow): Promise<StaticTextsRowId> {
  return insert('swarmy.staticTexts', object as unknown as Record<string, unknown>) as Promise<StaticTextsRowId>;
}

export async function insertUsageMetricsRow(object: NewUsageMetricsRow): Promise<UsageMetricsRowId> {
  return insert('swarmy.usageMetrics', object as unknown as Record<string, unknown>) as Promise<UsageMetricsRowId>;
}

export async function insertUsersRow(object: NewUsersRow): Promise<UsersRowId> {
  return insert('swarmy.users', object as unknown as Record<string, unknown>) as Promise<UsersRowId>;
}
