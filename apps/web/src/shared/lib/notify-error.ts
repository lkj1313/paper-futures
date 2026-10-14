import { toast } from 'sonner';
import { getErrorMessages } from '../api/error';

export function notifyError(error: unknown) {
  const [title, ...rest] = getErrorMessages(error);
  toast.error(title, rest.length ? { description: rest.join(' ') } : undefined);
}
