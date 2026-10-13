import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadActor } from "@/server/auth/actor";
import { AuthorizationError, type Actor } from "@/server/auth/permissions";
import { runInTransaction } from "@/server/db/client";
import { DomainError } from "@/server/errors";
import { approveReleaseGate, revokeReleaseGate } from "@/server/services/release-gates";
import { inviteUser, setUserStatus } from "@/server/services/users";

import { appHandle, asOrg, seedOrg, type SeededOrg } from "./helpers";

const { db, close } = appHandle();
let org: SeededOrg;

beforeAll(async () => {
  org = await seedOrg(db);
});
afterAll(() => close());

async function failure(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error, "expected the call to fail").toBeDefined();
  return error as AuthorizationError | DomainError;
}

const count = async (query: ReturnType<typeof sql>) => {
  const [row] = await asOrg(db, org.orgId, (tx) => tx.execute<{ n: number }>(query));
  return row!.n;
};
const gateApprovals = (gateKey: string) =>
  count(sql`select count(*)::int as n from app.approvals a join app.release_gates g on g.id = a.subject_id
    where a.subject_type = 'RELEASE_GATE' and g.gate_key = ${gateKey}`);
const auditCount = (action: string) =>
  count(sql`select count(*)::int as n from app.audit_events where action = ${action}`);

describe("bootstrap and P-01 user administration", () => {
  it("audits bootstrap, invite and activation with the acting role", async () => {
    const rows = await asOrg(db, org.orgId, (tx) =>
      tx.execute<{ action: string; actor_role: string | null }>(
        sql`select action, actor_role from app.audit_events order by occurred_at, action`,
      ),
    );
    expect(rows.map((row) => [row.action, row.actor_role])).toEqual(
      expect.arrayContaining([
        ["organization.bootstrap", null],
        ["user.invite", "DIRECTOR"],
        ["user.activate", "DIRECTOR"],
      ]),
    );
  });

  it("denies the accountant inviting or disabling users", async () => {
    const invite = await failure(
      inviteUser(
        db,
        org.accountant,
        { userId: randomUUID(), displayName: "X", role: "ACCOUNTANT" },
        randomUUID(),
      ),
    );
    expect(invite).toBeInstanceOf(AuthorizationError);
    expect(invite.code).toBe("FORBIDDEN");
    const disable = await failure(
      setUserStatus(
        db,
        org.accountant,
        { userId: org.director.userId, status: "DISABLED" },
        randomUUID(),
      ),
    );
    expect(disable.code).toBe("FORBIDDEN");
  });

  it("requires MFA for writes", async () => {
    const noMfa: Actor = { ...org.director, mfaVerified: false };
    const error = await failure(
      setUserStatus(db, noMfa, { userId: org.accountant.userId, status: "DISABLED" }, randomUUID()),
    );
    expect(error.code).toBe("MFA_REQUIRED");
  });

  it("allows only one personal account per role", async () => {
    const error = await failure(
      inviteUser(
        db,
        org.director,
        { userId: randomUUID(), displayName: "Second", role: "ACCOUNTANT" },
        randomUUID(),
      ),
    );
    expect(error.code).toBe("ROLE_ALREADY_HELD");
  });

  it("refuses self-disable", async () => {
    const error = await failure(
      setUserStatus(
        db,
        org.director,
        { userId: org.director.userId, status: "DISABLED" },
        randomUUID(),
      ),
    );
    expect(error.code).toBe("SELF_STATUS_CHANGE");
  });

  it("locks out a disabled user, including a stale in-memory actor", async () => {
    await setUserStatus(
      db,
      org.director,
      { userId: org.accountant.userId, status: "DISABLED" },
      randomUUID(),
    );
    const reload = await failure(loadActor(db, org.accountant.userId, { mfaVerified: true }));
    expect(reload.code).toBe("ACCOUNT_INACTIVE");
    const stale = await failure(
      approveReleaseGate(db, org.accountant, { gateKey: "VG-02" }, randomUUID()),
    );
    expect(stale.code).toBe("ACCOUNT_INACTIVE");
    await setUserStatus(
      db,
      org.director,
      { userId: org.accountant.userId, status: "ACTIVE" },
      randomUUID(),
    );
    const active = await loadActor(db, org.accountant.userId, { mfaVerified: true });
    expect(active.role).toBe("ACCOUNTANT");
  });
});

