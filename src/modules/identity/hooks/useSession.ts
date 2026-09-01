import { useSessionContext } from '../SessionProvider';

export function useSession() {
  return useSessionContext();
}
