import toast from 'react-hot-toast';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Display validation errors to the user
 */
export const displayValidationErrors = (errors: ValidationError[] | Record<string, string[]>) => {
  if (Array.isArray(errors)) {
    errors.forEach((error) => {
      toast.error(`${error.field}: ${error.message}`);
    });
  } else {
    Object.entries(errors).forEach(([field, messages]) => {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      if (Array.isArray(messages)) {
        messages.forEach((message) => {
          toast.error(`${fieldName}: ${message}`);
        });
      } else {
        toast.error(`${fieldName}: ${messages}`);
      }
    });
  }
};

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Password validation
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else {
    if (password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one number' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Phone number validation
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!phone) {
    errors.push({ field: 'phone', message: 'Phone number is required' });
  } else {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length < 10) {
      errors.push({ field: 'phone', message: 'Phone number must be at least 10 digits' });
    } else if (digitsOnly.length > 15) {
      errors.push({ field: 'phone', message: 'Phone number cannot exceed 15 digits' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Required field validation
 */
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!value || (typeof value === 'string' && !value.trim())) {
    errors.push({ field: fieldName, message: `${fieldName} is required` });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Number range validation
 */
export const validateNumberRange = (
  value: number,
  fieldName: string,
  min?: number,
  max?: number
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (isNaN(value)) {
    errors.push({ field: fieldName, message: `${fieldName} must be a valid number` });
  } else {
    if (min !== undefined && value < min) {
      errors.push({ field: fieldName, message: `${fieldName} must be at least ${min}` });
    }
    if (max !== undefined && value > max) {
      errors.push({ field: fieldName, message: `${fieldName} cannot exceed ${max}` });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Combine multiple validation results
 */
export const combineValidationResults = (...results: ValidationResult[]): ValidationResult => {
  const allErrors = results.flatMap((result) => result.errors);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
};

/**
 * Get error message for a specific field
 */
export const getFieldError = (errors: ValidationError[], fieldName: string): string | null => {
  const error = errors.find((e) => e.field === fieldName);
  return error ? error.message : null;
};

/**
 * Check if a field has an error
 */
export const hasFieldError = (errors: ValidationError[], fieldName: string): boolean => {
  return errors.some((e) => e.field === fieldName);
};
