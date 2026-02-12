import Logo from '@/components/Logo';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Logo size="lg" />
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <Logo size="lg" showText={false} className="mx-auto mb-6" />
            <h1 className="text-5xl font-bold text-text-primary mb-4">
              👁️ Haunted Crd
            </h1>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              A Discord-style platform focused on anonymity, privacy, and pure darkness aesthetic. 
              Communicate freely in the shadows.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Join the Darkness
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Enter Existing Realm
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 border border-border rounded-lg">
              <div className="text-2xl mb-3">🎭</div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Complete Anonymity
              </h3>
              <p className="text-text-muted">
                Mask your identity with anonymous mode. Your privacy is our priority.
              </p>
            </div>
            <div className="p-6 border border-border rounded-lg">
              <div className="text-2xl mb-3">🌑</div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Pure Dark Theme
              </h3>
              <p className="text-text-muted">
                No bright colors, no distractions. Just pure darkness for focused communication.
              </p>
            </div>
            <div className="p-6 border border-border rounded-lg">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Real-time Chat
              </h3>
              <p className="text-text-muted">
                Instant messaging with WebSocket technology. Fast, secure, and reliable.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-text-muted">
            <p>&copy; 2024 Haunted Crd. All rights reserved.</p>
            <p className="mt-2 text-sm">
              Built with Next.js, TypeScript, and pure darkness.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
