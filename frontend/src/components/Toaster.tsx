import { useToast } from '@/lib/toast';

export default function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 w-[320px] pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto text-left px-3 py-2 rounded-md shadow-md text-sm border ${
            t.variant === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : t.variant === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
