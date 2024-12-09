import { Arrays, Objects, Types } from 'cafe-utility';
import { readFileSync } from 'fs';
import { createPool } from 'mysql2/promise';

const pool = createPool(JSON.parse(readFileSync('database.env', 'utf-8')));

const λ = Arrays.makePipe;

const _getRows = λ([Types.asArray, Arrays.firstOrThrow], (x) => Types.asArray(x).map((y) => Types.asObject(y)));
const _getOnlyRowOrNull = λ([Types.asArray, Arrays.firstOrThrow, Arrays.onlyOrNull], Types.asNullableObject);
const _getOnlyRowOrThrow = λ([Types.asArray, Arrays.firstOrThrow, Arrays.onlyOrThrow], Types.asObject);
const _getFirstRowOrNull = λ([Types.asArray, Arrays.firstOrThrow, Arrays.firstOrNull], Types.asNullableObject);
const _getFirstRowOrThrow = λ([Types.asArray, Arrays.firstOrThrow, Arrays.firstOrThrow], Types.asObject);
const _exists = λ([Types.asArray, Arrays.firstOrThrow, Arrays.firstOrNull], Types.isObject);
const _getInsertId = λ([Types.asArray, Arrays.firstOrThrow, (x) => x.insertId], Types.asId);
const _getAsString = λ(
  [Types.asArray, Arrays.firstOrThrow, Arrays.firstOrThrow, Objects.unwrapSingleKey],
  Types.asString,
);
const _getAsId = λ([Types.asArray, Arrays.firstOrThrow, Arrays.firstOrThrow, Objects.unwrapSingleKey], Types.asId);
const _getAsNullableString = λ([Types.asArray, Arrays.firstOrThrow, Objects.unwrapSingleKey], Types.asNullableString);

export async function runQuery(query: string, ...params: unknown[]) {
  return pool.query(query, params);
}

export async function getRows(query: string, ...params: unknown[]) {
  return _getRows(await runQuery(query, ...params));
}

export async function getOnlyRowOrNull(query: string, ...params: unknown[]) {
  return _getOnlyRowOrNull(await runQuery(query, ...params));
}

export async function getOnlyRowOrThrow(query: string, ...params: unknown[]) {
  return _getOnlyRowOrThrow(await runQuery(query, ...params));
}

export async function getFirstRowOrNull(query: string, ...params: unknown[]) {
  return _getFirstRowOrNull(await runQuery(query, ...params));
}

export async function getFirstRowOrThrow(query: string, ...params: unknown[]) {
  return _getFirstRowOrThrow(await runQuery(query, ...params));
}

export async function exists(query: string, ...params: unknown[]) {
  return _exists(await runQuery(query, ...params));
}

export async function getAsString(query: string, ...params: unknown[]) {
  return _getAsString(await runQuery(query, ...params));
}

export async function getAsId(query: string, ...params: unknown[]) {
  return _getAsId(await runQuery(query, ...params));
}

export async function getAsNullableString(query: string, ...params: unknown[]) {
  return _getAsNullableString(await runQuery(query, ...params));
}

export async function insert(table: string, object: Record<string, unknown>): Promise<number> {
  delete object.id;
  const fields = Object.keys(object);
  const values = Object.values(object);
  const data = await runQuery(
    `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${values.map(() => '?').join(', ')})`,
    ...values,
  );
  return _getInsertId(data);
}

export async function update(table: string, id: number, object: Record<string, unknown>): Promise<void> {
  delete object.id;
  const fields = Object.keys(object);
  const values = Object.values(object);
  await runQuery(`UPDATE ${table} SET ${fields.map((x) => x + ' = ?').join(', ')} WHERE id = ?`, ...values, id);
}

export async function updateWhere(
  table: string,
  key: string,
  value: string,
  object: Record<string, unknown>,
): Promise<void> {
  delete object.id;
  const fields = Object.keys(object);
  const values = Object.values(object);
  await runQuery(`UPDATE ${table} SET ${fields.map((x) => x + ' = ?').join(', ')} WHERE ${key} = ${value}`, ...values);
}
