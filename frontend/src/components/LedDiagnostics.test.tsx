import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LedDiagnostics from './LedDiagnostics.tsx';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Lightbulb: () => <div data-testid="icon-lightbulb" />,
}));

describe('LedDiagnostics Component', () => {
  const mockGetColorName = vi.fn((hex: string | null) => {
    if (hex === '#ff0000') return 'RED';
    if (hex === '#00ff00') return 'GREEN';
    if (hex === '#0000ff') return 'BLUE';
    return 'UNKNOWN';
  });

  it('renders correctly with default off states', () => {
    const ledFlash: Record<number, string | null> = {
      1: null,
      2: null,
      3: null,
    };

    render(<LedDiagnostics ledFlash={ledFlash} getColorName={mockGetColorName} />);

    // Header title and description
    expect(screen.getByText('Pad Light Visualiser')).toBeInTheDocument();
    expect(screen.getByText(/Flashing LEDs indicate hardware events/)).toBeInTheDocument();

    // Verify pad zones are OFF
    expect(screen.getByText('Center color')).toBeInTheDocument();
    expect(screen.getByText('Left color')).toBeInTheDocument();
    expect(screen.getByText('Right color')).toBeInTheDocument();

    const offIndicators = screen.getAllByText('OFF');
    expect(offIndicators).toHaveLength(3);
  });

  it('renders flashing pads with custom colors correctly', () => {
    const ledFlash: Record<number, string | null> = {
      1: '#ff0000', // Center is RED
      2: null,      // Left is OFF
      3: '#00ff00', // Right is GREEN
    };

    const { container } = render(
      <LedDiagnostics ledFlash={ledFlash} getColorName={mockGetColorName} />
    );

    // Verify getColorName calls
    expect(mockGetColorName).toHaveBeenCalledWith('#ff0000');
    expect(mockGetColorName).toHaveBeenCalledWith('#00ff00');

    // RED and GREEN badges
    expect(screen.getByText('RED')).toBeInTheDocument();
    expect(screen.getByText('GREEN')).toBeInTheDocument();

    // Left should still be OFF
    const offIndicators = screen.getAllByText('OFF');
    expect(offIndicators).toHaveLength(1);

    // Verify style/pulse animations for active colors
    // In our component, active colors add styles like:
    // backgroundColor: ledFlash[1],
    // boxShadow: `0 0 10px ${ledFlash[1]}`
    // And also has class 'animate-pulse'

    const indicators = container.querySelectorAll('.rounded-full');
    expect(indicators).toHaveLength(3);

    // Indicator 1 (Center): should have #ff0000 bg
    const centerIndicator = indicators[0] as HTMLSpanElement;
    expect(centerIndicator.style.backgroundColor).toBe('#ff0000');
    expect(centerIndicator.style.boxShadow).toBe('0 0 10px #ff0000');
    expect(centerIndicator).toHaveClass('animate-pulse');

    // Indicator 2 (Left): should have default classes and no custom background style
    const leftIndicator = indicators[1] as HTMLSpanElement;
    expect(leftIndicator.style.backgroundColor).toBe('');
    expect(leftIndicator).toHaveClass('bg-gray-800');
    expect(leftIndicator).not.toHaveClass('animate-pulse');

    // Indicator 3 (Right): should have #00ff00 bg
    const rightIndicator = indicators[2] as HTMLSpanElement;
    expect(rightIndicator.style.backgroundColor).toBe('#00ff00');
    expect(rightIndicator.style.boxShadow).toBe('0 0 10px #00ff00');
    expect(rightIndicator).toHaveClass('animate-pulse');
  });
});
