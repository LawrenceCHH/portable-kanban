import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import App from '../../App';
import { actions } from '../../store';
import { createCard, createKanban, createList } from '../helpers';

const KanbanInitializer = ({ kanban, children }: { kanban: ReturnType<typeof createKanban>; children: React.ReactNode }) => {
  const setKanban = actions.useSetKanban();
  React.useEffect(() => {
    setKanban(kanban);
  }, []);
  return <>{children}</>;
};

// Exercises the exact navigation call Header.tsx makes for "Archived cards",
// without fighting the Menu component's icon-only click target in jsdom.
const OpenArchiveCardsButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      type="button"
      onClick={() => navigate('/archive/cards', { state: { backgroundLocation: location } })}
    >
      open-archive-cards
    </button>
  );
};

describe('Board background shortcut does not fire behind Archive Cards overlay', () => {
  it('hover + d on an archived card shows only the archive dialog, not Board\'s', async () => {
    const boardCard = createCard({ id: 'b1', listId: 'l1', title: 'Board Card' });
    const list = createList({ id: 'l1', title: 'Tasks', cards: [boardCard] });
    const archivedCard = createCard({
      id: 'a1',
      title: 'Archived Hover Target',
      archivedFromList: { id: 'l1', title: 'Tasks' },
    });
    const kanban = createKanban({ lists: [list], archive: { lists: [], cards: [archivedCard] } });

    render(
      <Provider>
        <MemoryRouter initialEntries={['/']}>
          <KanbanInitializer kanban={kanban}>
            <OpenArchiveCardsButton />
            <App />
          </KanbanInitializer>
        </MemoryRouter>
      </Provider>,
    );

    await screen.findByText('Board Card');
    fireEvent.click(screen.getByText('open-archive-cards'));

    const archivedCardEl = await screen.findByText('Archived Hover Target');
    const archivedCardContainer = archivedCardEl.closest('[tabindex="0"]')!;
    fireEvent.mouseEnter(archivedCardContainer);

    fireEvent.keyDown(window, { key: 'd' });

    expect(screen.getByText('Delete Archived Card')).toBeInTheDocument();
    expect(screen.queryByText('Delete Card')).not.toBeInTheDocument();
  });
});
