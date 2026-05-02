import { useChildrenStore } from '@/store/childrenStore';
import { getFlowerState } from '@/utils/screenTime';
import { FlowerState } from '@/types';

export function useChildrenSummary() {
  const children = useChildrenStore(s => s.children);

  const summary = {
    total: children.length,
    blooming: 0,
    warning: 0,
    wilting: 0,
  };

  children.forEach(child => {
    const state = getFlowerState(child.screenTimeToday, child.dailyLimitMinutes);
    summary[state]++;
  });

  return summary;
}

export function useChildState(childId: string): FlowerState | null {
  const child = useChildrenStore(s => s.getChildById(childId));
  if (!child) return null;
  return getFlowerState(child.screenTimeToday, child.dailyLimitMinutes);
}
