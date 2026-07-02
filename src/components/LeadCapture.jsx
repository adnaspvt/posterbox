import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

export default function LeadCapture() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCapture = async (e) => {
    e.preventDefault();
    if (!email || !phone) return toast.error('Please fill in all fields.');

    setIsLoading(true);
    const toastId = toast.loading('Capturing your details...');

    try {
      await addDoc(collection(db, 'leads'), {
        email: email.toLowerCase(),
        phone: phone.replace(/[^0-9]/g, ''),
        source: 'homepage_lead_capture',
        createdAt: serverTimestamp(),
        status: 'new'
      });

      toast.success('Welcome! Check WhatsApp for exclusive updates 🎉', { id: toastId });
      setEmail('');
      setPhone('');

      // Trigger WhatsApp notification
      const message = encodeURIComponent('Hi! Thanks for signing up to CampSend. Unlock 20% OFF your first template purchase. Reply with "YES" to activate your discount! 🎁');
      const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      toast.error('Failed to capture lead. Try again.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-linear-to-r from-indigo-600 to-purple-600 py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[20px_20px]"></div>
      
      <div className="max-w-3xl mx-auto px-6 relative z-10">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 text-center">Unlock Exclusive Access</h2>
          <p className="text-slate-600 text-center mb-10 font-medium">Get 20% OFF premium templates + early access to new features</p>

          <form onSubmit={handleCapture} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                disabled={isLoading}
              />
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              {isLoading ? 'Processing...' : '✨ Claim 20% Discount'}
            </button>

            <p className="text-xs text-slate-500 text-center">
              💬 We'll send you exclusive deals & product updates via WhatsApp. No spam.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
