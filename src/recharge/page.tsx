export default function RechargePage() {
    return (
      <main className="min-h-screen bg-white text-gray-800">
        <header className="sticky top-0 z-20 w-full bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-5">
          <div className="mx-auto max-w-[1600px]">
            <h1 className="text-3xl font-bold">Recharge Basin Assessment – MVP</h1>
            <p className="mt-2 text-lg text-gray-700 max-w-3xl">
              Groundwater levels in California’s Central Valley have dropped after decades of pumping.
              Recharge basins capture surface water and let it soak back into the ground to replenish aquifers.
              This tool helps estimate recharge volume, costs, and ROI when setting aside land for a basin.
            </p>
          </div>
        </header>
  
        {/* You can add the rest of the problem/solution components below */}
        <section className="p-8">
          <h2 className="text-2xl font-semibold mb-4">Problem</h2>
          <p>Describe the problem context here...</p>
  
          <h2 className="text-2xl font-semibold mt-8 mb-4">Solution</h2>
          <p>Describe your MVP tool’s solution here...</p>
        </section>
      </main>
    );
  }
  