const TicketModel = require("./model/ticket.model");
const ticketController = require("./controllers/ticket.controllers");
const { SHOP_ROLES } = require("../../../../core/constants");

describe("Tests unitaires — Recherche par nom de boutique dans GET /tickets", () => {
  let findMock;
  let countDocumentsMock;
  let aggregateMock;

  beforeEach(() => {
    findMock = jest.spyOn(TicketModel, "find").mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    countDocumentsMock = jest.spyOn(TicketModel, "countDocuments").mockResolvedValue(0);
    aggregateMock = jest.spyOn(TicketModel, "aggregate").mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("côté plateforme : la recherche avec q inclut sujet, reference ET shopNom tout en filtrant sur niveau=plateforme", async () => {
    const req = {
      user: { isPlatform: true },
      validated: {
        query: { page: 1, limit: 20, q: "boutique maman" },
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await ticketController.list(req, res);

    expect(findMock).toHaveBeenCalledTimes(1);
    const filterArg = findMock.mock.calls[0][0];

    // Vérifie la restriction stricte au niveau plateforme
    expect(filterArg.niveau).toBe("plateforme");
    expect(filterArg.shopId).toBeUndefined();

    // Vérifie les conditions $or
    expect(filterArg.$or).toEqual([
      { sujet: { $regex: "boutique maman", $options: "i" } },
      { reference: { $regex: "boutique maman", $options: "i" } },
      { shopNom: { $regex: "boutique maman", $options: "i" } },
    ]);
  });

  it("côté boutique (admin) : la recherche avec q ne touche que sujet et reference, limitée à sa propre boutique", async () => {
    const shopId = "64f1a2b3c4d5e6f7a8b9c0d1";
    const req = {
      user: {
        isPlatform: false,
        shopId,
        role: SHOP_ROLES.ADMIN,
      },
      validated: {
        query: { page: 1, limit: 20, q: "panne" },
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await ticketController.list(req, res);

    expect(findMock).toHaveBeenCalledTimes(1);
    const filterArg = findMock.mock.calls[0][0];

    // Vérifie la restriction boutique
    expect(filterArg.shopId).toBe(shopId);
    expect(filterArg.niveau).toBeUndefined();

    // Vérifie qu'il n'y a PAS shopNom dans $or côté boutique
    expect(filterArg.$or).toEqual([
      { sujet: { $regex: "panne", $options: "i" } },
      { reference: { $regex: "panne", $options: "i" } },
    ]);
  });

  it("côté boutique (agent caissier) : la recherche reste restreinte à ses propres tickets (auteurId)", async () => {
    const shopId = "64f1a2b3c4d5e6f7a8b9c0d1";
    const userId = "64f1a2b3c4d5e6f7a8b9c0d2";
    const req = {
      user: {
        isPlatform: false,
        shopId,
        id: userId,
        role: SHOP_ROLES.CAISSIER,
      },
      validated: {
        query: { page: 1, limit: 20, q: "caisse" },
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await ticketController.list(req, res);

    expect(findMock).toHaveBeenCalledTimes(1);
    const filterArg = findMock.mock.calls[0][0];

    expect(filterArg.shopId).toBe(shopId);
    expect(filterArg.auteurId).toBe(userId);
    expect(filterArg.$or).toEqual([
      { sujet: { $regex: "caisse", $options: "i" } },
      { reference: { $regex: "caisse", $options: "i" } },
    ]);
  });
});
