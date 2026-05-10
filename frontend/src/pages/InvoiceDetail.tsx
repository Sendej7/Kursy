import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function InvoiceDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.invoices.get(id),
  });

  if (isLoading) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;
  if (error || !data) return <p className="max-w-3xl mx-auto px-4 py-10 text-red-600">Nie znaleziono faktury.</p>;

  const fmt = (n: number) =>
    n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex justify-end gap-2 mb-3 print:hidden">
        <button
          onClick={async () => {
            const blob = await api.invoices.pdf(id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FV-${data.number.replace(/\//g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
          className="px-3 py-1.5 bg-black text-white rounded-md text-sm"
        >
          Pobierz PDF
        </button>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
        >
          Drukuj (HTML)
        </button>
      </div>

      <article id="invoice" className="bg-white border rounded-lg p-10 shadow-sm text-sm space-y-6">
        <header className="flex justify-between items-start border-b pb-4">
          <div>
            <h1 className="text-xl font-bold">Faktura {data.number}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Data wystawienia: {new Date(data.issuedAt).toLocaleDateString('pl-PL')}
              {data.paidAt && ` · Data płatności: ${new Date(data.paidAt).toLocaleDateString('pl-PL')}`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold">Kursy.pl</p>
            <p className="text-xs text-gray-500">polska platforma do nauki kodowania</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase text-gray-500">Sprzedawca</p>
            <p className="mt-1 font-medium">Kursy.pl Sp. z o.o.</p>
            <p className="text-xs text-gray-600">[adres siedziby]</p>
            <p className="text-xs text-gray-600">NIP: [NIP sprzedawcy]</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Nabywca</p>
            <p className="mt-1 font-medium">{data.buyerName}</p>
            {data.buyerAddressLine && <p className="text-xs text-gray-600">{data.buyerAddressLine}</p>}
            {(data.buyerPostalCode || data.buyerCity) && (
              <p className="text-xs text-gray-600">
                {data.buyerPostalCode} {data.buyerCity}
              </p>
            )}
            {data.buyerNip && <p className="text-xs text-gray-600">NIP: {data.buyerNip}</p>}
          </div>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="py-2 text-left px-2">Pozycja</th>
              <th className="py-2 text-right px-2">Netto</th>
              <th className="py-2 text-right px-2">VAT %</th>
              <th className="py-2 text-right px-2">VAT</th>
              <th className="py-2 text-right px-2">Brutto</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2">{data.description}</td>
              <td className="py-2 px-2 text-right">{fmt(data.netAmount)} {data.currency}</td>
              <td className="py-2 px-2 text-right">{data.vatRatePct}%</td>
              <td className="py-2 px-2 text-right">{fmt(data.vatAmount)} {data.currency}</td>
              <td className="py-2 px-2 text-right">{fmt(data.grossAmount)} {data.currency}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-3 px-2">Razem do zapłaty</td>
              <td className="py-3 px-2 text-right">{fmt(data.netAmount)}</td>
              <td className="py-3 px-2"></td>
              <td className="py-3 px-2 text-right">{fmt(data.vatAmount)}</td>
              <td className="py-3 px-2 text-right">{fmt(data.grossAmount)} {data.currency}</td>
            </tr>
          </tfoot>
        </table>

        <p className="text-xs text-gray-500">
          Faktura została opłacona — nie wymaga uregulowania. Płatność obsługiwana przez Stripe.
        </p>
      </article>

      <p className="text-xs text-gray-500 mt-3 text-center print:hidden">
        Numer faktury: <code>{data.number}</code>
      </p>
    </section>
  );
}
