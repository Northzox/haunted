import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeMap = {
    sm: { width: 24, height: 24, textSize: 'text-sm' },
    md: { width: 32, height: 32, textSize: 'text-base' },
    lg: { width: 48, height: 48, textSize: 'text-lg' },
  };

  const { width, height, textSize } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Image
          src="/images/logo.png"
          alt="Haunted Crd"
          width={width}
          height={height}
          className="rounded-md"
          style={{
            filter: 'brightness(0.8) contrast(1.2)',
          }}
        />
        {/* Subtle glow effect */}
        <div 
          className="absolute inset-0 rounded-md opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            filter: 'blur(2px)',
          }}
        />
      </div>
      {showText && (
        <div className={`font-bold ${textSize} text-text-primary tracking-wide`}>
          👁️ Haunted Crd
        </div>
      )}
    </div>
  );
}
