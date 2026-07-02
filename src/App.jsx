import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { auth, googleProvider, db } from './config/firebase';
import toast, { Toaster } from 'react-hot-toast';
import { Rocket, Flame, Leaf, Smartphone, Palette } from 'lucide-react';

// ==========================================
// 🚀 ENTERPRISE LAZY LOADING
// ==========================================
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Generator = lazy(() => import('./pages/Generator'));
const Admin = lazy(() => import('./pages/Admin'));
const DesignerPortal = lazy(() => import('./pages/DesignerPortal'));

// ==========================================
// 📊 MARKETING COMPONENTS
// ==========================================
const LeadCapture = lazy(() => import('./components/LeadCapture'));
const SocialProof = lazy(() => import('./components/SocialProof'));
const CampaignMetrics = lazy(() => import('./components/CampaignMetrics'));
const ReferralProgram = lazy(() => import('./components/ReferralProgram'));
const VideoTutorials = lazy(() => import('./components/VideoTutorials'));
const DesignerProgram = lazy(() => import('./components/DesignerProgram'));

// ⏳ FALLBACK LOADER
const PageLoader = () => (
  <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
    <p className="text-slate-500 font-bold tracking-widest uppercase text-xs animate-pulse">Loading Workspace...</p>
  </div>
);

