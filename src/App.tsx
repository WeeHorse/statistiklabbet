import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

type ValueItem = {
  id: number;
  value: number;
};

type StatsSummary = {
  mean: number | null;
  median: number | null;
  mode: number[];
  range: number | null;
  sortedValues: number[];
};

type PageId = 'lagesmatt' | 'diagram' | 'kombinatorik';

const pages: Array<{ id: PageId; label: string; }> = [
  { id: 'lagesmatt', label: 'Lägesmått' },
  { id: 'diagram', label: 'Diagram' },
  { id: 'kombinatorik', label: 'Kombinatorik' },
];

const formatNumber = (value: number) => {
  const fixedValue = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return fixedValue.replace('.', ',').replace(/,00$/, '');
};

const calculateStats = (values: number[]): StatsSummary => {
  if (values.length === 0) {
    return {
      mean: null,
      median: null,
      mode: [],
      range: null,
      sortedValues: [],
    };
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const total = values.reduce((sum, value) => sum + value, 0);
  const mean = total / values.length;
  const middleIndex = Math.floor(sortedValues.length / 2);
  const median =
    sortedValues.length % 2 === 0
      ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
      : sortedValues[middleIndex];

  const frequencies = new Map<number, number>();
  for (const value of values) {
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  }

  const highestFrequency = Math.max(...frequencies.values());
  const mode =
    highestFrequency > 1
      ? [...frequencies.entries()]
        .filter(([, frequency]) => frequency === highestFrequency)
        .map(([value]) => value)
        .sort((left, right) => left - right)
      : [];

  return {
    mean,
    median,
    mode,
    range: sortedValues[sortedValues.length - 1] - sortedValues[0],
    sortedValues,
  };
};

function App() {
  const [items, setItems] = useState<ValueItem[]>([
    { id: 1, value: 4 },
    { id: 2, value: 7 },
    { id: 3, value: 7 },
    { id: 4, value: 10 },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [trashActive, setTrashActive] = useState(false);
  const [nextId, setNextId] = useState(5);
  const [currentPage, setCurrentPage] = useState<PageId>('lagesmatt');

  const stats = useMemo(
    () => calculateStats(items.map((item) => item.value)),
    [items],
  );
  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.value - right.value || left.id - right.id),
    [items],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedValue = inputValue.trim().replace(',', '.');
    if (!normalizedValue) {
      return;
    }

    const parsedValue = Number(normalizedValue);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    setItems((currentItems) => [...currentItems, { id: nextId, value: parsedValue }]);
    setNextId((currentId) => currentId + 1);
    setInputValue('');
  };

  const removeDraggedItem = () => {
    if (draggedId === null) {
      return;
    }

    setItems((currentItems) => currentItems.filter((item) => item.id !== draggedId));
    setDraggedId(null);
    setTrashActive(false);
  };

  const clearDragState = () => {
    setDraggedId(null);
    setTrashActive(false);
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="hero-copy-layout">
            <div className="hero-title-group">
              <h1 className="hero-title">Statistiklabbet</h1>
            </div>

            <nav className="page-menu" aria-label="Sidor i statistiklabbet">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={`page-menu-item${currentPage === page.id ? ' active' : ''}`}
                  onClick={() => setCurrentPage(page.id)}
                >
                  {page.label}
                </button>
              ))}
            </nav>

            <p className="intro hero-intro">
              Mata in tal ett i taget. Klossarna ordnas automatiskt från minsta till
              största, och ni kan dra dem till papperskorgen när ni vill ta bort ett
              värde.
            </p>
          </div>
        </div>

        {currentPage === 'lagesmatt' ? (
          <form className="value-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="value-input">
              Lägg till ett värde
            </label>
            <div className="field-row">
              <input
                id="value-input"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Till exempel 8 eller 8,5"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
              />
              <button type="submit">Lägg till</button>
            </div>
            <p className="field-help">Tips: både komma och punkt fungerar.</p>
          </form>
        ) : currentPage === 'diagram' ? (
          <section className="value-form page-intro-card">
            <p className="field-label">Diagram</p>
            <h2>Här bygger vi nästa steg</h2>
            <p className="page-intro-text">
              Den här sidan kan senare visa samma värden som stolpdiagram,
              linjediagram eller cirkeldiagram.
            </p>
          </section>
        ) : (
          <section className="value-form page-intro-card">
            <p className="field-label">Kombinatorik</p>
            <h2>En egen övningsyta</h2>
            <p className="page-intro-text">
              Här kan vi senare bygga uppgifter där man räknar olika möjliga val,
              ordningar och kombinationer.
            </p>
          </section>
        )}
      </section>

      {currentPage === 'lagesmatt' ? (
        <section className="workspace-panel">
          <div className="board-card">
            <div className="section-heading">
              <div>
                <h2>Värden</h2>
                <p>De visas alltid från minsta till största.</p>
              </div>
              <span className="pill">{items.length} värden</span>
            </div>

            <div className="block-row" aria-label="Lista med värden">
              {items.length === 0 ? (
                <div className="empty-state">
                  Börja med att skriva in ett tal. Då räknar appen ut medelvärde,
                  median, typvärde och värdespridning.
                </div>
              ) : (
                sortedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`value-block${draggedId === item.id ? ' dragging' : ''}`}
                    draggable
                    onDragStart={() => {
                      setDraggedId(item.id);
                      setTrashActive(false);
                    }}
                    onDragEnd={clearDragState}
                  >
                    {formatNumber(item.value)}
                  </button>
                ))
              )}
            </div>

            <div className="board-actions">
              <div
                className={`trash-zone${trashActive ? ' active' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setTrashActive(true);
                }}
                onDragLeave={() => setTrashActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  removeDraggedItem();
                }}
              >
                Släpp här för att kasta ett värde
              </div>

              <button
                type="button"
                className="clear-button"
                onClick={() => {
                  setItems([]);
                  clearDragState();
                }}
                disabled={items.length === 0}
              >
                Töm listan
              </button>
            </div>
          </div>

          <div className="stats-grid">
            <article className="stat-card highlight">
              <p className="stat-label">Medelvärde</p>
              <strong>{stats.mean === null ? '–' : formatNumber(stats.mean)}</strong>
              <span>Summan av alla värden delat med antalet värden.</span>
            </article>

            <article className="stat-card">
              <p className="stat-label">Median</p>
              <strong>{stats.median === null ? '–' : formatNumber(stats.median)}</strong>
              <span>Det mittersta värdet när talen ligger i storleksordning.</span>
            </article>

            <article className="stat-card">
              <p className="stat-label">Typvärde</p>
              <strong>
                {stats.mode.length === 0
                  ? 'Inget'
                  : stats.mode.map((value) => formatNumber(value)).join(', ')}
              </strong>
              <span>Det värde som förekommer flest gånger.</span>
            </article>

            <article className="stat-card">
              <p className="stat-label">Värdespridning</p>
              <strong>{stats.range === null ? '–' : formatNumber(stats.range)}</strong>
              <span>Största värdet minus minsta värdet.</span>
            </article>
          </div>
        </section>
      ) : currentPage === 'diagram' ? (
        <section className="workspace-panel single-panel-layout">
          <div className="board-card placeholder-card">
            <div className="section-heading">
              <div>
                <h2>Diagram</h2>
                <p>Här kommer en framtida vy för att visa värden i olika diagram.</p>
              </div>
            </div>

            <div className="placeholder-grid" aria-hidden="true">
              <div className="placeholder-bar tall"></div>
              <div className="placeholder-bar medium"></div>
              <div className="placeholder-bar short"></div>
              <div className="placeholder-bar medium"></div>
              <div className="placeholder-bar tall"></div>
            </div>
          </div>
        </section>
      ) : (
        <section className="workspace-panel single-panel-layout">
          <div className="board-card placeholder-card">
            <div className="section-heading">
              <div>
                <h2>Kombinatorik</h2>
                <p>Här kommer en sida för att träna val, ordning och kombinationer.</p>
              </div>
            </div>

            <div className="combination-chips" aria-hidden="true">
              <span className="combination-chip">glass</span>
              <span className="combination-chip">strössel</span>
              <span className="combination-chip">sås</span>
              <span className="combination-chip">bägare</span>
            </div>
          </div>
        </section>
      )}

    </main>
  );
}

export default App;
