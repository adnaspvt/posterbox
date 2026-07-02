import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ReferralProgram() {
  const [copied, setCopied] = useState(false);

  const referralLink = `https://CampSend1.web.app?ref=${typeof window !== 'undefined' ? 'CampSend_' + Math.random().toString(36).substring(7).toUpperCase() : 'CampSend'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform) => {
    const message = `I'm earning money referring people to CampSend! 🚀 Create viral campaigns and get paid. Join here: ${referralLink}`;
    const encodedMessage = encodeURIComponent(message);

    const links = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${referralLink}&quote=${encodedMessage}`,
    };

    window.open(links[platform], '_blank');
  };

  return (
    <section className="py-24 bg-linear-to-b from-white to-slate-50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Program Benefits */}
          <div>
            <h2 className="text-4xl font-black text-slate-900 mb-6">Earn While You Refer 💰</h2>
            <p className="text-slate-600 font-medium mb-8">Share CampSend with your network and get rewarded instantly. No caps. No limits.</p>

            <div className="space-y-5">
              <div className="flex gap-4">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-black text-slate-900">20% Commission</p>
                  <p className="text-sm text-slate-600">Per referred client's first purchase</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-black text-slate-900">Lifetime Earnings</p>
                  <p className="text-sm text-slate-600">Keep earning as long as they use CampSend</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-black text-slate-900">Instant Payouts</p>
                  <p className="text-sm text-slate-600">Withdraw to your bank or wallet weekly</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-black text-slate-900">Tier Bonuses</p>
                  <p className="text-sm text-slate-600">Earn more as your referral volume grows</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Referral Actions */}
          <div className="bg-white rounded-3xl border border-indigo-200 p-8 shadow-xl">
            <div className="mb-8 text-center">
              <span className="text-6xl">🎁</span>
              <h3 className="text-2xl font-black text-slate-900 mt-4">Your Referral Code</h3>
            </div>

            {/* Referral Link Display */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
              <p className="text-xs text-slate-500 font-bold mb-2 uppercase">Copy & Share</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-indigo-700 transition active:scale-95"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <p className="text-xs text-slate-500 font-bold uppercase mb-4 text-center">Share on Social</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleShare('whatsapp')}
                className="bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <span>💬</span>
                <span className="hidden sm:inline text-sm">WhatsApp</span>
              </button>
              <button
                onClick={() => handleShare('twitter')}
                className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <span>𝕏</span>
                <span className="hidden sm:inline text-sm">Twitter</span>
              </button>
              <button
                onClick={() => handleShare('facebook')}
                className="bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <span>f</span>
                <span className="hidden sm:inline text-sm">Facebook</span>
              </button>
            </div>

            {/* Earnings Display */}
            <div className="mt-8 p-4 bg-linear-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 text-center">
              <p className="text-xs text-slate-600 font-bold uppercase mb-1">Total Earnings This Month</p>
              <p className="text-3xl font-black text-indigo-600">₹0</p>
              <p className="text-xs text-slate-500 mt-2">Start sharing to earn your first commission! 🚀</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