describe("P-07 release gates", () => {
  it("lets only the DIRECTOR approve RG gates and VG-18", async () => {
    expect(
      (await failure(approveReleaseGate(db, org.accountant, { gateKey: "RG-03" }, randomUUID())))
        .code,
    ).toBe("FORBIDDEN");
    expect(
      (await failure(approveReleaseGate(db, org.accountant, { gateKey: "VG-18" }, randomUUID())))
        .code,
    ).toBe("FORBIDDEN");
    const result = await approveReleaseGate(db, org.director, { gateKey: "RG-00" }, randomUUID());
    expect(result).toMatchObject({ status: "APPROVED", replayed: false });
  });

  it("lets only the ACCOUNTANT approve ordinary VG gates", async () => {
    expect(
      (await failure(approveReleaseGate(db, org.director, { gateKey: "VG-01" }, randomUUID())))
        .code,
    ).toBe("FORBIDDEN");
    const result = await approveReleaseGate(db, org.accountant, { gateKey: "VG-01" }, randomUUID());
    expect(result.status).toBe("APPROVED");
  });

  it("needs both roles for a joint gate and invalidates approvals on revoke", async () => {
    const first = await approveReleaseGate(db, org.director, { gateKey: "VG-06" }, randomUUID());
    expect(first.status).toBe("EVIDENCE_PENDING");
    const again = await failure(
      approveReleaseGate(db, org.director, { gateKey: "VG-06" }, randomUUID()),
    );
    expect(again.code).toBe("GATE_ALREADY_APPROVED");
    const second = await approveReleaseGate(db, org.accountant, { gateKey: "VG-06" }, randomUUID());
    expect(second.status).toBe("APPROVED");

    const revoked = await revokeReleaseGate(
      db,
      org.director,
      { gateKey: "VG-06", comment: "Test" },
      randomUUID(),
    );
    expect(revoked.status).toBe("REVOKED");
    const live = await count(sql`select count(*)::int as n from app.approvals
      where subject_id = ${second.gateId} and decision = 'APPROVED'`);
    expect(live).toBe(0);
  });
});

describe("idempotency (DATABASE_TRANSACTION_BOUNDARIES §2.4)", () => {
  it("replays the same key and payload without a second write", async () => {
    const key = randomUUID();
    const first = await approveReleaseGate(db, org.director, { gateKey: "RG-01" }, key);
    const second = await approveReleaseGate(db, org.director, { gateKey: "RG-01" }, key);
    expect(first.replayed).toBe(false);
    expect(second).toEqual({ ...first, replayed: true });
    expect(await gateApprovals("RG-01")).toBe(1);
  });

  it("rejects the same key with a different payload or operation with 409", async () => {
    const key = randomUUID();
    await approveReleaseGate(db, org.accountant, { gateKey: "VG-03" }, key);
    const payload = await failure(
      approveReleaseGate(db, org.accountant, { gateKey: "VG-04" }, key),
    );
    expect(payload).toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", status: 409 });
    const operation = await failure(
      revokeReleaseGate(db, org.accountant, { gateKey: "VG-03" }, key),
    );
    expect(operation.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(await gateApprovals("VG-04")).toBe(0);
  });

  it("serializes a concurrent double submit into one write and one replay", async () => {
    const key = randomUUID();
    const before = await auditCount("release_gate.approve");
    const results = await Promise.all([
      approveReleaseGate(db, org.accountant, { gateKey: "VG-05" }, key),
      approveReleaseGate(db, org.accountant, { gateKey: "VG-05" }, key),
    ]);
    expect(results.map((result) => result.replayed).sort()).toEqual([false, true]);
    expect(await gateApprovals("VG-05")).toBe(1);
    expect(await auditCount("release_gate.approve")).toBe(before + 1);
  });

  it("rejects malformed keys", async () => {
    const error = await failure(
      approveReleaseGate(db, org.accountant, { gateKey: "VG-07" }, "abc"),
    );
    expect(error.code).toBe("IDEMPOTENCY_KEY_INVALID");
  });

  it("leaves no key behind when the business transaction fails", async () => {
    const key = randomUUID();
    await failure(approveReleaseGate(db, org.director, { gateKey: "RG-00" }, key));
    const keys = await count(
      sql`select count(*)::int as n from app.idempotency_keys where key = ${key}`,
    );
    expect(keys).toBe(0);
  });
});

describe("transaction wrapper", () => {
  it("retries retryable SQLSTATEs and then succeeds", async () => {
    let attempts = 0;
    const result = await runInTransaction(db, { orgId: org.orgId }, async (tx) => {
      attempts += 1;
      const [row] = await tx.execute<{ org: string; lock: string }>(
        sql`select current_setting('app.org_id') as org, current_setting('lock_timeout') as lock`,
      );
      if (attempts < 3) throw Object.assign(new Error("simulated deadlock"), { code: "40P01" });
      return row;
    });
    expect(attempts).toBe(3);
    expect(result).toEqual({ org: org.orgId, lock: "5s" });
  });

  it("does not retry business failures", async () => {
    let attempts = 0;
    await failure(
      runInTransaction(db, { orgId: org.orgId }, async () => {
        attempts += 1;
        throw new DomainError("TEST", "Gabim biznesi");
      }),
    );
    expect(attempts).toBe(1);
  });

  it("scopes settings to the transaction", async () => {
    await runInTransaction(db, { orgId: org.orgId }, async () => undefined);
    const [row] = await db.execute<{ org: string | null }>(
      sql`select nullif(current_setting('app.org_id', true), '') as org`,
    );
    expect(row?.org ?? null).toBeNull();
  });
});
