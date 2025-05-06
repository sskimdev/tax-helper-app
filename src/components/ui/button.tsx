import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary';
}

export function Button({ children, className, variant = 'default', ...props }: ButtonProps) {
  const baseStyles = "px-4 py-2 rounded-md font-medium";
  
  const variantStyles = {
    default: "bg-blue-500 text-white hover:bg-blue-600",
    outline: "border border-gray-300 hover:bg-gray-100",
    secondary: "bg-gray-200 hover:bg-gray-300"
  };
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles[variant]} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
}
