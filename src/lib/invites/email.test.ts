import { test } from "node:test";
import assert from "node:assert/strict";
import { inviteEmail, isRefusedSignUp } from "./email";

test("addresses are stored trimmed and lower-case", () => {
  assert.equal(inviteEmail("  Anna.E@Example.COM "), "anna.e@example.com");
});

test("anything that is not an address is refused", () => {
  for (const bad of ["", "anna", "anna@", "@example.com", "anna@example", "a b@example.com", null, 42]) {
    assert.equal(inviteEmail(bad), null, String(bad));
  }
});

test("the database's refusal is recognised", () => {
  assert.equal(isRefusedSignUp("Database error saving new user"), true);
  assert.equal(isRefusedSignUp("Password should be at least 8 characters"), false);
});
