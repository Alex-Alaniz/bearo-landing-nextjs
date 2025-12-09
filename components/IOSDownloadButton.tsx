import React from "react";

interface IOSDownloadButtonProps {
  className?: string;
  label?: string;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}

export const IOSDownloadButton: React.FC<IOSDownloadButtonProps> = ({
  className = "",
  label = "Download for iOS",
  variant = "primary",
  onClick,
}) => {
  const baseStyles = "flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm transition-all duration-300 hover:scale-105";

  const variantStyles = {
    primary: "bg-white text-black shadow-[inset_0_0_12px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.3)]",
    secondary: "bg-black/80 text-white border border-white/10 hover:bg-black hover:border-white/20",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <span>{label}</span>
      <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10"/>
      </svg>
    </button>
  );
};
