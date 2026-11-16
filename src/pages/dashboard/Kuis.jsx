import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  getQuestionBank,
  getAssessmentImageUrl,
  submitAssessment,
} from '../../services/edubridgeApi';

const QUIZ_DURATION_SECONDS = 15 * 60;
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const CONCEPT_BLUEPRINT = [
  { name: 'Factorising into a Single Bracket', count: 5 },
  { name: 'Gradient Between Two Co-ordinates', count: 2 },
  { name: 'Horizontal and Vertical Lines', count: 5 },
  { name: 'Linear Equations', count: 5 },
  { name: 'Linear Sequences (nth term)', count: 5 },
  { name: 'Midpoint Between Two Co-ordinates', count: 5 },
  { name: 'Naming Co-ordinates in 2D', count: 5 },
  { name: 'Simplifying Expressions by Collecting Like Terms', count: 5 },
  { name: 'Solving Linear Inequalities', count: 5 },
  { name: 'Substitution into Formula', count: 5 },
  { name: 'Writing Expressions', count: 5 },
];

function shuffleItems(items) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function buildAssessmentItems(bankItems) {
  if (!Array.isArray(bankItems)) {
    throw new Error('Question bank tidak valid.');
  }

  const selected = [];

  CONCEPT_BLUEPRINT.forEach((concept, conceptIndex) => {
    const available = bankItems.filter(
      (item) => String(item.concept_names ?? '').trim() === concept.name,
    );

    if (available.length < concept.count) {
      throw new Error(
        `Soal untuk konsep "${concept.name}" kurang. Dibutuhkan ${concept.count}, tersedia ${available.length}.`,
      );
    }

    const randomized = shuffleItems(available).slice(0, concept.count);

    randomized.forEach((question, conceptQuestionIndex) => {
      selected.push({
        ...question,
        __conceptIndex: conceptIndex,
        __conceptQuestionIndex: conceptQuestionIndex,
        __conceptQuestionCount: concept.count,
        __assessmentIndex: selected.length,
      });
    });
  });

  if (selected.length !== 52) {
    throw new Error(`Assessment seharusnya 52 soal, tetapi terbentuk ${selected.length}.`);
  }

  return selected;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function getStudentId() {
  const key = 'edubridge-student-id';

  try {
    let id = localStorage.getItem(key);

    if (!id) {
      id = `student-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
      localStorage.setItem(key, id);
    }

    return id;
  } catch {
    return `student-${Date.now()}`;
  }
}

function getGapLabel(status) {
  const labels = {
    learning_gap: 'Perlu dipelajari',
    possible_gap_uncertain: 'Belum pasti',
    needs_more_data: 'Butuh lebih banyak data',
  };

  return labels[status] ?? status ?? 'Belum tersedia';
}

function probability(value) {
  if (typeof value !== 'number') return '--';
  return `${(value * 100).toFixed(1)}%`;
}

export default function Kuis() {
  const [assessment, setAssessment] = useState(null);
  const [bankItems, setBankItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(QUIZ_DURATION_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [studentId] = useState(getStudentId);
  const submittedRef = useRef(false);

  const questions = assessment?.items ?? [];
  const currentQuestion = questions[questionIndex];
  const currentConceptIndex = currentQuestion?.__conceptIndex ?? 0;
  const currentConceptName =
    CONCEPT_BLUEPRINT[currentConceptIndex]?.name ?? '';
  const currentConceptQuestionNumber =
    (currentQuestion?.__conceptQuestionIndex ?? 0) + 1;
  const currentConceptQuestionCount =
    currentQuestion?.__conceptQuestionCount ?? 0;
  const currentConceptQuestions = questions.filter(
    (question) => question.__conceptIndex === currentConceptIndex,
  );
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length
    ? (answeredCount / questions.length) * 100
    : 0;

  const diagnosis = result?.diagnosis;
  const learningGaps = diagnosis?.learning_gaps ?? [];
  const masteryProfiles = diagnosis?.mastery_profiles_target ?? [];

  useEffect(() => {
    let active = true;

    async function loadAssessment() {
      try {
        setLoading(true);
        setError('');

        const data = await getQuestionBank();

        if (!active) return;

        if (!Array.isArray(data.items) || data.items.length === 0) {
          throw new Error('Backend tidak mengirimkan question bank.');
        }

        const initialItems = buildAssessmentItems(data.items);
        setBankItems(data.items);
        setAssessment({ ...data, items: initialItems });
      } catch (err) {
        if (active) {
          setError(err.message || 'Gagal mengambil assessment.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAssessment();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current || submitting || answeredCount === 0) return;

    submittedRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const responses = questions
        .filter((question) => answers[question.QuestionId] !== undefined)
        .map((question) => ({
          question_id: question.QuestionId,
          answer_value: answers[question.QuestionId],
        }));

      const data = await submitAssessment(studentId, responses);
      setResult(data);
      setStarted(false);
    } catch (err) {
      submittedRef.current = false;
      setError(err.message || 'Gagal mengirim jawaban.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, answeredCount, questions, studentId, submitting]);

  useEffect(() => {
    if (!started || result || submitting) return undefined;

    const timer = window.setInterval(() => {
      setTimeRemaining((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, result, submitting]);

  useEffect(() => {
    if (timeRemaining === 0 && started && !result && answeredCount > 0) {
      handleSubmit();
    }
  }, [timeRemaining, started, result, answeredCount, handleSubmit]);

  function startAssessment() {
    submittedRef.current = false;
    setAssessment((previous) => ({
      ...previous,
      items: buildAssessmentItems(bankItems),
    }));
    setAnswers({});
    setQuestionIndex(0);
    setTimeRemaining(QUIZ_DURATION_SECONDS);
    setResult(null);
    setError('');
    setStarted(true);
  }

  function selectAnswer(value) {
    if (!started || submitting || result || !currentQuestion) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.QuestionId]: value,
    }));
  }

  const selectedAnswer = currentQuestion
    ? answers[currentQuestion.QuestionId]
    : undefined;

  const gapCount = useMemo(
    () => learningGaps.filter((gap) => gap.gap_status === 'learning_gap').length,
    [learningGaps],
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-[1200px] rounded-2xl bg-[#EAF4FF] p-10 text-center font-poppins text-[#2A42A1]">
          <div className="text-lg font-bold">Memuat Assessment Diagnostik...</div>
          <p className="mt-2 text-sm text-gray-600">
            Menghubungkan ke model P-DINA.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !assessment) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-[1200px] rounded-2xl border border-red-200 bg-white p-8 font-poppins">
          <h2 className="text-xl font-bold text-red-600">
            Assessment tidak dapat dimuat
          </h2>
          <p className="mt-3 text-sm text-gray-600">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-[#4D73EC] px-5 py-3 font-bold text-white"
          >
            Coba Lagi
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1500px] font-poppins text-[#2A42A1]">
        <div className="grid grid-cols-1 items-start gap-5 2xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)]">
          <section className="min-w-0 space-y-5">
            <header className="relative flex min-h-[170px] items-center overflow-hidden rounded-[26px] bg-gradient-to-r from-[#D8E9FF] via-[#EFF9FF] to-[#C7E9FF] px-6 py-6 shadow-sm sm:px-8">
              <div className="relative z-10 max-w-[78%]">
                <span className="mb-3 inline-flex rounded-full bg-[#78A5EB] px-6 py-2 text-sm font-bold text-white">
                  Assessment
                </span>
                <h1 className="text-2xl font-extrabold sm:text-3xl">
                  Assessment Diagnostik
                </h1>
                <p className="mt-1 text-sm">
                  Evaluasi pemahaman matematika menggunakan model P-DINA.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#4266B1]">
                    {assessment?.source ?? 'Eedi NeurIPS 2020'}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#4266B1]">
                    {questions.length} Soal
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#4266B1]">
                    Model {assessment?.model ?? 'P-DINA'}
                  </span>
                </div>
              </div>
              <img
                src="/assets/images/object.png"
                alt="Maskot EduBridge"
                className="absolute -bottom-1 right-2 h-[120px] w-[100px] object-contain sm:right-5 sm:h-[145px] sm:w-[125px]"
              />
            </header>

            <div className="rounded-[22px] border border-[#D6E2F0] bg-[#EAF4FF] p-4 shadow-sm sm:p-6">
              {!started && !result && (
                <div className="rounded-2xl bg-white p-6 text-center sm:p-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F2FF] text-3xl text-[#4D73EC]">
                    ✎
                  </div>
                  <h2 className="mt-4 text-xl font-extrabold">
                    Siap mengerjakan Assessment Diagnostik?
                  </h2>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-gray-600">
                    Assessment ini berisi {questions.length} soal matematika.
                    Waktu pengerjaan adalah 15 menit.
                  </p>

                  <div className="mx-auto mt-5 max-w-sm rounded-xl bg-[#F3F8FF] p-4 text-left text-sm text-[#526B9B]">
                    <p className="font-bold">Sebelum mulai:</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>Pilih satu jawaban A, B, C, atau D.</li>
                      <li>Gunakan tombol navigasi untuk berpindah soal.</li>
                      <li>Jawaban dinilai oleh backend setelah dikirim.</li>
                      <li>Hasil diagnosis ditampilkan setelah assessment selesai.</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={startAssessment}
                    className="mt-6 rounded-full bg-[#4D73EC] px-8 py-3 font-bold text-white shadow-sm transition hover:bg-[#365DD7]"
                  >
                    Mulai Assessment
                  </button>
                </div>
              )}

              {started && currentQuestion && (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">Assessment Matematika</h2>
                      <p className="mt-1 text-xs text-[#6081C3]">
                        Konsep {currentConceptIndex + 1} dari {CONCEPT_BLUEPRINT.length}
                        {' · '}
                        Soal {currentConceptQuestionNumber} dari {currentConceptQuestionCount}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#4266B1]">
                        {currentConceptName}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        role="timer"
                        className={`rounded-xl bg-white px-3 py-2 text-xs font-bold ${
                          timeRemaining <= 60 ? 'text-[#C74767]' : 'text-[#6081C3]'
                        }`}
                      >
                        <p>Waktu Tersisa</p>
                        <p className="mt-1 text-base tabular-nums">
                          {formatTime(timeRemaining)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#6081C3]">
                        <p>Terjawab</p>
                        <p className="mt-1 text-base">
                          {answeredCount}/{questions.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-5 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[#4D80E8] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="rounded-2xl bg-white p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-[#E8F2FF] px-3 py-1 text-xs font-bold text-[#4266B1]">
                        Soal #{currentQuestion.QuestionId}
                      </span>
                      <span className="text-xs text-gray-500">
                        {currentQuestion.concept_names}
                      </span>
                    </div>

                    <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-[#F8FBFE] p-2">
                      <img
                        src={
                          currentQuestion.image_url ||
                          getAssessmentImageUrl(currentQuestion.QuestionId)
                        }
                        alt={`Soal matematika ${currentQuestion.QuestionId}`}
                        className="max-h-[480px] w-full object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>

                    <p className="mt-5 text-sm font-bold text-[#526B9B]">
                      Pilih jawaban:
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {OPTION_LABELS.map((label, index) => {
                        const value = index + 1;
                        const selected = selectedAnswer === value;

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => selectAnswer(value)}
                            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                              selected
                                ? 'border-[#4D78ED] bg-[#EAF2FF] ring-2 ring-[#B8D0FF]'
                                : 'border-[#DFE7F0] bg-white hover:border-[#76A1E6] hover:bg-blue-50'
                            }`}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                selected
                                  ? 'bg-[#4D73EC] text-white'
                                  : 'bg-[#C7E3F8] text-[#3864AD]'
                              }`}
                            >
                              {label}
                            </span>
                            <span className="font-semibold">
                              Pilihan {label}
                            </span>
                            {selected && (
                              <span className="ml-auto text-xs font-bold text-[#3864AD]">
                                Dipilih
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={!currentQuestion || currentQuestion.__conceptQuestionIndex === 0}
                      onClick={() => setQuestionIndex((index) => index - 1)}
                      className="rounded-full border border-[#4D73EC] bg-white px-6 py-3 text-sm font-bold text-[#3A67D8] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Sebelumnya
                    </button>

                    {questionIndex < questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setQuestionIndex((index) => index + 1)}
                        className="rounded-full bg-[#4D73EC] px-6 py-3 text-sm font-bold text-white hover:bg-[#365DD7]"
                      >
                        {currentQuestion.__conceptQuestionIndex === currentQuestion.__conceptQuestionCount - 1
                          ? 'Konsep Berikutnya →'
                          : 'Soal Berikutnya →'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={answeredCount === 0 || submitting}
                        onClick={handleSubmit}
                        className="rounded-full bg-[#4D73EC] px-6 py-3 text-sm font-bold text-white hover:bg-[#365DD7] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? 'Mengirim...' : 'Selesaikan Assessment'}
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {currentConceptQuestions.map((question) => {
                      const index = question.__assessmentIndex;
                      const isAnswered =
                        answers[question.QuestionId] !== undefined;

                      return (
                        <button
                          key={question.QuestionId}
                          type="button"
                          onClick={() => setQuestionIndex(index)}
                          aria-label={`Buka soal ${question.__conceptQuestionIndex + 1}`}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                            questionIndex === index
                              ? 'bg-[#4D73EC] text-white'
                              : isAnswered
                                ? 'bg-[#D8F3EA] text-[#238D78]'
                                : 'bg-white text-[#6081C3]'
                          }`}
                        >
                          {question.__conceptQuestionIndex + 1}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {submitting && (
                <div className="mt-4 rounded-xl bg-white p-5 text-center text-sm font-bold text-[#4266B1]">
                  Mengirim jawaban dan menjalankan diagnosis P-DINA...
                </div>
              )}

              {result && (
                <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-7">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E1F7F2] text-3xl text-[#299C87]">
                      ✓
                    </div>
                    <h2 className="mt-4 text-2xl font-extrabold">
                      Assessment Selesai
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Jawaban berhasil diproses oleh backend.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      <span className="rounded-full bg-[#E8F2FF] px-4 py-2 text-sm font-bold text-[#4266B1]">
                        Terjawab: {result.answered ?? answeredCount}
                      </span>
                      <span className="rounded-full bg-[#E8F2FF] px-4 py-2 text-sm font-bold text-[#4266B1]">
                        Terkirim: {result.submitted ?? answeredCount}
                      </span>
                    </div>
                  </div>

                  {diagnosis?.disclaimer && (
                    <p className="rounded-xl bg-[#FFF8E8] p-4 text-xs leading-relaxed text-[#80652D]">
                      {diagnosis.disclaimer}
                    </p>
                  )}

                  <section>
                    <h3 className="text-lg font-extrabold">
                      Hasil Diagnosis Pembelajaran
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Diagnosis dibuat berdasarkan estimasi penguasaan konsep
                      oleh model P-DINA.
                    </p>

                    {learningGaps.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {learningGaps.map((gap, index) => (
                          <article
                            key={`${gap.concept_id ?? index}-${index}`}
                            className="rounded-xl border border-[#DFE7F0] bg-[#F8FBFE] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-bold">
                                {gap.concept_name ?? `Konsep ${gap.concept_id}`}
                              </h4>
                              <span className="rounded-full bg-[#E8F2FF] px-3 py-1 text-xs font-bold text-[#4266B1]">
                                {getGapLabel(gap.gap_status)}
                              </span>
                            </div>
                            {gap.need !== undefined && (
                              <p className="mt-2 text-sm text-gray-600">
                                Kebutuhan belajar: {gap.need}
                              </p>
                            )}
                            {gap.certainty !== undefined && (
                              <p className="mt-1 text-xs text-gray-500">
                                Tingkat kepastian: {gap.certainty}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-[#F8FBFE] p-4 text-sm text-gray-600">
                        Belum ada learning gap yang dapat ditampilkan dari hasil
                        diagnosis ini.
                      </p>
                    )}
                  </section>

                  <section>
                    <h3 className="text-lg font-extrabold">
                      Estimasi Penguasaan Konsep
                    </h3>
                    {masteryProfiles.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {masteryProfiles.map((profile, index) => {
                          const mastery = profile.mastery_prob;
                          const width =
                            typeof mastery === 'number'
                              ? Math.max(0, Math.min(100, mastery * 100))
                              : 0;

                          return (
                            <article
                              key={`${profile.concept_id ?? index}-${index}`}
                              className="rounded-xl border border-[#DFE7F0] p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold">
                                  {profile.concept_name ??
                                    `Konsep ${profile.concept_id}`}
                                </span>
                                <span className="text-sm font-extrabold text-[#4266B1]">
                                  {probability(mastery)}
                                </span>
                              </div>
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-[#4D80E8]"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                Status: {profile.mastery_label ?? 'Belum tersedia'}
                                {' · '}
                                Bukti jawaban: {profile.n_evidence ?? 0}
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-gray-600">
                        Data estimasi penguasaan konsep belum tersedia.
                      </p>
                    )}
                  </section>

                  <button
                    type="button"
                    onClick={startAssessment}
                    className="w-full rounded-full bg-[#4D73EC] px-6 py-3 font-bold text-white hover:bg-[#365DD7]"
                  >
                    Ulangi Assessment
                  </button>
                </div>
              )}

              {error && assessment && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[22px] border border-[#D8E1ED] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-extrabold">Progress Assessment</h2>

              <div className="mt-4 rounded-xl bg-[#E2F3FA] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Soal Terjawab</span>
                  <span className="text-xl font-extrabold">
                    {answeredCount}/{questions.length}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#4D80E8] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  {Math.round(progress)}% selesai
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F0F6FF] p-3 text-center">
                  <p className="text-xs font-bold">Total Soal</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {questions.length}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F0F6FF] p-3 text-center">
                  <p className="text-xs font-bold">Sisa Soal</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {questions.length - answeredCount}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#D8E1ED] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-extrabold">Informasi Model</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Dataset</span>
                  <span className="text-right font-bold">
                    Eedi NeurIPS 2020
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Model</span>
                  <span className="font-bold">
                    {assessment?.model ?? 'P-DINA'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Jumlah soal</span>
                  <span className="font-bold">{questions.length}</span>
                </div>
              </div>
            </section>

            {result && (
              <section className="rounded-[22px] border border-[#D8E1ED] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-extrabold">Ringkasan Diagnosis</h2>
                <div className="mt-4 rounded-xl bg-[#FFF2F3] p-4">
                  <p className="text-sm font-bold text-[#A64D62]">
                    Learning gap teridentifikasi
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-[#A64D62]">
                    {gapCount}
                  </p>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                  Hasil merupakan estimasi model dan bukan verifikasi mutlak
                  penguasaan siswa.
                </p>
              </section>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
