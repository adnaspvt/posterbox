import { useNavigate } from 'react-router-dom';

export default function DesignerProgram() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-linear-to-r from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[30px_30px]"></div>
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Benefits */}
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Monetize Your Designs 🎨</h2>
            <p className="text-xl text-slate-300 font-medium mb-8">Join our Designer Network and earn recurring income from your templates</p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="text-3xl shrink-0">💰</span>
                <div>
                  <p className="font-bold text-white text-lg">Earn Per Sale</p>
                  <p className="text-slate-400 font-medium">Set your commission (10-100%) and earn every time your template is used</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-3xl shrink-0">📈</span>
                <div>
                  <p className="font-bold text-white text-lg">Real-Time Analytics</p>
                  <p className="text-slate-400 font-medium">Track sales, earnings, and engagement for each template</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-3xl shrink-0">🌍</span>
                <div>
                  <p className="font-bold text-white text-lg">Unlimited Reach</p>
                  <p className="text-slate-400 font-medium">Your templates available to our growing community of users</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-3xl shrink-0">✅</span>
                <div>
                  <p className="font-bold text-white text-lg">Easy Publishing</p>
                  <p className="text-slate-400 font-medium">Upload templates in minutes with our simple template builder</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/designer-portal')}
              className="mt-8 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-black text-lg py-4 px-8 rounded-xl shadow-xl shadow-purple-600/50 hover:shadow-2xl hover:shadow-purple-600/70 transition hover:-translate-y-1 active:scale-95"
            >
              🚀 Start Earning Today
            </button>
          </div>

          {/* Right: Stats */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 hover:border-indigo-500/50 transition">
              <p className="text-sm text-slate-400 font-bold uppercase mb-2">Top Designer</p>
              <p className="text-3xl font-black text-emerald-400 mb-1">₹2,50,000+</p>
              <p className="text-sm text-slate-400">Earned in 6 months with 45+ templates</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 hover:border-indigo-500/50 transition">
              <p className="text-sm text-slate-400 font-bold uppercase mb-2">Average Commission</p>
              <p className="text-3xl font-black text-purple-400 mb-1">30%</p>
              <p className="text-sm text-slate-400">Designers earn 30% per template sale on average</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 hover:border-indigo-500/50 transition">
              <p className="text-sm text-slate-400 font-bold uppercase mb-2">Active Designers</p>
              <p className="text-3xl font-black text-indigo-400 mb-1">500+</p>
              <p className="text-sm text-slate-400">Growing network of verified designers</p>
            </div>

            <div className="bg-linear-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl p-6 border border-indigo-500/30">
              <p className="text-white font-bold mb-2">⭐ Designer Success Story</p>
              <p className="text-sm text-slate-300 italic">"I uploaded 10 templates and earned ₹1,50,000 in 3 months. The platform handles everything - payments, analytics, everything!"</p>
              <p className="text-xs text-slate-400 mt-3">— Aditya Singh, Professional Designer</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
