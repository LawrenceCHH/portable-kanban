import * as React from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { fromJson } from 'portable-kanban-core';
import { getBackend } from './backend';
import { ArchiveCards } from './pages/ArchiveCards';
import { ArchiveLists } from './pages/ArchiveLists';
import { Board } from './pages/Board';
import { EditCard } from './pages/EditCard';
import { Filter } from './pages/Filter';
import { actions, kanbanActions, selectors, setIsLoadingFromFile } from './store';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10));

const App = () => {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location };
  const navigate = useNavigate();
  const archiveLists = selectors.useArchiveLists();
  const archiveCards = selectors.useArchiveCards();
  const settings = selectors.useSettings();
  const setKanban = actions.useSetKanban();
  const setTitle = actions.useSetTitle();
  const updateSettings = kanbanActions.useUpdateSettings();
  const zoom = clampZoom(settings.zoom ?? 1);

  // Scale the whole UI; --vh/--vw are compensated so 100vh/100vw layouts still fit the viewport.
  React.useEffect(() => {
    const root = document.getElementById('root');
    if (!root) {
      return;
    }
    root.style.setProperty('zoom', String(zoom));
    root.style.setProperty('--vh', `calc(100vh / ${zoom})`);
    root.style.setProperty('--vw', `calc(100vw / ${zoom})`);
  }, [zoom]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) {
        return;
      }
      let next: number | undefined;
      if (e.key === '+' || e.key === '=') {
        next = zoom + ZOOM_STEP;
      } else if (e.key === '-' || e.key === '_') {
        next = zoom - ZOOM_STEP;
      } else if (e.key === '0') {
        next = 1;
      }
      if (next === undefined) {
        return;
      }
      e.preventDefault();
      const clamped = clampZoom(next);
      if (clamped !== zoom) {
        updateSettings({ ...settings, zoom: clamped === 1 ? undefined : clamped });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoom, settings, updateSettings]);

  React.useEffect(() => {
    const onMessage = async (error: MessageEvent<{ type: 'update'; text: string; title: string }>) => {
      const message = error.data;
      switch (message.type) {
        case 'update': {
          const k = await fromJson(message.text);
          setTitle(message.title);
          setIsLoadingFromFile(true);
          setKanban(k);
          setIsLoadingFromFile(false);
        }
      }
    };

    window.addEventListener('message', onMessage);
    navigate('/');
    getBackend().load();
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  return (
    <>
      <Routes location={state?.backgroundLocation ?? location}>
        <Route path="/" element={<Board isBackground={!!state?.backgroundLocation} />} />
      </Routes>
      {(state?.backgroundLocation ?? location.pathname.startsWith('/list')) && (
        <Routes>
          <Route path="/archive/cards" element={<ArchiveCards cards={archiveCards} />} />
          <Route path="/archive/lists" element={<ArchiveLists lists={archiveLists} />} />
          <Route path="/filters" element={<Filter settings={settings} />} />
          <Route path="/list/:listId/card/:cardId" element={<EditCard />} />
        </Routes>
      )}
    </>
  );
};

export default App;
