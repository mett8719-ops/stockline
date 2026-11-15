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
  cart.setSelectedPayment("mobile");
  cart.setPaymentAmount(30000);

  const sale = cart.submitSale();
  const state = usePosCart.getState();

  assert.equal(sale.total, 30000);
  assert.equal(sale.paymentMethod, "mobile");
  assert.equal(state.items.length, 0);
  assert.equal(state.total, 0);
  assert.equal(state.client, "");
});
