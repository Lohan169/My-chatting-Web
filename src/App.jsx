import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Sidebar from './components/chat/Sidebar';
import ChatWindow from './components/chat/ChatWindow';
import { ShieldAlert } from 'lucide-react';

function DashboardLayout() {
  const { activeContact } = useChat();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex h-screen overflow-hidden relative">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Component */}
      <div
        className={`h-full shrink-0 ${
          activeContact ? 'hidden md:flex' : 'w-full md:w-80 lg:w-96 flex'
        } ${
          isMobileSidebarOpen
            ? '!flex fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm md:relative md:w-80 lg:w-96 md:max-w-none'
            : ''
        }`}
      >
        <Sidebar onCloseMobile={() => setIsMobileSidebarOpen(false)} />
      </div>

      {/* Chat Window Component */}
      <div
        className={`h-full flex-1 min-w-0 ${
          !activeContact ? 'hidden md:flex' : 'w-full flex'
        }`}
      >
        <ChatWindow onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />
      </div>
    </div>
  );
}

function Dashboard() {
  const { isBlocked, logout } = useAuth();

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] flex items-center justify-center mb-4 shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Account Suspended</h2>
        <p className="text-xs text-[#94A3B8] max-w-sm mb-6 leading-relaxed">
          Your account has been suspended or blocked by a system administrator. Access to chatting and messaging services is restricted.
        </p>
        <button
          onClick={logout}
          className="px-5 py-2.5 rounded-xl bg-[#334155] text-white hover:bg-[#475569] text-xs font-semibold transition shadow-md"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <ChatProvider>
      <DashboardLayout />
    </ChatProvider>
  );
}

function MainContent() {
  const { currentUser } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  if (currentUser) {
    return <Dashboard />;
  }

  return isRegistering ? (
    <Register onSwitchToLogin={() => setIsRegistering(false)} />
  ) : (
    <Login onSwitchToRegister={() => setIsRegistering(true)} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
