import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Notifications from './Notifications.tsx';

describe('Notifications Component', () => {
  it('renders nothing when there are no messages', () => {
    const { container } = render(<Notifications errorMsg={null} successMsg={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an error message when errorMsg is provided', () => {
    render(<Notifications errorMsg="This is a test error" successMsg={null} />);
    
    const errorText = screen.getByText('This is a test error');
    expect(errorText).toBeInTheDocument();
    expect(errorText.closest('div')).toHaveClass('text-rose-200');
    expect(screen.queryByText('This is a test success')).not.toBeInTheDocument();
  });

  it('renders a success message when successMsg is provided', () => {
    render(<Notifications errorMsg={null} successMsg="This is a test success" />);
    
    const successText = screen.getByText('This is a test success');
    expect(successText).toBeInTheDocument();
    expect(successText.closest('div')).toHaveClass('text-emerald-200');
    expect(screen.queryByText('This is a test error')).not.toBeInTheDocument();
  });

  it('renders both when both messages are provided', () => {
    render(<Notifications errorMsg="Error message" successMsg="Success message" />);
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });
});
