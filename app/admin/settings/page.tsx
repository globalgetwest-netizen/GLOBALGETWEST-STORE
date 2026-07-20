export default function SettingsPage() {
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
                <span>{process.env.NODE_ENV}</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Supabase Connected</span>
                <span className="text-green-600 font-bold">
                  ✓ Connected
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
                <span className="font-semibold">Currency</span>
                <span>USD ($)</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Language</span>
                <span>English</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="font-semibold">Status</span>
                <span className="text-green-600 font-bold">
                  Live
                </span>
              </div>

            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-blue-900 mb-6">
              Future Configuration
            </h2>

            <ul className="space-y-3 text-gray-700">
              <li>✓ Payment Gateway Settings</li>
              <li>✓ Shipping Configuration</li>
              <li>✓ Tax Management</li>
              <li>✓ Email Notifications</li>
              <li>✓ SMS Notifications</li>
              <li>✓ Security Settings</li>
              <li>✓ Backup & Restore</li>
              <li>✓ API Keys</li>
            </ul>
          </div>

        </div>

      </div>

    </main>
  )
}