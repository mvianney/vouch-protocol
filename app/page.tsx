export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white font-mono">
      <div className="text-center space-y-4 max-w-xl px-6">
        <h1 className="text-5xl font-bold tracking-tight">Vouch</h1>
        <p className="text-xl text-gray-400">
          AI Concierge · Solana Agent Registry
        </p>
        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-lg text-left text-sm space-y-1">
          <p className="text-green-400">✓ Next.js 14 (App Router)</p>
          <p className="text-green-400">✓ @supabase/supabase-js</p>
          <p className="text-green-400">✓ @solana/web3.js</p>
          <p className="text-green-400">✓ 8004-solana agent registry</p>
        </div>
        <p className="text-gray-600 text-sm pt-4">Scaffold ready. Build something great.</p>
      </div>
    </div>
  );
}
