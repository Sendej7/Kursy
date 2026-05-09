interface Props {
  className?: string;
}

export default function Skeleton({ className = '' }: Props) {
  return <div className={`animate-pulse bg-gray-200 rounded-md ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 bg-white space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
