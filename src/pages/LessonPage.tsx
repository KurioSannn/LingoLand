import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useDemoStorage } from "../hooks/useDemoStorage";
import { fetchLessonById, submitLessonAttempt, type LessonGradeResult } from "../lib/learningRepository";
import type { LessonUnit } from "../types";

export type LessonSubmissionState = "idle" | "submitting" | "success" | "failed";

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function LessonPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { state, lessonUnitSummaries, completeLesson, setActiveMission } = useDemoStorage();

  const isGuest =
    Boolean(state.isGuest) ||
    !state.isAuthenticated ||
    state.user.id === "demo-user" ||
    state.user.id === "guest-user";

  const summary =
    lessonUnitSummaries.find(
      (entry) => entry.unit.id === unitId || entry.unit.lessonId === unitId,
    ) ?? null;
  const [remoteUnit, setRemoteUnit] = useState<LessonUnit | null>(null);

  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    fetchLessonById(unitId, { isGuest })
      .then((loaded) => {
        if (!cancelled && loaded) {
          setRemoteUnit(loaded);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [unitId, isGuest]);

  const activeUnit = remoteUnit ?? summary?.unit ?? null;

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerOrder, setAnswerOrder] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [initialWordBank, setInitialWordBank] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [gradeResult, setGradeResult] = useState<LessonGradeResult | null>(null);
  const [submissionState, setSubmissionState] = useState<LessonSubmissionState>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [wasAlreadyCompleted] = useState(
    () =>
      summary?.status === "completed" ||
      (unitId ? state.completedLessonIds.includes(unitId) : false),
  );

  const currentExercise = activeUnit?.exercises[exerciseIndex] ?? null;

  useEffect(() => {
    if (!currentExercise) return;
    setSelectedOptionId(null);
    setAnswerOrder([]);
    const bank = currentExercise.type === "word-order" ? shuffle(currentExercise.wordBank ?? []) : [];
    setAvailableWords(bank);
    setInitialWordBank(bank);
    setChecked(false);
    setIsCorrect(false);
    setSubmissionError(null);
  }, [currentExercise]);

  if (!activeUnit) {
    return (
      <section className="page-shell">
        <Card className="mx-auto max-w-md text-center">
          <p className="text-neutral-500">Lesson tidak ditemukan.</p>
          <Button className="mt-4" onClick={() => navigate("/app/lessons")}>
            Kembali ke Learning Path
          </Button>
        </Card>
      </section>
    );
  }

  if (summary?.status === "locked") {
    return (
      <section className="page-shell">
        <Card className="mx-auto max-w-md text-center">
          <Lock className="mx-auto text-neutral-400" size={32} aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-neutral-950">Lesson terkunci</h1>
          <p className="mt-2 text-neutral-500">
            Selesaikan lesson sebelumnya dulu untuk membuka {activeUnit.title}.
          </p>
          <Button className="mt-4" onClick={() => navigate("/app/lessons")}>
            Kembali ke Learning Path
          </Button>
        </Card>
      </section>
    );
  }

  if (activeUnit.exercises.length === 0) {
    return (
      <section className="page-shell">
        <Card className="mx-auto max-w-md text-center">
          <AlertTriangle className="mx-auto text-amber-500" size={32} aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-neutral-950">Soal belum tersedia</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Lesson <strong>{activeUnit.title}</strong> belum memiliki soal aktif yang dipublikasikan.
          </p>
          <Button className="mt-4" onClick={() => navigate("/app/lessons")}>
            Kembali ke Learning Path
          </Button>
        </Card>
      </section>
    );
  }

  const unit = activeUnit;
  const totalExercises = unit.exercises.length;
  const isLastExercise = exerciseIndex === totalExercises - 1;
  const isSubmitting = submissionState === "submitting";
  const canCheck =
    currentExercise?.type === "multiple-choice"
      ? selectedOptionId !== null
      : answerOrder.length > 0 && answerOrder.length === (currentExercise?.wordBank?.length ?? 0);

  const hasLocalAnswerKey = Boolean(
    isGuest &&
      (currentExercise?.type === "multiple-choice"
        ? currentExercise.correctOptionId
        : currentExercise?.correctOrder && currentExercise.correctOrder.length > 0),
  );

  function selectOption(optionId: string) {
    if (checked) return;
    setSelectedOptionId(optionId);
  }

  function pickWord(word: string, sourceIndex: number) {
    if (checked) return;
    setAnswerOrder((current) => [...current, word]);
    setAvailableWords((current) => current.filter((_, index) => index !== sourceIndex));
  }

  function removeWord(word: string, sourceIndex: number) {
    if (checked) return;
    setAnswerOrder((current) => current.filter((_, index) => index !== sourceIndex));
    setAvailableWords((current) => [...current, word]);
  }

  function resetWordOrder() {
    if (checked) return;
    setAvailableWords(initialWordBank);
    setAnswerOrder([]);
  }

  function checkAnswer() {
    if (!currentExercise || checked) return;
    const userAns = currentExercise.type === "multiple-choice" ? selectedOptionId! : answerOrder;
    setAnswers((prev) => ({ ...prev, [currentExercise.id]: userAns }));

    if (hasLocalAnswerKey) {
      const correct =
        currentExercise.type === "multiple-choice"
          ? selectedOptionId === currentExercise.correctOptionId
          : JSON.stringify(answerOrder) === JSON.stringify(currentExercise.correctOrder);
      setIsCorrect(correct);
    } else {
      setIsCorrect(true);
    }
    setChecked(true);
  }

  async function goNext() {
    if (!isLastExercise) {
      setExerciseIndex((index) => index + 1);
      return;
    }

    setSubmissionState("submitting");
    setSubmissionError(null);

    const currentUserAns =
      currentExercise?.type === "multiple-choice" ? selectedOptionId! : answerOrder;
    const finalAnswers = { ...answers };
    if (currentExercise && !(currentExercise.id in finalAnswers)) {
      finalAnswers[currentExercise.id] = currentUserAns;
    }
    setAnswers(finalAnswers);

    try {
      const targetLessonOrUnitId = unit.lessonId ?? unit.id;
      const res = await submitLessonAttempt({
        lessonUnitId: targetLessonOrUnitId,
        answers: finalAnswers,
        alreadyCompleted: wasAlreadyCompleted,
        isGuest,
      });

      if (!res.ok) {
        setSubmissionState("failed");
        setSubmissionError(
          res.message ||
            "Jawaban belum berhasil diperiksa oleh server. Progres dan hadiah belum disimpan. Coba lagi.",
        );
        return;
      }

      setGradeResult(res);
      setSubmissionState("success");
      setIsFinished(true);

      if (res.passed) {
        await completeLesson(unit.id, res.gainedXp, unit.title, res.score, {
          currentXp: res.currentXp,
          currentLevel: res.currentLevel,
          alreadyRewarded: res.alreadyRewarded,
        });
      }
    } catch {
      // NEVER convert a server grading failure into a local pass or fake XP reward!
      setSubmissionState("failed");
      setSubmissionError(
        "Jawaban belum berhasil diperiksa oleh server. Progres dan hadiah belum disimpan. Coba lagi.",
      );
    }
  }

  function restartLesson() {
    setExerciseIndex(0);
    setAnswers({});
    setGradeResult(null);
    setSubmissionState("idle");
    setSubmissionError(null);
    setIsFinished(false);
  }

  function goTo3DPractice() {
    if (unit.relatedMissionId) {
      setActiveMission(unit.relatedMissionId);
    }
    navigate("/app/world");
  }

  if (isFinished && gradeResult) {
    const passed = gradeResult.passed;
    const score = gradeResult.score;
    const totalEvaluated = gradeResult.totalQuestions || totalExercises;

    return (
      <section className="page-shell">
        <Card className="mx-auto max-w-xl text-center">
          {passed ? (
            <Sparkles className="mx-auto text-primary-500" size={40} aria-hidden />
          ) : (
            <XCircle className="mx-auto text-danger-500" size={40} aria-hidden />
          )}
          <h1 className="mt-4 text-2xl font-bold text-neutral-950">
            {passed ? "Lesson Lulus!" : "Belum Lulus"}
          </h1>
          <p className="mt-2 text-neutral-500">
            {gradeResult.correctCount} dari {totalEvaluated} jawaban benar (Skor: {score}%).
          </p>
          <div className="mt-3 flex justify-center">
            {passed ? (
              wasAlreadyCompleted || gradeResult.alreadyRewarded ? (
                <Badge tone="neutral">Latihan Ulang — tanpa reward tambahan</Badge>
              ) : (
                <Badge tone="success">+{gradeResult.gainedXp} XP Diperoleh</Badge>
              )
            ) : (
              <Badge tone="warning">
                Batas minimum kelulusan: {gradeResult.passThreshold ?? 70}%
              </Badge>
            )}
          </div>
          {!passed ? (
            <p className="mt-4 text-sm text-neutral-600">
              Jangan berkecil hati! Ulangi latihan ini untuk menguasai kosakata dan membuka bab berikutnya.
            </p>
          ) : (
            <div className="mt-5 rounded-xl border border-primary-200 bg-primary-50 p-4 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-primary-700">
                Langkah Selanjutnya: Praktik Animasi 3D
              </p>
              <p className="mt-1 text-sm text-neutral-700">
                Kosakata dari bab <strong>{unit.title}</strong> ini sekarang siap kamu praktikkan langsung bersama karakter NPC di dalam <strong>Mini Home 3D</strong>!
              </p>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {passed ? (
              <Button onClick={goTo3DPractice}>
                <Sparkles size={16} aria-hidden />
                Praktik di Dunia 3D (Mini Home)
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => navigate("/app/lessons")}>
              Kembali ke Learning Path
            </Button>
            <Button variant={passed ? "secondary" : "primary"} onClick={restartLesson}>
              <RotateCcw size={16} aria-hidden />
              {passed ? "Latihan Ulang" : "Coba Lagi"}
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <button type="button" className="button button-ghost mb-6 px-0" onClick={() => navigate("/app/lessons")}>
        <ArrowLeft size={16} aria-hidden />
        Learning Path
      </button>

      <Card className="mx-auto max-w-2xl">
        <Badge tone="info">Modul Latihan</Badge>
        <h1 className="mt-3 text-2xl font-bold text-neutral-950">{unit.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{unit.description}</p>

        <div className="mt-5">
          <ProgressBar value={exerciseIndex} max={totalExercises} label={`Soal ${exerciseIndex + 1} dari ${totalExercises}`} />
        </div>

        {currentExercise ? (
          <div className="mt-6">
            <p className="text-lg font-semibold text-neutral-950">{currentExercise.prompt}</p>

            {currentExercise.type === "multiple-choice" ? (
              <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label={currentExercise.prompt}>
                {currentExercise.options?.map((option) => {
                  const isSelected = selectedOptionId === option.id;
                  const isCorrectOption = hasLocalAnswerKey && option.id === currentExercise.correctOptionId;
                  let tone = "border-neutral-200 bg-white";
                  if (checked && hasLocalAnswerKey && isCorrectOption) tone = "border-success-500 bg-success-100";
                  else if (checked && hasLocalAnswerKey && isSelected && !isCorrectOption) tone = "border-danger-500 bg-danger-100";
                  else if (isSelected) tone = "border-primary-500 bg-primary-50";

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={checked}
                      onClick={() => selectOption(option.id)}
                      className={`rounded-md border-2 px-4 py-3 text-left text-sm font-medium text-neutral-950 transition-colors ${tone} ${
                        checked ? "cursor-default" : "cursor-pointer hover:border-primary-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {currentExercise.type === "word-order" ? (
              <div className="mt-4">
                <div className="flex min-h-[3rem] flex-wrap gap-2 rounded-md border-2 border-dashed border-neutral-200 bg-neutral-50 p-3">
                  {answerOrder.length === 0 ? (
                    <span className="text-sm text-neutral-400">Ketuk kata di bawah untuk menyusun kalimat.</span>
                  ) : null}
                  {answerOrder.map((word, index) => (
                    <button
                      key={`${word}-${index}`}
                      type="button"
                      disabled={checked}
                      onClick={() => removeWord(word, index)}
                      className="rounded-md border border-primary-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-950"
                    >
                      {word}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableWords.map((word, index) => (
                    <button
                      key={`${word}-${index}`}
                      type="button"
                      disabled={checked}
                      onClick={() => pickWord(word, index)}
                      className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-primary-300"
                    >
                      {word}
                    </button>
                  ))}
                </div>
                {!checked ? (
                  <button type="button" className="button button-ghost mt-3 px-0" onClick={resetWordOrder}>
                    <RotateCcw size={14} aria-hidden />
                    Reset Susunan
                  </button>
                ) : null}
              </div>
            ) : null}

            {checked ? (
              hasLocalAnswerKey ? (
                <div
                  role="status"
                  className={`mt-4 flex items-start gap-2 rounded-md p-3 text-sm font-medium ${
                    isCorrect ? "bg-success-100 text-green-800" : "bg-danger-100 text-red-800"
                  }`}
                >
                  {isCorrect ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden /> : <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden />}
                  <span>
                    {isCorrect
                      ? "Benar!"
                      : `Kurang tepat. Jawaban yang benar: ${
                          currentExercise.type === "multiple-choice"
                            ? currentExercise.options?.find((option) => option.id === currentExercise.correctOptionId)?.label
                            : currentExercise.correctOrder?.join(" ")
                        }`}
                  </span>
                </div>
              ) : (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2 rounded-md bg-primary-50 p-3 text-sm font-medium text-primary-700"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
                  <span>Jawaban disimpan. Evaluasi skor akhir dilakukan secara otomatis oleh server di akhir modul.</span>
                </div>
              )
            ) : null}

            {submissionState === "failed" && submissionError ? (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-md border border-danger-500 bg-danger-100 p-3 text-sm font-medium text-red-800"
              >
                <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                <div className="flex-1">
                  <p>{submissionError}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              {!checked ? (
                <Button onClick={checkAnswer} disabled={!canCheck}>
                  Periksa
                </Button>
              ) : (
                <Button onClick={goNext} disabled={isSubmitting}>
                  {isSubmitting
                    ? "Memeriksa di Server..."
                    : submissionState === "failed"
                      ? "Coba Kirim Lagi"
                      : isLastExercise
                        ? "Selesai"
                        : "Lanjut"}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
