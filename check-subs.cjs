const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.setting.findUnique({ where: { key: 'staff_push_subscriptions' } })
  .then((r) => console.log(JSON.stringify(r ? JSON.parse(r.value).map((s) => ({ userId: s.userId, paused: s.paused, ep: s.endpoint.slice(0, 40) })) : [])))
  .finally(() => p.$disconnect());
