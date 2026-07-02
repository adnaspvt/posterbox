import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

export default function TeamManagement({ userId, userEmail }) {
  const [team, setTeam] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadTeam();
  }, [userId]);

  const loadTeam = async () => {
    try {
      const q = query(collection(db, 'teams'), where('ownerUid', '==', userId));
      const snap = await getDocs(q);
      setTeam(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error loading team:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return toast.error('Please enter an email');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      return toast.error('Please enter a valid email address');
    }
    
    if (inviteEmail === userEmail) {
      return toast.error('You cannot invite yourself');
    }

    setInviting(true);
    try {
      await addDoc(collection(db, 'teams'), {
        ownerUid: userId,
        ownerEmail: userEmail,
        memberEmail: inviteEmail,
        role: inviteRole,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success(`Invitation sent to ${inviteEmail}! 📬`);
      setInviteEmail('');
      setInviteRole('editor');
      loadTeam();
    } catch (err) {
      console.error('Error sending invitation:', err);
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this team member?')) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
      toast.success('Member removed');
      loadTeam();
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Failed to remove member. Please try again.');
    }
  };

  if (loading) return <div className="text-center py-12">Loading team...</div>;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Team Management</h1>
        <p className="text-slate-500 mt-2 font-medium">Invite collaborators and manage roles and permissions.</p>
      </div>

      {/* Invite Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Invite Team Member</h2>
        <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-3">
          <input
            type="email"
            placeholder="Enter email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
          >
            {inviting ? '⏳' : '✉️'} Invite
          </button>
        </form>
      </div>

      {/* Team List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Team Members</h2>
        </div>
        {team.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p>No team members yet. Invite someone to collaborate!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {team.map(member => (
              <div key={member.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{member.memberEmail}</p>
                  <div className="flex gap-3 mt-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      member.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {member.status === 'active' ? '✅ Active' : '⏳ Pending'}
                    </span>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg capitalize">
                      {member.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(member.id)}
                  className="text-red-500 hover:text-red-700 font-bold text-sm"
                >
                  🗑️ Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
