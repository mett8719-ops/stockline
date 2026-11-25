const audit = require("../../../../core/audit");
jest.mock("../../../../core/audit", () => ({
  recordAudit: jest.fn(),
}));

const UserModel = require("../auth/model/user.model");
const ShopModel = require("../../../platform/features/shop/model/shop.model");
const userShopControllers = require("./controllers/user-shop.controllers");
const { SHOP_ROLES } = require("../../../../core/constants");

describe("Tests unitaires — Suppression sécurisée d'un utilisateur (DELETE /api/v1/users/:id)", () => {
  const shopId = "64f1a2b3c4d5e6f7a8b9c001";
  const currentAdminId = "64f1a2b3c4d5e6f7a8b9c002";
  const employeeId = "64f1a2b3c4d5e6f7a8b9c003";

  let shopUpdateMock;

  beforeEach(() => {
    audit.recordAudit.mockClear();
    shopUpdateMock = jest.spyOn(ShopModel, "updateOne").mockResolvedValue({ acknowledged: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("refuse la suppression de son propre compte", async () => {
    const mockUser = {
      _id: currentAdminId,
      nom: "Admin Principal",
      email: "admin@shop.com",
      role: SHOP_ROLES.ADMIN,
      actif: true,
      gele: false,
    };

    jest.spyOn(UserModel, "findOne").mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const req = {
      user: { id: currentAdminId, shopId, role: SHOP_ROLES.ADMIN },
      validated: { params: { id: currentAdminId } },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await expect(userShopControllers.remove(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Vous ne pouvez pas supprimer votre propre compte",
    });
  });

  it("refuse la suppression du dernier administrateur actif de la boutique", async () => {
    const anotherAdminId = "64f1a2b3c4d5e6f7a8b9c004";
    const mockUser = {
      _id: anotherAdminId,
      nom: "Second Admin",
      email: "admin2@shop.com",
      role: SHOP_ROLES.ADMIN,
      actif: true,
      gele: false,
    };

    jest.spyOn(UserModel, "findOne").mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    // Aucun autre admin actif
    jest.spyOn(UserModel, "countDocuments").mockResolvedValue(0);

    const req = {
      user: { id: currentAdminId, shopId, role: SHOP_ROLES.ADMIN },
      validated: { params: { id: anotherAdminId } },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await expect(userShopControllers.remove(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Votre boutique doit conserver au moins un administrateur actif",
    });
  });

  it("refuse si l'utilisateur est introuvable ou appartient à une autre boutique (tenant isolation)", async () => {
    jest.spyOn(UserModel, "findOne").mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const req = {
      user: { id: currentAdminId, shopId, role: SHOP_ROLES.ADMIN },
      validated: { params: { id: employeeId } },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await expect(userShopControllers.remove(req, res)).rejects.toMatchObject({
      statusCode: 404,
      message: "Membre introuvable",
    });
  });

  it("supprime avec succès un employé : soft delete, révocation sessions, décrément compteur, audit", async () => {
    const mockEmployee = {
      _id: employeeId,
      nom: "Caissier Jean",
      email: "jean@shop.com",
      role: SHOP_ROLES.CAISSIER,
      actif: true,
      gele: false,
      refreshTokens: [{ jti: "token-1" }, { jti: "token-2" }],
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(UserModel, "findOne").mockReturnValue({
      select: jest.fn().mockResolvedValue(mockEmployee),
    });

    const req = {
      user: { id: currentAdminId, shopId, role: SHOP_ROLES.ADMIN },
      validated: { params: { id: employeeId } },
    };
    const jsonMock = jest.fn();
    const res = { status: jest.fn().mockReturnThis(), json: jsonMock };

    await userShopControllers.remove(req, res);

    // Vérifie le soft-delete et la désactivation
    expect(mockEmployee.actif).toBe(false);
    expect(mockEmployee.gele).toBe(true);
    expect(mockEmployee.supprimeLe).toBeInstanceOf(Date);
    expect(mockEmployee.supprimePar).toBe(currentAdminId);

    // Vérifie la révocation instantanée de toutes les sessions actives
    expect(mockEmployee.refreshTokens).toEqual([]);
    expect(mockEmployee.save).toHaveBeenCalledTimes(1);

    // Vérifie la mise à jour des compteurs de la boutique
    expect(shopUpdateMock).toHaveBeenCalledWith(
      { _id: shopId },
      { $inc: { "compteurs.utilisateurs": -1 } }
    );

    // Vérifie l'enregistrement de l'audit de sécurité
    expect(audit.recordAudit).toHaveBeenCalledWith(
      req,
      "user.deleted",
      expect.objectContaining({
        severite: "haute",
        cible: "User",
        cibleId: employeeId,
      })
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { message: "Employé supprimé avec succès" },
      })
    );
  });

  it("GET /users masque les utilisateurs supprimés (supprimeLe: null)", async () => {
    const findMock = jest.spyOn(UserModel, "find").mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const req = {
      user: { id: currentAdminId, shopId, role: SHOP_ROLES.ADMIN },
      validated: { query: {} },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await userShopControllers.list(req, res);

    expect(findMock).toHaveBeenCalledTimes(1);
    const filterArg = findMock.mock.calls[0][0];

    // Vérifie que le filtre inclut strictement supprimeLe: null et le shopId
    expect(filterArg.supprimeLe).toBeNull();
    expect(filterArg.shopId).toBe(shopId);
  });
});
