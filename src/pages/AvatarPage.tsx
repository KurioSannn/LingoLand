import { Check, Coins, Lock, RotateCcw, Save, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AvatarPreview } from "../components/three/AvatarPreview";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { avatarOptions } from "../data/demoData";
import { formatCoins } from "../lib/game";
import { useDemoStorage } from "../hooks/useDemoStorage";
import type { AvatarConfig, AvatarOption, StoreCategory } from "../types";

type AvatarCategory = "skin" | StoreCategory;
type ItemState = "selected" | "owned" | "purchasable" | "insufficient" | "locked";

const categories: Array<{ id: AvatarCategory; label: string }> = [
  { id: "skin", label: "Wajah" },
  { id: "hair", label: "Rambut" },
  { id: "top", label: "Atasan" },
  { id: "bottom", label: "Bawahan" },
  { id: "shoes", label: "Sepatu" },
  { id: "accessory", label: "Aksesori" },
];

const avatarFieldByCategory: Record<AvatarCategory, keyof AvatarConfig> = {
  skin: "skinToneId",
  hair: "hairId",
  top: "topId",
  bottom: "bottomId",
  shoes: "shoesId",
  accessory: "accessoryId",
};

const lockedPreviewItems: Record<AvatarCategory, Array<{ id: string; label: string }>> = {
  skin: [],
  hair: [{ id: "hair-gradient", label: "Gradient Hair" }],
  top: [],
  bottom: [],
  shoes: [],
  accessory: [{ id: "accessory-headset", label: "Headset Speaking" }],
};

function isSameAvatar(a: AvatarConfig, b: AvatarConfig): boolean {
  return (
    a.skinToneId === b.skinToneId &&
    a.hairId === b.hairId &&
    a.topId === b.topId &&
    a.bottomId === b.bottomId &&
    a.shoesId === b.shoesId &&
    a.accessoryId === b.accessoryId
  );
}

function getItemState(option: AvatarOption, draft: AvatarConfig, inventory: string[], coins: number): ItemState {
  const selectedId = draft[avatarFieldByCategory[option.category]];
  if (selectedId === option.id) return "selected";
  if (option.category === "skin" || inventory.includes(option.id)) return "owned";
  if (option.price && coins < option.price) return "insufficient";
  if (option.price) return "purchasable";
  return "locked";
}

function stateBadge(state: ItemState) {
  if (state === "selected") return <Badge tone="success">Selected</Badge>;
  if (state === "owned") return <Badge tone="info">Owned</Badge>;
  if (state === "purchasable") return <Badge tone="warning">Blok 8 Store</Badge>;
  if (state === "insufficient") return <Badge tone="danger">Koin tidak cukup</Badge>;
  return <Badge tone="neutral">Locked</Badge>;
}

