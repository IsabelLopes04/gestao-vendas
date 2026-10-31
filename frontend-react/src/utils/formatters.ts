export function toNumber(
  value: number | string | null | undefined
): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const normalized =
    typeof value === 'string'
      ? value.replace(',', '.')
      : value;

  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

export function formatCurrency(
  value: number | string | null | undefined
): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(toNumber(value));
}

export function formatDate(
  value: string | null | undefined
): string {
  if (!value) return '—';

  const [year, month, day] = value.slice(0, 10).split('-');

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export function getCurrentMonth(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;
}

export function formatMonth(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;

  const [year, month] = value.split('-').map(Number);

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

export function totalVenda(venda: {
  clinico: number | string;
  raspagem: number | string;
  inicio: number | string;
}): number {
  return (
    toNumber(venda.clinico) +
    toNumber(venda.raspagem) +
    toNumber(venda.inicio)
  );
}

export function percent(
  value: number,
  target: number
): number {
  if (target <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, (value / target) * 100)
  );
}