import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeAllUsers } from '../../firebase/userService';
import UserManagement from './UserManagement';
import { Users, UserCheck, UserX, X, Shield, Activity, Loader2 } from 'lucide-react';

export default function AdminPanel({ onClose }) {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      setPermissionError("Access Denied: Admin privileges required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeAllUsers(
      (userList) => {
        setUsers(userList);
        setLoading(false);
      },
      (error) => {
        console.error("Admin Panel Users Read Error:", error);
        setPermissionError(`Users fetch error: ${error.message}`);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [isAdmin]);

  if (!isAdmin || permissionError) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-[#1E293B] border border-[#EF4444]/40 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Admin Access Restricted</h3>
          <p className="text-xs text-[#94A3B8]">
            {permissionError || 'Your account does not have administrator privileges.'}
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs font-semibold text-white hover:bg-[#334155] transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const onlineUsers = users.filter((u) => u.status === 'Online').length;
  const blockedUsers = users.filter((u) => u.isBlocked).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A] text-[#F8FAFC] flex flex-col overflow-hidden">
      {/* Admin Panel Header */}
      <div className="h-[60px] px-6 bg-[#4752C4] border-b border-[#334155] flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white flex items-center justify-center text-white shrink-0 shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">Admin Dashboard</h2>
            <p className="text-[12px] text-white/80">User Management & System Metrics</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
          title="Close Admin Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#94A3B8]">
          <Loader2 className="w-8 h-8 animate-spin text-[#5865F2]" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Metrics Overview Cards */}
          <div className="p-4 bg-[#1E293B] border-b border-[#334155] grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
            <div className="p-3 rounded-2xl bg-[#0F172A] border border-[#334155] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#94A3B8] font-semibold">Total Users</p>
                <p className="text-xl font-extrabold text-white mt-0.5">{totalUsers}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0F172A] border border-[#334155] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#94A3B8] font-semibold">Online Active</p>
                <p className="text-xl font-extrabold text-[#22C55E] mt-0.5">{onlineUsers}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0F172A] border border-[#334155] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#94A3B8] font-semibold">Blocked Users</p>
                <p className="text-xl font-extrabold text-[#EF4444] mt-0.5">{blockedUsers}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* User Management Section */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <UserManagement users={users} currentUserId={currentUser?.uid} />
          </div>
        </div>
      )}
    </div>
  );
}
