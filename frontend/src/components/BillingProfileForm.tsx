import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

export default function BillingProfileForm() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'profile'],
    queryFn: () => api.billing.getProfile(),
  });

  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('PL');

  useEffect(() => {
    if (!data) return;
    setCompanyName(data.companyName ?? '');
    setNip(data.nip ?? '');
    setAddressLine(data.addressLine ?? '');
    setPostalCode(data.postalCode ?? '');
    setCity(data.city ?? '');
    setCountry(data.country ?? 'PL');
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.billing.updateProfile({
        companyName: companyName.trim() || null,
        nip: nip.trim() || null,
        addressLine: addressLine.trim() || null,
        postalCode: postalCode.trim() || null,
        city: city.trim() || null,
        country: country.trim() || 'PL',
      }),
    onSuccess: () => {
      toast.success('Dane do faktury zapisane.');
      qc.invalidateQueries({ queryKey: ['billing', 'profile'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd zapisu.'),
  });

  if (isLoading) return <p className="text-gray-500 text-sm">Ładowanie…</p>;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <p className="text-xs text-gray-500">
        Zostaw puste, by faktury były wystawiane na osobę fizyczną. Wypełnij, by dostawać faktury VAT na firmę.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs">Nazwa firmy</span>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="np. Acme Sp. z o.o."
          />
        </label>
        <label className="block">
          <span className="text-xs">NIP (10 cyfr)</span>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            placeholder="1234567890"
            maxLength={13}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs">Adres (ulica i numer)</span>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs">Kod pocztowy</span>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="00-000"
            maxLength={6}
          />
        </label>
        <label className="block">
          <span className="text-xs">Miasto</span>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs">Kraj</span>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={2}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={save.isPending}
        className="px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
      >
        {save.isPending ? 'Zapisuję…' : 'Zapisz dane do faktury'}
      </button>
    </form>
  );
}
