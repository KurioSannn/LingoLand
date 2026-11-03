import {
  Ban,
  Check,
  CheckCircle2,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FriendAvatar } from "../components/ui/FriendAvatar";
import { Toast } from "../components/ui/Toast";
import { useDemoStorage } from "../hooks/useDemoStorage";
import {
  blockUser,
  fetchFriendRequests,
  fetchFriends,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  updatePresencePrivacy,
  type FriendProfile,
  type FriendRequestItem,
} from "../lib/friendsRepository";

type FriendsTab = "list" | "requests" | "add" | "privacy";

export function FriendsPage() {
  const { state } = useDemoStorage();
  const isGuest = state.isGuest || !state.isAuthenticated || state.user.id === "demo-user" || state.user.id === "guest-user";

  const [activeTab, setActiveTab] = useState<FriendsTab>("list");
  const [friendsList, setFriendsList] = useState<FriendProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [toastMessage, setToastMessage] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  // Privacy tab state
  const [presencePrivacy, setPresencePrivacy] = useState<"public" | "friends_only" | "hidden">("friends_only");
  const [customStatusText, setCustomStatusText] = useState("");
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "list") {
        const f = await fetchFriends(isGuest);
        setFriendsList(f);
      } else if (activeTab === "requests") {
        const reqs = await fetchFriendRequests(isGuest);
        setIncomingRequests(reqs.incoming);
        setOutgoingRequests(reqs.outgoing);
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Gagal memuat data sosial.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, isGuest]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSendRequest() {
    if (!searchUsername.trim()) return;
    setSendingRequest(true);
    try {
      const res = await sendFriendRequest(searchUsername, isGuest);
      setToastMessage(res.message);
      if (res.ok) {
        setSearchUsername("");
        loadData();
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Gagal mengirim permintaan.");
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleRespondRequest(requestId: number, action: "accept" | "reject") {
    try {
      const res = await respondFriendRequest(requestId, action, isGuest);
      setToastMessage(res.message);
      loadData();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Gagal memproses permintaan.");
    }
  }

  async function handleRemoveFriend(friendId: string, name: string) {
    if (!window.confirm(`Yakin ingin menghapus ${name} dari daftar teman?`)) return;
    try {
      const res = await removeFriend(friendId, isGuest);
      setToastMessage(res.message);
      loadData();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Gagal menghapus teman.");
    }
  }

  async function handleBlockUser(friendId: string, name: string) {
    if (!window.confirm(`Blokir ${name}? Kamu tidak akan dapat saling melihat atau berinteraksi.`)) return;
    try {
      const res = await blockUser(friendId, isGuest);
      setToastMessage(res.message);
      loadData();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Gagal memblokir pengguna.");
    }
  }

  async function handleSavePrivacy() {
    setSavingPrivacy(true);
    try {
      const res = await updatePresencePrivacy(presencePrivacy, customStatusText);
      setToastMessage(res.message);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Gagal menyimpan privasi.");
    } finally {
      setSavingPrivacy(false);
    }
  }

  return (
    <section className="page-shell">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-neutral-950">Teman Belajar</h1>
            {isGuest ? (
              <Badge tone="neutral">Mode Tamu (Offline)</Badge>
            ) : (
              <Badge tone="success">Terhubung Cloud</Badge>
            )}
          </div>
          <p className="mt-2 text-neutral-500">
            {isGuest
              ? "Kamu berada di mode tamu. Masuk atau daftar akun untuk menambah dan berinteraksi dengan teman sungguhan."
              : "Kelola jaringan teman, kirim permintaan pertemanan, dan atur privasi kehadiran sosial kamu."}
          </p>
        </div>
        <Button variant="secondary" onClick={loadData}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Segarkan
        </Button>
      </header>

      {/* Guest Notice Banner */}
      {isGuest && (
        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-primary-950">Ingin berteman dengan pemain sungguhan?</p>
            <p className="text-xs text-primary-700">Daftarkan akun gratis untuk menyimpan relasi pertemanan secara permanen di database.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/register">
              <Button className="text-xs py-1.5 px-3">Daftar Akun</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="text-xs py-1.5 px-3">Masuk</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="mt-6 flex gap-2 border-b border-neutral-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "list" ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Users size={16} /> Daftar Teman ({friendsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "requests" ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <UserCheck size={16} /> Permintaan {incomingRequests.length > 0 && `(${incomingRequests.length})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("add")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "add" ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <UserPlus size={16} /> Cari & Tambah
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("privacy")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "privacy" ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Shield size={16} /> Privasi Kehadiran
        </button>
      </nav>

      {/* Tab 1: Friends List */}
      {activeTab === "list" && (
        <div className="mt-6">
          {friendsList.length === 0 ? (
            <Card className="p-8 text-center text-neutral-500">
              <Users className="mx-auto text-neutral-300" size={40} />
              <p className="mt-3 font-semibold text-neutral-800">Belum ada teman terhubung</p>
              <p className="mt-1 text-sm text-neutral-500">Gunakan tab "Cari & Tambah" untuk menemukan learner lain menggunakan username.</p>
              <Button className="mt-4" onClick={() => setActiveTab("add")}>
                <UserPlus size={16} /> Tambah Teman Sekarang
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {friendsList.map((friend) => (
                <div key={friend.id} className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
                  <FriendAvatar name={friend.name} color="#6366f1" online={friend.isOnline ?? false} size="large" />
                  <h2 className="mt-4 text-lg font-bold text-neutral-950">{friend.name}</h2>
                  <p className="text-xs text-neutral-500">@{friend.username} • Level {friend.level}</p>
                  <p className="mt-1 text-xs font-semibold text-neutral-600">
                    {friend.isOnline ? "Online di Plaza" : "Offline"}
                  </p>
                  <p className="mt-2 min-h-10 text-sm italic text-neutral-600">
                    "{friend.customStatus || "Sedang belajar bahasa Inggris di Lingoland."}"
                  </p>

                  <div className="mt-4 flex w-full flex-col gap-2">
                    <Button
                      variant="secondary"
                      className="w-full text-xs"
                      onClick={() => setToastMessage(`Undangan latihan terkirim ke @${friend.username} (ajak bertemu di Social Plaza).`)}
                    >
                      <UserPlus size={14} /> Undang ke Room
                    </Button>
                    {!isGuest && (
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(friend.id, friend.name)}
                          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-danger-600"
                        >
                          <UserMinus size={13} /> Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBlockUser(friend.id, friend.name)}
                          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-danger-600"
                        >
                          <Ban size={13} /> Blokir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Requests */}
      {activeTab === "requests" && (
        <div className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-bold text-neutral-950">Permintaan Masuk ({incomingRequests.length})</h2>
            <div className="mt-4 divide-y divide-neutral-100">
              {incomingRequests.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-500">Tidak ada permintaan pertemanan masuk.</p>
              ) : (
                incomingRequests.map((req) => (
                  <div key={req.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold text-neutral-900">{req.otherUser.name}</p>
                      <p className="text-xs text-neutral-500">@{req.otherUser.username} • Level {req.otherUser.level}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="text-xs py-1 px-3"
                        onClick={() => handleRespondRequest(req.id, "accept")}
                      >
                        <Check size={14} /> Terima
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs py-1 px-3"
                        onClick={() => handleRespondRequest(req.id, "reject")}
                      >
                        <X size={14} /> Tolak
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-bold text-neutral-950">Permintaan Terkirim ({outgoingRequests.length})</h2>
            <div className="mt-4 divide-y divide-neutral-100">
              {outgoingRequests.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-500">Tidak ada permintaan tertunda yang kamu kirim.</p>
              ) : (
                outgoingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <span className="font-semibold text-neutral-900">{req.otherUser.name}</span>
                      <span className="ml-2 text-xs text-neutral-500">(@{req.otherUser.username})</span>
                    </div>
                    <Badge tone="warning">Menunggu Konfirmasi</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Search & Add Friend */}
      {activeTab === "add" && (
        <Card className="mt-6 mx-auto max-w-lg p-6">
          <h2 className="text-lg font-bold text-neutral-950">Cari Pengguna Lingoland</h2>
          <p className="mt-1 text-sm text-neutral-600">Masukkan username pemain yang ingin kamu ajak berteman.</p>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Contoh: bintang_lingo atau raka..."
                className="w-full rounded-md border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <Button onClick={handleSendRequest} disabled={sendingRequest || !searchUsername.trim()}>
              <UserPlus size={16} /> {sendingRequest ? "Mengirim..." : "Kirim Undangan"}
            </Button>
          </div>
        </Card>
      )}

      {/* Tab 4: Presence & Privacy */}
      {activeTab === "privacy" && (
        <Card className="mt-6 mx-auto max-w-lg p-6">
          <h2 className="text-lg font-bold text-neutral-950">Kontrol Privasi & Kehadiran</h2>
          <p className="mt-1 text-sm text-neutral-600">Atur siapa yang dapat melihat status online dan posisi kamu di Social Plaza.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Visibilitas Kehadiran Online
              </label>
              <select
                value={presencePrivacy}
                onChange={(e) => setPresencePrivacy(e.target.value as "public" | "friends_only" | "hidden")}
                className="mt-1.5 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="friends_only">Hanya Teman (Direkomendasikan)</option>
                <option value="public">Publik (Terlihat oleh semua pemain di Plaza)</option>
                <option value="hidden">Tersembunyi (Offline Mode)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Status Kustom / Bio Singkat
              </label>
              <input
                type="text"
                value={customStatusText}
                onChange={(e) => setCustomStatusText(e.target.value)}
                placeholder="Contoh: Lagi fokus latihan A2..."
                maxLength={80}
                className="mt-1.5 w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-primary-500 focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-neutral-400">{customStatusText.length}/80 karakter</p>
            </div>

            <Button onClick={handleSavePrivacy} disabled={savingPrivacy} className="w-full">
              <CheckCircle2 size={16} /> {savingPrivacy ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </Card>
      )}

      {toastMessage ? <Toast message={toastMessage} onDismiss={() => setToastMessage("")} /> : null}
    </section>
  );
}
