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

  it('hides labels, due date, tasks, description, and comments behind a single "Card Details" toggle until clicked', async () => {
    const card = createCard({
      id: 'c1',
      title: 'Archived Card 1',
      labels: [{ id: 'l1', title: 'Urgent', color: '#eb5a46' }],
      dueDate: '2026-09-20',
      checkboxes: [{ id: 'cb1', title: 'Do the thing', checked: false }],
      description: 'Some description text',
      comments: [{ id: 'cm1', comment: 'Some comment text' }],
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

    // Everything that Board's card-click view shows starts collapsed
    expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
    expect(screen.queryByText(/Due Date: 2026-09-20/)).not.toBeInTheDocument();
    expect(screen.queryByText('Do the thing')).not.toBeInTheDocument();
    expect(screen.queryByText('Some description text')).not.toBeInTheDocument();
    expect(screen.queryByText('Some comment text')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Card Details'));

    expect(await screen.findByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText(/Due Date: 2026-09-20/)).toBeInTheDocument();
    expect(screen.getByText('Do the thing')).toBeInTheDocument();
    expect(screen.getByText('Some description text')).toBeInTheDocument();
    expect(screen.getByText('Some comment text')).toBeInTheDocument();

    // Clicking again collapses everything back
    fireEvent.click(screen.getByText('Card Details'));

    expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
    expect(screen.queryByText(/Due Date: 2026-09-20/)).not.toBeInTheDocument();
    expect(screen.queryByText('Do the thing')).not.toBeInTheDocument();
    expect(screen.queryByText('Some description text')).not.toBeInTheDocument();
    expect(screen.queryByText('Some comment text')).not.toBeInTheDocument();
  });

  it('shows activity history directly without needing the toggle', () => {
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

    expect(screen.getByText('Activity History (Lifecycle Audit Log)')).toBeInTheDocument();
  });

  it('restores and closes when pressing "r"', () => {
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

    fireEvent.keyDown(window, { key: 'r' });

    expect(onRestore).toHaveBeenCalledWith(card);
    expect(onClose).toHaveBeenCalled();
  });
});
