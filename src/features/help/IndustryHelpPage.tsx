const helpRows = [
  {
    number: '01',
    title: 'Состав общего трафика',
    metrics: [
      'Доля человеческого трафика',
      'Доля обеленных ботов (Яндекс, Гугл и другие)',
      'Доля вредоносных ботов',
    ],
    base: 'От общего объёма трафика',
    note: 'Потенциально легитимные пользователи отдельно не показываются: их доля прибавляется к доле вредоносных ботов.',
  },
  {
    number: '02',
    title: 'Классификация ботов',
    metrics: [
      'Доля обычных и продвинутых ботов',
      'Доля мобильных, десктопных и неизвестных устройств',
    ],
    base: 'От общего объёма трафика',
    note: 'Сложность ботов и тип устройства — две независимые классификации.',
  },
  {
    number: '03',
    title: 'Атаки',
    metrics: [
      'Доля API-атак',
      'Доля активности парсеров',
      'Доля атак, связанных с подбором учётных данных',
      'Доля сканеров',
      'Доля атак, связанных с подбором платёжных данных',
      'Доля SMS/Push-бомберов',
    ],
    base: 'От объёма вредоносного трафика',
    note: 'API-атаки выделены отдельно. Они могут пересекаться с другими видами атак или встречаться самостоятельно, поэтому доли нельзя складывать.',
    accent: true,
  },
  {
    number: '04',
    title: 'Источники и география трафика',
    metrics: [
      'Доля трафика, исходящего из дата-центров',
      'Доля трафика из России',
      'Доля иностранного трафика',
    ],
    base: 'От общего объёма трафика',
    note: 'Эти показатели относятся ко всему трафику, а не только к вредоносному.',
  },
];

export function IndustryHelpPage() {
  return (
    <div className="help-page view-stack">
      <section className="panel help-intro">
        <div>
          <p className="help-kicker">Справка по данным</p>
          <h2>Что есть в отчёте и как считаются доли</h2>
          <p>Для каждой группы указано, какие показатели в неё входят и от какого трафика считается доля.</p>
        </div>
        <div className="help-base-summary">
          <span><strong>От общего объёма трафика</strong>Все показатели, кроме API и других типов атак</span>
          <span><strong>От вредоносного трафика</strong>API-атаки, парсеры, подборы данных, сканеры и SMS/Push-бомберы</span>
        </div>
      </section>

      <section className="panel help-data-panel">
        <div className="help-data-head" aria-hidden="true">
          <span>Что показываем</span>
          <span>База расчёта</span>
          <span>Важно</span>
        </div>
        {helpRows.map((row) => (
          <article className={`help-data-row${row.accent ? ' help-data-row-accent' : ''}`} key={row.number}>
            <div className="help-data-name">
              <span>{row.number}</span>
              <div>
                <h2>{row.title}</h2>
                <ul>{row.metrics.map((metric) => <li key={metric}>{metric}</li>)}</ul>
              </div>
            </div>
            <div className="help-data-base">{row.base}</div>
            <p className="help-data-note">{row.note}</p>
          </article>
        ))}
      </section>

      <section className="panel help-reading-panel">
        <div>
          <h2>Как читать числа</h2>
          <p><strong>Процент</strong> — доля из исходных данных. <strong>≈ Объём</strong> — эта доля, умноженная на базу расчёта.</p>
        </div>
        <div>
          <h2>При объединении данных</h2>
          <p>Даты и отрасли учитываются по объёму трафика: крупные выборки влияют на итог сильнее.</p>
        </div>
      </section>

    </div>
  );
}
