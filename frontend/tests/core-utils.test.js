import assert from "node:assert/strict";
import test from "node:test";
import { cn } from "../src/core/utils/cn.js";
import { formatDate, formatDateTime, formatRelative } from "../src/core/utils/formatDate.js";
import { formatMoney } from "../src/core/utils/formatMoney.js";
import {
  documentStatusLabels,
  paymentMethodLabels,
  saleStatusLabels,
  ticketStatusLabels,
} from "../src/core/utils/labels.js";

test("cn combines conditional classes and resolves Tailwind conflicts", () => {
  const isHidden = false;

  assert.equal(
    cn("px-2 text-sm", isHidden && "hidden", ["bg-brand-600"], "px-4"),
    "text-sm bg-brand-600 px-4",
  );
});

test("formatMoney formats FCFA without decimal places", () => {
  assert.equal(formatMoney(15000).replace(/\s/g, " "), "15 000 FCFA");
  assert.equal(formatMoney("99.7").replace(/\s/g, " "), "100 FCFA");
});

test("formatMoney rejects missing and non-finite amounts", () => {
  assert.throws(() => formatMoney(" "), TypeError);
  assert.throws(() => formatMoney(Number.NaN), RangeError);
});

test("date helpers format dates in French", () => {
  const date = new Date(2026, 10, 14, 15, 30);

  assert.equal(formatDate(date), "14/11/2026");
  assert.equal(formatDateTime(date), "14/11/2026 15:30");
  assert.match(formatRelative(new Date(Date.now() - 10 * 60 * 1000)), /10 minutes/);
});

test("date helpers reject missing and invalid dates", () => {
  assert.throws(() => formatDate(null), TypeError);
  assert.throws(() => formatDate("not-a-date"), RangeError);
});

test("status dictionaries map server statuses to French labels", () => {
  assert.equal(saleStatusLabels.payee, "Payée");
  assert.equal(documentStatusLabels.en_retard, "En retard");
  assert.equal(ticketStatusLabels.en_cours, "En cours");
  assert.equal(paymentMethodLabels.mobile_money, "Mobile Money");
});
