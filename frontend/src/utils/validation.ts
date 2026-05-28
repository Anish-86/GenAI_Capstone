export const requiredText = (label: string) => ({
  required: `${label} is mandatory`,
  pattern: {
    value: /^[A-Za-z][A-Za-z\s.'-]*$/,
    message: `${label} should contain text only`,
  },
})

export const requiredEmail = {
  required: 'Email is mandatory',
  pattern: {
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Enter a valid email address',
  },
}

export const optionalPhone = {
  pattern: {
    value: /^[0-9+\-\s()]{7,20}$/,
    message: 'Phone should contain numbers only',
  },
}

export const requiredPassword = {
  required: 'Password is mandatory',
  minLength: {
    value: 6,
    message: 'Password must be at least 6 characters',
  },
}

export const requiredNumber = (label: string, min = 0) => ({
  required: `${label} is mandatory`,
  valueAsNumber: true,
  min: {
    value: min,
    message: `${label} must be ${min > 0 ? `at least ${min}` : 'zero or more'}`,
  },
})
