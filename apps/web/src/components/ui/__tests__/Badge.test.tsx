import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default')).toHaveClass('bg-gray-100');
  });

  it('applies success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('bg-success-100', 'text-success-600');
  });

  it('applies danger variant', () => {
    render(<Badge variant="danger">Danger</Badge>);
    expect(screen.getByText('Danger')).toHaveClass('bg-danger-100', 'text-danger-600');
  });

  it('applies warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning')).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('applies info variant', () => {
    render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText('Info')).toHaveClass('bg-bank-100', 'text-bank-700');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    expect(screen.getByText('Custom')).toHaveClass('custom-badge');
  });
});
