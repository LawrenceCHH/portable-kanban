import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { Card } from '../components/Card';
import { TextBaseBold } from '../components/shared/Text';
import { type Card as CardModel } from 'portable-kanban-core';
import { kanbanActions } from '../store';

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

type Properties = {
  cards: CardModel[];
};

export const ArchiveCards = ({ cards }: Properties) => {
  const restoreCard = kanbanActions.useRestoreCard();
  const deleteCard = kanbanActions.useDeleteCard();
  const navigate = useNavigate();
  const [selectedArchivedCard, setSelectedArchivedCard] = React.useState<CardModel | null>(null);

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
                      if (window.confirm(`Are you sure you want to permanently delete "${c.title}"?`)) {
                        deleteCard(c);
                      }
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
    </>
  );
};
