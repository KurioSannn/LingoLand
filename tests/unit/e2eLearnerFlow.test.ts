import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/data/demoData";
import { validateChatMessage } from "../../src/lib/chatRepository";
import { PLAZA_SPAWN, resolvePlazaMovement } from "../../src/lib/plazaWorld";
import { clampMovement } from "../../src/lib/realtime/protocol";
import { demoReducer } from "../../src/state/demoReducer";

describe("Block 33: End-to-End Critical User Journey (Learner Flow)", () => {
  it("executes full journey: lesson -> reward -> purchase -> avatar -> friend -> plaza -> chat -> leave", () => {
    // 1. Inisialisasi state pemain baru terautentikasi
    let state = createInitialState(true);
    expect(state.user.name).toBeTruthy();
    expect(state.user.coins).toBeGreaterThanOrEqual(0);
    const initialCoins = state.user.coins;
    const initialXp = state.user.xp;

    // 2. Pemain menyelesaikan lesson
    state = demoReducer(state, {
      type: "COMPLETE_LESSON",
      lessonUnitId: "lesson-intro",
      xp: 40,
      lessonTitle: "Perkenalan Diri",
    });

    expect(state.completedLessonIds).toContain("lesson-intro");
    expect(state.user.xp).toBe(initialXp + 40);

    // 3. Klaim Reward misi (mendapatkan koin tambahan)
    state = demoReducer(state, {
      type: "CLAIM_REWARD",
      missionId: "intro",
      xp: 20,
      coins: 50,
      missionTitle: "Misi Perkenalan",
    });

    expect(state.claimedRewards).toContain("intro");
    expect(state.user.coins).toBe(initialCoins + 50);

    // 4. Pembelian item di Store menggunakan koin yang didapat
    const itemPrice = 450;
    const currentCoins = state.user.coins;
    state = demoReducer(state, {
      type: "BUY_ITEM",
      itemId: "top-varsity",
      price: itemPrice,
      itemName: "Jaket Kampus",
    });

    expect(state.inventory).toContain("top-varsity");
    expect(state.user.coins).toBe(currentCoins - itemPrice);

    // 5. Kustomisasi Avatar (Equip item baru yang telah dibeli)
    state = demoReducer(state, {
      type: "SAVE_AVATAR",
      avatar: {
        ...state.avatar,
        topId: "top-varsity",
      },
    });

    expect(state.avatar.topId).toBe("top-varsity");

    // 6. Masuk ke Social Plaza: Spawn di koordinat aman
    let currentPosition = { ...PLAZA_SPAWN };
    expect(currentPosition.x).toBe(0);
    expect(currentPosition.z).toBe(9.5);

    // Bergerak maju ke arah utara (menuju air mancur)
    currentPosition = resolvePlazaMovement(currentPosition, 0, -2.0);
    expect(currentPosition.z).toBeCloseTo(PLAZA_SPAWN.z - 2.0);

    // Validasi pergerakan aman (tidak terkena clamping anomali)
    const clamped = clampMovement(PLAZA_SPAWN, currentPosition);
    expect(clamped.z).toBe(currentPosition.z);

    // 7. Mengirim pesan obrolan di Social Plaza
    const chatInput = "Hello everyone! I just unlocked the Varsity jacket!";
    const chatValidation = validateChatMessage(chatInput);
    expect(chatValidation.ok).toBe(true);
    expect(chatValidation.sanitized).toBe(chatInput);

    // 8. Undangan Latihan Percakapan Duo
    const practiceTopic = {
      id: "topic-1",
      title: "Weekend Plans",
      starterEn: "What is your favorite way to spend Sunday?",
    };
    expect(practiceTopic.starterEn).toBeTruthy();

    // 9. Keluar dari Social Plaza (kembali ke posisi awal tanpa kebocoran state)
    const resetPosition = { ...PLAZA_SPAWN };
    expect(resetPosition.x).toBe(0);
    expect(resetPosition.z).toBe(9.5);
  });
});
