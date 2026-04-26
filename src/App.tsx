import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import './App.css';

type ValueItem = {
  id: number;
  value: number;
};

type CombinationOption = {
  id: number;
  label: string;
};

type CombinationStep = {
  id: number;
  label: string;
  options: CombinationOption[];
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

const PAGE_HASH_PREFIX = '#';

const getPageFromHash = (hash: string): PageId | null => {
  const normalizedHash = hash.replace(/^#/, '').trim().toLowerCase();
  const page = pages.find((entry) => entry.id === normalizedHash);
  return page?.id ?? null;
};

const getHashForPage = (page: PageId): string => `${PAGE_HASH_PREFIX}${page}`;

const chartPalette = ['#009e9d', '#f39b4a', '#6b7fff', '#e36d7b', '#6aaf4d', '#8f76ff'];
const BAR_MODE_STORAGE_KEY = 'statistiklabbet.barMode';
const ITEMS_STORAGE_KEY = 'statistiklabbet.items';
const COMBINATORICS_STORAGE_KEY = 'statistiklabbet.combinatorics';

const readStoredItems = (): ValueItem[] => {
  const rawItems = localStorage.getItem(ITEMS_STORAGE_KEY);
  if (!rawItems) {
    return [];
  }

  try {
    const parsedItems = JSON.parse(rawItems);
    if (!Array.isArray(parsedItems)) {
      return [];
    }

    const validItems = parsedItems
      .filter((item) => {
        if (!item || typeof item !== 'object') {
          return false;
        }

        const candidate = item as Partial<ValueItem>;
        return typeof candidate.id === 'number' && Number.isFinite(candidate.id)
          && typeof candidate.value === 'number' && Number.isFinite(candidate.value);
      })
      .map((item) => ({ id: item.id, value: item.value } as ValueItem));

    return validItems;
  } catch {
    return [];
  }
};

const readStoredCombinationSteps = (): CombinationStep[] => {
  const rawSteps = localStorage.getItem(COMBINATORICS_STORAGE_KEY);
  if (!rawSteps) {
    return [];
  }

  try {
    const parsedSteps = JSON.parse(rawSteps);
    if (!Array.isArray(parsedSteps)) {
      return [];
    }

    const validSteps = parsedSteps
      .filter((step) => step && typeof step === 'object')
      .map((step) => {
        const candidate = step as Partial<CombinationStep>;
        const options = Array.isArray(candidate.options)
          ? candidate.options
            .filter((option) => option && typeof option === 'object')
            .map((option) => {
              const optionCandidate = option as Partial<CombinationOption>;
              return {
                id: typeof optionCandidate.id === 'number' ? optionCandidate.id : -1,
                label: typeof optionCandidate.label === 'string' ? optionCandidate.label.trim() : '',
              };
            })
            .filter((option) => option.id >= 0 && option.label.length > 0)
          : [];

        return {
          id: typeof candidate.id === 'number' ? candidate.id : -1,
          label: typeof candidate.label === 'string' ? candidate.label.trim() : '',
          options,
        };
      })
      .filter((step) => step.id >= 0 && step.label.length > 0);

    return validSteps;
  } catch {
    return [];
  }
};

const buildCombinationExamples = (steps: CombinationStep[], maxExamples: number): string[] => {
  if (steps.length === 0 || maxExamples <= 0) {
    return [];
  }

  let combinations: string[][] = [[]];
  for (const step of steps) {
    if (step.options.length === 0) {
      return [];
    }

    const nextCombinations: string[][] = [];
    for (const combination of combinations) {
      for (const option of step.options) {
        nextCombinations.push([...combination, option.label]);
        if (nextCombinations.length >= maxExamples) {
          break;
        }
      }
      if (nextCombinations.length >= maxExamples) {
        break;
      }
    }
    combinations = nextCombinations;
  }

  return combinations.map((combination) => combination.join(' + '));
};

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
  const [items, setItems] = useState<ValueItem[]>(() => readStoredItems());
  const [combinationSteps, setCombinationSteps] = useState<CombinationStep[]>(() => readStoredCombinationSteps());
  const [stepInputValue, setStepInputValue] = useState('');
  const [optionInputByStep, setOptionInputByStep] = useState<Record<number, string>>({});
  const [inputValue, setInputValue] = useState('');
  const [currentPage, setCurrentPage] = useState<PageId>(() => getPageFromHash(window.location.hash) ?? 'lagesmatt');
  const [diagramType, setDiagramType] = useState<DiagramType>('stapel');
  const [barMode, setBarMode] = useState<BarMode>(() => {
    const savedMode = localStorage.getItem(BAR_MODE_STORAGE_KEY);
    return savedMode === 'pivot' || savedMode === 'liggande' ? 'liggande' : 'staande';
  });

  useEffect(() => {
    localStorage.setItem(BAR_MODE_STORAGE_KEY, barMode);
  }, [barMode]);

  useEffect(() => {
    localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(COMBINATORICS_STORAGE_KEY, JSON.stringify(combinationSteps));
  }, [combinationSteps]);

  useEffect(() => {
    const handleHashChange = () => {
      const pageFromHash = getPageFromHash(window.location.hash);
      if (pageFromHash) {
        setCurrentPage(pageFromHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    const expectedHash = getHashForPage(currentPage);
    if (window.location.hash !== expectedHash) {
      window.location.hash = expectedHash;
    }
  }, [currentPage]);

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

  const meanFormula = useMemo(() => {
    if (stats.sortedValues.length === 0) {
      return '— =';
    }

    return `(${stats.sortedValues.map((value) => formatNumber(value)).join(' + ')}) / ${stats.sortedValues.length} =`;
  }, [stats.sortedValues]);

  const medianFormula = useMemo(() => {
    if (stats.sortedValues.length === 0) {
      return '— =';
    }

    const listText = stats.sortedValues.map((value) => formatNumber(value)).join(', ');
    const middleIndex = Math.floor(stats.sortedValues.length / 2);

    if (stats.sortedValues.length % 2 === 0) {
      const leftMiddle = stats.sortedValues[middleIndex - 1];
      const rightMiddle = stats.sortedValues[middleIndex];
      return `[${listText}] -> (${formatNumber(leftMiddle)} + ${formatNumber(rightMiddle)}) / 2 =`;
    }

    const middle = stats.sortedValues[middleIndex];
    return `[${listText}] -> ${formatNumber(middle)} =`;
  }, [stats.sortedValues]);

  const modeFormula = useMemo(() => {
    if (frequencyData.length === 0) {
      return '— =';
    }

    const frequencyText = frequencyData
      .map((entry) => `${formatNumber(entry.value)}:${entry.count}`)
      .join(', ');

    if (stats.mode.length === 0) {
      return `${frequencyText} -> inget typvärde =`;
    }

    return `${frequencyText} -> högst frekvens =`;
  }, [frequencyData, stats.mode]);

  const rangeFormula = useMemo(() => {
    if (stats.sortedValues.length === 0) {
      return '— =';
    }

    const minValue = stats.sortedValues[0];
    const maxValue = stats.sortedValues[stats.sortedValues.length - 1];
    return `${formatNumber(maxValue)} - ${formatNumber(minValue)} =`;
  }, [stats.sortedValues]);

  const activeCombinationSteps = useMemo(
    () => combinationSteps.filter((step) => step.options.length > 0),
    [combinationSteps],
  );
  const totalCombinations = useMemo(() => {
    if (activeCombinationSteps.length === 0) {
      return 0;
    }

    return activeCombinationSteps.reduce((product, step) => product * step.options.length, 1);
  }, [activeCombinationSteps]);
  const combinationFormula = useMemo(() => {
    const factors = activeCombinationSteps.map((step) => step.options.length);
    if (factors.length === 0) {
      return '— =';
    }

    return `${factors.join(' × ')} =`;
  }, [activeCombinationSteps]);
  const combinationExamples = useMemo(
    () => buildCombinationExamples(activeCombinationSteps, 8),
    [activeCombinationSteps],
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

    setItems((currentItems) => {
      const nextId = currentItems.reduce((highestId, item) => Math.max(highestId, item.id), 0) + 1;
      return [...currentItems, { id: nextId, value: parsedValue }];
    });
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
            <h2>Bygg era egna valsteg</h2>
            <p className="page-intro-text">
              Lägg till steg och val ett i taget. Till höger ser ni kombinationsträdet,
              formeln och exempel på utfall.
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
              <div className="stat-math-row">
                <pre className="math-formula">{meanFormula}</pre>
                <strong>{stats.mean === null ? '–' : formatNumber(stats.mean)}</strong>
              </div>
              <span>Summan av alla värden delat med antalet värden.</span>
            </article>

            <article className="stat-card">
              <p className="stat-label">Median</p>
              <div className="stat-math-row">
                <pre className="math-formula">{medianFormula}</pre>
                <strong>{stats.median === null ? '–' : formatNumber(stats.median)}</strong>
              </div>
              <span>Det mittersta värdet när talen ligger i storleksordning.</span>
            </article>

            <article className="stat-card">
              <p className="stat-label">Typvärde</p>
              <div className="stat-math-row">
                <pre className="math-formula">{modeFormula}</pre>
                <strong>
                  {stats.mode.length === 0
                    ? 'Inget'
                    : stats.mode.map((value) => formatNumber(value)).join(', ')}
                </strong>
              </div>
              <span>Det värde som förekommer flest gånger.</span>
            </article>

            <article className="stat-card">
              <p className="stat-label">Värdespridning</p>
              <div className="stat-math-row">
                <pre className="math-formula">{rangeFormula}</pre>
                <strong>{stats.range === null ? '–' : formatNumber(stats.range)}</strong>
              </div>
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
          <div className="combinatorics-layout">
            <div className="board-card combinatorics-builder">
              <div className="section-heading">
                <div>
                  <h2>Kombinationsbyggaren</h2>
                  <p>Skapa steg och lägg till alternativ för att se hur antalet kombinationer växer.</p>
                </div>
                <span className="pill">{combinationSteps.length} steg</span>
              </div>

              <form
                className="field-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const normalizedLabel = stepInputValue.trim();
                  if (!normalizedLabel) {
                    return;
                  }

                  setCombinationSteps((currentSteps) => {
                    const nextId = currentSteps.reduce((highestId, step) => Math.max(highestId, step.id), 0) + 1;
                    return [...currentSteps, { id: nextId, label: normalizedLabel, options: [] }];
                  });
                  setStepInputValue('');
                }}
              >
                <input
                  inputMode="text"
                  autoComplete="off"
                  placeholder="Namn på steg, till exempel Smak"
                  value={stepInputValue}
                  onChange={(event) => setStepInputValue(event.target.value)}
                  aria-label="Namn på nytt steg"
                />
                <button type="submit">Lägg till steg</button>
              </form>

              <div className="combinatorics-step-list">
                {combinationSteps.length === 0 ? (
                  <div className="empty-state">
                    Börja med att lägga till ett steg. Exempel: Smak, Topping, Sås.
                  </div>
                ) : (
                  combinationSteps.map((step) => (
                    <article key={step.id} className="combinatorics-step-card">
                      <div className="combinatorics-step-header">
                        <h3>{step.label}</h3>
                        <div className="combinatorics-step-header-actions">
                          <span className="pill">{step.options.length} val</span>
                          <button
                            type="button"
                            className="mini-remove-button"
                            onClick={() => {
                              setCombinationSteps((currentSteps) => currentSteps.filter((entry) => entry.id !== step.id));
                              setOptionInputByStep((currentInputs) => {
                                const nextInputs = { ...currentInputs };
                                delete nextInputs[step.id];
                                return nextInputs;
                              });
                            }}
                          >
                            Ta bort steg
                          </button>
                        </div>
                      </div>

                      <form
                        className="field-row"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const currentInputValue = optionInputByStep[step.id] ?? '';
                          const normalizedOption = currentInputValue.trim();
                          if (!normalizedOption) {
                            return;
                          }

                          setCombinationSteps((currentSteps) => currentSteps.map((entry) => {
                            if (entry.id !== step.id) {
                              return entry;
                            }

                            const nextOptionId = entry.options.reduce((highestId, option) => Math.max(highestId, option.id), 0) + 1;
                            return {
                              ...entry,
                              options: [...entry.options, { id: nextOptionId, label: normalizedOption }],
                            };
                          }));
                          setOptionInputByStep((currentInputs) => ({ ...currentInputs, [step.id]: '' }));
                        }}
                      >
                        <input
                          inputMode="text"
                          autoComplete="off"
                          placeholder={`Lägg till val i ${step.label}`}
                          value={optionInputByStep[step.id] ?? ''}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setOptionInputByStep((currentInputs) => ({ ...currentInputs, [step.id]: nextValue }));
                          }}
                          aria-label={`Nytt val för ${step.label}`}
                        />
                        <button type="submit">Lägg till val</button>
                      </form>

                      <div className="quick-values" aria-label={`Val för ${step.label}`}>
                        {step.options.length === 0 ? (
                          <p className="field-help">Inga val ännu.</p>
                        ) : (
                          step.options.map((option) => (
                            <button
                              key={`${step.id}-${option.id}`}
                              type="button"
                              className="quick-value-chip"
                              onClick={() => {
                                setCombinationSteps((currentSteps) => currentSteps.map((entry) => {
                                  if (entry.id !== step.id) {
                                    return entry;
                                  }

                                  return {
                                    ...entry,
                                    options: entry.options.filter((currentOption) => currentOption.id !== option.id),
                                  };
                                }));
                              }}
                              aria-label={`Ta bort valet ${option.label}`}
                              title="Klicka för att ta bort"
                            >
                              {option.label}
                            </button>
                          ))
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="form-actions">
                <p className="form-actions-help">Klicka på ett val för att ta bort det</p>
                <button
                  type="button"
                  className="clear-button"
                  onClick={() => {
                    setCombinationSteps([]);
                    setOptionInputByStep({});
                  }}
                  disabled={combinationSteps.length === 0}
                >
                  Rensa allt
                </button>
              </div>
            </div>

            <aside className="detail-card combinatorics-summary">
              <p className="field-label">Visualisering</p>
              <h3>Kombinationsträd</h3>
              <p className="combinatorics-summary-text">
                Varje kolumn är ett steg. Antalet kombinationer är produkten av antal val i varje steg.
              </p>

              <div className="combination-tree" role="img" aria-label="Förhandsvisning av kombinatoriksteg och val">
                {activeCombinationSteps.length === 0 ? (
                  <div className="empty-state">Lägg till steg och val för att se trädet.</div>
                ) : (
                  activeCombinationSteps.map((step) => (
                    <div key={`tree-${step.id}`} className="tree-column">
                      <p className="tree-step-label">{step.label}</p>
                      <div className="tree-nodes">
                        {step.options.map((option) => (
                          <span key={`node-${step.id}-${option.id}`} className="tree-node">{option.label}</span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <article className="stat-card">
                <p className="stat-label">Antal kombinationer</p>
                <div className="stat-math-row">
                  <pre className="math-formula">{combinationFormula}</pre>
                  <strong>{totalCombinations}</strong>
                </div>
                <span>Produktprincipen: antal val i steg 1 × steg 2 × ...</span>
              </article>

              <article className="combination-examples-card">
                <p className="stat-label">Exempel på utfall</p>
                {combinationExamples.length === 0 ? (
                  <p className="field-help">Inga utfall ännu.</p>
                ) : (
                  <ol className="combination-examples-list">
                    {combinationExamples.map((example, index) => (
                      <li key={`${example}-${index}`}>{example}</li>
                    ))}
                  </ol>
                )}
              </article>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
