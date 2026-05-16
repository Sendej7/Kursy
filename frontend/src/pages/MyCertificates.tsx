import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import Seo from '@/components/Seo';

export default function MyCertificates() {
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'certificates'],
    queryFn: () => api.myCertificates(),
  });

  return (
    <section className="container-page py-10 lg:py-16">
      <Seo title="Moje certyfikaty" />

      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Moje certyfikaty</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Każdy certyfikat ma weryfikowalny kod — możesz go udostępnić na LinkedIn.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((c) => (
          <Link
            key={c.code}
            to={`/certificates/${c.code}`}
            className="card-hover p-6 group relative overflow-hidden"
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-amber-200 to-amber-400 dark:from-amber-700 dark:to-amber-900 rounded-full opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lift">
                  <Award className="w-5 h-5" />
                </div>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <h2 className="font-semibold text-lg tracking-tight line-clamp-2 group-hover:text-brand-600 transition-colors">
                {c.courseTitle}
              </h2>
              <p className="text-xs text-zinc-500 mt-2 font-mono">
                {c.code}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                wydany {new Date(c.issuedAt).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <span className="inline-flex items-center gap-1 text-sm text-brand-600 mt-3 group-hover:translate-x-1 transition-transform">
                Zobacz certyfikat <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
        {data && data.length === 0 && (
          <div className="md:col-span-2 card p-12 text-center">
            <Award className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 mb-4">Nie masz jeszcze certyfikatów.</p>
            <p className="text-sm text-zinc-400 mb-4">Ukończ kurs by go zdobyć!</p>
            <Link to="/courses" className="btn-brand inline-flex">
              Przeglądaj kursy
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
