import { Coins, Hourglass, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { formatCoins } from "../lib/game";
import { useDemoStorage } from "../hooks/useDemoStorage";

interface CoinPackage {
  id: string;
  coins: number;
  priceLabel: string;
  promoLabel?: string;
  bonusLabel?: string;
}

// Prices are illustrative only — there is no payment gateway behind this
// prototype (see PRD Out of Scope). Every purchase action stays disabled and
// honestly labeled "Segera Hadir" instead of pretending to charge anything.
const coinPackages: CoinPackage[] = [
  { id: "starter", coins: 1000, priceLabel: "Rp 15.000" },
  { id: "popular", coins: 5500, priceLabel: "Rp 49.000", promoLabel: "Paling Laris", bonusLabel: "+10% bonus koin" },
  { id: "value", coins: 12000, priceLabel: "Rp 99.000", bonusLabel: "+20% bonus koin" },
  { id: "mega", coins: 26000, priceLabel: "Rp 199.000", promoLabel: "Hemat Maksimal", bonusLabel: "+30% bonus koin" },
];

export function TopUpPage() {
  const { state } = useDemoStorage();

  return (
    <section className="page-shell">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge tone="prototype">Segera Hadir</Badge>
          <h1 className="mt-4 text-3xl font-bold text-neutral-950">Top Up Koin</h1>
          <p className="mt-2 max-w-2xl text-neutral-500">
            Preview paket dan promo top up koin. Prototype ini belum terhubung ke payment gateway sungguhan, jadi pembelian belum bisa diproses.
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm">
          <p className="font-semibold text-neutral-700">Koin Kamu Sekarang</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-lg font-bold text-neutral-950">
            <Coins size={18} className="text-coin" aria-hidden />
            {formatCoins(state.user.coins)}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {coinPackages.map((pack) => (
          <Card key={pack.id} className="flex flex-col gap-4">
            {pack.promoLabel ? (
              <Badge tone="warning">
                <Sparkles size={13} className="mr-1" aria-hidden />
                {pack.promoLabel}
              </Badge>
            ) : null}

            <div>
              <p className="inline-flex items-center gap-2 text-2xl font-bold text-neutral-950">
                <Coins size={22} className="text-coin" aria-hidden />
                {formatCoins(pack.coins)}
              </p>
              {pack.bonusLabel ? <p className="mt-1 text-sm font-medium text-success-500">{pack.bonusLabel}</p> : null}
            </div>

            <p className="text-lg font-bold text-neutral-700">{pack.priceLabel}</p>

            <Button disabled className="mt-auto w-full">
              <Hourglass size={16} aria-hidden />
              Segera Hadir
            </Button>
          </Card>
        ))}
      </div>

      <Card className="mt-8 max-w-2xl bg-primary-50">
        <p className="font-bold text-neutral-950">Pembelian koin dengan uang asli belum tersedia di prototype ini.</p>
        <p className="mt-2 text-sm text-neutral-700">
          Untuk sekarang, koin bisa didapat dengan menyelesaikan misi speaking di{" "}
          <Link to="/app/learn" className="font-semibold text-primary-600 underline underline-offset-2">
            Belajar
          </Link>{" "}
          atau lesson di{" "}
          <Link to="/app/lessons" className="font-semibold text-primary-600 underline underline-offset-2">
            Learning Path
          </Link>
          .
        </p>
      </Card>
    </section>
  );
}
