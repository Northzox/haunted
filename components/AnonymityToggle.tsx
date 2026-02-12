'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';

interface AnonymitySettings {
  isAnonymous: boolean;
  anonymousId?: string;
  onlineVisibility: boolean;
  mediaAutoDownload: boolean;
  messagePreview: boolean;
}

export default function AnonymityToggle() {
  const [settings, setSettings] = useState<AnonymitySettings>({
    isAnonymous: false,
    onlineVisibility: true,
    mediaAutoDownload: true,
    messagePreview: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/user/anonymity');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch anonymity settings:', error);
    }
  };

  const updateAnonymity = async (isAnonymous: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/anonymity', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAnonymous }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.user);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update anonymity settings');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateAnonymousId = async () => {
    if (!confirm('Are you sure you want to generate a new anonymous ID? This will change how you appear to others when anonymous mode is enabled.')) {
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/user/anonymity', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.user);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to regenerate anonymous ID');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const updatePrivacySetting = async (key: keyof AnonymitySettings, value: boolean) => {
    // This would be implemented with a separate API endpoint for privacy settings
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-black border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold text-text-primary mb-6">
        Privacy & Anonymity Settings
      </h2>

      {error && (
        <div className="bg-red-900 border border-red-800 text-red-200 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Anonymous Mode */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Anonymous Mode
            </h3>
            <p className="text-text-muted text-sm">
              When enabled, your real username will be hidden and you'll appear as "{settings.anonymousId || 'Anonymous User'}" to other users.
            </p>
            {settings.isAnonymous && settings.anonymousId && (
              <p className="text-text-secondary text-xs mt-2">
                Current Anonymous ID: <span className="font-mono bg-dark-gray px-2 py-1 rounded">{settings.anonymousId}</span>
              </p>
            )}
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => updateAnonymity(!settings.isAnonymous)}
              disabled={isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray focus:ring-offset-2 focus:ring-offset-black ${
                settings.isAnonymous ? 'bg-gray' : 'bg-dark-gray'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform duration-200 ${
                  settings.isAnonymous ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {settings.isAnonymous && (
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={regenerateAnonymousId}
              loading={isRegenerating}
              disabled={isRegenerating}
              size="sm"
            >
              {isRegenerating ? 'Generating...' : 'Generate New Anonymous ID'}
            </Button>
          </div>
        )}
      </div>

      {/* Privacy Settings */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Privacy Settings
        </h3>

        {/* Online Visibility */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-primary font-medium">Online Status</p>
            <p className="text-text-muted text-sm">
              Show when you're online to other users
            </p>
          </div>
          <button
            type="button"
            onClick={() => updatePrivacySetting('onlineVisibility', !settings.onlineVisibility)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray focus:ring-offset-2 focus:ring-offset-black ${
              settings.onlineVisibility ? 'bg-gray' : 'bg-dark-gray'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform duration-200 ${
                settings.onlineVisibility ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Media Auto Download */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-primary font-medium">Auto-download Media</p>
            <p className="text-text-muted text-sm">
              Automatically download images and videos when they're posted
            </p>
          </div>
          <button
            type="button"
            onClick={() => updatePrivacySetting('mediaAutoDownload', !settings.mediaAutoDownload)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray focus:ring-offset-2 focus:ring-offset-black ${
              settings.mediaAutoDownload ? 'bg-gray' : 'bg-dark-gray'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform duration-200 ${
                settings.mediaAutoDownload ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Message Preview */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-primary font-medium">Message Preview</p>
            <p className="text-text-muted text-sm">
              Show message previews in notifications
            </p>
          </div>
          <button
            type="button"
            onClick={() => updatePrivacySetting('messagePreview', !settings.messagePreview)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray focus:ring-offset-2 focus:ring-offset-black ${
              settings.messagePreview ? 'bg-gray' : 'bg-dark-gray'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform duration-200 ${
                settings.messagePreview ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mt-8 p-4 bg-dark-gray border border-border rounded-md">
        <h4 className="text-text-primary font-medium mb-2">Privacy Notice</h4>
        <ul className="text-text-muted text-sm space-y-1">
          <li>• When anonymous mode is enabled, server administrators can still see your real identity</li>
          <li>• Your anonymous ID is unique to you and will be consistent across servers</li>
          <li>• Changing your anonymous ID will affect how you appear in all past and future messages</li>
          <li>• IP addresses and sensitive information are never visible to other users</li>
          <li>• All data is encrypted in our database for your protection</li>
        </ul>
      </div>
    </div>
  );
}
