import {
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import {
  assignAdminUserRole,
  fetchAdminAuditLogs,
  fetchAdminQuestions,
  fetchAdminStats,
  fetchAdminUsers,
  saveAdminQuestion,
  setAdminQuestionStatus,
  type AdminAuditLog,
  type AdminQuestionItem,
  type AdminSystemStats,
  type AdminUserItem,
} from "../../lib/adminRepository";
import type { ContentStatus, UserRole } from "../../types";

type AdminTab = "overview" | "questions" | "users" | "audit";

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [questions, setQuestions] = useState<AdminQuestionItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Question filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Question modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [formId, setFormId] = useState("");
  const [formLessonId, setFormLessonId] = useState("lesson-intro");
  const [formType, setFormType] = useState<"multiple-choice" | "word-order">("multiple-choice");
  const [formPrompt, setFormPrompt] = useState("");
  const [formExplanation, setFormExplanation] = useState("");
  const [formDifficulty, setFormDifficulty] = useState("beginner");
  const [formStatus, setFormStatus] = useState<ContentStatus>("draft");

  // Multiple-choice options
  const [formOptA, setFormOptA] = useState("");
  const [formOptB, setFormOptB] = useState("");
  const [formOptC, setFormOptC] = useState("");
  const [formCorrectOpt, setFormCorrectOpt] = useState("a");

  // Word-order bank
  const [formWordBankText, setFormWordBankText] = useState("");
  const [formCorrectOrderText, setFormCorrectOrderText] = useState("");

  const [savingQuestion, setSavingQuestion] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (activeTab === "overview") {
        const [s, l] = await Promise.all([fetchAdminStats(), fetchAdminAuditLogs(5)]);
        setStats(s);
        setAuditLogs(l);
      } else if (activeTab === "questions") {
        const q = await fetchAdminQuestions();
        setQuestions(q);
      } else if (activeTab === "users") {
        const u = await fetchAdminUsers();
        setUsers(u);
      } else if (activeTab === "audit") {
        const a = await fetchAdminAuditLogs(30);
        setAuditLogs(a);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat data admin.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function showToast(message: string) {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3500);
  }

  async function handleStatusToggle(q: AdminQuestionItem) {
    const nextStatus: ContentStatus = q.status === "published" ? "draft" : "published";
    try {
      await setAdminQuestionStatus(q.id, nextStatus);
      showToast(`Status ${q.id} diubah ke ${nextStatus}`);
      loadData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    try {
      await assignAdminUserRole(userId, newRole);
      showToast(`Peran pengguna berhasil diubah ke ${newRole}`);
      loadData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menetapkan peran.");
    }
  }

  function openCreateQuestionModal() {
    const nextNum = Math.floor(100 + Math.random() * 900);
    setFormId(`q-custom-${nextNum}`);
    setFormLessonId("lesson-intro");
    setFormType("multiple-choice");
    setFormPrompt("");
    setFormExplanation("");
    setFormDifficulty("beginner");
    setFormStatus("draft");
    setFormOptA("");
    setFormOptB("");
    setFormOptC("");
    setFormCorrectOpt("a");
    setFormWordBankText("");
    setFormCorrectOrderText("");
    setIsQuestionModalOpen(true);
  }

  async function handleSaveQuestion() {
    if (!formId.trim() || !formPrompt.trim()) {
      setErrorMessage("ID soal dan pertanyaan tidak boleh kosong.");
      return;
    }

    setSavingQuestion(true);
    setErrorMessage(null);

    try {
      let optionsPayload: Array<{ id: string; label: string; orderIndex: number }> = [];
      let answerKey = "";
      let wordBankPayload: string[] = [];
      let validationType = "exact";

      if (formType === "multiple-choice") {
        optionsPayload = [
          { id: "a", label: formOptA.trim() || "Pilihan A", orderIndex: 1 },
          { id: "b", label: formOptB.trim() || "Pilihan B", orderIndex: 2 },
          { id: "c", label: formOptC.trim() || "Pilihan C", orderIndex: 3 },
        ];
        answerKey = formCorrectOpt;
        validationType = "exact";
      } else {
        wordBankPayload = formWordBankText
          .split(/[\s,]+/)
          .map((w) => w.trim())
          .filter(Boolean);
        const correctWords = formCorrectOrderText
          .split(/[\s,]+/)
          .map((w) => w.trim())
          .filter(Boolean);
        answerKey = JSON.stringify(correctWords);
        validationType = "word-order";
      }

      await saveAdminQuestion({
        id: formId.trim(),
        lessonId: formLessonId,
        questionType: formType,
        prompt: formPrompt.trim(),
        explanation: formExplanation.trim(),
        difficulty: formDifficulty,
        orderIndex: 99,
        status: formStatus,
        wordBank: wordBankPayload,
        options: optionsPayload,
        answerKey,
        validationType,
      });

      setIsQuestionModalOpen(false);
      showToast(`Soal ${formId} berhasil disimpan.`);
      loadData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menyimpan soal.");
    } finally {
      setSavingQuestion(false);
    }
  }

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.lessonId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="prototype">Lingoland Administrator</Badge>
              <span className="inline-flex items-center gap-1 rounded bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                <Shield size={12} className="text-primary-600" /> RBAC Protected
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-neutral-950">CMS & Console Kelola</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Kelola kurikulum, bank soal dinamis, otorisasi pengguna, dan jejak audit sistem.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={loadData}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Segarkan
            </Button>
            <Link to="/app/home">
              <Button variant="ghost">Keluar ke Aplikasi</Button>
            </Link>
          </div>
        </header>

        {/* Success Toast */}
        {successToast && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-success-100 p-3 text-sm font-semibold text-green-800" role="status">
            <CheckCircle2 size={18} /> {successToast}
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-danger-100 p-3 text-sm font-semibold text-red-800" role="alert">
            <ShieldAlert size={18} /> {errorMessage}
          </div>
        )}

        {/* Tab Navigation */}
        <nav className="mb-6 flex gap-2 border-b border-neutral-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "overview" ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <Layers size={16} /> Ikhtisar Sistem
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "questions" ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <FileQuestion size={16} /> Bank Soal (CMS)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "users" ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <Users size={16} /> Pengguna & Role
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "audit" ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <ClipboardList size={16} /> Log Audit
          </button>
        </nav>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Card className="p-4 text-center">
                <p className="text-xs font-semibold text-neutral-500">Kursus</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">{stats?.coursesCount ?? 0}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs font-semibold text-neutral-500">Bab/Unit</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">{stats?.unitsCount ?? 0}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs font-semibold text-neutral-500">Lesson</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">{stats?.lessonsCount ?? 0}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs font-semibold text-neutral-500">Soal Aktif</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">{stats?.questionsCount ?? 0}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs font-semibold text-neutral-500">Learners</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">{stats?.learnersCount ?? 0}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs font-semibold text-neutral-500">Attempts</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">{stats?.attemptsCount ?? 0}</p>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h2 className="text-base font-bold text-neutral-950">Aktivitas Terakhir Admin</h2>
                <Button variant="ghost" onClick={() => setActiveTab("audit")}>Lihat Semua</Button>
              </div>
              <div className="mt-4 divide-y divide-neutral-100">
                {auditLogs.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-500">Belum ada jejak audit tersimpan.</p>
                ) : (
                  auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <span className="font-semibold text-neutral-900">{log.action}</span>
                        <span className="ml-2 text-xs text-neutral-500">
                          {log.entityType}: {log.entityId}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400">
                        {new Date(log.createdAt).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Question Bank CMS */}
        {activeTab === "questions" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari teks soal atau ID..."
                    className="w-full rounded-md border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <Button onClick={openCreateQuestionModal}>
                <Plus size={16} /> Tambah Soal Baru
              </Button>
            </div>

            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-100 text-xs font-bold uppercase text-neutral-600">
                    <tr>
                      <th className="px-4 py-3">ID / Lesson</th>
                      <th className="px-4 py-3">Tipe</th>
                      <th className="px-4 py-3">Pertanyaan</th>
                      <th className="px-4 py-3">Kunci Jawaban</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {filteredQuestions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-500">
                          {loading ? "Memuat bank soal..." : "Tidak ada soal yang cocok dengan filter."}
                        </td>
                      </tr>
                    ) : (
                      filteredQuestions.map((q) => (
                        <tr key={q.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-neutral-900">{q.id}</span>
                            <span className="block text-xs text-neutral-500">{q.lessonId}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-800">
                              {q.questionType}
                            </span>
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 font-medium text-neutral-900" title={q.prompt}>
                            {q.prompt}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-primary-700">
                            {q.answerKey ? q.answerKey.slice(0, 30) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={q.status === "published" ? "success" : "warning"}>
                              {q.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="secondary"
                              className="text-xs py-1 px-2.5"
                              onClick={() => handleStatusToggle(q)}
                            >
                              {q.status === "published" ? "Tarik ke Draft" : "Publikasikan"}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 3: Users & Role Management */}
        {activeTab === "users" && (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100 text-xs font-bold uppercase text-neutral-600">
                  <tr>
                    <th className="px-4 py-3">Pengguna</th>
                    <th className="px-4 py-3">Role Saat Ini</th>
                    <th className="px-4 py-3">Saldo Koin</th>
                    <th className="px-4 py-3">XP / Level</th>
                    <th className="px-4 py-3 text-right">Ubah Peran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-500">
                        {loading ? "Memuat data pengguna..." : "Belum ada profil pengguna terdaftar."}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-neutral-900">{u.name}</span>
                          <span className="block text-xs text-neutral-500">@{u.username} • {u.id.slice(0, 8)}...</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={u.role === "admin" ? "prototype" : u.role === "moderator" ? "info" : "neutral"}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-neutral-900">{u.coins}</td>
                        <td className="px-4 py-3 text-neutral-700">{u.xp} XP (Lv {u.level})</td>
                        <td className="px-4 py-3 text-right">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold focus:border-primary-500 focus:outline-none"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === "audit" && (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100 text-xs font-bold uppercase text-neutral-600">
                  <tr>
                    <th className="px-4 py-3">ID / Waktu</th>
                    <th className="px-4 py-3">Aktor</th>
                    <th className="px-4 py-3">Tindakan</th>
                    <th className="px-4 py-3">Entitas</th>
                    <th className="px-4 py-3">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-500">
                        {loading ? "Memuat audit logs..." : "Tidak ada catatan audit."}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-xs text-neutral-500">
                          <span className="block font-semibold text-neutral-900">#{log.id}</span>
                          {new Date(log.createdAt).toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                          {log.actorId ? log.actorId.slice(0, 8) + "..." : "System"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-neutral-900">{log.action}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="font-medium text-neutral-800">{log.entityType}</span>: {log.entityId}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-neutral-600" title={JSON.stringify(log.details)}>
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modal: Tambah Soal Baru */}
      <Modal isOpen={isQuestionModalOpen} onClose={() => setIsQuestionModalOpen(false)} title="Tambah Soal Baru">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700">ID Unik Soal</label>
              <input
                type="text"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Bab/Lesson</label>
              <select
                value={formLessonId}
                onChange={(e) => setFormLessonId(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="lesson-intro">lesson-intro (Perkenalan Diri)</option>
                <option value="lesson-hobby">lesson-hobby (Hobi dan Minat)</option>
                <option value="lesson-weekend">lesson-weekend (Percakapan Sehari-hari)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Tipe Soal</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as "multiple-choice" | "word-order")}
                className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="multiple-choice">Multiple Choice (Pilihan Ganda)</option>
                <option value="word-order">Word Order (Susun Kata)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Status Awal</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="draft">Draft (Belum Tampil di Siswa)</option>
                <option value="published">Published (Langsung Tayang)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700">Instruksi / Pertanyaan</label>
            <input
              type="text"
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              placeholder="Contoh: Pilih arti dari 'Good morning'..."
              className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>

          {formType === "multiple-choice" ? (
            <div className="space-y-3 rounded-md bg-neutral-100 p-3">
              <p className="text-xs font-bold uppercase text-neutral-700">Pilihan Jawaban</p>
              <div>
                <label className="block text-xs font-medium text-neutral-600">Pilihan A</label>
                <input
                  type="text"
                  value={formOptA}
                  onChange={(e) => setFormOptA(e.target.value)}
                  className="mt-1 w-full rounded border border-neutral-300 p-1.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600">Pilihan B</label>
                <input
                  type="text"
                  value={formOptB}
                  onChange={(e) => setFormOptB(e.target.value)}
                  className="mt-1 w-full rounded border border-neutral-300 p-1.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600">Pilihan C</label>
                <input
                  type="text"
                  value={formOptC}
                  onChange={(e) => setFormOptC(e.target.value)}
                  className="mt-1 w-full rounded border border-neutral-300 p-1.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Kunci Jawaban Benar</label>
                <select
                  value={formCorrectOpt}
                  onChange={(e) => setFormCorrectOpt(e.target.value)}
                  className="mt-1 w-full rounded border border-neutral-300 p-1.5 text-sm bg-white font-semibold"
                >
                  <option value="a">Pilihan A</option>
                  <option value="b">Pilihan B</option>
                  <option value="c">Pilihan C</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-md bg-neutral-100 p-3">
              <p className="text-xs font-bold uppercase text-neutral-700">Konfigurasi Susun Kata</p>
              <div>
                <label className="block text-xs font-medium text-neutral-600">Bank Kata (Pisahkan spasi)</label>
                <input
                  type="text"
                  value={formWordBankText}
                  onChange={(e) => setFormWordBankText(e.target.value)}
                  placeholder="playing I games like"
                  className="mt-1 w-full rounded border border-neutral-300 p-1.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Urutan Kalimat Benar (Kunci)</label>
                <input
                  type="text"
                  value={formCorrectOrderText}
                  onChange={(e) => setFormCorrectOrderText(e.target.value)}
                  placeholder="I like playing games"
                  className="mt-1 w-full rounded border border-neutral-300 p-1.5 text-sm bg-white font-semibold"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700">Penjelasan (Opsional)</label>
            <input
              type="text"
              value={formExplanation}
              onChange={(e) => setFormExplanation(e.target.value)}
              placeholder="Penjelasan untuk peserta saat latihan selesai..."
              className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-3">
            <Button variant="ghost" onClick={() => setIsQuestionModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveQuestion} disabled={savingQuestion}>
              {savingQuestion ? "Menyimpan..." : "Simpan Soal"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
