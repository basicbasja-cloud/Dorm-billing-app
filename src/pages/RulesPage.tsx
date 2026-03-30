import { DORM_RULES } from '../data/rules'

export function RulesPage() {
  return (
    <main className="page">
      <section className="panel">
        <h1>กฎระเบียบหอพัก</h1>
        <p className="panel-description">ผู้เช่าสามารถตรวจสอบกฎหอพักได้จากหน้านี้</p>
        <ol className="rules-list">
          {DORM_RULES.map((rule) => (
            <li key={rule.id}>
              {rule.segments.map((segment, index) =>
                segment.strong ? <strong key={index}>{segment.text}</strong> : <span key={index}>{segment.text}</span>,
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
