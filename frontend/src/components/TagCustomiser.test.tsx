/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TagCustomiser from './TagCustomiser.tsx';
import type { ActiveTagInfo, HistoryEvent } from '../types.ts';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Wrench: (props: any) => <div data-testid="icon-wrench" {...props} />,
  X: (props: any) => <div data-testid="icon-x" {...props} />,
  ExternalLink: (props: any) => <div data-testid="icon-externallink" {...props} />,
  UploadCloud: (props: any) => <div data-testid="icon-uploadcloud" {...props} />,
  Image: (props: any) => <div data-testid="icon-image" {...props} />,
  Shield: (props: any) => <div data-testid="icon-shield" {...props} />,
  Save: (props: any) => <div data-testid="icon-save" {...props} />,
  HelpCircle: (props: any) => <div data-testid="icon-help" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
  Layers: (props: any) => <div data-testid="icon-layers" {...props} />,
}));

describe('TagCustomiser Component', () => {
  const onClose = vi.fn();
  const setSelectedTagId = vi.fn();
  const getCharacterName = vi.fn((uid) => {
    if (uid === 'BATMAN') return 'Batman';
    return uid;
  });
  const showSuccess = vi.fn();
  const showError = vi.fn();

  const activeTags: Record<number, ActiveTagInfo[]> = {
    1: [{ cardId: 'BATMAN', readerId: 'mock-reader', scannedAt: '2026-05-24T00:00:00Z', name: 'Batman', arrivalColor: '#10b981', icon: 'Shield', iconType: 'lucide' }],
    2: [],
    3: [],
  };

  const history: HistoryEvent[] = [
    {
      id: 'evt-1',
      cardId: 'UNKNOWN-ID',
      pad: 1,
      type: 'arrival',
      readerId: 'mock-reader',
      scannedAt: '2026-05-24T00:00:00Z',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose,
    activeTags,
    history,
    selectedTagId: 'BATMAN',
    setSelectedTagId,
    getCharacterName,
    showSuccess,
    showError,
  };

  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);

    // Default fetch mocks
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/nfc/tags') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            BATMAN: {
              name: 'Batman',
              arrivalColor: '#10b981',
              departureColor: '#f59e0b',
              icon: 'Shield',
              iconType: 'lucide',
              webhooks: {
                1: { arrival: 'http://test.url/arr', arrivalPayload: 'testPayload', departure: '', departurePayload: '' },
                2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
                3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
              },
            },
          }),
        });
      }

      if (url === '/api/nfc/tags/BATMAN') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            name: 'Batman',
            arrivalColor: '#10b981',
            departureColor: '#f59e0b',
            icon: 'Shield',
            iconType: 'lucide',
            webhooks: {
              1: { arrival: 'http://test.url/arr', arrivalPayload: 'testPayload', departure: '', departurePayload: '' },
              2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
              3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
            },
          }),
        });
      }

      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Not found' }),
      });
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<TagCustomiser {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders dropdown options from db, activeTags, and history when open', async () => {
    render(<TagCustomiser {...defaultProps} />);

    expect(screen.getByText('Tag Customiser')).toBeInTheDocument();
    expect(screen.getByText('Configure profiles, LED flashes, custom icons, and webhooks.')).toBeInTheDocument();

    // Check dropdown options
    await waitFor(() => {
      const select = screen.getAllByRole('combobox')[0];
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Batman (BATMAN)')).toBeInTheDocument();
      expect(screen.getByText('Tag UNKNOW... (UNKNOWN-ID)')).toBeInTheDocument();
    });
  });

  it('populates fields when selectedTagId changes', async () => {
    render(<TagCustomiser {...defaultProps} />);

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Enter custom nickname...');
      expect(nameInput).toHaveValue('Batman');
    });

    const arrHexInput = screen.getByDisplayValue('#10B981');
    const depHexInput = screen.getByDisplayValue('#F59E0B');

    expect(arrHexInput).toBeInTheDocument();
    expect(depHexInput).toBeInTheDocument();
  });

  it('saves settings successfully on form submit', async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/nfc/tags/BATMAN' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Success' }),
        });
      }
      // Keep GET mocks
      if (url === '/api/nfc/tags') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      if (url === '/api/nfc/tags/BATMAN') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            name: 'Batman',
            arrivalColor: '#10b981',
            departureColor: '#f59e0b',
            icon: 'Shield',
            iconType: 'lucide',
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<TagCustomiser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter custom nickname...')).toHaveValue('Batman');
    });

    const nameInput = screen.getByPlaceholderText('Enter custom nickname...');
    fireEvent.change(nameInput, { target: { value: 'Batman Updated' } });

    const saveButton = screen.getByRole('button', { name: /Save Settings/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/nfc/tags/BATMAN', expect.any(Object));
      expect(showSuccess).toHaveBeenCalledWith('Settings saved for Batman Updated!');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('toggles tabs and allows modifying webhook settings', async () => {
    render(<TagCustomiser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter custom nickname...')).toHaveValue('Batman');
    });

    // Switch to webhooks tab
    const webhooksTabBtn = screen.getByRole('button', { name: 'Pad Webhooks' });
    fireEvent.click(webhooksTabBtn);

    // Verify webhook elements are displayed
    expect(screen.getByText('Pad 1 Webhook Destinations')).toBeInTheDocument();

    const arrivalUrlInput = screen.getByPlaceholderText('e.g. https://api.myweb.com/pad-arrival');
    expect(arrivalUrlInput).toHaveValue('http://test.url/arr');

    const arrivalPayloadInput = screen.getAllByPlaceholderText("Custom value sent in 'payload' field...")[0];
    expect(arrivalPayloadInput).toHaveValue('testPayload');

    // Change input
    fireEvent.change(arrivalUrlInput, { target: { value: 'http://test.url/new-arrival' } });
    expect(arrivalUrlInput).toHaveValue('http://test.url/new-arrival');
  });

  it('handles custom PNG upload option and triggers drag/drop UI', async () => {
    render(<TagCustomiser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter custom nickname...')).toHaveValue('Batman');
    });

    // Select PNG upload mode
    const pngUploadBtn = screen.getByRole('button', { name: 'PNG upload' });
    fireEvent.click(pngUploadBtn);

    // Verify file uploader area exists
    expect(screen.getByText(/Drop transparent/)).toBeInTheDocument();
  });
});
