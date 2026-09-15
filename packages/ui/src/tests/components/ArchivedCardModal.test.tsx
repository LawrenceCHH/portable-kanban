import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { ArchivedCardModal } from '../../components/ArchivedCardModal';
import { createCard } from '../helpers';

describe('ArchivedCardModal', () => {
  it('shows confirmation dialog when clicking Delete button', async () => {
    const card = createCard({
      id: 'c1',
      title: 'Archived Card 1',
      archivedAt: '2026-09-12T00:00:00.000Z',
    });
    const onClose = vi.fn();
    const onRestore = vi.fn();
    const onDelete = vi.fn();

    render(
      <ArchivedCardModal
        card={card}
        onClose={onClose}
        onRestore={onRestore}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('Archived Card 1')).toBeInTheDocument();
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    // Confirm dialog should appear
    expect(screen.getByText('Delete Archived Card')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to permanently delete/i)).toBeInTheDocument();

    // Not deleted yet
    expect(onDelete).not.toHaveBeenCalled();

    // Confirm deletion inside the dialog
    const confirmButtons = screen.getAllByRole('button', { name: /Delete/i });
    const modalDeleteBtn = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(modalDeleteBtn);

    expect(onDelete).toHaveBeenCalledWith(card);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows confirmation dialog when pressing "d"', async () => {
    const card = createCard({
      id: 'c1',
      title: 'Archived Card 1',
    });
    const onClose = vi.fn();
    const onRestore = vi.fn();
    const onDelete = vi.fn();

    render(
      <ArchivedCardModal
        card={card}
        onClose={onClose}
        onRestore={onRestore}
        onDelete={onDelete}
      />,
    );

    // Press 'd'
    fireEvent.keyDown(window, { key: 'd' });

    expect(screen.getByText('Delete Archived Card')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    // Cancel deletion
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Delete Archived Card')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('directly deletes without confirmation when pressing Ctrl+d', async () => {
    const card = createCard({
      id: 'c1',
      title: 'Direct Delete Card',
    });
    const onClose = vi.fn();
    const onRestore = vi.fn();
    const onDelete = vi.fn();

    render(
      <ArchivedCardModal
        card={card}
        onClose={onClose}
        onRestore={onRestore}
        onDelete={onDelete}
      />,
    );

    // Press Ctrl + d
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });

    // Should immediately call onDelete and onClose without showing confirmation
    expect(onDelete).toHaveBeenCalledWith(card);
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText('Delete Archived Card')).not.toBeInTheDocument();
  });

  it('hides the card details behind a collapsible toggle until clicked', async () => {
    const card = createCard({
      id: 'c1',
      title: 'Archived Card 1',
      description: 'Some description text',
    });
    const onClose = vi.fn();
    const onRestore = vi.fn();
    const onDelete = vi.fn();

    render(
      <ArchivedCardModal
        card={card}
        onClose={onClose}
        onRestore={onRestore}
        onDelete={onDelete}
      />,
    );

    // Description is part of the card content and starts collapsed
    expect(screen.queryByText('Some description text')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Card Details'));

    expect(await screen.findByText('Some description text')).toBeInTheDocument();

    // Clicking again collapses it back
    fireEvent.click(screen.getByText('Card Details'));

    expect(screen.queryByText('Some description text')).not.toBeInTheDocument();
  });
});
