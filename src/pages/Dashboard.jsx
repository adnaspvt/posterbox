import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, serverTimestamp, deleteDoc, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { auth, db, IMGBB_API_KEY } from '../config/firebase'; // 🚀 ImgBB Key Imported
import { Rnd } from 'react-rnd';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

import BrandKitEditor from '../components/BrandKitEditor';
import NotificationBell from '../components/NotificationBell';
import TeamManagement from '../components/TeamManagement';
import AdvancedAnalytics from '../components/AdvancedAnalytics';
import CampaignTemplatesLibrary from '../components/CampaignTemplatesLibrary';
import ProEditor from '../components/ProEditor';

// --- PREMIUM FONTS ---
const FONT_FAMILIES = [
  'Arial, sans-serif', 'Impact, sans-serif', '"Montserrat", sans-serif', '"Poppins", sans-serif',
  '"Inter", sans-serif', '"Roboto", sans-serif', '"Oswald", sans-serif', '"Playfair Display", serif',
  '"Lora", serif', '"Noto Sans", sans-serif', '"Cairo", sans-serif'
];

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- CORE STATE ---
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');

  const [campaigns, setCampaigns] = useState([]);
  const [platformTemplates, setPlatformTemplates] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const [editFirmName, setEditFirmName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editIsPremium, setEditIsPremium] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // --- DESIGN REQUEST STATE ---
  const [designSubject, setDesignSubject] = useState('');
  const [designDetails, setDesignDetails] = useState('');
  const [designMediaFile, setDesignMediaFile] = useState(null);
  const [selectedDesigner, setSelectedDesigner] = useState(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [myRequests, setMyRequests] = useState([]);

  // ==========================================
  // PRO STUDIO STATE (WITH UNDO/REDO)
  // ==========================================
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [bgImage, setBgImage] = useState(null);
  const [bgImageFile, setBgImageFile] = useState(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(1066);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const elements = history[historyIndex] || [];
  const editorCampaign = {
    id: editingCampaignId,
    title: campaignTitle,
    backgroundImage: bgImage,
    canvasWidth,
    canvasHeight,
    elements,
    isPublic
  };


  const [isSaving, setIsSaving] = useState(false);
  // AUTH & DATA FETCHING
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserProfile(data); setEditFirmName(data.firmName || ''); setEditPhone(data.phone || ''); setEditIsPremium(data.isPremium || false);
          }
        } catch (err) {
          console.error('Error loading user profile:', err);
        }
        fetchDashboardData(currentUser.email);
      } else {
        // 🚀 PRESERVE URL PARAMS ON REDIRECT
        navigate('/auth' + location.search);
      }
    });
    return () => unsubscribe();
  }, [navigate, location.search]);

  const fetchDashboardData = async (email) => {
    setIsFetching(true);
    try {
      const q = query(collection(db, "campaigns"), where("ownerEmail", "==", email));
      const querySnapshot = await getDocs(q);
      setCampaigns(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      const tempSnap = await getDocs(collection(db, "templates"));
      setPlatformTemplates(tempSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      const usersSnap = await getDocs(collection(db, "users"));
      setDesigners(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => u.isDesigner === true && u.designerStatus === 'active'));

      const configDoc = await getDoc(doc(db, "settings", "platform"));
      if (configDoc.exists()) setWhatsappNumber(configDoc.data().whatsappNumber || '');

      const reqsSnap = await getDocs(query(collection(db, "designRequests"), where("clientEmail", "==", email)));
      setMyRequests(reqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error("Error loading campaigns. Please refresh the page.");
    }
    finally { setIsFetching(false); setIsLoading(false); }
  };

  const handleLogout = async () => { await signOut(auth); navigate('/auth'); };

  // ==========================================
  // MASTER TEMPLATE CLONER & URL ROUTER
  // ==========================================
  const handleUseMasterTemplate = useCallback(async (template) => {
    setEditingCampaignId(null); // Treat as a brand new campaign
    setCampaignTitle(`${template.title} (Custom)`);
    setBgImage(template.backgroundImage);
    setBgImageFile(null);
    setIsPublic(false);
    setCanvasWidth(template.canvasWidth || 800);
    setCanvasHeight(template.canvasHeight || 1066);

    // Inject the master layers into the history
    const templateElements = template.elements || [];
    setHistory([templateElements]);
    setHistoryIndex(0);

    setActiveView('studio');
    // Clean the URL so it doesn't loop on refresh
    window.history.replaceState({}, document.title, '/dashboard');

    // Simulate a purchase for the designer's earnings
    try {
      await updateDoc(doc(db, "templates", template.id), {
        timesPurchased: increment(1)
      });
    } catch (err) {
      console.error("Failed to increment timesPurchased", err);
    }
  }, []);

  // ==========================================
  // RATINGS & REVIEWS
  // ==========================================
  const handleRateTemplate = async (template, rating) => {
    try {
      const currentRating = template.rating || 5.0;
      const reviewCount = template.reviewCount || 1;
      const newRating = ((currentRating * reviewCount) + rating) / (reviewCount + 1);

      await updateDoc(doc(db, "templates", template.id), {
        rating: newRating,
        reviewCount: increment(1)
      });
      toast.success("Thanks for your review!");

      // Update local state so UI reflects immediately
      setPlatformTemplates(prev => prev.map(t => t.id === template.id ? { ...t, rating: newRating, reviewCount: reviewCount + 1 } : t));
    } catch (e) {
      toast.error("Failed to submit rating.");
    }
  };

  const handleRateDesigner = async (designer, rating) => {
    try {
      const currentRating = designer.rating || 5.0;
      const reviewCount = designer.reviewCount || 1;
      const newRating = ((currentRating * reviewCount) + rating) / (reviewCount + 1);

      await updateDoc(doc(db, "users", designer.id), {
        rating: newRating,
        reviewCount: increment(1)
      });
      toast.success("Designer rated successfully!");

      setDesigners(prev => prev.map(d => d.id === designer.id ? { ...d, rating: newRating, reviewCount: reviewCount + 1 } : d));
    } catch (e) {
      toast.error("Failed to submit rating.");
    }
  };

  // Listen for ?template=123 in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const templateId = params.get('template');
    if (templateId && platformTemplates.length > 0) {
      const targetTemplate = platformTemplates.find(t => t.id === templateId);
      if (targetTemplate) {
        handleUseMasterTemplate(targetTemplate);
      }
    }
  }, [location.search, platformTemplates, handleUseMasterTemplate]);

  // ==========================================
  // DESIGNER REQUESTS
  // ==========================================
  const handleDesignerSubmit = async (e) => {
    e.preventDefault();
    if (!designSubject || !designDetails) return toast.error("Please fill in all details.");
    setIsSendingRequest(true);
    const toastId = toast.loading('Uploading media and sending request...');
    try {
      let mediaUrl = null;
      if (designMediaFile) {
        const formData = new FormData();
        formData.append('image', designMediaFile);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          mediaUrl = data.data.url;
        } else {
          toast.error("Failed to upload media, but continuing anyway...", { id: toastId });
        }
      }

      await addDoc(collection(db, "designRequests"), {
        clientEmail: user.email,
        firmName: userProfile?.firmName || 'Unknown',
        clientPhone: userProfile?.phone || 'Not Provided',
        subject: designSubject,
        details: designDetails,
        mediaUrl: mediaUrl,
        designerId: selectedDesigner ? selectedDesigner.id : null,
        designerName: selectedDesigner ? selectedDesigner.name : null,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      if (selectedDesigner) {
        await addDoc(collection(db, "notifications"), {
          userId: selectedDesigner.id,
          title: "New Job Request",
          message: `${userProfile?.firmName || 'A client'} requested your design services: ${designSubject}`,
          type: "job",
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      toast.success("Request Sent! We will contact you shortly.", { id: toastId });
      setDesignSubject(''); setDesignDetails(''); setDesignMediaFile(null); setSelectedDesigner(null); setActiveView('overview');
    } catch (e) { toast.error("Failed to send request.", { id: toastId }); } finally { setIsSendingRequest(false); }
  };

  const handleDirectWhatsApp = () => {
    if (!whatsappNumber) return toast.error("WhatsApp contact is currently unavailable.");
    const message = encodeURIComponent(`Hi CampSend Team! I am messaging from ${userProfile?.firmName || 'my dashboard'}.`);
    window.open(`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  // ==========================================
  // CAMPAIGN STUDIO CONTROLS
  // ==========================================

  const handleCreateNewCampaign = () => {
    setEditingCampaignId(null); setCampaignTitle(''); setBgImage(null); setBgImageFile(null); setIsPublic(false);
    setHistory([[]]); setHistoryIndex(0); setCanvasWidth(800); setCanvasHeight(1066); setActiveView('studio');
  };

  const handleEditCampaign = (c) => {
    setEditingCampaignId(c.id); setCampaignTitle(c.title); setBgImage(c.backgroundImage); setBgImageFile(null); setIsPublic(c.isPublic || false);
    setHistory([c.elements || []]); setHistoryIndex(0); setCanvasWidth(c.canvasWidth || 800); setCanvasHeight(c.canvasHeight || 1066); setActiveView('studio');
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm("Delete this campaign?")) return;
    try {
      await deleteDoc(doc(db, "campaigns", id));
      setCampaigns(campaigns.filter(c => c.id !== id));
      toast.success("Campaign deleted.");
    } catch (e) {
      console.error('Error deleting campaign:', e);
      toast.error("Failed to delete campaign.");
    }
  };








  // 🚀 SECURE IMGBB UPLOAD LOGIC
  const confirmPublish = async () => {
    setShowPublishModal(false);
    setIsSaving(true);
    const toastId = toast.loading('Publishing Campaign...');

    try {
      let publicImageUrl = bgImage;

      if (bgImageFile) {
        const formData = new FormData();
        formData.append('image', bgImageFile, 'image.png');

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
        title: campaignTitle,
        backgroundImage: publicImageUrl,
        elements: elements,
        canvasWidth,
        canvasHeight,
        isPublic: isPublic,
        isPremium: userProfile?.isPremium || false,
        updatedAt: serverTimestamp()
      };

      if (editingCampaignId) {
        await updateDoc(doc(db, "campaigns", editingCampaignId), payload);
      } else {
        payload.ownerEmail = user.email;
        payload.createdAt = serverTimestamp();
        payload.views = 0;
        payload.postersGenerated = 0;
        const docRef = await addDoc(collection(db, "campaigns"), payload);
        setEditingCampaignId(docRef.id);
      }

      fetchDashboardData(user.email);
      toast.success('Campaign Published Successfully!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Failed to upload image. Check console.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault(); if (!editFirmName.trim()) return toast.error("Firm name cannot be empty."); setIsUpdatingProfile(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { firmName: editFirmName, phone: editPhone, isPremium: editIsPremium });
      setUserProfile(prev => ({ ...prev, firmName: editFirmName, phone: editPhone, isPremium: editIsPremium }));
      toast.success("Profile Updated Successfully!");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const totalViews = campaigns.reduce((sum, camp) => sum + (camp.views || 0), 0);
  const totalPosters = campaigns.reduce((sum, camp) => sum + (camp.postersGenerated || 0), 0);


  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600 font-bold text-xl animate-pulse">Loading App...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800 pb-20 md:pb-0">

      <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex md:flex-col shrink-0 z-40 relative shadow-sm">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30"><span className="text-white font-black text-xl leading-none">C</span></div><div className="text-2xl font-black text-slate-800 tracking-tight cursor-pointer" onClick={() => navigate('/')}>Camp<span className="text-indigo-600">Send</span></div></div>
        <nav className="flex-1 p-6 flex flex-col gap-2 overflow-y-auto">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Main Menu</p>
          <button onClick={() => setActiveView('overview')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeView === 'overview' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><span className="text-xl">📊</span> My Campaigns</button>
          <button onClick={() => setActiveView('analytics')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeView === 'analytics' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><span className="text-xl">📈</span> Analytics</button>
          <button onClick={() => setActiveView('templates')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeView === 'templates' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><span className="text-xl">🖼️</span> Master Templates</button>
          <button onClick={() => setActiveView('library')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeView === 'library' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><span className="text-xl">🎨</span> Template Library</button>
          <div className="h-px bg-slate-100 my-4"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Workspace</p>
          <button onClick={() => setActiveView('branding')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeView === 'branding' ? 'bg-rose-50 text-rose-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><span className="text-xl">🎨</span> Brand Kit</button>
          <button onClick={() => setActiveView('team')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeView === 'team' ? 'bg-cyan-50 text-cyan-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><span className="text-xl">👥</span> Team</button>
          <div className="h-px bg-slate-100 my-4"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Services & Support</p>
          <button onClick={() => setActiveView('designer')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeView === 'designer' ? 'bg-purple-50 text-purple-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><span className="text-xl">✨</span> Hire a Designer</button>
          <button onClick={() => setActiveView('requests')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeView === 'requests' ? 'bg-amber-50 text-amber-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><span className="text-xl">📥</span> My Requests</button>
          <button onClick={() => setActiveView('settings')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${activeView === 'settings' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><span className="text-xl">⚙️</span> Settings</button>
        </nav>
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</span>
              <NotificationBell userId={user?.uid} />
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm"><div className="w-10 h-10 bg-linear-to-tr from-indigo-600 to-purple-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-inner">{userProfile?.firmName ? userProfile.firmName.charAt(0).toUpperCase() : "U"}</div><div className="overflow-hidden flex-1"><p className="text-sm font-bold text-slate-800 truncate">{userProfile?.firmName || "My Organization"}</p><p className="text-xs font-medium text-slate-400 truncate">{user?.email}</p></div></div>
          </div>
          <button onClick={() => navigate('/designer')} className="w-full py-3 mb-2 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-xl font-bold transition-all duration-200 shadow-sm flex items-center justify-center gap-2">🎨 Designer Portal</button>
          <button onClick={handleLogout} className="w-full py-3 text-slate-500 bg-white border border-slate-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold transition-all duration-200 shadow-sm">Sign Out</button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 flex justify-around items-center px-2 py-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <button onClick={() => setActiveView('overview')} className={`flex flex-col items-center p-2 rounded-xl min-w-17.5 ${activeView === 'overview' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><span className="text-xl mb-1">📊</span><span className="text-[10px] font-bold">Campaigns</span></button>
        <button onClick={() => setActiveView('analytics')} className={`flex flex-col items-center p-2 rounded-xl min-w-17.5 ${activeView === 'analytics' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><span className="text-xl mb-1">📈</span><span className="text-[10px] font-bold">Analytics</span></button>
        <button onClick={() => setActiveView('templates')} className={`flex flex-col items-center p-2 rounded-xl min-w-17.5 ${activeView === 'templates' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}><span className="text-xl mb-1">🖼️</span><span className="text-[10px] font-bold">Templates</span></button>
        <button onClick={() => setActiveView('branding')} className={`flex flex-col items-center p-2 rounded-xl min-w-17.5 ${activeView === 'branding' ? 'text-rose-600 bg-rose-50' : 'text-slate-400'}`}><span className="text-xl mb-1">🎨</span><span className="text-[10px] font-bold">Branding</span></button>
        <button onClick={() => setActiveView('team')} className={`flex flex-col items-center p-2 rounded-xl min-w-17.5 ${activeView === 'team' ? 'text-cyan-600 bg-cyan-50' : 'text-slate-400'}`}><span className="text-xl mb-1">👥</span><span className="text-[10px] font-bold">Team</span></button>
        <button onClick={() => setActiveView('designer')} className={`flex flex-col items-center p-2 rounded-xl min-w-17.5 ${activeView === 'designer' ? 'text-purple-600 bg-purple-50' : 'text-slate-400'}`}><span className="text-xl mb-1">✨</span><span className="text-[10px] font-bold">Designer</span></button>
        <button onClick={() => setActiveView('requests')} className={`flex flex-col items-center p-2 rounded-xl min-w-17.5 ${activeView === 'requests' ? 'text-amber-600 bg-amber-50' : 'text-slate-400'}`}><span className="text-xl mb-1">📥</span><span className="text-[10px] font-bold">Requests</span></button>
        <button onClick={() => setActiveView('settings')} className={`flex flex-col items-center p-2 rounded-xl min-w-17.5 ${activeView === 'settings' ? 'text-slate-800 bg-slate-100' : 'text-slate-400'}`}><span className="text-xl mb-1">⚙️</span><span className="text-[10px] font-bold">Settings</span></button>
      </nav>

      <main className="flex-1 flex flex-col h-full overflow-y-auto relative scroll-smooth">
        {activeView !== 'studio' && (
          <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-40">
            <div className="flex items-center gap-2"><div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center"><span className="text-white font-black text-xs">C</span></div><div className="text-xl font-black text-slate-800 tracking-tight">Camp<span className="text-indigo-600">Send</span></div></div>
            <div className="flex items-center gap-3">
              <NotificationBell userId={user?.uid} />
              <button onClick={() => navigate('/designer')} className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm flex items-center gap-1"><span>🎨</span> Portal</button>
              <div className="w-8 h-8 bg-linear-to-tr from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center font-black text-sm shadow-md">{userProfile?.firmName ? userProfile.firmName.charAt(0).toUpperCase() : "U"}</div>
            </div>
          </header>
        )}

        <div className="flex-1 p-4 md:p-10 w-full max-w-6xl mx-auto h-full flex flex-col">

          {activeView === 'overview' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
                <div><h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Campaign Analytics</h1><p className="text-slate-500 mt-2 font-medium">Manage and track your interactive public links.</p></div>
                <button onClick={handleCreateNewCampaign} className="w-full md:w-auto bg-linear-to-r from-indigo-600 to-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"><span className="text-xl leading-none">+</span> Blank Campaign</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"><div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl mb-3">👁️</div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Reach</p><p className="text-3xl md:text-4xl font-black text-slate-800">{totalViews}</p></div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"><div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl mb-3">📥</div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Downloads</p><p className="text-3xl md:text-4xl font-black text-slate-800">{totalPosters}</p></div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"><div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl mb-3">⚡</div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Conversion</p><p className="text-3xl md:text-4xl font-black text-slate-800">{totalViews > 0 ? ((totalPosters / totalViews) * 100).toFixed(1) : "0"}%</p></div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"><div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl mb-3">🎯</div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Links</p><p className="text-3xl md:text-4xl font-black text-slate-800">{campaigns.length}</p></div>
              </div>
              {campaigns.length === 0 && !isFetching && (<div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm"><div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-4">🚀</div><h3 className="text-xl font-bold text-slate-800 mb-2">No active campaigns</h3><p className="text-slate-500 max-w-md">Create your first campaign to start engaging your audience and collecting analytics.</p></div>)}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {campaigns.map(camp => (
                  <div key={camp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row gap-5 hover:shadow-lg transition-all duration-300 group">
                    <div className="w-full sm:w-32 h-48 sm:h-32 bg-slate-100 rounded-xl relative overflow-hidden shrink-0"><div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url(${camp.backgroundImage})` }}></div><div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div></div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-slate-800 truncate pr-2">{camp.title}</h3>
                          {camp.isPublic && <span className="shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase px-2 py-0.5 rounded">Public</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-4"><div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Reach</p><p className="font-bold text-slate-700 text-sm">{camp.views || 0}</p></div><div className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50"><p className="text-[9px] font-black text-indigo-400 uppercase">Downs</p><p className="font-bold text-indigo-700 text-sm">{camp.postersGenerated || 0}</p></div></div>

                          <div className="flex flex-col items-center gap-1 group/qr cursor-pointer relative" onClick={(e) => {
                            // Quick hack to download QR code SVG
                            const svg = e.currentTarget.querySelector('svg');
                            if (!svg) return;
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const canvas = document.createElement("canvas");
                            const ctx = canvas.getContext("2d");
                            const img = new Image();
                            img.onload = () => {
                              canvas.width = img.width;
                              canvas.height = img.height;
                              ctx.fillStyle = "white";
                              ctx.fillRect(0, 0, canvas.width, canvas.height);
                              ctx.drawImage(img, 0, 0);
                              const pngFile = canvas.toDataURL("image/png");
                              const downloadLink = document.createElement("a");
                              downloadLink.download = `QR_${camp.title.replace(/\s+/g, '_')}.png`;
                              downloadLink.href = `${pngFile}`;
                              downloadLink.click();
                            };
                            img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                            toast.success("Downloading QR Code...");
                          }}>
                            <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-400 hover:shadow-md transition-all">
                              <QRCodeSVG value={`${window.location.origin}/generator?id=${camp.id}`} size={48} level="Q" />
                            </div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover/qr:opacity-100 transition-opacity absolute -bottom-4">Click to DL</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2"><button onClick={() => handleEditCampaign(camp)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-2 rounded-lg text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">Edit</button><button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/generator?id=${camp.id}`); toast.success("Share Link Copied!"); }} className="flex-1 bg-indigo-50 text-indigo-600 font-bold py-2 rounded-lg text-sm hover:bg-indigo-100 transition-colors shadow-sm">Copy Link</button><button onClick={() => handleDeleteCampaign(camp.id)} className="w-10 flex items-center justify-center bg-white border border-red-100 text-red-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm">🗑️</button></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'templates' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 border-b border-slate-200 pb-6"><h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Master Templates</h1><p className="text-slate-500 mt-2 font-medium">Clone a professional layout into your Pro Studio to launch your campaign instantly.</p></div>
              {platformTemplates.length === 0 ? (<div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center shadow-sm"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🖼️</div><p className="text-slate-500 font-medium">No templates available yet. Check back soon!</p></div>) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {platformTemplates.map(template => (
                    <div key={template.id} className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm hover:shadow-xl transition-all group flex flex-col relative">
                      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                        <span className="text-[10px] text-yellow-500">⭐</span>
                        <span className="text-xs font-bold text-slate-800">{template.rating ? template.rating.toFixed(1) : "5.0"}</span>
                      </div>
                      <div onClick={() => handleUseMasterTemplate(template)} className="aspect-3/4 bg-slate-100 rounded-xl mb-3 overflow-hidden relative cursor-pointer">
                        <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: `url(${template.backgroundImage})` }}></div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="bg-white text-indigo-600 font-bold text-sm px-4 py-2 rounded-lg shadow-lg">Use Template</span></div>
                      </div>
                      <div className="flex justify-between items-center px-1 mb-1">
                        <h3 className="font-bold text-sm text-slate-800 truncate pr-2">{template.title}</h3>
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); handleRateTemplate(template, 5); }} className="text-slate-300 hover:text-yellow-400 transition-colors" title="Rate 5 Stars">★</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'designer' && (
            <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500 w-full">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl text-3xl mb-4 shadow-sm border border-purple-200">✨</div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Hire a Pro Designer</h1>
                <p className="text-slate-500 font-medium mt-3 px-4">Select a designer from our agency roster or let us assign the best fit for your project.</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-10 relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400 rounded-full blur-[80px] opacity-10 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

                <form onSubmit={handleDesignerSubmit} className="relative z-10 flex flex-col gap-6">

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">1. Select Your Designer</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div onClick={() => setSelectedDesigner(null)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${!selectedDesigner ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-200 bg-slate-50 hover:border-purple-200'}`}>
                        <div className="text-2xl mb-1">⚡</div>
                        <h3 className="font-bold text-slate-800 text-sm">Any Available</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Fastest Delivery</p>
                      </div>

                      {designers.map(d => (
                        <div key={d.id} onClick={() => setSelectedDesigner(d)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedDesigner?.id === d.id ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-200 bg-white hover:border-purple-200'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-black text-sm">{d.name.charAt(0)}</div>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {d.portfolio && (
                                <a href={d.portfolio} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] bg-slate-100 text-slate-600 hover:text-purple-600 hover:bg-purple-50 px-2 py-1 rounded font-bold transition-colors">Portfolio ↗</a>
                              )}
                              {d.behanceLink && (
                                <a href={d.behanceLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded font-bold transition-colors">Behance ↗</a>
                              )}
                              {d.socialLink && (
                                <a href={d.socialLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] bg-pink-50 text-pink-600 hover:bg-pink-100 px-2 py-1 rounded font-bold transition-colors">Social ↗</a>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-slate-800 text-sm truncate">{d.name}</h3>
                            {d.whatsapp && (
                              <a href={`https://wa.me/${d.whatsapp.replace(/[^0-9]/g, '')}?text=Hi ${d.name}, I found your profile on CampSend!`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] bg-[#25D366]/10 text-[#25D366] px-2 py-1 rounded font-bold transition-colors flex items-center gap-1"><svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg> Chat</a>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider truncate">{d.specialty}</p>
                            <div className="flex items-center gap-1 group/rate">
                              <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><span className="text-yellow-500">⭐</span> {d.rating ? d.rating.toFixed(1) : "5.0"}</p>
                              <button onClick={(e) => { e.stopPropagation(); handleRateDesigner(d, 5); }} className="text-slate-300 hover:text-yellow-400 transition-colors opacity-0 group-hover/rate:opacity-100" title="Give 5 Stars">★</button>
                            </div>
                          </div>
                          {d.designerBio && <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{d.designerBio}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">2. Project Subject</label>
                    <input type="text" value={designSubject} onChange={(e) => setDesignSubject(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 transition-all" placeholder="e.g. Custom Marathon Flyer" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">3. Details & Requirements</label>
                    <textarea value={designDetails} onChange={(e) => setDesignDetails(e.target.value)} rows="4" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none" placeholder="Describe your vision, brand colors, text requirements..."></textarea>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">4. Upload Reference / Assets (Optional)</label>
                    <input type="file" accept="image/*" onChange={(e) => setDesignMediaFile(e.target.files[0])} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white transition-all text-sm" />
                  </div>

                  <button type="submit" disabled={isSendingRequest} className="w-full py-4 bg-slate-900 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 mt-2">
                    {isSendingRequest ? "Sending Request..." : "Submit Design Request"}
                  </button>
                </form>
              </div>

              <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-3xl p-6 md:p-8 text-center flex flex-col items-center">
                <p className="text-sm text-slate-600 font-bold mb-4">Need immediate assistance or prefer to chat?</p>
                <button onClick={handleDirectWhatsApp} type="button" className="w-full md:w-auto px-8 py-4 bg-[#25D366] text-white font-bold text-lg rounded-xl shadow-lg shadow-[#25D366]/30 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3"><svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>Chat with us on WhatsApp</button>
              </div>
            </div>
          )}

          {activeView === 'requests' && (
            <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 w-full p-4 md:p-8">
              <h1 className="text-3xl font-black text-slate-900 mb-8">My Design Requests</h1>
              {myRequests.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                  <div className="text-5xl mb-4">📭</div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">No Requests Yet</h2>
                  <p className="text-slate-500 mb-6">You haven't hired a designer for any custom requests.</p>
                  <button onClick={() => setActiveView('designer')} className="bg-purple-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-purple-700 transition">Hire a Designer</button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {myRequests.map(req => (
                    <div key={req.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden">
                      {req.status === 'completed' && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-10 rounded-bl-full pointer-events-none"></div>}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-black text-xl text-slate-800">{req.subject}</h3>
                          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${req.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : req.status === 'accepted' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Designer: {req.designerName || 'Pending Assignment'}</p>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{req.details}</p>
                        </div>
                        {req.mediaUrl && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Your Uploaded Media</p>
                            <img src={req.mediaUrl} alt="Uploaded Media" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
                          </div>
                        )}
                        {req.status === 'completed' && req.finalDesignUrl && (
                          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">✅ Final Design Delivered</p>
                            <div className="flex items-center gap-4">
                              <img src={req.finalDesignUrl} alt="Final Design" className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                              <a href={req.finalDesignUrl} target="_blank" rel="noreferrer" download className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm shadow-sm transition">
                                Download High-Res File
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'settings' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 border-b border-slate-200 pb-6"><h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Settings</h1><p className="text-slate-500 mt-2 font-medium">Manage your organization's profile and preferences.</p></div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10 mb-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><span className="text-indigo-600">🏢</span> Firm Details</h2>
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
                  <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Organization Name</label><input type="text" value={editFirmName} onChange={(e) => setEditFirmName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">WhatsApp / Mobile Number</label><input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. +91 9876543210" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Registered Email</label><input type="email" value={user?.email || ''} disabled className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-400 cursor-not-allowed" /></div>

                  <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <input type="checkbox" checked={editIsPremium} onChange={(e) => setEditIsPremium(e.target.checked)} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" id="premium-toggle" />
                    <label htmlFor="premium-toggle" className="font-bold text-indigo-900 cursor-pointer flex-1">
                      CampSend Premium
                      <span className="block text-xs text-indigo-500 font-medium">Remove watermark from generated campaigns.</span>
                    </label>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end"><button type="submit" disabled={isUpdatingProfile} className="w-full md:w-auto bg-indigo-600 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">{isUpdatingProfile ? "Saving..." : "Save Changes"}</button></div>
                </form>
              </div>
              <div className="md:hidden"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 text-center">Account Security</p><button onClick={handleLogout} className="w-full py-4 bg-white border border-red-200 text-red-500 font-bold rounded-2xl shadow-sm hover:bg-red-50 transition-colors">Sign Out Securely</button></div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW: ADVANCED ANALYTICS                     */}
          {/* ========================================== */}
          {activeView === 'analytics' && (
            <AdvancedAnalytics campaigns={campaigns} />
          )}

          {/* ========================================== */}
          {/* VIEW: BRAND KIT EDITOR                       */}
          {/* ========================================== */}
          {activeView === 'branding' && (
            <BrandKitEditor userId={user?.uid} />
          )}

          {/* ========================================== */}
          {/* VIEW: TEAM MANAGEMENT                        */}
          {/* ========================================== */}
          {activeView === 'team' && (
            <TeamManagement userId={user?.uid} userEmail={user?.email} />
          )}

          {/* ========================================== */}
          {/* VIEW: CAMPAIGN TEMPLATES LIBRARY             */}
          {/* ========================================== */}
          {activeView === 'library' && (
            <CampaignTemplatesLibrary onTemplateSelect={(template) => {
              setHistory([template.elements || []]);
              setHistoryIndex(0);
              setCampaignTitle(template.title);
              setActiveView('studio');
            }} />
          )}

          {/* ========================================== */}
          {/* VIEW: PRO STUDIO EDITOR                      */}
          {/* ========================================== */}
          {activeView === 'studio' && (
            <ProEditor
              initialCampaign={editorCampaign}
              userEmail={user?.email}
              onClose={() => setActiveView('overview')}
            />
          )}

          {/* ========================================== */}
          {/* PRE-PUBLISH CONSENT MODAL                  */}
          {/* ========================================== */}
          {showPublishModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-100 p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-2xl font-black text-slate-800 mb-2">Publish Campaign</h3>
                <p className="text-slate-500 text-sm font-medium mb-6">You are about to make <strong className="text-slate-700">{campaignTitle}</strong> live on the internet.</p>

                <div
                  className={`border-2 rounded-2xl p-4 mb-8 cursor-pointer transition-all ${isPublic ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}
                  onClick={() => setIsPublic(!isPublic)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-indigo-600 cursor-pointer shrink-0"
                    />
                    <div>
                      <p className={`font-black text-sm ${isPublic ? 'text-indigo-900' : 'text-slate-700'}`}>Feature on Homepage</p>
                      <p className={`text-xs mt-1 leading-relaxed ${isPublic ? 'text-indigo-700' : 'text-slate-500'}`}>
                        By checking this box, you consent to displaying your completed campaign on the main public homepage. This allows visitors to discover your brand and interact with your design, driving massive visibility to your business!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowPublishModal(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                  <button onClick={confirmPublish} disabled={isSaving} className="flex-2 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] transition-all active:scale-95 disabled:opacity-50">
                    {isSaving ? "Publishing..." : "Confirm & Publish"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default Dashboard;
