import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { classNames } from '@/utils/formatters';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
}

const variantStyles = {
    primary:
        'gradient-btn text-white shadow-lg shadow-primary-500/20',
    secondary:
        'bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-primary-500/50 shadow-lg',
    outline:
        'border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 hover:border-primary-500/50',
    ghost:
        'text-gray-400 hover:bg-white/5 hover:text-white',
    danger:
        'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]',
};

const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            icon,
            iconPosition = 'left',
            children,
            className,
            disabled,
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        return (
            <button
                ref={ref}
                disabled={isDisabled}
                className={classNames(
                    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                {...props}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    icon && iconPosition === 'left' && icon
                )}
                {children}
                {!loading && icon && iconPosition === 'right' && icon}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
