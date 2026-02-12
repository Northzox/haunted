'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import Button from '@/components/ui/Button';

interface Server {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  inviteCode: string;
  owner: {
    id: string;
    username: string;
    avatar?: string;
  };
  _count: {
    members: number;
    channels: number;
  };
  channels: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers');
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers);
      } else {
        // If not authenticated, redirect to login
        if (response.status === 401) {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerClick = (serverId: string) => {
    router.push(`/servers/${serverId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted">Loading your servers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Logo size="md" />
            <div className="flex items-center gap-4">
              <Button 
                variant="secondary" 
                onClick={() => setShowJoinModal(true)}
              >
                Join Server
              </Button>
              <Button 
                onClick={() => setShowCreateModal(true)}
              >
                Create Server
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
                  router.push('/');
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Your Servers
          </h1>
          <p className="text-text-secondary">
            Manage and access your Haunted Crd servers
          </p>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌑</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              No servers yet
            </h2>
            <p className="text-text-muted mb-6">
              Create your first server or join an existing one to get started
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setShowCreateModal(true)}>
                Create Server
              </Button>
              <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
                Join Server
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servers.map((server) => (
              <div
                key={server.id}
                className="bg-black border border-border rounded-lg p-6 hover:border-gray transition-colors duration-200 cursor-pointer"
                onClick={() => handleServerClick(server.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-dark-gray rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-text-primary">
                      {server.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted text-sm">
                    <span>👥 {server._count.members}</span>
                    <span>💬 {server._count.channels}</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {server.name}
                </h3>
                
                {server.description && (
                  <p className="text-text-muted text-sm mb-4 line-clamp-2">
                    {server.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-text-muted">
                    Owned by {server.owner.username}
                  </div>
                  {server.isPublic && (
                    <div className="text-xs bg-dark-gray px-2 py-1 rounded text-text-secondary">
                      Public
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Server Modal */}
      {showCreateModal && (
        <CreateServerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchServers();
          }}
        />
      )}

      {/* Join Server Modal */}
      {showJoinModal && (
        <JoinServerModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false);
            fetchServers();
          }}
        />
      )}
    </div>
  );
}

// Create Server Modal Component
function CreateServerModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setErrors({ general: data.error || 'Failed to create server' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-border rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          Create Server
        </h2>
        
        {errors.general && (
          <div className="bg-red-900 border border-red-800 text-red-200 px-4 py-3 rounded-md mb-4">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Server Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-black border border-border rounded-md text-text-primary focus:outline-none focus:border-gray"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-black border border-border rounded-md text-text-primary focus:outline-none focus:border-gray"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="h-4 w-4 bg-black border-border rounded focus:ring-gray"
            />
            <label htmlFor="isPublic" className="ml-2 text-sm text-text-secondary">
              Make server public (anyone can join)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              Create Server
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Join Server Modal Component
function JoinServerModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`/api/servers/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setErrors({ general: data.error || 'Failed to join server' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-border rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          Join Server
        </h2>
        
        {errors.general && (
          <div className="bg-red-900 border border-red-800 text-red-200 px-4 py-3 rounded-md mb-4">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-black border border-border rounded-md text-text-primary focus:outline-none focus:border-gray"
              placeholder="Enter invite code"
              required
              maxLength={20}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              Join Server
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
