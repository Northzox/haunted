'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import Button from '@/components/ui/Button';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  customStatus?: string;
  isAnonymous: boolean;
  isOnline: boolean;
  lastSeen: string;
  emailVerified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  banReason?: string;
  banExpires?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
    ownedServers: number;
    serverMemberships: number;
  };
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalServers: number;
  totalMessages: number;
  totalReports: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
    fetchStats();
  }, [currentPage, searchTerm, statusFilter, roleFilter]);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/admin/verify');
      if (!response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      router.push('/dashboard');
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(roleFilter && { role: roleFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch users');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    const reason = prompt(`Enter ban reason for ${username}:`);
    if (!reason) return;

    const duration = prompt('Enter ban duration in days (leave empty for permanent):');
    const durationDays = duration ? parseInt(duration) : null;

    try {
      const response = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reason,
          duration: durationDays,
        }),
      });

      if (response.ok) {
        fetchUsers();
        fetchStats();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to ban user');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!confirm('Are you sure you want to unban this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/ban?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUsers();
        fetchStats();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to unban user');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete ${username}? This action cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUsers();
        fetchStats();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return formatDate(dateString);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Logo size="md" />
            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
              <Button variant="ghost" onClick={() => {
                document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
                router.push('/');
              }}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            👁️ Admin Panel
          </h1>
          <p className="text-text-secondary">
            Manage users, servers, and platform settings
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-black border border-border rounded-lg p-6">
              <div className="text-2xl font-bold text-text-primary mb-2">
                {stats.totalUsers.toLocaleString()}
              </div>
              <div className="text-text-muted">Total Users</div>
            </div>
            <div className="bg-black border border-border rounded-lg p-6">
              <div className="text-2xl font-bold text-text-primary mb-2">
                {stats.activeUsers.toLocaleString()}
              </div>
              <div className="text-text-muted">Active Users</div>
            </div>
            <div className="bg-black border border-border rounded-lg p-6">
              <div className="text-2xl font-bold text-text-primary mb-2">
                {stats.bannedUsers.toLocaleString()}
              </div>
              <div className="text-text-muted">Banned Users</div>
            </div>
            <div className="bg-black border border-border rounded-lg p-6">
              <div className="text-2xl font-bold text-text-primary mb-2">
                {stats.totalServers.toLocaleString()}
              </div>
              <div className="text-text-muted">Total Servers</div>
            </div>
            <div className="bg-black border border-border rounded-lg p-6">
              <div className="text-2xl font-bold text-text-primary mb-2">
                {stats.totalMessages.toLocaleString()}
              </div>
              <div className="text-text-muted">Total Messages</div>
            </div>
            <div className="bg-black border border-border rounded-lg p-6">
              <div className="text-2xl font-bold text-text-primary mb-2">
                {stats.totalReports.toLocaleString()}
              </div>
              <div className="text-text-muted">Pending Reports</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-black border border-border rounded-lg p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Search Users
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by username or email..."
                className="w-full px-3 py-2 bg-black border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-gray"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-black border border-border rounded-md text-text-primary focus:outline-none focus:border-gray"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-black border border-border rounded-md text-text-primary focus:outline-none focus:border-gray"
              >
                <option value="">All</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-800 text-red-200 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-black border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-gray">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 bg-dark-gray rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-dark-gray rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-dark-gray rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-dark-gray rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-dark-gray rounded w-20"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-near-black">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-dark-gray rounded-full flex items-center justify-center">
                            <span className="text-xs text-text-primary">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              {user.username}
                            </div>
                            <div className="text-xs text-text-muted">
                              {user.email}
                            </div>
                            {user.isAdmin && (
                              <div className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded inline-block mt-1">
                                ADMIN
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.isBanned ? (
                          <span className="text-red-400 text-sm">
                            Banned: {user.banReason || 'No reason'}
                          </span>
                        ) : (
                          <span className="text-green-400 text-sm">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        <div>Messages: {user._count.messages}</div>
                        <div>Servers: {user._count.ownedServers}</div>
                        <div>Last seen: {formatLastSeen(user.lastSeen)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {user.isBanned ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUnbanUser(user.id)}
                            >
                              Unban
                            </Button>
                          ) : (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleBanUser(user.id, user.username)}
                            >
                              Ban
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="text-text-muted">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
