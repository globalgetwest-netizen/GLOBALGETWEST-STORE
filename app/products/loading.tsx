export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        {/* Breadcrumb skeleton */}
        <div className="h-4 bg-gray-200 rounded w-48 mb-6 animate-pulse" />

        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <div className="h-10 bg-gray-200 rounded w-64 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
          </div>
          <div className="h-10 bg-gray-200 rounded w-48 animate-pulse" />
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar skeleton */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-24" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-32" />
                ))}
              </div>
              <div className="h-5 bg-gray-200 rounded w-28 mt-6" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-28" />
              </div>
            </div>
          </aside>

          {/* Product grid skeleton */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  <div className="w-full h-60 bg-gray-200 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                    <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
                    <div className="pt-2 h-10 bg-gray-200 rounded w-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
