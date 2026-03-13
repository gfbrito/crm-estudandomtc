import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { classNames } from '@/utils/formatters';

interface BaseFieldProps {
    label?: string;
    error?: string;
    hint?: string;
}

interface InputProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> { }

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, className, ...props }, ref) => {
        return (
            <div className="space-y-1">
                {label && (
                    <label className="block text-sm font-semibold tracking-wide text-gray-300 mb-1.5">
                        {label}
                        {props.required && <span className="text-red-500 ml-1.5">*</span>}
                    </label>
                )}
                <input
                    ref={ref}
                    className={classNames(
                        'w-full px-4 py-3 rounded-xl border text-white bg-dark-900/50 shadow-inner overflow-hidden transition-all duration-300 font-medium',
                        error
                            ? 'border-red-500/50 focus:ring-red-500/50 bg-red-500/5'
                            : 'border-white/10 hover:border-white/20 focus:border-primary-500/50 focus:ring-primary-500/30',
                        'focus:outline-none focus:ring-4',
                        'placeholder:text-gray-600',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-dark-800 disabled:border-white/5',
                        className
                    )}
                    {...props}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                {hint && !error && (
                    <p className="text-sm text-gray-400">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

interface TextareaProps extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> { }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, hint, className, ...props }, ref) => {
        return (
            <div className="space-y-1">
                {label && (
                    <label className="block text-sm font-semibold tracking-wide text-gray-300 mb-1.5">
                        {label}
                        {props.required && <span className="text-red-500 ml-1.5">*</span>}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={classNames(
                        'w-full px-4 py-3 rounded-xl border text-white bg-dark-900/50 shadow-inner overflow-hidden transition-all duration-300 resize-none font-medium',
                        error
                            ? 'border-red-500/50 focus:ring-red-500/50 bg-red-500/5'
                            : 'border-white/10 hover:border-white/20 focus:border-primary-500/50 focus:ring-primary-500/30',
                        'focus:outline-none focus:ring-4',
                        'placeholder:text-gray-600',
                        className
                    )}
                    {...props}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                {hint && !error && (
                    <p className="text-sm text-gray-400">{hint}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends BaseFieldProps, SelectHTMLAttributes<HTMLSelectElement> {
    options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, hint, options, className, ...props }, ref) => {
        return (
            <div className="space-y-1">
                {label && (
                    <label className="block text-sm font-semibold tracking-wide text-gray-300 mb-1.5">
                        {label}
                        {props.required && <span className="text-red-500 ml-1.5">*</span>}
                    </label>
                )}
                <select
                    ref={ref}
                    className={classNames(
                        'w-full px-4 py-3 rounded-xl border text-white bg-dark-900/50 shadow-inner overflow-hidden transition-all duration-300 font-medium appearance-none',
                        error
                            ? 'border-red-500/50 focus:ring-red-500/50 bg-red-500/5'
                            : 'border-white/10 hover:border-white/20 focus:border-primary-500/50 focus:ring-primary-500/30',
                        'focus:outline-none focus:ring-4',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-dark-800 disabled:border-white/5',
                        className
                    )}
                    {...props}
                >
                    <option value="">Selecione...</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {hint && !error && (
                    <p className="text-sm text-gray-400">{hint}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, className, ...props }, ref) => {
        return (
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    ref={ref}
                    type="checkbox"
                    className={classNames(
                        'w-5 h-5 rounded border-white/10 text-primary-500 focus:ring-primary-500/30 focus:ring-2',
                        'bg-dark-900/50 checked:bg-primary-500 checked:border-primary-500 transition-all',
                        className
                    )}
                    {...props}
                />
                <span className="text-sm font-medium text-gray-300">{label}</span>
            </label>
        );
    }
);

Checkbox.displayName = 'Checkbox';
