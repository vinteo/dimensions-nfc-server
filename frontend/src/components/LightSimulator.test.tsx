import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LightSimulator from './LightSimulator.tsx';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Trash2: () => <div data-testid="icon-trash" />,
}));

describe('LightSimulator Component', () => {
  const setLightPads = vi.fn();
  const setLightColor = vi.fn();
  const setEnableFlashing = vi.fn();
  const setFlashCount = vi.fn();
  const setFlashDuration = vi.fn();
  const handleApplyLight = vi.fn();
  const handleTurnOffLight = vi.fn();

  const defaultProps = {
    lightPads: [1],
    setLightPads,
    lightColor: '#ff0000',
    setLightColor,
    enableFlashing: false,
    setEnableFlashing,
    flashCount: 3,
    setFlashCount,
    flashDuration: 500,
    setFlashDuration,
    handleApplyLight,
    handleTurnOffLight,
  };

  it('renders target zones and highlights the selected pad zone', () => {
    render(<LightSimulator {...defaultProps} />);

    expect(screen.getByText('Pad Light Simulator')).toBeInTheDocument();
    expect(screen.getByText('Target Zones')).toBeInTheDocument();

    const pad1Button = screen.getByRole('button', { name: 'Pad 1' });
    const pad2Button = screen.getByRole('button', { name: 'Pad 2' });
    const pad3Button = screen.getByRole('button', { name: 'Pad 3' });

    expect(pad1Button).toBeInTheDocument();
    expect(pad2Button).toBeInTheDocument();
    expect(pad3Button).toBeInTheDocument();

    // Pad 1 is selected in props, should have select classes
    expect(pad1Button).toHaveClass('bg-purple-950');
    expect(pad2Button).toHaveClass('bg-gray-900');
  });

  it('toggles pad selection when pad buttons are clicked', () => {
    render(<LightSimulator {...defaultProps} />);

    const pad1Button = screen.getByRole('button', { name: 'Pad 1' });
    const pad2Button = screen.getByRole('button', { name: 'Pad 2' });

    // Click selected Pad 1 to de-select
    fireEvent.click(pad1Button);
    expect(setLightPads).toHaveBeenCalledWith([]);

    // Click unselected Pad 2 to select
    fireEvent.click(pad2Button);
    expect(setLightPads).toHaveBeenCalledWith([1, 2]);
  });

  it('handles custom color wheel input change', () => {
    render(<LightSimulator {...defaultProps} />);

    const colorPicker = screen.getByTitle('Choose custom color from wheel');
    expect(colorPicker).toBeInTheDocument();
    expect(colorPicker).toHaveValue('#ff0000');

    fireEvent.change(colorPicker, { target: { value: '#00ff00' } });
    expect(setLightColor).toHaveBeenCalledWith('#00ff00');
  });

  it('renders preset swatches and triggers color change on click', () => {
    render(<LightSimulator {...defaultProps} />);

    expect(screen.getByText('Preset Swatches')).toBeInTheDocument();

    // Find custom/preset buttons (presets have titles from COLOR_PRESETS)
    // Let's click a preset swatch like "Cyan" or "Magenta"
    // Since color presets are exported from constants.js, let's find buttons by title
    // Let's verify by picking the first one
    const redPreset = screen.getByTitle('Crimson Red');
    expect(redPreset).toBeInTheDocument();
    
    fireEvent.click(redPreset);
    expect(setLightColor).toHaveBeenCalledWith('#ef4444');
  });

  it('handles enable flashing toggle click', () => {
    render(<LightSimulator {...defaultProps} />);

    const toggleButton = screen.getByText('Enable Flashing').closest('div')?.nextSibling as HTMLButtonElement;
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(setEnableFlashing).toHaveBeenCalledWith(true);
  });

  it('renders flashing input fields only when enableFlashing is true', () => {
    const { rerender } = render(<LightSimulator {...defaultProps} enableFlashing={false} />);

    expect(screen.queryByLabelText('Flash Count')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Duration (ms)')).not.toBeInTheDocument();

    rerender(<LightSimulator {...defaultProps} enableFlashing={true} />);

    const countInput = screen.getByLabelText('Flash Count');
    const durationInput = screen.getByLabelText('Duration (ms)');

    expect(countInput).toBeInTheDocument();
    expect(countInput).toHaveValue(3);

    expect(durationInput).toBeInTheDocument();
    expect(durationInput).toHaveValue(500);

    // Test changing values
    fireEvent.change(countInput, { target: { value: '5' } });
    expect(setFlashCount).toHaveBeenCalledWith(5);

    fireEvent.change(durationInput, { target: { value: '800' } });
    expect(setFlashDuration).toHaveBeenCalledWith(800);
  });

  it('triggers action buttons successfully', () => {
    render(<LightSimulator {...defaultProps} />);

    const applyButton = screen.getByRole('button', { name: /Apply Light/ });
    const offButton = screen.getByRole('button', { name: /Turn Off/ });

    fireEvent.click(applyButton);
    expect(handleApplyLight).toHaveBeenCalledTimes(1);

    fireEvent.click(offButton);
    expect(handleTurnOffLight).toHaveBeenCalledTimes(1);
  });
});
