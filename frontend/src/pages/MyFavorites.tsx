import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Star, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import Seo from '@/components/Seo';

export default function MyFavorites() {
  const list = useQuery({
    queryKey: ['favorites', 'mine'],
    queryFn: () => api.myFavorites(),
  });

  return (
    <section className="container-page py-10 lg:py-16">
      <Seo title="Moje ulubione" />

      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Ulubione kursy</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Kursy, do których chcesz wrócić.
        </p>
      </div>

      {list.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!list.isLoading && (list.data?.length ?? 0) === 0 && (
        <div className="card p-12 text-center">
          <Heart className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 mb-2">Brak ulubionych.</p>
          <p className="text-sm text-zinc-400 mb-4">
            Wejdź na katalog i kliknij ❤️ obok kursu by zapisać na później.
          </p>
          <Link to="/courses" className="btn-brand inline-flex">
            Przeglądaj katalog
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.data?.map((c) => (
          <Link
            key={c.courseId}
            to={`/courses/${c.slug}`}
            className="card-hover p-6 flex flex-col group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="badge-neutral">{c.language}</span>
              {c.reviewCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {c.averageRating.toFixed(1)}
                </span>
              )}
            </div>
            <h2 className="font-semibold text-lg tracking-tight group-hover:text-brand-600 transition-colors line-clamp-2">
              {c.title}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-3 flex-1 leading-relaxed">
              {c.description}
            </p>
            <p className="mt-4 text-sm font-medium">
              {c.priceMonthlyPln ? (
                <span className="text-brand-600">{c.priceMonthlyPln} zł / mies</span>
              ) : (
                <span className="text-emerald-600">darmowe</span>
              )}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
