'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface ReportButtonProps {
  targetId: string;
  targetType: 'USER' | 'MESSAGE' | 'SERVER' | 'CHANNEL';
  targetName?: string;
  onReportSubmitted?: () => void;
}

export default function ReportButton({ 
  targetId, 
  targetType, 
  targetName,
  onReportSubmitted 
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for the report');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: targetType,
          targetId,
          reason: reason.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setReason('');
        setDescription('');
        setIsOpen(false);
        onReportSubmitted?.();
        
        // Close success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to submit report');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'USER': return 'User';
      case 'MESSAGE': return 'Message';
      case 'SERVER': return 'Server';
      case 'CHANNEL': return 'Channel';
      default: return 'Content';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-text-muted hover:text-text-secondary"
      >
        🚨 Report
      </Button>

      {/* Report Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-black border border-border rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Report {getTargetTypeLabel()}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            {targetName && (
              <div className="mb-4 p-3 bg-dark-gray rounded">
                <p className="text-sm text-text-muted">
                  Reporting: {targetName}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-900 border border-red-800 text-red-200 px-4 py-3 rounded-md mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-900 border border-green-800 text-green-200 px-4 py-3 rounded-md mb-4">
                Report submitted successfully. Thank you for helping keep our community safe.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Reason for Report *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please describe why you are reporting this content..."
                  className="w-full px-3 py-2 bg-black border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-gray resize-none"
                  rows={3}
                  required
                  maxLength={500}
                />
                <div className="text-xs text-text-muted mt-1">
                  {reason.length}/500 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any additional context or details that might help us review this report..."
                  className="w-full px-3 py-2 bg-black border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-gray resize-none"
                  rows={4}
                  maxLength={1000}
                />
                <div className="text-xs text-text-muted mt-1">
                  {description.length}/1000 characters
                </div>
              </div>

              <div className="bg-dark-gray border border-border rounded p-3">
                <h4 className="text-sm font-medium text-text-primary mb-2">
                  Report Guidelines:
                </h4>
                <ul className="text-xs text-text-muted space-y-1">
                  <li>• Be specific and provide as much detail as possible</li>
                  <li>• Include relevant timestamps or message IDs when applicable</li>
                  <li>• Report only serious violations (spam, harassment, illegal content, etc.)</li>
                  <li>• False reports may result in action against your account</li>
                  <li>• We will review your report and take appropriate action</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={isSubmitting || !reason.trim()}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
