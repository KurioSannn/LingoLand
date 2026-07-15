import { Check, Coins, Eye, Lock, ShoppingBag, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AvatarPreview } from "../components/three/AvatarPreview";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { avatarOptions, storeItems } from "../data/demoData";
import { formatCoins } from "../lib/game";
import { useDemoStorage } from "../hooks/useDemoStorage";
import type { AvatarConfig, StoreCategory, StoreItem } from "../types";

type StoreFilter = "all" | StoreCategory;
type PurchaseStatus = "idle" | "success" | "error";

const filters: Array<{ id: StoreFilter; label: string }> = [
  { id: "all", label: "Terbaru" },
  { id: "top", label: "Pakaian" },
  { id: "accessory", label: "Aksesori" },
  { id: "shoes", label: "Sepatu" },
];

const avatarFieldByStoreCategory: Record<StoreCategory, keyof AvatarConfig | null> = {
  hair: "hairId",
  top: "topId",
  bottom: "bottomId",
  shoes: "shoesId",
  accessory: "accessoryId",
};

function getItemColor(itemId: string): string {
  return avatarOptions.find((option) => option.id === itemId)?.color ?? "#7868F8";
}

function previewAvatar(base: AvatarConfig, item: StoreItem): AvatarConfig {
  const field = avatarFieldByStoreCategory[item.category];
  if (!field) return base;
  return {
    ...base,
    [field]: item.id,
  };
}

function categoryLabel(category: StoreCategory): string {
  const labels: Record<StoreCategory, string> = {
    hair: "Rambut",
    top: "Pakaian",
    bottom: "Bawahan",
    shoes: "Sepatu",
    accessory: "Aksesori",
  };
  return labels[category];
}

export function StorePage() {
  const { state, buyItem, storageMeta } = useDemoStorage();
  const [activeFilter, setActiveFilter] = useState<StoreFilter>("all");
  const [selectedId, setSelectedId] = useState(storeItems[0]?.id ?? "");
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("idle");
  const [message, setMessage] = useState("");

  const filteredItems = useMemo(() => {
    return activeFilter === "all" ? storeItems : storeItems.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const selectedItem = storeItems.find((item) => item.id === selectedId) ?? storeItems[0];
  const isOwned = state.inventory.includes(selectedItem.id);
  const canAfford = state.user.coins >= selectedItem.price;
  const selectedPreview = previewAvatar(state.avatar, selectedItem);

  function selectItem(item: StoreItem) {
    setSelectedId(item.id);
    setPurchaseStatus("idle");
    setMessage("");
  }

  function handlePurchase() {
    if (isOwned) {
      setPurchaseStatus("error");
      setMessage(`${selectedItem.name} sudah dimiliki.`);
      return;
    }

    if (!canAfford) {
      setPurchaseStatus("error");
      setMessage("Koin tidak cukup untuk membeli item ini.");
      return;
    }

    buyItem(selectedItem.id, selectedItem.price, selectedItem.name);
    setPurchaseStatus("success");
    setMessage(`${selectedItem.name} berhasil ditambahkan ke inventory.`);
  }

  return (
    <section className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge tone="prototype">Blok 8 Store Demo</Badge>
          <h1 className="mt-4 text-3xl font-bold text-neutral-950">Toko Avatar</h1>
          <p className="mt-2 max-w-2xl text-neutral-500">
            Gunakan koin demo untuk membuka item avatar. Tidak ada pembayaran uang asli.
          </p>
        </div>
        <div className="grid gap-2 rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold text-neutral-700">Koin Demo</p>
            <p className="inline-flex items-center gap-1 text-neutral-500">
              <Coins size={15} className="text-coin" />
              {formatCoins(state.user.coins)}
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-700">Storage</p>
            <p className="text-neutral-500">{storageMeta.status}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="card">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-neutral-950">Produk</h2>
              <p className="mt-1 text-sm text-neutral-500">Item ini hanya menggunakan koin demo.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`filter-chip shrink-0 ${activeFilter === filter.id ? "filter-chip-active" : ""}`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const itemOwned = state.inventory.includes(item.id);
              const itemAffordable = state.user.coins >= item.price;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`store-card ${selectedItem.id === item.id ? "store-card-active" : ""}`}
                  onClick={() => selectItem(item)}
                >
                  <span className="store-preview" style={{ backgroundColor: getItemColor(item.id) }}>
                    {itemOwned ? <Check size={24} /> : <ShoppingBag size={24} />}
                  </span>
                  <span className="store-card-body">
                    <strong>{item.name}</strong>
                    <small>{categoryLabel(item.category)}</small>
                    <span className="store-price">
                      <Coins size={14} className="text-coin" />
                      {formatCoins(item.price)}
                    </span>
                  </span>
                  {itemOwned ? <Badge tone="success">Owned</Badge> : itemAffordable ? <Badge tone="info">Available</Badge> : <Badge tone="danger">Koin kurang</Badge>}
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 ? (
            <div className="mt-6 rounded-md bg-neutral-50 p-6 text-center text-sm text-neutral-500">
              Belum ada item pada kategori ini.
            </div>
          ) : null}
        </div>

        <aside className="card lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-950">Detail Item</h2>
              <p className="mt-1 text-sm text-neutral-500">Preview item pada avatar sebelum membeli.</p>
            </div>
            {isOwned ? <Badge tone="success">Sudah dimiliki</Badge> : canAfford ? <Badge tone="info">Bisa dibeli</Badge> : <Badge tone="danger">Koin tidak cukup</Badge>}
          </div>

          <div className="mt-5">
            <AvatarPreview avatar={selectedPreview} />
          </div>

          <div className="mt-5 rounded-md border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-950">{selectedItem.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{categoryLabel(selectedItem.category)}</p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-md border border-neutral-200" style={{ backgroundColor: getItemColor(selectedItem.id) }}>
                <Eye size={20} />
              </span>
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-base font-bold text-neutral-950">
              <Coins size={18} className="text-coin" />
              {formatCoins(selectedItem.price)} koin
            </p>
            <p className="mt-3 rounded-md bg-primary-50 p-3 text-sm text-primary-600">
              Item ini hanya menggunakan koin demo.
            </p>
          </div>

          {purchaseStatus !== "idle" ? (
            <div className={`mt-4 rounded-md p-4 text-sm font-medium ${purchaseStatus === "success" ? "bg-success-100 text-green-800" : "bg-danger-100 text-red-800"}`} aria-live="polite">
              {message}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3">
            <Button onClick={handlePurchase} disabled={isOwned || !canAfford}>
              {isOwned ? (
                <>
                  <Check size={18} />
                  Sudah dimiliki
                </>
              ) : !canAfford ? (
                <>
                  <Lock size={18} />
                  Koin tidak cukup
                </>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  Beli dengan {formatCoins(selectedItem.price)} koin
                </>
              )}
            </Button>
            <p className="text-sm text-neutral-500">
              Setelah dibeli, item masuk inventory dan bisa dipilih dari halaman Avatar.
            </p>
          </div>

          <div className="mt-6 rounded-md bg-neutral-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-700">
              <Sparkles size={17} className="text-primary-500" />
              State Transaksi
            </div>
            <ul className="mt-3 space-y-2 text-sm text-neutral-500">
              <li>Owned item tidak bisa dibeli dua kali.</li>
              <li>Koin berkurang saat pembelian berhasil.</li>
              <li>Pembelian gagal bila koin tidak cukup.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
