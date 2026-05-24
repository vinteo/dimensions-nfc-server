import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagSimulator from './TagSimulator.tsx';
import type { NfcStatus } from '../types.ts';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Radio: () => <div data-testid="icon-radio" />,
  Plus: () => <div data-testid="icon-plus" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Wifi: () => <div data-testid="icon-wifi" />,
}));

describe('TagSimulator Component', () => {
  const setSelectedPad = vi.fn();
  const setCustomCardId = vi.fn();
  const handleMockScan = vi.fn();

  const defaultProps = {
    status: { connected: false, mode: 'mock' } as NfcStatus,
    selectedPad: 1,
    setSelectedPad,
    customCardId: '041285A2E23E80',
    setCustomCardId,
    loading: false,
    handleMockScan,
  };

  it('renders simulator-disabled view when mode is not mock', () => {
    const status: NfcStatus = { connected: true, mode: 'usb', vendorId: '0e6f', productId: '0241' };
    render(<TagSimulator {...defaultProps} status={status} />);

    expect(screen.getByText('NFC Tag Simulator')).toBeInTheDocument();
    expect(screen.getByText('Simulator disabled: running in production physical USB mode.')).toBeInTheDocument();
    expect(screen.getByText('Physical Toypad Active')).toBeInTheDocument();
    expect(screen.getByText(/The Express server is claimed by the physical Toypad/)).toBeInTheDocument();

    // Controls should not be present
    expect(screen.queryByText('Target Pad Zone')).not.toBeInTheDocument();
    expect(screen.queryByText('Character Presets')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Card ID (7-Byte Hex or string)')).not.toBeInTheDocument();
  });

  it('renders interactive simulator view when mode is mock', () => {
    render(<TagSimulator {...defaultProps} />);

    expect(screen.getByText('NFC Tag Simulator')).toBeInTheDocument();
    expect(screen.getByText('Use presets or custom codes to mock tag events on the visualiser.')).toBeInTheDocument();

    // Verify Pad Selection Buttons
    expect(screen.getByText('Target Pad Zone')).toBeInTheDocument();
    const pad1Button = screen.getByText('Pad 1 (Center)');
    const pad2Button = screen.getByText('Pad 2 (Left)');
    const pad3Button = screen.getByText('Pad 3 (Right)');

    expect(pad1Button).toBeInTheDocument();
    expect(pad2Button).toBeInTheDocument();
    expect(pad3Button).toBeInTheDocument();

    // Pad 1 is active, should have selected style class
    expect(pad1Button).toHaveClass('bg-purple-950');
    expect(pad2Button).toHaveClass('bg-gray-950');

    // Click Pad 2
    fireEvent.click(pad2Button);
    expect(setSelectedPad).toHaveBeenCalledWith(2);
  });

  it('renders character presets and updates Card ID on click', () => {
    render(<TagSimulator {...defaultProps} />);

    expect(screen.getByText('Character Presets')).toBeInTheDocument();

    // Let's find "Batman" preset button
    const batmanPreset = screen.getByText('Batman').closest('button');
    expect(batmanPreset).toBeInTheDocument();

    if (batmanPreset) {
      fireEvent.click(batmanPreset);
      expect(setCustomCardId).toHaveBeenCalledWith('041285A2E23E80');
    }
  });

  it('handles custom Card ID input change', () => {
    render(<TagSimulator {...defaultProps} />);

    const idInput = screen.getByLabelText('Card ID (7-Byte Hex or string)');
    expect(idInput).toBeInTheDocument();
    expect(idInput).toHaveValue('041285A2E23E80');

    fireEvent.change(idInput, { target: { value: '12345678' } });
    expect(setCustomCardId).toHaveBeenCalledWith('12345678');
  });

  it('triggers mock scan action buttons correctly', () => {
    render(<TagSimulator {...defaultProps} />);

    const placeButton = screen.getByRole('button', { name: /Place Tag/ });
    const removeButton = screen.getByRole('button', { name: /Remove Tag/ });

    expect(placeButton).not.toBeDisabled();
    expect(removeButton).not.toBeDisabled();

    fireEvent.click(placeButton);
    expect(handleMockScan).toHaveBeenCalledWith('041285A2E23E80', 1, 'arrival');

    fireEvent.click(removeButton);
    expect(handleMockScan).toHaveBeenCalledWith('041285A2E23E80', 1, 'departure');
  });

  it('disables action buttons when customCardId is empty', () => {
    render(<TagSimulator {...defaultProps} customCardId="" />);

    const placeButton = screen.getByRole('button', { name: /Place Tag/ });
    const removeButton = screen.getByRole('button', { name: /Remove Tag/ });

    expect(placeButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });

  it('disables action buttons when loading is true', () => {
    render(<TagSimulator {...defaultProps} loading={true} />);

    const placeButton = screen.getByRole('button', { name: /Place Tag/ });
    const removeButton = screen.getByRole('button', { name: /Remove Tag/ });

    expect(placeButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
  });
});
