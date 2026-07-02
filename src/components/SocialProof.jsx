import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function SocialProof() {
  const [testimonials, setTestimonials] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const q = query(
          collection(db, 'testimonials'),
          where('approved', '==', true),
          orderBy('createdAt', 'desc'),
          limit(6)
        );
        const snap = await getDocs(q);
        setTestimonials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.log('Testimonials not yet available');
      }
    };
    fetchTestimonials();
  }, []);

  // Fallback testimonials if database empty
  const defaultTestimonials = [
    {
      name: 'Priya Sharma',
      role: 'Political Campaign Manager',
      image: '👩‍💼',
      text: 'PosterBox helped us reach 500K+ voters in just 2 weeks. The viral mechanics are insane!',
      metrics: '500K+ Reach'
    },
    {
      name: 'Rajesh Kumar',
      role: 'NGO Founder',
      image: '👨‍💼',
      text: 'Our social awareness campaign went viral. 2M+ impressions without spending on ads.',
      metrics: '2M+ Impressions'
    },
    {
      name: 'Anaya Desai',
      role: 'Brand Manager',
      image: '👩‍🔬',
      text: 'Template customization is so easy. Our team saved 40 hours on design this month.',
      metrics: '40+ Hours Saved'
    }
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials;
  const current = displayTestimonials[activeIndex % displayTestimonials.length];

  return (
    <section className="py-24 bg-white border-y border-slate-200">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-3">Loved by Campaign Leaders</h2>
          <p className="text-slate-600 font-medium">Join thousands creating viral campaigns</p>
        </div>

        <div className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 md:p-12 border border-indigo-100">
          <div className="flex items-start gap-6">
            <span className="text-6xl">{current.image || '🎯'}</span>
            <div className="flex-1">
              <p className="text-2xl font-bold text-slate-900 mb-6 italic">"{current.text}"</p>
              <div>
                <p className="font-black text-slate-900 text-lg">{current.name}</p>
                <p className="text-sm text-slate-600 font-bold mb-3">{current.role}</p>
                <p className="inline-block bg-indigo-600 text-white text-xs font-black px-4 py-2 rounded-full">
                  📊 {current.metrics}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Dots */}
        <div className="flex justify-center gap-3 mt-8">
          {displayTestimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === activeIndex % displayTestimonials.length
                  ? 'bg-indigo-600 w-8'
                  : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
