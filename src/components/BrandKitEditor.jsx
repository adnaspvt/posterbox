import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

export default function BrandKitEditor({ userId }) {
  const [brandKit, setBrandKit] = useState({
    colors: {
      primary: '#4F46E5',
      secondary: '#8B5CF6',
      accent: '#EC4899',
      background: '#FFFFFF'
    },
    fonts: {
      primary: 'Poppins, sans-serif',
      secondary: 'Inter, sans-serif'
    },
    logo: null,
    guidelines: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBrandKit();
  }, [userId]);

  const loadBrandKit = async () => {
    try {
      const brandDoc = await getDoc(doc(db, 'users', userId, 'branding', 'kit'));
      if (brandDoc.exists()) {
        setBrandKit(brandDoc.data());
      }
    } catch (err) {
      console.error('Error loading brand kit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!brandKit.colors.primary || !brandKit.fonts.primary) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'users', userId, 'branding', 'kit'), brandKit, { merge: true });
      toast.success('Brand Kit saved! 🎨');
    } catch (err) {
      console.error('Error saving brand kit:', err);
      toast.error('Failed to save brand kit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading brand kit...</div>;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Brand Kit</h1>
        <p className="text-slate-500 mt-2 font-medium">Define your brand colors, fonts, and guidelines for consistent campaigns.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Colors */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Brand Colors</h2>
          <div className="space-y-4">
            {Object.entries(brandKit.colors).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-bold text-slate-600 mb-2 capitalize">{key}</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setBrandKit(prev => ({
                      ...prev,
                      colors: { ...prev.colors, [key]: e.target.value }
                    }))}
                    className="w-16 h-12 rounded-lg cursor-pointer border border-slate-200"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setBrandKit(prev => ({
                      ...prev,
                      colors: { ...prev.colors, [key]: e.target.value }
                    }))}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Color Preview</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(brandKit.colors).map(([key, value]) => (
              <div key={key} className="text-center">
                <div
                  style={{ backgroundColor: value }}
                  className="w-full h-24 rounded-lg border border-slate-200 mb-2 shadow-sm"
                ></div>
                <p className="text-xs font-bold text-slate-600 capitalize">{key}</p>
                <p className="text-xs text-slate-400">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fonts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Fonts</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(brandKit.fonts).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-bold text-slate-600 mb-2 capitalize">{key} Font</label>
              <select
                value={value}
                onChange={(e) => setBrandKit(prev => ({
                  ...prev,
                  fonts: { ...prev.fonts, [key]: e.target.value }
                }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option>Arial, sans-serif</option>
                <option>Poppins, sans-serif</option>
                <option>Inter, sans-serif</option>
                <option>Roboto, sans-serif</option>
                <option>Playfair Display, serif</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Guidelines */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Brand Guidelines</h2>
        <textarea
          value={brandKit.guidelines}
          onChange={(e) => setBrandKit(prev => ({ ...prev, guidelines: e.target.value }))}
          placeholder="Describe your brand voice, usage guidelines, dos and don'ts..."
          rows="6"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
        >
          {saving ? '💾 Saving...' : '💾 Save Brand Kit'}
        </button>
      </div>
    </div>
  );
}
