import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { createHmac } from "crypto";
import { EventsGateway, WsJwtAuthGuard, WsJwtAuthService } from "./events.gateway";

function createToken(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe("EventsGateway", () => {
  let gateway: EventsGateway;
  let guard: WsJwtAuthGuard;
  const secret = "test-jwt-secret";

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === "JWT_SECRET") {
        return secret;
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        WsJwtAuthService,
        WsJwtAuthGuard,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    guard = module.get<WsJwtAuthGuard>(WsJwtAuthGuard);

    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("authenticates valid websocket connection", () => {
    const token = createToken(
      {
        sub: "user-1",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      secret,
    );

    const client = {
      id: "socket-1",
      handshake: {
        auth: { token },
        headers: {},
        query: {},
      },
      data: {},
      disconnect: jest.fn(),
    } as any;

    gateway.handleConnection(client);

    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.data.user).toBeDefined();
    expect(client.data.user.sub).toBe("user-1");
  });

  it("disconnects unauthorized websocket connection", () => {
    const client = {
      id: "socket-2",
      handshake: {
        auth: { token: "invalid.token.value" },
        headers: {},
        query: {},
      },
      data: {},
      disconnect: jest.fn(),
    } as any;

    gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it("joins a split room using split-scoped room id", () => {
    const client = {
      join: jest.fn(),
    } as any;

    const result = gateway.handleJoinSplit(client, { splitId: "split-123" });

    expect(client.join).toHaveBeenCalledWith("split:split-123");
    expect(result).toEqual({
      event: "joined_split",
      data: { splitId: "split-123", room: "split:split-123" },
    });
  });

  it("emits payment_received only to split room", () => {
    gateway.emitPaymentReceived("split-abc", { paymentId: "pay-1" });

    expect(gateway.server.to).toHaveBeenCalledWith("split:split-abc");
    expect(gateway.server.emit).toHaveBeenCalledWith("payment_received", {
      paymentId: "pay-1",
    });
  });

  it("emits split_updated only to split room", () => {
    gateway.emitSplitUpdated("split-abc", { status: "partial" });

    expect(gateway.server.to).toHaveBeenCalledWith("split:split-abc");
    expect(gateway.server.emit).toHaveBeenCalledWith("split_updated", {
      status: "partial",
    });
  });

  it("emits participant_joined only to split room", () => {
    gateway.emitParticipantJoined("split-abc", { participantId: "part-1" });

    expect(gateway.server.to).toHaveBeenCalledWith("split:split-abc");
    expect(gateway.server.emit).toHaveBeenCalledWith("participant_joined", {
      participantId: "part-1",
    });
  });

  it("guard accepts valid JWT token and assigns user on socket", () => {
    const token = createToken(
      {
        sub: "user-guard",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      secret,
    );

    const client = {
      handshake: {
        auth: { token },
        headers: {},
        query: {},
      },
      data: {},
    } as any;

    const context = {
      switchToWs: () => ({
        getClient: () => client,
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(client.data.user.sub).toBe("user-guard");
  });

  it("guard rejects missing JWT token", () => {
    const client = {
      handshake: {
        auth: {},
        headers: {},
        query: {},
      },
      data: {},
    } as any;

    const context = {
      switchToWs: () => ({
        getClient: () => client,
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
