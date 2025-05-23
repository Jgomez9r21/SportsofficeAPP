import type { Space } from '@/lib/types';
import SpaceCard from './SpaceCard';

interface SpaceListProps {
  spaces: Space[];
}

export default function SpaceList({ spaces }: SpaceListProps) {
  if (!spaces || spaces.length === 0) {
    return <p className="text-center text-muted-foreground">No spaces available at the moment.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {spaces.map((space) => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </div>
  );
}
