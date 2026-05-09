import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function CertificateDetail() {
  const { code = '' } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['certificate', code],
    queryFn: () => api.getCertificate(code),
  });

  if (isLoading) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;
  if (error || !data) return <p className="max-w-3xl mx-auto px-4 py-10 text-red-600">Nie znaleziono certyfikatu.</p>;

  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex justify-end mb-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 bg-black text-white rounded-md text-sm"
        >
          Drukuj / zapisz jako PDF
        </button>
      </div>

      <article
        id="certificate"
        className="bg-white border-4 border-double border-gray-800 rounded-lg p-12 text-center shadow-lg"
        style={{ aspectRatio: '1.414 / 1' }}
      >
        <div className="text-xs uppercase tracking-[0.4em] text-gray-500">Certyfikat ukończenia</div>
        <h1 className="font-serif text-4xl mt-6">Kursy</h1>
        <p className="text-sm text-gray-600 mt-1">polska platforma do nauki kodowania</p>

        <div className="mt-12">
          <p className="text-sm text-gray-700">Niniejszym potwierdzamy, że</p>
          <h2 className="font-serif text-3xl mt-3">{data.learnerName}</h2>
          <p className="text-sm text-gray-700 mt-3">ukończył(a) kurs</p>
          <h3 className="font-serif text-2xl mt-2 italic">„{data.courseTitle}"</h3>
        </div>

        <div className="mt-16 flex justify-between text-xs text-gray-500">
          <div>
            <div>Wydany</div>
            <div className="font-medium text-gray-800">
              {new Date(data.issuedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div>
            <div>Kod weryfikacyjny</div>
            <div className="font-mono font-medium text-gray-800">{data.code}</div>
          </div>
        </div>
      </article>

      <p className="text-xs text-gray-500 mt-3 text-center print:hidden">
        Każdy może zweryfikować ten certyfikat na: <code className="bg-gray-100 px-1 rounded">/certificates/{data.code}</code>
      </p>
    </section>
  );
}
