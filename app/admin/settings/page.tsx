export default function SettingsPage() {
  // Get environment safely for client component
  const env: any = typeof process !== 'undefined' ? process.env : {};

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-900 mb-10">
          Settings
        </h1>

        <div className="grid gap-8">
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-blue-900 mb-6">
              Application
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Application</span>
                <span>GLOBALGETWEST Marketplace</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Version</span>
                <span>Version 1.0</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Environment</span>
                <span>
                  {/* Using next/config would be better, but for simplicity: */}
                  {env.NODE_ENV ? env.NODE_ENV : 'development'}
                </span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Database Connected</span>
                <span className="text-green-600 font-bold">
                  âœ“ Connected
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-blue-900 mb-6">
              Store Information
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Store Name</span>
                <span>GLOBALGETWEST</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Store URL</span>
                <span>globalgetwest.com</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Currency</span>
                <span>USD (United States Dollar)</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Timezone</span>
                <span>GMT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}


