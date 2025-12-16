'use client';

import { useEffect, useState } from 'react';
import { testSupabaseConnection } from '@/lib/test-connection';

export default function TestConnectionPage() {
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function test() {
      const connectionResult = await testSupabaseConnection();
      setResult(connectionResult);
      setLoading(false);
    }
    test();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Probando conexión con Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Test de Conexión Supabase
        </h1>
        
        {result && (
          <div
            className={`p-4 rounded-lg ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center mb-2">
              {result.success ? (
                <svg
                  className="w-6 h-6 text-green-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-red-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <h2
                className={`text-lg font-semibold ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {result.success ? 'Conexión Exitosa' : 'Error de Conexión'}
              </h2>
            </div>
            <p
              className={`mb-2 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {result.message}
            </p>
            {result.error && (
              <p className="text-sm text-red-600 bg-red-100 p-2 rounded mt-2">
                {result.error}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 space-y-2 text-sm text-gray-600">
          <p>
            <strong>URL:</strong>{' '}
            {process.env.NEXT_PUBLIC_SUPABASE_URL
              ? '✅ Configurada'
              : '❌ No configurada'}
          </p>
          <p>
            <strong>Key:</strong>{' '}
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              ? '✅ Configurada'
              : '❌ No configurada'}
          </p>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="block text-center text-blue-600 hover:text-blue-800 underline"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

