import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { Card } from '../components/Card';
import { TextBaseBold } from '../components/shared/Text';
import { type Card as CardModel } from 'portable-kanban-core';
import { kanbanActions, selectors } from '../store';

const Overlay = styled.div`
  width: 100%;
  height: 100vh;
  position: absolute;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.1);
  top: 0;
`;

const ArchiveMenu = styled.div`
  position: absolute;
  right: 0;
  top: var(--header-height);
  color: var(--text-color);
  background-color: var(--primary-background-color);
  width: var(--list-width);
  height: calc(100vh - var(--header-height));
  padding: 16px;
  overflow-y: scroll;
`;

const ArchiveCard = styled.div``;
const Menus = styled.div`
  display: flex;
`;
const MenuItem = styled.div`
  color: var(--dark-text-color);
  padding-left: 8px;
  padding-bottom: 16px;
  cursor: pointer;
`;

import { ArchivedCardModal } from '../components/ArchivedCardModal';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

type Properties = {
  cards: CardModel[];
};

export const ArchiveCards = ({ cards }: Properties) => {
  const restoreCard = kanbanActions.useRestoreCard();
  const deleteCard = kanbanActions.useDeleteCard();
  const navigate = useNavigate();
  const [selectedArchivedCard, setSelectedArchivedCard] = React.useState<CardModel | null>(null);
  const [cardToDelete, setCardToDelete] = React.useState<CardModel | null>(null);
  const hoveredCardInfo = selectors.useHoveredCard();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal or confirm is open, let it handle its own keys
      if (selectedArchivedCard || cardToDelete) return;

      const activeEl = document.activeElement;
      const isEditingText =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isEditingText) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();

      // Ctrl + d / Cmd + d: directly delete hovered archived card
      if (isCtrlOrCmd && keyLower === 'd') {
        if (hoveredCardInfo) {
          e.preventDefault();
          deleteCard(hoveredCardInfo.card);
        }
        return;
      }

      // d (without Ctrl): open delete confirmation dialog for hovered archived card
      if (!isCtrlOrCmd && !e.altKey && keyLower === 'd') {
        if (hoveredCardInfo) {
          e.preventDefault();
          setCardToDelete(hoveredCardInfo.card);
        }
        return;
      }

      if (e.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArchivedCard, cardToDelete, hoveredCardInfo, deleteCard, navigate]);

  return (
    <>
      <Overlay
        onClick={() => {
          navigate('/');
        }}
      >
        <ArchiveMenu onClick={(e) => e.stopPropagation()}>
          <div style={{ width: '100%', padding: '8px', textAlign: 'center' }}>
            <TextBaseBold>Archive Cards</TextBaseBold>
          </div>
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--dark-text-color)', fontSize: '0.875rem' }}>
              No archived cards
            </div>
          ) : (
            cards.map((c) => (
              <ArchiveCard key={c.id}>
                <Card
                  card={c}
                  isEdit={false}
                  editable={false}
                  onClick={() => {
                    setSelectedArchivedCard(c);
                  }}
                />
                {c.archivedFromList?.title && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--dark-text-color)',
                      marginTop: '-4px',
                      marginBottom: '6px',
                      paddingLeft: '4px',
                    }}
                  >
                    Block: {c.archivedFromList.title}
                  </div>
                )}
                <Menus>
                  <MenuItem
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      restoreCard(c);
                    }}
                  >
                    Restore
                  </MenuItem>
                  <MenuItem
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      setCardToDelete(c);
                    }}
                  >
                    Delete
                  </MenuItem>
                </Menus>
              </ArchiveCard>
            ))
          )}
        </ArchiveMenu>
      </Overlay>

      {selectedArchivedCard && (
        <ArchivedCardModal
          card={selectedArchivedCard}
          onClose={() => setSelectedArchivedCard(null)}
          onRestore={(c) => {
            restoreCard(c);
            setSelectedArchivedCard(null);
          }}
          onDelete={(c) => {
            deleteCard(c);
            setSelectedArchivedCard(null);
          }}
        />
      )}

      {cardToDelete && (
        <ConfirmDialog
          title="Delete Archived Card"
          message={`Are you sure you want to permanently delete "${cardToDelete.title || 'Untitled Card'}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            deleteCard(cardToDelete);
            setCardToDelete(null);
          }}
          onCancel={() => setCardToDelete(null)}
        />
      )}
    </>
  );
};
