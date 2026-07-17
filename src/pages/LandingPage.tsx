import {
  ArrowRight,
  ChevronDown,
  Coins,
  MessageCircle,
  Menu,
  Mic,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { FriendAvatar } from "../components/ui/FriendAvatar";
import { Reveal } from "../components/ui/Reveal";
import { LandingAvatarScene } from "../components/three/LandingAvatarScene";
import { DEMO_EMAIL, friends, npcs, storeItems } from "../data/demoData";
import { formatCoins } from "../lib/game";
import { useDismissable } from "../hooks/useDismissable";
import type { AvatarConfig } from "../types";
import { AvatarFigure } from "../components/ui/AvatarFigure";

const sectionLinks = [
  { href: "#benefit", label: "Kenapa Lingoland" },
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#karakter", label: "Karakter" },
  { href: "#mini-home", label: "Mini Home" },
];

const benefits = [
  {
    icon: ShieldCheck,
    blob: "icon-blob-coral",
    title: "Berlatih Tanpa Tekanan",
    description: "Tidak ada penilaian yang mempermalukan. Kamu berlatih bersama karakter simulasi di ruang yang aman.",
  },
  {
    icon: MessageCircle,
    blob: "icon-blob-purple",
    title: "Percakapan Sesuai Situasi Nyata",
    description: "Misi speaking dibuat dari situasi sehari-hari: perkenalan, hobi, dan rencana akhir pekan.",
  },
  {
    icon: Mic,
    blob: "icon-blob-yellow",
    title: "Bantuan Kalimat Ketika Buntu",
    description: "Setiap misi punya contoh kalimat siap pakai. Kamu bisa menjawab lewat teks atau mikrofon.",
  },
  {
    icon: TrendingUp,
    blob: "icon-blob-green",
    title: "Progress yang Terlihat",
    description: "XP, koin, dan level tersimpan secara lokal sehingga kamu tahu sejauh mana latihanmu berjalan.",
  },
];

const howItWorks = ["Buat Avatar", "Pilih Misi", "Masuk Mini Home", "Mulai Percakapan"];

const stepColors = ["bg-[#ff7b74]", "bg-primary-500", "bg-success-500", "bg-[#2b2140]"];

const npcAvatars: Record<string, AvatarConfig> = {
  bintang: {
    skinToneId: "skin-medium",
    hairId: "hair-short-black",
    topId: "top-hoodie-lavender",
    bottomId: "bottom-dark-pants",
    shoesId: "shoes-white",
    accessoryId: "accessory-mini-home-cap",
  },
  lala: {
    skinToneId: "skin-light",
    hairId: "hair-bob-brown",
    topId: "top-basic-tee",
    bottomId: "bottom-casual-skirt",
    shoesId: "shoes-white",
    accessoryId: null,
  },
  benny: {
    skinToneId: "skin-tan",
    hairId: "hair-curly-dark",
    topId: "top-varsity",
    bottomId: "bottom-blue-jeans",
    shoesId: "shoes-black",
    accessoryId: "accessory-round-glasses",
  },
};

const npcCardStyles = ["npc-card-yellow", "npc-card-purple", "npc-card-green"];

export function LandingPage() {
  const mobileMenu = useDismissable<HTMLDivElement>();

  return (
    <main className="min-h-screen bg-neutral-50">
      <section id="hero" className="landing-hero">
        <header className="landing-nav">
          <a href="#hero" className="landing-logo" aria-label="Lingoland beranda">
            <span>LINGO</span>
            <strong>LAND</strong>
          </a>

          <nav className="landing-nav-center" aria-label="Navigasi landing">
            <a href="#benefit">BELAJAR</a>
            <a href="#mini-home">DUNIA</a>
          </nav>

          <div className="landing-nav-actions">
            <Link to="/login" className="landing-outline-button">
              COBA DEMO
              <ChevronDown size={18} aria-hidden />
            </Link>
            <div className="menu-container lg:hidden" ref={mobileMenu.containerRef}>
              <button
                className="landing-menu-button"
                type="button"
                onClick={() => mobileMenu.setIsOpen((current) => !current)}
                aria-label={mobileMenu.isOpen ? "Tutup menu" : "Buka menu"}
                aria-haspopup="menu"
                aria-expanded={mobileMenu.isOpen}
              >
                {mobileMenu.isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              {mobileMenu.isOpen ? (
                <div className="menu-panel" role="menu" aria-label="Menu landing">
                  {sectionLinks.map((link) => (
                    <a key={link.href} href={link.href} className="menu-item" role="menuitem" onClick={() => mobileMenu.setIsOpen(false)}>
                      {link.label}
                    </a>
                  ))}
                  <Link to="/login" className="menu-item" role="menuitem">
                    Masuk
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="landing-hero-inner">
          <h1 className="sr-only">Lingoland, latihan speaking bahasa Inggris berbasis avatar dan Mini Home.</h1>
          <div className="landing-superword" aria-hidden>
            <div className="landing-superword-track">
              <span>LINGOLAND</span>
              <span>LINGOLAND</span>
            </div>
          </div>

          <div className="landing-mascot-stage" aria-label="Avatar Lingoland">
            <div className="landing-starburst">
              <span>Berani<br />bicara<br />hari ini</span>
            </div>
            <div className="landing-speech">
              <span>Want to practice English?</span>
            </div>
            <div className="landing-avatar-wrap">
              <div className="landing-avatar-pop">
                <div className="landing-avatar-bob">
                  <LandingAvatarScene />
                </div>
              </div>
            </div>
          </div>

          <div className="landing-cta-row" aria-label="Aksi utama">
            <Link to="/login" className="landing-pill-cta">
              <span><ChevronDown size={22} /></span>
              PLAY DEMO
            </Link>
            <a href="#karakter" className="landing-pill-cta">
              <span><ChevronDown size={22} /></span>
              MY NPC FRIENDS
            </a>
            <a href="#mini-home" className="landing-pill-cta">
              <span><ChevronDown size={22} /></span>
              MINI HOME
            </a>
          </div>
        </div>
      </section>

      <section className="landing-facts-section" aria-label="Fun facts Lingoland">
        <Reveal variant="up">
          <div className="landing-facts-card">
            <h2>Fun facts<br />about Lingoland</h2>
            <dl>
              <div>
                <dt>Demo:</dt>
                <dd>satu akun lokal untuk mencoba seluruh alur prototype.</dd>
              </div>
              <div>
                <dt>Fav Room:</dt>
                <dd>Mini Home, tempat avatar berjalan dan menyapa NPC.</dd>
              </div>
              <div>
                <dt>Fav Mission:</dt>
                <dd>Perkenalan Diri, karena kalimat pertama harus terasa aman.</dd>
              </div>
            </dl>
          </div>
        </Reveal>
      </section>

      <section id="benefit" className="page-shell py-16 lg:py-24">
        <Reveal variant="up">
          <h2 className="landing-section-heading max-w-3xl">Latihan speaking yang terasa aman</h2>
        </Reveal>
        <div className="mt-12 grid gap-10">
          {benefits.map((benefit, index) => (
            <Reveal key={benefit.title} variant={index % 2 === 1 ? "right" : "left"}>
              <div className={`landing-benefit-row flex flex-col gap-6 sm:items-center md:flex-row ${index % 2 === 1 ? "md:flex-row-reverse md:text-right" : ""}`}>
                <div className={`icon-blob ${benefit.blob}`}>
                  <benefit.icon size={34} aria-hidden />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#2b2140]">{benefit.title}</h3>
                  <p className="mt-2 max-w-xl text-lg leading-8 text-neutral-500">{benefit.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="cara-kerja" className="border-y border-neutral-200 bg-white py-16 lg:py-24">
        <div className="page-shell">
          <Reveal variant="up">
            <h2 className="landing-section-heading">Cara Kerja</h2>
          </Reveal>
          <ol className="mt-12 flex flex-col gap-4 lg:flex-row lg:items-center">
            {howItWorks.map((step, index) => (
              <li key={step} className="flex items-center gap-4 lg:flex-1">
                <Reveal variant="up" delay={index * 120} className="flex flex-1 items-center gap-4">
                  <span className="step-card">
                    <span className={`step-number ${stepColors[index]}`}>{index + 1}</span>
                    {step}
                  </span>
                  {index < howItWorks.length - 1 ? <ArrowRight size={24} className="hidden shrink-0 text-neutral-300 lg:block" aria-hidden /> : null}
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="karakter" className="landing-friends-section">
        <div className="page-shell relative z-10">
          <Reveal variant="up">
            <div className="text-center">
              <h2 className="landing-section-heading">Meet Your NPC Friends</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-neutral-500">
                Tiga karakter simulasi menunggumu di Mini Home. Masing-masing membawa misi percakapan yang berbeda.
              </p>
            </div>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-3 sm:gap-6">
            {npcs.map((npc, index) => (
              <Reveal key={npc.id} variant="pop" delay={index * 140} className="h-full">
                <div className={`npc-card ${npcCardStyles[index]}`}>
                  <div className="npc-card-avatar">
                    <AvatarFigure avatar={npcAvatars[npc.id]} size="large" label={`Karakter ${npc.name}`} />
                  </div>
                  <h3 className="npc-card-name">{npc.name}</h3>
                  <p className="npc-card-zone">{npc.zone}</p>
                  <p className="npc-card-personality">{npc.personality}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="relative z-10 mt-16 text-center text-sm font-semibold text-[#2b2140]">
            Karakter lain dalam versi demo merupakan simulasi.
          </p>
        </div>
      </section>

      <section id="mini-home" className="border-y border-neutral-200 bg-white py-16 lg:py-24">
        <div className="page-shell grid items-center gap-12 lg:grid-cols-2">
          <Reveal variant="left">
            <Badge tone="prototype">Prototype Interaksi</Badge>
            <h2 className="landing-section-heading mt-4">Mini Home, Ruang Latihanmu</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-500">
              Jelajahi satu room, dekati karakter, dan mulai percakapan terarah. Kamu bisa berjalan dengan keyboard atau kontrol sentuh, bertemu NPC, dan menyelesaikan misi speaking.
            </p>
            <Link to="/login" className="landing-pill-cta mt-8">
              <span><ChevronDown size={22} /></span>
              COBA MINI HOME
            </Link>
          </Reveal>
          <Reveal variant="right">
            <div className="landing-world-panel">
              <div>
                <Sparkles size={44} className="mx-auto" aria-hidden />
                <p className="mt-5 text-2xl font-black uppercase leading-tight">Satu room. Tiga zona. Tiga percakapan.</p>
                <p className="mt-3 text-sm font-semibold opacity-90">Ruang tamu, area belajar, dan taman kecil.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="page-shell grid gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <Reveal variant="left" className="h-full">
          <Card className="h-full">
            <h2 className="text-2xl font-black uppercase text-[#2b2140]">Teman Belajar</h2>
            <p className="mt-2 text-sm text-neutral-500">Simulasi teman belajar — bukan pengguna real-time.</p>
            <ul className="mt-5 flex flex-col gap-4">
              {friends.slice(0, 4).map((friend) => (
                <li key={friend.id} className="flex items-center gap-3">
                  <FriendAvatar name={friend.name} color={friend.color} online={friend.online} />
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{friend.name}</p>
                    <p className="text-sm text-neutral-500">{friend.activity}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
        <Reveal variant="right" className="h-full">
          <Card className="h-full">
            <h2 className="text-2xl font-black uppercase text-[#2b2140]">Toko Avatar</h2>
            <p className="mt-2 text-sm text-neutral-500">Item ini hanya menggunakan koin demo.</p>
            <ul className="mt-5 grid grid-cols-2 gap-4">
              {storeItems.slice(0, 4).map((item) => (
                <li key={item.id} className="rounded-md border border-neutral-200 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-layer">
                  <p className="text-sm font-semibold text-neutral-950">{item.name}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-neutral-700">
                    <Coins size={14} className="text-coin" aria-hidden />
                    {formatCoins(item.price)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </section>

      <section className="landing-final-cta">
        <span className="landing-final-star" aria-hidden />
        <Reveal variant="pop">
          <div className="page-shell">
            <h2 className="text-4xl font-black uppercase leading-none sm:text-5xl lg:text-6xl">
              Mulai Percakapan
              <br />
              Pertamamu Hari Ini
            </h2>
            <Link to="/login" className="landing-pill-cta-light mt-10">
              <span><ChevronDown size={22} /></span>
              MASUK SEBAGAI DEMO
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <div className="page-shell grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="max-w-sm">
            <p className="landing-logo">
              <span>LINGO</span>
              <strong>LAND</strong>
            </p>
            <p className="mt-4 text-sm font-semibold leading-6 opacity-80">
              Berani Bicara, Satu Percakapan Sekaligus. Prototype latihan speaking berbasis avatar dan Mini Home.
            </p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide opacity-60">
              Progress demo disimpan lokal di browser.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">Navigasi</h2>
            <nav className="mt-4 flex flex-col gap-3 text-sm font-semibold opacity-80" aria-label="Navigasi footer">
              <a href="#hero" className="transition hover:opacity-100">Landing</a>
              <a href="#benefit" className="transition hover:opacity-100">Benefit</a>
              <a href="#karakter" className="transition hover:opacity-100">Karakter</a>
              <a href="#mini-home" className="transition hover:opacity-100">Mini Home</a>
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">Demo</h2>
            <div className="mt-4 rounded-md border border-white/15 p-4 text-sm">
              <p className="font-semibold opacity-70">Email</p>
              <p className="mt-1 break-all font-bold">{DEMO_EMAIL}</p>
              <Link to="/login" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-black text-[#160d2d] transition hover:bg-primary-50">
                Masuk Demo
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">Status MVP</h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm font-semibold opacity-80">
              <li>NPC adalah simulasi.</li>
              <li>Multiplayer belum tersedia.</li>
              <li>Backend dan Supabase belum terhubung.</li>
              <li>Voice room real-time belum tersedia.</li>
            </ul>
          </div>
        </div>
        <div className="page-shell border-t border-white/10 py-5 text-xs font-semibold uppercase tracking-wide opacity-60">
          Lingoland MVP Prototype. Dibuat untuk demo produk dan validasi core flow.
        </div>
      </footer>
    </main>
  );
}
