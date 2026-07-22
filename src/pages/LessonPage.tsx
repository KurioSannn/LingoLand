import { ArrowLeft, CheckCircle2, Lock, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useDemoStorage } from "../hooks/useDemoStorage";

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
  const { lessonUnitSummaries, completeLesson } = useDemoStorage();

  const summary = lessonUnitSummaries.find((entry) => entry.unit.id === unitId) ?? null;

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerOrder, setAnswerOrder] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [initialWordBank, setInitialWordBank] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [wasAlreadyCompleted] = useState(() => summary?.status === "completed");

  const currentExercise = summary?.unit.exercises[exerciseIndex] ?? null;

  useEffect(() => {
    if (!currentExercise) return;
    setSelectedOptionId(null);
    setAnswerOrder([]);
    const bank = currentExercise.type === "word-order" ? shuffle(currentExercise.wordBank ?? []) : [];
    setAvailableWords(bank);
    setInitialWordBank(bank);
    setChecked(false);
    setIsCorrect(false);
  }, [currentExercise]);

  if (!summary) {
    return (
      <section className="page-shell">
        <Card className="mx-auto max-w-md text-center">
          <p className="text-neutral-500">Lesson tidak ditemukan.</p>
          <Button className="mt-4" onClick={() => navigate("/app/lessons")}>Kembali ke Learning Path</Button>
        </Card>
      </section>
    );
  }

  if (summary.status === "locked") {
    return (
      <section className="page-shell">
        <Card className="mx-auto max-w-md text-center">
          <Lock className="mx-auto text-neutral-400" size={32} aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-neutral-950">Lesson terkunci</h1>
          <p className="mt-2 text-neutral-500">Selesaikan lesson sebelumnya dulu untuk membuka {summary.unit.title}.</p>
          <Button className="mt-4" onClick={() => navigate("/app/lessons")}>Kembali ke Learning Path</Button>
        </Card>
      </section>
    );
  }

  // Captured as a local so closures below (goNext, etc.) keep TypeScript's null
  // narrowing — a captured outer `const` isn't narrowed inside nested function
  // declarations since they could run after a re-render.
  const unit = summary.unit;
  const totalExercises = unit.exercises.length;
  const isLastExercise = exerciseIndex === totalExercises - 1;
  const canCheck = currentExercise?.type === "multiple-choice"
    ? selectedOptionId !== null
    : answerOrder.length > 0 && answerOrder.length === (currentExercise?.wordBank?.length ?? 0);

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
    const correct = currentExercise.type === "multiple-choice"
      ? selectedOptionId === currentExercise.correctOptionId
      : JSON.stringify(answerOrder) === JSON.stringify(currentExercise.correctOrder);

    setIsCorrect(correct);
    setChecked(true);
    if (correct) setCorrectCount((count) => count + 1);
  }

  function goNext() {
    if (!isLastExercise) {
      setExerciseIndex((index) => index + 1);
      return;
    }
    setIsFinished(true);
    completeLesson(unit.id, unit.rewardXp, unit.title);
  }

  function restartLesson() {
    setExerciseIndex(0);
    setCorrectCount(0);
    setIsFinished(false);
  }

  if (isFinished) {
    const earnedXp = wasAlreadyCompleted ? 0 : unit.rewardXp;
    return (
      <section className="page-shell">
        <Card className="mx-auto max-w-xl text-center">
          <Sparkles className="mx-auto text-primary-500" size={40} aria-hidden />
          <h1 className="mt-4 text-2xl font-bold text-neutral-950">Lesson Selesai!</h1>
          <p className="mt-2 text-neutral-500">{correctCount} dari {totalExercises} jawaban benar.</p>
          {wasAlreadyCompleted ? (
            <div className="mt-3 flex justify-center">
              <Badge tone="neutral">Latihan Ulang — tanpa reward tambahan</Badge>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold text-neutral-700">+{earnedXp} XP</p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate("/app/lessons")}>Kembali ke Learning Path</Button>
            <Button variant="secondary" onClick={restartLesson}>
              <RotateCcw size={16} aria-hidden />
              Ulangi Lesson
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
        <Badge tone="prototype">Lesson</Badge>
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
                  const isCorrectOption = option.id === currentExercise.correctOptionId;
                  let tone = "border-neutral-200 bg-white";
                  if (checked && isCorrectOption) tone = "border-success-500 bg-success-100";
                  else if (checked && isSelected && !isCorrectOption) tone = "border-danger-500 bg-danger-100";
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
            ) : null}

            <div className="mt-6 flex justify-end">
              {!checked ? (
                <Button onClick={checkAnswer} disabled={!canCheck}>Periksa</Button>
              ) : (
                <Button onClick={goNext}>{isLastExercise ? "Selesai" : "Lanjut"}</Button>
              )}
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
