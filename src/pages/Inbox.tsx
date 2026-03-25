import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Users, ChevronLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '../socket';
import { User as UserType, Message } from '../types';

interface InboxProps {
  user: UserType;
}

export default function Inbox({ user }: InboxProps) {
  // Guard against null user
  if (!user) {
    return null;
  }

  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all registered users
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch messages when a user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      
      // Listen for new messages
      socket.on('message', (msg: Message) => {
        if (
          (msg.sender_id === selectedUser.id && msg.receiver_id === user?.id) ||
          (msg.sender_id === user?.id && msg.receiver_id === selectedUser.id)
        ) {
          setMessages(prev => [...prev, msg]);
        }
      });

      return () => {
        socket.off('message');
      };
    }
  }, [selectedUser, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users/all');
      if (res.ok) {
        const data = await res.json();
        // Filter out current user
        setUsers(data.filter((u: UserType) => u.id !== user?.id));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchMessages = async (otherUserId: number) => {
    try {
      const res = await fetch(`/api/messages/${otherUserId}?userId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user?.id,
          receiver_id: selectedUser.id,
          text: newMessage.trim()
        })
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen">
      {/* Users Sidebar - Hidden by default, slides in */}
      <AnimatePresence>
        {isUsersMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-neutral-200 shadow-xl md:relative md:translate-x-0"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h2 className="text-lg font-semibold text-neutral-800">Messages</h2>
                <button
                  onClick={() => setIsUsersMenuOpen(false)}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg md:hidden"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-neutral-200">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setIsUsersMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-neutral-50 transition-colors ${
                      selectedUser?.id === u.id ? 'bg-neutral-100' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 overflow-hidden flex-shrink-0">
                      {u.profile_picture ? (
                        <img src={u.profile_picture} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-emerald-600 font-semibold">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-neutral-800 truncate">{u.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{u.email}</p>
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="p-4 text-center text-neutral-500">
                    {searchQuery ? 'No users found' : 'No other users yet'}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-neutral-200 bg-white">
              <button
                onClick={() => setIsUsersMenuOpen(true)}
                className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg md:hidden"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setIsUsersMenuOpen(true)}
                className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg hidden md:block"
              >
                <Users size={20} />
              </button>
              <div className="w-10 h-10 rounded-full bg-emerald-100 overflow-hidden">
                {selectedUser.profile_picture ? (
                  <img src={selectedUser.profile_picture} alt={selectedUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-600 font-semibold">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-neutral-800">{selectedUser.name}</p>
                <p className="text-xs text-neutral-500">{selectedUser.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isOwn = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-neutral-100 text-neutral-800 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-emerald-100' : 'text-neutral-400'}`}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-neutral-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-neutral-100 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          /* No user selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={40} className="text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">Your Messages</h3>
            <p className="text-neutral-500 mb-6 max-w-xs">
              Select a user from the menu to start chatting
            </p>
            <button
              onClick={() => setIsUsersMenuOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Users size={18} />
              <span>Show All Users</span>
            </button>
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {isUsersMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsUsersMenuOpen(false)}
        />
      )}
    </div>
  );
}
