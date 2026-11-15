import assert from "node:assert/strict";
import test from "node:test";
import { usePosCart } from "../src/apps/boutique/features/pos/store/cartStore.js";

const product = {
  id: "p-1",
  name: "Riz local 25kg",
  price: 15000,
  stock: 48,
  category: "Céréales",
};

test("pos cart adds, updates and removes product lines", () => {
  const cart = usePosCart.getState();
  cart.reset();

  cart.addItem(product);
  cart.addItem(product);

  let state = usePosCart.getState();
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].quantity, 2);
  assert.equal(state.total, 30000);

  cart.updateQuantity(product.id, 5);
  state = usePosCart.getState();
  assert.equal(state.items[0].quantity, 5);
  assert.equal(state.total, 75000);

  cart.removeItem(product.id);
  state = usePosCart.getState();
  assert.deepEqual(state.items, []);
  assert.equal(state.total, 0);
});

test("pos cart prevents invalid quantities and out-of-stock actions", () => {
  const cart = usePosCart.getState();
  cart.reset();

  cart.addItem({ ...product, stock: 2 }, 3);
  let state = usePosCart.getState();
  assert.equal(state.items[0].quantity, 2);

  assert.throws(() => cart.updateQuantity(product.id, 0), /quantit/);
  assert.throws(() => cart.updateQuantity("missing", 1), /introuv/);
});

test("pos cart validates and clears a completed sale", () => {
  const cart = usePosCart.getState();
  cart.reset();
  cart.addItem(product, 2);
  cart.setClient("Client test");
  cart.setSelectedPayment("mobile_money");
  cart.setPaymentAmount(30000);

  const sale = cart.submitSale();
  const state = usePosCart.getState();

  assert.equal(sale.total, 30000);
  assert.equal(sale.paymentMethod, "mobile_money");
  assert.equal(state.items.length, 0);
  assert.equal(state.total, 0);
  assert.equal(state.client, "");
});

test("pos cart accepts mixed cash and mobile money payments and requires client for credit sales", () => {
  const cart = usePosCart.getState();
  cart.reset();
  cart.addItem(product, 1);
  cart.setPaymentBreakdown({ especes: 5000, mobile_money: 10000, carte: 0, credit: 0 });

  assert.equal(cart.getPaymentTotal(), 15000);
  assert.equal(cart.getChange(), 0);

  const mixedSale = cart.submitSale();
  assert.equal(mixedSale.amounts.especes, 5000);
  assert.equal(mixedSale.amounts.mobile_money, 10000);

  cart.reset();
  cart.addItem(product, 1);
  cart.setSelectedPayment("credit");
  cart.setClient(" ");

  assert.throws(() => cart.submitSale(), /client/i);
});