export function AvatarPage() {
  const { state, saveAvatar, storageMeta } = useDemoStorage();
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>("skin");
  const [draft, setDraft] = useState<AvatarConfig>(state.avatar);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    setDraft(state.avatar);
  }, [state.avatar]);

  const currentOptions = useMemo(
    () => avatarOptions.filter((option) => option.category === activeCategory),
    [activeCategory],
  );

  const hasChanges = !isSameAvatar(draft, state.avatar);

  function selectOption(option: AvatarOption) {
    const itemState = getItemState(option, draft, state.inventory, state.user.coins);
    if (itemState === "locked" || itemState === "purchasable" || itemState === "insufficient") return;

    const field = avatarFieldByCategory[option.category];
    setDraft((current) => ({
      ...current,
      [field]: option.id,
    }));
    setStatus("idle");
  }

  function removeAccessory() {
    setDraft((current) => ({ ...current, accessoryId: null }));
    setStatus("idle");
  }

  function resetDraft() {
    setDraft(state.avatar);
    setStatus("idle");
  }

  function handleSave() {
    if (!hasChanges) return;
    setStatus("saving");
    saveAvatar(draft);
    setStatus("saved");
  }

  return (
    <section className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge tone="prototype">Blok 7 Avatar Customizer</Badge>
          <h1 className="mt-4 text-3xl font-bold text-neutral-950">Atur Avatar</h1>
          <p className="mt-2 max-w-2xl text-neutral-500">
            Pilih item yang sudah dimiliki, simpan konfigurasi, lalu reload untuk memastikan avatar tetap tersimpan di localStorage.
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm">
          <p className="font-semibold text-neutral-700">Storage</p>
          <p className="text-neutral-500">{storageMeta.status}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="card min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-950">Preview Avatar</h2>
              <p className="mt-1 text-sm text-neutral-500">Drag untuk memutar, scroll untuk zoom terbatas.</p>
            </div>
            {status === "saved" ? <Badge tone="success">Avatar berhasil disimpan</Badge> : null}
            {status === "saving" ? <Badge tone="info">Menyimpan...</Badge> : null}
          </div>
          <div className="mt-5">
            <AvatarPreview avatar={draft} />
          </div>

          <div className="mt-5 grid gap-3 rounded-md bg-neutral-50 p-4 text-sm sm:grid-cols-2">
            <p><strong>Skin:</strong> {draft.skinToneId}</p>
            <p><strong>Hair:</strong> {draft.hairId}</p>
            <p><strong>Top:</strong> {draft.topId}</p>
            <p><strong>Accessory:</strong> {draft.accessoryId ?? "Tidak Ada"}</p>
          </div>
        </div>

        <div className="card min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-950">Pilihan Item</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Koin demo: <strong>{formatCoins(state.user.coins)}</strong>
              </p>
            </div>
            <ShoppingBag className="text-primary-500" size={26} aria-hidden />
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`filter-chip shrink-0 ${activeCategory === category.id ? "filter-chip-active" : ""}`}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {activeCategory === "accessory" ? (
              <button
                type="button"
                className={`avatar-item-tile ${draft.accessoryId === null ? "avatar-item-selected" : ""}`}
                onClick={removeAccessory}
              >
                <span className="avatar-swatch avatar-swatch-none">None</span>
                <span className="min-w-0">
                  <strong>Tidak Ada</strong>
                  <small>Default</small>
                </span>
                {draft.accessoryId === null ? <Check size={18} className="text-success-500" /> : null}
              </button>
            ) : null}

            {currentOptions.map((option) => {
              const itemState = getItemState(option, draft, state.inventory, state.user.coins);
              const isDisabled = itemState === "locked" || itemState === "purchasable" || itemState === "insufficient";

              return (
                <button
                  key={option.id}
                  type="button"
                  className={`avatar-item-tile ${itemState === "selected" ? "avatar-item-selected" : ""}`}
                  onClick={() => selectOption(option)}
                  disabled={isDisabled}
                  aria-label={`${option.label}, ${itemState}`}
                >
                  <span className="avatar-swatch" style={{ backgroundColor: option.color }} />
                  <span className="min-w-0">
                    <strong>{option.label}</strong>
                    <small>
                      {option.price ? (
                        <>
                          <Coins size={13} aria-hidden />
                          {formatCoins(option.price)}
                        </>
                      ) : "Default"}
                    </small>
                  </span>
                  {itemState === "selected" ? <Check size={18} className="text-success-500" /> : stateBadge(itemState)}
                </button>
              );
            })}

            {lockedPreviewItems[activeCategory].map((item) => (
              <button key={item.id} type="button" className="avatar-item-tile" disabled>
                <span className="avatar-swatch avatar-swatch-locked">
                  <Lock size={18} />
                </span>
                <span className="min-w-0">
                  <strong>{item.label}</strong>
                  <small>Segera Hadir</small>
                </span>
                <Badge tone="neutral">Locked</Badge>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-md bg-primary-50 p-4 text-sm text-primary-600">
            Item berbayar belum bisa dipakai langsung di Blok 7. Pembelian lokal pakai koin demo dikerjakan di Blok 8 Store.
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleSave} disabled={!hasChanges || status === "saving"}>
              <Save size={18} />
              {status === "saving" ? "Menyimpan..." : "Simpan Avatar"}
            </Button>
            <Button variant="secondary" onClick={resetDraft} disabled={!hasChanges}>
              <RotateCcw size={18} />
              Batalkan Perubahan
            </Button>
          </div>

          {!hasChanges ? (
            <p className="mt-3 text-sm text-neutral-500">Belum ada perubahan.</p>
          ) : (
            <p className="mt-3 text-sm font-medium text-primary-600">Ada perubahan yang belum disimpan.</p>
          )}
        </div>
      </div>
    </section>
  );
}
