import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from './Header.tsx';
import type { NfcStatus } from '../types.ts';

describe('Header Component', () => {
  it('renders the correct title and description', () => {
    const mockStatus: NfcStatus = { connected: false, mode: 'mock' };
    render(<Header status={mockStatus} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('LEGO Dimensions Toypad Interface');
    expect(screen.getByText(/Real-time NFC tag monitoring/)).toBeInTheDocument();
  });

  it('renders offline mock status badge correctly', () => {
    const mockStatus: NfcStatus = { connected: false, mode: 'mock' };
    render(<Header status={mockStatus} />);

    const badge = screen.getByText(/Mode: MOCK \(Offline\)/);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-amber-400');
  });

  it('renders connected usb status badge correctly', () => {
    const mockStatus: NfcStatus = { connected: true, mode: 'usb' };
    render(<Header status={mockStatus} />);

    const badge = screen.getByText(/Mode: USB \(Connected\)/);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-cyan-400');
  });
});
