import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
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
type DiagramType = 'stapel' | 'cirkel';
type BarMode = 'staande' | 'liggande';

const pages: Array<{ id: PageId; label: string; }> = [
  { id: 'lagesmatt', label: 'Lägesmått' },
  { id: 'diagram', label: 'Diagram' },
  { id: 'kombinatorik', label: 'Kombinatorik' },
];

const diagramTypes: Array<{ id: DiagramType; label: string; }> = [
  { id: 'stapel', label: 'Stapeldiagram' },
  { id: 'cirkel', label: 'Cirkeldiagram' },
];

const chartPalette = ['#009e9d', '#f39b4a', '#6b7fff', '#e36d7b', '#6aaf4d', '#8f76ff'];
const BAR_MODE_STORAGE_KEY = 'statistiklabbet.barMode';

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
  const [nextId, setNextId] = useState(5);
  const [currentPage, setCurrentPage] = useState<PageId>('lagesmatt');
  const [diagramType, setDiagramType] = useState<DiagramType>('stapel');
  const [barMode, setBarMode] = useState<BarMode>(() => {
    const savedMode = localStorage.getItem(BAR_MODE_STORAGE_KEY);
    return savedMode === 'pivot' || savedMode === 'liggande' ? 'liggande' : 'staande';
  });

  useEffect(() => {
    localStorage.setItem(BAR_MODE_STORAGE_KEY, barMode);
  }, [barMode]);

  const stats = useMemo(
    () => calculateStats(items.map((item) => item.value)),
    [items],
  );
  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.value - right.value || left.id - right.id),
    [items],
  );
  const frequencyData = useMemo(() => {
    const frequencies = new Map<number, number>();
    for (const item of items) {
      frequencies.set(item.value, (frequencies.get(item.value) ?? 0) + 1);
    }

    return [...frequencies.entries()]
      .sort(([left], [right]) => left - right)
      .map(([value, count]) => ({ value, count }));
  }, [items]);
  const maxFrequency = useMemo(
    () => Math.max(1, ...frequencyData.map((entry) => entry.count)),
    [frequencyData],
  );
  const barScaleTicks = useMemo(() => {
    return Array.from({ length: maxFrequency + 1 }, (_, index) => maxFrequency - index);
  }, [maxFrequency]);
  const pieBackground = useMemo(() => {
    if (frequencyData.length === 0) {
      return 'transparent';
    }

    const total = frequencyData.reduce((sum, entry) => sum + entry.count, 0);
    let start = 0;
    const segments = frequencyData.map((entry, index) => {
      const color = chartPalette[index % chartPalette.length];
      const size = (entry.count / total) * 100;
      const end = start + size;
      const segment = `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      start = end;
      return segment;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }, [frequencyData]);

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

        {currentPage === 'kombinatorik' ? (
          <section className="value-form page-intro-card">
            <p className="field-label">Kombinatorik</p>
            <h2>En egen övningsyta</h2>
            <p className="page-intro-text">
              Här kan vi senare bygga uppgifter där man räknar olika möjliga val,
              ordningar och kombinationer.
            </p>
          </section>
        ) : (
          <form className="value-form" onSubmit={handleSubmit}>
            <div className="form-top-row">
              <label className="field-label" htmlFor="value-input">
                Lägg till ett värde
              </label>
              <span className="pill">{items.length} värden</span>
            </div>
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

            <div className="quick-values" aria-label="Värden under inmatningsfältet">
              {sortedItems.length === 0 ? (
                <p className="field-help">Inga värden ännu.</p>
              ) : (
                sortedItems.map((item) => (
                  <button
                    key={`quick-${item.id}`}
                    type="button"
                    className="quick-value-chip"
                    onClick={() => {
                      setItems((currentItems) => currentItems.filter((entry) => entry.id !== item.id));
                    }}
                    aria-label={`Ta bort värdet ${formatNumber(item.value)}`}
                    title="Klicka för att ta bort"
                  >
                    {formatNumber(item.value)}
                  </button>
                ))
              )}
            </div>

            <div className="form-actions">
              <p className="form-actions-help">Klicka på ett värde för att ta bort det</p>
              <button
                type="button"
                className="clear-button"
                onClick={() => {
                  setItems([]);
                }}
                disabled={items.length === 0}
              >
                Rensa
              </button>
            </div>
          </form>
        )}
      </section>

      {currentPage === 'lagesmatt' ? (
        <section className="workspace-panel single-panel-layout">
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
          <div className="board-card diagram-card">
            <div className="section-heading">
              <div>
                <h2>Diagram</h2>
                <p>Alla diagram använder samma lista med värden.</p>
              </div>
              <span className="pill">{items.length} värden</span>
            </div>

            {items.length === 0 ? (
              <div className="empty-state">
                Lägg till värden i Lägesmått först, så kan ni utforska dem här som
                olika diagram.
              </div>
            ) : (
              <>
                <div className="diagram-type-row" role="tablist" aria-label="Diagramtyper">
                  {diagramTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      role="tab"
                      aria-selected={diagramType === type.id}
                      className={`diagram-type-button${diagramType === type.id ? ' active' : ''}`}
                      onClick={() => setDiagramType(type.id)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {diagramType === 'stapel' ? (
                  <div className="chart-panel">
                    <div className="bar-mode-toggle" role="tablist" aria-label="Stapelläge">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={barMode === 'staande'}
                        className={`bar-mode-button${barMode === 'staande' ? ' active' : ''}`}
                        onClick={() => setBarMode('staande')}
                      >
                        Stående
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={barMode === 'liggande'}
                        className={`bar-mode-button${barMode === 'liggande' ? ' active' : ''}`}
                        onClick={() => setBarMode('liggande')}
                      >
                        Liggande
                      </button>
                    </div>

                    {barMode === 'staande' ? (
                      <div className="bar-chart-layout" role="img" aria-label="Stapeldiagram över frekvens">
                        <div className="bar-scale" aria-hidden="true">
                          {barScaleTicks.map((tick) => (
                            <span key={tick}>{tick}</span>
                          ))}
                        </div>

                        <div className="bar-chart">
                          {frequencyData.map((entry, index) => (
                            <div key={entry.value} className="bar-group">
                              <div className="bar-shell">
                                <div
                                  className="bar"
                                  style={{
                                    height: `${(entry.count / maxFrequency) * 100}%`,
                                    backgroundColor: chartPalette[index % chartPalette.length],
                                  }}
                                >
                                  <span>{entry.count}</span>
                                </div>
                              </div>
                              <p>{formatNumber(entry.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="horizontal-bar-chart" role="img" aria-label="Liggande stapeldiagram över frekvens">
                        <div className="bar-rows">
                          {frequencyData.map((entry, index) => (
                            <div key={entry.value} className="bar-row">
                              <p className="bar-label">{formatNumber(entry.value)}</p>
                              <div className="bar-track">
                                <div
                                  className="bar-horizontal"
                                  style={{
                                    width: `${(entry.count / maxFrequency) * 100}%`,
                                    backgroundColor: chartPalette[index % chartPalette.length],
                                  }}
                                >
                                  <span>{entry.count}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="horizontal-bar-scale" aria-hidden="true">
                          {[...barScaleTicks].reverse().map((tick) => (
                            <span key={tick}>{tick}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="chart-caption">
                      {barMode === 'staande'
                        ? 'Skalan till vänster visar frekvens (hur många av varje värde).'
                        : 'Skalan visar frekvens (hur många av varje värde).'}
                    </p>
                  </div>
                ) : null}

                {diagramType === 'cirkel' ? (
                  <div className="chart-panel pie-layout">
                    <div
                      className="pie-chart"
                      role="img"
                      aria-label="Cirkeldiagram över frekvens"
                      style={{ '--pie-background': pieBackground } as CSSProperties}
                    ></div>
                    <div className="pie-legend">
                      <p className="pie-legend-intro">
                        Cirkeldiagrammet visar hur många gånger olika värden finns med.
                      </p>
                      {frequencyData.map((entry, index) => (
                        <div key={entry.value} className="pie-legend-item">
                          <span
                            className="legend-swatch"
                            style={{ backgroundColor: chartPalette[index % chartPalette.length] }}
                          ></span>
                          <span>
                            Värdet {formatNumber(entry.value)} finns med{' '}
                            {entry.count === 1 ? '1 gång' : `${entry.count} gånger`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
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
