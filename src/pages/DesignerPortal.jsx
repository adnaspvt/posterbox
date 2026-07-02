import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc, query, where, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, IMGBB_API_KEY, googleProvider } from '../config/firebase';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import ProEditor from '../components/ProEditor';
import NotificationBell from '../components/NotificationBell';

function DesignerPortal() {
  const navigate = useNavigate();

  // ==========================================
  // AUTH STATE
  // ==========================================
  const [authStatus, setAuthStatus] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupMode, setSignupMode] = useState(false);
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    specialty: 'General Graphics',
    portfolio: ''
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // ==========================================
  // DESIGNER PROFILE & TEMPLATES
  // ==========================================
  const [designer, setDesigner] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [earnings, setEarnings] = useState({ totalEarnings: 0, monthlyEarnings: 0, templatesSold: 0, templatesCreated: 0, paidOut: 0, availablePayout: 0 });
  const [activeTab, setActiveTab] = useState('templates');
  const [isFetching, setIsFetching] = useState(false);
  const [workRequests, setWorkRequests] = useState([]);

  // ==========================================
  // TEMPLATE UPLOAD FORM
  // ==========================================
  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    category: 'General',
    price: 299,
    commissionPercent: 30,
    backgroundImage: null,
    elements: [],
    tags: ''
  });
  const [uploading, setUploading] = useState(false);
  const templateImageRef = useRef(null);

  // ==========================================
  // PRO EDITOR INTEGRATION STATE
  // ==========================================
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [bgImageFile, setBgImageFile] = useState(null);
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(1066);
  // We use templateForm.title for campaignTitle, and templateForm.backgroundImage for bgImage


  // ==========================================
  // AUTH & DATA LOADING
  // ==========================================
  const loadDesignerState = async (user) => {
    setCurrentUser(user || null);
    if (!user) {
      setAuthStatus('locked');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().isDesigner === true) {
        const data = userDoc.data();
        setDesigner({ uid: user.uid, ...data });
        setAuthStatus('unlocked');
        fetchDesignerTemplates(user.uid);
        fetchEarnings(user.uid, data.paidOut || 0);
      } else {
        setAuthStatus('apply');
        setSignupData(prev => ({
          ...prev,
          email: user.email || prev.email,
          name: user.displayName || prev.name
        }));
      }
    } catch (err) {
      console.error('Error loading designer profile:', err);
      setAuthStatus('locked');
    }
  };

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      await loadDesignerState(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser || authStatus !== 'unlocked') return;
    const q = query(collection(db, 'designRequests'), where('designerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = [];
      snapshot.forEach(doc => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      // Sort locally: pending first, then by date
      requests.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setWorkRequests(requests);

      // Check for new pending requests to show a notification
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newReq = change.doc.data();
          if (newReq.status === 'pending') {
            toast.success(`New work request from ${newReq.firmName}!`, { icon: '💼', style: { background: '#020617', color: '#10b981' } });
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("New Work Request", { body: `Client ${newReq.firmName} sent you a design request.` });
            }
          }
        }
      });
    });
    return () => unsubscribe();
  }, [currentUser, authStatus]);

  const fetchDesignerTemplates = async (uid) => {
    setIsFetching(true);
    try {
      const q = query(collection(db, 'templates'), where('designerId', '==', uid));
      const snap = await getDocs(q);
      setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchEarnings = async (uid, paidOut = 0) => {
    try {
      const userTemplates = await getDocs(query(collection(db, 'templates'), where('designerId', '==', uid)));
      const totalSales = userTemplates.docs.reduce((sum, doc) => sum + (doc.data().timesPurchased || 0), 0);
      const totalEarned = userTemplates.docs.reduce((sum, doc) => {
        const sales = doc.data().timesPurchased || 0;
        const commission = (doc.data().commissionPercent || 30) / 100;
        return sum + (sales * doc.data().price * commission);
      }, 0);

      setEarnings({
        totalEarnings: totalEarned,
        monthlyEarnings: totalEarned * 0.4, // Approximate
        templatesSold: totalSales,
        templatesCreated: userTemplates.docs.length,
        paidOut: paidOut,
        availablePayout: totalEarned - paidOut
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  const handleRequestPayout = async () => {
    if (earnings.availablePayout <= 0) return toast.error("No available earnings to withdraw.");
    const toastId = toast.loading('Submitting payout request...');
    try {
      await addDoc(collection(db, 'payoutRequests'), {
        designerId: designer.uid,
        designerName: designer.name,
        designerEmail: designer.email,
        amount: earnings.availablePayout,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Payout requested successfully! Admin will process it soon.', { id: toastId });
    } catch (error) {
      toast.error('Failed to request payout.', { id: toastId });
    }
  };

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupData.name || !signupData.email || (!currentUser && !signupData.password)) {
      return toast.error('Please fill all fields');
    }

    setIsAuthenticating(true);
    const toastId = toast.loading('Processing designer request...');

    try {
      let user = currentUser;
      if (!user) {
        const result = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
        user = result.user;
      }

      if (!currentUser) {
        await updateProfile(user, { displayName: signupData.name });
      } else {
        await updateProfile(user, { displayName: signupData.name || user.displayName });
      }

      const userRef = doc(db, 'users', user.uid);
      const designerPayload = {
        name: signupData.name,
        email: signupData.email,
        isDesigner: true,
        specialty: signupData.specialty,
        portfolio: signupData.portfolio,
        designerBio: '',
        designerRating: 5.0,
        designerReviews: 0,
        designerStatus: 'pending',
        earnings: 0,
        templatesCreated: 0
      };

      await setDoc(userRef, designerPayload, { merge: true });
      toast.success('Your designer profile request has been saved. Pending approval 🛠️', { id: toastId });
      setSignupMode(false);
      loadDesignerState(user);
    } catch (error) {
      console.error('Designer signup failed:', error);
      if (error.code === 'auth/email-already-in-use' && !currentUser) {
        toast.error('This email is already registered. Please sign in and then apply to become a designer.', { id: toastId });
      } else {
        toast.error(error.message || 'Signup failed. Please try again.', { id: toastId });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    const toastId = toast.loading('Signing in...');

    try {
      const { user } = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      await loadDesignerState(user);
      toast.success('Welcome back! 🎨', { id: toastId });
    } catch (error) {
      let msg = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found') msg = 'No account found with this email.';
      else if (error.code === 'auth/wrong-password') msg = 'Incorrect password. Try again.';
      else if (error.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
      toast.error(msg, { id: toastId });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsAuthenticating(true);
    const toastId = toast.loading('Connecting to Google...');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await loadDesignerState(result.user);
      toast.success('Signed in successfully', { id: toastId });
    } catch (error) {
      toast.error('Google sign-in failed. Please try again.', { id: toastId });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!loginEmail) return toast.error('Enter your email to reset password.');
    try {
      await sendPasswordResetEmail(auth, loginEmail);
      toast.success('Password reset email sent.');
    } catch (err) {
      toast.error('Unable to send reset email.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
    toast('Logged out', { icon: '👋' });
  };

  // ==========================================
  // TEMPLATE UPLOAD
  // ==========================================
  const uploadImageToImgbb = async (file) => {
    const formData = new FormData();
    formData.append('image', file, file.name || 'image.png');
    formData.append('key', IMGBB_API_KEY);

    try {
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!data.success) throw new Error('Upload failed');
      return data.data.url;
    } catch (error) {
      throw new Error('Failed to upload image');
    }
  };

  const handleTemplateImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('Compressing image...');
    try {
      const options = { maxSizeMB: 2, maxWidthOrHeight: 2500, useWebWorker: true };
      const compressed = await imageCompression(file, options);

      const imageUrl = await uploadImageToImgbb(compressed);
      setTemplateForm(prev => ({ ...prev, backgroundImage: imageUrl }));
      toast.success('Image uploaded!', { id: toastId });
    } catch (error) {
      toast.error('Failed to upload image', { id: toastId });
    }
  };

  const handlePublishTemplate = async (overrideData = null) => {
    const dataToPublish = overrideData || templateForm;
    if (!dataToPublish.title || !dataToPublish.backgroundImage) {
      return toast.error('Please fill in title and upload background image');
    }

    setUploading(true);
    const toastId = toast.loading('Publishing template...');

    try {
      const templateDoc = {
        title: dataToPublish.title,
        description: dataToPublish.description,
        category: dataToPublish.category,
        price: parseFloat(dataToPublish.price),
        commissionPercent: parseInt(dataToPublish.commissionPercent),
        backgroundImage: dataToPublish.backgroundImage,
        elements: dataToPublish.elements || [],
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        tags: dataToPublish.tags.split(',').map(t => t.trim()),
        designerId: designer.uid,
        designerName: designer.name,
        designerRating: designer.rating || 5,
        timesPurchased: 0,
        revenue: 0,
        status: 'active',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'templates'), templateDoc);

      setTemplateForm({
        title: '',
        description: '',
        category: 'General',
        price: 299,
        commissionPercent: 30,
        backgroundImage: null,
        elements: [],
        tags: ''
      });

      toast.success(`Template published! ID: ${docRef.id}`, { id: toastId });
      fetchDesignerTemplates(designer.uid);
      setActiveTab('templates');
    } catch (error) {
      toast.error('Failed to publish template', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;

    try {
      await deleteDoc(doc(db, 'templates', id));
      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  // ==========================================
  // LOCK SCREEN - NOT DESIGNER
  // ==========================================
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white font-bold">Loading Designer Portal...</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'apply') {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🎨</span>
              <h1 className="text-2xl font-black text-white">Apply to Become a Designer</h1>
              <p className="text-slate-400 text-sm mt-2">You are signed in with your existing CampSend account.</p>
            </div>
            <form onSubmit={handleSignup} className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Your Full Name"
                value={signupData.name}
                onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                disabled={isAuthenticating}
              />
              <input
                type="email"
                placeholder="your@email.com"
                value={signupData.email}
                disabled
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <select
                value={signupData.specialty}
                onChange={(e) => setSignupData({ ...signupData, specialty: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option>General Graphics</option>
                <option>Political Campaigns</option>
                <option>Events & Celebrations</option>
                <option>Business Branding</option>
                <option>Social Media Content</option>
              </select>
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isAuthenticating ? 'Processing...' : 'Submit Designer Application'}
              </button>
            </form>
            <div className="text-center">
              <p className="text-slate-400 text-sm">Need a different account? Sign out and use another email.</p>
              <button
                onClick={handleLogout}
                className="mt-3 text-indigo-400 hover:text-indigo-300 font-bold text-sm"
              >
                Sign out and switch account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === 'locked') {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🎨</span>
              <h1 className="text-2xl font-black text-white">Designer Portal</h1>
              <p className="text-slate-400 text-sm mt-2">Upload & monetize your templates</p>
            </div>

            {!signupMode ? (
              <>
                <form onSubmit={handleLogin} className="space-y-4 mb-6">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isAuthenticating}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isAuthenticating}
                  />
                  <div className="flex justify-between items-center">
                    <button type="button" onClick={handlePasswordReset} className="text-sm text-indigo-300 hover:underline">Forgot password?</button>
                    <div />
                  </div>
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {isAuthenticating ? 'Signing In...' : 'Sign In'}
                  </button>
                  <div className="flex items-center gap-4 my-4">
                    <div className="h-px bg-slate-600 flex-1"></div>
                    <span className="text-slate-400 text-xs font-black uppercase tracking-widest">OR</span>
                    <div className="h-px bg-slate-600 flex-1"></div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isAuthenticating}
                    className="w-full bg-white text-slate-800 font-bold py-3 px-4 rounded-xl hover:bg-slate-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Continue with Google
                  </button>
                </form>

                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-4">New designer?</p>
                  <button
                    onClick={() => setSignupMode(true)}
                    className="text-indigo-400 hover:text-indigo-300 font-bold text-sm"
                  >
                    Create Account →
                  </button>
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handleSignup} className="space-y-3 mb-6">
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    disabled={isAuthenticating}
                  />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    disabled={isAuthenticating}
                  />
                  <input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    disabled={isAuthenticating}
                  />
                  <select
                    value={signupData.specialty}
                    onChange={(e) => setSignupData({ ...signupData, specialty: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option>General Graphics</option>
                    <option>Political Campaigns</option>
                    <option>Events & Celebrations</option>
                    <option>Business Branding</option>
                    <option>Social Media Content</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {isAuthenticating ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>

                <button
                  onClick={() => setSignupMode(false)}
                  className="w-full text-slate-400 hover:text-slate-300 font-bold text-sm"
                >
                  Already have account? Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // DESIGNER DASHBOARD
  // ==========================================
  if (isEditingTemplate) {
    return (
      <div className="h-screen flex flex-col bg-slate-900">
        <ProEditor
          campaignTitle={templateForm.title || 'Untitled Template'}
          setCampaignTitle={(t) => setTemplateForm({ ...templateForm, title: t })}
          bgImage={templateForm.backgroundImage}
          setBgImage={(url) => setTemplateForm({ ...templateForm, backgroundImage: url })}
          bgImageFile={bgImageFile}
          setBgImageFile={setBgImageFile}
          isPublic={true}
          setIsPublic={() => { }}
          history={history}
          setHistory={setHistory}
          historyIndex={historyIndex}
          setHistoryIndex={setHistoryIndex}
          canvasWidth={canvasWidth}
          setCanvasWidth={setCanvasWidth}
          canvasHeight={canvasHeight}
          setCanvasHeight={setCanvasHeight}
          onBack={() => setIsEditingTemplate(false)}
          onPublish={async () => {
            const updatedElements = history[historyIndex] || [];
            setTemplateForm(prev => {
              const next = { ...prev, elements: updatedElements };
              handlePublishTemplate(next);
              return next;
            });
            setIsEditingTemplate(false);
          }}
          isSaving={uploading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎨</span>
            <div>
              <h1 className="font-black text-white">Designer Portal</h1>
              <p className="text-xs text-slate-400">{designer?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={currentUser?.uid} />
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 font-bold px-4 py-2 rounded-lg transition mr-2"
            >
              ← Client Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-linear-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
            <p className="text-sm font-bold opacity-80 mb-2">Total Earnings</p>
            <p className="text-4xl font-black">₹{earnings.totalEarnings.toLocaleString()}</p>
            {earnings.availablePayout > 0 && (
              <button onClick={handleRequestPayout} className="mt-4 bg-white text-indigo-700 font-bold px-4 py-2 rounded-lg text-sm hover:bg-indigo-50 transition w-full shadow-sm">
                Withdraw ₹{earnings.availablePayout.toLocaleString()}
              </button>
            )}
            {earnings.availablePayout <= 0 && earnings.totalEarnings > 0 && (
              <p className="mt-4 text-xs font-bold bg-indigo-800/50 py-2 rounded-lg text-center">Fully Paid Out (₹{earnings.paidOut.toLocaleString()})</p>
            )}
          </div>
          <div className="bg-linear-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-bold opacity-80 mb-2">This Month</p>
            <p className="text-4xl font-black">₹{earnings.monthlyEarnings.toLocaleString()}</p>
          </div>
          <div className="bg-linear-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-bold opacity-80 mb-2">Templates Created</p>
            <p className="text-4xl font-black">{earnings.templatesCreated || templates.length}</p>
          </div>
          <div className="bg-linear-to-br from-pink-600 to-pink-700 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm font-bold opacity-80 mb-2">Total Sales</p>
            <p className="text-4xl font-black">{earnings.templatesSold}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          {[
            { id: 'templates', label: '📋 My Templates', icon: '📋' },
            { id: 'inbox', label: `📥 Work Inbox ${workRequests.filter(r => r.status === 'pending').length > 0 ? `(${workRequests.filter(r => r.status === 'pending').length})` : ''}`, icon: '📥' },
            { id: 'upload', label: '⬆️ Upload New', icon: '⬆️' },
            { id: 'profile', label: '👤 Profile', icon: '👤' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-bold transition ${activeTab === tab.id
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-slate-400 hover:text-slate-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Work Inbox Tab */}
        {activeTab === 'inbox' && (
          <div>
            <h2 className="text-2xl font-black text-white mb-6">Client Design Requests</h2>
            {workRequests.length === 0 ? (
              <div className="bg-slate-800 rounded-2xl p-12 text-center border border-slate-700">
                <span className="text-5xl mb-4 block">📭</span>
                <p className="text-slate-400 font-medium mb-4">Your inbox is empty. No work requests yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workRequests.map(req => (
                  <div key={req.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col hover:border-indigo-500 transition shadow-lg relative overflow-hidden">
                    {req.status === 'pending' && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500 rounded-bl-full opacity-20 pointer-events-none"></div>}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-lg text-white">{req.subject}</h3>
                        <p className="text-sm font-bold text-indigo-400 mt-1">{req.firmName}</p>
                        <p className="text-xs text-slate-500 font-mono mt-1">{req.clientEmail}</p>
                        {req.clientPhone && req.clientPhone !== 'Not Provided' && <p className="text-xs text-slate-500 font-mono mt-0.5">{req.clientPhone}</p>}
                      </div>
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded border ${req.status === 'completed' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-700/50' : req.status === 'accepted' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50' : 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50'}`}>{req.status}</span>
                    </div>
                    <div className="bg-slate-900 rounded-xl p-4 mb-6 border border-slate-700 flex-1">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{req.details}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => updateDoc(doc(db, 'designRequests', req.id), { status: 'accepted' })} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition text-sm">Accept Job</button>
                        </>
                      )}
                      {req.status === 'accepted' && (
                        <>
                          <button onClick={() => window.open(`mailto:${req.clientEmail}?subject=RE: ${req.subject}`)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition text-sm">Email Client</button>
                          <button onClick={() => updateDoc(doc(db, 'designRequests', req.id), { status: 'completed' })} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition text-sm">Mark Completed</button>
                        </>
                      )}
                      {req.status === 'completed' && (
                        <p className="text-xs font-bold text-emerald-500 text-center w-full bg-emerald-900/20 py-2 rounded-lg">Job Completed successfully.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div>
            <h2 className="text-2xl font-black text-white mb-6">Your Templates</h2>
            {isFetching ? (
              <p className="text-slate-400 text-center py-12">Loading templates...</p>
            ) : templates.length === 0 ? (
              <div className="bg-slate-800 rounded-2xl p-12 text-center border border-slate-700">
                <span className="text-5xl mb-4 block">📦</span>
                <p className="text-slate-400 font-medium mb-4">No templates yet. Start by uploading one!</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition"
                >
                  Upload Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                  <div key={template.id} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition shadow-lg">
                    <div className="h-48 bg-slate-700 relative overflow-hidden">
                      <img src={template.backgroundImage} alt={template.title} className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 bg-slate-900/80 text-white px-3 py-1 rounded-full text-xs font-black">
                        ₹{template.price}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white mb-2 truncate">{template.title}</h3>
                      <p className="text-xs text-slate-400 mb-4 line-clamp-2">{template.description}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                        <span>📊 {template.timesPurchased || 0} Sales</span>
                        <span className="text-emerald-400 font-bold">₹{((template.price * (template.commissionPercent || 30)) / 100 * (template.timesPurchased || 0)).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold text-sm py-2 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div>
            <h2 className="text-2xl font-black text-white mb-6">Upload New Template</h2>
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Image Upload */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">Background Image</label>
                  <div
                    onClick={() => templateImageRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 transition"
                  >
                    {templateForm.backgroundImage ? (
                      <div>
                        <img src={templateForm.backgroundImage} alt="preview" className="w-full h-40 object-cover rounded-xl mb-3" />
                        <p className="text-xs text-slate-400">Click to change image</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-4xl block mb-3">📸</span>
                        <p className="text-slate-400 font-medium">Click to upload image</p>
                        <p className="text-xs text-slate-500 mt-2">Max 2MB, PNG/JPG</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={templateImageRef}
                    type="file"
                    accept="image/*"
                    onChange={handleTemplateImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Right: Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Template Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Political Rally Poster"
                      value={templateForm.title}
                      onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Description</label>
                    <textarea
                      placeholder="Describe your template..."
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm h-20 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Category</label>
                      <select
                        value={templateForm.category}
                        onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option>General</option>
                        <option>Political</option>
                        <option>Events</option>
                        <option>Business</option>
                        <option>Social Media</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Price (₹)</label>
                      <input
                        type="number"
                        value={templateForm.price}
                        onChange={(e) => setTemplateForm({ ...templateForm, price: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Commission % (Your Cut)</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={templateForm.commissionPercent}
                      onChange={(e) => setTemplateForm({ ...templateForm, commissionPercent: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <p className="text-xs text-slate-400 mt-1">You'll earn ₹{(templateForm.price * templateForm.commissionPercent / 100).toFixed(0)} per sale</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Tags (comma separated)</label>
                    <input
                      type="text"
                      placeholder="poster, campaign, modern"
                      value={templateForm.tags}
                      onChange={(e) => setTemplateForm({ ...templateForm, tags: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsEditingTemplate(true)}
                disabled={uploading || !templateForm.title || !templateForm.backgroundImage}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition disabled:opacity-50"
              >
                {uploading ? '⬆️ Processing...' : '✏️ Configure Elements (Pro Studio)'}
              </button>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-2xl font-black text-white mb-6">Designer Profile</h2>
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 max-w-2xl">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Name</label>
                  <p className="text-white font-bold text-lg flex items-center gap-2">
                    {designer?.name}
                    <span className="text-xs bg-yellow-900/30 text-yellow-500 px-2 py-0.5 rounded font-bold border border-yellow-700/50">⭐ {designer?.rating ? designer.rating.toFixed(1) : "5.0"}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Email</label>
                  <p className="text-slate-400 font-medium">{designer?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Specialty</label>
                  <p className="text-slate-400 font-medium">{designer?.specialty}</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Rating</label>
                  <p className="text-yellow-400 font-bold text-lg">⭐ {(designer?.rating || 5).toFixed(1)}</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Account Status</label>
                  <div className="inline-block bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg font-bold text-sm">
                    ✅ Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DesignerPortal;
