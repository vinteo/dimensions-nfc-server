/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PadVisualiser from './PadVisualiser.tsx';
import type { NfcStatus, ActiveTagInfo } from '../types.ts';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Sparkles: (props: any) => <div data-testid="icon-sparkles" {...props} />,
  Layers: (props: any) => <div data-testid="icon-layers" {...props} />,
  Radio: (props: any) => <div data-testid="icon-radio" {...props} />,
  Wrench: (props: any) => <div data-testid="icon-wrench" {...props} />,
  Shield: (props: any) => <div data-testid="icon-shield" {...props} />,
}));

describe('PadVisualiser Component', () => {
  const setSelectedPad = vi.fn();
  const getCharacterName = vi.fn((uid) => `CharName-${uid}`);
  const onSelectTag = vi.fn();
  const onOpenCustomiser = vi.fn();

  const defaultProps = {
    status: { connected: false, mode: 'mock' } as NfcStatus,
    selectedPad: 1,
    setSelectedPad,
    activeTags: {
      1: [],
      2: [],
      3: [],
    } as Record<number, ActiveTagInfo[]>,
    ledFlash: {
      1: null,
      2: null,
      3: null,
    } as Record<number, string | null>,
    rippleActive: {
      1: null,
      2: null,
      3: null,
    } as Record<number, 'arrival' | 'departure' | null>,
    getCharacterName,
    onSelectTag,
    onOpenCustomiser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in mock mode with empty zones', () => {
    render(<PadVisualiser {...defaultProps} />);

    expect(screen.getByText('Pad Visualiser')).toBeInTheDocument();
    expect(screen.getByText(/Real-time status of toypad's active zones/)).toBeInTheDocument();
    expect(screen.getByText('Interactive Grid')).toBeInTheDocument();

    // Verify pads are empty
    expect(screen.getByText('Empty Pad')).toBeInTheDocument();
    expect(screen.getAllByText('Empty Zone')).toHaveLength(2); // Left and Right zones

    // Footer info
    expect(screen.getByText('Device Hardware:')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders VID/PID and online status when connected', () => {
    const status: NfcStatus = {
      connected: true,
      mode: 'usb',
      vendorId: '0e6f',
      productId: '0241',
    };
    render(<PadVisualiser {...defaultProps} status={status} />);

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('0e6f:0241')).toBeInTheDocument();
    expect(screen.queryByText('Interactive Grid')).not.toBeInTheDocument();
  });

  it('triggers setSelectedPad when zones are clicked in mock mode', () => {
    render(<PadVisualiser {...defaultProps} />);

    // Click Left Zone (Pad 2)
    const leftZone = screen.getByText('Left Zone').closest('div');
    expect(leftZone).toBeInTheDocument();
    if (leftZone) {
      fireEvent.click(leftZone);
    }
    expect(setSelectedPad).toHaveBeenCalledWith(2);

    // Click Right Zone (Pad 3)
    const rightZone = screen.getByText('Right Zone').closest('div');
    expect(rightZone).toBeInTheDocument();
    if (rightZone) {
      fireEvent.click(rightZone);
    }
    expect(setSelectedPad).toHaveBeenCalledWith(3);
  });

  it('does not trigger setSelectedPad when zones are clicked in non-mock mode', () => {
    const status: NfcStatus = { connected: true, mode: 'usb' };
    render(<PadVisualiser {...defaultProps} status={status} />);

    const leftZone = screen.getByText('Left Zone').closest('div');
    if (leftZone) {
      fireEvent.click(leftZone);
    }
    expect(setSelectedPad).not.toHaveBeenCalled();
  });

  it('renders active tags on pads correctly', () => {
    const activeTags: Record<number, ActiveTagInfo[]> = {
      1: [
        {
          cardId: 'BATMAN',
          readerId: 'mock-reader',
          scannedAt: '2026-05-24T00:00:00Z',
          name: 'Batman',
          arrivalColor: '#22d3ee',
          icon: 'Shield',
          iconType: 'lucide',
        },
      ],
      2: [],
      3: [
        {
          cardId: 'CUSTOM-ID',
          readerId: 'mock-reader',
          scannedAt: '2026-05-24T00:00:00Z',
          name: 'Custom Tag',
          arrivalColor: '#ec4899',
          icon: '/uploads/custom.png',
          iconType: 'custom',
        },
      ],
    };

    render(<PadVisualiser {...defaultProps} activeTags={activeTags} />);

    // Center Pad Tag
    expect(screen.getByText('Batman')).toBeInTheDocument();
    expect(screen.getByText('BATMAN')).toBeInTheDocument();

    // Right Zone Tag
    expect(screen.getByText('Custom Tag')).toBeInTheDocument();
    expect(screen.getByText('CUSTOM-ID')).toBeInTheDocument();

    // Custom PNG icon rendering
    const imgIcon = screen.getByAltText('Custom Tag');
    expect(imgIcon).toBeInTheDocument();
    expect(imgIcon).toHaveAttribute('src', '/uploads/custom.png');

    // Click on Batman tag profile card
    const batmanTagBadge = screen.getByText('Batman').closest('div');
    expect(batmanTagBadge).toBeInTheDocument();
    if (batmanTagBadge) {
      fireEvent.click(batmanTagBadge);
    }
    expect(onSelectTag).toHaveBeenCalledWith('BATMAN');
  });

  it('renders ripple effects and custom LED flash colors', () => {
    const ledFlash = {
      1: '#00ff00',
      2: null,
      3: null,
    };
    const rippleActive: Record<number, 'arrival' | 'departure' | null> = {
      1: null,
      2: 'arrival',
      3: 'departure',
    };

    const { container } = render(
      <PadVisualiser {...defaultProps} ledFlash={ledFlash} rippleActive={rippleActive} />
    );

    // Ripple elements
    const arrivalRipple = container.querySelector('.ripple-green-effect');
    const departureRipple = container.querySelector('.ripple-amber-effect');

    expect(arrivalRipple).toBeInTheDocument();
    expect(departureRipple).toBeInTheDocument();

    // LED glow styling on Pad 1
    const centerPad = screen.getByText('Center Pad (Pad 1)').closest('.rounded-full');
    expect(centerPad).toHaveStyle({
      borderColor: '#00ff00',
      boxShadow: '0 0 18px #00ff0060',
    });
  });

  it('triggers onOpenCustomiser when customiser button is clicked', () => {
    render(<PadVisualiser {...defaultProps} />);

    const customiserButton = screen.getByRole('button', { name: /Open Tag Customiser/ });
    expect(customiserButton).toBeInTheDocument();

    fireEvent.click(customiserButton);
    expect(onOpenCustomiser).toHaveBeenCalledTimes(1);
  });
});
