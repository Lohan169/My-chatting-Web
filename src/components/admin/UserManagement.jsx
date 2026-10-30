import React, { useState } from 'react';
import { toggleUserBlockStatus, toggleUserAdminStatus } from '../../firebase/userService';
import { Search, ShieldAlert, ShieldCheck, UserX, UserCheck, Info, X, Shield } from 'lucide-react';

export default function UserManagement({ users, currentUserId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUid, setLoadingUid] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredUsers = users.filter((u) => {
    const name = (u.displayName || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = name.includes(term) || email.includes(term);

    if (!matchesSearch) return false;

    if (filterTab === 'online') return u.status === 'Online';
    if (filterTab === 'blocked') return u.isBlocked === true;
    if (filterTab === 'admins') return u.isAdmin === true;

    return true;
  });

  const handleToggleBlock = async (userToToggle) => {
    if (userToToggle.uid === currentUserId) {
      setErrorMsg("You cannot block your own admin account.");
      return;
    }
    if (userToToggle.isAdmin) {
      setErrorMsg("Admin accounts cannot be blocked. Remove admin role first.");
      return;
    }

    try {
      setErrorMsg('');
      setLoadingUid(userToToggle.uid);
      const newStatus = !userToToggle.isBlocked;
      await toggleUserBlockStatus(userToToggle.uid, newStatus);
    } catch (err) {
      console.error('Failed to toggle block status:', err);
      setErrorMsg(err.message || 'Failed to update user block status.');
    } finally {
      setLoadingUid(null);
    }
  };

  const handleToggleAdmin = async (userToToggle) => {
    if (userToToggle.uid === currentUserId) {
      setErrorMsg("You cannot modify your own admin role.");
      return;
    }

    try {
      setErrorMsg('');
      setLoadingUid(userToToggle.uid);
      const newStatus = !userToToggle.isAdmin;
      await toggleUserAdminStatus(userToToggle.uid, newStatus);
    } catch (err) {
      console.error('Failed to toggle admin status:', err);
      setErrorMsg(err.message || 'Failed to update admin role.');
    } finally {
      setLoadingUid(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0F172A] text-[#F8FAFC]">
      {/* Search & Filter Header */}
      <div className="p-4 bg-[#1E293B] border-b border-[#334155] space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0F172A] border border-[#334155] rounded-full py-2 pl-9 pr-4 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#5865F2] transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { id: 'all', label: `All (${users.length})` },
            { id: 'online', label: `Online (${users.filter((u) => u.status === 'Online').length})` },
            { id: 'blocked', label: `Blocked (${users.filter((u) => u.isBlocked).length})` },
            { id: 'admins', label: `Admins (${users.filter((u) => u.isAdmin).length})` }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterTab(pill.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                filterTab === pill.id
                  ? 'bg-[#5865F2] text-white shadow-sm'
                  : 'bg-[#0F172A] border border-[#334155] text-[#94A3B8] hover:text-white'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 bg-[#EF4444]/10 border-b border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-[#64748B] text-xs">
            <p className="font-semibold text-white text-sm">No users found</p>
            <p className="mt-1">Try adjusting your search query or active filter tab.</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelf = user.uid === currentUserId;
            const isLoading = loadingUid === user.uid;

            return (
              <div
                key={user.uid}
                className="p-3 bg-[#1E293B] border border-[#334155] rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm hover:border-[#5865F2]/50 transition"
              >
                {/* User Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#5865F2] text-white font-bold flex items-center justify-center overflow-hidden shrink-0 relative">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.displayName?.charAt(0)?.toUpperCase() || 'U'
                    )}
                    {user.status === 'Online' && (
                      <span className="w-3 h-3 rounded-full bg-[#22C55E] border-2 border-[#1E293B] absolute bottom-0 right-0"></span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">
                        {user.displayName || 'User'}
                      </p>
                      {user.isAdmin && (
                        <span className="px-2 py-0.5 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] text-[10px] font-bold flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      )}
                      {user.isBlocked && (
                        <span className="px-2 py-0.5 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] text-[10px] font-bold">
                          Blocked
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] text-[#94A3B8] italic">(You)</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#94A3B8] truncate">{user.email || 'No Email'}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="p-1.5 rounded-lg bg-[#0F172A] border border-[#334155] text-[#94A3B8] hover:text-white transition"
                    title="User Details"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {!isSelf && (
                    <>
                      <button
                        onClick={() => handleToggleAdmin(user)}
                        disabled={isLoading}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition ${
                          user.isAdmin
                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/40 text-[#8B5CF6] hover:bg-[#8B5CF6]/30'
                            : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        {user.isAdmin ? (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Remove Admin</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Make Admin</span>
                          </>
                        )}
                      </button>

                      {!user.isAdmin && (
                        <button
                          onClick={() => handleToggleBlock(user)}
                          disabled={isLoading}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition ${
                            user.isBlocked
                              ? 'bg-[#22C55E]/20 border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/30'
                              : 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/30'
                          }`}
                        >
                          {user.isBlocked ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Unblock</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Block</span>
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative"
          >
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#5865F2] text-white text-2xl font-bold flex items-center justify-center overflow-hidden mb-3">
                {selectedUser.profileImageUrl ? (
                  <img
                    src={selectedUser.profileImageUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  selectedUser.displayName?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <h3 className="font-bold text-base text-white">
                {selectedUser.displayName || 'User'}
              </h3>
              <p className="text-xs text-[#94A3B8]">{selectedUser.email || 'No email'}</p>
            </div>

            <div className="bg-[#0F172A] p-3 rounded-xl border border-[#334155] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">UID:</span>
                <span className="font-mono text-[#F8FAFC] truncate max-w-[180px]">
                  {selectedUser.uid}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Status:</span>
                <span className={selectedUser.status === 'Online' ? 'text-[#22C55E]' : 'text-[#94A3B8]'}>
                  {selectedUser.status || 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Role:</span>
                <span className={selectedUser.isAdmin ? 'text-[#5865F2] font-bold' : 'text-[#F8FAFC]'}>
                  {selectedUser.isAdmin ? 'Admin' : 'Standard User'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Account State:</span>
                <span className={selectedUser.isBlocked ? 'text-[#EF4444] font-bold' : 'text-[#22C55E]'}>
                  {selectedUser.isBlocked ? 'Blocked' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
