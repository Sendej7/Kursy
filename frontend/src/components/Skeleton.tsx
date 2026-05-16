interface Props {
  className?: string;
}

export default function Skeleton({ className = '' }: Props) {
  return <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-md ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-6 space-y-3">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3 mt-4" />
    </div>
  );
}
