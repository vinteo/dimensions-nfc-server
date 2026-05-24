import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActivityHistory from './ActivityHistory.tsx';
import type { HistoryEvent } from '../types.ts';

// Mock LucideIcons to keep snapshots/tests robust
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    Radio: () => <div data-testid="icon-radio" />,
    Wifi: () => <div data-testid="icon-wifi" />,
    WifiOff: () => <div data-testid="icon-wifioff" />,
    Trash2: () => <div data-testid="icon-trash" />,
    Globe: () => <div data-testid="icon-globe" />,
    ArrowDownCircle: () => <div data-testid="icon-arrow-down" />,
    ArrowUpCircle: () => <div data-testid="icon-arrow-up" />,
  };
});

describe('ActivityHistory Component', () => {
  const getCharacterName = (uid: string) => `Char-${uid}`;
  const formatDate = (isoString: string) => `Time-${isoString}`;
  const handleClear = vi.fn();
  const onSelectTag = vi.fn();

  it('renders the empty state when history is empty', () => {
    render(
      <ActivityHistory
        history={[]}
        sseConnected={false}
        handleClear={handleClear}
        getCharacterName={getCharacterName}
        formatDate={formatDate}
        onSelectTag={onSelectTag}
      />
    );

    expect(screen.getByText('No tag events recorded yet')).toBeInTheDocument();
    expect(screen.getByText('Disconnected (Retrying)')).toBeInTheDocument();
  });

  it('renders wifi connected badge when sseConnected is true', () => {
    render(
      <ActivityHistory
        history={[]}
        sseConnected={true}
        handleClear={handleClear}
        getCharacterName={getCharacterName}
        formatDate={formatDate}
        onSelectTag={onSelectTag}
      />
    );

    expect(screen.getByText('Live Stream Active')).toBeInTheDocument();
  });

  it('renders a list of history events', () => {
    const mockEvents: HistoryEvent[] = [
      {
        id: 'evt-1',
        cardId: 'BATMAN',
        pad: 1,
        type: 'arrival',
        scannedAt: '2026-05-24T00:00:00.000Z',
        name: 'Batman',
        arrivalColor: '#ff0000',
        departureColor: '#00ff00',
      },
      {
        id: 'evt-2',
        cardId: 'UNKNOWN-ID',
        pad: 2,
        type: 'departure',
        scannedAt: '2026-05-24T00:01:00.000Z',
        arrivalColor: '#ff0000',
        departureColor: '#00ff00',
      }
    ];

    render(
      <ActivityHistory
        history={mockEvents}
        sseConnected={true}
        handleClear={handleClear}
        getCharacterName={getCharacterName}
        formatDate={formatDate}
        onSelectTag={onSelectTag}
      />
    );

    // Verify scan headings
    expect(screen.getByText('Scan Arrival')).toBeInTheDocument();
    expect(screen.getByText('Scan Departure')).toBeInTheDocument();

    // Verify names
    expect(screen.getByText('Batman')).toBeInTheDocument();
    expect(screen.getByText('Char-UNKNOWN-ID')).toBeInTheDocument(); // falls back to getCharacterName for unnamed tags

    // Verify card IDs and pads
    expect(screen.getByText('BATMAN')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN-ID')).toBeInTheDocument();
    expect(screen.getByText('Pad 1 (Center)')).toBeInTheDocument();
    expect(screen.getByText('Pad 2 (Left)')).toBeInTheDocument();
  });

  it('renders webhook status badges correctly', () => {
    const mockEvents: HistoryEvent[] = [
      {
        id: 'evt-1',
        cardId: 'BATMAN',
        pad: 1,
        type: 'arrival',
        scannedAt: '2026-05-24T00:00:00.000Z',
        name: 'Batman',
        webhookUrl: 'http://example.com/webhook',
        webhookStatus: 'pending',
      },
      {
        id: 'evt-2',
        cardId: 'BATMAN',
        pad: 1,
        type: 'departure',
        scannedAt: '2026-05-24T00:00:00.000Z',
        name: 'Batman',
        webhookUrl: 'http://example.com/webhook',
        webhookStatus: 'success',
      },
      {
        id: 'evt-3',
        cardId: 'BATMAN',
        pad: 1,
        type: 'departure',
        scannedAt: '2026-05-24T00:00:00.000Z',
        name: 'Batman',
        webhookUrl: 'http://example.com/webhook',
        webhookStatus: 'failed',
      }
    ];

    render(
      <ActivityHistory
        history={mockEvents}
        sseConnected={true}
        handleClear={handleClear}
        getCharacterName={getCharacterName}
        formatDate={formatDate}
        onSelectTag={onSelectTag}
      />
    );

    expect(screen.getByText('Calling: http://example.com/webhook')).toBeInTheDocument();
    expect(screen.getByText('Dispatched: http://example.com/webhook')).toBeInTheDocument();
    expect(screen.getByText('Failed: http://example.com/webhook')).toBeInTheDocument();
  });

  it('calls handleClear when trash icon is clicked', () => {
    render(
      <ActivityHistory
        history={[]}
        sseConnected={true}
        handleClear={handleClear}
        getCharacterName={getCharacterName}
        formatDate={formatDate}
        onSelectTag={onSelectTag}
      />
    );

    const clearBtn = screen.getByTitle('Clear scan history');
    fireEvent.click(clearBtn);

    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectTag when a history item is clicked', () => {
    const mockEvents: HistoryEvent[] = [
      {
        id: 'evt-1',
        cardId: 'BATMAN',
        pad: 1,
        type: 'arrival',
        scannedAt: '2026-05-24T00:00:00.000Z',
        name: 'Batman',
      }
    ];

    render(
      <ActivityHistory
        history={mockEvents}
        sseConnected={true}
        handleClear={handleClear}
        getCharacterName={getCharacterName}
        formatDate={formatDate}
        onSelectTag={onSelectTag}
      />
    );

    const historyItem = screen.getByText('Batman').closest('div');
    expect(historyItem).toBeInTheDocument();
    
    if (historyItem) {
      fireEvent.click(historyItem);
    }
    
    expect(onSelectTag).toHaveBeenCalledWith('BATMAN');
  });
});
