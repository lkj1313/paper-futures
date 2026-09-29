import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { WalletService } from '../src/wallet/wallet.service.js';
import { createTestApp, resetData, signupAndLogin } from './utils.js';

describe('지갑 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const get = (path: string, token?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetData(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('회원가입하면 10000 USDT 지갑과 가입 보너스 원장 1건이 생긴다', async () => {
    await signupAndLogin(app, 'w@test.com');

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'w@test.com' },
      include: { wallet: { include: { entries: true } } },
    });
    expect(user.wallet?.balance.toString()).toBe('10000');
    expect(user.wallet?.entries).toHaveLength(1);
    expect(user.wallet?.entries[0]).toMatchObject({ type: 'SIGNUP_BONUS' });
    expect(user.wallet?.entries[0].amount.toString()).toBe('10000');
    expect(user.wallet?.entries[0].balanceAfter.toString()).toBe('10000');
  });

  it('GET /api/wallet: 잔고, 사용 중 증거금, 주문 가능 금액을 문자열로 준다', async () => {
    const token = await signupAndLogin(app);

    const res = await get('/api/wallet', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      asset: 'USDT',
      balance: '10000',
      usedMargin: '0',
      availableBalance: '10000',
    });
  });

  it('토큰 없이 지갑을 조회하면 401', async () => {
    expect((await get('/api/wallet')).status).toBe(401);
    expect((await get('/api/wallet/ledger')).status).toBe(401);
  });

  it('원장 합계는 항상 지갑 잔고와 같다', async () => {
    await signupAndLogin(app);

    const wallet = await prisma.wallet.findFirstOrThrow();
    const { _sum } = await prisma.ledgerEntry.aggregate({
      where: { walletId: wallet.id },
      _sum: { amount: true },
    });
    expect(_sum.amount?.toString()).toBe(wallet.balance.toString());
  });

  it('GET /api/wallet/ledger: 최신순으로 limit개씩, nextCursor로 이어서 가져온다', async () => {
    const token = await signupAndLogin(app);
    const wallet = await prisma.wallet.findFirstOrThrow();
    // 원장 기록 3건을 더 쌓는다 (지금은 가입 보너스 외 기록을 만드는 기능이 없어 직접 넣는다)
    for (const amount of ['1', '2', '3']) {
      await prisma.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: 'SIGNUP_BONUS',
          amount: new Prisma.Decimal(amount),
          balanceAfter: new Prisma.Decimal(amount),
        },
      });
    }

    const page1 = await get('/api/wallet/ledger?limit=2', token);
    expect(page1.status).toBe(200);
    expect(page1.body.items.map((e: { amount: string }) => e.amount)).toEqual([
      '3',
      '2',
    ]);
    expect(page1.body.nextCursor).toEqual(expect.any(String));

    const page2 = await get(
      `/api/wallet/ledger?limit=2&cursor=${page1.body.nextCursor}`,
      token,
    );
    expect(page2.body.items.map((e: { amount: string }) => e.amount)).toEqual([
      '1',
      '10000',
    ]);
    expect(page2.body.nextCursor).toBeNull();
  });

  it('원장 조회 limit이 범위를 벗어나면 400 VALIDATION_ERROR', async () => {
    const token = await signupAndLogin(app);

    const res = await get('/api/wallet/ledger?limit=0', token);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('DB 제약: 잔고를 음수로 만들 수 없다', async () => {
    await signupAndLogin(app);
    const wallet = await prisma.wallet.findFirstOrThrow();

    await expect(
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: new Prisma.Decimal('-1') },
      }),
    ).rejects.toThrow();
  });

  it('DB 제약: 지갑이 있는 사용자는 삭제할 수 없다 (Restrict)', async () => {
    await signupAndLogin(app);

    await expect(prisma.user.deleteMany()).rejects.toThrow();
  });
});

describe('회원가입 트랜잭션 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // 지갑 생성이 항상 실패하도록 WalletService를 가짜로 바꿔 끼운다
    app = await createTestApp((builder) =>
      builder.overrideProvider(WalletService).useValue({
        createWithSignupBonus: () => Promise.reject(new Error('wallet failed')),
      }),
    );
  });

  beforeEach(async () => {
    await resetData(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('지갑 생성이 실패하면 사용자도 만들어지지 않는다 (롤백)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'rollback@test.com', password: 'password123' });

    expect(res.status).toBe(500);
    expect(await app.get(PrismaService).user.count()).toBe(0);
  });
});
