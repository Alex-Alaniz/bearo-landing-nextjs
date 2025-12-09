import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'white';
  className?: string;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '',
  onClick 
}) => {
  const baseStyles = "px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-transform active:scale-95 duration-200 border-2";
  
  const variants = {
    primary: "bg-bearo-green border-bearo-green text-black hover:bg-white hover:border-white",
    outline: "bg-transparent border-white text-white hover:bg-white hover:text-black",
    white: "bg-white border-white text-black hover:bg-transparent hover:text-white"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};