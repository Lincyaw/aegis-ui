import { useActiveProjectId } from '../mocks';

export function useActiveProjectNumericId(): number {
  const id = useActiveProjectId();
  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
