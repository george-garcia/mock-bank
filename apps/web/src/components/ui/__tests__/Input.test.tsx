import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows error message and styling when error prop is set', () => {
    render(<Input error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toHaveClass('text-danger-600');
    expect(screen.getByRole('textbox')).toHaveClass('border-danger-300');
  });

  it('applies default border styling when no error', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveClass('border-gray-300');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });
});
