import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb } from "../src/db/schema.js";
import {
  registerAnalyst,
  getAnalystById,
  getAnalystByWallet,
  getAnalystByAffiliateCode,
  listAnalysts,
  deactivateAnalyst,
} from "../src/services/registry.js";
import type Database from "better-sqlite3";

let db: Database.Database;

beforeEach(() => {
  db = getTestDb();
});

describe("registerAnalyst", () => {
  it("registers a new analyst with unique affiliate code", () => {
    const analyst = registerAnalyst(db, {
      walletAddress: "WALLET_A1111111111111111111111111111111111",
      name: "AlphaBot",
      description: "Momentum trader",
    });

    expect(analyst.id).toBeTruthy();
    expect(analyst.walletAddress).toBe("WALLET_A1111111111111111111111111111111111");
    expect(analyst.name).toBe("AlphaBot");
    expect(analyst.affiliateCode).toBeTruthy();
    expect(analyst.isActive).toBe(true);
    expect(analyst.referredBy).toBeUndefined();
  });

  it("throws on duplicate wallet address", () => {
    const wallet = "WALLET_DUP_11111111111111111111111111111111";
    registerAnalyst(db, { walletAddress: wallet, name: "Bot A", description: "" });

    expect(() =>
      registerAnalyst(db, { walletAddress: wallet, name: "Bot B", description: "" })
    ).toThrow("already registered");
  });

  it("accepts referral with valid affiliate code", () => {
    const referrer = registerAnalyst(db, {
      walletAddress: "WALLET_REF_11111111111111111111111111111111",
      name: "Referrer",
      description: "",
    });

    const referred = registerAnalyst(db, {
      walletAddress: "WALLET_REFERRD11111111111111111111111111",
      name: "NewAnalyst",
      description: "",
      referredBy: referrer.affiliateCode,
    });

    expect(referred.referredBy).toBe(referrer.affiliateCode);
  });

  it("throws on invalid referral code", () => {
    expect(() =>
      registerAnalyst(db, {
        walletAddress: "WALLET_BAD_1111111111111111111111111111111",
        name: "Bot",
        description: "",
        referredBy: "INVALID-CODE",
      })
    ).toThrow("Invalid referral code");
  });

  it("generates unique affiliate codes for different analysts", () => {
    const a1 = registerAnalyst(db, { walletAddress: "WALLET111111111111111111111111111111111A", name: "Bot A", description: "" });
    const a2 = registerAnalyst(db, { walletAddress: "WALLET111111111111111111111111111111111B", name: "Bot B", description: "" });
    expect(a1.affiliateCode).not.toBe(a2.affiliateCode);
  });
});

describe("getAnalystById", () => {
  it("returns analyst by id", () => {
    const a = registerAnalyst(db, { walletAddress: "WALLET_GET_111111111111111111111111111111", name: "Getter", description: "" });
    const found = getAnalystById(db, a.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Getter");
  });

  it("returns null for unknown id", () => {
    expect(getAnalystById(db, "nonexistent")).toBeNull();
  });
});

describe("getAnalystByWallet", () => {
  it("returns analyst by wallet address", () => {
    const wallet = "WALLET_BYWALLET11111111111111111111111111";
    registerAnalyst(db, { walletAddress: wallet, name: "WalletBot", description: "" });
    const found = getAnalystByWallet(db, wallet);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("WalletBot");
  });
});

describe("getAnalystByAffiliateCode", () => {
  it("returns analyst by affiliate code", () => {
    const a = registerAnalyst(db, { walletAddress: "WALLET_AFFIL111111111111111111111111111", name: "AffBot", description: "" });
    const found = getAnalystByAffiliateCode(db, a.affiliateCode);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(a.id);
  });
});

describe("listAnalysts", () => {
  it("returns all active analysts", () => {
    registerAnalyst(db, { walletAddress: "WALLET_L1111111111111111111111111111111111", name: "L1", description: "" });
    registerAnalyst(db, { walletAddress: "WALLET_L2222222222222222222222222222222222", name: "L2", description: "" });
    const list = listAnalysts(db, { activeOnly: true });
    expect(list.length).toBe(2);
  });

  it("excludes deactivated when activeOnly=true", () => {
    const a = registerAnalyst(db, { walletAddress: "WALLET_DEACT1111111111111111111111111111", name: "Deact", description: "" });
    deactivateAnalyst(db, a.id);
    const list = listAnalysts(db, { activeOnly: true });
    expect(list.find((x) => x.id === a.id)).toBeUndefined();
  });
});

describe("deactivateAnalyst", () => {
  it("deactivates an analyst", () => {
    const a = registerAnalyst(db, { walletAddress: "WALLET_DEACT2222222222222222222222222222", name: "ToDeact", description: "" });
    const ok = deactivateAnalyst(db, a.id);
    expect(ok).toBe(true);
    const found = getAnalystById(db, a.id);
    expect(found!.isActive).toBe(false);
  });
});
