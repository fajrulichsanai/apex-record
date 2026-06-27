import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
            404
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          Halaman Tidak Ditemukan
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Maaf, halaman yang Anda cari tidak ada atau telah dihapus.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2.83-2.83a3 3 0 014.24 0L11 10v6.59l-2.29-2.29a3 3 0 00-4.24 0L3 17v-5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Kembali ke Dashboard
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2.83-2.83a3 3 0 014.24 0L11 10v6.59l-2.29-2.29a3 3 0 00-4.24 0L3 17v-5" />
            </svg>
            Halaman Login
          </Link>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Kode Error: 404 - Halaman Tidak Ditemukan</p>
        </div>
      </div>
    </div>
  );
}
