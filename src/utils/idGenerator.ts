import { format } from 'date-fns';

export function generateNoteId(date: Date = new Date()): string {
  return format(date, 'yyyyMMddHHmmss');
}
