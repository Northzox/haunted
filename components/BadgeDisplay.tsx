'use client';

import { useState, useEffect } from 'react';

interface Badge {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isSystem: boolean;
  isEarned: boolean;
  isActive: boolean;
}

interface BadgeDisplayProps {
  userId?: string;
  showUnearned?: boolean;
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function BadgeDisplay({ 
  userId, 
  showUnearned = false, 
  maxDisplay = 8,
  size = 'md'
}: BadgeDisplayProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    try {
      const response = await fetch('/api/badges');
      if (response.ok) {
        const data = await response.json();
        setBadges(data.badges);
      }
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const filteredBadges = badges.filter(badge => 
    showUnearned || badge.isEarned
  ).slice(0, maxDisplay);

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`${sizeClasses[size]} bg-dark-gray border border-border rounded-full animate-pulse`}
          />
        ))}
      </div>
    );
  }

  if (filteredBadges.length === 0) {
    return (
      <div className="text-text-muted text-sm">
        No badges earned yet
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filteredBadges.map((badge) => (
        <div
          key={badge.id}
          className={`relative group ${sizeClasses[size]} ${
            badge.isEarned && badge.isActive 
              ? 'bg-gray border-gray' 
              : badge.isEarned 
                ? 'bg-dark-gray border-border' 
                : 'bg-black border-border opacity-50'
          } border rounded-full flex items-center justify-center transition-all duration-200`}
          style={{
            backgroundColor: badge.isEarned && badge.isActive ? badge.color : undefined,
          }}
          title={`${badge.name}${badge.description ? ` - ${badge.description}` : ''}`}
        >
          <span className="font-bold">
            {badge.icon || '🏆'}
          </span>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-border rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <div className="font-medium">{badge.name}</div>
            {badge.description && (
              <div className="text-text-muted">{badge.description}</div>
            )}
            {!badge.isEarned && (
              <div className="text-red-400 text-xs">Not earned</div>
            )}
          </div>
        </div>
      ))}
      
      {badges.length > maxDisplay && (
        <div className="flex items-center">
          <div className={`${sizeClasses[size]} bg-dark-gray border border-border rounded-full flex items-center justify-center`}>
            <span className="text-xs text-text-muted">+{badges.length - maxDisplay}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Badge Component
export function Badge({ 
  badge, 
  size = 'md',
  showTooltip = true 
}: { 
  badge: Badge; 
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div
      className={`relative group ${sizeClasses[size]} ${
        badge.isEarned && badge.isActive 
          ? 'bg-gray border-gray' 
          : badge.isEarned 
            ? 'bg-dark-gray border-border' 
            : 'bg-black border-border opacity-50'
      } border rounded-full flex items-center justify-center transition-all duration-200`}
      style={{
        backgroundColor: badge.isEarned && badge.isActive ? badge.color : undefined,
      }}
    >
      <span className="font-bold">
        {badge.icon || '🏆'}
      </span>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-border rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          <div className="font-medium">{badge.name}</div>
          {badge.description && (
            <div className="text-text-muted">{badge.description}</div>
          )}
          {!badge.isEarned && (
            <div className="text-red-400 text-xs">Not earned</div>
          )}
        </div>
      )}
    </div>
  );
}