// ==========================================
// 1. DYNAMIC, SEO & CONVERSION OPTIMIZED HOME PAGE
// ==========================================
function HomePage() {
  const navigate = useNavigate();
  const [publicCampaigns, setPublicCampaigns] = useState([]);
  const [platformTemplates, setPlatformTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  // --- SMART SCROLL LISTENER FOR HEADER ---
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- ISOLATED DATABASE FETCHING ---
  useEffect(() => {
    const fetchPlatformData = async () => {
      setIsLoading(true);

      const campaignPromise = getDocs(query(
        collection(db, "campaigns"),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc"),
        limit(6)
      ));

      const templatesPromise = getDocs(query(
        collection(db, "templates"),
        orderBy("createdAt", "desc"),
        limit(8)
      ));

      try {
        const [campSnap, tempSnap] = await Promise.all([campaignPromise, templatesPromise]);
        setPublicCampaigns(campSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setPlatformTemplates(tempSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("⚠️ Error fetching homepage data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlatformData();
  }, []);

  // --- SECRET OWNER PORTAL TRIGGER ---
  const [clickCount, setClickCount] = useState(0);
  const clickTimerRef = useRef(null);
  const handleSecretClick = () => {
    setClickCount(prev => {
      const nextCount = prev + 1;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      clickTimerRef.current = setTimeout(() => setClickCount(0), 2000);

      if (nextCount >= 3) {
        toast.success('Master Override Authorized.', { icon: '🔐', style: { background: '#020617', color: '#10b981' } });
        navigate('/owner-portal');
        return 0;
      }

      return nextCount;
    });
  };

  const faqs = [
    { q: "Do users need an account to generate a poster?", a: "No! Your audience can generate and download their personalized posters instantly without creating an account, ensuring maximum conversion and sharing." },
    { q: "Where are the images hosted?", a: "Background art is securely hosted in the cloud. User photos are processed dynamically on their device and are never permanently stored on our servers, ensuring complete privacy." },
    { q: "Can I use this for political campaigns?", a: "Absolutely. CampSend is built to scale for high-traffic events, political advocacy, and viral brand movements." }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* SMART STICKY HEADER */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="text-2xl font-black text-indigo-600 tracking-tighter cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            Camp<span className="text-slate-800">Send</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth')} className="bg-slate-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-slate-800 transition shadow-sm hover:-translate-y-0.5 flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4" /> Client Login
            </button>
            <button onClick={() => navigate('/designer-portal')} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm hover:-translate-y-0.5 flex items-center gap-2 text-sm">
              <Palette className="w-4 h-4" /> Designer Portal
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-20">
        {/* HERO SECTION */}
        <section className="px-6 max-w-6xl mx-auto w-full text-center py-20 md:py-28 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 font-bold px-4 py-1.5 rounded-full text-sm mb-6 border border-indigo-100">
            <Rocket className="w-4 h-4" /> The #1 Platform for User-Generated Campaigns
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-slate-900 leading-tight">
            Scale Your <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600">Viral Message</span>
          </h1>
          <h2 className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 font-medium leading-relaxed">
            Empower local people with a mobile-first custom poster maker. Automate photo framing, track your reach, and drive massive awareness through instant WhatsApp sharing right from any smartphone.
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button onClick={() => navigate('/auth')} className="w-full sm:w-auto bg-slate-900 text-white font-bold text-lg py-3 px-10 rounded-xl shadow-sm hover:bg-slate-800 transition-all active:scale-95">
              Start Building Free
            </button>
          </div>
        </section>

        {/* LIVE CAMPAIGNS GALLERY */}
        <section className="bg-white border-y border-slate-200 py-20 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-50"></div>

          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">Trending Community Campaigns</h2>
              <p className="text-slate-500 font-medium mt-3 max-w-2xl mx-auto">Click any live campaign below to experience the generator engine in action.</p>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-10 text-indigo-600 font-bold animate-pulse">Loading viral network...</div>
            ) : publicCampaigns.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100"><Leaf className="w-8 h-8 text-emerald-500" /></div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">The platform is ready</h3>
                <p className="text-slate-500 text-sm">Log in, create a campaign, and check "Feature on Homepage" to see it here!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {publicCampaigns.map(camp => (
                  <article key={camp.id} onClick={() => window.open(`/generator?id=${camp.id}`, '_blank')} className="group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer duration-300">
                    <div className="h-64 bg-slate-100 relative overflow-hidden">
                      <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: `url(${camp.backgroundImage})` }}></div>
                      <div className="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                      <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                        <span className="bg-white/90 backdrop-blur-md text-slate-800 text-xs font-bold px-3 py-1.5 rounded-md shadow-sm flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-500" /> {camp.postersGenerated || 0} Generated
                        </span>
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">→</div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-xl text-slate-800 mb-1 truncate">{camp.title}</h3>
                      <p className="text-xs font-bold text-slate-400 truncate uppercase tracking-wider">By {camp.ownerEmail}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* PLATFORM TEMPLATES GALLERY */}
        <section className="bg-slate-50 border-b border-slate-200 py-20 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">Premium Master Templates</h2>
              <p className="text-slate-500 font-medium mt-3 max-w-2xl mx-auto">Start with a professional layout. Fully customizable in the Pro Studio.</p>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-10 text-indigo-600 font-bold animate-pulse">Loading templates...</div>
            ) : platformTemplates.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-2xl mx-auto">
                <span className="text-4xl mb-4 block">🖼️</span>
                <p className="text-slate-500 font-medium">New templates are being designed and will be available soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {platformTemplates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => {
                      // 🚀 THE FIX: Pass the template ID securely to the Auth route
                      toast('Taking you to the Studio...', { icon: '✨' });
                      navigate(`/auth?template=${template.id}`);
                    }}
                    className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="aspect-3/4 bg-slate-100 rounded-xl mb-3 overflow-hidden relative">
                      <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: `url(${template.backgroundImage})` }}></div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                        <span className="bg-white text-indigo-600 font-bold text-sm px-4 py-2 rounded-lg shadow-lg">Use Template</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 text-center truncate px-2 mb-1">{template.title}</h3>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center mt-12">
              <button onClick={() => navigate('/auth')} className="bg-white border border-slate-300 text-slate-700 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition shadow-sm">
                View All Templates
              </button>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-24 bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-10 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full flex justify-between items-center p-6 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <span className="font-bold text-slate-800 text-lg">{faq.q}</span>
                    <span className="text-indigo-600 font-black text-xl">{activeFaq === idx ? '−' : '+'}</span>
                  </button>
                  {activeFaq === idx && (
                    <div className="p-6 bg-white text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CAMPAIGN METRICS SHOWCASE */}
        <Suspense fallback={<div className="py-24 text-center text-slate-500">Loading metrics...</div>}>
          <CampaignMetrics />
        </Suspense>

        {/* SOCIAL PROOF - TESTIMONIALS */}
        <Suspense fallback={<div className="py-24 text-center text-slate-500">Loading testimonials...</div>}>
          <SocialProof />
        </Suspense>

        {/* VIDEO TUTORIALS */}
        <Suspense fallback={<div className="py-24 text-center text-slate-500">Loading videos...</div>}>
          <VideoTutorials />
        </Suspense>

        {/* REFERRAL PROGRAM */}
        <Suspense fallback={<div className="py-24 text-center text-slate-500">Loading referral program...</div>}>
          <ReferralProgram />
        </Suspense>

        {/* DESIGNER PROGRAM */}
        <Suspense fallback={<div className="py-24 text-center text-slate-500">Loading designer program...</div>}>
          <DesignerProgram />
        </Suspense>

        {/* LEAD CAPTURE */}
        <Suspense fallback={<div className="py-24 text-center text-slate-500">Loading lead form...</div>}>
          <LeadCapture />
        </Suspense>

      </main>

      {/* SEO FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-16 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-black text-white tracking-tighter mb-6">Camp<span className="text-indigo-400">Send</span></h2>
          <p className="text-sm font-medium mb-8 leading-relaxed max-w-2xl mx-auto">
            CampSend is a comprehensive digital marketing platform designed to generate high-converting, user-generated poster campaigns. Automate custom photo framing and drive organic social media growth today.
          </p>
          <div className="flex justify-center gap-6 mb-8 text-sm font-bold text-slate-500">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Service</span>
            <span className="hover:text-white cursor-pointer">Contact Us</span>
          </div>
          <p onClick={handleSecretClick} className="text-xs font-bold tracking-widest uppercase cursor-pointer select-none text-slate-600 hover:text-slate-500 transition">
            © {new Date().getFullYear()} CampSend Platform. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// 2. AUTHENTICATION PAGE 
// ==========================================
function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation(); // 🚀 Captures the ?template=123 from the URL
  const queryParams = location.search;

  const [isLoginMode, setIsLoginMode] = useState(true);

  const [firmName, setFirmName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await setDoc(doc(db, "users", user.uid), {
        firmName: user.displayName || "Google User", email: user.email, createdAt: serverTimestamp()
      }, { merge: true });
      toast.success('Welcome to CampSend!', { duration: 3000 });

      // 🚀 Pass the query params to the Dashboard so it knows to clone the template
      navigate('/dashboard' + queryParams);
    }
    catch (error) {
      console.error("Google Auth Error:", error);
      toast.error("Google sign-in failed: " + error.message);
    }
    finally { setAuthLoading(false); }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (isLoginMode && (!email || !password)) return toast.error("Please fill in your email and password.");
    if (!isLoginMode && (!firmName || !phone || !email || !password)) return toast.error("Please fill in all fields.");

    setAuthLoading(true);
    const toastId = toast.loading('Authenticating...');

    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Login successful!', { id: toastId });
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: firmName });

        await setDoc(doc(db, "users", user.uid), {
          firmName: firmName,
          email: email,
          phone: phone,
          role: "client",
          createdAt: serverTimestamp()
        });
        toast.success('Account created successfully!', { id: toastId });
      }

      // 🚀 Pass the query params to the Dashboard 
      navigate('/dashboard' + queryParams);
    }
    catch (error) {
      let errorMessage = "Authentication failed. Check your details.";
      if (error.code === 'auth/email-already-in-use') errorMessage = "This email is already registered.";
      else if (error.code === 'auth/weak-password') errorMessage = "Password must be at least 6 characters.";
      else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') errorMessage = "Incorrect email or password.";
      else if (error.code === 'auth/invalid-email') errorMessage = "Please enter a valid email address.";

      toast.error(errorMessage, { id: toastId });
    }
    finally { setAuthLoading(false); }
  };

  const handlePasswordReset = async () => {
    if (!email) return toast.error('Enter your email to reset password.');
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent. Check your inbox.');
    } catch (err) {
      toast.error('Unable to send reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-50"></div>

      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-md relative z-10 border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{isLoginMode ? "Welcome Back" : "Register Firm"}</h2>
          <button onClick={() => navigate('/')} className="text-slate-400 font-bold hover:text-slate-800 transition bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
        </div>

        <button onClick={handleGoogleAuth} disabled={authLoading} className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold text-lg py-4 rounded-xl flex flex-row items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all mb-8 disabled:opacity-50 active:scale-95">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-8"><div className="h-px bg-slate-200 flex-1"></div><span className="text-slate-400 text-xs font-black uppercase tracking-widest">OR EMAIL</span><div className="h-px bg-slate-200 flex-1"></div></div>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          {!isLoginMode && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col gap-4">
              <input type="text" placeholder="Firm / Organization Name" value={firmName} onChange={(e) => setFirmName(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium text-slate-900 transition-all" />
              <input type="tel" placeholder="WhatsApp / Mobile Number (e.g. +91...)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium text-slate-900 transition-all" />
            </div>
          )}
          <input type="email" placeholder="Organization Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium transition-all" />
          <input type="password" placeholder="Password (Min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium transition-all" />
          <div className="flex justify-between items-center">
            <button type="button" onClick={handlePasswordReset} className="text-sm text-indigo-600 hover:underline">Forgot password?</button>
            <div />
          </div>

          <button type="submit" disabled={authLoading} className="w-full bg-slate-900 text-white font-medium text-base py-3.5 rounded-lg mt-4 shadow-sm hover:bg-slate-800 disabled:opacity-70 disabled:translate-y-0 transition-all active:scale-95">
            {authLoading ? "Processing..." : (isLoginMode ? "Enter Dashboard" : "Register Account")}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 font-medium">
          {isLoginMode ? "Is your firm new here?" : "Already have a firm account?"}
          <button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setFirmName(''); setPhone(''); }} className="text-indigo-600 font-black hover:underline ml-2">
            {isLoginMode ? "Register" : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ==========================================
// 3. MASTER ROUTER
// ==========================================
export default function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { fontWeight: 'bold', borderRadius: '12px', padding: '16px' } }} />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/owner-portal" element={<Admin />} />
            <Route path="/designer-portal" element={<DesignerPortal />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}
