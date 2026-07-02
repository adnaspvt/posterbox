import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, IMGBB_API_KEY, googleProvider } from '../config/firebase';
import toast from 'react-hot-toast';
import { Rnd } from 'react-rnd';
import imageCompression from 'browser-image-compression';


// --- PREMIUM FONTS ---
const FONT_FAMILIES = [
  'Arial, sans-serif', 'Impact, sans-serif', '"Montserrat", sans-serif', '"Poppins", sans-serif',
  '"Inter", sans-serif', '"Roboto", sans-serif', '"Oswald", sans-serif', '"Playfair Display", serif',
  '"Lora", serif', '"Noto Sans", sans-serif', '"Cairo", sans-serif'
];

function Admin() {
  const navigate = useNavigate();
  const MASTER_EMAIL = "adnaspvtltd@gmail.com";

  // --- STATE ---
  const [authStatus, setAuthStatus] = useState('loading');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allTemplates, setAllTemplates] = useState([]);
  const [designRequests, setDesignRequests] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [isFetchingData, setIsFetchingData] = useState(false);

  // --- PLATFORM SETTINGS STATE ---
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // --- TEMPLATE STUDIO STATE ---
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBg, setTemplateBg] = useState(null);
  const [templateBgFile, setTemplateBgFile] = useState(null);
  const [templateElements, setTemplateElements] = useState([]);
  const [templateSelectedId, setTemplateSelectedId] = useState(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const [templateCanvasWidth, setTemplateCanvasWidth] = useState(800);
  const [templateCanvasHeight, setTemplateCanvasHeight] = useState(1066);

  const templateFileInputRef = useRef(null);

  // --- DESIGNER FORM STATE ---
  // (Manual add removed, designers sign up via DesignerPortal)

  // ==========================================
  // AUTHENTICATION & DATA FETCHING
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === MASTER_EMAIL) {
        setAuthStatus('unlocked'); fetchAllData();
      } else { setAuthStatus('locked'); }
    });
    return () => unsubscribe();
  }, []);

  const handleMasterLogin = async (e) => {
    e.preventDefault();
    if (loginEmail !== MASTER_EMAIL) return toast.error("ACCESS DENIED.", { style: { background: '#7f1d1d', color: '#fff' } });
    setIsAuthenticating(true);
    const toastId = toast.loading('Verifying...', { style: { background: '#020617', color: '#10b981' } });
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast.success('System Unlocked.', { id: toastId, style: { background: '#020617', color: '#10b981' } });
    } catch (error) {
      const msg = error.code === 'auth/wrong-password' ? 'Invalid Password.' : (error.message || 'Authentication failed.');
      toast.error(msg, { id: toastId, style: { background: '#7f1d1d', color: '#fff' } });
    }
    finally { setIsAuthenticating(false); }
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    const toastId = toast.loading('Verifying Google Account...', { style: { background: '#020617', color: '#10b981' } });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email !== MASTER_EMAIL) {
        await signOut(auth);
        toast.error("ACCESS DENIED. Unauthorized Google Account.", { id: toastId, style: { background: '#7f1d1d', color: '#fff' } });
      } else {
        toast.success('System Unlocked via Google.', { id: toastId, style: { background: '#020617', color: '#10b981' } });
      }
    } catch (error) {
      toast.error(error.message || 'Google Sign In failed.', { id: toastId, style: { background: '#7f1d1d', color: '#fff' } });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleMasterLogout = async () => {
    await signOut(auth); navigate('/');
    toast('System Locked.', { icon: '🔒', style: { background: '#020617', color: '#fff' } });
  };

  const fetchAllData = async () => {
    setIsFetchingData(true);
    try {
      const campSnap = await getDocs(collection(db, "campaigns"));
      setAllCampaigns(campSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      const userSnap = await getDocs(collection(db, "users"));
      setAllUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      const templateSnap = await getDocs(collection(db, "templates"));
      setAllTemplates(templateSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      const reqSnap = await getDocs(collection(db, "designRequests"));
      setDesignRequests(reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      const payoutSnap = await getDocs(collection(db, "payoutRequests"));
      setPayoutRequests(payoutSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      const configDoc = await getDoc(doc(db, "settings", "platform"));
      if (configDoc.exists()) setWhatsappNumber(configDoc.data().whatsappNumber || '');

    } catch (error) { toast.error("Database sync failed."); }
    finally { setIsFetchingData(false); }
  };

  // ==========================================
  // PLATFORM SETTINGS LOGIC
  // ==========================================
  const handleSaveSettings = async () => {
    const toastId = toast.loading('Saving platform settings...');
    try {
      await setDoc(doc(db, "settings", "platform"), { whatsappNumber: whatsappNumber }, { merge: true });
      toast.success('Settings updated successfully!', { id: toastId });
    } catch (error) { toast.error('Failed to update settings.', { id: toastId }); }
  };

  // ==========================================
  // AGENCY DESIGNER LOGIC & PAYOUTS
  // ==========================================
  const handleToggleDesignerStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    try {
      await updateDoc(doc(db, "users", id), { designerStatus: newStatus });
      toast.success(`Designer status updated to ${newStatus}.`);
      fetchAllData();
    } catch (error) { toast.error("Failed to update status."); }
  };

  const handleApprovePayout = async (request) => {
    if (!window.confirm(`Mark ₹${request.amount} as PAID to ${request.designerName}?`)) return;
    try {
      // 1. Update the payout request status
      await updateDoc(doc(db, "payoutRequests", request.id), { status: 'paid', paidAt: serverTimestamp() });

      // 2. Increment the designer's paidOut field
      const userDoc = await getDoc(doc(db, "users", request.designerId));
      if (userDoc.exists()) {
        const currentPaidOut = userDoc.data().paidOut || 0;
        await updateDoc(doc(db, "users", request.designerId), { paidOut: currentPaidOut + request.amount });
      }

      // 3. Notify Designer
      await addDoc(collection(db, "notifications"), {
        userId: request.designerId,
        title: "Payout Approved!",
        message: `Your payout request for ₹${request.amount} has been approved and processed.`,
        type: "payment",
        isRead: false,
        createdAt: serverTimestamp()
      });

      toast.success("Payout marked as paid.");
      fetchAllData();
    } catch (error) {
      toast.error("Error processing payout.");
    }
  };

  // ==========================================
  // CRM TOOLS: DESIGN REQUESTS & WHATSAPP
  // ==========================================
  const handleWhatsAppContact = (request) => {
    const phone = window.prompt(`Enter WhatsApp number for ${request.firmName} (Include country code, e.g. 919876543210):`, request.clientPhone && request.clientPhone !== 'Not Provided' ? request.clientPhone : "+91");
    if (!phone) return;
    const message = encodeURIComponent(`Hi ${request.firmName}, this is the CampSend Design Team! We received your request regarding: "${request.subject}". How can we assist you with this design today?`);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const toggleRequestStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
    const toastId = toast.loading('Updating status...');
    try {
      await updateDoc(doc(db, "designRequests", id), { status: newStatus });
      setDesignRequests(designRequests.map(r => r.id === id ? { ...r, status: newStatus } : r));
      toast.success(`Marked as ${newStatus}`, { id: toastId });
    } catch (error) { toast.error("Failed to update status", { id: toastId }); }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm("Permanently delete this design request?")) return;
    try {
      await deleteDoc(doc(db, "designRequests", id));
      setDesignRequests(designRequests.filter(r => r.id !== id));
      toast.success("Request deleted.");
    } catch (error) { toast.error("Failed to delete."); }
  };

  // ==========================================
  // MASTER CONTROLS
  // ==========================================
  const toggleBanUser = async (userId, currentStatus, userName) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    if (!window.confirm(`Change ${userName}'s status to ${newStatus.toUpperCase()}?`)) return;
    const toastId = toast.loading('Updating firm status...');
    try {
      await updateDoc(doc(db, "users", userId), { status: newStatus });
      setAllUsers(allUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success(`Firm is now ${newStatus}.`, { id: toastId });
    } catch (error) { toast.error("Failed to update status.", { id: toastId }); }
  };

  const sendPasswordReset = async (email) => {
    if (!window.confirm(`Send a password reset link to ${email}?`)) return;
    try { await sendPasswordResetEmail(auth, email); toast.success(`Reset link sent to ${email}`); } catch (e) { toast.error("Failed to send reset link."); }
  };

  const forceDeleteUser = async (id, name) => {
    if (!window.confirm(`WARNING: Permanently delete Firm: "${name}"?`)) return;
    try { await deleteDoc(doc(db, "users", id)); setAllUsers(allUsers.filter(u => u.id !== id)); toast.success(`Firm profile deleted.`); } catch (e) { toast.error("Deletion failed."); }
  };

  const forceDeleteCampaign = async (id, title) => {
    if (!window.confirm(`WARNING: Permanently delete campaign: "${title}"?`)) return;
    try { await deleteDoc(doc(db, "campaigns", id)); setAllCampaigns(allCampaigns.filter(c => c.id !== id)); toast.success(`Campaign deleted.`); } catch (e) { toast.error("Deletion failed."); }
  };

  // ==========================================
  // PRO STUDIO TOOLS (Admin Template Creation)
  // ==========================================
  const getNextZIndex = () => templateElements.length > 0 ? Math.max(...templateElements.map(el => el.zIndex || 1)) + 1 : 10;

  const addTemplateText = () => setTemplateElements([...templateElements, { id: Date.now().toString(), type: 'text', x: 50, y: 50, width: 250, height: 80, text: 'Editable Text', color: '#ffffff', fontSize: 36, fontFamily: '"Montserrat", sans-serif', textAlign: 'center', opacity: 1, zIndex: getNextZIndex(), rotation: 0, isLocked: false, fontWeight: 'bold', fontStyle: 'normal', textTransform: 'none', letterSpacing: 0, lineHeight: 1.2, textStrokeWidth: 0, textStrokeColor: '#000000', shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 2 }]);
  const addTemplateShape = () => setTemplateElements([...templateElements, { id: Date.now().toString(), type: 'shape', x: 50, y: 200, width: 200, height: 100, backgroundColor: '#000000', opacity: 0.5, borderRadius: 0, zIndex: getNextZIndex(), rotation: 0, isLocked: false, borderWidth: 0, borderColor: '#ffffff', shadowColor: 'transparent', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 }]);
  const addTemplatePhoto = () => setTemplateElements([...templateElements, { id: Date.now().toString(), type: 'photo', x: 100, y: 100, width: 160, height: 160, borderRadius: 10, borderColor: '#ffffff', borderWidth: 0, opacity: 1, zIndex: getNextZIndex(), rotation: 0, isLocked: false, filterBrightness: 100, filterContrast: 100, filterSaturation: 100, filterBlur: 0 }]);

  const updateTemplateElement = (id, newProps) => setTemplateElements(templateElements.map(el => (el.id === id ? { ...el, ...newProps } : el)));
  const deleteElement = (id) => { setTemplateElements(templateElements.filter(el => el.id !== id)); if (templateSelectedId === id) setTemplateSelectedId(null); };
  const duplicateElement = () => { if (!templateSelectedId) return; const el = templateElements.find(e => e.id === templateSelectedId); if (!el) return; const newId = Date.now().toString(); setTemplateElements([...templateElements, { ...el, id: newId, x: el.x + 20, y: el.y + 20, zIndex: getNextZIndex() }]); setTemplateSelectedId(newId); toast.success("Layer duplicated."); };

  const moveLayerUp = (id) => { const el = templateElements.find(e => e.id === id); if (el) updateTemplateElement(id, { zIndex: (el.zIndex || 1) + 1 }); };
  const moveLayerDown = (id) => { const el = templateElements.find(e => e.id === id); if (el) updateTemplateElement(id, { zIndex: Math.max(1, (el.zIndex || 1) - 1) }); };

  // 🚀 DYNAMIC IMAGE RESIZER + PRE-IMGBB COMPRESSION
  const handleTemplateBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('Optimizing image...');
    try {
      const options = { maxSizeMB: 1.5, maxWidthOrHeight: 2500, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);

      setTemplateBgFile(compressedFile);
      const url = URL.createObjectURL(compressedFile);
      setTemplateBg(url);

      const img = new Image();
      img.onload = () => { setTemplateCanvasWidth(img.naturalWidth); setTemplateCanvasHeight(img.naturalHeight); };
      img.src = url;
      toast.success('Image ready!', { id: toastId });
    } catch (err) {
      toast.error('Failed to optimize image.', { id: toastId });
    }
  };

  // 🚀 SECURE IMGBB UPLOAD LOGIC (NO FIREBASE STORAGE)
  // 🚀 CORRECTED: IMGBB MASTER TEMPLATE UPLOAD
  const saveMasterTemplate = async () => {
    if (!templateTitle) return toast.error("Template needs a title.");
    if (!templateBg && !templateBgFile) return toast.error("Template needs a background image.");

    setIsSavingTemplate(true);
    const toastId = toast.loading('Deploying Master Template...');

    try {
      let publicImageUrl = templateBg;

      if (templateBgFile) {
        const formData = new FormData();
        formData.append('image', templateBgFile, 'image.jpg');

        // ⚠️ NOTICE THE BACKTICKS HERE: ` `
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData
        });

        const data = await res.json();

        if (!data.success) {
          console.error("ImgBB Upload Failed:", data);
          throw new Error("Image hosting rejected the file.");
        }

        publicImageUrl = data.data.url;
      }

      const payload = {
        title: templateTitle,
        backgroundImage: publicImageUrl,
        elements: templateElements,
        canvasWidth: templateCanvasWidth,
        canvasHeight: templateCanvasHeight,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "templates"), payload);
      toast.success('Template deployed to client portal!', { id: toastId });

      setTemplateTitle('');
      setTemplateBg(null);
      setTemplateBgFile(null);
      setTemplateElements([]);
      setTemplateCanvasWidth(800);
      setTemplateCanvasHeight(1066);
      fetchAllData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to deploy to ImgBB.", { id: toastId });
    } finally {
      setIsSavingTemplate(false);
    }
  };


  const forceDeleteTemplate = async (id) => { if (!window.confirm(`Delete this master template?`)) return; try { await deleteDoc(doc(db, "templates", id)); setAllTemplates(allTemplates.filter(t => t.id !== id)); toast.success(`Template deleted.`); } catch (e) { } };

  // ==========================================
  // RENDER UI: SECURE LOCK SCREEN
  // ==========================================
  if (authStatus === 'loading') return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500 font-mono tracking-widest animate-pulse">ESTABLISHING SECURE CONNECTION...</div>;

  if (authStatus === 'locked') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-size-[30px_30px] opacity-20"></div>
        <div className="z-10 w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)]">
          <div className="flex justify-center mb-6"><div className="w-16 h-16 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-500 text-3xl">🔒</div></div>
          <h2 className="text-center text-xl font-bold text-white mb-2 uppercase tracking-widest">Restricted Area</h2>
          <form onSubmit={handleMasterLogin} className="flex flex-col gap-4 mt-8">
            <input type="email" placeholder="Master Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-emerald-400 p-4 rounded-lg outline-none focus:border-emerald-500 transition-colors" />
            <input type="password" placeholder="Master Passcode" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-emerald-400 p-4 rounded-lg outline-none focus:border-emerald-500 transition-colors" />
            <button type="submit" disabled={isAuthenticating} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black uppercase tracking-widest py-4 rounded-lg transition-colors">{isAuthenticating ? "Decrypting..." : "Authorize"}</button>
          </form>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink-0 mx-4 text-slate-600 text-xs uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button onClick={handleGoogleLogin} disabled={isAuthenticating} className="w-full bg-white hover:bg-gray-100 text-slate-900 font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-3">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            Sign in with Google
          </button>

          <button onClick={() => navigate('/')} className="w-full text-center mt-6 text-slate-600 hover:text-slate-400 text-sm hover:underline">Abort</button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER UI: UNLOCKED GOD MODE DASHBOARD
  // ==========================================
  const platformViews = allCampaigns.reduce((sum, camp) => sum + (camp.views || 0), 0);
  const platformPosters = allCampaigns.reduce((sum, camp) => sum + (camp.postersGenerated || 0), 0);
  const selectedTemplateElement = templateElements.find(el => el.id === templateSelectedId);
  const pendingRequests = designRequests.filter(req => req.status === 'pending').length;
  const designers = allUsers.filter(u => u.isDesigner === true);
  const pendingPayouts = payoutRequests.filter(req => req.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-300">

      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-50">
        <div className="p-6 border-b border-slate-800"><div className="text-2xl font-black text-white tracking-tighter uppercase"><span className="text-emerald-500">C-Send</span> // Admin</div></div>
        <nav className="flex-1 p-4 flex flex-col gap-2 font-mono text-sm overflow-y-auto">
          <button onClick={() => setActiveTab('overview')} className={`text-left px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'overview' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' : 'text-slate-500 hover:bg-slate-800'}`}>[1] Overview</button>
          <button onClick={() => setActiveTab('templates')} className={`text-left px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'templates' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' : 'text-slate-500 hover:bg-slate-800'}`}>[2] Template Studio ✦</button>
          <button onClick={() => setActiveTab('firms')} className={`text-left px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'firms' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' : 'text-slate-500 hover:bg-slate-800'}`}>[3] Firms & Users</button>
          <button onClick={() => setActiveTab('campaigns')} className={`text-left px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'campaigns' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' : 'text-slate-500 hover:bg-slate-800'}`}>[4] All Campaigns</button>
          <div className="h-px bg-slate-800 my-2"></div>
          <button onClick={() => setActiveTab('payouts')} className={`text-left px-4 py-3 rounded-lg font-bold transition-colors flex justify-between items-center ${activeTab === 'payouts' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' : 'text-slate-500 hover:bg-slate-800'}`}>
            <span>[5] Payouts</span>
            {pendingPayouts > 0 && <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingPayouts}</span>}
          </button>
          <button onClick={() => setActiveTab('content')} className={`text-left px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'content' ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/50' : 'text-slate-500 hover:bg-slate-800'}`}>[6] Settings</button>
          <button onClick={() => setActiveTab('contact')} className={`text-left px-4 py-3 rounded-lg font-bold transition-colors flex justify-between items-center ${activeTab === 'contact' ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/50' : 'text-slate-500 hover:bg-slate-800'}`}>
            <span>[7] Design Inbox</span>
            {pendingRequests > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingRequests}</span>}
          </button>
          <button onClick={() => setActiveTab('designers')} className={`text-left px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'designers' ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/50' : 'text-slate-500 hover:bg-slate-800'}`}>[8] Designers Roster</button>
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={handleMasterLogout} className="w-full text-center px-4 py-3 text-red-500 hover:bg-red-950/30 rounded-lg font-bold transition-colors font-mono text-sm uppercase">Terminate Session</button></div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-10">

          <div className="flex justify-between items-end mb-10 border-b border-slate-800 pb-6">
            <div><h1 className="text-4xl font-black text-white tracking-tight">Command Center</h1></div>
            <button onClick={fetchAllData} disabled={isFetchingData} className="text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 px-4 py-2 rounded-lg font-mono text-sm transition-colors hover:bg-emerald-900/50">↻ Refresh Data</button>
          </div>

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-in fade-in duration-300">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><p className="text-xs font-mono text-slate-500 uppercase">Total Firms</p><p className="text-5xl font-black text-white mt-2">{allUsers.length}</p></div>
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><p className="text-xs font-mono text-slate-500 uppercase">Total Campaigns</p><p className="text-5xl font-black text-white mt-2">{allCampaigns.length}</p></div>
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><p className="text-xs font-mono text-slate-500 uppercase">Platform Views</p><p className="text-5xl font-black text-indigo-400 mt-2">{platformViews}</p></div>
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><p className="text-xs font-mono text-slate-500 uppercase">Total Downloads</p><p className="text-5xl font-black text-emerald-400 mt-2">{platformPosters}</p></div>
            </div>
          )}

          {/* TAB: FIRMS */}
          {activeTab === 'firms' && (
            <div className="animate-in fade-in duration-300"><h2 className="text-2xl font-bold text-white mb-6">Registered Firms</h2><div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-950/50 text-slate-500 font-mono text-xs uppercase border-b border-slate-800"><th className="p-4">Firm Name</th><th className="p-4">Email</th><th className="p-4">Phone</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{allUsers.map(user => (<tr key={user.id} className="hover:bg-slate-800/50 transition-colors"><td className="p-4 font-bold text-white">{user.firmName}</td><td className="p-4 font-mono text-sm text-slate-400">{user.email}</td><td className="p-4 font-mono text-sm text-slate-400">{user.phone || 'N/A'}</td><td className="p-4"><span className={`text-xs font-bold px-2 py-1 rounded border ${user.status === 'banned' ? 'bg-red-950/30 text-red-500 border-red-900/50' : 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50'}`}>{user.status === 'banned' ? 'BANNED' : 'ACTIVE'}</span></td><td className="p-4 text-right space-x-2"><button onClick={() => sendPasswordReset(user.email)} className="text-xs font-bold bg-indigo-950/30 text-indigo-400 px-3 py-1.5 rounded hover:bg-indigo-900/50 transition-colors">Reset Pass</button><button onClick={() => toggleBanUser(user.id, user.status || 'active', user.firmName)} className="text-xs font-bold bg-orange-950/30 text-orange-400 px-3 py-1.5 rounded hover:bg-orange-900/50 transition-colors">{user.status === 'banned' ? 'Unban' : 'Ban'}</button><button onClick={() => forceDeleteUser(user.id, user.firmName)} className="text-xs font-bold bg-slate-800 text-red-500 px-3 py-1.5 rounded hover:bg-slate-700 transition-colors">Delete</button></td></tr>))}</tbody></table></div></div>
          )}

          {/* TAB: CAMPAIGNS */}
          {activeTab === 'campaigns' && (
            <div className="animate-in fade-in duration-300"><h2 className="text-2xl font-bold text-white mb-6">All Campaigns</h2><div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-950/50 text-slate-500 font-mono text-xs uppercase border-b border-slate-800"><th className="p-4">Campaign Title</th><th className="p-4">Owner Email</th><th className="p-4 text-right">Views</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{allCampaigns.map(camp => (<tr key={camp.id} className="hover:bg-slate-800/50 transition-colors"><td className="p-4 font-bold text-white">{camp.title}</td><td className="p-4 font-mono text-sm text-slate-400">{camp.ownerEmail}</td><td className="p-4 text-right font-mono text-indigo-400 font-bold">{camp.views || 0}</td><td className="p-4 text-right space-x-2"><button onClick={() => window.open(`/generator?id=${camp.id}`, '_blank')} className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:bg-slate-700 transition-colors">View Live</button><button onClick={() => forceDeleteCampaign(camp.id, camp.title)} className="text-xs font-bold bg-red-950/30 text-red-500 px-3 py-1.5 rounded hover:bg-red-900/50 transition-colors">Kill</button></td></tr>))}</tbody></table></div></div>
          )}

          {/* TAB: CONTENT MGT (SETTINGS) */}
          {activeTab === 'content' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Platform Settings</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-2xl">
                <p className="text-slate-400 mb-6 font-mono text-sm">System configuration parameters and public site overrides.</p>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-mono text-slate-500 uppercase tracking-widest block mb-2">Designer WhatsApp Number</label>
                    <input type="text" placeholder="e.g. 919876543210 (Include country code)" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors" />
                    <p className="text-[10px] text-slate-500 mt-2">This number receives direct messages from the Client Dashboard's "Hire a Designer" tab.</p>
                  </div>
                  <button onClick={handleSaveSettings} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg shadow-indigo-900/20">Save Configuration</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PAYOUTS */}
          {activeTab === 'payouts' && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 border-b border-slate-800 pb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Designer Payouts</h2>
                <p className="text-slate-400 font-mono text-sm">Manage withdrawal requests from designers.</p>
              </div>

              {payoutRequests.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center text-slate-500">
                  <div className="text-6xl mb-4">💰</div>
                  <h3 className="text-xl font-bold text-white mb-2">No Payout Requests</h3>
                  <p>Designers have not requested any withdrawals.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-500 font-mono text-xs uppercase border-b border-slate-800">
                        <th className="p-4">Designer</th>
                        <th className="p-4 text-right">Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {payoutRequests.map(req => (
                        <tr key={req.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-white">{req.designerName}</p>
                            <p className="font-mono text-sm text-slate-400">{req.designerEmail}</p>
                          </td>
                          <td className="p-4 text-right font-bold text-emerald-400 text-lg">
                            ₹{req.amount.toLocaleString()}
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded border ${req.status === 'paid' ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50' : 'bg-yellow-950/30 text-yellow-500 border-yellow-900/50'}`}>
                              {req.status === 'paid' ? 'PAID' : 'PENDING'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {req.status === 'pending' ? (
                              <button onClick={() => handleApprovePayout(req)} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500 transition-colors">Mark Paid</button>
                            ) : (
                              <span className="text-xs text-slate-500 font-mono">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: CRM INBOX */}
          {activeTab === 'contact' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white mb-2">Design Requests Inbox</h2>
              <p className="text-slate-400 font-mono text-sm mb-8">Manage incoming custom design requests from your clients.</p>
              {designRequests.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center text-slate-500"><div className="text-6xl mb-4">📭</div><h3 className="text-xl font-bold text-white mb-2">Inbox is empty</h3><p>You have no pending design requests.</p></div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {designRequests.map(req => (
                    <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white">{req.subject}</h3>
                          <p className="text-sm text-indigo-400 font-mono mt-1">{req.firmName} ({req.clientEmail})</p>
                          {req.clientPhone && req.clientPhone !== 'Not Provided' && <p className="text-xs text-slate-500 font-mono mt-1">Phone: {req.clientPhone}</p>}

                          <div className="flex gap-2 items-center mt-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded border ${req.status === 'resolved' ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50' : 'bg-yellow-950/30 text-yellow-500 border-yellow-900/50'}`}>{req.status === 'resolved' ? '✓ Resolved' : '⏳ Pending'}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950/30 text-indigo-400 border border-indigo-900/50 px-3 py-1 rounded">
                              Designer: {req.selectedDesignerName || 'Any Available'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 flex-1"><p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{req.details}</p></div>
                      <div className="flex flex-wrap gap-3 mt-auto">
                        <button onClick={() => handleWhatsAppContact(req)} className="flex-1 py-3 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap">💬 WhatsApp</button>
                        <button onClick={() => window.open(`mailto:${req.clientEmail}?subject=RE: ${req.subject}`)} className="flex-1 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold rounded-xl transition-colors text-sm">✉️ Email</button>
                        <div className="flex gap-2 w-full mt-1">
                          <button onClick={() => toggleRequestStatus(req.id, req.status)} className="flex-1 py-2 bg-emerald-950/30 text-emerald-500 border border-emerald-900/50 hover:bg-emerald-900/50 rounded-lg text-xs font-bold transition-colors">{req.status === 'pending' ? 'Mark Resolved' : 'Mark Pending'}</button>
                          <button onClick={() => deleteRequest(req.id)} className="flex-1 py-2 bg-red-950/30 text-red-500 border border-red-900/50 hover:bg-red-900/50 rounded-lg text-xs font-bold transition-colors">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: DESIGNERS ROSTER */}
          {activeTab === 'designers' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex justify-between items-end mb-6 border-b border-slate-800 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Agency Roster</h2>
                  <p className="text-slate-400 font-mono text-sm">Manage designers who applied via the Designer Portal.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {designers.map(d => (
                  <div key={d.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative group flex flex-col shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-16 h-16 bg-indigo-950/50 text-indigo-400 rounded-full flex items-center justify-center text-2xl font-black border border-indigo-900/50">{d.name.charAt(0)}</div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded border ${d.designerStatus === 'active' ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50' : d.designerStatus === 'pending' ? 'bg-yellow-950/30 text-yellow-500 border-yellow-900/50' : 'bg-red-950/30 text-red-500 border-red-900/50'}`}>{d.designerStatus}</span>
                    </div>
                    <h3 className="font-bold text-xl text-white">{d.name}</h3>
                    <p className="text-xs font-mono text-emerald-500 uppercase tracking-widest mb-4">{d.specialty}</p>
                    <div className="space-y-1 mb-4">
                      <p className="text-sm text-slate-400 font-mono">✉️ {d.email}</p>
                      {d.phone && <p className="text-sm text-slate-400 font-mono">📱 {d.phone}</p>}
                      {d.portfolio && <p className="text-sm text-indigo-400 font-mono hover:underline cursor-pointer" onClick={() => window.open(d.portfolio)}>🔗 Portfolio</p>}
                    </div>

                    <button onClick={() => handleToggleDesignerStatus(d.id, d.designerStatus)} className={`mt-auto w-full py-2 rounded-lg text-xs font-bold transition-colors border ${d.designerStatus === 'active' ? 'bg-red-950/30 text-red-500 border-red-900/50 hover:bg-red-900/50' : 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50 hover:bg-emerald-900/50'}`}>
                      {d.designerStatus === 'active' ? 'Suspend Designer' : 'Approve Designer'}
                    </button>
                  </div>
                ))}
                {designers.length === 0 && (
                  <div className="col-span-full bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                    <span className="text-3xl mb-2 block">👥</span> No designers applied yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PRO TEMPLATE STUDIO */}
          {activeTab === 'templates' && (
            <div className="animate-in fade-in duration-300 flex flex-col h-full">

              <div className="flex justify-between items-end mb-6 pb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Master Template Studio</h2>
                  <p className="text-slate-400 font-mono text-sm">Build complex, layered templates that push directly to your clients.</p>
                </div>
                <button onClick={saveMasterTemplate} disabled={isSavingTemplate} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2">
                  {isSavingTemplate ? "Deploying..." : "🚀 Deploy to Portal"}
                </button>
              </div>

              {/* The Studio Workspace */}
              <div className="flex-1 flex gap-6 min-h-150">

                {/* LEFT: CANVAS */}
                <div className="flex-[1.5] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden relative">
                  <div className="h-14 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between px-6 z-10">
                    <span className="text-sm font-bold text-slate-400">Canvas Preview</span>
                    <input type="file" ref={templateFileInputRef} onChange={handleTemplateBgUpload} accept="image/*" className="hidden" />
                    <button onClick={() => templateFileInputRef.current.click()} className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded transition-colors border border-slate-700">{templateBg ? 'Change Background' : 'Upload Background'}</button>
                  </div>

                  <div className="flex-1 bg-[#0f172a] flex items-center justify-center p-8 overflow-auto" onClick={() => setTemplateSelectedId(null)}>
                    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none"></div>

                    {/* DYNAMIC CANVAS CONTAINER */}
                    <div className="w-full max-w-sm bg-white relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-slate-800 z-10 rounded-lg" style={{ aspectRatio: `${templateCanvasWidth} / ${templateCanvasHeight}`, backgroundImage: templateBg ? `url(${templateBg})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      {!templateBg && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 font-mono text-sm p-6 text-center border-2 border-dashed border-slate-700 m-4 rounded-xl"><span className="text-3xl mb-2">🖼️</span> Upload Background</div>}

                      {templateElements.map((el) => (
                        <Rnd
                          key={el.id} size={{ width: el.width, height: el.height }} position={{ x: el.x, y: el.y }}
                          onDragStop={(e, d) => updateTemplateElement(el.id, { x: d.x, y: d.y })}
                          onResizeStop={(e, direction, ref, delta, position) => updateTemplateElement(el.id, { width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10), ...position })}
                          bounds="parent" disableDragging={el.isLocked} enableResizing={!el.isLocked ? undefined : false}
                          onClick={(e) => { e.stopPropagation(); setTemplateSelectedId(el.id); }}
                          className={`absolute flex items-center cursor-move transition-shadow ${templateSelectedId === el.id ? 'ring-2 ring-indigo-500 shadow-xl' : ''}`}
                          style={{ zIndex: el.zIndex || 1 }}
                        >
                          <div style={{
                            width: '100%', height: '100%', display: 'flex', transform: `rotate(${el.rotation || 0}deg)`, opacity: el.opacity ?? 1,
                            ...(el.type === 'text' && { color: el.color, fontSize: `${el.fontSize}px`, fontFamily: el.fontFamily || '"Montserrat", sans-serif', textAlign: el.textAlign || 'center', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start', fontWeight: el.fontWeight || 'bold', fontStyle: el.fontStyle || 'normal', textTransform: el.textTransform || 'none', letterSpacing: `${el.letterSpacing || 0}px`, lineHeight: el.lineHeight || 1.2, whiteSpace: 'pre-wrap', WebkitTextStroke: `${el.textStrokeWidth || 0}px ${el.textStrokeColor || '#000000'}`, textShadow: `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 2}px ${el.shadowBlur !== undefined ? el.shadowBlur : 4}px ${el.shadowColor || 'rgba(0,0,0,0.5)'}` }),
                            ...(el.type === 'shape' && { backgroundColor: el.backgroundColor, borderRadius: `${el.borderRadius}px`, border: `${el.borderWidth || 0}px solid ${el.borderColor || 'transparent'}`, boxShadow: `${el.shadowOffsetX || 0}px ${el.shadowOffsetY || 0}px ${el.shadowBlur || 0}px ${el.shadowColor || 'transparent'}` }),
                            ...(el.type === 'photo' && { filter: `brightness(${el.filterBrightness ?? 100}%) contrast(${el.filterContrast ?? 100}%) saturate(${el.filterSaturation ?? 100}%) blur(${el.filterBlur || 0}px)`, backgroundColor: 'rgba(255,255,255,0.6)', border: `${el.borderWidth || 0}px solid ${el.borderColor || 'transparent'}`, borderRadius: `${el.borderRadius}%`, backdropFilter: 'blur(4px)', justifyContent: 'center', alignItems: 'center' })
                          }}>
                            {el.type === 'text' ? el.text : el.type === 'photo' ? <span className="text-indigo-900 font-black text-[10px] bg-white/70 px-2 py-1 rounded tracking-widest uppercase">Photo Area</span> : null}
                          </div>
                        </Rnd>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: PROPERTIES PANEL */}
                <div className="w-80 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-lg">
                  <div className="p-3 grid grid-cols-3 gap-2 border-b border-slate-800 bg-slate-950/50">
                    <button onClick={addTemplateText} className="flex flex-col items-center justify-center py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:border-indigo-500 hover:text-indigo-400 transition-colors shadow-sm group"><span className="text-lg mb-0.5 group-hover:scale-110 transition-transform">T</span><span className="text-[9px] font-bold uppercase tracking-wider">Text</span></button>
                    <button onClick={addTemplateShape} className="flex flex-col items-center justify-center py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:border-indigo-500 hover:text-indigo-400 transition-colors shadow-sm group"><span className="text-lg mb-0.5 group-hover:scale-110 transition-transform">⬛</span><span className="text-[9px] font-bold uppercase tracking-wider">Shape</span></button>
                    <button onClick={addTemplatePhoto} className="flex flex-col items-center justify-center py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:border-indigo-500 hover:text-indigo-400 transition-colors shadow-sm group"><span className="text-lg mb-0.5 group-hover:scale-110 transition-transform">🖼️</span><span className="text-[9px] font-bold uppercase tracking-wider">Photo</span></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {!templateSelectedId ? (
                      <div className="space-y-6 animate-in fade-in">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Template Title</label>
                          <input type="text" placeholder="e.g. Political Rally A" value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-sm transition-colors" />
                        </div>
                        <div className="text-center mt-12 border-t border-slate-800 pt-8">
                          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">✨</div>
                          <p className="text-slate-400 font-medium text-sm">Select a layer on the canvas to edit properties.</p>
                        </div>
                      </div>
                    ) : selectedTemplateElement && (
                      <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/30 border border-indigo-900/50 px-2 py-1 rounded">Editing {selectedTemplateElement.type}</span>
                          <div className="flex gap-2">
                            <button onClick={() => updateTemplateElement(selectedTemplateElement.id, { isLocked: !selectedTemplateElement.isLocked })} className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${selectedTemplateElement.isLocked ? 'bg-orange-950/30 border-orange-900/50 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300 shadow-sm'}`}>{selectedTemplateElement.isLocked ? '🔒' : '🔓'}</button>
                            <button onClick={duplicateElement} className="w-7 h-7 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-indigo-400 shadow-sm transition-colors text-sm">⧉</button>
                            <button onClick={() => deleteElement(selectedTemplateElement.id)} className="w-7 h-7 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-red-400 hover:border-red-900/50 shadow-sm transition-colors text-sm">✕</button>
                          </div>
                        </div>

                        {/* LAYOUT */}
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">Position & Opacity</label>
                          <div className="flex gap-2 mb-4">
                            <button onClick={() => moveLayerUp(selectedTemplateElement.id)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-[10px] font-bold uppercase transition-colors">↑ Bring Fwd</button>
                            <button onClick={() => moveLayerDown(selectedTemplateElement.id)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-[10px] font-bold uppercase transition-colors">↓ Send Bck</button>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1"><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Rotate</label><span className="text-[10px] font-bold text-indigo-400">{selectedTemplateElement.rotation || 0}°</span></div><input type="range" min="0" max="360" value={selectedTemplateElement.rotation || 0} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { rotation: Number(e.target.value) })} className="w-full accent-indigo-500" /></div>
                            <div className="flex-1"><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Opacity</label><span className="text-[10px] font-bold text-indigo-400">{Math.round((selectedTemplateElement.opacity ?? 1) * 100)}%</span></div><input type="range" min="0" max="1" step="0.05" value={selectedTemplateElement.opacity ?? 1} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { opacity: parseFloat(e.target.value) })} className="w-full accent-indigo-500" /></div>
                          </div>
                        </div>

                        {/* TEXT PROPS */}
                        {selectedTemplateElement.type === 'text' && (
                          <div className="space-y-4 pt-4 border-t border-slate-800">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block bg-slate-950 p-2 rounded-lg border border-slate-800 text-center mb-2">Typography</label>
                            <textarea rows="3" value={selectedTemplateElement.text} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { text: e.target.value })} className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 transition-colors resize-none" />
                            <select value={selectedTemplateElement.fontFamily} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { fontFamily: e.target.value })} className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-medium">
                              {FONT_FAMILIES.map(font => <option key={font} value={font}>{font.split(',')[0].replace(/"/g, '')}</option>)}
                            </select>
                            <div className="flex gap-2">
                              <button onClick={() => updateTemplateElement(selectedTemplateElement.id, { fontWeight: selectedTemplateElement.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`flex-1 py-2 rounded-lg text-sm font-serif font-bold border transition-colors shadow-sm ${selectedTemplateElement.fontWeight === 'bold' ? 'bg-indigo-950/50 border-indigo-900/50 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'}`}>B</button>
                              <button onClick={() => updateTemplateElement(selectedTemplateElement.id, { fontStyle: selectedTemplateElement.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`flex-1 py-2 rounded-lg text-sm font-serif italic border transition-colors shadow-sm ${selectedTemplateElement.fontStyle === 'italic' ? 'bg-indigo-950/50 border-indigo-900/50 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'}`}>I</button>
                              <button onClick={() => updateTemplateElement(selectedTemplateElement.id, { textTransform: selectedTemplateElement.textTransform === 'uppercase' ? 'none' : 'uppercase' })} className={`flex-1 py-2 rounded-lg text-sm font-sans font-bold border transition-colors shadow-sm ${selectedTemplateElement.textTransform === 'uppercase' ? 'bg-indigo-950/50 border-indigo-900/50 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'}`}>AA</button>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => updateTemplateElement(selectedTemplateElement.id, { textAlign: 'left' })} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors shadow-sm ${selectedTemplateElement.textAlign === 'left' ? 'bg-indigo-950/50 border-indigo-900/50 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'}`}>⭰</button>
                              <button onClick={() => updateTemplateElement(selectedTemplateElement.id, { textAlign: 'center' })} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors shadow-sm ${selectedTemplateElement.textAlign === 'center' ? 'bg-indigo-950/50 border-indigo-900/50 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'}`}>↔</button>
                              <button onClick={() => updateTemplateElement(selectedTemplateElement.id, { textAlign: 'right' })} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors shadow-sm ${selectedTemplateElement.textAlign === 'right' ? 'bg-indigo-950/50 border-indigo-900/50 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'}`}>⭲</button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1">Size</label><input type="number" value={selectedTemplateElement.fontSize} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { fontSize: Number(e.target.value) })} className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-center text-sm font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                              <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1">Spacing</label><input type="number" value={selectedTemplateElement.letterSpacing || 0} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { letterSpacing: Number(e.target.value) })} className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-center text-sm font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                              <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1">Line Ht</label><input type="number" step="0.1" value={selectedTemplateElement.lineHeight || 1.2} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { lineHeight: Number(e.target.value) })} className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-center text-sm font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1">Color</label><input type="color" value={selectedTemplateElement.color} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { color: e.target.value })} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg p-0.5 cursor-pointer shadow-sm" /></div>
                              <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1">Outline</label><input type="color" value={selectedTemplateElement.textStrokeColor || '#000000'} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { textStrokeColor: e.target.value })} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg p-0.5 cursor-pointer shadow-sm" /></div>
                              <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1">Width</label><input type="number" min="0" value={selectedTemplateElement.textStrokeWidth || 0} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { textStrokeWidth: Number(e.target.value) })} className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-center text-sm font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                            </div>
                          </div>
                        )}

                        {/* SHAPE & PHOTO PROPS */}
                        {(selectedTemplateElement.type === 'shape' || selectedTemplateElement.type === 'photo') && (
                          <div className="space-y-4 pt-4 border-t border-slate-800">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block bg-slate-950 p-2 rounded-lg border border-slate-800 text-center mb-2">Styling & Filters</label>
                            {selectedTemplateElement.type === 'shape' && (
                              <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1">Fill Color</label><input type="color" value={selectedTemplateElement.backgroundColor} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { backgroundColor: e.target.value })} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg p-0.5 cursor-pointer shadow-sm" /></div>
                            )}

                            {selectedTemplateElement.type === 'photo' && (
                              <>
                                <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Brightness</label><span className="text-[10px] text-indigo-400">{selectedTemplateElement.filterBrightness ?? 100}%</span></div><input type="range" min="0" max="200" value={selectedTemplateElement.filterBrightness ?? 100} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { filterBrightness: Number(e.target.value) })} className="w-full accent-indigo-500" /></div>
                                <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Contrast</label><span className="text-[10px] text-indigo-400">{selectedTemplateElement.filterContrast ?? 100}%</span></div><input type="range" min="0" max="200" value={selectedTemplateElement.filterContrast ?? 100} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { filterContrast: Number(e.target.value) })} className="w-full accent-indigo-500" /></div>
                                <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Saturation</label><span className="text-[10px] text-indigo-400">{selectedTemplateElement.filterSaturation ?? 100}%</span></div><input type="range" min="0" max="200" value={selectedTemplateElement.filterSaturation ?? 100} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { filterSaturation: Number(e.target.value) })} className="w-full accent-indigo-500" /></div>
                                <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Blur</label><span className="text-[10px] text-indigo-400">{selectedTemplateElement.filterBlur || 0}px</span></div><input type="range" min="0" max="20" value={selectedTemplateElement.filterBlur || 0} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { filterBlur: Number(e.target.value) })} className="w-full accent-indigo-500" /></div>
                              </>
                            )}

                            <div>
                              <div className="flex justify-between mb-1 pl-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Corner Radius</label></div>
                              <input type="range" min="0" max={selectedTemplateElement.type === 'photo' ? 50 : 150} value={selectedTemplateElement.borderRadius} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { borderRadius: Number(e.target.value) })} className="w-full accent-indigo-500" />
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1">Border Color</label><input type="color" value={selectedTemplateElement.borderColor || '#ffffff'} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { borderColor: e.target.value })} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg p-0.5 cursor-pointer shadow-sm" /></div>
                              <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-1">Border Width</label><input type="number" min="0" value={selectedTemplateElement.borderWidth || 0} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { borderWidth: Number(e.target.value) })} className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-center text-sm font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                            </div>
                          </div>
                        )}

                        {/* SHADOWS */}
                        {(selectedTemplateElement.type === 'text' || selectedTemplateElement.type === 'shape') && (
                          <div className="pt-4 border-t border-slate-800">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block bg-slate-950 p-2 rounded-lg border border-slate-800 text-center mb-3">Drop Shadow</label>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div><label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 pl-1">Color</label><input type="color" value={selectedTemplateElement.shadowColor || 'transparent'} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { shadowColor: e.target.value })} className="w-full h-8 bg-slate-950 border border-slate-800 rounded-lg p-0.5 cursor-pointer shadow-sm" /></div>
                              <div><label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 pl-1">Blur</label><input type="number" min="0" value={selectedTemplateElement.shadowBlur || 0} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { shadowBlur: Number(e.target.value) })} className="w-full h-8 bg-slate-950 border border-slate-800 text-white rounded-lg px-2 text-sm font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 pl-1">Offset X</label><input type="number" value={selectedTemplateElement.shadowOffsetX || 0} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { shadowOffsetX: Number(e.target.value) })} className="w-full h-8 bg-slate-950 border border-slate-800 text-white rounded-lg px-2 text-sm font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                              <div><label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 pl-1">Offset Y</label><input type="number" value={selectedTemplateElement.shadowOffsetY || 0} onChange={(e) => updateTemplateElement(selectedTemplateElement.id, { shadowOffsetY: Number(e.target.value) })} className="w-full h-8 bg-slate-950 border border-slate-800 text-white rounded-lg px-2 text-sm font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Templates Gallery at Bottom */}
              {allTemplates.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-800">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Currently Deployed Templates ({allTemplates.length})</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                    {allTemplates.map(temp => (
                      <div key={temp.id} className="bg-slate-900 border border-slate-800 p-2 rounded-xl min-w-62.5 flex items-center gap-3 shrink-0 group">
                        <div className="w-12 h-16 bg-slate-800 rounded bg-cover bg-center" style={{ backgroundImage: `url(${temp.backgroundImage})` }}></div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-white font-bold text-sm truncate">{temp.title}</p>
                          <p className="text-xs text-slate-500 font-mono mt-1">{temp.elements?.length || 0} Layers</p>
                        </div>
                        <button onClick={() => forceDeleteTemplate(temp.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg">🗑️</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default Admin;
