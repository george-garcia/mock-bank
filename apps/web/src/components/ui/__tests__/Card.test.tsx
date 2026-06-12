import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from '../Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Card ref={ref}>Ref Test</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardHeader', () => {
  it('renders with border styling', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toHaveClass('border-b');
  });
});

describe('CardTitle', () => {
  it('renders as h3 with correct styling', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveTextContent('Title');
    expect(title).toHaveClass('font-semibold');
  });
});

describe('CardContent', () => {
  it('renders children with padding', () => {
    render(<CardContent>Body</CardContent>);
    expect(screen.getByText('Body')).toHaveClass('px-6', 'py-4');
  });
});
