import { useEffect, useState } from 'react'
import { getFixedAssessment, getModelInfo, getQuestionBank } from './services/edubridgeApi'

function StatusPill({ ok }) {
  return (
    <span className={`status-pill ${ok ? 'status-ok' : 'status-wait'}`}>
      <span className="status-dot" />
      {ok ? 'Terhubung' : 'Belum diperiksa'}
    </span>
  )
}

export default function App() {
  const [model, setModel] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [bank, setBank] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function checkBackend() {
    setLoading(true)
    setError('')
    try {
      const [modelInfo, fixed, questionBank] = await Promise.all([
        getModelInfo(),
        getFixedAssessment(),
        getQuestionBank(),
      ])
      setModel(modelInfo)
      setAssessment(fixed)
      setBank(questionBank)
    } catch (err) {
      setError(err.message || 'Tidak dapat menghubungi backend.')
      setModel(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkBackend()
  }, [])

  const modelName = model?.model_name || model?.name || model?.model || 'EduBridge Model'
  const questionCount = Array.isArray(bank)
    ? bank.length
    : bank?.questions?.length ?? bank?.items?.length ?? '—'
  const fixedCount = Array.isArray(assessment)
    ? assessment.length
    : assessment?.questions?.length ?? assessment?.items?.length ?? '—'

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="EduBridge home">
          <span className="brand-mark">E</span>
          <span>EduBridge</span>
        </a>
        <span className="environment-label">FRONTEND · API CONNECTOR</span>
      </header>

      <section className="hero">
        <div className="eyebrow">LEARNING INTELLIGENCE PLATFORM</div>
        <h1>Belajar lebih terarah.<br /><span>Kenali kemampuanmu.</span></h1>
        <p className="hero-copy">
          Antarmuka EduBridge terpisah dari backend. Hubungkan layanan FastAPI
          untuk memuat model, bank soal, dan asesmen.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={checkBackend} disabled={loading}>
            {loading ? 'Memeriksa...' : 'Periksa koneksi backend'}
          </button>
          <StatusPill ok={Boolean(model)} />
        </div>
        {error && <div className="error-panel" role="alert">{error}</div>}
      </section>

      <section className="section-heading">
        <div>
          <div className="eyebrow">SYSTEM OVERVIEW</div>
          <h2>Status layanan</h2>
        </div>
        <span className="muted">Data dimuat langsung dari API</span>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <div className="metric-label">Model diagnosis</div>
          <div className="metric-value metric-text">{model ? modelName : '—'}</div>
          <div className="metric-foot">{model ? 'Informasi model berhasil dimuat' : 'Menunggu koneksi backend'}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Bank soal</div>
          <div className="metric-value">{questionCount}</div>
          <div className="metric-foot">Jumlah item dari endpoint assessment bank</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Asesmen tetap</div>
          <div className="metric-value">{fixedCount}</div>
          <div className="metric-foot">Jumlah item dari fixed assessment</div>
        </article>
      </section>

      <section className="info-card">
        <div className="info-icon">↗</div>
        <div>
          <h3>Frontend dan backend dikelola terpisah</h3>
          <p>
            Frontend ini hanya memanggil endpoint API. Kunci API disimpan di
            environment server development, bukan di kode browser.
          </p>
        </div>
      </section>

      <footer className="footer">
        <span>EduBridge</span>
        <span>React · Vite · FastAPI</span>
      </footer>
    </main>
  )
}
